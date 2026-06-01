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
 */
export const ANSWER_PAYLOAD_KEYS = [
  'accepted',
  'answer',
  'answers',
  'correct',
  'solution',
  'key',
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
}): Promise<AiGrade> {
  const max = Number(opts.rubric?.max_score) || Number((opts.rubric?.criteria as Json)?.max_score) || 9
  const criteria = opts.rubric?.criteria ?? {}

  const systemPrompt = `You are an experienced, calibrated examiner grading a ${opts.skill} response on an English proficiency practice test.

Grade ONLY against the supplied rubric. Be fair and consistent. Do not reward content unrelated to the task.

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
