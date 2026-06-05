/**
 * Reset ALL user attempts on one test form (the content stays untouched).
 *
 * Deletes, for every user:
 *   - their recorded answers in Storage (test-assets/speaking/{attempt}/...)
 *     — via the Storage API (direct SQL deletes on storage.objects are blocked)
 *   - the asset rows for those recordings
 *   - the attempts themselves (responses + per-skill scores cascade)
 * Attempts are one-per-form, so afterwards everyone can take the test again.
 *
 * Usage (slug defaults to the Versant mock):
 *   node --env-file=.env.local scripts/reset-test-attempts.mjs [form-slug]
 *   node --env-file=.env.local scripts/reset-test-attempts.mjs cefr-check-01
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'test-assets'
const FORM_SLUG = process.argv[2] || 'versant-eslt-mock-01'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Run with:  node --env-file=.env.local scripts/reset-test-attempts.mjs [form-slug]')
  process.exit(1)
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: form } = await supabase.from('test_forms').select('id, title').eq('slug', FORM_SLUG).maybeSingle()
  if (!form) throw new Error(`Form "${FORM_SLUG}" not found.`)

  const { data: attempts } = await supabase.from('test_attempts').select('id').eq('form_id', form.id)
  const attemptIds = (attempts ?? []).map(a => a.id)
  if (attemptIds.length === 0) {
    console.log(`No attempts on ${FORM_SLUG} — nothing to reset.`)
    return
  }

  // 1. Recording FILES (Storage API): test-assets/speaking/{attemptId}/...
  let removedFiles = 0
  for (const id of attemptIds) {
    const dir = `speaking/${id}`
    const { data: files } = await supabase.storage.from(BUCKET).list(dir, { limit: 1000 })
    if (files?.length) {
      const { error } = await supabase.storage.from(BUCKET).remove(files.map(f => `${dir}/${f.name}`))
      if (error) console.warn(`  ! could not remove ${dir}: ${error.message}`)
      else removedFiles += files.length
    }
  }

  // 2. The recordings' asset rows (responses.audio_asset_id is ON DELETE SET NULL).
  const { data: resp } = await supabase
    .from('responses').select('audio_asset_id').in('attempt_id', attemptIds).not('audio_asset_id', 'is', null)
  const assetIds = [...new Set((resp ?? []).map(r => r.audio_asset_id))]
  if (assetIds.length) {
    const { error } = await supabase.from('assets').delete().in('id', assetIds)
    if (error) throw new Error(`assets delete: ${error.message}`)
  }

  // 3. The attempts — responses + attempt_skill_scores cascade.
  const { error: attErr } = await supabase.from('test_attempts').delete().in('id', attemptIds)
  if (attErr) throw new Error(`attempts delete: ${attErr.message}`)

  console.log(`✓ Reset ${FORM_SLUG} ("${form.title}"): ${attemptIds.length} attempt(s), ${assetIds.length} recording asset(s), ${removedFiles} file(s) removed.`)
}

main().catch(err => { console.error('\nReset failed:', err.message); process.exit(1) })
