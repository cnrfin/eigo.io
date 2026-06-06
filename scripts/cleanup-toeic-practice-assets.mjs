/**
 * Remove orphaned Storage files + asset rows left behind by the retired
 * TOEIC practice forms (deleted by supabase/launch-toeic.sql).
 *
 *   node --env-file=.env.local scripts/cleanup-toeic-practice-assets.mjs
 *
 * Only touches assets whose storage_path contains 'practice-01' AND that are
 * no longer referenced by any question group. Safe to re-run.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)
const BUCKET = 'test-assets'

const { data: assets, error } = await supabase
  .from('assets').select('id, storage_path').like('storage_path', '%practice-01%')
if (error) throw error
if (!assets?.length) { console.log('No practice assets found — nothing to do.'); process.exit(0) }

for (const a of assets) {
  const [{ count: img }, { count: aud }] = await Promise.all([
    supabase.from('question_groups').select('id', { count: 'exact', head: true }).eq('image_asset_id', a.id),
    supabase.from('question_groups').select('id', { count: 'exact', head: true }).eq('audio_asset_id', a.id),
  ])
  if ((img ?? 0) + (aud ?? 0) > 0) { console.log(`SKIP (still referenced): ${a.storage_path}`); continue }
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove([a.storage_path])
  if (rmErr) console.log(`  storage remove warning for ${a.storage_path}: ${rmErr.message}`)
  const { error: delErr } = await supabase.from('assets').delete().eq('id', a.id)
  if (delErr) throw delErr
  console.log(`deleted: ${a.storage_path}`)
}
console.log('✓ Cleanup complete.')
