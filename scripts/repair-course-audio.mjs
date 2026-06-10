/**
 * Repair course-audio screens whose speech was TRUNCATED by the original
 * extraction (the first-quote-only bug): recovers the full original prompt
 * from the seed source files, re-extracts ALL spoken lines, re-voices the
 * clip and updates transcript + audio in place. Screens whose stored
 * transcript already covers the full original speech are left untouched.
 *
 *   node --env-file=.env.local scripts/repair-course-audio.mjs --dry
 *   TTS_CACHE_DIR=.tts-cache node --env-file=.env.local scripts/repair-course-audio.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync, readFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

const DRY = process.argv.includes('--dry')
const MODEL = 'eleven_v3'
const BUCKET = 'test-assets'
const US_F = 'uYXf8XasLslADfZ2MB4u', US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta', UK_M = 'fNYuJl2dBlX9V7NxmjnV'

// All single-quoted string literals from the seed sources, unescaped.
function literalsFrom(file) {
  const src = readFileSync(file, 'utf8')
  const out = []
  const re = /'((?:[^'\\]|\\.)*)'/g
  let m
  while ((m = re.exec(src))) {
    const s = m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    if (s.length > 40) out.push(s)
  }
  return out
}
const LITERALS = [
  ...literalsFrom('scripts/seed-course-toeic.mjs'),
  ...literalsFrom('scripts/seed-course-ielts.mjs'),
]

// Full speech from an original prompt: every line that isn't a marker or a
// printed form/question line.
function fullSpeech(original) {
  const lines = original.split('\n').map(l => l.trim()).filter(Boolean)
  const spoken = []
  let inForm = false
  for (const line of lines) {
    if (/^【フォーム】/.test(line)) { inForm = true; continue }
    if (/^【/.test(line)) { inForm = false; continue }
    if (inForm) continue
    if (/^Q[:：]/.test(line)) continue
    if (/_{3,}/.test(line)) continue
    if (/[ぁ-んァ-ン一-龯]/.test(line) && !/[“”"]/.test(line)) continue // JA instruction lines
    spoken.push(line.replace(/^音声[:：]\s*/, ''))
  }
  return spoken.join('\n')
}

function segments(speech, idx) {
  const maleV = idx % 2 === 0 ? US_M : UK_M
  const femaleV = idx % 2 === 0 ? UK_F : US_F
  const lines = speech.split('\n').filter(Boolean)
  return lines.map(line => {
    const m = line.match(/^([MW])[:：]\s*(.*)$/)
    const text = (m ? m[2] : line).replace(/^[“"]/, '').replace(/[”"]$/, '').trim()
    return { voice: m ? (m[1] === 'M' ? maleV : femaleV) : (idx % 2 === 0 ? US_M : UK_F), text }
  }).filter(s => s.text)
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
    method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 1500 * attempt)); return ttsFetch(text, voiceId, attempt + 1) }
    throw new Error(`ElevenLabs ${res.status}`)
  }
  return Buffer.from(await res.arrayBuffer())
}
function ffmpegPath() { const b = join(process.cwd(), 'bin', 'ffmpeg'); return existsSync(b) ? b : 'ffmpeg' }
function joinBuffers(buffers) {
  if (buffers.length === 1) return buffers[0]
  const dir = mkdtempSync(join(tmpdir(), 'repair-'))
  try {
    const inputs = [], filters = [], labels = []
    buffers.forEach((buf, i) => { const p = join(dir, `s${i}.mp3`); writeFileSync(p, buf); inputs.push('-i', p); filters.push(`[${i}:a]apad=pad_dur=0.6[a${i}]`); labels.push(`[a${i}]`) })
    const out = join(dir, 'out.mp3')
    const fc = `${filters.join(';')};${labels.join('')}concat=n=${buffers.length}:v=0:a=1[out]`
    const r = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', out], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (r.error || r.status !== 0) throw new Error('ffmpeg failed')
    return readFileSync(out)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: screens } = await supabase.from('lesson_screens')
  .select('id, order_index, content, audio_asset_id, lesson:lessons ( slug )')
  .not('audio_asset_id', 'is', null)

let fixed = 0, ok = 0, unmatched = 0
for (const sc of screens) {
  const transcript = sc.content.transcript ?? ''
  const firstChunk = transcript.split('\n')[0]?.slice(0, 60)
  if (!firstChunk) continue
  // find the original seed literal containing this transcript's first line
  const original = LITERALS.find(l => l.includes(firstChunk))
  if (!original) {
    unmatched++
    if (DRY) console.log(`?? unmatched: ${sc.lesson.slug} #${sc.order_index} — "${firstChunk}"`)
    continue
  }
  const speech = fullSpeech(original)
  // normalize for comparison (quotes/whitespace)
  const norm = (s) => s.replace(/[“”"]/g, '').replace(/^[MW][:：]\s*/gm, '').replace(/\s+/g, ' ').trim()
  if (norm(speech) === norm(transcript) || norm(speech).length <= norm(transcript).length) { ok++; continue }

  const slug = sc.lesson.slug
  if (DRY) {
    console.log(`\n── TRUNCATED: ${slug} #${sc.order_index}`)
    console.log('  had  :', norm(transcript).slice(0, 110))
    console.log('  full :', norm(speech).slice(0, 200))
    fixed++
    continue
  }
  const segs = segments(speech, sc.order_index)
  const buffers = []
  for (const s of segs) buffers.push(await tts(s.text, s.voice))
  const audio = joinBuffers(buffers)
  const path = `courses/${slug}-${sc.order_index}.mp3`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
  if (upErr) throw new Error(upErr.message)
  const cleanTranscript = speech
  await supabase.from('assets').update({ transcript: cleanTranscript }).eq('id', sc.audio_asset_id)
  const { error } = await supabase.from('lesson_screens').update({ content: { ...sc.content, transcript: cleanTranscript } }).eq('id', sc.id)
  if (error) throw new Error(error.message)
  console.log(`✓ re-voiced ${slug} #${sc.order_index} (${segs.length} lines)`)
  fixed++
}
console.log(`\n${DRY ? 'Would fix' : 'Fixed'}: ${fixed} | already complete: ${ok} | unmatched: ${unmatched}`)
