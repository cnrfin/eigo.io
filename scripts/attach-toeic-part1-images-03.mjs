/**
 * Attach the six Part 1 photographs to the TOEIC listening mock 3.
 *
 * Usage:
 *   node --env-file=.env.local scripts/attach-toeic-part1-images-03.mjs ./folder
 *
 * The folder must contain m3p1-1.jpg … m3p1-6.jpg (see supabase/TOEIC-PART1-PHOTOS-03.md).
 * Uploads each to the test-assets bucket, creates the asset row and sets
 * image_asset_id on the matching Part 1 question group. Idempotent —
 * re-running replaces the stored images and relinks them.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'test-assets'
const FORM_SLUG = 'toeic-lr-listening-mock-03'

const ALT = [
  'A florist arranging flowers in a shop window display, with buckets of cut flowers inside the shop.',
  'A chef in a white uniform at a restaurant kitchen counter, arranging food on a plate.',
  'Commuters stepping through the open doors of a train stopped at a station platform.',
  'A gardener using hedge trimmers to trim a tall hedge alongside a garden path.',
  'A receptionist behind a front desk handing a visitor badge to a man in a suit in an office lobby.',
  'Two movers loading a sofa into the back of a moving truck parked at the curb.',
]

async function main() {
  const dir = process.argv[2]
  if (!dir) { console.error('Usage: node scripts/attach-toeic-part1-images-03.mjs <folder-with-m3p1-1..6.jpg>'); process.exit(1) }
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

  const files = Array.from({ length: 6 }, (_, i) => join(dir, `m3p1-${i + 1}.jpg`))
  const missing = files.filter(f => !existsSync(f))
  if (missing.length) { console.error('Missing files:\n  ' + missing.join('\n  ')); process.exit(1) }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // Find the Part 1 groups, in order.
  const { data: form } = await supabase.from('test_forms').select('id').eq('slug', FORM_SLUG).single()
  if (!form) throw new Error(`Form ${FORM_SLUG} not found — run scripts/seed-toeic-listening-full-03.mjs first.`)
  const { data: section } = await supabase.from('sections')
    .select('id').eq('form_id', form.id).eq('part_label', 'Part 1').single()
  if (!section) throw new Error('Part 1 section not found.')
  const { data: groups } = await supabase.from('question_groups')
    .select('id, order_index').eq('section_id', section.id).order('order_index')
  if (!groups || groups.length !== 6) throw new Error(`Expected 6 Part 1 groups, found ${groups?.length ?? 0}.`)

  for (let i = 0; i < 6; i++) {
    const path = `images/${FORM_SLUG}-p1-${i + 1}.jpg`
    process.stdout.write(`Photo ${i + 1}/6: uploading… `)
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, readFileSync(files[i]), { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw new Error(`upload ${path}: ${upErr.message}`)

    // Reuse the asset row if it exists, otherwise create it.
    const { data: existing } = await supabase.from('assets').select('id').eq('storage_path', path).maybeSingle()
    let assetId = existing?.id
    if (!assetId) {
      const { data, error } = await supabase.from('assets')
        .insert({ type: 'image', storage_path: path, alt_text: ALT[i] }).select('id').single()
      if (error) throw new Error(`asset insert: ${error.message}`)
      assetId = data.id
    }

    const { error: linkErr } = await supabase.from('question_groups')
      .update({ image_asset_id: assetId }).eq('id', groups[i].id)
    if (linkErr) throw new Error(`group link: ${linkErr.message}`)
    console.log('done.')
  }

  console.log('\n✓ All six Part 1 photographs attached.')
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1) })
