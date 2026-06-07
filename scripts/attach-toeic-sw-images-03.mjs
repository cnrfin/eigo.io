/**
 * Attach the seven photographs to TOEIC S&W Mock 3 (see TOEIC-SW-PHOTOS-03.md).
 *
 *   node --env-file=.env.local scripts/attach-toeic-sw-images-03.mjs ./folder
 *
 * Folder must contain m3s3.jpg m3s4.jpg (speaking Q3-4) and m3w1.jpg … m3w5.jpg
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
  ['toeic-sw-speaking-mock-03', 'Questions 3-4', 0, 'm3s3.jpg', 'Several people waiting under a bus shelter, a young man checking his phone, as a city bus approaches along the street.'],
  ['toeic-sw-speaking-mock-03', 'Questions 3-4', 1, 'm3s4.jpg', 'Two colleagues in an open-plan office looking at a tablet together, one pointing at the screen, with other employees at desks behind.'],
  ['toeic-sw-writing-mock-03', 'Questions 1-5', 0, 'm3w1.jpg', 'A florist in an apron selling colorful flowers to a customer at an outdoor market stall.'],
  ['toeic-sw-writing-mock-03', 'Questions 1-5', 1, 'm3w2.jpg', 'Passengers boarding a train through its open doors at a station platform.'],
  ['toeic-sw-writing-mock-03', 'Questions 1-5', 2, 'm3w3.jpg', 'A woman eating a salad while working on a laptop at a café table.'],
  ['toeic-sw-writing-mock-03', 'Questions 1-5', 3, 'm3w4.jpg', 'A tour guide pointing at a large information sign while a group of tourists looks on.'],
  ['toeic-sw-writing-mock-03', 'Questions 1-5', 4, 'm3w5.jpg', 'A man arranging chairs around a long table in an empty meeting room.'],
]

async function main() {
  const dir = process.argv[2]
  if (!dir) { console.error('Usage: node scripts/attach-toeic-sw-images-03.mjs <folder>'); process.exit(1) }
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  const missing = TARGETS.map(t => t[3]).filter(f => !existsSync(join(dir, f)))
  if (missing.length) { console.error('Missing files:\n  ' + missing.join('\n  ')); process.exit(1) }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  for (const [slug, partLabel, orderIndex, file, alt] of TARGETS) {
    process.stdout.write(`${file} -> ${slug} [${partLabel} #${orderIndex}] … `)
    const { data: form } = await supabase.from('test_forms').select('id').eq('slug', slug).single()
    if (!form) throw new Error(`form ${slug} not found — run seed-toeic-sw-full-03.sql first`)
    const { data: section } = await supabase.from('sections')
      .select('id').eq('form_id', form.id).eq('part_label', partLabel).single()
    if (!section) throw new Error(`section "${partLabel}" not found`)
    const { data: group } = await supabase.from('question_groups')
      .select('id').eq('section_id', section.id).eq('order_index', orderIndex).single()
    if (!group) throw new Error(`group #${orderIndex} not found`)

    const path = `images/${slug}-${file.replace(/^m3/, '')}`
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
  console.log('\n✓ All seven S&W Mock 3 photographs attached.')
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1) })
