// Mirror the Pronunciation-101 course audio out of the private `test-assets`
// bucket into public static files, so the /pronunciation SEO guide can reuse the
// exact same recordings as the course.
//
// It walks the whole `courses/pron/` tree recursively — the flat word clips
// (courses/pron/<slug>.mp3), the US variants (courses/pron/us/…), and crucially
// the discrimination clips (courses/pron/hvpt/<word>-<voice>.mp3), which is where
// the word-initial minimal pairs like think/sink actually live. Preserves the
// folder structure under public/course-audio/. Idempotent; read-only on storage.
//
// Run once from the eigo-web folder:
//   node --env-file=.env.local scripts/pull-pron-audio.mjs
//
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (already in .env.local).

import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env'); process.exit(1) }

const sb = createClient(URL, KEY, { auth: { persistSession: false } })
const BUCKET = 'test-assets'
const ROOT = 'courses/pron'
const OUT = 'public/course-audio'

const exists = (p) => access(p).then(() => true).catch(() => false)
let downloaded = 0, skipped = 0

async function walk(prefix) {
  let offset = 0
  for (;;) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`list ${prefix}: ${error.message}`)
    if (!data.length) break
    for (const item of data) {
      const path = `${prefix}/${item.name}`
      if (item.name.endsWith('.mp3')) {
        const rel = path.slice(ROOT.length + 1)          // drop "courses/pron/"
        const dest = join(OUT, rel)
        if (await exists(dest)) { skipped++; continue }
        const { data: file, error: dErr } = await sb.storage.from(BUCKET).download(path)
        if (dErr) { console.warn(`  skip ${path}: ${dErr.message}`); continue }
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, Buffer.from(await file.arrayBuffer()))
        downloaded++
      } else if (!item.id) {
        await walk(path)                                  // it's a folder (no id) — recurse
      }
    }
    if (data.length < 1000) break
    offset += data.length
  }
}

console.log(`Mirroring ${BUCKET}/${ROOT} → ${OUT} …`)
await walk(ROOT)
console.log(`Done. ${downloaded} downloaded, ${skipped} already present.`)
