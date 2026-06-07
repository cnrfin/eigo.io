/**
 * Attach the four-panel narration cartoon to EIKEN Grade Pre-1 Mock 1
 * (see supabase/EIKEN-PRE1-IMAGES.md).
 *
 *   node --env-file=.env.local scripts/attach-eiken-pre1-images.mjs ./folder
 *
 * Folder must contain ep1-panels.jpg (the 2x2 four-panel comic strip for the
 * narration card and interview question No. 1). Uploads to the test-assets
 * bucket, creates an asset row and links it to the speaking card's question
 * group. Idempotent.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'test-assets'

// [form slug, section part_label, group order_index, file, alt text]
const TARGETS = [
  ['eiken-pre1-speaking-mock-01', 'Interview', 0, 'ep1-panels.jpg',
    'Four-panel cartoon (2x2 grid). Panel 1: a woman stands annoyed while her husband and son sit on a sofa staring at a smartphone and a tablet. Panel 2: the woman shows them a leaflet picturing a sunny park with bicycles; they look reluctant. Panel 3: the three of them cycle through the park, smiling. Panel 4: the husband and son wait by the parked bicycles, annoyed, while the woman sits on a bench absorbed in her own smartphone.'],
]

async function main() {
  const dir = process.argv[2]
  if (!dir) { console.error('Usage: node scripts/attach-eiken-pre1-images.mjs <folder>'); process.exit(1) }
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  const missing = TARGETS.map(t => t[3]).filter(f => !existsSync(join(dir, f)))
  if (missing.length) { console.error('Missing files:\n  ' + missing.join('\n  ')); process.exit(1) }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  for (const [slug, partLabel, orderIndex, file, alt] of TARGETS) {
    process.stdout.write(`${file} -> ${slug} [${partLabel} #${orderIndex}] … `)
    const { data: form } = await supabase.from('test_forms').select('id').eq('slug', slug).single()
    if (!form) throw new Error(`form ${slug} not found — run seed-eiken-pre1-mock.sql first`)
    const { data: section } = await supabase.from('sections')
      .select('id').eq('form_id', form.id).eq('part_label', partLabel).single()
    if (!section) throw new Error(`section "${partLabel}" not found`)
    const { data: group } = await supabase.from('question_groups')
      .select('id').eq('section_id', section.id).eq('order_index', orderIndex).single()
    if (!group) throw new Error(`group #${orderIndex} not found`)

    // ep1-panels.jpg -> images/eiken-pre1-speaking-mock-01-panels.jpg
    const path = `images/${slug}-${file.replace(/^ep1-/, '')}`
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
  console.log('\n✓ EIKEN Pre-1 speaking narration cartoon attached.')
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1) })
