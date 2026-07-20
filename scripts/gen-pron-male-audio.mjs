/**
 * Fill the male-voice gap in the pronunciation guide.
 *
 * The guide's words come from two sources. Library words (Say After Me) ship
 * with four voices; course words were only ever recorded in a female voice per
 * accent, so their UK 男性 / US 男性 takes don't exist. This generates the two
 * missing voices for exactly those words, using the same ElevenLabs voice IDs
 * and settings as scripts/seed-pron-consonants.mjs so they match the existing
 * clips.
 *
 * Writes straight to the public folder (no Supabase involved):
 *   public/course-audio/male/<slug>.mp3      UK male
 *   public/course-audio/us-male/<slug>.mp3   US male
 *
 * then records the paths on each word in base-words.json as audioSrcMale /
 * audioSrcUsMale. words.ts reads those, so the male buttons appear on the word
 * pages as soon as this finishes — no code change needed.
 *
 * Safe to re-run: existing files are never regenerated or overwritten, and
 * base-words.json is saved after each word, so an interrupted run resumes.
 *
 *   node --env-file=.env.local scripts/gen-pron-male-audio.mjs --dry
 *   node --env-file=.env.local scripts/gen-pron-male-audio.mjs
 *   node --env-file=.env.local scripts/gen-pron-male-audio.mjs --limit 5
 *
 * Requires ELEVENLABS_API_KEY. ffmpeg is optional (male clips aren't trimmed).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = join(ROOT, 'src/lib/pronunciation/base-words.json')
const OUT = { male: join(ROOT, 'public/course-audio/male'), usMale: join(ROOT, 'public/course-audio/us-male') }

// Same voices as the course seed, so these sit alongside the existing takes.
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
// Matches seed-pron-consonants.mjs. Male clips are not tail-trimmed there, so
// they aren't here either.
const RESPELL = { asked: 'askt', bow: 'bough' }

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i === -1 ? Infinity : Number(args[i + 1]) })()

if (!DRY && !process.env.ELEVENLABS_API_KEY) {
  console.error('ELEVENLABS_API_KEY missing. Run with --env-file=.env.local, or use --dry to preview.')
  process.exit(1)
}

async function tts(text, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_v3', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

const base = JSON.parse(readFileSync(BASE, 'utf8'))

// Course-sourced words are the ones with audioSrc; library words already have
// all four voices. A word counts as done when its recorded male paths resolve —
// checked against the stored path, not a fixed folder, because some words are
// already served from the course's hvpt/ set rather than from here.
const resolves = (url) => Boolean(url) && existsSync(join(ROOT, 'public', url))
const targets = base.words
  .filter(w => w.audioSrc)
  .filter(w => !resolves(w.audioSrcMale) || !resolves(w.audioSrcUsMale))

const chars = targets.reduce((n, w) => n + w.word.length * 2, 0)
console.log(`course-sourced words:      ${base.words.filter(w => w.audioSrc).length}`)
console.log(`needing male recordings:   ${targets.length}`)
console.log(`clips to generate:         ${targets.length * 2} (UK male + US male)`)
console.log(`approx characters billed:  ${chars}\n`)

if (!targets.length) { console.log('Nothing to do — every course word already has both male voices.'); process.exit(0) }
if (DRY) {
  console.log(targets.map(w => w.word).join(' '))
  console.log('\nDry run only. Re-run without --dry to generate.')
  process.exit(0)
}

for (const dir of Object.values(OUT)) mkdirSync(dir, { recursive: true })

let done = 0, made = 0
for (const w of targets) {
  if (done >= LIMIT) { console.log(`\nStopped at --limit ${LIMIT}.`); break }
  const spoken = RESPELL[w.word.toLowerCase()] ?? w.word

  for (const [voice, id, dir, field, url] of [
    ['UK male', UK_M, OUT.male, 'audioSrcMale', `/course-audio/male/${w.slug}.mp3`],
    ['US male', US_M, OUT.usMale, 'audioSrcUsMale', `/course-audio/us-male/${w.slug}.mp3`],
  ]) {
    const file = join(dir, `${w.slug}.mp3`)
    if (existsSync(file)) { w[field] = url; continue }
    try {
      writeFileSync(file, await tts(spoken, id))
      w[field] = url
      made++
      process.stdout.write(`  ${w.word} · ${voice} ✓\n`)
    } catch (e) {
      console.error(`  ${w.word} · ${voice} FAILED: ${e.message}`)
    }
  }

  // Save after each word so an interrupted run resumes cleanly.
  writeFileSync(BASE, JSON.stringify(base, null, 2) + '\n')
  done++
}

console.log(`\nGenerated ${made} clips across ${done} words.`)
console.log('base-words.json updated — male buttons will appear on those word pages.')
const left = base.words.filter(w => w.audioSrc && !(w.audioSrcMale && w.audioSrcUsMale)).length
if (left) console.log(`${left} words still incomplete — re-run to finish.`)
