import OpenAI from 'openai'

/**
 * Practice-test grading engine + answer-stripping serializers.
 *
 * Two responsibilities:
 *   1. Sanitize catalogue content so answer keys NEVER reach the client
 *      (question_options.is_correct, answer keys inside questions.payload,
 *      and assets.transcript).
 *   2. Grade a submitted attempt server-side — objective types deterministically,
 *      writing/speaking via an AI rubric — and convert raw scores to the exam's
 *      reported scale.
 */

// ---------------------------------------------------------------------------
//  Shared types
// ---------------------------------------------------------------------------
export type Skill = 'reading' | 'listening' | 'writing' | 'speaking'

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'gap_fill'
  | 'matching'
  | 'true_false_notgiven'
  | 'ordering'
  | 'short_answer'
  | 'essay'
  | 'email_response'
  | 'speaking_response'

export type ScoringMethod =
  | 'auto_choice'
  | 'auto_text'
  | 'ai_rubric'
  | 'human'
  | 'ai_plus_human'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>

export interface QuestionRow {
  id: string
  group_id: string
  order_index: number
  question_type: QuestionType
  scoring_method: ScoringMethod
  prompt: string
  payload: Json | null
  rubric_id: string | null
  max_score: number | string
}

export interface OptionRow {
  id: string
  question_id: string
  order_index: number
  label: string
  content: string
  is_correct: boolean
}

export interface ResponseRow {
  question_id: string
  selected_option_ids: string[] | null
  text_response: string | null
  transcript: string | null
}

export interface RubricRow {
  id: string
  skill: Skill
  name: string
  criteria: Json | null
  max_score: number | string | null
}

/**
 * The Supabase storage bucket holding listening audio and image stimuli.
 * Create it (private) before seeding assets:  supabase storage bucket "test-assets".
 */
export const TEST_ASSETS_BUCKET = 'test-assets'

/**
 * Reserved keys inside questions.payload that hold answer data. Authors MUST
 * place anything answer-revealing under one of these keys; the sanitizer strips
 * them before any question is sent to a client.
 *   gap_fill / short_answer -> { accepted: ["colour","color"], case_sensitive: false }
 *   ordering                -> { answer: ["b","a","c","d"] }
 *   matching                -> { answer: { "item1": "optX", ... } }
 *   speaking_response       -> { reference: "expected answer / verbatim sentence / passage" }
 */
export const ANSWER_PAYLOAD_KEYS = [
  'accepted',
  'answer',
  'answers',
  'correct',
  'solution',
  'key',
  'reference',
  'cefr', // ladder level tag — not an answer, but it telegraphs item difficulty
  'explanation', // author explanations reveal the answer — review-only
  'explanation_ja',
] as const

// ---------------------------------------------------------------------------
//  Answer-stripping serializers
// ---------------------------------------------------------------------------
export function sanitizePayload(payload: Json | null): Json {
  if (!payload) return {}
  const clean: Json = {}
  const answerKeys = ANSWER_PAYLOAD_KEYS as readonly string[]
  for (const [key, value] of Object.entries(payload)) {
    if (answerKeys.includes(key)) continue
    clean[key] = value
  }
  return clean
}

/** Client-safe option shape — no is_correct. */
export function sanitizeOption(o: OptionRow) {
  return { id: o.id, label: o.label, content: o.content, order_index: o.order_index }
}

/** Client-safe question shape — no answer payload. */
export function sanitizeQuestion(q: QuestionRow, options: OptionRow[]) {
  return {
    id: q.id,
    group_id: q.group_id,
    order_index: q.order_index,
    question_type: q.question_type,
    prompt: q.prompt,
    payload: sanitizePayload(q.payload),
    max_score: Number(q.max_score) || 0,
    options: options
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map(sanitizeOption),
  }
}

// ---------------------------------------------------------------------------
//  Objective auto-grading
// ---------------------------------------------------------------------------
function normalize(text: string, caseSensitive: boolean): string {
  let t = (text || '').trim().replace(/\s+/g, ' ')
  if (!caseSensitive) t = t.toLowerCase()
  return t
}

