/**
 * Attach the seven photographs to the TOEIC S&W mock (see TOEIC-SW-PHOTOS.md).
 *
 *   node --env-file=.env.local scripts/attach-toeic-sw-images.mjs ./folder
 *
 * Folder must contain s3.jpg s4.jpg (speaking Q3-4) and w1.jpg … w5.jpg
 * (writing Q1-5). Uploads to the test-assets bucket, creates asset rows and
 * links each to the right question group. Idempotent.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'test-assets'

// [form slug, section part_label, group order_index, file, alt text]
const TARGETS = [
  ['toeic-sw-speaking-mock-01', 'Questions 3-4', 0, 's3.jpg', 'A woman with a basket choosing tomatoes at a farmers market stall while a vendor weighs produce.'],
  ['toeic-sw-speaking-mock-01', 'Questions 3-4', 1, 's4.jpg', 'Colleagues in a meeting room while a man points at a chart on a whiteboard.'],
  ['toeic-sw-writing-mock-01', 'Questions 1-5', 0, 'w1.jpg', 'A woman in a helmet riding a bicycle along a park path.'],
  ['toeic-sw-writing-mock-01', 'Questions 1-5', 1, 'w2.jpg', 'A delivery worker carrying a stack of cardboard boxes up steps.'],
  ['toeic-sw-writing-mock-01', 'Questions 1-5', 2, 'w3.jpg', 'Pedestrians crossing a street holding umbrellas in the rain.'],
  ['toeic-sw-writing-mock-01', 'Questions 1-5', 3, 'w4.jpg', 'A waiter taking an order from two customers reading menus at a café.'],
  ['toeic-sw-writing-mock-01', 'Questions 1-5', 4, 'w5.jpg', 'A woman giving a presentation with a chart while colleagues take notes.'],
]

async function main() {
  const dir = process.argv[2]
  if (!dir) { console.error('Usage: node scripts/attach-toeic-sw-images.mjs <folder>'); process.exit(1) }
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  const missing = TARGETS.map(t => t[3]).filter(f => !existsSync(join(dir, f)))
  if (missing.length) { console.error('Missing files:\n  ' + missing.join('\n  ')); process.exit(1) }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  for (const [slug, partLabel, orderIndex, file, alt] of TARGETS) {
    process.stdout.write(`${file} -> ${slug} [${partLabel} #${orderIndex}] … `)
    const { data: form } = await supabase.from('test_forms').select('id').eq('slug', slug).single()
    if (!form) throw new Error(`form ${slug} not found — run seed-toeic-sw-full.sql first`)
    const { data: section } = await supabase.from('sections')
      .select('id').eq('form_id', form.id).eq('part_label', partLabel).single()
    if (!section) throw new Error(`section "${partLabel}" not found`)
    const { data: group } = await supabase.from('question_groups')
      .select('id').eq('section_id', section.id).eq('order_index', orderIndex).single()
    if (!group) throw new Error(`group #${orderIndex} not found`)

    const path = `images/${slug}-${file}`
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
  console.log('\n✓ All seven S&W photographs attached.')
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1) })
