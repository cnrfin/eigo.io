/**
 * Role-play cover photos: downloads the chosen Pexels photo for each scene in
 * scripts/roleplay-covers.json to public/roleplay/<scene>.jpg (1280px wide)
 * and points the scene's "image" at it.
 *
 *   node scripts/roleplay-covers.mjs            # scenes without an image yet
 *   node scripts/roleplay-covers.mjs --force    # also re-download scenes that have one
 *   node scripts/roleplay-covers.mjs ramen-shop  # just these scenes (re-downloads)
 *
 * To swap a photo, change that scene's "use" to another id (one of its
 * options, or any Pexels photo id) and run the script for that scene.
 * Open mockups/roleplay-covers.html to compare the options side by side.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const choices = JSON.parse(readFileSync(join(root, 'scripts/roleplay-covers.json'), 'utf8'))
const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))

// scene id → its JSON file
const scenesDir = join(root, 'src/lib/roleplay/scenes')
const files = new Map()
for (const cat of readdirSync(scenesDir, { withFileTypes: true }))
  if (cat.isDirectory())
    for (const f of readdirSync(join(scenesDir, cat.name)))
      if (f.endsWith('.json')) files.set(f.replace(/\.json$/, ''), join(scenesDir, cat.name, f))

const outDir = join(root, 'public/roleplay')
mkdirSync(outDir, { recursive: true })

let done = 0
for (const [scene, c] of Object.entries(choices)) {
  if (scene.startsWith('_')) continue
  if (only.length && !only.includes(scene)) continue
  const file = files.get(scene)
  if (!file) {
    console.log(`? ${scene}: no scene file`)
    continue
  }
  const text = readFileSync(file, 'utf8')
  const current = text.match(/"image":\s*"([^"]*)"/)?.[1] ?? ''
  if (current && !force && !only.length) continue

  const id = String(c.use)
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1280`
  const res = await fetch(url).catch((e) => ({ ok: false, status: e.cause?.code ?? e.message }))
  if (!res.ok) {
    console.log(`✗ ${scene}: photo ${id} → ${res.status}`)
    continue
  }
  writeFileSync(join(outDir, `${scene}.jpg`), Buffer.from(await res.arrayBuffer()))
  // Only the image line changes, so the scene file keeps its hand formatting.
  writeFileSync(file, text.replace(/"image":\s*"[^"]*"/, `"image": "/roleplay/${scene}.jpg"`))
  console.log(`✓ ${scene} ← pexels ${id}`)
  done++
}
console.log(`\n${done} cover${done === 1 ? '' : 's'} saved to public/roleplay/`)
