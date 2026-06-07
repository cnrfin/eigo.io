/**
 * Shuffle the option order of single_choice / multiple_choice questions so
 * correct answers don't form patterns (e.g. choose-TWO always being A+B).
 *
 *   node --env-file=.env.local scripts/shuffle-choice-options.mjs <form-slug> [...] [--skip-audio-groups]
 *
 * - Deterministic: the permutation is derived from the question id, so
 *   re-running produces the same order (safe to run after every re-seed).
 * - Option IDs are preserved — only order_index and the A/B/C labels move —
 *   so saved responses keep meaning and grading is unaffected.
 * - true_false_notgiven questions are never touched (fixed T/F/NG order).
 * - --skip-audio-groups: leave questions in audio groups alone. REQUIRED for
 *   forms where the recording reads options aloud by letter (TOEIC listening).
 *   IELTS listening recordings never speak option letters, so they're safe.
 * - --parts "Part 3,Part 4": only touch sections with these part_labels.
 *   For TOEIC listening, Parts 1-2 options are SPOKEN (never shuffle) while
 *   Parts 3-4 options are printed (safe).
 *
 * Standard usage after seeding a new mock:
 *   node --env-file=.env.local scripts/shuffle-choice-options.mjs <new-form-slug>
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const args = process.argv.slice(2)
const skipAudio = args.includes('--skip-audio-groups')
const partsIdx = args.indexOf('--parts')
const onlyParts = partsIdx === -1 ? null : args[partsIdx + 1].split(',').map(s => s.trim())
const slugs = args.filter((a, i) => !a.startsWith('--') && i !== partsIdx + 1)
if (!slugs.length) { console.error('Usage: shuffle-choice-options.mjs <form-slug> [...] [--skip-audio-groups]'); process.exit(1) }

// Deterministic Fisher-Yates seeded by question id
function permutation(n, seedStr) {
  const seed = createHash('sha1').update(seedStr).digest()
  const idx = [...Array(n).keys()]
  let s = 0
  for (let i = n - 1; i > 0; i--) {
    s = (s + seed[i % seed.length] + seed[(i * 7) % seed.length]) % 997
    const j = s % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

let changed = 0
for (const slug of slugs) {
  const { data: form } = await supabase.from('test_forms').select('id').eq('slug', slug).single()
  if (!form) { console.error(`form not found: ${slug}`); process.exit(1) }
  const { data: allSecs } = await supabase.from('sections').select('id, part_label').eq('form_id', form.id)
  const secs = onlyParts ? allSecs.filter(x => onlyParts.includes(x.part_label)) : allSecs
  const { data: grps } = await supabase.from('question_groups').select('id, audio_asset_id').in('section_id', secs.map(x => x.id))
  const groups = skipAudio ? grps.filter(g => !g.audio_asset_id) : grps
  if (!groups.length) { console.log(`${slug}: no eligible groups`); continue }
  const { data: qs } = await supabase
    .from('questions').select('id, question_type')
    .in('group_id', groups.map(g => g.id))
    .in('question_type', ['single_choice', 'multiple_choice'])
  for (const q of qs ?? []) {
    const { data: opts } = await supabase
      .from('question_options').select('id, order_index, label')
      .eq('question_id', q.id).order('order_index')
    if (!opts || opts.length < 2) continue
    const labels = opts.map(o => o.label) // reuse the existing label sequence (A,B,C…)
    const perm = permutation(opts.length, q.id)
    // perm[newPos] = oldPos → option formerly at oldPos moves to newPos
    for (let newPos = 0; newPos < perm.length; newPos++) {
      const opt = opts[perm[newPos]]
      // two-phase to avoid (question_id, order_index) collisions mid-update
      const { error } = await supabase.from('question_options')
        .update({ order_index: 100 + newPos, label: labels[newPos] }).eq('id', opt.id)
      if (error) throw new Error(error.message)
    }
    for (let newPos = 0; newPos < perm.length; newPos++) {
      const opt = opts[perm[newPos]]
      const { error } = await supabase.from('question_options')
        .update({ order_index: newPos }).eq('id', opt.id)
      if (error) throw new Error(error.message)
    }
    changed++
  }
  console.log(`${slug}: shuffled ${qs?.length ?? 0} questions${skipAudio ? ' (audio groups skipped)' : ''}`)
}
console.log(`✓ ${changed} questions re-ordered.`)
