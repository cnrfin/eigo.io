/**
 * Replace individual bad recordings in the pronunciation guide.
 *
 * Single-word TTS is stochastic: the same request gives a different reading each
 * time, and short prompts are the least stable of all. So this is built around
 * re-rolling rather than getting it right first try.
 *
 * Words are spoken with their real spelling. Respellings were tried ("reed" for
 * read, "hoh" for hoe) and produced odd inflections, so they're out — the fix
 * for a bad take is another take, not a fake word.
 *
 * Two modes:
 *   plain      generate one take per voice and commit it (re-run to re-roll)
 *   --takes N  generate N candidates WITHOUT touching the live files, so you can
 *              listen and choose; then --pick N promotes the one you want
 *
 * Candidates land in public/course-audio/_candidates/, so with the dev server
 * running you can play them straight from
 *   localhost:3000/course-audio/_candidates/read-uk-male-2.mp3
 *
 *   node --env-file=.env.local scripts/fix-pron-audio.mjs --dry
 *   node --env-file=.env.local scripts/fix-pron-audio.mjs --only read
 *   node --env-file=.env.local scripts/fix-pron-audio.mjs --only read --takes 5
 *   node --env-file=.env.local scripts/fix-pron-audio.mjs --only read --pick 3
 *
 * Requires ELEVENLABS_API_KEY. Committing overwrites the existing clip.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = join(ROOT, 'src/lib/pronunciation/base-words.json')
const CAND = join(ROOT, 'public/course-audio/_candidates')

const UK_F = 'lcMyyd2HUfFzxdCaC4Ta', UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const US_F = 'uYXf8XasLslADfZ2MB4u', US_M = 'UgBBYS2sOqTuMpoF3BR0'

const VOICE = {
  'uk-female': { id: UK_F, dir: 'course-audio', field: 'audioSrc', url: (s) => `/course-audio/${s}.mp3` },
  'uk-male': { id: UK_M, dir: 'course-audio/male', field: 'audioSrcMale', url: (s) => `/course-audio/male/${s}.mp3` },
  'us-female': { id: US_F, dir: 'course-audio/us', field: 'audioSrcUs', url: (s) => `/course-audio/us/${s}.mp3` },
  'us-male': { id: US_M, dir: 'course-audio/us-male', field: 'audioSrcUsMale', url: (s) => `/course-audio/us-male/${s}.mp3` },
}

// ── outstanding fixes ───────────────────────────────────────────────────────
// DONE, not regenerated: bow (all four voices) — correct /baʊ/.
// DROPPED: foe / hoe — the pair was unpublished rather than fixed, since hoe is
// uncommon enough not to be worth the takes it was costing.
const FIXES = [
  {
    word: 'read', voices: ['uk-male'],
    why: 'read as /red/ (past tense); the entry is /riːd/ — re-roll until it says the present tense',
  },
]

// Same settings as seed-pron-consonants.mjs, so re-rolls match the clips
// already in the guide.
const MODEL = 'eleven_v3'
const STABILITY = 0.5

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const num = (name) => { const i = argv.indexOf(name); return i === -1 ? undefined : Number(argv[i + 1]) }
const str = (name) => { const i = argv.indexOf(name); return i === -1 ? undefined : argv[i + 1] }
const ONLY = str('--only')
const TAKES = num('--takes')
const PICK = num('--pick')
const MODEL_OVERRIDE = str('--model')

if (!DRY && !PICK && !process.env.ELEVENLABS_API_KEY) {
  console.error('ELEVENLABS_API_KEY missing. Run with --env-file=.env.local, or use --dry to preview.')
  process.exit(1)
}

async function tts(text, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: MODEL_OVERRIDE ?? MODEL,
      voice_settings: { stability: STABILITY, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

const base = JSON.parse(readFileSync(BASE, 'utf8'))
const queue = ONLY ? FIXES.filter((f) => f.word === ONLY) : FIXES
if (ONLY && !queue.length) {
  console.error(`No fix defined for "${ONLY}". Known: ${FIXES.map((f) => f.word).join(', ')}`)
  process.exit(1)
}
const commit = (w, spec, buf) => {
  const dir = join(ROOT, 'public', spec.dir)
  mkdirSync(dir, { recursive: true })
  if (Buffer.isBuffer(buf)) writeFileSync(join(dir, `${w.slug}.mp3`), buf)
  else copyFileSync(buf, join(dir, `${w.slug}.mp3`))
  w[spec.field] = spec.url(w.slug)
}

// ── promote a candidate ─────────────────────────────────────────────────────
if (PICK) {
  let n = 0
  for (const f of queue) {
    const w = base.words.find((x) => x.slug === f.word)
    if (!w) { console.error(`skipping ${f.word} — not in base-words.json`); continue }
    for (const v of f.voices) {
      const from = join(CAND, `${w.slug}-${v}-${PICK}.mp3`)
      if (!existsSync(from)) { console.error(`  ${w.slug} · ${v} — no candidate #${PICK}`); continue }
      commit(w, VOICE[v], from)
      n++
      console.log(`  ${w.word} · ${v} <- candidate #${PICK} ✓`)
    }
  }
  writeFileSync(BASE, JSON.stringify(base, null, 2) + '\n')
  console.log(`\nPromoted ${n} clip(s).`)
  process.exit(0)
}

// ── preview / generate ──────────────────────────────────────────────────────
const clips = queue.reduce((n, f) => n + f.voices.length, 0) * (TAKES ?? 1)
console.log(`${queue.length} word(s), ${clips} clip(s), model ${MODEL_OVERRIDE ?? MODEL}`)
console.log(TAKES ? `candidates only — nothing committed until --pick\n` : `each run is a fresh take; re-run to re-roll\n`)
for (const f of queue) {
  console.log(`  ${f.word}  (${f.voices.join(', ')})`)
  console.log(`     ${f.why}`)
  console.log(`     speaking the real word: "${f.word}"`)
}
if (DRY) { console.log('\nDry run only.'); process.exit(0) }

let made = 0
for (const f of queue) {
  const w = base.words.find((x) => x.slug === f.word)
  if (!w) { console.error(`\nskipping ${f.word} — not in base-words.json`); continue }
  for (const v of f.voices) {
    const spec = VOICE[v]
    if (!spec) { console.error(`  unknown voice "${v}"`); continue }
    for (let i = 1; i <= (TAKES ?? 1); i++) {
      try {
        const buf = await tts(w.word, spec.id)
        if (TAKES) {
          mkdirSync(CAND, { recursive: true })
          writeFileSync(join(CAND, `${w.slug}-${v}-${i}.mp3`), buf)
          console.log(`  ${w.word} · ${v} · take ${i} -> /course-audio/_candidates/${w.slug}-${v}-${i}.mp3`)
        } else {
          commit(w, spec, buf)
          console.log(`  ${w.word} · ${v} ✓`)
        }
        made++
      } catch (e) {
        console.error(`  ${w.word} · ${v} take ${i} FAILED: ${e.message}`)
      }
    }
  }
  if (!TAKES) writeFileSync(BASE, JSON.stringify(base, null, 2) + '\n')
}

console.log(`\n${made} clip(s) generated.`)
console.log(TAKES
  ? `Listen, then promote one:  --only <word> --pick <n>`
  : `Not right? Run the same command again for a different take.`)
