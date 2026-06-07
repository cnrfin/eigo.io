/**
 * One-off: rebalance TOEIC L&R Mock 1 Listening Part 2 answer positions.
 * Before: correct response was A:12 B:12 C:1 — an exploitable pattern.
 * After:  A:8 B:9 C:8.
 *
 * Part 2 responses are SPOKEN, so each affected item's clip is regenerated
 * with the responses in their new order, the asset transcript is updated,
 * and the printed A/B/C options' is_correct flags are re-set to match.
 * The seed file's PART2 data is updated separately to stay in sync.
 *
 *   TTS_CACHE_DIR=.tts-cache node --env-file=.env.local scripts/fix-toeic-p2-balance.mjs
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
const FORM_SLUG = 'toeic-lr-listening-mock-01'
const MODEL = 'eleven_v3'

const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const VOICE = { narrator: US_F, m1: US_M, m2: UK_M, w1: US_F, w2: UK_F }
const LABEL = { narrator: 'Narrator', m1: 'Man', m2: 'Man', w1: 'Woman', w2: 'Woman' }

// item index (1-based) → { q: [speaker, text], r: [[text, correct] x3] in NEW order }
const FIXES = {
  1: { q: ['w1', 'Where is the marketing department?'], r: [['At nine o’clock.', false], ['Yes, twice a week.', false], ['On the fourth floor.', true]] },
  5: { q: ['w1', 'How do I get reimbursed for the taxi fare?'], r: [['Submit the receipt online.', true], ['About twenty minutes.', false], ['He went by train.', false]] },
  7: { q: ['w2', 'Haven’t you met the new branch manager yet?'], r: [['The main branch downtown.', false], ['A management seminar.', false], ['Yes, on Monday.', true]] },
  9: { q: ['w1', 'The client meeting went well, didn’t it?'], r: [['At the client’s office.', false], ['A new contract.', false], ['Better than expected.', true]] },
  13: { q: ['w1', 'Should we order more paper, or do we have enough?'], r: [['Double-sided, please.', false], ['By Friday at the latest.', false], ['The supply cabinet is full.', true]] },
  16: { q: ['m1', 'When will the renovation be finished?'], r: [['The lobby and the café.', false], ['A construction company.', false], ['By the end of the month.', true]] },
  22: { q: ['m2', 'Could I see the lunch menu, please?'], r: [['Table for two.', false], ['The kitchen closes at three.', false], ['Of course, here you are.', true]] },
  25: { q: ['w1', 'You’ve backed up the customer database, right?'], r: [['About five thousand records.', false], ['The IT department is upstairs.', false], ['Yes, it runs automatically every night.', true]] },
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
    throw new Error(`ElevenLabs ${res.status}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function ffmpegPath() { const b = join(process.cwd(), 'bin', 'ffmpeg'); return existsSync(b) ? b : 'ffmpeg' }
function joinSegments(segments) {
  const dir = mkdtempSync(join(tmpdir(), 'toeic-p2fix-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => { const p = join(dir, `seg${i}.mp3`); writeFileSync(p, seg.buffer); inputs.push('-i', p); filters.push(`[${i}:a]apad=pad_dur=${seg.gapAfter}[a${i}]`); labels.push(`[a${i}]`) })
    const out = join(dir, 'out.mp3')
    const fc = `${filters.join(';')};${labels.join('')}concat=n=${segments.length}:v=0:a=1[out]`
    const r = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', out], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (r.error || r.status !== 0) throw new Error('ffmpeg failed')
    return readFileSync(out)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const { data: form } = await supabase.from('test_forms').select('id').eq('slug', FORM_SLUG).single()
const { data: sec } = await supabase.from('sections').select('id').eq('form_id', form.id).eq('part_label', 'Part 2').single()

for (const [idxStr, item] of Object.entries(FIXES)) {
  const i = Number(idxStr)
  const num = 7 + (i - 1)
  process.stdout.write(`item ${i} (Q${num}): `)
  const [qSpeaker, qText] = item.q
  const rSpeaker = qSpeaker === 'w1' || qSpeaker === 'w2' ? 'm1' : 'w2'
  const lines = [
    { speaker: 'narrator', text: `Number ${num}.`, gap: 0.7 },
    { speaker: qSpeaker, text: qText, gap: 0.8 },
    ...item.r.map(([text], ri) => ({ speaker: rSpeaker, text: `${'ABC'[ri]}. ${text}`, gap: 0.8 })),
  ]
  const segs = []
  for (const l of lines) segs.push({ buffer: await tts(l.text, VOICE[l.speaker]), gapAfter: l.gap })
  const audio = joinSegments(segs)
  const path = `listening/${FORM_SLUG}-p2-${i}.mp3`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
  if (upErr) throw new Error(upErr.message)
  const transcript = lines.map(l => `${LABEL[l.speaker]}: ${l.text}`).join('\n')
  await supabase.from('assets').update({ transcript }).eq('storage_path', path)

  // re-flag the printed A/B/C options
  const { data: grp } = await supabase.from('question_groups').select('id').eq('section_id', sec.id).eq('order_index', i - 1).single()
  const { data: q } = await supabase.from('questions').select('id').eq('group_id', grp.id).single()
  const { data: opts } = await supabase.from('question_options').select('id, order_index').eq('question_id', q.id).order('order_index')
  for (let ri = 0; ri < 3; ri++) {
    const { error } = await supabase.from('question_options').update({ is_correct: item.r[ri][1] }).eq('id', opts[ri].id)
    if (error) throw new Error(error.message)
  }
  console.log('audio + answers updated.')
}
console.log('✓ Part 2 rebalanced.')
