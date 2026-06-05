/**
 * Seed a TOEIC L&R Listening practice (Part 3 conversation + Part 4 talk).
 *
 * Each set is a continuous recording heard once, with printed 4-choice (A-D)
 * questions — TOEIC's format. This generates the audio with ElevenLabs (US
 * voices), one clip per set, uploads to the private test-assets bucket, and
 * seeds the form whose questions match what's said.
 *
 * (Part 1 photo-description needs an image, and Part 2 has spoken-only options —
 *  both deferred until the relevant UI exists.)
 *
 * Run locally (uses .env.local — SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-toeic-listening.mjs
 * Re-running REFRESHES the form.
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
const FORM_SLUG = 'toeic-lr-listening-practice-01'
const ELEVENLABS_MODEL_ID = 'eleven_v3'

const VOICES = {
  narrator: 'uYXf8XasLslADfZ2MB4u', // US-Female
  woman: 'uYXf8XasLslADfZ2MB4u',    // US-Female
  man: 'UgBBYS2sOqTuMpoF3BR0',      // US-Male
}
const LABEL = { narrator: 'Narrator', woman: 'Woman', man: 'Man' }

// Two listening sets. Each becomes one audio clip + 3 printed questions.
const SETS = [
  {
    part_label: 'Part 3', title: 'Conversation', audio: `listening/${FORM_SLUG}-p3.mp3`,
    lines: [
      { speaker: 'narrator', text: 'Questions 1 through 3 refer to the following conversation.', gap: 0.8 },
      { speaker: 'woman', text: "Hi David, have you finished the slides for tomorrow's client presentation?", gap: 0.4 },
      { speaker: 'man', text: 'Almost. I just need to add the sales figures for the last quarter. Could you send them to me?', gap: 0.4 },
      { speaker: 'woman', text: "Sure, I'll email them this afternoon. By the way, the meeting was moved to ten a.m. instead of two p.m.", gap: 0.4 },
      { speaker: 'man', text: "Oh, thanks for letting me know. I'll make sure everything is ready by nine.", gap: 0.4 },
      { speaker: 'woman', text: "Great. Let's do a quick rehearsal before the client arrives.", gap: 0.4 },
      { speaker: 'man', text: "Good idea. I'll book the small conference room.", gap: 0.3 },
    ],
    questions: [
      { prompt: 'What are the speakers mainly discussing?', options: [
        ['A', 'Preparing for a presentation', true], ['B', 'Hiring a new employee', false],
        ['C', 'A budget reduction', false], ['D', 'A product defect', false] ] },
      { prompt: 'What does the woman say she will do this afternoon?', options: [
        ['A', 'Book a conference room', false], ['B', 'Email the sales figures', true],
        ['C', 'Call the client', false], ['D', 'Cancel the meeting', false] ] },
      { prompt: 'What time was the meeting moved to?', options: [
        ['A', '9:00 a.m.', false], ['B', '10:00 a.m.', true],
        ['C', '11:00 a.m.', false], ['D', '2:00 p.m.', false] ] },
    ],
  },
  {
    part_label: 'Part 4', title: 'Talk', audio: `listening/${FORM_SLUG}-p4.mp3`,
    lines: [
      { speaker: 'narrator', text: 'Questions 4 through 6 refer to the following announcement.', gap: 0.8 },
      { speaker: 'man', text: 'Attention, shoppers, and thank you for visiting Brightway Department Store. This weekend only, all winter clothing is twenty percent off on the third floor. In addition, our café on the first floor is offering a free coffee with any purchase over fifteen dollars. Please note that the store will close early today, at six p.m., for inventory. We hope you enjoy your visit.', gap: 0.3 },
    ],
    questions: [
      { prompt: 'Where most likely is this announcement being made?', options: [
        ['A', 'At an airport', false], ['B', 'At a department store', true],
        ['C', 'At a library', false], ['D', 'At a restaurant', false] ] },
      { prompt: 'What is being offered on the third floor?', options: [
        ['A', 'A free coffee', false], ['B', 'A discount on winter clothing', true],
        ['C', 'A cooking class', false], ['D', 'Free gift wrapping', false] ] },
      { prompt: 'Why will the store close early today?', options: [
        ['A', 'For a public holiday', false], ['B', 'To take inventory', true],
        ['C', 'For cleaning', false], ['D', 'For a private event', false] ] },
    ],
  },
]

function requireEnv() {
  const missing = []
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY')
  if (missing.length) { console.error('Missing env vars:', missing.join(', ')); process.exit(1) }
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
  if (segments.length === 1) return segments[0].buffer
  const dir = mkdtempSync(join(tmpdir(), 'toeic-listen-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => {
      const p = join(dir, `seg${i}.mp3`); writeFileSync(p, seg.buffer)
      inputs.push('-i', p); filters.push(`[${i}:a]apad=pad_dur=${seg.gapAfter}[a${i}]`); labels.push(`[a${i}]`)
    })
    const outPath = join(dir, 'out.mp3')
    const fc = `${filters.join(';')};${labels.join('')}concat=n=${segments.length}:v=0:a=1[out]`
    const res = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', outPath], { stdio: ['ignore', 'ignore', 'pipe'] })
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
  const paths = SETS.map(s => s.audio)
  await supabase.storage.from(BUCKET).remove(paths).catch(() => {})
  await supabase.from('assets').delete().in('storage_path', paths)
  await supabase.from('test_forms').delete().eq('id', form.id)
}

async function main() {
  requireEnv()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: track, error: trackErr } = await supabase
    .from('exam_tracks').select('id').eq('slug', 'toeic-lr').single()
  if (trackErr || !track) throw new Error('Track toeic-lr not found — run add-practice-tests.sql first.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'TOEIC L&R — Listening Practice 1', title_ja: 'TOEIC L&R リスニング練習1',
    mode: 'skill_practice', time_limit_seconds: 600, published: true,
  })

  for (const [si, set] of SETS.entries()) {
    process.stdout.write(`${set.part_label}: generating audio… `)
    const segments = set.lines.map(() => null) // placeholder for ordering
    for (let i = 0; i < set.lines.length; i++) {
      const line = set.lines[i]
      segments[i] = { buffer: await tts(line.text, VOICES[line.speaker]), gapAfter: line.gap }
    }
    const audio = joinSegments(segments)
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(set.audio, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(`upload ${set.audio}: ${upErr.message}`)
    const transcript = set.lines.map(l => `${LABEL[l.speaker]}: ${l.text}`).join('\n')
    const assetId = await insertOne(supabase, 'assets', { type: 'audio', storage_path: set.audio, transcript, alt_text: '' })

    const sectionId = await insertOne(supabase, 'sections', {
      form_id: formId, skill: 'listening', part_label: set.part_label, title: set.title,
      instructions: 'Listen to the recording and choose the best answer (A-D) to each question.', order_index: si,
    })
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sectionId, order_index: 0, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    for (let qi = 0; qi < set.questions.length; qi++) {
      const q = set.questions[qi]
      const qid = await insertOne(supabase, 'questions', {
        group_id: groupId, order_index: qi, question_type: 'single_choice', scoring_method: 'auto_choice',
        prompt: q.prompt, max_score: 1,
      })
      const { error } = await supabase.from('question_options').insert(
        q.options.map(([label, content, correct], idx) => ({ question_id: qid, order_index: idx, label, content, is_correct: correct }))
      )
      if (error) throw new Error(`options: ${error.message}`)
    }
    console.log('done.')
  }

  console.log(`\n✓ Seeded ${FORM_SLUG} (Part 3 + Part 4, 6 questions).`)
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
