/**
 * Add real audio to the listening-skill lessons of the TOEIC + IELTS courses.
 *
 * For each flagged screen: the spoken material is extracted from the printed
 * prompt, voiced with ElevenLabs, uploaded, and linked via audio_asset_id;
 * the prompt is rewritten to an instruction and the script moves to
 * content.transcript (the player hides it until the question is answered).
 *
 *   node --env-file=.env.local scripts/add-course-audio.mjs --dry   # print transformations only
 *   TTS_CACHE_DIR=.tts-cache node --env-file=.env.local scripts/add-course-audio.mjs
 *
 * Idempotent: screens that already have audio_asset_id are skipped.
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
const BUCKET = 'test-assets'
const MODEL = 'eleven_v3'
const DRY = process.argv.includes('--dry')

const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'

// per-lesson transformation rules
const LESSONS = {
  // ── TOEIC Part 2: the whole prompt is the spoken question ──
  'toeic-p2-wh-questions': { kind: 'whole-prompt' },
  'toeic-p2-yesno-tag-questions': { kind: 'whole-prompt' },
  'toeic-p2-sound-traps': { kind: 'whole-prompt' },
  'toeic-p2-review': { kind: 'whole-prompt' },
  // ── 音声:"…" + printed question line ──
  'toeic-p34-paraphrase': { kind: 'quoted-speech' },
  'toeic-p34-speaker-intent': { kind: 'dialogue-q' },
  'toeic-p34-review': { kind: 'dialogue-q' },
  // ── IELTS ──
  'ielts-listening-numbers': { kind: 'ielts-form' },
  'ielts-listening-paraphrase': { kind: 'quoted-speech' },
  'ielts-listening-option-traps': { kind: 'dialogue-q' },
  'ielts-listening-review': { kind: 'dialogue-q' },
}

const INSTRUCTION = {
  'whole-prompt': 'Listen and choose the best response.',
}

function extract(slug, kind, prompt) {
  if (kind === 'whole-prompt') {
    return { speech: prompt.trim(), newPrompt: INSTRUCTION['whole-prompt'] }
  }
  if (kind === 'quoted-speech') {
    // 音声: “…”  (possibly with 【音声】 marker) + question line after a blank line
    const m = prompt.match(/[“"]([\s\S]+?)[”"]/)
    if (!m) return null
    const speech = m[1].trim()
    const after = prompt.slice(prompt.indexOf(m[0]) + m[0].length).trim()
    const newPrompt = after.replace(/^[\n\s]*/, '') || 'Listen, then answer.'
    return { speech, newPrompt }
  }
  if (kind === 'dialogue-q') {
    // 【会話】/【音声】 block with M:/W: lines (or plain lines), then Q: …
    const qMatch = prompt.match(/\nQ[:：]\s*([\s\S]+)$/)
    const head = qMatch ? prompt.slice(0, qMatch.index) : prompt
    let newPrompt = qMatch ? qMatch[1].trim() : 'Listen, then answer.'
    let body = head.replace(/【[^】]*】/g, '').trim()
    // A trailing printed form line ("Booking reference: ______") is NOT speech —
    // keep it as the visible prompt instead.
    const lines = body.split('\n')
    if (!qMatch && lines.length > 1 && /_{3,}/.test(lines[lines.length - 1])) {
      newPrompt = lines.pop().trim()
      body = lines.join('\n').trim()
    }
    // strip wrapping quotation marks from monologue speech
    body = body.replace(/^[“"]/, '').replace(/[”"]$/, '')
    if (!body) return null
    return { speech: body, newPrompt, dialogue: /^[MW][:：]/m.test(body) }
  }
  if (kind === 'ielts-form') {
    // 【音声】 “…”  +  【フォーム】 section that must stay printed
    const m = prompt.match(/[“"]([\s\S]+?)[”"]/)
    if (!m) return null
    const formIdx = prompt.indexOf('【フォーム】')
    const printed = formIdx !== -1 ? prompt.slice(formIdx).replace('【フォーム】', '').trim() : '______'
    return { speech: m[1].trim(), newPrompt: printed }
  }
  return null
}

