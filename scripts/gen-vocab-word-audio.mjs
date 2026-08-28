/**
 * Generate UK-female pronunciation audio for every Vocab 101/102/103 headword.
 *
 * For each `vocab_words` row missing `audio_uk_id`: the headword is voiced with
 * ElevenLabs (UK female — same voice ID as the course audio), uploaded to the
 * `test-assets` bucket, recorded as an `assets` row, and linked via
 * `vocab_words.audio_uk_id`. Only the UK accent is generated (US is left alone).
 *
 * Multi-word headwords (phrasal verbs like "look up to", idioms like
 * "hit it off") are voiced as the whole phrase. Pass --single-only to skip them.
 *
 *   node --env-file=.env.local scripts/gen-vocab-word-audio.mjs --dry
 *   node --env-file=.env.local scripts/gen-vocab-word-audio.mjs --limit 10
 *   node --env-file=.env.local scripts/gen-vocab-word-audio.mjs
 *   TTS_CACHE_DIR=.tts-cache node --env-file=.env.local scripts/gen-vocab-word-audio.mjs
 *
 * Idempotent + resume-safe: words that already have audio_uk_id are skipped, and
 * each word is committed to the DB immediately, so an interrupted run resumes.
 * Re-uploads use upsert, and an existing asset row for the same path is reused.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

const BUCKET = 'test-assets'
const MODEL = 'eleven_v3'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'   // UK female — matches scripts/add-course-audio.mjs

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const SINGLE_ONLY = args.includes('--single-only')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i === -1 ? Infinity : Number(args[i + 1]) })()

if (!DRY && (!SUPABASE_URL || !SERVICE_KEY || !ELEVENLABS_API_KEY)) {
  console.error('Missing env. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY.')
  console.error('Run with --env-file=.env.local, or use --dry to preview (DB read still needs Supabase env).')
  process.exit(1)
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Supabase env required even for --dry (to list words). Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ── ElevenLabs (optional on-disk cache to avoid re-billing identical clips) ──
const CACHE_DIR = process.env.TTS_CACHE_DIR
async function tts(text, voiceId) {
  if (CACHE_DIR) {
    const p = join(CACHE_DIR, createHash('sha1').update(`${voiceId}|${MODEL}|${text}`).digest('hex') + '.mp3')
    if (existsSync(p)) return readFileSync(p)
    const buf = await ttsFetch(text, voiceId)
    mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(p, buf)
    return buf
  }
  return ttsFetch(text, voiceId)
}
async function ttsFetch(text, voiceId, attempt = 1) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 1500 * attempt)); return ttsFetch(text, voiceId, attempt + 1) }
    throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

// ── Load words needing UK audio ─────────────────────────────────────────────
async function loadWords() {
  const out = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('vocab_words')
      .select('id, headword, normalized, audio_uk_id')
      .order('normalized')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

const all = await loadWords()
let targets = all.filter(w => !w.audio_uk_id)
if (SINGLE_ONLY) targets = targets.filter(w => !/\s/.test(w.normalized))
if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT)

const multi = targets.filter(w => /\s/.test(w.normalized)).length
const chars = targets.reduce((n, w) => n + (w.headword || w.normalized).length, 0)
console.log(`vocab_words total:          ${all.length}`)
console.log(`already have UK audio:      ${all.filter(w => w.audio_uk_id).length}`)
console.log(`to generate this run:       ${targets.length}${SINGLE_ONLY ? ' (single-word only)' : ` (incl. ${multi} multi-word)`}`)
console.log(`approx characters billed:   ${chars}\n`)

if (!targets.length) { console.log('Nothing to do — every word already has UK audio.'); process.exit(0) }
if (DRY) {
  console.log(targets.map(w => w.headword || w.normalized).join(' · '))
  console.log('\nDry run only. Re-run without --dry to generate.')
  process.exit(0)
}

// ── Generate ────────────────────────────────────────────────────────────────
let made = 0, failed = 0
for (const w of targets) {
  const spoken = (w.headword || w.normalized).trim()
  const path = `vocab-audio/uk/${slugify(w.normalized)}.mp3`
  try {
    const audio = await tts(spoken, UK_F)
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(`upload: ${upErr.message}`)

    // reuse an existing asset row for this path, else create one
    const { data: existing } = await supabase.from('assets').select('id').eq('storage_path', path).maybeSingle()
    let assetId = existing?.id
    if (!assetId) {
      const { data, error } = await supabase.from('assets')
        .insert({ type: 'audio', storage_path: path, transcript: spoken, alt_text: '' })
        .select('id').single()
      if (error) throw new Error(`asset insert: ${error.message}`)
      assetId = data.id
    }

    const { error: updErr } = await supabase.from('vocab_words').update({ audio_uk_id: assetId }).eq('id', w.id)
    if (updErr) throw new Error(`link: ${updErr.message}`)

    made++
    process.stdout.write(`  ${spoken} ✓\n`)
  } catch (e) {
    failed++
    console.error(`  ${spoken} FAILED: ${e.message}`)
  }
}

console.log(`\n✓ ${made} words voiced (UK female).${failed ? `  ${failed} failed — re-run to retry.` : ''}`)
const left = (await loadWords()).filter(w => !w.audio_uk_id).length
if (left) console.log(`${left} words still without UK audio — re-run to finish.`)
