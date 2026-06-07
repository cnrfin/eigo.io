/**
 * Attach the eleven illustrations to EIKEN Grade 3 Mock Test 1
 * (see supabase/EIKEN-G3-IMAGES.md).
 *
 *   node --env-file=.env.local scripts/attach-eiken-g3-images.mjs ./folder
 *
 * Folder must contain eg3-l01.jpg … eg3-l10.jpg (listening 第1部 Q1-10) and
 * eg3-card.jpg (speaking interview card). Uploads to the test-assets bucket,
 * creates asset rows and links each to the right question group. Idempotent.
 *
 * Run AFTER scripts/seed-eiken-g3-listening-mock.mjs and
 * supabase/seed-eiken-g3-mock.sql.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'test-assets'

// [form slug, section part_label, group order_index, file, storage suffix, alt text]
const TARGETS = [
  ['eiken-g3-listening-mock-01', '第1部', 0, 'eg3-l01.jpg', 'l01',
    'A boy kneeling and looking under his bed for a cap while his mother stands at the door of his room.'],
  ['eiken-g3-listening-mock-01', '第1部', 1, 'eg3-l02.jpg', 'l02',
    'A boy holding a new soccer ball and talking with a girl in a park.'],
  ['eiken-g3-listening-mock-01', '第1部', 2, 'eg3-l03.jpg', 'l03',
    'A girl talking to a librarian at a library counter, with bookshelves behind them.'],
  ['eiken-g3-listening-mock-01', '第1部', 3, 'eg3-l04.jpg', 'l04',
    'Two students at a school entrance on a rainy day; the girl holds an umbrella and the boy has none.'],
  ['eiken-g3-listening-mock-01', '第1部', 4, 'eg3-l05.jpg', 'l05',
    'A boy and his father looking at a white rabbit in a cage at a pet shop.'],
  ['eiken-g3-listening-mock-01', '第1部', 5, 'eg3-l06.jpg', 'l06',
    'A girl talking on the phone in her living room.'],
  ['eiken-g3-listening-mock-01', '第1部', 6, 'eg3-l07.jpg', 'l07',
    'A teacher looking at a girl’s drawing in an art classroom.'],
  ['eiken-g3-listening-mock-01', '第1部', 7, 'eg3-l08.jpg', 'l08',
    'A boy talking with a clerk in a clothing store with T-shirts on display.'],
  ['eiken-g3-listening-mock-01', '第1部', 8, 'eg3-l09.jpg', 'l09',
    'A mother cooking curry at the stove while a hungry boy stands by the kitchen table.'],
  ['eiken-g3-listening-mock-01', '第1部', 9, 'eg3-l10.jpg', 'l10',
    'A girl asking a man a question at a bus stop, with a bus visible in the distance.'],
  ['eiken-g3-speaking-mock-01', 'Interview', 0, 'eg3-card.jpg', 'card',
    'A zoo scene: a boy taking a picture of the monkeys with a camera, a girl eating an ice cream, three birds sitting on a fence, and a child riding a pony in the background.'],
]

async function main() {
  const dir = process.argv[2]
  if (!dir) { console.error('Usage: node scripts/attach-eiken-g3-images.mjs <folder>'); process.exit(1) }
  if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  const missing = TARGETS.map(t => t[3]).filter(f => !existsSync(join(dir, f)))
  if (missing.length) { console.error('Missing files:\n  ' + missing.join('\n  ')); process.exit(1) }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  for (const [slug, partLabel, orderIndex, file, suffix, alt] of TARGETS) {
    process.stdout.write(`${file} -> ${slug} [${partLabel} #${orderIndex}] … `)
    const { data: form } = await supabase.from('test_forms').select('id').eq('slug', slug).single()
    if (!form) throw new Error(`form ${slug} not found — run the EIKEN G3 mock seeds first`)
    const { data: section } = await supabase.from('sections')
      .select('id').eq('form_id', form.id).eq('part_label', partLabel).single()
    if (!section) throw new Error(`section "${partLabel}" not found`)
    const { data: group } = await supabase.from('question_groups')
      .select('id').eq('section_id', section.id).eq('order_index', orderIndex).single()
    if (!group) throw new Error(`group #${orderIndex} not found`)

    const path = `images/${slug}-${suffix}.jpg`
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
    } else {
      await supabase.from('assets').update({ alt_text: alt }).eq('id', assetId)
    }
    const { error: linkErr } = await supabase.from('question_groups')
      .update({ image_asset_id: assetId }).eq('id', group.id)
    if (linkErr) throw new Error(`link: ${linkErr.message}`)
    console.log('done.')
  }
  console.log('\n✓ All eleven EIKEN G3 Mock 1 illustrations attached.')
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1) })
