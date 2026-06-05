/**
 * Seed an EIKEN Grade 3 listening practice form (Part-2 style, authentic format).
 *
 * Mirrors the real EIKEN Grade 3 listening audio:
 *   - A UK-female ANNOUNCER reads "Number N." then, after the dialogue,
 *     "Question: …".  (No chime/bell — EIKEN uses none.)
 *   - The dialogue uses distinct man/woman voices.
 *   - The four answer options are NOT read aloud — they stay on screen only
 *     (as in the real test booklet) and are numbered 1–4.
 *   - Clear pauses separate "Number N", each turn, and the question, joined with
 *     ffmpeg (falls back to g-less concatenation if ffmpeg isn't found).
 *
 * Only the spoken `text` of each line is sent to TTS, so speaker labels are
 * never voiced. The asset transcript stores the readable labelled script for
 * the review screen.
 *
 * Run locally (uses your .env.local — needs SUPABASE_SERVICE_ROLE_KEY and
 * ELEVENLABS_API_KEY):
 *
 *   node --env-file=.env.local scripts/seed-listening.mjs
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
const FORM_SLUG = 'eiken-g3-listening-practice-01'
const ELEVENLABS_MODEL_ID = 'eleven_v3'

// Dialogue speakers (US voices) + the announcer (UK female), from the sayafterme catalogue.
const SPEAKERS = {
  woman: { voiceId: 'uYXf8XasLslADfZ2MB4u', label: 'Woman' }, // US-Female
  man:   { voiceId: 'UgBBYS2sOqTuMpoF3BR0', label: 'Man' },   // US-Male
}
const ANNOUNCER = 'lcMyyd2HUfFzxdCaC4Ta' // UK-Female

// Gaps (seconds) of silence inserted AFTER each segment, EIKEN-like pacing.
const GAP_AFTER_NUMBER = 0.7
const GAP_BETWEEN_LINES = 0.5
const GAP_BEFORE_QUESTION = 0.9
const GAP_TRAILING = 0.3

// Part-2 style items: a short M/F dialogue, a spoken question, and four
// on-screen (silent) numbered options.
const ITEMS = [
  {
    lines: [
      { speaker: 'woman', text: 'What time does the movie start?' },
      { speaker: 'man', text: "It starts at seven o'clock." },
      { speaker: 'woman', text: "Great. Let's meet at six thirty, then." },
      { speaker: 'man', text: 'Sounds good.' },
    ],
    question: 'What time does the movie start?',
    options: [
      { label: '1', content: 'At six o\'clock', correct: false },
      { label: '2', content: 'At six thirty', correct: false },
      { label: '3', content: 'At seven o\'clock', correct: true },
      { label: '4', content: 'At eight o\'clock', correct: false },
    ],
  },
  {
    lines: [
      { speaker: 'man', text: 'Mom, where are my soccer shoes?' },
      { speaker: 'woman', text: 'They are in the box by the front door.' },
      { speaker: 'man', text: "Thanks. I looked in my room but couldn't find them." },
      { speaker: 'woman', text: 'You should keep them in your bag.' },
    ],
    question: "Where are the boy's soccer shoes?",
    options: [
      { label: '1', content: 'In his room', correct: false },
      { label: '2', content: 'In the box by the door', correct: true },
      { label: '3', content: 'In his school bag', correct: false },
      { label: '4', content: 'In the car', correct: false },
    ],
  },
  {
    lines: [
      { speaker: 'man', text: 'How was your weekend, Lisa?' },
      { speaker: 'woman', text: 'It was great. I went to the zoo with my family.' },
      { speaker: 'man', text: 'Did you see the pandas?' },
      { speaker: 'woman', text: 'Yes! They were so cute.' },
    ],
    question: 'Where did Lisa go on the weekend?',
    options: [
      { label: '1', content: 'To the park', correct: false },
      { label: '2', content: 'To the zoo', correct: true },
      { label: '3', content: 'To the beach', correct: false },
      { label: '4', content: 'To school', correct: false },
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
    console.error('Run with:  node --env-file=.env.local scripts/seed-listening.mjs')
    process.exit(1)
  }
}

async function tts(text, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

function ffmpegPath() {
  const bundled = join(process.cwd(), 'bin', 'ffmpeg')
  return existsSync(bundled) ? bundled : 'ffmpeg' // else rely on PATH (brew/system)
}

let ffmpegWarned = false

// Concatenate segments [{ buffer, gapAfter }] into one mp3 with silence between,
// via ffmpeg. Falls back to gap-less buffer concat if ffmpeg isn't available.
function joinSegments(segments) {
  const dir = mkdtempSync(join(tmpdir(), 'eiken-listen-'))
  try {
    const inputs = []
    const filters = []
    const labels = []
    segments.forEach((seg, i) => {
      const p = join(dir, `seg${i}.mp3`)
      writeFileSync(p, seg.buffer)
      inputs.push('-i', p)
      filters.push(`[${i}:a]apad=pad_dur=${seg.gapAfter}[a${i}]`)
      labels.push(`[a${i}]`)
    })
    const outPath = join(dir, 'out.mp3')
    const filterComplex = `${filters.join(';')};${labels.join('')}concat=n=${segments.length}:v=0:a=1[out]`
    const args = ['-y', ...inputs, '-filter_complex', filterComplex, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', outPath]
    const res = spawnSync(ffmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'] })
    if (res.error || res.status !== 0) {
      throw new Error(res.error?.message || res.stderr?.toString().slice(-200) || 'ffmpeg failed')
    }
    return readFileSync(outPath)
  } catch (err) {
    if (!ffmpegWarned) {
      console.warn(`\n  ! ffmpeg unavailable (${err.message}); joining without gaps. Install ffmpeg for proper spacing.`)
      ffmpegWarned = true
    }
    return Buffer.concat(segments.map(s => s.buffer))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// Build the spoken audio: "Number N." -> dialogue (man/woman) -> "Question: …".
async function renderItemAudio(item, number) {
  const segments = []
  segments.push({ buffer: await tts(`Number ${number}.`, ANNOUNCER), gapAfter: GAP_AFTER_NUMBER })
  for (let i = 0; i < item.lines.length; i++) {
    const line = item.lines[i]
    const sp = SPEAKERS[line.speaker]
    if (!sp) throw new Error(`Unknown speaker "${line.speaker}"`)
    const isLastLine = i === item.lines.length - 1
    segments.push({ buffer: await tts(line.text, sp.voiceId), gapAfter: isLastLine ? GAP_BEFORE_QUESTION : GAP_BETWEEN_LINES })
  }
  segments.push({ buffer: await tts(`Question. ${item.question}`, ANNOUNCER), gapAfter: GAP_TRAILING })
  return joinSegments(segments)
}

function transcriptFor(item, number) {
  const dialogue = item.lines.map(l => `${SPEAKERS[l.speaker].label}: ${l.text}`).join('\n')
  return `No. ${number}\n${dialogue}\nQuestion: ${item.question}`
}

async function insertOne(supabase, table, row) {
  const { data, error } = await supabase.from(table).insert(row).select('id').single()
  if (error) throw new Error(`${table} insert: ${error.message}`)
  return data.id
}

async function cleanup(supabase) {
  const { data: form } = await supabase.from('test_forms').select('id').eq('slug', FORM_SLUG).maybeSingle()
  if (!form) return
  console.log('Existing form found — refreshing (deleting old form + audio).')
  const paths = ITEMS.map((_, i) => `listening/${FORM_SLUG}-${i + 1}.mp3`)
  await supabase.storage.from(BUCKET).remove(paths).catch(() => {})
  await supabase.from('assets').delete().in('storage_path', paths)
  await supabase.from('test_forms').delete().eq('id', form.id)
}

async function main() {
  requireEnv()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: track, error: trackErr } = await supabase
    .from('exam_tracks').select('id').eq('slug', 'eiken-grade-3').single()
  if (trackErr || !track) throw new Error('Track eiken-grade-3 not found — run add-practice-tests.sql first.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'EIKEN Grade 3 — Listening Practice 1', title_ja: '英検3級 リスニング練習1',
    mode: 'skill_practice', time_limit_seconds: 600, published: true,
  })
  const sectionId = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 2', title: 'Conversation Comprehension',
    instructions: 'Listen to each conversation and the question, then choose the best answer. Each is played once here — use the player to replay.',
    order_index: 0,
  })

  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i]
    const number = i + 1
    process.stdout.write(`Item ${number}/${ITEMS.length}: generating voices… `)
    const audio = await renderItemAudio(item, number)
    const path = `listening/${FORM_SLUG}-${number}.mp3`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(`upload ${path}: ${upErr.message}`)

    const assetId = await insertOne(supabase, 'assets', {
      type: 'audio', storage_path: path, transcript: transcriptFor(item, number), alt_text: '',
    })
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sectionId, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    const questionId = await insertOne(supabase, 'questions', {
      group_id: groupId, order_index: 0, question_type: 'single_choice',
      scoring_method: 'auto_choice', prompt: item.question, max_score: 1,
    })
    const { error: optErr } = await supabase.from('question_options').insert(
      item.options.map((o, idx) => ({
        question_id: questionId, order_index: idx, label: o.label, content: o.content, is_correct: o.correct,
      }))
    )
    if (optErr) throw new Error(`options: ${optErr.message}`)
    console.log('done.')
  }

  console.log(`\n✓ Seeded ${FORM_SLUG} with ${ITEMS.length} EIKEN-format listening items.`)
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
