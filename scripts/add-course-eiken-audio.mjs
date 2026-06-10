/**
 * Voice the EIKEN course listening screens (ElevenLabs) — all four levels.
 *
 * Unlike add-course-audio.mjs (which extracts speech out of printed prompts),
 * the EIKEN seed already stores the full script in content.transcript and an
 * instruction in prompt — so this script only synthesises, uploads, and links
 * audio_asset_id. The player keeps transcripts hidden until post-answer.
 *
 * Transcript line conventions (see seed-course-eiken.mjs):
 *   "M: …" / "W: …"        dialogue turns (male / female voice, 0.5 s gap)
 *   "W: (response)"        第1部 placeholder — NOT spoken; marks the responder,
 *                          whose voice then reads the option lines
 *   "A. …" / "B. …" / "C. …"  第1部 spoken options (0.8 s gap before A)
 *   "Question: …"          第2部/第3部 spoken question (0.8 s gap before it)
 *   anything else          monologue narration
 *
 * TEMPO is applied per grade to match the mock seeds exactly:
 *   eiken-g3-* 0.88 | eiken-pre2-* 0.94 | eiken-g2-* 0.97 | eiken-pre1-* 1.0
 * (the atempo stage runs even at 1.0 so clip-cache hashes stay consistent).
 *
 *   node --env-file=.env.local scripts/add-course-eiken-audio.mjs --dry
 *   TTS_CACHE_DIR=.tts-cache node --env-file=.env.local scripts/add-course-eiken-audio.mjs
 *
 * Idempotent: screens that already have audio_asset_id are skipped. Re-run
 * after re-seeding the course (re-seeding clears the links but uploads and
 * the TTS cache survive, so reruns are cheap).
 */
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync, readFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
if (!SUPABASE_URL || !SERVICE_KEY || (!process.argv.includes('--dry') && !ELEVENLABS_API_KEY)) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ELEVENLABS_API_KEY (run with --env-file=.env.local)')
  process.exit(1)
}
const BUCKET = 'test-assets'
const MODEL = 'eleven_v3'
const DRY = process.argv.includes('--dry')

const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'

const LESSONS = [
  'eiken-g3-listening', 'eiken-g3-review',
  'eiken-pre2-listening', 'eiken-pre2-review',
  'eiken-g2-listening', 'eiken-g2-review',
  'eiken-pre1-listening', 'eiken-pre1-review',
]
const TEMPO_BY_PREFIX = { 'eiken-g3-': 0.88, 'eiken-pre2-': 0.94, 'eiken-g2-': 0.97, 'eiken-pre1-': 1.0 }
const tempoFor = slug => Object.entries(TEMPO_BY_PREFIX).find(([p]) => slug.startsWith(p))?.[1] ?? 1.0

const TURN_GAP = 0.5
const Q_GAP = 0.8

/** transcript → [{voice, text, gapAfter}] */
function segmentsFor(transcript, screenIdx) {
  const maleV = screenIdx % 2 === 0 ? US_M : UK_M
  const femaleV = screenIdx % 2 === 0 ? UK_F : US_F
  const lines = transcript.split('\n').map(l => l.trim()).filter(Boolean)
  const segs = []
  let responder = maleV // voice that reads 第1部 options (speaker of "(response)")
  let lastDialogueVoice = maleV
  for (const line of lines) {
    const turn = line.match(/^([MW])[:：]\s*(.*)$/)
    if (turn) {
      const voice = turn[1] === 'M' ? maleV : femaleV
      if (/^\(response\)$/i.test(turn[2].trim())) { responder = voice; continue } // placeholder, not spoken
      segs.push({ voice, text: turn[2].trim(), gapAfter: TURN_GAP })
      lastDialogueVoice = voice
      continue
    }
    const opt = line.match(/^([ABC])\.\s*(.*)$/)
    if (opt) {
      if (opt[1] === 'A' && segs.length) segs[segs.length - 1].gapAfter = Q_GAP
      segs.push({ voice: responder, text: `${opt[1]}. ${opt[2]}`, gapAfter: TURN_GAP })
      continue
    }
    const qm = line.match(/^Question[:：]\s*(.*)$/)
    if (qm) {
      if (segs.length) segs[segs.length - 1].gapAfter = Q_GAP
      // the question is read by the other voice so it stands apart from a monologue
      segs.push({ voice: lastDialogueVoice === maleV ? femaleV : maleV, text: `Question. ${qm[1]}`, gapAfter: 0 })
      continue
    }
    // monologue narration (第3部) — single consistent voice
    const narrator = screenIdx % 2 === 0 ? US_M : UK_F
    segs.push({ voice: narrator, text: line, gapAfter: TURN_GAP })
    lastDialogueVoice = narrator
  }
  if (segs.length) segs[segs.length - 1].gapAfter = 0
  return segs
}

