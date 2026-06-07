/**
 * Full-length IELTS Listening mock (4 sections, 40 marks, full_mock → official band).
 *
 * Each section is one continuous recording heard once, with printed questions.
 * Generates 4 British-voiced recordings via ElevenLabs, uploads to test-assets,
 * and seeds the form. Question types: gap_fill (form/sentence/summary completion),
 * single_choice (MCQ), multiple_choice (choose TWO), matching. 30-minute timer.
 *
 *   node --env-file=.env.local scripts/seed-ielts-listening-full.mjs
 * Re-running REFRESHES the form. (Map/diagram-labelling is omitted — no UI yet.)
 *
 * To redo ONLY the audio for some sections (form, questions and attempts
 * untouched — same storage path, transcript updated in place):
 *   node --env-file=.env.local scripts/seed-ielts-listening-full.mjs --audio-only s1
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
const FORM_SLUG = 'ielts-listening-mock-01'
const MODEL = 'eleven_v3'

const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const US_F = 'uYXf8XasLslADfZ2MB4u'
const VOICE = { narrator: UK_F, officer: UK_M, caller: UK_F, presenter: UK_F, tutor: UK_M, sara: UK_F, mia: US_F, lecturer: UK_M }
const LABEL = { narrator: 'Narrator', officer: 'Officer', caller: 'Caller', presenter: 'Presenter', tutor: 'Tutor', sara: 'Sara', mia: 'Mia', lecturer: 'Lecturer' }

const G = 0.4 // default gap between turns

// --audio-only s1,s4  → regenerate just those sections' recordings
const ONLY = (() => {
  const i = process.argv.indexOf('--audio-only')
  return i === -1 ? null : (process.argv[i + 1] || '').split(',').map(s => s.trim()).filter(Boolean)
})()

const SETS = [
  {
    part_label: 'Section 1', title: 'Joining a sports centre', audio: `listening/${FORM_SLUG}-s1.mp3`,
    instructions: 'Complete the form. Write ONE WORD AND/OR A NUMBER for each answer.',
    lines: [
      { speaker: 'narrator', text: 'Section 1. You will hear a conversation between a man at a sports centre and a woman who wants to join. You will hear it once.', gap: 0.9 },
      { speaker: 'officer', text: 'Good morning, thank you for calling Parkside Sports Centre. How can I help?' },
      { speaker: 'caller', text: "Hi, I'd like to become a member." },
      { speaker: 'officer', text: 'Great. Could I take your surname?' },
      { speaker: 'caller', text: "Yes, it's Hill. H-I-L-L." },
      { speaker: 'officer', text: 'Thank you. And which membership would you like — standard or premium?' },
      { speaker: 'caller', text: 'The standard one, please.' },
      { speaker: 'officer', text: 'When would you like to start?' },
      { speaker: 'caller', text: 'From March, if possible.' },
      { speaker: 'officer', text: "That's fine. The standard membership is thirty-five pounds a month." },
      { speaker: 'caller', text: "Okay. I'm also interested in a class. Do you have yoga?" },
      { speaker: 'officer', text: "We do. The beginners' yoga class is on Tuesday evenings, starting at seven o'clock." },
      { speaker: 'caller', text: 'Perfect.' },
      { speaker: 'officer', text: "There's also a locker deposit of five pounds, which you get back. Please bring a photo for your membership card." },
      { speaker: 'caller', text: 'No problem.' },
      { speaker: 'officer', text: "And if you bring a friend to join, you'll both get a discount.", gap: 0.3 },
    ],
    questions: [
      { type: 'gap_fill', prompt: 'Surname:', accepted: ['hill'] },
      { type: 'gap_fill', prompt: 'Membership type:', accepted: ['standard'] },
      { type: 'gap_fill', prompt: 'Start month:', accepted: ['march'] },
      { type: 'gap_fill', prompt: 'Monthly fee:  £', accepted: ['35'] },
      { type: 'gap_fill', prompt: 'Class of interest:', accepted: ['yoga'] },
      { type: 'gap_fill', prompt: 'Class day:', accepted: ['tuesday'] },
      { type: 'gap_fill', prompt: "Class start time (o'clock):", accepted: ['7', 'seven'] },
      { type: 'gap_fill', prompt: 'Locker deposit:  £', accepted: ['5'] },
      { type: 'gap_fill', prompt: 'Bring a photo for your membership ______:', accepted: ['card'] },
      { type: 'gap_fill', prompt: 'Discount if you bring a ______:', accepted: ['friend'] },
    ],
  },
  {
    part_label: 'Section 2', title: 'City Science Museum', audio: `listening/${FORM_SLUG}-s2.mp3`,
    instructions: 'Choose the best answer, then match each floor to what is found there.',
    lines: [
      { speaker: 'narrator', text: 'Section 2. You will hear a guide talking about the City Science Museum.', gap: 0.9 },
      { speaker: 'presenter', text: "Welcome to the City Science Museum. We're open every day from nine a.m. to five p.m. Entry is eight pounds for adults and free for under-sixteens." },
      { speaker: 'presenter', text: 'There is a café and a gift shop on the ground floor. Parking here is very limited, so we strongly recommend coming by public transport.' },
      { speaker: 'presenter', text: "The museum is busiest at weekends, so for a quieter visit, do come on a weekday." },
      { speaker: 'presenter', text: 'Let me take you through the floors. On the first floor is our Space gallery, with real rockets. The second floor is all about the human body.' },
      { speaker: 'presenter', text: 'On the third floor children can take part in our hands-on Experiment Lab. And the fourth floor holds our temporary exhibitions, which change every few months.', gap: 0.3 },
    ],
    questions: [
      { type: 'single_choice', prompt: 'What time does the museum close?', options: [['A', '4 p.m.', false], ['B', '5 p.m.', true], ['C', '6 p.m.', false], ['D', '8 p.m.', false]] },
      { type: 'single_choice', prompt: 'How much is entry for adults?', options: [['A', 'Free', false], ['B', '£5', false], ['C', '£8', true], ['D', '£10', false]] },
      { type: 'single_choice', prompt: 'Where can visitors buy food?', options: [['A', 'Ground floor café', true], ['B', 'Second floor', false], ['C', 'Outside only', false], ['D', 'There is no food', false]] },
      { type: 'single_choice', prompt: 'How does the guide suggest getting to the museum?', options: [['A', 'By car', false], ['B', 'By public transport', true], ['C', 'By bicycle', false], ['D', 'On foot', false]] },
      { type: 'single_choice', prompt: 'When is the museum least busy?', options: [['A', 'Weekends', false], ['B', 'Weekdays', true], ['C', 'Mornings', false], ['D', 'Holidays', false]] },
      {
        type: 'matching', prompt: 'Match each floor to what visitors find there.',
        items: [['ground', 'Ground floor'], ['first', 'First floor'], ['second', 'Second floor'], ['third', 'Third floor'], ['fourth', 'Fourth floor']],
        // Option ids run i, ii, iii… in DISPLAY order (like the real exam),
        // so the numerals carry no information about the answers.
        options: [['i', 'The human body'], ['ii', 'A planetarium'], ['iii', 'Café and gift shop'], ['iv', 'Temporary exhibitions'], ['v', 'Rockets and space'], ['vi', 'A reading library'], ['vii', 'Hands-on experiments for children']],
        answer: { ground: 'iii', first: 'v', second: 'i', third: 'vii', fourth: 'iv' },
      },
    ],
  },
  {
    part_label: 'Section 3', title: 'A group project', audio: `listening/${FORM_SLUG}-s3.mp3`,
    instructions: 'Answer the questions and match each student to their task.',
    lines: [
      { speaker: 'narrator', text: 'Section 3. You will hear two students, Sara and Mia, talking with their tutor about a group recycling project. The other group members are Tom and Ben.', gap: 0.9 },
      { speaker: 'tutor', text: "So, how is the recycling project coming along? Remember it's due on Friday." },
      { speaker: 'sara', text: "We're mostly on track, but our survey only got a small number of responses, which is a problem." },
      { speaker: 'mia', text: "Yes, and Friday is a tight deadline with everything else we have on." },
      { speaker: 'tutor', text: "I see. Well, even with limited data, you can still present it well — I'd suggest adding more graphs to make the results clear." },
      { speaker: 'sara', text: "Good idea. Let me run through who is doing what: Tom designed the survey, I'm writing the introduction, Mia is making the slides, and Ben will present the results to the class." },
      { speaker: 'tutor', text: 'That sounds well organised. Good luck.', gap: 0.3 },
    ],
    questions: [
      { type: 'single_choice', prompt: 'What is the topic of the project?', options: [['A', 'Recycling', true], ['B', 'Climate change', false], ['C', 'Water use', false], ['D', 'Renewable energy', false]] },
      { type: 'single_choice', prompt: 'When is the project due?', options: [['A', 'Friday', true], ['B', 'Monday', false], ['C', 'Next week', false], ['D', 'Today', false]] },
      { type: 'single_choice', prompt: 'What does the tutor suggest they do?', options: [['A', 'Extend the deadline', false], ['B', 'Add more graphs', true], ['C', 'Start again', false], ['D', 'Work separately', false]] },
      { type: 'single_choice', prompt: 'How does the tutor describe their plan?', options: [['A', 'Disorganised', false], ['B', 'Well organised', true], ['C', 'Too ambitious', false], ['D', 'Incomplete', false]] },
      {
        type: 'matching', prompt: 'Match each student to the task they will do.',
        items: [['tom', 'Tom'], ['sara', 'Sara'], ['mia', 'Mia'], ['ben', 'Ben']],
        options: [['i', 'Making the slides'], ['ii', 'Designing the survey'], ['iii', 'Booking the room'], ['iv', 'Presenting the results'], ['v', 'Writing the introduction']],
        answer: { tom: 'ii', sara: 'v', mia: 'i', ben: 'iv' },
      },
      { type: 'multiple_choice', prompt: 'Which TWO problems do the students mention? Choose TWO.', options: [['A', 'A low survey response', true], ['B', 'A tight deadline', true], ['C', 'A software crash', false], ['D', 'The tutor being absent', false], ['E', 'Lost data files', false]] },
    ],
  },
  {
    part_label: 'Section 4', title: 'A lecture on the octopus', audio: `listening/${FORM_SLUG}-s4.mp3`,
    instructions: 'Complete the notes. Write ONE WORD for each answer.',
    lines: [
      { speaker: 'narrator', text: 'Section 4. You will hear part of a lecture about octopuses.', gap: 0.9 },
      { speaker: 'lecturer', text: 'Octopuses are remarkable animals. Unlike us, an octopus has three hearts, and its blood is blue rather than red, because of the copper it contains.' },
      { speaker: 'lecturer', text: 'An octopus has eight arms, and each arm is lined with many suckers that it uses to grip and to taste.' },
      { speaker: 'lecturer', text: 'They are highly intelligent: in experiments, octopuses have learned to open jars to reach the food inside, and they can change colour to hide from predators.' },
      { speaker: 'lecturer', text: 'Most octopuses live alone rather than in groups, and sadly they usually live for only a few years. And because they have no bones, they can squeeze through astonishingly small gaps.', gap: 0.3 },
    ],
    questions: [
      { type: 'gap_fill', prompt: 'An octopus has three ______.', accepted: ['hearts'] },
      { type: 'gap_fill', prompt: 'Its blood is ______ in colour.', accepted: ['blue'] },
      { type: 'gap_fill', prompt: 'The blue colour is due to ______.', accepted: ['copper'] },
      { type: 'gap_fill', prompt: 'An octopus has eight ______.', accepted: ['arms'] },
      { type: 'gap_fill', prompt: 'Each arm has many ______.', accepted: ['suckers'] },
      { type: 'gap_fill', prompt: 'In experiments they learned to open ______.', accepted: ['jars'] },
      { type: 'gap_fill', prompt: 'They change colour to hide from ______.', accepted: ['predators'] },
      { type: 'gap_fill', prompt: 'Most octopuses live ______ rather than in groups.', accepted: ['alone'] },
      { type: 'gap_fill', prompt: 'They usually live for only a few ______.', accepted: ['years'] },
      { type: 'gap_fill', prompt: 'They can squeeze through small gaps because they have no ______.', accepted: ['bones'] },
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

async function tts(text, voiceId, stability = 0.5) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST', headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

function ffmpegPath() { const b = join(process.cwd(), 'bin', 'ffmpeg'); return existsSync(b) ? b : 'ffmpeg' }
let ffmpegWarned = false
function joinSegments(segments) {
  if (segments.length === 1) return segments[0].buffer
  const dir = mkdtempSync(join(tmpdir(), 'ielts-lfull-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => { const p = join(dir, `s${i}.mp3`); writeFileSync(p, seg.buffer); inputs.push('-i', p); filters.push(`[${i}:a]apad=pad_dur=${seg.gapAfter}[a${i}]`); labels.push(`[a${i}]`) })
    const out = join(dir, 'out.mp3')
    const fc = `${filters.join(';')};${labels.join('')}concat=n=${segments.length}:v=0:a=1[out]`
    const r = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', out], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (r.error || r.status !== 0) throw new Error(r.error?.message || r.stderr?.toString().slice(-200) || 'ffmpeg failed')
    return readFileSync(out)
  } catch (err) {
    if (!ffmpegWarned) { console.warn(`\n  ! ffmpeg unavailable (${err.message}); joining without gaps.`); ffmpegWarned = true }
    return Buffer.concat(segments.map(s => s.buffer))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

async function insertOne(supabase, table, row) {
  const { data, error } = await supabase.from(table).insert(row).select('id').single()
  if (error) throw new Error(`${table}: ${error.message}`)
  return data.id
}

async function cleanup(supabase) {
  const { data: form } = await supabase.from('test_forms').select('id').eq('slug', FORM_SLUG).maybeSingle()
  if (!form) return
  console.log('Refreshing existing form.')
  const paths = SETS.map(s => s.audio)
  await supabase.storage.from(BUCKET).remove(paths).catch(() => {})
  await supabase.from('assets').delete().in('storage_path', paths)
  await supabase.from('test_forms').delete().eq('id', form.id)
}

async function insertQuestion(supabase, groupId, order, q) {
  if (q.type === 'gap_fill') {
    await insertOne(supabase, 'questions', { group_id: groupId, order_index: order, question_type: 'gap_fill', scoring_method: 'auto_text', prompt: q.prompt, payload: { accepted: q.accepted, case_sensitive: false }, max_score: 1 })
    return
  }
  if (q.type === 'matching') {
    await insertOne(supabase, 'questions', {
      group_id: groupId, order_index: order, question_type: 'matching', scoring_method: 'auto_choice', prompt: q.prompt,
      payload: { items: q.items.map(([id, text]) => ({ id, text })), match_options: q.options.map(([id, text]) => ({ id, text })), answer: q.answer },
      max_score: q.items.length,
    })
    return
  }
  // single_choice / multiple_choice
  const correct = q.options.filter(o => o[2]).length
  const qid = await insertOne(supabase, 'questions', { group_id: groupId, order_index: order, question_type: q.type, scoring_method: 'auto_choice', prompt: q.prompt, max_score: q.type === 'multiple_choice' ? correct : 1 })
  const { error } = await supabase.from('question_options').insert(q.options.map(([label, content, isCorrect], i) => ({ question_id: qid, order_index: i, label, content, is_correct: isCorrect })))
  if (error) throw new Error(`options: ${error.message}`)
}

async function buildAudio(set) {
  const segs = []
  for (const line of set.lines) {
    segs.push({ buffer: await tts(line.text, VOICE[line.speaker], line.stability ?? set.stability ?? 0.5), gapAfter: line.gap ?? G })
  }
  return joinSegments(segs)
}

function transcriptFor(set) {
  return set.lines.map(l => `${LABEL[l.speaker]}: ${l.text}`).join('\n')
}

// Regenerate audio in place for the sections named in --audio-only.
async function regenAudio(supabase) {
  const wanted = new Set(ONLY.map(s => s.toLowerCase()))
  const targets = SETS.filter(s => wanted.has(s.part_label.toLowerCase().replace('section ', 's')))
  if (targets.length !== wanted.size) throw new Error(`--audio-only expects sections like s1,s4 (got: ${ONLY.join(',')})`)
  for (const set of targets) {
    process.stdout.write(`${set.part_label}: regenerating audio… `)
    const audio = await buildAudio(set)
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(set.audio, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(`upload ${set.audio}: ${upErr.message}`)
    const { error: trErr } = await supabase.from('assets').update({ transcript: transcriptFor(set) }).eq('storage_path', set.audio)
    if (trErr) throw new Error(`transcript ${set.audio}: ${trErr.message}`)
    console.log('done.')
  }
  console.log(`\n✓ Regenerated ${targets.map(s => s.part_label).join(', ')} (form, questions and attempts untouched).`)
}

async function main() {
  requireEnv()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  if (ONLY) return regenAudio(supabase)
  const { data: track, error } = await supabase.from('exam_tracks').select('id').eq('slug', 'ielts-academic').single()
  if (error || !track) throw new Error('Track ielts-academic not found.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG, title: 'IELTS — Listening Mock Test 1', title_ja: 'IELTS リスニング模試1',
    mode: 'full_mock', time_limit_seconds: 1800, published: true,
  })

  let marks = 0
  for (const [si, set] of SETS.entries()) {
    process.stdout.write(`${set.part_label}: generating audio… `)
    const audio = await buildAudio(set)
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(set.audio, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(`upload ${set.audio}: ${upErr.message}`)
    const assetId = await insertOne(supabase, 'assets', { type: 'audio', storage_path: set.audio, transcript: transcriptFor(set), alt_text: '' })

    const sectionId = await insertOne(supabase, 'sections', { form_id: formId, skill: 'listening', part_label: set.part_label, title: set.title, instructions: set.instructions, order_index: si })
    const groupId = await insertOne(supabase, 'question_groups', { section_id: sectionId, order_index: 0, stimulus_type: 'audio', audio_asset_id: assetId })
    for (let i = 0; i < set.questions.length; i++) {
      const q = set.questions[i]
      await insertQuestion(supabase, groupId, i, q)
      marks += q.type === 'matching' ? q.items.length : q.type === 'multiple_choice' ? q.options.filter(o => o[2]).length : 1
    }
    console.log('done.')
  }
  console.log(`\n✓ Seeded ${FORM_SLUG} (full_mock, ${marks} marks across 4 sections).`)
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
