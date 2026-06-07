/**
 * Full-length IELTS General Training Listening MOCK 2 (4 sections, 40 marks).
 *
 * A second GT paper with entirely fresh content (Mock 1: removal company /
 * community centre / charity fun run / urban beekeeping). One continuous
 * recording per section, heard once. 30-minute timer. Part of set
 * ielts-gt-mock-02. Seeded UNPUBLISHED for draft review.
 *
 * Audio lessons from Mock 1 baked in: dialogues use stability 1.0 (Robust)
 * so accents stay consistent across turns, and monologues are generated as
 * ONE TTS call so the prosody flows naturally.
 *
 *   node --env-file=.env.local scripts/seed-ielts-gt-listening-full-02.mjs
 * Re-running REFRESHES the form. Run AFTER add-practice-tests.sql.
 *
 * To redo ONLY the audio for some sections (form, questions and attempts
 * untouched — same storage path, transcript updated in place):
 *   node --env-file=.env.local scripts/seed-ielts-gt-listening-full-02.mjs --audio-only s1,s4
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
const FORM_SLUG = 'ielts-gt-listening-mock-02'
const MODEL = 'eleven_v3'

const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
// Voice genders deliberately swapped vs Mock 1 (male caller, male organiser…)
const VOICE = { narrator: UK_F, agent: UK_F, caller: UK_M, organiser: UK_M, adviser: UK_F, leo: US_M, emma: US_F, speaker: UK_F }
const LABEL = { narrator: 'Narrator', agent: 'Agent', caller: 'Caller', organiser: 'Organiser', adviser: 'Adviser', leo: 'Leo', emma: 'Emma', speaker: 'Speaker' }

const G = 0.4 // default gap between turns

// --audio-only s1,s4  → regenerate just those sections' recordings
const ONLY = (() => {
  const i = process.argv.indexOf('--audio-only')
  return i === -1 ? null : (process.argv[i + 1] || '').split(',').map(s => s.trim()).filter(Boolean)
})()

const SETS = [
  {
    part_label: 'Section 1', title: 'Reporting a lost bag', audio: `listening/${FORM_SLUG}-s1.mp3`,
    stability: 1, // Robust — keeps each voice's accent consistent across turns
    instructions: 'Complete the lost property form. Write ONE WORD AND/OR A NUMBER for each answer.',
    lines: [
      { speaker: 'narrator', text: "Section 1. You will hear a man telephoning a bus company's lost property office. You will hear it once.", gap: 0.9 },
      { speaker: 'agent', text: 'Good morning, Westbridge Buses lost property. How can I help?' },
      { speaker: 'caller', text: "Hello. I left a bag on one of your buses yesterday evening, and I'm hoping it's been handed in." },
      { speaker: 'agent', text: "Let's see what I can do. Could I take your name, please?" },
      { speaker: 'caller', text: "Yes, it's Daniel Reeves. Reeves is R, double E, V, E, S." },
      { speaker: 'agent', text: 'Thank you, Mr Reeves. Which route were you on?' },
      { speaker: 'caller', text: 'The number forty-seven, going towards the hospital.' },
      { speaker: 'agent', text: 'And what time did you travel?' },
      { speaker: 'caller', text: 'Yesterday at about half past six in the evening. I got off at Mill Street.' },
      { speaker: 'agent', text: 'Could you describe the bag for me?' },
      { speaker: 'caller', text: "It's a small grey backpack. Oh — and it has a red zip." },
      { speaker: 'agent', text: 'And what was inside?' },
      { speaker: 'caller', text: 'An umbrella, a pair of glasses, and, more importantly, my laptop.' },
      { speaker: 'agent', text: 'Let me check what came in this morning. One moment, please.', gap: 0.8 },
      { speaker: 'agent', text: 'Good news — a grey backpack from route forty-seven was handed in earlier today.' },
      { speaker: 'caller', text: "That's wonderful. Where do I collect it?" },
      { speaker: 'agent', text: "From our office at the central bus station, on Station Road. We're open nine to five, Monday to Saturday. Do bring some photo ID with you, and there's a handling fee of two pounds." },
      { speaker: 'caller', text: "No problem at all. I'll come in this afternoon. Thank you so much.", gap: 0.3 },
    ],
    questions: [
      { type: 'gap_fill', prompt: 'Surname:', accepted: ['reeves'] },
      { type: 'gap_fill', prompt: 'Bus route number:', accepted: ['47', 'forty-seven', 'forty seven'] },
      { type: 'gap_fill', prompt: 'Time of travel:  ______ in the evening', accepted: ['6.30', '6:30', '630', '6 30', 'half past six', 'half past 6', 'half six', '6.30 pm', '6:30 pm', '6.30pm', '6:30pm'] },
      { type: 'gap_fill', prompt: 'Got off the bus at:  ______ Street', accepted: ['mill'] },
      { type: 'gap_fill', prompt: 'Bag colour:', accepted: ['grey', 'gray'] },
      { type: 'gap_fill', prompt: 'Colour of the zip:', accepted: ['red'] },
      { type: 'gap_fill', prompt: 'Inside: an umbrella, glasses and a ______', accepted: ['laptop', 'laptop computer', 'computer'] },
      { type: 'gap_fill', prompt: 'Collect from the office on ______ Road', accepted: ['station'] },
      { type: 'gap_fill', prompt: 'Must bring:  photo ______', accepted: ['id', 'identification', 'i.d.', 'i.d'] },
      { type: 'gap_fill', prompt: 'Handling fee:  £', accepted: ['2', 'two'] },
    ],
  },
  {
    part_label: 'Section 2', title: 'Riverside Music Festival', audio: `listening/${FORM_SLUG}-s2.mp3`,
    instructions: 'Choose the best answer, then match each stage to its type of music.',
    lines: [
      { speaker: 'narrator', text: 'Section 2. You will hear an announcement about a summer music festival.', gap: 0.9 },
      // One TTS call for the whole announcement so the prosody flows naturally.
      { speaker: 'organiser', gap: 0.3, text:
        'Hello everyone, and welcome to this information session about the Riverside Music Festival, which takes place over the third weekend of July.\n\n' +
        "First, tickets. A day ticket costs thirty-five pounds, and if you want the whole weekend, a weekend ticket is sixty pounds — much better value. Children under twelve come in free, as long as they're with an adult.\n\n" +
        'The gates open at eleven in the morning, but the music itself starts at midday, so there is plenty of time to find a good spot. Please note there is no parking at the festival site this year. Instead, a free shuttle bus runs from the railway station every twenty minutes — just show your festival ticket to the driver.\n\n' +
        'A few rules. You may bring food and soft drinks, but glass bottles are not allowed anywhere on the site. There are free water stations, so do bring a refillable bottle. And if a child becomes separated from you, our staff will take them to the information tent, which is just inside the main gate.\n\n' +
        "Finally, let me tell you what's on where. The Main Stage hosts our headline rock bands. Down by the water, the Riverside Stage is the home of jazz all weekend. In The Meadow you'll find folk and acoustic acts. The Dance Tent — you guessed it — is all electronic music. And the Family Field has performances especially for children throughout both days." },
    ],
    questions: [
      { type: 'single_choice', prompt: 'A weekend ticket costs', options: [['A', '£35', false], ['B', '£60', true], ['C', '£70', false], ['D', '£12', false]] },
      { type: 'single_choice', prompt: 'Children under 12', options: [['A', 'pay half price', false], ['B', 'enter free with an adult', true], ['C', 'are not admitted', false], ['D', 'need their own ticket', false]] },
      { type: 'single_choice', prompt: 'Festival-goers are advised to arrive by', options: [['A', 'car — parking is free', false], ['B', 'shuttle bus from the station', true], ['C', 'bicycle only', false], ['D', 'riverboat', false]] },
      { type: 'single_choice', prompt: 'The music begins at', options: [['A', '11 am', false], ['B', 'midday', true], ['C', '2 pm', false], ['D', '6 pm', false]] },
      { type: 'single_choice', prompt: 'Visitors must NOT bring', options: [['A', 'food', false], ['B', 'soft drinks', false], ['C', 'glass bottles', true], ['D', 'refillable bottles', false]] },
      {
        type: 'matching', prompt: 'Match each stage to its type of music.',
        items: [['main', 'Main Stage'], ['riverside', 'Riverside Stage'], ['meadow', 'The Meadow'], ['dance', 'Dance Tent'], ['family', 'Family Field']],
        // Option ids run i, ii, iii… in DISPLAY order (like the real exam),
        // so the numerals carry no information about the answers.
        options: [['i', 'Folk and acoustic'], ['ii', 'Rock bands'], ['iii', 'Classical orchestra'], ['iv', 'Jazz'], ['v', "Children's performances"], ['vi', 'Electronic music'], ['vii', 'Comedy']],
        answer: { main: 'ii', riverside: 'iv', meadow: 'i', dance: 'vi', family: 'v' },
      },
    ],
  },
  {
    part_label: 'Section 3', title: 'Choosing a part-time job', audio: `listening/${FORM_SLUG}-s3.mp3`,
    stability: 1,
    instructions: 'Answer the questions, match each job to its key feature, and choose TWO answers for the final question.',
    lines: [
      { speaker: 'narrator', text: 'Section 3. You will hear two students, Leo and Emma, talking with a careers adviser about part-time jobs.', gap: 0.9 },
      { speaker: 'adviser', text: "Come in, both of you. So, you're each looking for part-time work this term. Let's look at what's available. There are four jobs on our board this week: a café assistant, a supermarket shelf-stacker, a hotel receptionist, and a private tutoring position." },
      { speaker: 'leo', text: "I'm mainly interested in something that looks good on my CV. I want experience dealing with customers, ideally." },
      { speaker: 'emma', text: 'For me the hours matter most. I have lectures every weekday, so I can really only work at weekends.' },
      { speaker: 'adviser', text: 'Good to know. The café job comes with free meals during your shift, which students always appreciate. The supermarket role is night shifts, but because of that it has the highest hourly rate of the four.' },
      { speaker: 'leo', text: 'And the hotel position?' },
      { speaker: 'adviser', text: 'The hotel receptionist role requires a smart uniform, which the hotel provides. The tutoring job pays well, but the hours change from week to week, so it suits someone flexible.' },
      { speaker: 'emma', text: 'The café could work for me — do they need weekend staff?' },
      { speaker: 'adviser', text: "They do, Saturdays and Sundays. Now, one thing before either of you applies: your CVs. When did you last update them?" },
      { speaker: 'leo', text: 'Honestly? Over a year ago.' },
      { speaker: 'adviser', text: "Then update your CV first — that's the single most useful thing you can do this week. And the hotel job closes at the end of the month, so don't leave it too long." },
      { speaker: 'emma', text: 'What do employers actually look for in student applicants? Grades?' },
      { speaker: 'adviser', text: "Less than you'd think. In our surveys, employers mention two things again and again: reliability — turning up on time, every time — and good communication. Experience helps, of course, but those two come first.", gap: 0.3 },
    ],
    questions: [
      { type: 'single_choice', prompt: 'What matters most to Leo in a job?', options: [['A', 'Experience for his CV', true], ['B', 'The highest pay', false], ['C', 'Free meals', false], ['D', 'Working with friends', false]] },
      { type: 'single_choice', prompt: 'Emma can only work', options: [['A', 'on weekday evenings', false], ['B', 'at weekends', true], ['C', 'during lectures', false], ['D', 'at night', false]] },
      { type: 'single_choice', prompt: 'What does the adviser tell Leo to do first?', options: [['A', 'Update his CV', true], ['B', 'Buy a uniform', false], ['C', 'Visit the hotel', false], ['D', 'Take a typing test', false]] },
      { type: 'single_choice', prompt: 'Applications for the hotel job close', options: [['A', 'this week', false], ['B', 'at the end of the month', true], ['C', 'at the end of term', false], ['D', 'next year', false]] },
      {
        type: 'matching', prompt: 'Match each job to its key feature.',
        items: [['cafe', 'Café assistant'], ['supermarket', 'Supermarket shelf-stacker'], ['hotel', 'Hotel receptionist'], ['tutoring', 'Private tutoring']],
        options: [['i', 'Highest hourly pay'], ['ii', 'Hours vary each week'], ['iii', 'Free meals on shift'], ['iv', 'Uniform provided'], ['v', 'Company car included']],
        answer: { cafe: 'iii', supermarket: 'i', hotel: 'iv', tutoring: 'ii' },
      },
      { type: 'multiple_choice', prompt: 'Which TWO qualities do employers value most in student applicants? Choose TWO.', options: [['A', 'Reliability', true], ['B', 'Good communication', true], ['C', 'High grades', false], ['D', 'Previous experience', false], ['E', 'Fashion sense', false]] },
    ],
  },
  {
    part_label: 'Section 4', title: 'A talk on training guide dogs', audio: `listening/${FORM_SLUG}-s4.mp3`,
    instructions: 'Complete the notes. Write ONE WORD AND/OR A NUMBER for each answer.',
    lines: [
      { speaker: 'narrator', text: 'Section 4. You will hear a talk about how guide dogs are trained.', gap: 0.9 },
      // One TTS call for the whole talk — natural lecture prosody.
      { speaker: 'speaker', gap: 0.3, text:
        'Today I want to take you through the remarkable journey of a guide dog, from playful puppy to trusted working partner.\n\n' +
        'It begins early. At about eight weeks old, each puppy moves in with a volunteer family. The puppy stays with that family for roughly a year, and the job of the volunteers is simply to give it ordinary life: they teach basic commands, take the puppy on buses, and walk it through busy shops, so that crowds and noise become completely normal.\n\n' +
        'After that comes formal training at a special school, which lasts about twenty weeks. Here the real skills are built. The dogs learn to stop at every kerb and wait for an instruction. They learn to judge spaces, guiding their owner around obstacles. And crucially, they learn to ignore distractions — other dogs, food on the pavement, and of course cats.\n\n' +
        "Perhaps the most impressive skill is what trainers call intelligent disobedience. A fully trained guide dog will refuse a command if obeying it would put its owner in danger — for example, it will not step into the road while a car is approaching, no matter what it's told.\n\n" +
        "Matching dog to owner is a careful process too. Trainers consider the person's daily routine and, above all, their walking speed — a fast walker needs an energetic dog.\n\n" +
        'A guide dog usually works for about eight years before it retires, and most retired dogs simply stay on with their owners as much-loved pets. Training a single dog from puppy to partner costs tens of thousands of pounds, and the work is funded almost entirely by donations.' },
    ],
    questions: [
      { type: 'gap_fill', prompt: 'Puppies join a volunteer family at about ______ weeks old.', accepted: ['8', 'eight'] },
      { type: 'gap_fill', prompt: 'They stay with the family for about a ______.', accepted: ['year'] },
      { type: 'gap_fill', prompt: 'Families take the puppies on buses and into busy ______.', accepted: ['shops'] },
      { type: 'gap_fill', prompt: 'Formal training lasts about ______ weeks.', accepted: ['20', 'twenty'] },
      { type: 'gap_fill', prompt: 'The dogs learn to stop at every ______.', accepted: ['kerb', 'curb'] },
      { type: 'gap_fill', prompt: 'They must ignore distractions such as other dogs, food and ______.', accepted: ['cats'] },
      { type: 'gap_fill', prompt: 'A dog will refuse a command that would put its owner in ______.', accepted: ['danger'] },
      { type: 'gap_fill', prompt: "Trainers match dogs to an owner's routine and walking ______.", accepted: ['speed'] },
      { type: 'gap_fill', prompt: 'Guide dogs usually work for about ______ years.', accepted: ['8', 'eight'] },
      { type: 'gap_fill', prompt: 'The training is funded almost entirely by ______.', accepted: ['donations'] },
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
  const dir = mkdtempSync(join(tmpdir(), 'ielts-gtl2-'))
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

// Optional resumable segment cache: TTS_CACHE_DIR=… caches each generated
// line so an interrupted run picks up where it left off.
const CACHE_DIR = process.env.TTS_CACHE_DIR
async function ttsCached(text, voiceId, stability) {
  if (!CACHE_DIR) return tts(text, voiceId, stability)
  const key = createHash('sha1').update(`${voiceId}|${stability}|${MODEL}|${text}`).digest('hex')
  const p = join(CACHE_DIR, `${key}.mp3`)
  if (existsSync(p)) return readFileSync(p)
  const buf = await tts(text, voiceId, stability)
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(p, buf)
  return buf
}

async function buildAudio(set) {
  const segs = []
  for (const line of set.lines) {
    segs.push({ buffer: await ttsCached(line.text, VOICE[line.speaker], line.stability ?? set.stability ?? 0.5), gapAfter: line.gap ?? G })
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
  const { data: track, error } = await supabase.from('exam_tracks').select('id').eq('slug', 'ielts-general').single()
  if (error || !track) throw new Error('Track ielts-general not found.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'IELTS General Training — Listening Mock Test 2', title_ja: 'IELTS ジェネラル リスニング模試2',
    mode: 'full_mock', time_limit_seconds: 1800, published: false, // draft until reviewed
    set_slug: 'ielts-gt-mock-02', set_title: 'IELTS General Training — Mock Test 2', set_title_ja: 'IELTS ジェネラル模試2', set_order: 0,
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
  console.log(`\n✓ Seeded ${FORM_SLUG} (full_mock, ${marks} marks across 4 sections, UNPUBLISHED).`)
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
