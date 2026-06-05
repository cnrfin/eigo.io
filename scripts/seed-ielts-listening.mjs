/**
 * Seed an IELTS Academic Listening Section 1 practice (form completion + MCQ).
 *
 * IELTS listening is a CONTINUOUS recording heard once — no per-item numbering
 * or spoken questions (unlike EIKEN). This generates a multi-voice (British)
 * Section-1 enquiry conversation with ElevenLabs, concatenates it into one clip,
 * uploads it to the private test-assets bucket, and seeds the form whose
 * questions (form-completion gap-fills + MCQ) match what's said in the audio.
 *
 * Run locally (uses .env.local — SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-ielts-listening.mjs
 *
 * Re-running REFRESHES the form (deletes the old form + audio, regenerates).
 */
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

const BUCKET = 'test-assets'
const FORM_SLUG = 'ielts-academic-listening-practice-01'
const AUDIO_PATH = `listening/${FORM_SLUG}.mp3`
const ELEVENLABS_MODEL_ID = 'eleven_v3'

// British voices for IELTS.
const SPEAKERS = {
  narrator: { voiceId: 'lcMyyd2HUfFzxdCaC4Ta', label: 'Narrator' }, // UK-Female
  caller:   { voiceId: 'lcMyyd2HUfFzxdCaC4Ta', label: 'Caller' },   // UK-Female
  officer:  { voiceId: 'fNYuJl2dBlX9V7NxmjnV', label: 'Officer' },  // UK-Male
}

// Continuous Section-1 conversation. The spoken details match the answer keys below.
const LINES = [
  { speaker: 'narrator', text: 'Section 1. You will hear a telephone conversation between a woman who wants to book a room and a man who works at a community centre. You will hear the recording once.', gap: 0.9 },
  { speaker: 'officer', text: 'Good morning, Riverside Community Centre. How can I help you?', gap: 0.4 },
  { speaker: 'caller', text: "Hello. I'd like to book a room for a private event.", gap: 0.4 },
  { speaker: 'officer', text: 'Of course. Could I take your name, please?', gap: 0.4 },
  { speaker: 'caller', text: "Yes, it's Helen Marsh. Marsh — M, A, R, S, H.", gap: 0.4 },
  { speaker: 'officer', text: 'Thank you, Ms Marsh. And what kind of event is it?', gap: 0.4 },
  { speaker: 'caller', text: "It's a retirement party for my mother.", gap: 0.4 },
  { speaker: 'officer', text: 'Lovely. What date were you thinking of?', gap: 0.4 },
  { speaker: 'caller', text: "The fifteenth of June, if it's free.", gap: 0.4 },
  { speaker: 'officer', text: 'Let me check… yes, the fifteenth is available. How many guests are you expecting?', gap: 0.4 },
  { speaker: 'caller', text: 'About sixty people.', gap: 0.4 },
  { speaker: 'officer', text: "In that case I'd recommend the Garden Room — it holds up to seventy.", gap: 0.4 },
  { speaker: 'caller', text: 'The Garden Room sounds perfect. How much does it cost?', gap: 0.4 },
  { speaker: 'officer', text: "It's thirty pounds an hour, and we ask for a deposit of fifty pounds.", gap: 0.4 },
  { speaker: 'caller', text: 'Fine. Is there anything else I should know?', gap: 0.4 },
  { speaker: 'officer', text: 'If you would like music, you can hire our sound system for an extra twenty pounds. And please note the hall must be empty by eleven p.m.', gap: 0.4 },
  { speaker: 'caller', text: "Great — I'll take the sound system as well. Thank you.", gap: 0.3 },
]

// Questions matching the audio (7 form-completion gap-fills + 2 MCQ).
const QUESTIONS = [
  { type: 'gap_fill', prompt: "Caller's surname:", accepted: ['marsh'] },
  { type: 'gap_fill', prompt: 'Type of event:  ______ party', accepted: ['retirement'] },
  { type: 'gap_fill', prompt: 'Date of event:  ______ June', accepted: ['15', '15th', 'fifteenth'] },
  { type: 'gap_fill', prompt: 'Number of guests:', accepted: ['60', 'sixty'] },
  { type: 'gap_fill', prompt: 'Room booked:  ______ Room', accepted: ['garden'] },
  { type: 'gap_fill', prompt: 'Cost:  £______ per hour', accepted: ['30', 'thirty'] },
  { type: 'gap_fill', prompt: 'Deposit:  £______', accepted: ['50', 'fifty'] },
  {
    type: 'single_choice', prompt: 'What can the woman hire for an extra £20?',
    options: [
      { label: 'A', content: 'A projector', correct: false },
      { label: 'B', content: 'A sound system', correct: true },
      { label: 'C', content: 'Extra chairs', correct: false },
      { label: 'D', content: 'A microphone', correct: false },
    ],
  },
  {
    type: 'single_choice', prompt: 'By what time must the hall be empty?',
    options: [
      { label: 'A', content: '10 p.m.', correct: false },
      { label: 'B', content: '11 p.m.', correct: true },
      { label: 'C', content: '11:30 p.m.', correct: false },
      { label: 'D', content: 'Midnight', correct: false },
    ],
  },
]

