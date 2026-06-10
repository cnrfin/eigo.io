/**
 * Apply the 2026-06-09 course audit fixes to lesson_screens.content.
 *
 * Reads supabase/course-audit-fixes-2026-06-09.json (array of
 * { screen_id, field, before_snippet, after }) and merges each `after`
 * value into the screen's content JSONB at `field`.
 *
 * Safety: dry-run by default — prints what would change. For string fields
 * it verifies `before_snippet` is still present in the current value and
 * SKIPS (with a warning) if not, so re-edited screens are never clobbered.
 *
 *   node --env-file=.env.local scripts/apply-course-audit-fixes.mjs          # dry run
 *   node --env-file=.env.local scripts/apply-course-audit-fixes.mjs --apply  # write
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
  process.exit(1)
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const APPLY = process.argv.includes('--apply')

const fixes = JSON.parse(readFileSync(new URL('../supabase/course-audit-fixes-2026-06-09.json', import.meta.url), 'utf8'))

// Group by screen so each screen is fetched/written once
const byScreen = new Map()
for (const f of fixes) {
  if (!byScreen.has(f.screen_id)) byScreen.set(f.screen_id, [])
  byScreen.get(f.screen_id).push(f)
}

let applied = 0, skipped = 0
for (const [id, screenFixes] of byScreen) {
  const { data: row, error } = await db.from('lesson_screens').select('id, content').eq('id', id).single()
  if (error || !row) { console.warn(`SKIP ${id}: screen not found`); skipped += screenFixes.length; continue }
  const content = row.content
  let dirty = false
  for (const f of screenFixes) {
    const current = content[f.field]
    if (typeof current === 'string' && f.before_snippet && !current.includes(f.before_snippet)) {
      console.warn(`SKIP ${id} ${f.field}: before_snippet no longer present (screen changed since audit)`)
      skipped++
      continue
    }
    content[f.field] = f.after
    dirty = true
    applied++
    console.log(`${APPLY ? 'FIX ' : 'DRY '}${id} ${f.field}${f.note ? ' — ' + f.note : ''}`)
  }
  if (APPLY && dirty) {
    const { error: ue } = await db.from('lesson_screens').update({ content }).eq('id', id)
    if (ue) { console.error(`WRITE FAILED ${id}: ${ue.message}`); process.exit(1) }
  }
}
console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${applied} field fixes across ${byScreen.size} screens (${skipped} skipped).${APPLY ? '' : ' Run with --apply to write.'}`)
