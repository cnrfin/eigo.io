/**
 * EIKEN Grade Pre-2 — Listening Mock Test 1 (2024 renewal format, 30 questions).
 *
 *   第1部 (10) — conversation; the last speaker's reply is replaced by THREE
 *                spoken response options "A. … B. … C. …". Printed options are
 *                letter-only. Keys A:3 B:4 C:3, no runs of 3, NEVER shuffled.
 *   第2部 (10) — dialogue + spoken question; printed 4-option MCQ (A–D).
 *   第3部 (10) — short monologue + spoken question; printed 4-option MCQ.
 *
 * Level: CEFR A2–B1 — high-school basic vocabulary, slightly longer sentences
 * than Grade 3 but still measured. A constant TEMPO (0.94) is applied to every
 * segment in joinSegments so the delivery is a touch slower than natural.
 * Topics: school life, part-time-job considerations, travel, family, simple
 * workplace situations. Transcripts contain the correct answers.
 *
 * Seeded UNPUBLISHED (draft for review), set 'eiken-pre2-mock-01' together
 * with the reading/writing/speaking forms from supabase/seed-eiken-pre2-mock.sql.
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-eiken-pre2-listening-mock.mjs
 * Re-running REFRESHES the form (deletes + regenerates everything).
 * Set TTS_CACHE_DIR=… to cache generated segments so an interrupted run
 * resumes without re-billing already-generated lines.
 * Set PRECACHE_ONLY=1 to ONLY generate the TTS segments into the cache —
 * no uploads, no DB writes.
 * All content is ORIGINAL.
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
const FORM_SLUG = 'eiken-pre2-listening-mock-01'
const MODEL = 'eleven_v3'
const STABILITY = 0.5

// EIKEN delivery is measured: slow every clip down slightly via ffmpeg atempo.
const TEMPO = 0.94
// Gaps: 0.8 s between conversation turns, 1.0 s before the options / question.
const TURN_GAP = 0.8
const OPTION_GAP = 1.0

// EIKEN audio is mostly North-American; we keep one UK voice for variety,
// reusing the four voices already used elsewhere in the project.
const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const VOICE = { narrator: UK_F, m1: US_M, m2: UK_M, w1: US_F, w2: UK_F }
const LABEL = { narrator: 'Narrator', m1: 'Man', m2: 'Man', w1: 'Woman', w2: 'Woman' }

// ────────────────────────────────────────────────────────────────────────────
// 第1部 — 会話の応答文選択 (10 items, Q1–10)
// Conversation; the last speaker's reply is replaced by three SPOKEN options.
// `responder` reads the options. Printed options are letter-only.
// Keys: A B C B A C B A C B (A:3 B:4 C:3 — no letter three times in a row).
// NEVER shuffle these — the letters are bound to the audio.
// ────────────────────────────────────────────────────────────────────────────
const PART1 = [
  { // 1 — school life — key A
    lines: [
      ['w1', "Mr. Carter, do you have a minute? I don't understand today's math homework."],
      ['m1', 'Of course. Which problem is giving you trouble?'],
      ['w1', 'The last one, about percentages.'],
    ],
    responder: 'm1',
    options: [
      ["Let's look at it together after class.", true],
      ['I left my homework at home.', false],
      ['Math class starts at nine.', false],
    ],
  },
  { // 2 — family — key B
    lines: [
      ['m2', 'Emi, have you finished packing for the school trip?'],
      ['w2', "Almost. I just can't find my camera."],
    ],
    responder: 'm2',
    options: [
      ['The trip was really fun.', false],
      ['I saw it on the kitchen table.', true],
      ['You should take more pictures.', false],
    ],
  },
  { // 3 — part-time job — key C
    lines: [
      ['w1', 'Hi, Ken. I heard you started working at the bakery near the station.'],
      ['m1', 'Yeah, I work there every Saturday morning.'],
      ['w1', 'How do you like it so far?'],
    ],
    responder: 'm1',
    options: [
      ['The station is far from my house.', false],
      ["I'd like two loaves of bread, please.", false],
      ["It's hard work, but the staff are friendly.", true],
    ],
  },
  { // 4 — travel / hotel — key B
    lines: [
      ['m2', 'Good evening. Welcome to the Seaside Hotel.'],
      ['w2', 'Hi. I have a reservation for two nights. My name is Aya Mori.'],
      ['m2', "Yes, Ms. Mori. Here's your key. Your room is on the fifth floor."],
    ],
    responder: 'w2',
    options: [
      ['I stayed here three years ago.', false],
      ['Thanks. What time is breakfast served?', true],
      ['The fifth floor is being cleaned.', false],
    ],
  },
  { // 5 — simple workplace — key A
    lines: [
      ['w2', 'Tom, could you help me carry these boxes to the meeting room?'],
      ['m1', "Sure. Wow, they're really heavy. What's inside?"],
    ],
    responder: 'w2',
    options: [
      ['Copies of the new product catalog.', true],
      ['The meeting room is too small.', false],
      ["I'll carry them by myself, then.", false],
    ],
  },
  { // 6 — school club — key C
    lines: [
      ['m2', 'Are you going to join the volleyball club this year, Lisa?'],
      ['w1', "I'm not sure. I want to focus on studying for the entrance exams."],
      ['m2', 'But you were the best player in junior high.'],
    ],
    responder: 'w1',
    options: [
      ['The exam results come out tomorrow.', false],
      ['Volleyball practice was canceled.', false],
      ['Maybe I can do both if I plan my time well.', true],
    ],
  },
  { // 7 — family / shopping — key B
    lines: [
      ['w2', "Daiki, I'm going to the supermarket. Do you need anything?"],
      ['m2', "Could you get me some notebooks? I've used up all of mine."],
      ['w2', "Notebooks? They don't sell those at the supermarket."],
    ],
    responder: 'm2',
    options: [
      ["Then I'll have the curry for dinner.", false],
      ["Oh, right. I'll go to the bookstore myself, then.", true],
      ['Thanks. I love this notebook.', false],
    ],
  },
  { // 8 — travel / directions — key A
    lines: [
      ['m1', 'Excuse me. Does this bus go to the city museum?'],
      ['w2', "No, it doesn't. You need the number twelve bus."],
      ['m1', 'I see. Where can I catch it?'],
    ],
    responder: 'w2',
    options: [
      ['At the stop just across the street.', true],
      ['The museum closes at five.', false],
      ["I've never been on this bus.", false],
    ],
  },
  { // 9 — part-time considerations — key C
    lines: [
      ['w1', 'Dad, can I get a part-time job during the summer vacation?'],
      ['m1', 'Hmm. What kind of job are you thinking about?'],
      ['w1', 'Serving customers at the new café in the mall.'],
    ],
    responder: 'm1',
    options: [
      ['I had a great time at the mall.', false],
      ['Yes, this coffee tastes great.', false],
      ["All right, but only if it doesn't affect your schoolwork.", true],
    ],
  },
  { // 10 — friends / weekend plans — key B
    lines: [
      ['m2', "Hi, Sarah. It's Jun. Are you free this Sunday?"],
      ['w2', 'I think so. Why?'],
      ['m2', "There's a free concert in the park. Would you like to go together?"],
    ],
    responder: 'w2',
    options: [
      ['I played the guitar at the concert.', false],
      ['Sounds great. What time shall we meet?', true],
      ['The park was crowded last Sunday.', false],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 第2部 — 会話の内容一致選択 (10 items, Q11–20)
// Dialogue + spoken question; the question and 4 options ARE printed.
// Keys: C A D B A D C B D A (A:3 B:2 C:2 D:3).
// ────────────────────────────────────────────────────────────────────────────
const PART2 = [
  { // 11 — school life — key C
    lines: [
      ['w1', "Hiro, have you started the science report yet? It's due on Friday."],
      ['m1', 'Not yet. I was going to start last night, but my little brother broke my laptop.'],
      ['w1', 'Oh no. What are you going to do?'],
      ['m1', "I'll use the computers in the school library after class today."],
    ],
    question: 'What will the boy do after class?',
    options: [
      ['A', 'Buy a new laptop.', false],
      ['B', 'Help his brother study.', false],
      ['C', 'Use a computer in the library.', true],
      ['D', 'Hand in his science report.', false],
    ],
  },
  { // 12 — shopping — key A
    lines: [
      ['w2', "Excuse me. I bought this sweater here yesterday, but it's too small."],
      ['m2', "I'm sorry about that. Would you like a larger size or your money back?"],
      ['w2', "A larger size, please. It's a present for my sister."],
      ['m2', "Certainly. I'll bring a medium from the back right away."],
    ],
    question: 'What does the woman want to do?',
    options: [
      ['A', 'Exchange a sweater.', true],
      ['B', 'Get her money back.', false],
      ['C', 'Buy a present for her mother.', false],
      ['D', 'Try on a different color.', false],
    ],
  },
  { // 13 — travel / camping — key D
    lines: [
      ['m1', 'Welcome to Green Hills Campground. How can I help you?'],
      ['w1', "Hi. We'd like a campsite for tonight. Do you have space for one tent?"],
      ['m1', 'Yes, but the sites by the river are full. We only have spaces near the forest.'],
      ['w1', "That's fine. Actually, it might be quieter there."],
    ],
    question: 'Why will the woman stay near the forest?',
    options: [
      ['A', 'She loves fishing in the river.', false],
      ['B', 'The forest sites are cheaper.', false],
      ['C', 'Her tent is too big for the river sites.', false],
      ['D', 'The riverside sites are all taken.', true],
    ],
  },
  { // 14 — family — key B
    lines: [
      ['w2', "Kenta, your grandmother's birthday is next week. Have you thought of a present?"],
      ['m2', "How about a scarf? It's getting cold."],
      ['w2', 'I gave her one last year. What about flowers?'],
      ['m2', "Hmm, those don't last long. Let's give her a photo album of the family instead."],
      ['w2', "That's a wonderful idea. She'll love it."],
    ],
    question: 'What will they give the grandmother?',
    options: [
      ['A', 'A scarf.', false],
      ['B', 'A photo album.', true],
      ['C', 'Some flowers.', false],
      ['D', 'A winter coat.', false],
    ],
  },
  { // 15 — simple workplace — key A
    lines: [
      ['m1', "Ms. Sato, the printer on the second floor isn't working again."],
      ['w1', 'Again? I called the repair company on Monday.'],
      ['m1', 'Should I use the one in the sales office for now?'],
      ['w1', "Yes, please. And I'll ask the company to send someone this afternoon."],
    ],
    question: 'What will the woman do this afternoon?',
    options: [
      ['A', 'Ask for a repair person to come.', true],
      ['B', 'Buy a new printer.', false],
      ['C', 'Visit the sales office.', false],
      ['D', 'Print the documents herself.', false],
    ],
  },
  { // 16 — travel / station — key D
    lines: [
      ['w2', 'Excuse me. What time does the next train to Northbridge leave?'],
      ['m2', "I'm afraid the twelve-thirty express has just left. The next one is at two o'clock."],
      ['w2', "Two o'clock? Then I'll miss my friend's wedding party."],
      ['m2', 'There is a highway bus at one. It takes longer, but it arrives before three.'],
      ['w2', "I'll take that. Thank you so much."],
    ],
    question: 'How will the woman travel to Northbridge?',
    options: [
      ['A', 'By express train.', false],
      ['B', 'By local train.', false],
      ['C', 'By taxi.', false],
      ['D', 'By bus.', true],
    ],
  },
  { // 17 — school festival — key C
    lines: [
      ['m2', 'Hi, Anna. Why are you carrying so many posters?'],
      ['w1', "They're for the school festival. Our drama club is performing on Saturday."],
      ['m2', 'That sounds fun. Do you need any help putting them up?'],
      ['w1', 'Yes, please! Could you put some up near the gym?'],
    ],
    question: 'What does the woman ask the man to do?',
    options: [
      ['A', 'Join the drama club.', false],
      ['B', 'Buy a ticket for the play.', false],
      ['C', 'Put up posters near the gym.', true],
      ['D', 'Carry boxes to the festival.', false],
    ],
  },
  { // 18 — family / health — key B
    lines: [
      ['w2', 'You look tired, Ryo. Did you stay up late again?'],
      ['m1', "Yeah, Mom. I was practicing for tomorrow's piano contest until midnight."],
      ['w2', 'Practicing is important, but you need sleep to play well.'],
      ['m1', "You're right. I'll go to bed right after dinner tonight."],
    ],
    question: 'What will the boy do tonight?',
    options: [
      ['A', 'Practice the piano until midnight.', false],
      ['B', 'Go to bed early.', true],
      ['C', 'Watch the contest on TV.', false],
      ['D', 'Have dinner at a restaurant.', false],
    ],
  },
  { // 19 — part-time considerations — key D
    lines: [
      ['m2', 'Welcome to Sunny Burger. Are you here about the part-time job?'],
      ['w1', "Yes. I saw the poster in the window. I'm a high school student. Is that OK?"],
      ['m2', 'Sure, but students can only work until eight on weekdays.'],
      ['w1', "That's fine. I have to be home by nine anyway. Could I work on weekends, too?"],
      ['m2', 'Yes. Let me give you an application form.'],
    ],
    question: 'What will the man give to the girl?',
    options: [
      ['A', 'A weekend schedule.', false],
      ['B', 'A free hamburger.', false],
      ['C', 'A train pass.', false],
      ['D', 'An application form.', true],
    ],
  },
  { // 20 — simple workplace — key A
    lines: [
      ['w1', "Mark, did you book the meeting room for Thursday's training?"],
      ['m1', "I tried, but it's already reserved all day. How about using the cafeteria after lunch?"],
      ['w1', "It's too noisy. Let's ask the manager if we can move the training to Friday."],
      ['m1', "Good idea. I'll email her now."],
    ],
    question: 'What will the man do next?',
    options: [
      ['A', 'Send an e-mail to the manager.', true],
      ['B', 'Reserve the meeting room.', false],
      ['C', 'Clean the cafeteria.', false],
      ['D', 'Cancel the training.', false],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 第3部 — 文の内容一致選択 (10 items, Q21–30)
// Short monologue + spoken question; the question and 4 options ARE printed.
// Keys: B D A C A B D C B A (A:3 B:3 C:2 D:2).
// ────────────────────────────────────────────────────────────────────────────
const PART3 = [
  { // 21 — school life — key B
    speaker: 'w1',
    text: 'Yumi is in her second year of high school. She wants to study English abroad next summer, so she has started saving money. Every day, she puts one hundred yen into a small box on her desk. She also listens to English radio programs while having breakfast.',
    question: 'Why has Yumi started saving money?',
    options: [
      ['A', 'To buy a new radio.', false],
      ['B', 'To study in another country.', true],
      ['C', 'To get a new desk.', false],
      ['D', 'To take a trip with her family.', false],
    ],
  },
  { // 22 — family — key D
    speaker: 'm2',
    text: "Last Sunday, Takeshi's family cleaned the house together. Takeshi washed the windows, and his sister vacuumed the living room. Their father cleaned the kitchen. After they finished, their mother took everyone out for sushi to say thank you.",
    question: 'What did Takeshi do last Sunday?',
    options: [
      ['A', 'He vacuumed the living room.', false],
      ['B', 'He cleaned the kitchen.', false],
      ['C', 'He made sushi for his family.', false],
      ['D', 'He washed the windows.', true],
    ],
  },
  { // 23 — store announcement — key A
    speaker: 'w2',
    text: 'Attention, shoppers. Thank you for coming to Maple Mall today. From three o’clock, we will hold a special event in the central square on the first floor. A local chocolate shop will give out free samples of its new ice cream. Also, all winter clothes on the second floor are now thirty percent off.',
    question: 'What will happen at three o’clock?',
    options: [
      ['A', 'Free ice cream samples will be given out.', true],
      ['B', 'The mall will close early.', false],
      ['C', 'A new clothing store will open.', false],
      ['D', 'A cooking contest will start.', false],
    ],
  },
  { // 24 — travel — key C
    speaker: 'm1',
    text: 'Maria visited Kyoto with her host family last month. They planned to see a famous temple, but it was closed for repairs. Instead, they walked around an old shopping street and tried green tea sweets. Maria liked them so much that she bought a box to send to her parents in Spain.',
    question: 'Why did Maria buy a box of sweets?',
    options: [
      ['A', 'Her host family asked for one.', false],
      ['B', 'The temple shop was having a sale.', false],
      ['C', 'She wanted to send it to her parents.', true],
      ['D', 'She needed a present for her teacher.', false],
    ],
  },
  { // 25 — part-time work — key A
    speaker: 'm2',
    text: 'Kazu works part-time at a convenience store near his school. At first, he often made mistakes at the cash register, and he wanted to quit. However, the store manager kindly taught him how to do each job slowly. Now, Kazu enjoys his work and is even teaching a new staff member.',
    question: 'Why did Kazu want to quit his job at first?',
    options: [
      ['A', 'He made many mistakes.', true],
      ['B', 'The store was far from his school.', false],
      ['C', 'The manager was too strict.', false],
      ['D', 'He had to teach new staff.', false],
    ],
  },
  { // 26 — school announcement — key B
    speaker: 'w1',
    text: "Good morning, students. This is an announcement about tomorrow's sports day. The weather report says it will rain heavily in the morning, so sports day will be moved to Thursday. Classes will be held as usual tomorrow. Please don't forget to bring your textbooks.",
    question: 'Why will sports day be held on Thursday?',
    options: [
      ['A', 'The gym is being repaired.', false],
      ['B', 'Heavy rain is expected.', true],
      ['C', 'Many students are sick.', false],
      ['D', 'The teachers have a meeting.', false],
    ],
  },
  { // 27 — family / travel — key D
    speaker: 'w2',
    text: "Every summer, Naoko visits her grandfather, who lives on a small island. He takes her fishing early in the morning, and they cook the fish for lunch together. This year, however, her grandfather will come to Tokyo instead, because he wants to see Naoko's brass band concert.",
    question: "Why will Naoko's grandfather come to Tokyo this year?",
    options: [
      ['A', 'He needs to see a doctor.', false],
      ['B', 'He is moving to a new house.', false],
      ['C', 'He wants to cook for the family.', false],
      ['D', 'He wants to see a concert.', true],
    ],
  },
  { // 28 — recorded message / workplace — key C
    speaker: 'm1',
    text: 'Thank you for calling Riverside Dental Clinic. Our clinic is open from nine a.m. to six p.m., Tuesday through Saturday. If you would like to make an appointment, please press one. If you need to change or cancel an appointment, please press two. For all other questions, please stay on the line.',
    question: 'Why should a caller press two?',
    options: [
      ['A', 'To make a new appointment.', false],
      ['B', 'To ask about opening hours.', false],
      ['C', 'To change or cancel an appointment.', true],
      ['D', 'To speak with the dentist.', false],
    ],
  },
  { // 29 — school life / hobby — key B
    speaker: 'm2',
    text: "Jiro joined the photography club when he entered high school. Last week, the club members went to the harbor to take pictures of ships. Jiro's photo of a fishing boat at sunset won first prize in a city contest. His photo will be shown at the city library next month.",
    question: "Where will Jiro's photo be displayed next month?",
    options: [
      ['A', 'At the harbor.', false],
      ['B', 'At the city library.', true],
      ['C', 'At his high school.', false],
      ['D', 'At a photo studio.', false],
    ],
  },
  { // 30 — event announcement — key A
    speaker: 'w1',
    text: "Tomorrow, the Greenfield City Zoo will hold a special evening event. Visitors can see how the lions and elephants spend the night. The zoo will stay open until nine p.m., and the entrance fee after five o'clock will be half price. Tickets can be bought at the gate or on the zoo's website.",
    question: "What can visitors do after five o'clock tomorrow?",
    options: [
      ['A', 'Enter the zoo for half price.', true],
      ['B', 'Feed the lions and elephants.', false],
      ['C', 'Buy animal toys at the gate.', false],
      ['D', 'Watch a movie about the zoo.', false],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Helpers (same pattern as the other listening seeds)
// ────────────────────────────────────────────────────────────────────────────
function requireEnv() {
  const missing = []
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY')
  if (missing.length) { console.error('Missing env vars:', missing.join(', ')); process.exit(1) }
}

async function tts(text, voiceId, attempt = 1) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: STABILITY, similarity_boost: 0.75 } }),
  })
  if (!res.ok) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 1500 * attempt)); return tts(text, voiceId, attempt + 1) }
    throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

// Optional resumable segment cache: TTS_CACHE_DIR=… caches each generated
// line so an interrupted run picks up where it left off.
const CACHE_DIR = process.env.TTS_CACHE_DIR
async function ttsCached(text, voiceId) {
  if (!CACHE_DIR) return tts(text, voiceId)
  const key = createHash('sha1').update(`${voiceId}|${STABILITY}|${MODEL}|${text}`).digest('hex')
  const p = join(CACHE_DIR, `${key}.mp3`)
  if (existsSync(p)) return readFileSync(p)
  const buf = await tts(text, voiceId)
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(p, buf)
  return buf
}

function ffmpegPath() {
  const bundled = join(process.cwd(), 'bin', 'ffmpeg')
  return existsSync(bundled) ? bundled : 'ffmpeg'
}
let ffmpegWarned = false

function joinSegments(segments) {
  const dir = mkdtempSync(join(tmpdir(), 'eiken-pre2-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => {
      const p = join(dir, `seg${i}.mp3`); writeFileSync(p, seg.buffer)
      inputs.push('-i', p)
      // Constant EIKEN tempo applied to every segment BEFORE the padded gap.
      filters.push(`[${i}:a]atempo=${TEMPO},apad=pad_dur=${seg.gapAfter}[a${i}]`)
      labels.push(`[a${i}]`)
    })
    const outPath = join(dir, 'out.mp3')
    const fc = `${filters.join(';')};${labels.join('')}concat=n=${segments.length}:v=0:a=1[out]`
    const res = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', outPath], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (res.error || res.status !== 0) throw new Error(res.error?.message || res.stderr?.toString().slice(-200) || 'ffmpeg failed')
    return readFileSync(outPath)
  } catch (err) {
    if (!ffmpegWarned) { console.warn(`\n  ! ffmpeg unavailable (${err.message}); joining without gaps/tempo.`); ffmpegWarned = true }
    return Buffer.concat(segments.map(s => s.buffer))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function buildClip(lines) {
  const segments = []
  for (const line of lines) {
    segments.push({ buffer: await ttsCached(line.text, VOICE[line.speaker]), gapAfter: line.gap ?? TURN_GAP })
  }
  return joinSegments(segments)
}

const PRECACHE = !!process.env.PRECACHE_ONLY

async function insertOne(supabase, table, row) {
  if (PRECACHE) return '00000000-0000-0000-0000-000000000000'
  const { data, error } = await supabase.from(table).insert(row).select('id').single()
  if (error) throw new Error(`${table} insert: ${error.message}`)
  return data.id
}

async function uploadClip(supabase, path, lines) {
  if (PRECACHE) {
    // warm the TTS cache only — skip ffmpeg join, upload and asset row
    for (const l of lines) await ttsCached(l.text, VOICE[l.speaker])
    return '00000000-0000-0000-0000-000000000000'
  }
  // cache the JOINED clip too, so re-runs skip ffmpeg as well as TTS
  let audio
  const clipCachePath = CACHE_DIR
    ? join(CACHE_DIR, 'clip-' + createHash('sha1').update(path + '|' + TEMPO + '|' + lines.map(l => `${VOICE[l.speaker]}|${l.text}|${l.gap ?? TURN_GAP}`).join('\n')).digest('hex') + '.mp3')
    : null
  if (clipCachePath && existsSync(clipCachePath)) {
    audio = readFileSync(clipCachePath)
  } else {
    audio = await buildClip(lines)
    if (clipCachePath) { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(clipCachePath, audio) }
  }
  const { error } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error(`upload ${path}: ${error.message}`)
  const transcript = lines.map(l => `${LABEL[l.speaker]}: ${l.text}`).join('\n')
  return insertOne(supabase, 'assets', { type: 'audio', storage_path: path, transcript, alt_text: '' })
}

async function addQuestion(supabase, groupId, orderIndex, prompt, options) {
  if (PRECACHE) return
  const qid = await insertOne(supabase, 'questions', {
    group_id: groupId, order_index: orderIndex, question_type: 'single_choice',
    scoring_method: 'auto_choice', prompt, max_score: 1,
  })
  const { error } = await supabase.from('question_options').insert(
    options.map(([label, content, correct], idx) => ({ question_id: qid, order_index: idx, label, content, is_correct: correct }))
  )
  if (error) throw new Error(`options: ${error.message}`)
}

// All audio paths (for cleanup)
const ALL_PATHS = [
  ...PART1.map((_, i) => `listening/${FORM_SLUG}-p1-${i + 1}.mp3`),
  ...PART2.map((_, i) => `listening/${FORM_SLUG}-p2-${i + 1}.mp3`),
  ...PART3.map((_, i) => `listening/${FORM_SLUG}-p3-${i + 1}.mp3`),
]

async function cleanup(supabase) {
  if (PRECACHE) return
  const { data: form } = await supabase.from('test_forms').select('id').eq('slug', FORM_SLUG).maybeSingle()
  if (!form) return
  console.log('Existing form found — refreshing.')
  await supabase.storage.from(BUCKET).remove(ALL_PATHS).catch(() => {})
  await supabase.from('assets').delete().in('storage_path', ALL_PATHS)
  await supabase.from('test_forms').delete().eq('id', form.id)
}

async function main() {
  requireEnv()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: track, error: trackErr } = await supabase
    .from('exam_tracks').select('id').eq('slug', 'eiken-grade-pre2').single()
  if (trackErr || !track) throw new Error('Track eiken-grade-pre2 not found — run add-practice-tests.sql first.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'EIKEN Grade Pre-2 — Listening Mock Test 1', title_ja: '英検準2級 リスニング模試1',
    mode: 'full_mock', time_limit_seconds: 1500, published: false,
    set_slug: 'eiken-pre2-mock-01', set_title: 'EIKEN Grade Pre-2 — Mock Test 1',
    set_title_ja: '英検準2級 模試1', set_order: 2,
  })

  // ── 第1部: Conversation response selection ──
  let sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: '第1部', title: 'Conversation Responses (会話の応答文選択)',
    instructions: 'Listen to the conversation. The last reply is replaced by three spoken choices (A–C). Choose the best response. The choices are NOT printed and everything is heard only once.',
    order_index: 0,
  })
  for (const [i, item] of PART1.entries()) {
    process.stdout.write(`第1部 — item ${i + 1}/10 (Q${i + 1}): audio… `)
    const turns = item.lines.map(([speaker, text], li) => ({
      speaker, text, gap: li === item.lines.length - 1 ? OPTION_GAP : TURN_GAP,
    }))
    const lines = [
      { speaker: 'narrator', text: `Number ${i + 1}.`, gap: TURN_GAP },
      ...turns,
      ...item.options.map(([text], oi) => ({ speaker: item.responder, text: `${'ABC'[oi]}. ${text}`, gap: TURN_GAP })),
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p1-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    // Printed options are letter-only — the letters are bound to the audio, NEVER shuffle.
    await addQuestion(supabase, groupId, 0, 'Choose the best response to continue the conversation.',
      item.options.map(([, correct], oi) => ['ABC'[oi], '', correct]))
    console.log('done.')
  }

  // ── 第2部: Dialogue comprehension ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: '第2部', title: 'Dialogue Comprehension (会話の内容一致選択)',
    instructions: 'Listen to the dialogue and the question, then choose the best answer from the four printed choices (A–D). Everything is heard only once.',
    order_index: 1,
  })
  for (const [i, item] of PART2.entries()) {
    const num = 11 + i
    process.stdout.write(`第2部 — item ${i + 1}/10 (Q${num}): audio… `)
    const turns = item.lines.map(([speaker, text], li) => ({
      speaker, text, gap: li === item.lines.length - 1 ? OPTION_GAP : TURN_GAP,
    }))
    const lines = [
      { speaker: 'narrator', text: `Number ${num}.`, gap: TURN_GAP },
      ...turns,
      { speaker: 'narrator', text: `Question. ${item.question}`, gap: 0.3 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p2-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, item.question, item.options)
    console.log('done.')
  }

  // ── 第3部: Passage comprehension ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: '第3部', title: 'Passage Comprehension (文の内容一致選択)',
    instructions: 'Listen to the short passage and the question, then choose the best answer from the four printed choices (A–D). Everything is heard only once.',
    order_index: 2,
  })
  for (const [i, item] of PART3.entries()) {
    const num = 21 + i
    process.stdout.write(`第3部 — item ${i + 1}/10 (Q${num}): audio… `)
    const lines = [
      { speaker: 'narrator', text: `Number ${num}.`, gap: TURN_GAP },
      { speaker: item.speaker, text: item.text, gap: OPTION_GAP },
      { speaker: 'narrator', text: `Question. ${item.question}`, gap: 0.3 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p3-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, item.question, item.options)
    console.log('done.')
  }

  console.log(`\n✓ Seeded ${FORM_SLUG} — 30 listening questions (第1部:10 第2部:10 第3部:10). UNPUBLISHED (draft).`)
  console.log('  第1部 options are SPOKEN — never run shuffle-choice-options.mjs on this form without --skip-audio-groups.')
  console.log('  Publish after review: update test_forms set published = true where slug = \'' + FORM_SLUG + '\'')
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