const CACHE_DIR = process.env.TTS_CACHE_DIR
async function tts(text, voiceId, attempt = 1) {
  if (CACHE_DIR) {
    const p = join(CACHE_DIR, createHash('sha1').update(`${voiceId}|${MODEL}|${text}`).digest('hex') + '.mp3')
    if (existsSync(p)) return readFileSync(p)
    const buf = await ttsFetch(text, voiceId, attempt)
    mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(p, buf)
    return buf
  }
  return ttsFetch(text, voiceId, attempt)
}
async function ttsFetch(text, voiceId, attempt) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST', headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 1500 * attempt)); return ttsFetch(text, voiceId, attempt + 1) }
    throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function ffmpegPath() { const b = join(process.cwd(), 'bin', 'ffmpeg'); return existsSync(b) ? b : 'ffmpeg' }
/** concat with per-segment gaps AND the grade TEMPO (atempo, no pitch change) */
function joinSegments(buffers, gaps, tempo) {
  const dir = mkdtempSync(join(tmpdir(), 'eiken-course-audio-'))
  try {
    const inputs = [], filters = [], labels = []
    buffers.forEach((buf, i) => {
      const p = join(dir, `s${i}.mp3`); writeFileSync(p, buf)
      inputs.push('-i', p)
      filters.push(`[${i}:a]atempo=${tempo},apad=pad_dur=${gaps[i] ?? 0}[a${i}]`)
      labels.push(`[a${i}]`)
    })
    const out = join(dir, 'out.mp3')
    const fc = `${filters.join(';')};${labels.join('')}concat=n=${buffers.length}:v=0:a=1[out]`
    const r = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', out], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (r.error || r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr?.toString().slice(-300) ?? ''))
    return readFileSync(out)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
let done = 0, skipped = 0
for (const slug of LESSONS) {
  const tempo = tempoFor(slug)
  const { data: lesson } = await supabase.from('lessons').select('id').eq('slug', slug).single()
  if (!lesson) { console.error('lesson not found (run seed-course-eiken.mjs first):', slug); continue }
  const { data: screens } = await supabase.from('lesson_screens')
    .select('id, order_index, type, content, audio_asset_id')
    .eq('lesson_id', lesson.id).eq('type', 'question').order('order_index')
  for (const sc of screens) {
    if (!sc.content.transcript) continue
    if (sc.audio_asset_id) { skipped++; continue }
    const segs = segmentsFor(sc.content.transcript, sc.order_index)
    if (!segs.length) { console.log(`  !! empty transcript ${slug} #${sc.order_index}`); continue }
    if (DRY) {
      console.log(`\n── ${slug} #${sc.order_index} (tempo ${tempo})`)
      for (const s of segs) console.log(`  ${s.voice === US_M || s.voice === UK_M ? '[M]' : '[F]'} ${s.text.slice(0, 90)}  (+${s.gapAfter}s)`)
      continue
    }
    const buffers = []
    for (const s of segs) buffers.push(await tts(s.text, s.voice))
    const audio = joinSegments(buffers, segs.map(s => s.gapAfter), tempo)
    const path = `courses/${slug}-${sc.order_index}.mp3`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(upErr.message)
    const { data: existing } = await supabase.from('assets').select('id').eq('storage_path', path).maybeSingle()
    let assetId = existing?.id
    if (!assetId) {
      const { data, error } = await supabase.from('assets').insert({ type: 'audio', storage_path: path, transcript: sc.content.transcript, alt_text: '' }).select('id').single()
      if (error) throw new Error(error.message)
      assetId = data.id
    }
    const { error: updErr } = await supabase.from('lesson_screens').update({ audio_asset_id: assetId }).eq('id', sc.id)
    if (updErr) throw new Error(updErr.message)
    console.log(`✓ ${slug} #${sc.order_index}`)
    done++
  }
}
console.log(DRY ? '\n(dry run — nothing written)' : `\n✓ ${done} screens voiced (${skipped} already had audio).`)