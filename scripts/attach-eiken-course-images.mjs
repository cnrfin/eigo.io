/**
 * Attach the EIKEN course illustrations to lesson screens (all four levels).
 * Briefs for generating the images: supabase/EIKEN-COURSE-IMAGES.md.
 *
 *   node --env-file=.env.local scripts/attach-eiken-course-images.mjs ./folder
 *
 * Files: ec-g3-l1.jpg, ec-g3-l2.jpg, ec-g3-card.jpg, ec-pre2-illa.jpg,
 * ec-pre2-illb.jpg, ec-g2-panels.jpg, ec-pre1-panels.jpg. Uploads to the
 * test-assets bucket, creates asset rows and links lesson_screens.
 * image_asset_id (the course player renders screen.image above the prompt).
 *
 * Idempotent and incremental: an image that already has an asset row in the
 * DB does NOT need its file in the folder — the existing upload is re-linked.
 * So after a course re-seed you can re-run this with an empty folder, and
 * when adding new images the folder only needs the new files.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'test-assets'

// [lesson slug, screen order_index, file, alt text]
const ALT = {
  'ec-g3-l1.jpg': 'A teenage girl showing a large drawing of a cat to her father in the living room.',
  'ec-g3-l2.jpg': 'A boy with a school bag at the front door, his mother beside him, heavy rain outside.',
  'ec-g3-card.jpg': 'A park: a boy drinking water on a bench, a girl reading a book under a tree, and a man washing his car nearby.',
  'ec-pre2-illa.jpg': 'Illustration A: a park with five people — a boy riding a bicycle, a man walking a dog, a woman reading a book on a bench, a girl flying a kite, and a man eating a sandwich under a tree.',
  'ec-pre2-illb.jpg': 'Illustration B: a sad-looking boy standing in front of a vending machine, holding an open, empty wallet.',
  'ec-g2-panels.jpg': 'Three panels: a girl sees a lost-cat poster on a pole; she finds the cat under a park bench; she returns it to its happy elderly owner.',
  'ec-pre1-panels.jpg': 'Four panels: a couple talks about crowded buses; the man proposes a bike-sharing program at a town meeting; bicycle stations appear and people ride; the man finds rental bicycles dumped in front of the station.',
}
const TARGETS = [
  ['eiken-g3-listening', 1, 'ec-g3-l1.jpg'],
  ['eiken-g3-listening', 2, 'ec-g3-l2.jpg'],
  ['eiken-g3-speaking', 5, 'ec-g3-card.jpg'],
  ['eiken-g3-speaking', 6, 'ec-g3-card.jpg'],
  ['eiken-g3-review', 8, 'ec-g3-card.jpg'],
  ['eiken-pre2-speaking', 5, 'ec-pre2-illa.jpg'],
  ['eiken-pre2-review', 8, 'ec-pre2-illa.jpg'],
  ['eiken-pre2-speaking', 6, 'ec-pre2-illb.jpg'],
  ['eiken-pre2-speaking', 7, 'ec-pre2-illb.jpg'],
  ['eiken-g2-speaking', 5, 'ec-g2-panels.jpg'],
  ['eiken-g2-speaking', 6, 'ec-g2-panels.jpg'],
  ['eiken-g2-review', 8, 'ec-g2-panels.jpg'],
  ['eiken-pre1-speaking', 2, 'ec-pre1-panels.jpg'],
  ['eiken-pre1-speaking', 3, 'ec-pre1-panels.jpg'],
  ['eiken-pre1-speaking', 5, 'ec-pre1-panels.jpg'],
  ['eiken-pre1-review', 8, 'ec-pre1-panels.jpg'],
]

const dir = process.argv[2]
if (!dir) { console.error('Usage: node scripts/attach-eiken-course-images.mjs <folder>'); process.exit(1) }
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const assetCache = new Map()

async function assetFor(file) {
  if (assetCache.has(file)) return assetCache.get(file)
  const path = `images/courses/${file}`
  const { data: existing } = await supabase.from('assets').select('id').eq('storage_path', path).maybeSingle()
  let assetId = existing?.id
  if (!assetId) {
    if (!existsSync(join(dir, file))) throw new Error(`${file}: no asset row in DB and file not in ${dir} — generate it (see supabase/EIKEN-COURSE-IMAGES.md)`)
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, readFileSync(join(dir, file)), { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw new Error(`upload: ${upErr.message}`)
    const { data, error } = await supabase.from('assets')
      .insert({ type: 'image', storage_path: path, alt_text: ALT[file] ?? '' }).select('id').single()
    if (error) throw new Error(`asset: ${error.message}`)
    assetId = data.id
  } else if (existsSync(join(dir, file))) {
    // file present locally — refresh the upload so a regenerated image replaces the old one
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, readFileSync(join(dir, file)), { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw new Error(`upload: ${upErr.message}`)
  }
  assetCache.set(file, assetId)
  return assetId
}

for (const [slug, orderIndex, file] of TARGETS) {
  process.stdout.write(`${file} -> ${slug} #${orderIndex} … `)
  const { data: lesson } = await supabase.from('lessons').select('id').eq('slug', slug).single()
  if (!lesson) throw new Error(`lesson ${slug} not found — run seed-course-eiken.mjs first`)
  const { data: screen } = await supabase.from('lesson_screens')
    .select('id, image_asset_id').eq('lesson_id', lesson.id).eq('order_index', orderIndex).single()
  if (!screen) throw new Error(`screen #${orderIndex} not found in ${slug}`)
  const assetId = await assetFor(file)
  const { error } = await supabase.from('lesson_screens').update({ image_asset_id: assetId }).eq('id', screen.id)
  if (error) throw new Error(error.message)
  console.log(screen.image_asset_id ? 'relinked ✓' : 'linked ✓')
}
console.log('Done.')