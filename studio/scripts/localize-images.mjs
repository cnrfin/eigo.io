#!/usr/bin/env node
// Downloads remote images (e.g. Pexels links) used in a course into that
// course's images/ folder and points the slides at the local copies.
//
// Usage (from the eigo-web folder):
//   node studio/scripts/localize-images.mjs c_greatbritain
//   node studio/scripts/localize-images.mjs            (all courses)
//
// Reload the studio tab afterwards. A backup of each course.json is kept as
// course.before-localize.json.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const coursesDir = path.resolve(here, '../data/courses')

const wanted = process.argv.slice(2)
const ids = wanted.length
  ? wanted
  : (await fs.readdir(coursesDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)

function localName(url) {
  const u = new URL(url)
  const m = u.pathname.match(/\/photos\/(\d+)\//)
  const ext = (path.extname(u.pathname) || '.jpg').toLowerCase().replace('.jpeg', '.jpg')
  if (u.hostname.endsWith('pexels.com') && m) return `pexels-${m[1]}${ext}`
  const base = path.basename(u.pathname).replace(/[^a-z0-9._-]/gi, '-').slice(-60) || 'image'
  return `remote-${base}${path.extname(base) ? '' : ext}`
}

for (const id of ids) {
  const file = path.join(coursesDir, id, 'course.json')
  let course
  try {
    course = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    console.log(`Skipping ${id}: no course.json`)
    continue
  }
  const imgDir = path.join(coursesDir, id, 'images')
  await fs.mkdir(imgDir, { recursive: true })

  const blocks = []
  for (const unit of course.units ?? [])
    for (const lesson of unit.lessons ?? [])
      for (const slide of lesson.slides ?? [])
        for (const b of slide.blocks ?? []) {
          if ((b.type === 'image' || b.type === 'media') && /^https?:\/\//.test(b.src ?? '')) blocks.push(b)
          // matching pictures: same handling, stored on each pair as `image`
          if (b.type === 'match')
            for (const p of b.pairs ?? [])
              if (/^https?:\/\//.test(p.image ?? ''))
                blocks.push({
                  get src() { return p.image },
                  set src(v) { p.image = v },
                })
        }

  if (!blocks.length) {
    console.log(`${id}: no remote images`)
    continue
  }
  console.log(`${id}: ${blocks.length} remote images`)

  let ok = 0
  const cache = new Map()
  for (const b of blocks) {
    try {
      let name = cache.get(b.src)
      if (!name) {
        name = localName(b.src)
        const dest = path.join(imgDir, name)
        try {
          await fs.access(dest)
        } catch {
          const res = await fetch(b.src)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
        }
        cache.set(b.src, name)
      }
      b.src = `images/${name}`
      ok++
      process.stdout.write('.')
    } catch (e) {
      console.log(`\n  failed: ${b.src} (${e.message})`)
    }
  }

  await fs.copyFile(file, path.join(coursesDir, id, 'course.before-localize.json'))
  course.updatedAt = new Date().toISOString()
  await fs.writeFile(file, JSON.stringify(course, null, 2))
  console.log(`\n${id}: saved ${ok} of ${blocks.length} images locally`)
}
console.log('Done. Reload the studio tab.')
