/**
 * Full-length IELTS General Training Listening MOCK 3 (4 sections, 40 marks).
 *
 * A third GT paper with entirely fresh content (Mock 1: removal company /
 * community centre / charity fun run / urban beekeeping; Mock 2: lost bag /
 * music festival / part-time jobs / guide dogs). One continuous recording per
 * section, heard once. 30-minute timer. Part of set ielts-gt-mock-03.
 * Seeded UNPUBLISHED for draft review.
 *
 * Dialogues use stability 1.0 (Robust) so accents stay consistent across
 * turns; monologues are generated as ONE TTS call for natural prosody.
 *
 *   node --env-file=.env.local scripts/seed-ielts-gt-listening-full-03.mjs
 * Re-running REFRESHES the form. Run AFTER add-practice-tests.sql.
 *
 * To redo ONLY the audio for some sections (form, questions and attempts
 * untouched — same storage path, transcript updated in place):
 *   node --env-file=.env.local scripts/seed-ielts-gt-listening-full-03.mjs --audio-only s1,s4
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
const FORM_SLUG = 'ielts-gt-listening-mock-03'
const MODEL = 'eleven_v3'

const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
// Voice assignments rotated again vs Mocks 1 & 2
const VOICE = { narrator: UK_F, agent: UK_M, caller: UK_F, manager: UK_F, officer: UK_M, aisha: US_F, ben: US_M, speaker: UK_M }
const LABEL = { narrator: 'Narrator', agent: 'Agent', caller: 'Caller', manager: 'Manager', officer: 'Officer', aisha: 'Aisha', ben: 'Ben', speaker: 'Speaker' }

const G = 0.4 // default gap between turns

// --audio-only s1,s4  → regenerate just those sections' recordings
const ONLY = (() => {
  const i = process.argv.indexOf('--audio-only')
  return i === -1 ? null : (process.argv[i + 1] || '').split(',').map(s => s.trim()).filter(Boolean)
})()

const SETS = [
  {
    part_label: 'Section 1', title: 'Enquiry about renting a flat', audio: `listening/${FORM_SLUG}-s1.mp3`,
    stability: 1, // Robust — keeps each voice's accent consistent across turns
    instructions: 'Complete the notes. Write ONE WORD AND/OR A NUMBER for each answer.',
    lines: [
      { speaker: 'narrator', text: 'Section 1. You will hear a woman telephoning a letting agency about a flat she saw advertised. You will hear it once.', gap: 0.9 },
      { speaker: 'agent', text: 'Good afternoon, Compton Lettings, James speaking. How can I help?' },
      { speaker: 'caller', text: "Hello. I'm calling about the one-bedroom flat advertised on your website — the one on Bridge Lane." },
      { speaker: 'agent', text: "Ah yes, number twelve, Bridge Lane. It's still available. Could I take your name?" },
      { speaker: 'caller', text: "Of course. It's Sofia Marsh — that's M-A-R-S-H." },
      { speaker: 'agent', text: 'Thank you. Let me give you the details. The rent is six hundred and ninety pounds a month, and that includes water — but not electricity or gas.' },
      { speaker: 'caller', text: 'I see. And is there a deposit?' },
      { speaker: 'agent', text: "Yes — the deposit is the same as one month's rent, so six hundred and ninety pounds, held in a protection scheme." },
      { speaker: 'caller', text: 'When is the flat available from?' },
      { speaker: 'agent', text: 'From the first of June. The current tenant moves out at the end of May.' },
      { speaker: 'caller', text: 'How far is it from public transport?' },
      { speaker: 'agent', text: "Very close indeed. Riverside station is about five minutes' walk, and there's a bus stop directly outside the building." },
      { speaker: 'caller', text: 'Is there anywhere to park?' },
      { speaker: 'agent', text: "There's no private parking, I'm afraid, but residents can apply to the council for an on-street permit. That costs eighty pounds a year." },
      { speaker: 'caller', text: 'That sounds fine. Could I arrange a viewing?' },
      { speaker: 'agent', text: 'Certainly. We have a slot this Thursday at a quarter past five, if that suits you — just after work?' },
      { speaker: 'caller', text: 'Thursday at five fifteen is perfect.' },
      { speaker: 'agent', text: "Lovely. Please bring some photo ID, and I'll meet you outside the flat. And if anything changes, just ask for me — James Doyle. That's D-O-Y-L-E.", gap: 0.3 },
    ],
    questions: [
      { type: 'gap_fill', prompt: 'Flat address:  12 ______ Lane', accepted: ['bridge'] },
      { type: 'gap_fill', prompt: "Caller's surname:", accepted: ['marsh'] },
      { type: 'gap_fill', prompt: 'Monthly rent:  £', accepted: ['690', 'six hundred and ninety'] },
      { type: 'gap_fill', prompt: 'Rent includes ______ (but not electricity or gas)', accepted: ['water'] },
      { type: 'gap_fill', prompt: 'Deposit:  £', accepted: ['690', 'six hundred and ninety'] },
      { type: 'gap_fill', prompt: 'Available from:  1 ______', accepted: ['june'] },
      { type: 'gap_fill', prompt: "______ station is five minutes' walk away", accepted: ['riverside'] },
      { type: 'gap_fill', prompt: 'On-street parking permit:  £ ______ a year', accepted: ['80', 'eighty'] },
      { type: 'gap_fill', prompt: 'Viewing:  Thursday at ______', accepted: ['5.15', '5:15', '515', '5 15', 'quarter past five', 'a quarter past five', 'quarter past 5', '5.15 pm', '5:15 pm', '5.15pm', '5:15pm'] },
      { type: 'gap_fill', prompt: "Agent's surname:", accepted: ['doyle'] },
    ],
  },
  {
    part_label: 'Section 2', title: 'Volunteering at an animal shelter', audio: `listening/${FORM_SLUG}-s2.mp3`,
    instructions: 'Choose the best answer, then match each area of the shelter to its volunteer task.',
    lines: [
      { speaker: 'narrator', text: 'Section 2. You will hear the manager of an animal shelter welcoming a group of new volunteers.', gap: 0.9 },
      // One TTS call for the whole talk so the prosody flows naturally.
      { speaker: 'manager', gap: 0.3, text:
        "Good morning, everyone, and welcome to Oakfield Animal Shelter. I'm delighted so many of you want to volunteer with us. Let me run through the practical things first.\n\n" +
        'Volunteers need to be at least sixteen years old. We ask everyone to commit to a minimum of one shift per week — shifts run from eight until twelve in the morning, or twelve until four in the afternoon. We provide a free training session on the first Saturday of every month, and we do ask that you attend one before working with the animals.\n\n' +
        "A few rules. Please wear closed shoes at all times — sandals are not safe around the animals. We can't provide lunch, but tea and coffee are always free in the volunteer room. And whenever you arrive, the very first thing you must do is sign in at reception. That's a fire-safety requirement, so please never skip it.\n\n" +
        "Now, where you'll be working. At reception, volunteers greet visitors and answer the phones. In the kennels, the main job is walking the dogs — we aim for two walks a day for every dog. In the cattery, volunteers groom the cats, which keeps them calm and ready for rehoming. Out on the exercise field, you'll supervise the dogs' play sessions. And in the clinic, volunteers wash the towels and bedding — all medical tasks are done by our staff, never by volunteers." },
    ],
    questions: [
      { type: 'single_choice', prompt: 'Volunteers must be at least', options: [['A', '14 years old', false], ['B', '16 years old', true], ['C', '18 years old', false], ['D', '21 years old', false]] },
      { type: 'single_choice', prompt: 'Volunteers are asked to work at least', options: [['A', 'one shift a week', true], ['B', 'two shifts a week', false], ['C', 'one shift a month', false], ['D', 'every weekend', false]] },
      { type: 'single_choice', prompt: 'Free training takes place', options: [['A', 'every Saturday', false], ['B', 'on the first Saturday of each month', true], ['C', 'once a year', false], ['D', 'every weekday morning', false]] },
      { type: 'single_choice', prompt: 'Volunteers must always wear', options: [['A', 'a uniform', false], ['B', 'gloves', false], ['C', 'closed shoes', true], ['D', 'a name badge', false]] },
      { type: 'single_choice', prompt: 'On arrival, volunteers must first', options: [['A', 'sign in at reception', true], ['B', 'feed the animals', false], ['C', 'attend a meeting', false], ['D', 'put on overalls', false]] },
      {
        type: 'matching', prompt: 'Match each area of the shelter to its volunteer task.',
        items: [['reception', 'Reception'], ['kennels', 'Kennels'], ['cattery', 'Cattery'], ['field', 'Exercise field'], ['clinic', 'Clinic']],
        // Option ids run i, ii, iii… in DISPLAY order (like the real exam),
        // so the numerals carry no information about the answers.
        options: [['i', 'Walking the dogs'], ['ii', 'Washing towels and bedding'], ['iii', 'Greeting visitors and answering phones'], ['iv', 'Supervising play sessions'], ['v', 'Grooming the cats'], ['vi', 'Giving medicine to the animals'], ['vii', 'Selling tickets']],
        answer: { reception: 'iii', kennels: 'i', cattery: 'v', field: 'iv', clinic: 'ii' },
      },
    ],
  },
  {
    part_label: 'Section 3', title: 'Planning a community garden', audio: `listening/${FORM_SLUG}-s3.mp3`,
    stability: 1,
    instructions: 'Answer the questions, match each person to their task, and choose TWO answers for the final question.',
    lines: [
      { speaker: 'narrator', text: 'Section 3. You will hear two residents, Aisha and Ben, talking with a council officer about a new community garden. They also mention the school caretaker, Mr Cole.', gap: 0.9 },
      { speaker: 'officer', text: "Thanks for coming in, both of you. So — the community garden. We've looked at the two possible sites: the corner of Victory Park, and the old school field." },
      { speaker: 'aisha', text: 'And which one came out on top?' },
      { speaker: 'officer', text: "The school field, quite clearly. The corner of the park gets too much shade from the big elm trees — vegetables simply wouldn't grow well there. And the field already has a water tap, which saves us a lot of money." },
      { speaker: 'ben', text: "Great. How many plots will there be?" },
      { speaker: 'officer', text: "Twenty to start with. We expect more applications than plots, so they'll be allocated by lottery — names drawn at random. It's the fairest way." },
      { speaker: 'aisha', text: 'And does the council provide anything?' },
      { speaker: 'officer', text: 'Yes — for the first year, the council will deliver free compost every spring. After that, the garden group buys its own.' },
      { speaker: 'ben', text: "I can take care of the raised beds — I'm a carpenter, so I'll build them myself if the wood is paid for." },
      { speaker: 'officer', text: "Wonderful. And we'll need a sign-up list." },
      { speaker: 'aisha', text: "Leave that to me. I'll set up the online sign-up page this week and share it around the neighbourhood." },
      { speaker: 'officer', text: "Perfect. I'll apply for the funding for the fence and the tool shed. And Mr Cole, the school caretaker, has agreed to open the gates at weekends." },
      { speaker: 'aisha', text: 'Can I ask — when you surveyed the residents, what did people say they wanted from the garden?' },
      { speaker: 'officer', text: 'Two answers came up far more than any others: people want to meet their neighbours, and they want to grow their own fresh vegetables. A few mentioned saving money or entering competitions, but those were rare.', gap: 0.3 },
    ],
    questions: [
      { type: 'single_choice', prompt: 'Where will the garden be?', options: [['A', 'The corner of Victory Park', false], ['B', 'The old school field', true], ['C', 'Behind the town hall', false], ['D', 'Next to the library', false]] },
      { type: 'single_choice', prompt: 'Why was the park corner rejected?', options: [['A', 'It gets too much shade', true], ['B', 'It floods in winter', false], ['C', 'It is too far from houses', false], ['D', 'It has no soil', false]] },
      { type: 'single_choice', prompt: 'In the first year, the council will provide free', options: [['A', 'seeds', false], ['B', 'tools', false], ['C', 'compost', true], ['D', 'fencing', false]] },
      { type: 'single_choice', prompt: 'Plots will be allocated', options: [['A', 'first come, first served', false], ['B', 'by lottery', true], ['C', 'by interview', false], ['D', 'to families only', false]] },
      {
        type: 'matching', prompt: 'Match each person to the task they will do.',
        items: [['ben', 'Ben'], ['aisha', 'Aisha'], ['officer', 'The council officer'], ['cole', 'Mr Cole']],
        options: [['i', 'Applying for funding'], ['ii', 'Building the raised beds'], ['iii', 'Watering the plots'], ['iv', 'Opening the gates at weekends'], ['v', 'Creating the sign-up page']],
        answer: { ben: 'ii', aisha: 'v', officer: 'i', cole: 'iv' },
      },
      { type: 'multiple_choice', prompt: 'Which TWO things do residents most hope to get from the garden? Choose TWO.', options: [['A', 'Meeting their neighbours', true], ['B', 'Fresh vegetables', true], ['C', 'Saving money', false], ['D', 'Winning competitions', false], ['E', 'Exercise', false]] },
    ],
  },
  {
    part_label: 'Section 4', title: 'A talk on lighthouses', audio: `listening/${FORM_SLUG}-s4.mp3`,
    instructions: 'Complete the notes. Write ONE WORD AND/OR A NUMBER for each answer.',
    lines: [
      { speaker: 'narrator', text: 'Section 4. You will hear a talk about lighthouses.', gap: 0.9 },
      // One TTS call for the whole talk — natural lecture prosody.
      { speaker: 'speaker', gap: 0.3, text:
        'Tonight I want to talk about one of the most romantic buildings ever made: the lighthouse.\n\n' +
        'The idea is ancient and very simple — a tall tower with a bright light, warning ships away from dangerous rocks. What is remarkable is the engineering. A large lighthouse lamp, focused through its huge glass lens, can be seen from about forty kilometres away. In the finest towers, that great lens floats on a bath of mercury, so that a mechanism can turn several tonnes of glass with almost no effort.\n\n' +
        'For most of their history, lighthouses were machines that needed constant human care. The turning mechanism worked like a giant clock, driven by falling weights, and the keepers had to wind it back up every few hours, all through the night. In thick fog, when the light was useless, keepers sounded a powerful horn instead, with each station using its own rhythm of blasts.\n\n' +
        'That way of life has now vanished. Automation arrived through the twentieth century, and in Britain the very last keepers left their tower in 1998. Today, every light is monitored from a single control centre, and engineers visit only for maintenance. Increasingly, the lamps themselves are powered by solar energy, stored in batteries through the winter months.\n\n' +
        'One last detail that people rarely notice. At night, sailors recognise each lighthouse by its individual rhythm of flashes. But in daylight, when the lamp is invisible, identification works differently: each tower is painted with its own bold pattern of stripes, so that no two neighbouring lighthouses ever look the same.' },
    ],
    questions: [
      { type: 'gap_fill', prompt: 'Lighthouses warn ships away from dangerous ______.', accepted: ['rocks'] },
      { type: 'gap_fill', prompt: 'The light can be seen from about ______ kilometres away.', accepted: ['40', 'forty'] },
      { type: 'gap_fill', prompt: 'In the finest towers, the lens floats on a bath of ______.', accepted: ['mercury'] },
      { type: 'gap_fill', prompt: 'The turning mechanism was driven by falling ______.', accepted: ['weights'] },
      { type: 'gap_fill', prompt: 'Keepers had to wind the mechanism every few ______.', accepted: ['hours'] },
      { type: 'gap_fill', prompt: 'In fog, each station sounded a powerful ______.', accepted: ['horn', 'foghorn', 'fog horn'] },
      { type: 'gap_fill', prompt: "Britain's last lighthouse keepers left in ______.", accepted: ['1998'] },
      { type: 'gap_fill', prompt: 'All lights are now monitored from one control ______.', accepted: ['centre', 'center'] },
      { type: 'gap_fill', prompt: 'Many lamps are now powered by ______ energy.', accepted: ['solar'] },
      { type: 'gap_fill', prompt: 'In daylight, each tower is recognised by its painted ______.', accepted: ['stripes', 'pattern', 'patterns'] },
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
  const dir = mkdtempSync(join(tmpdir(), 'ielts-gtl3-'))
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
    title: 'IELTS General Training — Listening Mock Test 3', title_ja: 'IELTS ジェネラル リスニング模試3',
    mode: 'full_mock', time_limit_seconds: 1800, published: false, // draft until reviewed
    set_slug: 'ielts-gt-mock-03', set_title: 'IELTS General Training — Mock Test 3', set_title_ja: 'IELTS ジェネラル模試3', set_order: 0,
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
