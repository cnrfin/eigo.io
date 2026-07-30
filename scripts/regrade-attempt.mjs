/**
 * Re-grade a single test attempt from its saved responses.
 *
 * Usage:
 *   node --env-file=.env.local scripts/regrade-attempt.mjs <attempt-id>
 *
 * Example:
 *   node --env-file=.env.local scripts/regrade-attempt.mjs 5c4655f1-80f1-4f78-8467-7efdea5e3f86
 */
const attemptId = process.argv[2]
if (!attemptId) { console.error('Usage: node --env-file=.env.local scripts/regrade-attempt.mjs <attempt-id>'); process.exit(1) }

// Dynamic import so we can use the project's compiled modules
const { createClient } = await import('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// We can't import the TS grading modules directly from an mjs script, so
// replicate the finalizeAttempt logic here (score aggregation + CEFR walk).
// This does NOT re-run AI grading — it just recalculates scores from whatever
// is already in the responses table.

const { data: attempt } = await supabase
  .from('test_attempts').select('id, user_id, form_id, submitted_at').eq('id', attemptId).single()
if (!attempt) { console.error('Attempt not found'); process.exit(1) }

const { data: form } = await supabase
  .from('test_forms')
  .select('id, track_id, mode, track:exam_tracks ( scoring_model )')
  .eq('id', attempt.form_id).single()

const scoringModel = form?.track?.scoring_model ?? 'raw'

const { data: sections } = await supabase.from('sections').select('id, skill').eq('form_id', attempt.form_id)
const sectionSkill = new Map((sections ?? []).map(s => [s.id, s.skill]))

const { data: groups } = await supabase.from('question_groups').select('id, section_id').in('section_id', (sections ?? []).map(s => s.id))
const groupSection = new Map((groups ?? []).map(g => [g.id, g.section_id]))

const { data: questions } = await supabase
  .from('questions').select('id, group_id, scoring_method, payload, max_score')
  .in('group_id', (groups ?? []).map(g => g.id))

const { data: responses } = await supabase
  .from('responses').select('question_id, selected_option_ids, text_response, audio_asset_id, score, graded_by, ai_feedback')
  .eq('attempt_id', attemptId)
const responseMap = new Map((responses ?? []).map(r => [r.question_id, r]))

// Build items
const items = (questions ?? []).map(q => {
  const sectionId = groupSection.get(q.group_id)
  const skill = sectionId ? sectionSkill.get(sectionId) : 'reading'
  const max = Number(q.max_score) || 1
  const r = responseMap.get(q.id)
  const score = r && r.score !== null && r.score !== undefined ? Number(r.score) : null
  // Only "pending" if student actually submitted content but it's ungraded
  const hasContent = r && (
    (Array.isArray(r.selected_option_ids) && r.selected_option_ids.length > 0) ||
    (typeof r.text_response === 'string' && r.text_response.trim().length > 0) ||
    !!r.audio_asset_id
  )
  return { skill, score, max_score: max, weight: Number(q.payload?.weight) || 1, pending: score === null && !!hasContent }
})

// Per-skill aggregation
const perSkill = new Map()
for (const it of items) {
  const agg = perSkill.get(it.skill) ?? { raw: 0, max: 0 }
  agg.raw += it.score ?? 0
  agg.max += it.max_score
  perSkill.set(it.skill, agg)
}

const rawTotal = items.reduce((s, it) => s + (it.score ?? 0), 0)
const maxTotal = items.reduce((s, it) => s + it.max_score, 0)
const pendingHuman = items.some(it => it.pending)

console.log('\nPer-skill scores:')
for (const [skill, agg] of perSkill) {
  console.log(`  ${skill}: ${agg.raw}/${agg.max} (${Math.round(agg.raw / agg.max * 100)}%)`)
}

// ── CEFR scoring ──
const { data: scales } = form?.track_id
  ? await supabase.from('score_scales').select('skill, scale').eq('track_id', form.track_id)
  : { data: [] }
let overallScale = null
for (const s of scales ?? []) { if (!s.skill) overallScale = s.scale }

const cefrConfig = overallScale?.model === 'cefr_level' ? overallScale : null
if (!cefrConfig) { console.error('Not a CEFR test — this script only handles CEFR re-scoring'); process.exit(1) }

const levels = cefrConfig.levels ?? ['A1', 'A2', 'B1', 'B2', 'C1']
const pass = Number(cefrConfig.pass_fraction) || 0.6
const weights = cefrConfig.weights ?? {}
const wObj = Number(weights.objective) || 0.5
const wWri = Number(weights.writing) || 0.25
const wSpk = Number(weights.speaking) || 0.25

// Build CEFR items
const cefrItems = (questions ?? []).map(q => {
  const sectionId = groupSection.get(q.group_id)
  const skill = sectionId ? sectionSkill.get(sectionId) : 'reading'
  const r = responseMap.get(q.id)
  return {
    level: String(q.payload?.cefr ?? '') || null,
    skill,
    objective: q.scoring_method === 'auto_choice' || q.scoring_method === 'auto_text',
    score: r && r.score !== null && r.score !== undefined ? Number(r.score) : null,
    max: Number(q.max_score) || 1,
  }
})

// Fraction correct per level basket
function fractions(filter) {
  const out = {}
  for (const lv of levels) {
    const pool = cefrItems.filter(it => it.objective && it.level === lv && (!filter || filter(it)))
    const max = pool.reduce((s, it) => s + it.max, 0)
    out[lv] = max > 0 ? pool.reduce((s, it) => s + (it.score ?? 0), 0) / max : null
  }
  return out
}

// Walk up the ladder (lenient: skips empty levels, continues past failures)
function walk(fr) {
  let any = false, n = 0
  for (const lv of levels) {
    const f = fr[lv]
    if (f === null) continue
    any = true
    if (f >= pass) { n += 1; continue }
    n += Math.min(0.99, f / pass)
  }
  return any ? n : null
}

const allFractions = fractions()
const receptive = walk(allFractions)

console.log('\nCEFR level fractions:')
for (const [lv, f] of Object.entries(allFractions)) {
  console.log(`  ${lv}: ${f === null ? 'no items' : Math.round(f * 100) + '%'}${f !== null && f >= pass ? ' ✓' : ''}`)
}

// Writing / speaking bands
function bandOf(pool) {
  const graded = pool.filter(it => it.score !== null)
  if (graded.length === 0) return null
  return graded.reduce((s, it) => s + it.score, 0) / graded.length
}
const writing = bandOf(cefrItems.filter(it => !it.objective && it.skill === 'writing'))
const speaking = bandOf(cefrItems.filter(it => !it.objective && it.skill === 'speaking'))

// Fuse
const parts = [
  { value: receptive, weight: wObj },
  { value: writing, weight: wWri },
  { value: speaking, weight: wSpk },
].filter(p => p.value !== null)
const wSum = parts.reduce((s, p) => s + p.weight, 0)
const numeric = wSum > 0 ? Math.min(6, parts.reduce((s, p) => s + p.value * p.weight, 0) / wSum) : 0

const CEFR_BAND_LABELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const bandIdx = Math.min(6, Math.floor(numeric))
const overall = CEFR_BAND_LABELS[bandIdx]
const fracPart = numeric - bandIdx
const strength = bandIdx === 0 || bandIdx === 6 ? null : fracPart < 1/3 ? 'low' : fracPart < 2/3 ? 'mid' : 'high'

const CEFR_J = { 'Pre-A1': 'Pre-A1', 'A1': 'A1 初級', 'A2': 'A2 初中級', 'B1': 'B1 中級', 'B2': 'B2 中上級', 'C1': 'C1 上級', 'C2': 'C2 最上級' }
const strengthJ = { low: '下', mid: '中', high: '上' }
const cefr_j = overall + (strength ? ` (${strengthJ[strength]})` : '')

function cefrBandLabel(n) {
  if (n === null) return null
  const i = Math.min(6, Math.floor(n))
  const f = n - i
  const suffix = i === 0 || i === 6 ? '' : f < 1/3 ? '−' : f < 2/3 ? '' : '+'
  return CEFR_BAND_LABELS[i] + suffix
}

// Per-skill
const per_skill = []
for (const skill of ['reading', 'listening']) {
  const pool = cefrItems.filter(it => it.objective && it.skill === skill)
  if (pool.length === 0) continue
  const n = walk(fractions(it => it.skill === skill))
  per_skill.push({
    skill, label: cefrBandLabel(n),
    numeric: n === null ? null : Math.round(n * 100) / 100,
    raw: Math.round(pool.reduce((s, it) => s + (it.score ?? 0), 0) * 100) / 100,
    max: pool.reduce((s, it) => s + it.max, 0),
  })
}
for (const [skill, band] of [['writing', writing], ['speaking', speaking]]) {
  const pool = cefrItems.filter(it => !it.objective && it.skill === skill)
  if (pool.length === 0 || band === null) continue
  per_skill.push({
    skill, label: cefrBandLabel(band),
    numeric: band === null ? null : Math.round(band * 100) / 100,
    raw: Math.round(pool.reduce((s, it) => s + (it.score ?? 0), 0) * 100) / 100,
    max: pool.reduce((s, it) => s + it.max, 0),
  })
}

const rawAgg = {
  raw: Math.round(rawTotal * 100) / 100,
  max: maxTotal,
  percent: maxTotal > 0 ? Math.round(rawTotal / maxTotal * 1000) / 10 : 0,
  pending_human_review: pendingHuman,
}

const overallScore = {
  model: 'cefr_level', official_score_available: true, estimate: true,
  level: overall, strength, cefr_j,
  numeric: Math.round(numeric * 100) / 100,
  receptive_numeric: receptive === null ? null : Math.round(receptive * 100) / 100,
  writing_band: writing === null ? null : Math.round(writing * 100) / 100,
  speaking_band: speaking === null ? null : Math.round(speaking * 100) / 100,
  level_fractions: Object.fromEntries(
    Object.entries(allFractions).map(([k, v]) => [k, v === null ? null : Math.round(v * 1000) / 1000])
  ),
  per_skill,
  ...rawAgg,
}

console.log(`\nReceptive numeric: ${receptive}`)
console.log(`Writing band: ${writing}`)
console.log(`Speaking band: ${speaking} (${speaking === null ? 'excluded' : 'included'})`)
console.log(`\nFused numeric: ${numeric}`)
console.log(`\n→ Result: ${overall}${strength ? ` ${strength}` : ''} (${cefr_j})`)
console.log('\nPer-skill:')
for (const p of per_skill) console.log(`  ${p.skill}: ${p.label} (${p.raw}/${p.max})`)

// Build skill score rows
const skillScoreRows = per_skill.map(p => ({
  attempt_id: attemptId, user_id: attempt.user_id, skill: p.skill,
  raw_score: p.raw, scaled_score: p.numeric, max_score: p.max,
}))

// Update database
const status = pendingHuman ? 'submitted' : 'scored'
const now = new Date().toISOString()

// Delete stale rows (e.g. unattempted speaking) before upserting
await supabase.from('attempt_skill_scores').delete().eq('attempt_id', attemptId)
if (skillScoreRows.length > 0) {
  await supabase.from('attempt_skill_scores').upsert(skillScoreRows, { onConflict: 'attempt_id,skill' })
}

await supabase.from('test_attempts').update({
  status,
  submitted_at: attempt.submitted_at ?? now,
  scored_at: pendingHuman ? null : now,
  raw_score: Math.round(rawTotal * 100) / 100,
  overall_score: overallScore,
  updated_at: now,
}).eq('id', attemptId)

if (status === 'scored') {
  await supabase.from('profiles')
    .update({ cefr_level: overall, cefr_level_updated_at: now })
    .eq('id', attempt.user_id)
}

console.log('\n✓ Database updated successfully')
console.log(JSON.stringify(overallScore, null, 2))
