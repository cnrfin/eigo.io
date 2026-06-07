/**
 * Attach the three-panel speaking-card illustration to EIKEN Grade 2 Mock 1
 * (see supabase/EIKEN-G2-IMAGES.md).
 *
 *   node --env-file=.env.local scripts/attach-eiken-g2-images.mjs ./folder
 *
 * Folder must contain eg2-panels.jpg (the three-panel comic strip for
 * interview question No. 2). Uploads to the test-assets bucket, creates an
 * asset row and links it to the right question group. Idempotent.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'test-assets'

// [form slug, section part_label, group order_index, file, alt text]
const TARGETS = [
  ['eiken-g2-speaking-mock-01', 'Interview', 1, 'eg2-panels.jpg',
    'Three-panel story: (1) in their living room, Mrs. Sato shows Mr. Sato a store flyer with a picture of a large bookshelf; (2) the next morning, Mr. Sato unlocks a small blue shared car with his smartphone at a car-sharing parking space while Mrs. Sato waits beside it; (3) outside the furniture store, the couple happily load a large box into the back of the shared car.'],
]

async function main() {
  const dir = process.argv[2]
  if (!dir) { console.error('Usage: node scripts/attach-eiken-g2-images.mjs <folder>'); process.exit(1) }
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  const missing = TARGETS.map(t => t[3]).filter(f => !existsSync(join(dir, f)))
  if (missing.length) { console.error('Missing files:\n  ' + missing.join('\n  ')); process.exit(1) }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  for (const [slug, partLabel, orderIndex, file, alt] of TARGETS) {
    process.stdout.write(`${file} -> ${slug} [${partLabel} #${orderIndex}] … `)
    const { data: form } = await supabase.from('test_forms').select('id').eq('slug', slug).single()
    if (!form) throw new Error(`form ${slug} not found — run seed-eiken-g2-mock.sql first`)
    const { data: section } = await supabase.from('sections')
      .select('id').eq('form_id', form.id).eq('part_label', partLabel).single()
    if (!section) throw new Error(`section "${partLabel}" not found`)
    const { data: group } = await supabase.from('question_groups')
      .select('id').eq('section_id', section.id).eq('order_index', orderIndex).single()
    if (!group) throw new Error(`group #${orderIndex} not found`)

    // eg2-panels.jpg -> images/eiken-g2-speaking-mock-01-panels.jpg
    const path = `images/${slug}-${file.replace(/^eg2-/, '')}`
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, readFileSync(join(dir, file)), { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw new Error(`upload: ${upErr.message}`)

    const { data: existing } = await supabase.from('assets').select('id').eq('storage_path', path).maybeSingle()
    let assetId = existing?.id
    if (!assetId) {
      const { data, error } = await supabase.from('assets')
        .insert({ type: 'image', storage_path: path, alt_text: alt }).select('id').single()
      if (error) throw new Error(`asset: ${error.message}`)
      assetId = data.id
    }
    const { error: linkErr } = await supabase.from('question_groups')
      .update({ image_asset_id: assetId }).eq('id', group.id)
    if (linkErr) throw new Error(`link: ${linkErr.message}`)
    console.log('done.')
  }
  console.log('\n✓ EIKEN Grade 2 three-panel speaking illustration attached.')
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1) })
