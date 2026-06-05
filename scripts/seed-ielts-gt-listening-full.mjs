/**
 * Full-length IELTS General Training Listening mock (4 sections, 40 marks).
 *
 * The Listening test format is identical across IELTS variants; this is a
 * fresh paper with GT-flavoured everyday/social contexts so General Training
 * takers don't re-see the Academic mock. One continuous recording per section,
 * heard once. Question types: gap_fill, single_choice, multiple_choice
 * (choose TWO), matching. 30-minute timer. Part of set ielts-gt-mock-01.
 *
 *   node --env-file=.env.local scripts/seed-ielts-gt-listening-full.mjs
 * Re-running REFRESHES the form. Run AFTER supabase/add-test-sets.sql.
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
const FORM_SLUG = 'ielts-gt-listening-mock-01'
const MODEL = 'eleven_v3'

const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const VOICE = { narrator: UK_F, agent: UK_M, caller: UK_F, manager: UK_F, dan: US_M, priya: US_F, karen: UK_F, speaker: UK_M }
const LABEL = { narrator: 'Narrator', agent: 'Agent', caller: 'Caller', manager: 'Manager', dan: 'Dan', priya: 'Priya', karen: 'Karen', speaker: 'Speaker' }

const G = 0.4 // default gap between turns

const SETS = [
  {
    part_label: 'Section 1', title: 'Booking a removal company', audio: `listening/${FORM_SLUG}-s1.mp3`,
    instructions: 'Complete the booking form. Write ONE WORD AND/OR A NUMBER for each answer.',
    lines: [
      { speaker: 'narrator', text: 'Section 1. You will hear a telephone conversation between a woman and a man who works for a removal company. You will hear it once.', gap: 0.9 },
      { speaker: 'agent', text: 'Good afternoon, Swift Move Removals. How can I help?' },
      { speaker: 'caller', text: "Hello. I'd like to book a removal van for next month, please." },
      { speaker: 'agent', text: 'Of course. Could I take your surname?' },
      { speaker: 'caller', text: "It's Patel. P-A-T-E-L." },
      { speaker: 'agent', text: 'Thank you, Ms Patel. And where are you moving from?' },
      { speaker: 'caller', text: 'From forty-two Cedar Road, here in Milton.' },
      { speaker: 'agent', text: 'And the new address?' },
      { speaker: 'caller', text: 'Seventeen Station Lane. It is only about ten minutes away.' },
      { speaker: 'agent', text: 'Lovely. Which date were you thinking of?' },
      { speaker: 'caller', text: 'Saturday the fourteenth of March, if you have it free.' },
      { speaker: 'agent', text: "Let me check. Yes, the fourteenth is available. What are the main items?" },
      { speaker: 'caller', text: 'A sofa, two beds, a fridge — and a piano, I should warn you.' },
      { speaker: 'agent', text: "That's fine. There is an extra charge of forty pounds for a piano because it needs two extra people." },
      { speaker: 'caller', text: 'Understood. So how much will it all cost?' },
      { speaker: 'agent', text: 'Including the piano, the total comes to one hundred and eighty pounds. We ask for a deposit of thirty pounds when you book, and insurance is included in the price.' },
      { speaker: 'caller', text: 'Great. What time would the van arrive?' },
      { speaker: 'agent', text: "The team will be with you at half past eight in the morning. One more thing — we can lend you packing boxes for free, as long as they're returned afterwards.", gap: 0.3 },
    ],
    questions: [
      { type: 'gap_fill', prompt: 'Surname:', accepted: ['patel'] },
      { type: 'gap_fill', prompt: 'Moving from:  ______ Cedar Road', accepted: ['42', 'forty-two', 'forty two'] },
      { type: 'gap_fill', prompt: 'Moving to:  17 ______ Lane', accepted: ['station'] },
      { type: 'gap_fill', prompt: 'Moving date:  Saturday ______ March', accepted: ['14', '14th', 'fourteenth', 'the fourteenth'] },
      { type: 'gap_fill', prompt: 'Item needing two extra people:', accepted: ['piano', 'a piano'] },
      { type: 'gap_fill', prompt: 'Extra charge for this item:  £', accepted: ['40', 'forty'] },
      { type: 'gap_fill', prompt: 'Total cost:  £', accepted: ['180', 'one hundred and eighty'] },
      { type: 'gap_fill', prompt: 'Deposit:  £', accepted: ['30', 'thirty'] },
      { type: 'gap_fill', prompt: 'Arrival time:  ______ in the morning', accepted: ['8.30', '8:30', '830', '8 30', '8.30 am', '8:30 am', '8.30am', '8:30am', 'half past eight', 'half past 8', 'half eight', 'half 8'] },
      { type: 'gap_fill', prompt: 'Free to borrow (if returned):  packing ______', accepted: ['boxes'] },
    ],
  },
  {
    part_label: 'Section 2', title: 'Community centre autumn programme', audio: `listening/${FORM_SLUG}-s2.mp3`,
    instructions: 'Choose the best answer, then match each room to its activity.',
    lines: [
      { speaker: 'narrator', text: 'Section 2. You will hear the manager of a community centre describing the autumn programme.', gap: 0.9 },
      { speaker: 'manager', text: "Welcome, everyone, to Westfield Community Centre. A few announcements about this autumn. First, our opening hours: we now stay open until ten p.m. on Fridays — that's two hours later than before." },
      { speaker: 'manager', text: 'Annual membership stays at twenty-five pounds for local residents. Please note that during October the car park is closed for resurfacing, so you will need to enter through the side entrance on Mill Street.' },
      { speaker: 'manager', text: "One change to the timetable: the cookery class has moved from Monday to Thursday evenings, because the kitchen is being used by the college on Mondays. And our children's choir is looking for new singers — no experience needed." },
      { speaker: 'manager', text: 'Finally, where to find everything. Badminton is in the Main Hall. Yoga takes place in the Garden Room. The Studio is used for the painting group. The Library Corner hosts the homework club, and of course the cookery class meets in the Kitchen.', gap: 0.3 },
    ],
    questions: [
      { type: 'single_choice', prompt: 'On Fridays the centre now closes at', options: [['A', '8 p.m.', false], ['B', '9 p.m.', false], ['C', '10 p.m.', true], ['D', 'midnight', false]] },
      { type: 'single_choice', prompt: 'Annual membership for local residents costs', options: [['A', '£15', false], ['B', '£25', true], ['C', '£35', false], ['D', '£50', false]] },
      { type: 'single_choice', prompt: 'During October, visitors should', options: [['A', 'use the side entrance', true], ['B', 'park on Mill Street', false], ['C', 'come only at weekends', false], ['D', 'use the rear car park', false]] },
      { type: 'single_choice', prompt: 'The cookery class now takes place on', options: [['A', 'Mondays', false], ['B', 'Tuesdays', false], ['C', 'Thursdays', true], ['D', 'Saturdays', false]] },
      { type: 'single_choice', prompt: "The children's choir needs", options: [['A', 'a new teacher', false], ['B', 'more singers', true], ['C', 'a bigger room', false], ['D', 'new instruments', false]] },
      {
        type: 'matching', prompt: 'Match each room to its activity.',
        items: [['hall', 'Main Hall'], ['garden', 'Garden Room'], ['studio', 'Studio'], ['library', 'Library Corner'], ['kitchen', 'Kitchen']],
        options: [['iv', 'Homework club'], ['i', 'Badminton'], ['vi', 'Choir practice'], ['ii', 'Yoga'], ['v', 'Cookery class'], ['iii', 'Painting group'], ['vii', 'Table tennis']],
        answer: { hall: 'i', garden: 'ii', studio: 'iii', library: 'iv', kitchen: 'v' },
      },
    ],
  },
  {
    part_label: 'Section 3', title: 'Planning a charity fun run', audio: `listening/${FORM_SLUG}-s3.mp3`,
    instructions: 'Answer the questions, match each person to their task, and choose TWO answers for the final question.',
    lines: [
      { speaker: 'narrator', text: 'Section 3. You will hear two volunteers, Dan and Priya, talking with the event manager, Karen, about a charity fun run. They also mention another volunteer called Leo.', gap: 0.9 },
      { speaker: 'karen', text: "Right, Dan, Priya — let's finalise the fun run. First, the date. We talked about May, but I think we should move it to June." },
      { speaker: 'dan', text: 'I agree. A lot of the student runners have exams in May, so June will get us more entries.' },
      { speaker: 'priya', text: 'June works for me too. And the route — are we still using the riverside path?' },
      { speaker: 'karen', text: "Actually, no. The riverside floods too easily after rain, so we've decided to hold it in the park instead." },
      { speaker: 'dan', text: 'Sensible. What about the entry fee?' },
      { speaker: 'karen', text: 'Five pounds per runner, and that includes a t-shirt. Now, jobs. Dan, you said you would design the posters?' },
      { speaker: 'dan', text: "Yes, I'll design the posters this week." },
      { speaker: 'priya', text: "And I'll update the website with the route map and the online entry form." },
      { speaker: 'karen', text: "Perfect. I will contact the sponsors myself, and Leo has agreed to organise the first-aid cover on the day." },
      { speaker: 'priya', text: 'What do runners get for free on the day?' },
      { speaker: 'karen', text: "Every runner gets free water and free fruit at the finish line. Medals, I'm afraid, have to be bought separately this year, and parking near the park is paid.", gap: 0.3 },
    ],
    questions: [
      { type: 'single_choice', prompt: 'When will the fun run be held?', options: [['A', 'May', false], ['B', 'June', true], ['C', 'July', false], ['D', 'September', false]] },
      { type: 'single_choice', prompt: 'Why was the date changed?', options: [['A', 'Many runners have exams in May', true], ['B', 'The park is closed in May', false], ['C', 'The weather is better in May', false], ['D', 'The sponsors asked for it', false]] },
      { type: 'single_choice', prompt: 'Where will the run take place?', options: [['A', 'Along the riverside', false], ['B', 'In the park', true], ['C', 'Around the stadium', false], ['D', 'Through the town centre', false]] },
      { type: 'single_choice', prompt: 'The £5 entry fee includes', options: [['A', 'a t-shirt', true], ['B', 'a medal', false], ['C', 'parking', false], ['D', 'a photograph', false]] },
      {
        type: 'matching', prompt: 'Match each person to the task they will do.',
        items: [['dan', 'Dan'], ['priya', 'Priya'], ['karen', 'Karen'], ['leo', 'Leo']],
        options: [['iii', 'Contacting the sponsors'], ['i', 'Designing the posters'], ['v', 'Marking the route'], ['iv', 'Organising first aid'], ['ii', 'Updating the website']],
        answer: { dan: 'i', priya: 'ii', karen: 'iii', leo: 'iv' },
      },
      { type: 'multiple_choice', prompt: 'Which TWO things do runners get for free? Choose TWO.', options: [['A', 'Water', true], ['B', 'Fruit', true], ['C', 'A medal', false], ['D', 'Parking', false], ['E', 'A photograph', false]] },
    ],
  },
  {
    part_label: 'Section 4', title: 'A talk on urban beekeeping', audio: `listening/${FORM_SLUG}-s4.mp3`,
    instructions: 'Complete the notes. Write ONE WORD AND/OR A NUMBER for each answer.',
    lines: [
      { speaker: 'narrator', text: 'Section 4. You will hear a talk about keeping bees in cities.', gap: 0.9 },
      { speaker: 'speaker', text: 'Urban beekeeping has grown enormously in the last decade. Most city hives are kept on rooftops, where the bees are out of the way of people and the hives catch plenty of sun.' },
      { speaker: 'speaker', text: 'A single bee will fly up to five kilometres from its hive in search of flowers. Surprisingly, city honey often tastes more interesting than country honey, because city gardens and parks contain a far greater variety of flowers than farmland.' },
      { speaker: 'speaker', text: 'There are challenges, of course. In early summer, usually in May, colonies may swarm — that is, half the bees leave with the old queen to find a new home. Beekeepers prevent this by giving the colony more space.' },
      { speaker: 'speaker', text: 'A healthy hive is heavy: by late summer it can weigh around twenty-five kilograms, most of which is honey. A typical city hive produces about twelve jars of honey a year for its keeper.' },
      { speaker: 'speaker', text: 'If you would like to try it, our beginners course runs for six weeks, starting in October. All equipment, including the protective suit and gloves, is provided. Places are limited, so please register by the thirtieth of September.', gap: 0.3 },
    ],
    questions: [
      { type: 'gap_fill', prompt: 'Most city hives are kept on ______.', accepted: ['rooftops', 'roofs', 'the rooftops'] },
      { type: 'gap_fill', prompt: 'A bee will fly up to ______ kilometres from its hive.', accepted: ['5', 'five'] },
      { type: 'gap_fill', prompt: 'City honey tastes interesting because city flowers have more ______.', accepted: ['variety'] },
      { type: 'gap_fill', prompt: 'Colonies may swarm in early summer, usually in ______.', accepted: ['may'] },
      { type: 'gap_fill', prompt: 'When swarming, half the bees leave with the old ______.', accepted: ['queen'] },
      { type: 'gap_fill', prompt: 'Swarming is prevented by giving the colony more ______.', accepted: ['space'] },
      { type: 'gap_fill', prompt: 'By late summer a hive can weigh about ______ kilograms.', accepted: ['25', 'twenty-five', 'twenty five'] },
      { type: 'gap_fill', prompt: 'A city hive produces about ______ jars of honey a year.', accepted: ['12', 'twelve'] },
      { type: 'gap_fill', prompt: 'The beginners course lasts ______ weeks.', accepted: ['6', 'six'] },
      { type: 'gap_fill', prompt: 'Register by 30 ______.', accepted: ['september'] },
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
    method: 'POST', headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

function ffmpegPath() { const b = join(process.cwd(), 'bin', 'ffmpeg'); return existsSync(b) ? b : 'ffmpeg' }
let ffmpegWarned = false
function joinSegments(segments) {
  if (segments.length === 1) return segments[0].buffer
  const dir = mkdtempSync(join(tmpdir(), 'ielts-gtl-'))
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

async function main() {
  requireEnv()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: track, error } = await supabase.from('exam_tracks').select('id').eq('slug', 'ielts-general').single()
  if (error || !track) throw new Error('Track ielts-general not found.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'IELTS General Training — Listening Mock Test 1', title_ja: 'IELTS ジェネラル リスニング模試1',
    mode: 'full_mock', time_limit_seconds: 1800, published: true,
    set_slug: 'ielts-gt-mock-01', set_title: 'IELTS General Training — Mock Test 1', set_title_ja: 'IELTS ジェネラル模試1', set_order: 0,
  })

  let marks = 0
  for (const [si, set] of SETS.entries()) {
    process.stdout.write(`${set.part_label}: generating audio… `)
    const segs = []
    for (const line of set.lines) segs.push({ buffer: await tts(line.text, VOICE[line.speaker]), gapAfter: line.gap ?? G })
    const audio = joinSegments(segs)
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(set.audio, audio, { contentType: 'audio/mpeg', upsert: true })
    if (upErr) throw new Error(`upload ${set.audio}: ${upErr.message}`)
    const transcript = set.lines.map(l => `${LABEL[l.speaker]}: ${l.text}`).join('\n')
    const assetId = await insertOne(supabase, 'assets', { type: 'audio', storage_path: set.audio, transcript, alt_text: '' })

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