export interface AutoGrade {
  is_correct: boolean
  score: number
  max_score: number
}

/**
 * Deterministically grade an objective question. Returns score 0..max_score.
 * matching awards partial credit per correct pair; everything else is all-or-nothing.
 */
export function gradeAuto(q: QuestionRow, options: OptionRow[], r: ResponseRow | undefined): AutoGrade {
  const max = Number(q.max_score) || 1
  const selected = new Set(r?.selected_option_ids ?? [])
  const payload = q.payload ?? {}

  switch (q.question_type) {
    case 'single_choice':
    case 'true_false_notgiven': {
      const correct = options.filter(o => o.is_correct).map(o => o.id)
      const ok = selected.size === 1 && correct.includes([...selected][0])
      return { is_correct: ok, score: ok ? max : 0, max_score: max }
    }

    case 'multiple_choice': {
      // Partial credit: one mark per correctly-selected option, minus wrong
      // selections, floored at 0 (matches e.g. IELTS "choose TWO letters").
      const correct = new Set(options.filter(o => o.is_correct).map(o => o.id))
      const correctPicked = [...selected].filter(id => correct.has(id)).length
      const wrongPicked = [...selected].filter(id => !correct.has(id)).length
      const denom = correct.size || 1
      const fraction = Math.max(0, correctPicked - wrongPicked) / denom
      const score = Math.round(fraction * max * 100) / 100
      const ok = correctPicked === correct.size && wrongPicked === 0
      return { is_correct: ok, score, max_score: max }
    }

    case 'gap_fill':
    case 'short_answer': {
      const accepted: string[] = Array.isArray(payload.accepted) ? payload.accepted : []
      const caseSensitive = !!payload.case_sensitive
      const answer = normalize(r?.text_response ?? '', caseSensitive)
      const ok = answer.length > 0 && accepted.some(a => normalize(String(a), caseSensitive) === answer)
      return { is_correct: ok, score: ok ? max : 0, max_score: max }
    }

    case 'ordering': {
      const correct: unknown[] = Array.isArray(payload.answer) ? payload.answer : []
      let user: unknown[] = []
      try { user = JSON.parse(r?.text_response ?? '[]') } catch { /* leave empty */ }
      const ok =
        Array.isArray(user) &&
        user.length === correct.length &&
        correct.length > 0 &&
        user.every((v, i) => String(v) === String(correct[i]))
      return { is_correct: ok, score: ok ? max : 0, max_score: max }
    }

    case 'matching': {
      const correct: Json = payload.answer && typeof payload.answer === 'object' ? payload.answer : {}
      let user: Json = {}
      try { user = JSON.parse(r?.text_response ?? '{}') } catch { /* leave empty */ }
      const keys = Object.keys(correct)
      const hits = keys.filter(k => String(user[k]) === String(correct[k])).length
      const score = keys.length > 0 ? (hits / keys.length) * max : 0
      return { is_correct: keys.length > 0 && hits === keys.length, score, max_score: max }
    }

    default:
      // Non-objective types are not auto-gradable.
      return { is_correct: false, score: 0, max_score: max }
  }
}

export function isAutoGraded(method: ScoringMethod): boolean {
  return method === 'auto_choice' || method === 'auto_text'
}

// ---------------------------------------------------------------------------
//  AI rubric grading (writing + speaking)
// ---------------------------------------------------------------------------
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

export interface AiGrade {
  score: number
  max_score: number
  feedback: {
    band: number | null
    criteria: { name: string; score: number; comment: string }[]
    strengths_en: string
    improvements_en: string
    improvements_ja: string
  }
}

/**
 * Grade a writing or speaking response against a rubric using the LLM.
 * For speaking, `studentText` is the transcript produced by the recordings /
 * transcriptions pipeline. Returns a numeric score plus structured feedback.
 */
