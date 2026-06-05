/**
 * Seed the full Versant-style English Speaking and Listening mock test.
 *
 * Models the CURRENT "Versant by Pearson English Speaking and Listening Test"
 * (2024 spec, per Pearson's validation report): six machine-paced item types,
 * every item delivered as audio, every answer spoken:
 *
 *   Part A  Give a short answer to the question   8 items   (listening)
 *   Part B  Repeat the sentence                  16 items   (speaking)
 *   Part C  Answer a question about a conversation 6 items  (listening)
 *   Part D  Answer questions about a passage      6 items   (listening; 2 passages x 3)
 *   Part E  Retell a passage                       2 items  (speaking, 30s)
 *   Part F  Give your opinion                      2 items  (speaking, 40s)
 *
 * (The real test opens with an UNSCORED "record a speech sample" warm-up;
 * we skip it because every recording here is already reviewable by a tutor.)
 *
 * Each item = one question_group with its own one-shot audio stimulus and one
 * speaking_response question with payload {flow:'auto', speak_seconds, reference}.
 * flow:'auto' makes the exam shell machine-paced: the clip plays once, a beep
 * starts the recording, and the test advances by itself — like the real thing.
 * `reference` (the expected answer / verbatim sentence / passage) is used by
 * the audio grader for content accuracy and is stripped from client payloads.
 *
 * All content ORIGINAL. Run AFTER supabase/seed-versant.sql:
 *   node --env-file=.env.local scripts/seed-versant.mjs
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
const FORM_SLUG = 'versant-eslt-mock-01'
const AUDIO_DIR = `listening/${FORM_SLUG}`
const ELEVENLABS_MODEL_ID = 'eleven_v3'

// A range of first-language accents/voices, like the real test (US + UK).
const VOICES = {
  usf: { voiceId: 'uYXf8XasLslADfZ2MB4u', label: 'US-Female' },
  usm: { voiceId: 'UgBBYS2sOqTuMpoF3BR0', label: 'US-Male' },
  ukf: { voiceId: 'lcMyyd2HUfFzxdCaC4Ta', label: 'UK-Female' },
  ukm: { voiceId: 'fNYuJl2dBlX9V7NxmjnV', label: 'UK-Male' },
}
const ROTATE = ['usm', 'ukf', 'usf', 'ukm'] // item-prompt voice rotation

// ---------------------------------------------------------------------------
//  Content (all original)
// ---------------------------------------------------------------------------

// Part A — spoken question, one-word/short-phrase answer.
const PART_A = [
  { q: 'How many days are there in a week?', ref: 'seven (7)' },
  { q: 'What do you call the first meal of the day?', ref: 'breakfast' },
  { q: 'If today is Friday, what day was yesterday?', ref: 'Thursday' },
  { q: 'Which is bigger, a mouse or a horse?', ref: 'a horse' },
  { q: 'What do people usually wear on their feet?', ref: 'shoes (socks also acceptable)' },
  { q: 'What season comes after summer?', ref: 'autumn / fall' },
  { q: 'Where do people go to borrow books?', ref: 'a library / the library' },
  { q: 'How many wheels does a bicycle have?', ref: 'two (2)' },
]

// Part B — repeat verbatim; 5 -> ~15 words, increasing difficulty.
const PART_B = [
  'The bus is late again.',
  'He left his keys at home.',
  'The coffee shop closes at six.',
  'She asked me to water her plants.',
  'They are planning a trip to the mountains.',
  'The new restaurant near my office is very popular.',
  'I forgot my umbrella, so I got wet on the way home.',
  'He wanted to know if the museum was open on Mondays.',
  'The train was so crowded that we could not find seats.',
  'She promised to call me as soon as her flight landed.',
  'If it rains this weekend, we will have to cancel the picnic.',
  'The manager explained the new schedule to everyone at the morning meeting.',
  'Although the test was difficult, most of the students finished it on time.',
  'The package that you ordered last week should arrive by Friday afternoon.',
  'They have been trying to fix the printer all morning, but nothing has worked.',
  'Before you leave the office tonight, please make sure all the windows are closed.',
]

// Part C — three-turn conversation, then a comprehension question.
const PART_C = [
  {
    turns: [
      { v: 'usf', text: 'Are you coming to the gym tonight?' },
      { v: 'usm', text: "I can't. I have to finish a report." },
      { v: 'usf', text: 'Maybe tomorrow, then.' },
    ],
    q: { v: 'ukf', text: "Why can't the man go to the gym?" },
    ref: 'He has to finish a report.',
  },
  {
    turns: [
      { v: 'ukm', text: 'This line is so long.' },
      { v: 'ukf', text: "I know. There's only one cashier today." },
      { v: 'ukm', text: "Let's come back later." },
    ],
    q: { v: 'usf', text: 'Why is the line so long?' },
    ref: 'There is only one cashier (working today).',
  },
  {
    turns: [
      { v: 'usf', text: 'How was the movie?' },
      { v: 'ukm', text: 'Boring. I fell asleep in the middle.' },
      { v: 'usf', text: 'Oh no, sorry to hear that.' },
    ],
    q: { v: 'usm', text: 'What did the man think of the movie?' },
    ref: 'It was boring (he fell asleep).',
  },
  {
    turns: [
      { v: 'usm', text: 'Did you drive to work today?' },
      { v: 'usf', text: 'No, I cycled. The traffic is terrible on Fridays.' },
      { v: 'usm', text: 'Good idea.' },
    ],
    q: { v: 'ukm', text: 'How did the woman get to work?' },
    ref: 'By bicycle (she cycled).',
  },
  {
    turns: [
      { v: 'ukf', text: 'Your garden looks beautiful.' },
      { v: 'usm', text: 'Thanks. I planted the roses last spring.' },
      { v: 'ukf', text: "They're lovely." },
    ],
    q: { v: 'usf', text: 'When did the man plant the roses?' },
    ref: 'Last spring.',
  },
  {
    turns: [
      { v: 'ukm', text: 'Should we eat outside?' },
      { v: 'ukf', text: "It's a bit cold. Let's stay in." },
      { v: 'ukm', text: "OK, I'll set the table." },
    ],
    q: { v: 'usm', text: 'Why do they decide to eat inside?' },
    ref: 'Because it is (a bit) cold outside.',
  },
]

// Part D — spoken passage, then three spoken comprehension questions.
const PART_D = [
  {
    v: 'usm',
    passage:
      'Kenji worked at a small bakery in the city. Every morning he arrived at four o\'clock to prepare the bread before the shop opened. One day, the oven stopped working just as he began baking. Kenji called the repair company, but nobody could come until the afternoon. Instead of closing the shop, he borrowed the kitchen at the restaurant next door and baked the bread there. The bread was ready only a little late, and his customers never knew about the problem.',
    questions: [
      { v: 'ukf', text: 'Where did Kenji work?', ref: 'At a (small) bakery.' },
      { v: 'ukf', text: 'What problem did Kenji have one morning?', ref: 'The oven stopped working / broke down.' },
      { v: 'ukf', text: 'How did Kenji solve his problem?', ref: "He borrowed / used the kitchen at the restaurant next door and baked the bread there." },
    ],
  },
  {
    v: 'ukf',
    passage:
      'Maria wanted to learn to swim, but she was afraid of deep water. Her friend suggested taking lessons at the local pool, where a patient instructor taught beginners. At her first lesson, Maria practised only in the shallow end. After two months of weekly lessons, she could swim across the whole pool. Last summer, she even swam in the sea for the first time.',
    questions: [
      { v: 'usm', text: 'What was Maria afraid of?', ref: 'Deep water.' },
      { v: 'usm', text: 'Where did Maria take swimming lessons?', ref: 'At the local pool.' },
      { v: 'usm', text: 'What did Maria do last summer?', ref: 'She swam in the sea for the first time.' },
    ],
  },
]

// Part E — listen to a passage, retell it in your own words (30 seconds).
const PART_E = [
  {
    v: 'usf',
    passage:
      'A young man missed his train one morning and had to wait an hour for the next one. While he waited, he started talking to an older woman on the platform. She told him she had worked as a chef in France for twenty years. By the time the train arrived, she had given him three of her favourite recipes. He still cooks one of them every week.',
  },
  {
    v: 'ukm',
    passage:
      'A small town had a library that very few people visited. The new librarian decided to start a reading club for children on Saturday mornings. At first, only four children came. The librarian read stories aloud and let the children choose any book to take home. Within a year, the club had more than fifty members, and the library became one of the busiest places in town.',
  },
]

// Part F — opinion question, 40 seconds.
const PART_F = [
  {
    v: 'usm',
    q: 'What are two advantages of working from home? And what are two disadvantages? Please explain.',
    ref: 'Any reasonable advantages (no commute, flexible hours, more family time, fewer distractions) and disadvantages (isolation, harder teamwork, blurred work-life boundary, distractions at home), each briefly explained.',
  },
  {
    v: 'ukf',
    q: 'Do you prefer travelling alone or travelling with friends? Explain why.',
    ref: 'Either preference with clear reasons (freedom/flexibility and self-discovery vs. shared memories, safety, splitting costs).',
  },
]

// ---------------------------------------------------------------------------
//  Plumbing
// ---------------------------------------------------------------------------
function requireEnv() {
  const missing = []
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY')
  if (missing.length) {
    console.error('Missing env vars:', missing.join(', '))
    console.error('Run with:  node --env-file=.env.local scripts/seed-versant.mjs')
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
  if (segments.length === 1 && !segments[0].gapAfter) return segments[0].buffer
  const dir = mkdtempSync(join(tmpdir(), 'versant-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => {
      const p = join(dir, `seg${i}.mp3`)
      writeFileSync(p, seg.buffer)
      inputs.push('-i', p)
      filters.push(`[${i}:a]apad=pad_dur=${seg.gapAfter ?? 0.2}[a${i}]`)
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
  const { data: files } = await supabase.storage.from(BUCKET).list(AUDIO_DIR, { limit: 200 })
  if (files?.length) await supabase.storage.from(BUCKET).remove(files.map(f => `${AUDIO_DIR}/${f.name}`)).catch(() => {})
  await supabase.from('assets').delete().like('storage_path', `${AUDIO_DIR}/%`)
  if (form) { console.log('Existing form found — refreshing.'); await supabase.from('test_forms').delete().eq('id', form.id) }
}

// ---------------------------------------------------------------------------
//  Build the item list: each item -> { key, lines:[{v,text,gap}], transcript,
//  prompt, reference, speakSeconds, maxScore }
// ---------------------------------------------------------------------------
function buildParts() {
  let r = 0
  const rotate = () => ROTATE[r++ % ROTATE.length]

  const partA = {
    label: 'Part A', title: 'Short Answer Questions', skill: 'listening', speak: 15, max: 1,
    instructions: 'You will hear a question. After the beep, answer with a single word or a short phrase. Each question plays only once.',
    prompt: 'Listen to the question, then answer with one word or a short phrase.',
    items: PART_A.map((it, i) => ({
      key: `a${i + 1}`,
      lines: [{ v: rotate(), text: it.q, gap: 0.2 }],
      reference: `Expected answer: ${it.ref}`,
    })),
  }

  const partB = {
    label: 'Part B', title: 'Repeat the Sentence', skill: 'speaking', speak: 15, max: 2,
    instructions: 'You will hear a sentence. After the beep, repeat the sentence exactly as you heard it. Each sentence plays only once.',
    prompt: 'Listen, then repeat the sentence exactly.',
    items: PART_B.map((s, i) => ({
      key: `b${i + 1}`,
      lines: [{ v: rotate(), text: s, gap: 0.2 }],
      reference: `The exact sentence to repeat verbatim: "${s}"`,
    })),
  }

  const partC = {
    label: 'Part C', title: 'Conversations', skill: 'listening', speak: 15, max: 1,
    instructions: 'You will hear a short conversation between two people, followed by a question. After the beep, answer the question with a word or short phrase.',
    prompt: 'Listen to the conversation and the question, then answer with a word or short phrase.',
    items: PART_C.map((c, i) => ({
      key: `c${i + 1}`,
      lines: [
        ...c.turns.map((tn, j) => ({ v: tn.v, text: tn.text, gap: j === c.turns.length - 1 ? 0.8 : 0.4 })),
        { v: c.q.v, text: c.q.text, gap: 0.2 },
      ],
      reference: `Expected answer: ${c.ref}`,
    })),
  }

  const partD = {
    label: 'Part D', title: 'Passages', skill: 'listening', speak: 15, max: 1,
    instructions: 'You will hear a short passage, followed by three questions about it, one at a time. After each beep, answer with a word or short phrase.',
    prompt: 'Listen, then answer the question with a word or short phrase.',
    items: PART_D.flatMap((p, pi) =>
      p.questions.map((qq, qi) => ({
        key: `d${pi + 1}q${qi + 1}`,
        // The passage is baked into the FIRST question's clip; the following
        // two clips play just their question (like the real test's sequence).
        lines: qi === 0
          ? [{ v: p.v, text: p.passage, gap: 1.0 }, { v: qq.v, text: qq.text, gap: 0.2 }]
          : [{ v: qq.v, text: qq.text, gap: 0.2 }],
        reference: `The passage the candidate heard: "${p.passage}"\nExpected answer: ${qq.ref}`,
      }))
    ),
  }

  const partE = {
    label: 'Part E', title: 'Retell a Passage', skill: 'speaking', speak: 30, max: 5,
    instructions: 'You will hear a short story. After the beep, retell the story in your own words. Try to include as much as you can. You have 30 seconds.',
    prompt: 'Listen to the story, then retell it in your own words.',
    items: PART_E.map((p, i) => ({
      key: `e${i + 1}`,
      lines: [{ v: p.v, text: p.passage, gap: 0.2 }],
      reference: `The passage to retell: "${p.passage}"\nScore coverage of its actors, actions and sequence, retold in the candidate's own words.`,
    })),
  }

  const partF = {
    label: 'Part F', title: 'Give Your Opinion', skill: 'speaking', speak: 40, max: 5,
    instructions: 'You will hear a question asking for your opinion. After the beep, answer with details and reasons. You have 40 seconds.',
    prompt: 'Listen to the question, then give your opinion with reasons.',
    items: PART_F.map((p, i) => ({
      key: `f${i + 1}`,
      lines: [{ v: p.v, text: p.q, gap: 0.2 }],
      reference: `The question asked: "${p.q}"\n${p.ref}`,
    })),
  }

  return [partA, partB, partC, partD, partE, partF]
}

// ---------------------------------------------------------------------------
async function main() {
  requireEnv()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: track } = await supabase.from('exam_tracks').select('id').eq('slug', 'versant-eslt').single()
  if (!track) throw new Error('Track versant-eslt not found — run supabase/seed-versant.sql first.')
  const { data: rubric } = await supabase
    .from('rubrics').select('id').eq('track_id', track.id).eq('name', 'Versant Speaking & Listening').maybeSingle()
  if (!rubric) throw new Error('Versant rubric not found — run supabase/seed-versant.sql first.')

  await cleanup(supabase)

  const parts = buildParts()
  const totalItems = parts.reduce((s, p) => s + p.items.length, 0)
  console.log(`Generating audio for ${totalItems} items (${parts.reduce((s, p) => s + p.items.reduce((x, it) => x + it.lines.length, 0), 0)} voice lines)…`)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'Versant Style — Speaking & Listening Mock Test 1',
    title_ja: 'Versant形式 スピーキング＆リスニング模試1',
    // One-section "set": gets the mock card + preview screen on the tests page.
    set_slug: 'versant-mock-01',
    set_title: 'Versant Style — Speaking & Listening Mock Test 1',
    set_title_ja: 'Versant形式 スピーキング＆リスニング模試1',
    set_order: 0,
    // Machine-paced: each item is bounded by its clip + per-answer recording
    // window, so there is no whole-test countdown.
    mode: 'full_mock', time_limit_seconds: null, published: true,
  })

  let made = 0
  for (let si = 0; si < parts.length; si++) {
    const part = parts[si]
    const sectionId = await insertOne(supabase, 'sections', {
      form_id: formId, skill: part.skill, part_label: part.label, title: part.title,
      instructions: part.instructions, order_index: si,
    })

    for (let ii = 0; ii < part.items.length; ii++) {
      const item = part.items[ii]
      const segments = []
      for (const line of item.lines) {
        segments.push({ buffer: await tts(line.text, VOICES[line.v].voiceId), gapAfter: line.gap })
      }
      const audio = joinSegments(segments)
      const path = `${AUDIO_DIR}/${item.key}.mp3`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
      if (upErr) throw new Error(`upload ${path}: ${upErr.message}`)

      const transcript = item.lines.map(l => `${VOICES[l.v].label}: ${l.text}`).join('\n')
      const assetId = await insertOne(supabase, 'assets', { type: 'audio', storage_path: path, transcript, alt_text: '' })

      const groupId = await insertOne(supabase, 'question_groups', {
        section_id: sectionId, order_index: ii, stimulus_type: 'audio', audio_asset_id: assetId, prompt: '',
      })
      await insertOne(supabase, 'questions', {
        group_id: groupId, order_index: 0, question_type: 'speaking_response', scoring_method: 'ai_rubric',
        prompt: part.prompt,
        payload: { flow: 'auto', speak_seconds: part.speak, reference: item.reference },
        rubric_id: rubric.id, max_score: part.max,
      })
      made += 1
      process.stdout.write(`\r  ${made}/${totalItems} items done (${part.label})   `)
    }
  }

  console.log(`\n✓ Seeded ${FORM_SLUG}: ${totalItems} machine-paced items across ${parts.length} parts.`)
  console.log('  Listening = Parts A/C/D (20 marks), Speaking = Parts B/E/F (52 marks); scored on GSE 10-90.')
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
