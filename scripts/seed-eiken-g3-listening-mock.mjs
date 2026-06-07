/**
 * EIKEN Grade 3 — Listening Mock Test 1 (full first-stage listening, 30 questions).
 *
 *   第1部 — 10 illustration questions (picture + short dialogue; the LAST line
 *            is answered by THREE spoken responses A–C; options NOT printed)
 *   第2部 — 10 dialogue-comprehension questions (dialogue + spoken question;
 *            four printed choices A–D)
 *   第3部 — 10 short passages/monologues (passage + spoken question; four
 *            printed choices A–D)
 *
 * Level: CEFR A2 / junior-high vocabulary, short simple sentences, everyday
 * school / family / hobby topics. All audio is slowed to TEMPO (0.88) via
 * ffmpeg atempo so delivery matches the real Grade 3 pace (no pitch change).
 *
 * Answer keys are balanced and FIXED — 第1部 spoken options must NEVER be
 * shuffled (the letters are read aloud):
 *   第1部  B A C B A B C A C B   (A:3 B:4 C:3, no runs of 3)
 *   第2部  C A D B A C B D A D   (A:3 B:2 C:2 D:3)
 *   第3部  B D A C D B A C B A   (A:3 B:3 C:2 D:2)
 *
 * Seeded UNPUBLISHED (draft for review), tagged into set 'eiken-g3-mock-01'.
 * 第1部 illustrations + the speaking card are attached SEPARATELY — see
 * supabase/EIKEN-G3-IMAGES.md and scripts/attach-eiken-g3-images.mjs. The form
 * works without them (questions render; the picture area is empty).
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-eiken-g3-listening-mock.mjs
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
const FORM_SLUG = 'eiken-g3-listening-mock-01'
const MODEL = 'eleven_v3'
const STABILITY = 0.5
// EIKEN Grade 3 audio is slower than natural adult speech. All joined clips
// are slowed ~12% (atempo, pitch preserved) — see joinSegments below.
const TEMPO = 0.88

// Voices (same four project voices as the other listening seeds).
const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const VOICE = { narrator: US_F, boy: US_M, girl: UK_F, man: UK_M, woman: US_F }
const LABEL = { narrator: 'Narrator', boy: 'Boy', girl: 'Girl', man: 'Man', woman: 'Woman' }

// ────────────────────────────────────────────────────────────────────────────
// 第1部 — Illustration questions (10 items, Q1–10)
// Picture + dialogue (2–4 lines); the last line is a question/cue answered by
// THREE spoken responses 'A. … B. … C. …'. Printed options are letter-only.
// `responder` speaks the three options. image_asset_id stays NULL here —
// attach the illustrations with scripts/attach-eiken-g3-images.mjs.
// Correct keys (FIXED, never shuffle): B A C B A B C A C B.
// ────────────────────────────────────────────────────────────────────────────
const PART1 = [
  {
    scene: 'A boy kneeling and looking under his bed for a cap while his mother stands at the door of his room.',
    lines: [
      ['woman', 'Ken, hurry up. Breakfast is ready.'],
      ['boy', 'Sorry, Mom. I’m looking for my cap.'],
      ['woman', 'Did you look under your bed?'],
    ],
    responder: 'boy',
    options: [
      ['A', 'I like eggs.', false],
      ['B', 'Yes, but it wasn’t there.', true],
      ['C', 'It’s eight o’clock.', false],
    ],
  },
  {
    scene: 'A boy holding a new soccer ball and talking with a girl in a park.',
    lines: [
      ['girl', 'Nice ball, Taro. Is it new?'],
      ['boy', 'Yes, I got it for my birthday. Do you want to play soccer now?'],
    ],
    responder: 'girl',
    options: [
      ['A', 'Sure. Let’s go to the park.', true],
      ['B', 'It was last Sunday.', false],
      ['C', 'No, it isn’t mine.', false],
    ],
  },
  {
    scene: 'A girl talking to a librarian at a library counter, with bookshelves behind them.',
    lines: [
      ['girl', 'Excuse me. I’m looking for a book about dogs.'],
      ['man', 'Animal books are over there. Do you have a library card?'],
    ],
    responder: 'girl',
    options: [
      ['A', 'I read it yesterday.', false],
      ['B', 'It’s a big library.', false],
      ['C', 'Yes, here it is.', true],
    ],
  },
  {
    scene: 'Two students at the school entrance on a rainy day; the girl is holding an umbrella and the boy has no umbrella.',
    lines: [
      ['girl', 'Oh no, it’s raining a lot.'],
      ['boy', 'Yeah, and I left my umbrella at home.'],
      ['girl', 'We can share mine. Which way do you go?'],
    ],
    responder: 'boy',
    options: [
      ['A', 'It was sunny yesterday.', false],
      ['B', 'I go down Green Street.', true],
      ['C', 'I bought it last month.', false],
    ],
  },
  {
    scene: 'A boy and his father looking at a white rabbit in a cage at a pet shop.',
    lines: [
      ['boy', 'Look at that white rabbit, Dad.'],
      ['man', 'It’s cute. Do you want to hold it?'],
    ],
    responder: 'boy',
    options: [
      ['A', 'Yes, please!', true],
      ['B', 'He’s three years old.', false],
      ['C', 'I came here by bus.', false],
    ],
  },
  {
    scene: 'A girl talking on the phone in her living room.',
    lines: [
      ['girl', 'Hello?'],
      ['boy', 'Hi, Yumi. It’s Mike. Are you free tomorrow afternoon?'],
    ],
    responder: 'girl',
    options: [
      ['A', 'I went shopping yesterday.', false],
      ['B', 'Yes, I am. Why?', true],
      ['C', 'It’s three o’clock now.', false],
    ],
  },
  {
    scene: 'A teacher looking at a girl’s drawing in an art classroom.',
    lines: [
      ['man', 'Emma, your picture is wonderful.'],
      ['girl', 'Thank you, Mr. Brown.'],
      ['man', 'How long did it take to draw it?'],
    ],
    responder: 'girl',
    options: [
      ['A', 'It’s a picture of my dog.', false],
      ['B', 'I’m fourteen years old.', false],
      ['C', 'About two hours.', true],
    ],
  },
  {
    scene: 'A boy talking with a clerk in a clothing store with T-shirts on display.',
    lines: [
      ['woman', 'May I help you?'],
      ['boy', 'Yes, I’m looking for a T-shirt for my brother.'],
      ['woman', 'What size does he wear?'],
    ],
    responder: 'boy',
    options: [
      ['A', 'Medium, I think.', true],
      ['B', 'He likes blue.', false],
      ['C', 'It’s his birthday.', false],
    ],
  },
  {
    scene: 'A mother cooking curry at the stove while a boy sets nothing yet — he stands by the kitchen table, hungry.',
    lines: [
      ['boy', 'Mom, I’m hungry. What’s for dinner?'],
      ['woman', 'Curry and rice. Can you set the table?'],
    ],
    responder: 'boy',
    options: [
      ['A', 'I like salad.', false],
      ['B', 'It was delicious.', false],
      ['C', 'Sure. Where are the spoons?', true],
    ],
  },
  {
    scene: 'A girl asking a man a question at a bus stop, with a bus stop sign beside them.',
    lines: [
      ['girl', 'Excuse me. Does this bus go to the city museum?'],
      ['man', 'No, it doesn’t. You need the Number 5 bus.'],
      ['girl', 'I see. When will the next one come?'],
    ],
    responder: 'man',
    options: [
      ['A', 'It’s near the park.', false],
      ['B', 'In about ten minutes.', true],
      ['C', 'Three hundred yen, please.', false],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 第2部 — Dialogue comprehension (10 items, Q11–20). Question is spoken at the
// end of the audio AND printed; four printed choices A–D.
// Correct keys: C A D B A C B D A D.
// ────────────────────────────────────────────────────────────────────────────
const PART2 = [
  {
    lines: [
      ['girl', 'Dad, can we go to the shopping mall on Saturday?'],
      ['man', 'Sure, Mika. What do you need?'],
      ['girl', 'I want to buy a birthday present for my friend Kana. She likes music.'],
      ['man', 'OK. Let’s look for something nice.'],
    ],
    question: 'Why does the girl want to go to the mall?',
    options: [
      ['A', 'To listen to some music.', false],
      ['B', 'To meet her friend Kana.', false],
      ['C', 'To buy a birthday present.', true],
      ['D', 'To see a movie.', false],
    ],
  },
  {
    lines: [
      ['boy', 'Ms. Green, can I ask you about today’s math homework?'],
      ['woman', 'Of course, Jim. Which question is difficult?'],
      ['boy', 'Question five. I don’t understand it.'],
      ['woman', 'All right. Let’s look at it together after lunch.'],
    ],
    question: 'What will Jim and Ms. Green do after lunch?',
    options: [
      ['A', 'Look at the homework together.', true],
      ['B', 'Eat lunch in the classroom.', false],
      ['C', 'Write a new question.', false],
      ['D', 'Go to the library.', false],
    ],
  },
  {
    lines: [
      ['girl', 'Tom, what did you do last Sunday?'],
      ['boy', 'I went fishing at the lake with my grandfather.'],
      ['girl', 'Sounds fun. Did you catch anything?'],
      ['boy', 'Yes, three fish! We cooked them for dinner.'],
    ],
    question: 'What did Tom do last Sunday?',
    options: [
      ['A', 'He cooked breakfast.', false],
      ['B', 'He swam in the lake.', false],
      ['C', 'He bought three fish.', false],
      ['D', 'He went fishing with his grandfather.', true],
    ],
  },
  {
    lines: [
      ['woman', 'Excuse me. What time does the next train to Midori Station leave?'],
      ['man', 'At three twenty, from Platform 2.'],
      ['woman', 'Thank you. How long does it take?'],
      ['man', 'About fifteen minutes.'],
    ],
    question: 'What time does the next train leave?',
    options: [
      ['A', 'At two fifteen.', false],
      ['B', 'At three twenty.', true],
      ['C', 'At three fifty.', false],
      ['D', 'At four fifteen.', false],
    ],
  },
  {
    lines: [
      ['boy', 'Hi, Kana. You weren’t at school today. Are you OK?'],
      ['girl', 'I have a cold, but I’m feeling better now.'],
      ['boy', 'Good. Don’t forget, we have a math test on Friday.'],
      ['girl', 'Thanks for telling me. I’ll study tonight.'],
    ],
    question: 'What is Kana’s problem?',
    options: [
      ['A', 'She has a cold.', true],
      ['B', 'She lost her math textbook.', false],
      ['C', 'She was late for school.', false],
      ['D', 'She forgot her homework.', false],
    ],
  },
  {
    lines: [
      ['boy', 'Grandma, this apple cake is delicious. Did you make it?'],
      ['woman', 'Yes. I used apples from our garden.'],
      ['boy', 'Wow. Can you teach me how to make it?'],
      ['woman', 'Sure. Let’s make one together next weekend.'],
    ],
    question: 'What will the boy do next weekend?',
    options: [
      ['A', 'Pick apples in the garden.', false],
      ['B', 'Buy a cake at a store.', false],
      ['C', 'Make a cake with his grandmother.', true],
      ['D', 'Visit his friend’s house.', false],
    ],
  },
  {
    lines: [
      ['girl', 'Are you coming to basketball practice today, Bob?'],
      ['boy', 'I can’t. I have to go to the dentist at four.'],
      ['girl', 'That’s too bad. We have a game on Saturday.'],
      ['boy', 'I know. I’ll practice hard tomorrow.'],
    ],
    question: 'Why can’t Bob go to practice today?',
    options: [
      ['A', 'He has a lot of homework.', false],
      ['B', 'He has to go to the dentist.', true],
      ['C', 'He is going to a game.', false],
      ['D', 'His leg hurts.', false],
    ],
  },
  {
    lines: [
      ['woman', 'Did you clean your room, Lisa?'],
      ['girl', 'Yes, Mom. And I found my old camera under the desk.'],
      ['woman', 'Oh, the one from your aunt. Does it still work?'],
      ['girl', 'Yes! I’ll take some pictures of our cat.'],
    ],
    question: 'What did Lisa find in her room?',
    options: [
      ['A', 'Some old pictures.', false],
      ['B', 'Her aunt’s letter.', false],
      ['C', 'Her cat.', false],
      ['D', 'Her old camera.', true],
    ],
  },
  {
    lines: [
      ['boy', 'Dad, can I have a hamburger and an orange juice?'],
      ['man', 'Sure. Oh, look — they have a pizza special today.'],
      ['boy', 'Really? Then I’ll have pizza instead of the hamburger. I still want the orange juice.'],
      ['man', 'OK. I’ll ask the waiter.'],
    ],
    question: 'What will the boy have?',
    options: [
      ['A', 'Pizza and orange juice.', true],
      ['B', 'A hamburger and orange juice.', false],
      ['C', 'Pizza and tea.', false],
      ['D', 'A hamburger and a salad.', false],
    ],
  },
  {
    lines: [
      ['man', 'Are you ready for the school trip tomorrow, Amy?'],
      ['girl', 'Yes, Mr. Hill. We’re going to Greenwood Zoo, right?'],
      ['man', 'That’s right. The weather will be sunny, so don’t forget your hat.'],
      ['girl', 'I won’t. I’ll bring my camera, too.'],
    ],
    question: 'Where will Amy go tomorrow?',
    options: [
      ['A', 'To a park.', false],
      ['B', 'To a mountain.', false],
      ['C', 'To a museum.', false],
      ['D', 'To a zoo.', true],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 第3部 — Short passages / monologues (10 items, Q21–30). Question is spoken
// at the end of the audio AND printed; four printed choices A–D.
// Correct keys: B D A C D B A C B A.
// ────────────────────────────────────────────────────────────────────────────
const PART3 = [
  {
    speaker: 'girl',
    text: 'Hello, everyone. I’m Jenny. Last summer, I visited my uncle in Canada. He lives near a beautiful lake. We swam in the lake every morning and watched the stars at night. I want to visit him again next year.',
    question: 'Where does Jenny’s uncle live?',
    options: [
      ['A', 'In a big city.', false],
      ['B', 'Near a lake.', true],
      ['C', 'By the sea.', false],
      ['D', 'On a mountain.', false],
    ],
  },
  {
    speaker: 'woman',
    text: 'Attention, students. The school festival will be held next Saturday. The brass band will play in the gym at ten in the morning. After that, you can enjoy food and games in the classrooms. Please invite your family and friends.',
    question: 'What will happen at ten in the morning?',
    options: [
      ['A', 'Games will start in the classrooms.', false],
      ['B', 'Students will make food.', false],
      ['C', 'The festival will finish.', false],
      ['D', 'The brass band will play.', true],
    ],
  },
  {
    speaker: 'man',
    text: 'Ken is on the tennis team at his junior high school. Last month, he hurt his leg, so he couldn’t play for two weeks. Now his leg is fine, and he practices every day after school. He wants to win the city tournament next month.',
    question: 'Why couldn’t Ken play tennis for two weeks?',
    options: [
      ['A', 'He hurt his leg.', true],
      ['B', 'He had many tests.', false],
      ['C', 'It rained every day.', false],
      ['D', 'The tennis court was closed.', false],
    ],
  },
  {
    speaker: 'man',
    text: 'Thank you for shopping at Sunny Supermarket. Today, all fruit is half price until three o’clock. We also have fresh bread from Lucky Bakery near the front door. The store will close at nine tonight. Thank you.',
    question: 'What is half price today?',
    options: [
      ['A', 'Bread.', false],
      ['B', 'Vegetables.', false],
      ['C', 'Fruit.', true],
      ['D', 'Milk.', false],
    ],
  },
  {
    speaker: 'woman',
    text: 'Maria comes from Spain. She moved to Japan two years ago because of her father’s job. At first, she couldn’t speak Japanese well, but now she enjoys talking with her classmates. Her dream is to become a Japanese teacher in Spain.',
    question: 'What is Maria’s dream?',
    options: [
      ['A', 'To live in Japan.', false],
      ['B', 'To work with her father.', false],
      ['C', 'To travel around Spain.', false],
      ['D', 'To become a Japanese teacher.', true],
    ],
  },
  {
    speaker: 'boy',
    text: 'Yesterday was my mother’s birthday. My sister and I got up early and made breakfast for her. I made toast and salad, and my sister made coffee. My mother was very happy. Next year, we want to make a birthday cake, too.',
    question: 'What did the boy make for his mother?',
    options: [
      ['A', 'Coffee.', false],
      ['B', 'Toast and salad.', true],
      ['C', 'A birthday cake.', false],
      ['D', 'A special lunch.', false],
    ],
  },
  {
    speaker: 'man',
    text: 'Thank you for riding the Green Line. We will soon arrive at Park Street Station. If you are going to the baseball stadium, please change trains there. The game starts at six o’clock. Have a nice day.',
    question: 'Where should people change trains for the stadium?',
    options: [
      ['A', 'At Park Street Station.', true],
      ['B', 'At the stadium.', false],
      ['C', 'At the last station.', false],
      ['D', 'At Green Station.', false],
    ],
  },
  {
    speaker: 'woman',
    text: 'Mike likes reading very much. He reads in bed every night. Last week, he read a story about a famous soccer player. It was so interesting that he finished it in two days. He will lend it to his friend tomorrow.',
    question: 'What will Mike do tomorrow?',
    options: [
      ['A', 'He will buy a new book.', false],
      ['B', 'He will play soccer.', false],
      ['C', 'He will lend a book to his friend.', true],
      ['D', 'He will write a story.', false],
    ],
  },
  {
    speaker: 'woman',
    text: 'Welcome to Hillside Library. The library is open from nine in the morning to six in the evening. You can borrow five books for two weeks. This month, we have a storytelling time for children every Wednesday at four. Please join us.',
    question: 'How long can people borrow books?',
    options: [
      ['A', 'For five days.', false],
      ['B', 'For two weeks.', true],
      ['C', 'For one month.', false],
      ['D', 'For six weeks.', false],
    ],
  },
  {
    speaker: 'boy',
    text: 'Hi, I’m Daiki. My family has a small dog named Choco. Every evening, I take him for a walk in the park near my house. On rainy days, Choco looks sad because we can’t go out. This Sunday, I’m going to buy him a new ball.',
    question: 'What does Daiki do every evening?',
    options: [
      ['A', 'He walks his dog.', true],
      ['B', 'He buys dog food.', false],
      ['C', 'He plays in his room.', false],
      ['D', 'He washes his dog.', false],
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

// Joins segments with silence gaps AND slows every segment to TEMPO (0.88,
// pitch preserved) so the whole clip matches Grade 3 listening pace. atempo
// runs BEFORE apad, so the gap durations themselves are not stretched.
function joinSegments(segments) {
  const dir = mkdtempSync(join(tmpdir(), 'eiken-g3-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => {
      const p = join(dir, `seg${i}.mp3`); writeFileSync(p, seg.buffer)
      inputs.push('-i', p); filters.push(`[${i}:a]atempo=${TEMPO},apad=pad_dur=${seg.gapAfter}[a${i}]`); labels.push(`[a${i}]`)
    })
    const outPath = join(dir, 'out.mp3')
    const fc = `${filters.join(';')};${labels.join('')}concat=n=${segments.length}:v=0:a=1[out]`
    const res = spawnSync(ffmpegPath(), ['-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '128k', outPath], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (res.error || res.status !== 0) throw new Error(res.error?.message || res.stderr?.toString().slice(-200) || 'ffmpeg failed')
    return readFileSync(outPath)
  } catch (err) {
    if (!ffmpegWarned) { console.warn(`\n  ! ffmpeg unavailable (${err.message}); joining without gaps or tempo change.`); ffmpegWarned = true }
    return Buffer.concat(segments.map(s => s.buffer))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function buildClip(lines) {
  const segments = []
  for (const line of lines) {
    segments.push({ buffer: await ttsCached(line.text, VOICE[line.speaker]), gapAfter: line.gap ?? 0.4 })
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
    ? join(CACHE_DIR, 'clip-' + createHash('sha1').update(path + '|' + TEMPO + '|' + lines.map(l => `${VOICE[l.speaker]}|${l.text}|${l.gap ?? 0.4}`).join('\n')).digest('hex') + '.mp3')
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
    .from('exam_tracks').select('id').eq('slug', 'eiken-grade-3').single()
  if (trackErr || !track) throw new Error('Track eiken-grade-3 not found — run add-practice-tests.sql first.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'EIKEN Grade 3 — Listening Mock Test 1', title_ja: '英検3級 リスニング模試1',
    mode: 'full_mock', time_limit_seconds: 1500, published: false,
    set_slug: 'eiken-g3-mock-01', set_title: 'EIKEN Grade 3 — Mock Test 1',
    set_title_ja: '英検3級 模試1', set_order: 2,
  })

  // ── 第1部: Illustration questions ──
  let sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: '第1部', title: 'Illustrated Dialogues',
    instructions: 'Look at the picture, listen to the dialogue and the three responses (A–C), and choose the best response. The responses are NOT printed and are heard only once.',
    order_index: 0,
  })
  for (const [i, item] of PART1.entries()) {
    process.stdout.write(`第1部 — item ${i + 1}/10: audio… `)
    const lines = [
      { speaker: 'narrator', text: `Number ${i + 1}. Look at the picture.`, gap: 1.0 },
      ...item.lines.map(([speaker, text], li) => ({
        speaker, text, gap: li === item.lines.length - 1 ? 1.2 : 1.0,
      })),
      ...item.options.map(([label, text]) => ({ speaker: item.responder, text: `${label}. ${text}`, gap: 1.0 })),
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p1-${i + 1}.mp3`, lines)
    // image_asset_id stays NULL — attach with scripts/attach-eiken-g3-images.mjs
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, 'Choose the best response to what you hear.',
      item.options.map(([label, , correct]) => [label, '', correct]))
    console.log('done.')
  }

  // ── 第2部: Dialogue comprehension ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: '第2部', title: 'Dialogue Comprehension',
    instructions: 'Listen to the dialogue and the question, then choose the best answer from the four printed choices (A–D). Each dialogue is heard only once.',
    order_index: 1,
  })
  for (const [i, item] of PART2.entries()) {
    const num = 11 + i
    process.stdout.write(`第2部 — item ${i + 1}/10 (Q${num}): audio… `)
    const lines = [
      { speaker: 'narrator', text: `Number ${num}.`, gap: 1.0 },
      ...item.lines.map(([speaker, text], li) => ({
        speaker, text, gap: li === item.lines.length - 1 ? 1.2 : 1.0,
      })),
      { speaker: 'narrator', text: `Question: ${item.question}`, gap: 0.5 },
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
    form_id: formId, skill: 'listening', part_label: '第3部', title: 'Passage Comprehension',
    instructions: 'Listen to the short passage and the question, then choose the best answer from the four printed choices (A–D). Each passage is heard only once.',
    order_index: 2,
  })
  for (const [i, item] of PART3.entries()) {
    const num = 21 + i
    process.stdout.write(`第3部 — item ${i + 1}/10 (Q${num}): audio… `)
    const lines = [
      { speaker: 'narrator', text: `Number ${num}.`, gap: 1.0 },
      { speaker: item.speaker, text: item.text, gap: 1.2 },
      { speaker: 'narrator', text: `Question: ${item.question}`, gap: 0.5 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p3-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, item.question, item.options)
    console.log('done.')
  }

  console.log(`\n✓ Seeded ${FORM_SLUG} — 30 listening questions (第1部:10 第2部:10 第3部:10). UNPUBLISHED (draft).`)
  console.log('  第1部 illustrations: see supabase/EIKEN-G3-IMAGES.md, then run scripts/attach-eiken-g3-images.mjs')
  console.log('  Publish after review: update test_forms set published = true where slug = \'' + FORM_SLUG + '\'')
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