// speech → [{voice, text}] segments (M/W dialogue lines get distinct voices)
function segmentsFor(speech, screenIdx, dialogue) {
  const maleV = screenIdx % 2 === 0 ? US_M : UK_M
  const femaleV = screenIdx % 2 === 0 ? UK_F : US_F
  if (dialogue) {
    return speech.split('\n').map(line => {
      const m = line.match(/^([MW])[:：]\s*(.*)$/)
      if (!m) return { voice: maleV, text: line.trim() }
      return { voice: m[1] === 'M' ? maleV : femaleV, text: m[2].trim() }
    }).filter(s => s.text)
  }
  return [{ voice: screenIdx % 2 === 0 ? US_M : UK_F, text: speech.replace(/\n+/g, ' ') }]
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
function joinSegments(buffers) {
  if (buffers.length === 1) return buffers[0]
  const dir = mkdtempSync(join(tmpdir(), 'course-audio-'))
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
let done = 0, skipped = 0
for (const [slug, rule] of Object.entries(LESSONS)) {
  const { data: lesson } = await supabase.from('lessons').select('id').eq('slug', slug).single()
  if (!lesson) { console.error('lesson not found:', slug); continue }
  const { data: screens } = await supabase.from('lesson_screens')
    .select('id, order_index, type, content, audio_asset_id')
    .eq('lesson_id', lesson.id).eq('type', 'question').order('order_index')
  for (const sc of screens) {
    if (sc.audio_asset_id) { skipped++; continue }
    const ext = extract(slug, rule.kind, sc.content.prompt ?? '')
    if (!ext) { console.log(`  !! could not parse ${slug} #${sc.order_index} — leaving as-is`); continue }
    const segs = segmentsFor(ext.speech, sc.order_index, ext.dialogue)
    if (DRY) {
      console.log(`\n── ${slug} #${sc.order_index}`)
      console.log('  speech :', segs.map(s => (s.voice === US_M || s.voice === UK_M ? '[M] ' : '[F] ') + s.text).join(' | ').slice(0, 220))
      console.log('  prompt →', ext.newPrompt.slice(0, 120).replace(/\n/g, ' ⏎ '))
      continue
    }
    const buffers = []
    for (const s of segs) buffers.push(await tts(s.text, s.voice))
    const audio = joinSegments(buffers)
    const path = `courses/${slug}-${sc.order_index}.mp3`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(upErr.message)
    const { data: existing } = await supabase.from('assets').select('id').eq('storage_path', path).maybeSingle()
    let assetId = existing?.id
    if (!assetId) {
      const { data, error } = await supabase.from('assets').insert({ type: 'audio', storage_path: path, transcript: ext.speech, alt_text: '' }).select('id').single()
      if (error) throw new Error(error.message)
      assetId = data.id
    }
    const newContent = {
      ...sc.content,
      prompt: ext.newPrompt,
      transcript: ext.speech,
      // the JA instruction line often says 「読んで」— make it listening
      ...(sc.content.prompt_ja ? { prompt_ja: sc.content.prompt_ja.replace(/読んでから/g, '聞いてから').replace(/音声を聞いたつもりで/g, '音声を聞いて').replace(/読んで/g, '聞いて') } : {}),
    }
    const { error: updErr } = await supabase.from('lesson_screens').update({ content: newContent, audio_asset_id: assetId }).eq('id', sc.id)
    if (updErr) throw new Error(updErr.message)
    console.log(`✓ ${slug} #${sc.order_index}`)
    done++
  }
}
console.log(DRY ? '\n(dry run — nothing written)' : `\n✓ ${done} screens voiced (${skipped} already had audio).`)