function requireEnv() {
  const missing = []
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY')
  if (missing.length) {
    console.error('Missing env vars:', missing.join(', '))
    console.error('Run with:  node --env-file=.env.local scripts/seed-ielts-listening.mjs')
    process.exit(1)
  }
}

async function tts(text, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: ELEVENLABS_MODEL_ID, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

function ffmpegPath() {
  const bundled = join(process.cwd(), 'bin', 'ffmpeg')
  return existsSync(bundled) ? bundled : 'ffmpeg'
}
let ffmpegWarned = false

function joinSegments(segments) {
  const dir = mkdtempSync(join(tmpdir(), 'ielts-listen-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => {
      const p = join(dir, `seg${i}.mp3`)
      writeFileSync(p, seg.buffer)
      inputs.push('-i', p)
      filters.push(`[${i}:a]apad=pad_dur=${seg.gapAfter}[a${i}]`)
      labels.push(`[a${i}]`)
    })
    const outPath = join(dir, 'out.mp3')
    const filterComplex = `${filters.join(';')};${labels.join('')}concat=n=${segments.length}:v=0:a=1[out]`
    const res = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', filterComplex, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', outPath], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (res.error || res.status !== 0) throw new Error(res.error?.message || res.stderr?.toString().slice(-200) || 'ffmpeg failed')
    return readFileSync(outPath)
  } catch (err) {
    if (!ffmpegWarned) { console.warn(`\n  ! ffmpeg unavailable (${err.message}); joining without gaps.`); ffmpegWarned = true }
    return Buffer.concat(segments.map(s => s.buffer))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function insertOne(supabase, table, row) {
  const { data, error } = await supabase.from(table).insert(row).select('id').single()
  if (error) throw new Error(`${table} insert: ${error.message}`)
  return data.id
}

async function cleanup(supabase) {
  const { data: form } = await supabase.from('test_forms').select('id').eq('slug', FORM_SLUG).maybeSingle()
  if (!form) return
  console.log('Existing form found — refreshing.')
  await supabase.storage.from(BUCKET).remove([AUDIO_PATH]).catch(() => {})
  await supabase.from('assets').delete().eq('storage_path', AUDIO_PATH)
  await supabase.from('test_forms').delete().eq('id', form.id)
}

async function main() {
  requireEnv()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: track, error: trackErr } = await supabase
    .from('exam_tracks').select('id').eq('slug', 'ielts-academic').single()
  if (trackErr || !track) throw new Error('Track ielts-academic not found — run add-practice-tests.sql first.')

  await cleanup(supabase)

  // Build the continuous audio.
  process.stdout.write(`Generating ${LINES.length} voice lines… `)
  const segments = []
  for (const line of LINES) {
    const sp = SPEAKERS[line.speaker]
    if (!sp) throw new Error(`Unknown speaker "${line.speaker}"`)
    segments.push({ buffer: await tts(line.text, sp.voiceId), gapAfter: line.gap })
  }
  const audio = joinSegments(segments)
  console.log('done.')

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(AUDIO_PATH, audio, { contentType: 'audio/mpeg', upsert: true })
  if (upErr) throw new Error(`upload: ${upErr.message}`)

  const transcript = LINES.map(l => `${SPEAKERS[l.speaker].label}: ${l.text}`).join('\n')
  const assetId = await insertOne(supabase, 'assets', { type: 'audio', storage_path: AUDIO_PATH, transcript, alt_text: '' })

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'IELTS Academic — Listening Practice 1', title_ja: 'IELTS アカデミック リスニング練習1',
    mode: 'skill_practice', time_limit_seconds: 600, published: true,
  })
  const sectionId = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Section 1', title: 'Booking a Room',
    instructions: 'You will hear the recording ONCE. Complete the form and answer the questions as you listen.',
    order_index: 0,
  })
  const groupId = await insertOne(supabase, 'question_groups', {
    section_id: sectionId, order_index: 0, stimulus_type: 'audio', audio_asset_id: assetId,
    prompt: 'Questions 1-7: Complete the form. Write ONE WORD AND/OR A NUMBER for each answer.',
  })

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i]
    if (q.type === 'gap_fill') {
      await insertOne(supabase, 'questions', {
        group_id: groupId, order_index: i, question_type: 'gap_fill', scoring_method: 'auto_text',
        prompt: q.prompt, payload: { accepted: q.accepted, case_sensitive: false }, max_score: 1,
      })
    } else {
      const qid = await insertOne(supabase, 'questions', {
        group_id: groupId, order_index: i, question_type: 'single_choice', scoring_method: 'auto_choice',
        prompt: q.prompt, max_score: 1,
      })
      const { error } = await supabase.from('question_options').insert(
        q.options.map((o, idx) => ({ question_id: qid, order_index: idx, label: o.label, content: o.content, is_correct: o.correct }))
      )
      if (error) throw new Error(`options: ${error.message}`)
    }
  }

  console.log(`\n✓ Seeded ${FORM_SLUG} (${QUESTIONS.length} questions, one continuous Section-1 recording).`)
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