export async function gradeWithRubric(opts: {
  skill: Skill
  questionType: QuestionType
  taskPrompt: string
  studentText: string
  rubric: RubricRow | null
  maxScore?: number // this question's point value; the rubric supplies the criteria
}): Promise<AiGrade> {
  const max = Number(opts.maxScore) || Number(opts.rubric?.max_score) || Number((opts.rubric?.criteria as Json)?.max_score) || 9
  const criteria = opts.rubric?.criteria ?? {}

  const systemPrompt = `You are an experienced, calibrated examiner grading a ${opts.skill} response on an English proficiency practice test.

Grade ONLY against the supplied rubric. Be fair and consistent, and calibrate conservatively — do not over-reward. When a response sits between two bands, award the LOWER band unless it clearly meets the higher band's descriptors. A clear and accurate but simple answer, with a limited range of vocabulary and sentence structure, belongs mid-scale; reserve the upper bands for genuine range, flexibility and precision. Do not reward content unrelated to the task.

You will receive the task prompt, the scoring rubric (as JSON), and the student's response${opts.skill === 'speaking' ? ' (a transcript of their spoken answer — judge content/coherence/grammar/vocabulary from the transcript, and do not penalise transcription artefacts)' : ''}.

Return ONLY valid JSON with this shape:
{
  "overall_score": number,            // 0..${max}, may be a half value where the rubric uses half-bands
  "band": number | null,              // band/level if the rubric is band-based, else null
  "criteria": [ { "name": string, "score": number, "comment": string } ],
  "strengths_en": string,             // 1-2 sentences
  "improvements_en": string,          // concrete, actionable, 2-3 sentences
  "improvements_ja": string           // same advice in natural, friendly Japanese
}`

  const userContent = `MAX SCORE: ${max}

TASK PROMPT:
${opts.taskPrompt || '(none provided)'}

RUBRIC (JSON):
${JSON.stringify(criteria, null, 2)}

STUDENT RESPONSE:
${opts.studentText?.trim() || '(empty response)'}`

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_completion_tokens: 1500,
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('No response from grader')

  const parsed = JSON.parse(raw) as Json
  const score = clamp(Number(parsed.overall_score) || 0, 0, max)

  return {
    score,
    max_score: max,
    feedback: {
      band: parsed.band === null || parsed.band === undefined ? null : Number(parsed.band),
      criteria: Array.isArray(parsed.criteria)
        ? parsed.criteria.map((c: Json) => ({
            name: String(c.name ?? ''),
            score: Number(c.score) || 0,
            comment: String(c.comment ?? ''),
          }))
        : [],
      strengths_en: String(parsed.strengths_en ?? ''),
      improvements_en: String(parsed.improvements_en ?? ''),
      improvements_ja: String(parsed.improvements_ja ?? ''),
    },
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Default number of AI grading passes to average for a more stable score. */
export const AI_GRADING_SAMPLES = 3

/**
 * Grade a writing/speaking response several times and average, to reduce the
 * run-to-run variance of a single LLM pass. Band-style scores (max <= 9) are
 * rounded to the nearest half; larger scales to the nearest integer. The
 * returned feedback is taken from the sample closest to the average so the
 * commentary matches the reported score. `grader` is injectable for testing.
 */
export async function gradeWithRubricAveraged(
  opts: Parameters<typeof gradeWithRubric>[0],
  samples: number = AI_GRADING_SAMPLES,
  grader: (o: Parameters<typeof gradeWithRubric>[0]) => Promise<AiGrade> = gradeWithRubric
): Promise<AiGrade> {
  const n = Math.max(1, Math.floor(samples))
  const results = await Promise.all(Array.from({ length: n }, () => grader(opts)))

  const max = results[0].max_score
  const avg = results.reduce((s, r) => s + r.score, 0) / n
  const score = max <= 9 ? Math.round(avg * 2) / 2 : Math.round(avg)

  // Representative feedback = sample whose score is closest to the average.
  const rep = results.reduce((best, r) =>
    Math.abs(r.score - avg) < Math.abs(best.score - avg) ? r : best, results[0])

  const bandVals = results.map(r => r.feedback.band).filter((b): b is number => b != null)
  const band = bandVals.length > 0
    ? Math.round((bandVals.reduce((a, b) => a + b, 0) / bandVals.length) * 2) / 2
    : rep.feedback.band

  return {
    score,
    max_score: max,
    feedback: { ...rep.feedback, band, samples: n } as AiGrade['feedback'] & { samples: number },
  }
}

// ---------------------------------------------------------------------------
//  IELTS overall band (mean of four skill bands, rounded to nearest half)
// ---------------------------------------------------------------------------
//  Reading/Listening bands come from the raw->band table; Writing/Speaking
//  bands are the (weighted) average of their per-task AI bands — Writing Task 2
//  is weighted double Task 1 via each question's payload.weight. The overall
//  band is the mean of the available skill bands, rounded to the nearest half.
export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2
}

export interface IeltsSkillBand { skill: Skill; band: number | null; raw?: number; max?: number }
export interface IeltsResult { model: 'ielts_band'; per_skill: IeltsSkillBand[]; overall_band: number | null }

export function computeIeltsResult(input: {
  reading?: { raw: number; max: number; scale: Json | null }
  listening?: { raw: number; max: number; scale: Json | null }
  writing?: { items: { band: number; weight: number }[] }
  speaking?: { items: { band: number; weight: number }[] }
}): IeltsResult {
  const per_skill: IeltsSkillBand[] = []

  const fromTable = (skill: Skill, info?: { raw: number; max: number; scale: Json | null }) => {
    if (!info || info.max <= 0) return
    const band = applyScale(info.scale, info.raw, info.max).band
    per_skill.push({ skill, band, raw: Math.round(info.raw * 100) / 100, max: info.max })
  }
  fromTable('reading', input.reading)
  fromTable('listening', input.listening)

  const fromItems = (skill: Skill, info?: { items: { band: number; weight: number }[] }) => {
    if (!info || info.items.length === 0) return
    const wSum = info.items.reduce((s, i) => s + i.weight, 0)
    const bSum = info.items.reduce((s, i) => s + i.band * i.weight, 0)
    per_skill.push({ skill, band: wSum > 0 ? roundToHalf(bSum / wSum) : null })
  }
  fromItems('writing', input.writing)
  fromItems('speaking', input.speaking)

  const bands = per_skill.map(p => p.band).filter((b): b is number => b != null)
  const overall_band = bands.length > 0 ? roundToHalf(bands.reduce((a, b) => a + b, 0) / bands.length) : null
  return { model: 'ielts_band', per_skill, overall_band }
}

// ---------------------------------------------------------------------------
//  Raw -> reported score conversion
// ---------------------------------------------------------------------------
export interface ScaleResult {
  scaled: number | null
  band: number | null
  passed: boolean | null
}

/**
 * Convert a raw score to the exam's reported scale using a score_scales.scale
 * JSONB blob. Supported (optional) shapes, all gracefully degrading to raw:
 *   { "table": [ { "raw": 30, "scaled": 405 }, ... ] }   // nearest-raw lookup (TOEIC)
 *   { "bands": [ { "min_raw": 30, "band": 7.0 }, ... ] } // threshold -> band (IELTS)
 *   { "pass_mark": 0.6 }                                  // fraction of max to pass (EIKEN)
 */
export function applyScale(scale: Json | null, raw: number, max: number): ScaleResult {
  const result: ScaleResult = { scaled: null, band: null, passed: null }
  if (!scale || Object.keys(scale).length === 0) return result

  // Conversion tables are calibrated to a fixed length (raw_basis): IELTS
  // sections to 40 questions, TOEIC sections to 100. Normalize the raw score
  // to that basis so a form that isn't exactly that length degrades gracefully
  // instead of looking up the wrong row.
  const basis = Number(scale.raw_basis) || 0
  const lookupRaw = basis > 0 && max > 0 ? (raw / max) * basis : raw

  if (Array.isArray(scale.table) && scale.table.length > 0) {
    let best = scale.table[0]
    for (const row of scale.table) {
      if (Math.abs(Number(row.raw) - lookupRaw) < Math.abs(Number(best.raw) - lookupRaw)) best = row
    }
    result.scaled = Number(best.scaled)
  }

  if (Array.isArray(scale.bands) && scale.bands.length > 0) {
    const sorted = [...scale.bands].sort((a, b) => Number(b.min_raw) - Number(a.min_raw))
    const hit = sorted.find(b => lookupRaw >= Number(b.min_raw))
    if (hit) result.band = Number(hit.band)
  }

  if (typeof scale.pass_mark === 'number' && max > 0) {
    result.passed = raw / max >= scale.pass_mark
  }

  return result
}

// ---------------------------------------------------------------------------
//  EIKEN CSE scoring (two-stage, cut-score pass/fail)
// ---------------------------------------------------------------------------
//  EIKEN does not use a raw percentage. Each grade reports CSE (Common Scale
//  for English) scores, with a fixed per-skill CSE maximum, and pass/fail is
//  decided per STAGE against a cut-score:
//    - Stage 1 = Reading/Listening(/Writing for Grade 3 and above)
//    - Stage 2 = Speaking interview (not present for Grades 4 & 5)
//  An examinee must pass every stage. The official raw->CSE mapping is a
//  statistical equating we cannot reproduce, so we approximate it linearly
//  (skillCSE = raw/maxRaw * per_skill_cse_max). The stage structure and
//  cut-scores, however, are the real CSE 2.0 values from the seed config.
//
//  Expected config shape (stored in the track's overall score_scales row):
//    {
//      "model": "eiken_cse",
//      "per_skill_cse_max": 650,
//      "skills":  { "reading": {"stage":1}, "listening": {"stage":1},
//                   "writing": {"stage":1}, "speaking": {"stage":2} },
//      "stages":  { "1": {"label":"...","cut":1520,"max":1950},
//                   "2": {"label":"...","cut":460,"max":650} }
//    }
export interface EikenSkillCse { skill: Skill; raw: number; max: number; cse: number; stage: number }
export interface EikenStage {
  stage: number
  label: string
  cse: number
  cut: number
  max: number
  complete: boolean        // were ALL of this stage's skills present in the form?
  passed: boolean | null   // null when the stage is incomplete (can't judge fairly)
}
export interface EikenResult {
  model: 'eiken_cse'
  per_skill: EikenSkillCse[]
  stages: EikenStage[]
  cse_total: number
  passed: boolean | null
}

export function computeEikenResult(
  config: Json,
  perSkill: Map<Skill, { raw: number; max: number }>
): EikenResult {
  const perSkillMax = Number(config.per_skill_cse_max) || 0
  const skillsCfg: Record<string, { stage: number }> = config.skills ?? {}
  const stagesCfg: Record<string, { label?: string; cut: number; max: number }> = config.stages ?? {}

  // Per-skill linear raw -> CSE (only for skills actually present in this form).
  const per_skill: EikenSkillCse[] = []
  for (const [skill, cfg] of Object.entries(skillsCfg)) {
    const agg = perSkill.get(skill as Skill)
    if (!agg || agg.max <= 0) continue
    const cse = Math.min(perSkillMax, Math.round((agg.raw / agg.max) * perSkillMax))
    per_skill.push({
      skill: skill as Skill,
      raw: Math.round(agg.raw * 100) / 100,
      max: agg.max,
      cse,
      stage: Number(cfg.stage),
    })
  }

  // Per-stage totals + cut-score pass/fail.
  const stages: EikenStage[] = []
  for (const [stageKey, sc] of Object.entries(stagesCfg)) {
    const stageNum = Number(stageKey)
    const configuredCount = Object.values(skillsCfg).filter(c => Number(c.stage) === stageNum).length
    const present = per_skill.filter(p => p.stage === stageNum)
    if (present.length === 0) continue // stage not attempted in this form
    const complete = present.length === configuredCount
    const cse = present.reduce((sum, p) => sum + p.cse, 0)
    stages.push({
      stage: stageNum,
      label: sc.label ?? `Stage ${stageNum}`,
      cse,
      cut: Number(sc.cut),
      max: Number(sc.max),
      complete,
      passed: complete ? cse >= Number(sc.cut) : null,
    })
  }

  const cse_total = per_skill.reduce((sum, p) => sum + p.cse, 0)

  // Overall pass requires EVERY configured stage to be present, complete, and
  // passed. If any configured stage is missing from the form (e.g. a stage-1-only
  // practice paper with no Speaking interview), overall pass is indeterminate —
  // we still report the per-stage result so a passed Stage 1 is visible.
  const configuredStageNums = Object.keys(stagesCfg).map(Number)
  let passed: boolean | null
  if (stages.some(s => s.passed === false)) {
    passed = false
  } else if (
    configuredStageNums.length > 0 &&
    configuredStageNums.every(n => {
      const st = stages.find(s => s.stage === n)
      return st && st.complete && st.passed === true
    })
  ) {
    passed = true
  } else {
    passed = null
  }

  return { model: 'eiken_cse', per_skill, stages, cse_total, passed }
}

// ---------------------------------------------------------------------------
//  CEFR Level Check scoring (graded ladder + descriptor-graded performance)
// ---------------------------------------------------------------------------
//  Criterion-referenced, DIALANG-style "basket" scoring:
//    - Objective items are tagged payload.cefr ('A1'..'C1'). For each level,
//      compute the fraction correct; the receptive level is found by walking
//      up from A1 while the basket clears pass_fraction. Partial progress
//      into the next basket adds a fraction (so "solid A2 + half of B1"
//      lands at high A2). A flat percentage is never used.
//    - Writing/speaking are AI-graded straight onto the CEFR scale (score
//      1=A1 .. 6=C2, halves allowed).
//    - Overall = weighted fusion (objective 50 / writing 25 / speaking 25,
//      renormalized over whatever is actually present/graded).
//  Reported as: band label + strength (low/mid/high) + CEFR-J sub-level
//  (hybrid display: the band is what we measured; CEFR-J is a translation).
export interface CefrItem {
  level: string | null      // payload.cefr for objective items
  skill: Skill
  objective: boolean        // auto-graded ladder item vs AI-graded performance
  score: number | null      // null = ungraded (awaiting human)
  max: number
}

export interface CefrResult {
  model: 'cefr_level'
  overall: string            // 'Pre-A1' | 'A1' .. 'C2'
  strength: 'low' | 'mid' | 'high' | null
  cefr_j: string | null      // e.g. 'A2.2'
  numeric: number            // continuous 0..6 (1=A1 .. 6=C2)
  receptive_numeric: number | null
  writing_band: number | null
  speaking_band: number | null
  level_fractions: Record<string, number | null>
  per_skill: { skill: Skill; label: string; numeric: number | null; raw: number; max: number }[]
}

const CEFR_BAND_LABELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function cefrBandLabel(numeric: number | null | undefined): string {
  if (numeric === null || numeric === undefined || !Number.isFinite(Number(numeric))) return '—'
  const idx = Math.min(6, Math.max(0, Math.floor(Number(numeric))))
  return CEFR_BAND_LABELS[idx]
}

function cefrJLabel(band: string, strength: 'low' | 'mid' | 'high' | null): string | null {
  switch (band) {
    case 'Pre-A1': return 'Pre-A1'
    case 'A1': return strength === 'high' ? 'A1.3' : strength === 'mid' ? 'A1.2' : 'A1.1'
    case 'A2': return strength === 'high' ? 'A2.2' : 'A2.1'
    case 'B1': return strength === 'high' ? 'B1.2' : 'B1.1'
    case 'B2': return strength === 'high' ? 'B2.2' : 'B2.1'
    case 'C1': return 'C1'
    case 'C2': return 'C2'
    default: return null
  }
}

export function computeCefrResult(config: Json, items: CefrItem[]): CefrResult {
  const levels: string[] = Array.isArray(config.levels) ? config.levels : ['A1', 'A2', 'B1', 'B2', 'C1']
  const pass = Number(config.pass_fraction) || 0.6
  const w = config.weights ?? {}
  const wObj = Number(w.objective) || 0.5
  const wWri = Number(w.writing) || 0.25
  const wSpk = Number(w.speaking) || 0.25

  // Fraction correct per level basket (ungraded objective items count as 0 —
  // they're auto-graded, so null only means unanswered).
  const fractions = (filter?: (it: CefrItem) => boolean): Record<string, number | null> => {
    const out: Record<string, number | null> = {}
    for (const lv of levels) {
      const pool = items.filter(it => it.objective && it.level === lv && (!filter || filter(it)))
      const max = pool.reduce((s, it) => s + it.max, 0)
      out[lv] = max > 0 ? pool.reduce((s, it) => s + (it.score ?? 0), 0) / max : null
    }
    return out
  }

  // Walk up the ladder: each cleared basket = +1; partial progress into the
  // first uncleared basket adds a capped fraction. 1.0 = solid A1.
  const walk = (fr: Record<string, number | null>): number | null => {
    let any = false
    let n = 0
    for (const lv of levels) {
      const f = fr[lv]
      if (f === null) break // no evidence at this level -> can't climb further
      any = true
      if (f >= pass) { n += 1; continue }
      n += Math.min(0.99, f / pass)
      break
    }
    return any ? n : null
  }

  const allFractions = fractions()
  const receptive = walk(allFractions)

  const bandOf = (pool: CefrItem[]): number | null => {
    const graded = pool.filter(it => it.score !== null)
    if (graded.length === 0) return null
    return graded.reduce((s, it) => s + (it.score as number), 0) / graded.length
  }
  const writing = bandOf(items.filter(it => !it.objective && it.skill === 'writing'))
  const speaking = bandOf(items.filter(it => !it.objective && it.skill === 'speaking'))

  // Fuse the components, renormalizing weights over what's present.
  const parts = [
    { value: receptive, weight: wObj },
    { value: writing, weight: wWri },
    { value: speaking, weight: wSpk },
  ].filter((p): p is { value: number; weight: number } => p.value !== null)
  const wSum = parts.reduce((s, p) => s + p.weight, 0)
  const numeric = wSum > 0 ? Math.min(6, parts.reduce((s, p) => s + p.value * p.weight, 0) / wSum) : 0

  const bandIdx = Math.min(6, Math.floor(numeric))
  const overall = CEFR_BAND_LABELS[bandIdx]
  const fracPart = numeric - bandIdx
  const strength: CefrResult['strength'] =
    bandIdx === 0 || bandIdx === 6 ? null : fracPart < 1 / 3 ? 'low' : fracPart < 2 / 3 ? 'mid' : 'high'

  // Per-skill: reading/listening from their own ladder walks; writing/speaking
  // from their graded bands.
  const per_skill: CefrResult['per_skill'] = []
  for (const skill of ['reading', 'listening'] as Skill[]) {
    const pool = items.filter(it => it.objective && it.skill === skill)
    if (pool.length === 0) continue
    const n = walk(fractions(it => it.skill === skill))
    per_skill.push({
      skill,
      label: cefrBandLabel(n),
      numeric: n === null ? null : Math.round(n * 100) / 100,
      raw: Math.round(pool.reduce((s, it) => s + (it.score ?? 0), 0) * 100) / 100,
      max: pool.reduce((s, it) => s + it.max, 0),
    })
  }
  for (const [skill, band] of [['writing', writing], ['speaking', speaking]] as [Skill, number | null][]) {
    const pool = items.filter(it => !it.objective && it.skill === skill)
    if (pool.length === 0) continue
    per_skill.push({
      skill,
      label: cefrBandLabel(band),
      numeric: band === null ? null : Math.round(band * 100) / 100,
      raw: Math.round(pool.reduce((s, it) => s + (it.score ?? 0), 0) * 100) / 100,
      max: pool.reduce((s, it) => s + it.max, 0),
    })
  }

  return {
    model: 'cefr_level',
    overall,
    strength,
    cefr_j: cefrJLabel(overall, strength),
    numeric: Math.round(numeric * 100) / 100,
    receptive_numeric: receptive === null ? null : Math.round(receptive * 100) / 100,
    writing_band: writing === null ? null : Math.round(writing * 100) / 100,
    speaking_band: speaking === null ? null : Math.round(speaking * 100) / 100,
    level_fractions: Object.fromEntries(
      Object.entries(allFractions).map(([k, v]) => [k, v === null ? null : Math.round(v * 1000) / 1000])
    ),
    per_skill,
  }
}

// ---------------------------------------------------------------------------
//  Versant GSE scoring (English Speaking and Listening Test)
// ---------------------------------------------------------------------------
//  The real test reports an Overall score on Pearson's Global Scale of English
//  (10-90) plus Listening, Speaking and Manner of Speaking subscores, where
//  Listening = 50% of Overall and Speaking = 50% (half of which is Manner of
//  Speaking) — i.e. content 75% / manner 25%. Pearson's IRT equating is
//  proprietary, so we approximate each component linearly onto 10-90:
//    componentGSE = 10 + fraction * 80
//  Listening content comes from the listening sections' raw scores, speaking
//  content from the speaking sections', and manner from the audio grader's
//  per-item manner_score (0-5) averaged across all spoken responses.
//
//  Expected config (the track's overall score_scales row):
//    { "model":"versant_gse", "min":10, "max":90,
//      "weights":{"listening":0.5,"speaking_content":0.25,"manner":0.25},
//      "cefr":[{"min":85,"level":"C2"}, ...] }
export interface VersantResult {
  model: 'versant_gse'
  overall: number
  cefr: string | null
  listening: number | null
  speaking: number | null
  manner_of_speaking: number | null
  per_skill: { skill: Skill; gse: number | null; raw: number; max: number }[]
}

export function computeVersantResult(
  config: Json,
  perSkill: Map<Skill, { raw: number; max: number }>,
  /** average per-item manner_score normalized to 0..1, or null if none were produced */
  manner01: number | null
): VersantResult {
  const min = Number(config.min) || 10
  const max = Number(config.max) || 90
  const w = config.weights ?? {}
  const wL = Number(w.listening) || 0.5
  const wC = Number(w.speaking_content) || 0.25
  const wM = Number(w.manner) || 0.25

  const toGse = (fraction: number | null): number | null =>
    fraction === null ? null : Math.round(clamp(min + fraction * (max - min), min, max))

  const frac = (skill: Skill): number | null => {
    const agg = perSkill.get(skill)
    return agg && agg.max > 0 ? agg.raw / agg.max : null
  }

  const listenFrac = frac('listening')
  const speakFrac = frac('speaking')
  // If the grader produced no manner data (e.g. an all-human-graded attempt),
  // fall back to the speaking content fraction so the weights still sum.
  const mannerFrac = manner01 ?? speakFrac

  const listening = toGse(listenFrac)
  const manner = toGse(mannerFrac)
  const speakingContent = toGse(speakFrac)
  const speaking = speakFrac === null && mannerFrac === null
    ? null
    : toGse(((speakFrac ?? mannerFrac ?? 0) + (mannerFrac ?? speakFrac ?? 0)) / 2)

  // Overall: renormalize weights over the components actually present.
  const parts: { value: number | null; weight: number }[] = [
    { value: listenFrac, weight: wL },
    { value: speakFrac, weight: wC },
    { value: mannerFrac, weight: wM },
  ].filter(p => p.value !== null) as { value: number; weight: number }[]
  const wSum = parts.reduce((s, p) => s + p.weight, 0)
  const overallFrac = wSum > 0 ? parts.reduce((s, p) => s + (p.value as number) * p.weight, 0) / wSum : 0
  const overall = toGse(overallFrac) ?? min

  let cefr: string | null = null
  if (Array.isArray(config.cefr)) {
    const sorted = [...config.cefr].sort((a, b) => Number(b.min) - Number(a.min))
    const hit = sorted.find(b => overall >= Number(b.min))
    if (hit) cefr = String(hit.level)
  }

  const per_skill = (['listening', 'speaking'] as Skill[])
    .filter(s => perSkill.has(s))
    .map(s => {
      const agg = perSkill.get(s)!
      return {
        skill: s,
        gse: s === 'listening' ? listening : speaking,
        raw: Math.round(agg.raw * 100) / 100,
        max: agg.max,
      }
    })

  return {
    model: 'versant_gse',
    overall,
    cefr,
    listening,
    speaking,
    manner_of_speaking: manner,
    per_skill,
  }
}
