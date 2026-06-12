/**
 * Apply a course-audit fixes file to lesson_screens.content.
 *
 * Reads a fixes JSON (default supabase/course-audit-fixes-2026-06-09.json,
 * or pass a path as the first non-flag argument). Each fix is one of:
 *   { screen_id, field, before_snippet, after }   — replace the whole field
 *   { screen_id, field, find, replace }           — replace within a string field
 *   { screen_id, field, find, replace, deep:true }— replace inside every string
 *                                                   nested under a non-string field
 *
 * Safety: dry-run by default — prints what would change. Whole-field fixes
 * verify `before_snippet` is still present; find/replace fixes verify `find`
 * still occurs. Anything that no longer matches is SKIPPED with a warning,
 * so re-edited screens are never clobbered.
 *
 *   node --env-file=.env.local scripts/apply-course-audit-fixes.mjs [fixes.json]          # dry run
 *   node --env-file=.env.local scripts/apply-course-audit-fixes.mjs [fixes.json] --apply  # write
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

const fileArg = process.argv.slice(2).find(a => !a.startsWith('--'))
const fixesUrl = fileArg ? new URL(fileArg, `file://${process.cwd()}/`) : new URL('../supabase/course-audit-fixes-2026-06-09.json', import.meta.url)
const fixes = JSON.parse(readFileSync(fixesUrl, 'utf8'))

// Replace `find` with `replace` in every string nested anywhere under `val`.
function deepReplace(val, find, replace) {
  if (typeof val === 'string') return val.split(find).join(replace)
  if (Array.isArray(val)) return val.map(v => deepReplace(v, find, replace))
  if (val && typeof val === 'object') return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, deepReplace(v, find, replace)]))
  return val
}

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
    if (f.find != null) {
      const blob = typeof current === 'string' ? current : JSON.stringify(current)
      if (!blob.includes(f.find)) {
        console.warn(`SKIP ${id} ${f.field}: find-text no longer present (screen changed since audit)`)
        skipped++
        continue
      }
      content[f.field] = typeof current === 'string' && !f.deep
        ? current.split(f.find).join(f.replace)
        : deepReplace(current, f.find, f.replace)
    } else {
      if (typeof current === 'string' && f.before_snippet && !current.includes(f.before_snippet)) {
        console.warn(`SKIP ${id} ${f.field}: before_snippet no longer present (screen changed since audit)`)
        skipped++
        continue
      }
      content[f.field] = f.after
    }
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
