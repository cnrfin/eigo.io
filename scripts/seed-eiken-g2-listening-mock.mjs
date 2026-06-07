/**
 * EIKEN Grade 2 — Listening Mock Test 1 (30 questions).
 *
 *   第1部 (15) — conversation (3–6 turns) + spoken question at the end;
 *                printed 4-option MCQ (A–D). No spoken-option parts.
 *   第2部 (15) — 60–90-word monologue/passage + spoken question at the end;
 *                printed 4-option MCQ (A–D).
 *
 * Level: CEFR B1 — high-school vocabulary, everyday + light social topics
 * (environment, technology in daily life, community, travel, work). A constant
 * TEMPO (0.97) is applied to every segment in joinSegments so the delivery is
 * near-natural but clear. Gaps: 0.6 s between turns, 0.9 s before the spoken
 * question. Transcripts contain the correct answers.
 *
 * Keys are balanced A–D per part with no letter three times in a row:
 *   第1部: C A D B A C D B D A B C A D B  (A:4 B:4 C:3 D:4)
 *   第2部: B D A C B A D C A D B C D A C  (A:4 B:3 C:4 D:4)
 *
 * Seeded UNPUBLISHED (draft for review), set 'eiken-g2-mock-01' together with
 * the reading/writing/speaking forms from supabase/seed-eiken-g2-mock.sql.
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-eiken-g2-listening-mock.mjs
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
const FORM_SLUG = 'eiken-g2-listening-mock-01'
const MODEL = 'eleven_v3'
const STABILITY = 0.5

// Grade 2 delivery is near-natural but clear: slight slowdown via ffmpeg atempo.
const TEMPO = 0.97
// Gaps: 0.6 s between conversation turns, 0.9 s before the spoken question.
const TURN_GAP = 0.6
const QUESTION_GAP = 0.9

// EIKEN audio is mostly North-American; we keep one UK voice for variety,
// reusing the four voices already used elsewhere in the project.
const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const VOICE = { narrator: UK_F, m1: US_M, m2: UK_M, w1: US_F, w2: UK_F }
const LABEL = { narrator: 'Narrator', m1: 'Man', m2: 'Man', w1: 'Woman', w2: 'Woman' }

// ────────────────────────────────────────────────────────────────────────────
// 第1部 — 会話の内容一致選択 (15 items, Q1–15)
// Conversation (3–6 turns) + spoken question at the end. The question and the
// 4 options ARE printed. Keys: C A D B A C D B D A B C A D B.
// ────────────────────────────────────────────────────────────────────────────
const PART1 = [
  { // 1 — work / environment — key C
    lines: [
      ['w1', 'Mark, did you hear? The office is starting a new recycling program next month.'],
      ['m1', "Yes, I saw the e-mail. We'll need to separate paper, plastic, and cans."],
      ['w1', 'Right. The manager asked me to find someone to put up the information posters.'],
      ['m1', "I can do that. I'll print them out and put them up this afternoon."],
    ],
    question: 'What will the man do this afternoon?',
    options: [
      ['A', 'Send an e-mail to the manager.', false],
      ['B', 'Buy new recycling bins.', false],
      ['C', 'Put up some posters.', true],
      ['D', 'Collect paper and cans.', false],
    ],
  },
  { // 2 — travel — key A
    lines: [
      ['m2', "Excuse me, I'd like to rent a bicycle so I can ride along the coast until evening. How much is that?"],
      ['w2', "A full day is fifteen dollars. If you bring it back by noon, it's only eight."],
      ['m2', "I'll need it all day, then. Here's my ID."],
    ],
    question: 'What does the man want to do?',
    options: [
      ['A', 'Ride a bicycle along the coast.', true],
      ['B', 'Return his bicycle by noon.', false],
      ['C', 'Take a bus tour of the coast.', false],
      ['D', 'Buy a secondhand bicycle.', false],
    ],
  },
  { // 3 — community — key D
    lines: [
      ['w1', 'Hi, Tom. Are you coming to the river cleanup on Saturday?'],
      ['m1', "I'd like to, but my car is at the repair shop, and the river park is pretty far."],
      ['w1', "Don't worry. Kate is driving, and she has space for one more person."],
      ['m1', 'Great. Could you ask her to pick me up at the station?'],
    ],
    question: 'How will the man get to the river park?',
    options: [
      ['A', 'He will drive his own car.', false],
      ['B', 'He will take a train all the way.', false],
      ['C', 'He will walk from the station.', false],
      ['D', 'He will get a ride from Kate.', true],
    ],
  },
  { // 4 — technology in daily life — key B
    lines: [
      ['m2', 'Honey, my smartphone battery dies so quickly these days.'],
      ['w2', 'Mine did, too. I took it to the shop, and they replaced the battery for thirty dollars.'],
      ['m2', "That's much cheaper than buying a new phone. Was it the shop by the bank?"],
      ['w2', 'Yes. They finished mine in about an hour.'],
    ],
    question: 'What did the woman do about her phone?',
    options: [
      ['A', 'She bought a new one.', false],
      ['B', 'She had the battery replaced.', true],
      ['C', 'She borrowed her husband’s phone.', false],
      ['D', 'She sold it to a shop near the bank.', false],
    ],
  },
  { // 5 — work — key A
    lines: [
      ['w2', 'Mr. Davis, the clients from Hillside Foods just called. They want to move tomorrow’s meeting to Friday.'],
      ['m1', "Friday? I'm visiting the factory that day."],
      ['w2', 'Shall I ask them if Thursday afternoon works instead?'],
      ['m1', "Yes, please. And tell them I'll send the new product samples this week either way."],
    ],
    question: 'What will the woman do next?',
    options: [
      ['A', 'Suggest a different day to the clients.', true],
      ['B', 'Go to the factory with Mr. Davis.', false],
      ['C', 'Send some product samples.', false],
      ['D', 'Order food from Hillside Foods.', false],
    ],
  },
  { // 6 — environment / daily life — key C
    lines: [
      ['m2', 'Wow, your electricity bill is so low. How do you manage that?'],
      ['w1', 'I put solar panels on my roof last year. They make most of the power I use.'],
      ['m2', "Weren't they expensive?"],
      ['w1', "Yes, but the city paid part of the cost, and I'll save money over time."],
    ],
    question: "Why is the woman's electricity bill low?",
    options: [
      ['A', 'She uses very few electric devices.', false],
      ['B', 'The city pays her bill every month.', false],
      ['C', 'Her solar panels make most of her power.', true],
      ['D', 'Her house is smaller than the man’s.', false],
    ],
  },
  { // 7 — travel / hotel — key D
    lines: [
      ['w2', 'Welcome to the Lakeview Hotel. How may I help you?'],
      ['m1', 'Hi. I booked a room with a lake view, but my room only looks out at the parking lot.'],
      ['w2', "I'm very sorry, sir. I can move you to a lake-view room on the eighth floor, but it won't be ready until three o'clock."],
      ['m1', "That's fine. I'll leave my luggage here and look around the town until then."],
    ],
    question: "What will the man do until three o'clock?",
    options: [
      ['A', 'Wait in his room.', false],
      ['B', 'Drive around the lake.', false],
      ['C', 'Carry his luggage to the eighth floor.', false],
      ['D', 'Look around the town.', true],
    ],
  },
  { // 8 — community / technology — key B
    lines: [
      ['m2', 'Megumi, the community center is offering free computer classes for older people.'],
      ['w1', 'Really? My grandmother has been wanting to learn how to make video calls.'],
      ['m2', 'The classes start next week. They say places fill up quickly, though.'],
      ['w1', "Then I'll sign her up online tonight."],
    ],
    question: 'What will the woman do tonight?',
    options: [
      ['A', 'Teach her grandmother to use a computer.', false],
      ['B', 'Sign her grandmother up for a class.', true],
      ['C', 'Make a video call to the community center.', false],
      ['D', 'Take a free computer class herself.', false],
    ],
  },
  { // 9 — work / phone message — key D
    lines: [
      ['w1', 'Hello, this is Sarah Miller from Apex Design. May I speak to Mr. Brown, please?'],
      ['m1', "I'm afraid he's in a meeting until four. Can I take a message?"],
      ['w1', 'Yes, please. Could you tell him that the posters he ordered are ready?'],
      ['m1', 'The posters. Anything else?'],
      ['w1', "He can pick them up anytime before seven tonight. We're on the second floor of the Garden Building."],
      ['m1', "Certainly. I'll let him know as soon as the meeting ends."],
    ],
    question: 'Why did the woman call?',
    options: [
      ['A', 'To order some posters.', false],
      ['B', 'To change a meeting time.', false],
      ['C', 'To ask for directions to an office.', false],
      ['D', 'To say that an order is ready.', true],
    ],
  },
  { // 10 — technology / commuting — key A
    lines: [
      ['m2', 'Kenji told me he stopped driving to work. He takes the train and rents an electric scooter for the last part.'],
      ['w2', 'An electric scooter? Is that faster than driving?'],
      ['m2', "About the same, he says, but it's cheaper than parking downtown, and he doesn't get stuck in traffic."],
      ['w2', 'Maybe I should try that, too. Parking near my office costs a fortune.'],
    ],
    question: 'Why did Kenji stop driving to work?',
    options: [
      ['A', 'To save money and avoid traffic.', true],
      ['B', 'Because his car broke down.', false],
      ['C', 'Because the train is much faster.', false],
      ['D', 'To get more exercise every day.', false],
    ],
  },
  { // 11 — travel / sightseeing — key B
    lines: [
      ['w2', "Excuse me. Two tickets for the three-thirty castle tour, please."],
      ['m2', "I'm sorry, but the three-thirty tour is sold out. We have spaces on the five o'clock tour."],
      ['w2', "Five o'clock? Our bus leaves at six, so that's too late. Is there anything shorter?"],
      ['m2', "There's a thirty-minute garden tour at four. You'd be back in time."],
      ['w2', "Perfect. We'll take that one."],
    ],
    question: "What will the woman do at four o'clock?",
    options: [
      ['A', 'Take a castle tour.', false],
      ['B', 'Join a garden tour.', true],
      ['C', 'Get on her bus.', false],
      ['D', 'Buy tickets for the next day.', false],
    ],
  },
  { // 12 — environment / shopping — key C
    lines: [
      ['m1', "Did you read about the new rule? Big stores can't give out free plastic bags anymore."],
      ['w1', "Yes, it starts in April. I've already bought a few cloth bags to keep in my car."],
      ['m1', 'Good idea. I always forget to bring mine to the store.'],
      ['w1', "You could hang one by your front door. Then you'll see it on your way out."],
    ],
    question: 'What does the woman suggest the man do?',
    options: [
      ['A', 'Buy some plastic bags in April.', false],
      ['B', 'Keep cloth bags in his car.', false],
      ['C', 'Hang a bag by his front door.', true],
      ['D', 'Shop at smaller stores instead.', false],
    ],
  },
  { // 13 — work / commuting — key A
    lines: [
      ['w1', "How's your new job at the airport going, Steve?"],
      ['m2', 'I like it, but my schedule changes every week. Sometimes I start at five in the morning.'],
      ['w1', "Five? That sounds hard. How do you get there? The trains aren't running that early."],
      ['m2', 'The company runs a small bus for early-shift workers. It picks me up near my apartment.'],
    ],
    question: 'How does the man get to work for early shifts?',
    options: [
      ['A', 'He takes a company bus.', true],
      ['B', 'He takes the first train.', false],
      ['C', 'He drives his own car.', false],
      ['D', 'A coworker picks him up.', false],
    ],
  },
  { // 14 — technology / recycling — key D
    lines: [
      ['m1', "Mom, can we get rid of the old printer in the hallway? Nobody's used it for years."],
      ['w2', "I guess so, but we can't just throw it away with the regular trash."],
      ['m1', 'The electronics store in the mall takes old machines for recycling. I saw a sign last week.'],
      ['w2', "Oh, good. Let's take it there on Saturday when we go shopping."],
    ],
    question: 'What will they do with the old printer?',
    options: [
      ['A', 'Sell it at the mall.', false],
      ['B', 'Throw it away with the trash.', false],
      ['C', 'Give it to a neighbor.', false],
      ['D', 'Take it to a store for recycling.', true],
    ],
  },
  { // 15 — community / town news — key B
    lines: [
      ['w2', 'Hi, Dan. I heard the city is going to build a new library next to the station.'],
      ['m2', "Actually, the plan changed. They're going to fix up the old library instead and add a café."],
      ['w2', 'Really? Why?'],
      ['m2', 'Building a new one was too expensive. The newspaper said the work will be finished next spring.'],
    ],
    question: 'What will the city do?',
    options: [
      ['A', 'Build a new library by the station.', false],
      ['B', 'Repair the old library.', true],
      ['C', 'Open a café inside the station.', false],
      ['D', 'Close the old library next spring.', false],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 第2部 — 文の内容一致選択 (15 items, Q16–30)
// 60–90-word monologue/passage + spoken question at the end. The question and
// the 4 options ARE printed. Keys: B D A C B A D C A D B C D A C.
// ────────────────────────────────────────────────────────────────────────────
const PART2 = [
  { // 16 — work / environment — key B
    speaker: 'w1',
    text: 'Maya works for a clothing company in Vancouver. Last year, she learned that her company was throwing away large amounts of leftover cloth from its factories. Maya suggested using the cloth to make small items, such as shopping bags and pencil cases. Her boss liked the idea, and the items went on sale this spring. They have become popular with customers who care about the environment.',
    question: 'What did Maya suggest that her company do?',
    options: [
      ['A', 'Open a new factory in Vancouver.', false],
      ['B', 'Make small items from leftover cloth.', true],
      ['C', 'Sell its cloth to other companies.', false],
      ['D', 'Stop producing shopping bags.', false],
    ],
  },
  { // 17 — travel / airport announcement — key D
    speaker: 'm2',
    text: "Attention, passengers on Flight 472 to Sydney. Because of strong winds, the departure time has been changed from two-fifteen to four o'clock. We apologize for the delay. Passengers can receive a free drink coupon at the service counter next to Gate 12. Please stay near the gate area, as boarding may begin earlier if the weather improves. Thank you for your patience.",
    question: 'Why has the flight been delayed?',
    options: [
      ['A', 'The airplane needs repairs.', false],
      ['B', 'The crew arrived late.', false],
      ['C', 'The airport is too crowded.', false],
      ['D', 'The weather is bad.', true],
    ],
  },
  { // 18 — technology in daily life — key A
    speaker: 'w2',
    text: 'Hiroshi lives alone in a small town. Last Christmas, his daughter gave him a smart speaker that answers questions when he talks to it. At first, Hiroshi thought he would never use it. Now, however, he asks it about the weather every morning and uses it to play his favorite songs while cooking. He says the house feels less quiet with it.',
    question: 'What does Hiroshi do with the smart speaker every morning?',
    options: [
      ['A', 'He asks it about the weather.', true],
      ['B', 'He watches cooking videos.', false],
      ['C', 'He calls his daughter.', false],
      ['D', 'He listens to the news.', false],
    ],
  },
  { // 19 — community / festival announcement — key C
    speaker: 'm1',
    text: 'Good afternoon, everyone, and welcome to the Riverside Community Festival. The cooking contest will begin at one o’clock on the main stage, so please come early to get a good seat. Also, the face-painting corner for children has moved from the east entrance to the tent beside the fountain because of the hot weather. Free drinking water is available at every information desk. Enjoy the festival.',
    question: 'Where is the face-painting corner now?',
    options: [
      ['A', 'At the east entrance.', false],
      ['B', 'On the main stage.', false],
      ['C', 'In a tent beside the fountain.', true],
      ['D', 'At an information desk.', false],
    ],
  },
  { // 20 — work / health — key B
    speaker: 'w2',
    text: 'Carla is a nurse at a city hospital. For five years, she drove forty minutes to work, and she often felt tired before her shift even started. Last month, she moved to an apartment just ten minutes’ walk from the hospital. She sleeps longer in the mornings now, and in the evenings she has time to attend a yoga class. Carla says she feels much healthier these days.',
    question: 'Why did Carla often feel tired in the past?',
    options: [
      ['A', 'Her shifts at the hospital were too long.', false],
      ['B', 'She had a long drive to work.', true],
      ['C', 'Her yoga class finished late at night.', false],
      ['D', 'Her apartment was noisy at night.', false],
    ],
  },
  { // 21 — travel / tour guide — key A
    speaker: 'm2',
    text: "Welcome to the Old Harbor Walking Tour. Before we start, here are a few points. The tour takes about ninety minutes and ends at the maritime museum. Today, the lighthouse is closed for painting, so we will visit the fish market instead. Photography is welcome everywhere except inside the museum's special exhibition room. If you get separated from the group, please wait at the clock tower.",
    question: 'What will the group do instead of visiting the lighthouse?',
    options: [
      ['A', 'Visit the fish market.', true],
      ['B', 'Spend more time at the museum.', false],
      ['C', 'Take photos at the clock tower.', false],
      ['D', 'Watch a painting demonstration.', false],
    ],
  },
  { // 22 — environment / food waste — key D
    speaker: 'w1',
    text: "Ben's town had a problem with food waste. Restaurants threw away vegetables that looked strange but were safe to eat. Ben, who runs a small soup shop, started buying these vegetables from local farms at low prices. His soups taste the same as before, but they cost him less to make. Other restaurants in town heard about his idea, and now five of them buy strange-looking vegetables, too.",
    question: 'What did Ben start doing?',
    options: [
      ['A', 'Growing vegetables behind his shop.', false],
      ['B', 'Selling soup to local farmers.', false],
      ['C', 'Teaching cooking classes in town.', false],
      ['D', 'Buying strange-looking vegetables from farms.', true],
    ],
  },
  { // 23 — work / staff announcement — key C
    speaker: 'm1',
    text: "Good morning, everyone. Before we open the store, I have two announcements. First, the summer sale starts this Friday, so we'll be busier than usual, and extra staff from the Westside branch will help us on the weekend. Second, the staff parking lot will be repaired next week. During that time, please park in the lot behind the post office and bring your parking ticket to the office to get your money back.",
    question: 'What should staff do while the parking lot is repaired?',
    options: [
      ['A', 'Park at the Westside branch.', false],
      ['B', 'Take the bus to work.', false],
      ['C', 'Use the lot behind the post office.', true],
      ['D', 'Come to work earlier than usual.', false],
    ],
  },
  { // 24 — technology / shopping app — key A
    speaker: 'w2',
    text: "Rika's family started using a shopping app that shows which supermarkets have discounts each day. At first, Rika's father thought it was a waste of time. However, the family saved over fifty dollars in the first month, so he changed his mind. Now he checks the app himself before he goes shopping and even tells his coworkers about the best deals.",
    question: "Why did Rika's father change his mind about the app?",
    options: [
      ['A', 'His family saved money by using it.', true],
      ['B', 'His coworkers told him to try it.', false],
      ['C', 'It was faster than going to stores.', false],
      ['D', 'A supermarket recommended it.', false],
    ],
  },
  { // 25 — community / volunteer kitchen — key D
    speaker: 'm2',
    text: 'Every Wednesday evening, volunteers gather at the Brookfield Community Kitchen. They cook meals using vegetables and bread that local stores cannot sell but that are still fresh. The meals are served to anyone in the neighborhood for free. The kitchen began three years ago with just four volunteers. Now, more than thirty people help each week, and the city plans to open a second kitchen next year.',
    question: 'What will happen next year?',
    options: [
      ['A', 'The kitchen will move to a bigger building.', false],
      ['B', 'Local stores will start selling the meals.', false],
      ['C', 'The volunteers will charge for meals.', false],
      ['D', 'A second kitchen will open.', true],
    ],
  },
  { // 26 — travel / cycling trip — key B
    speaker: 'w1',
    text: 'Last summer, Naoto traveled around Hokkaido by bicycle for two weeks. He planned to camp every night to save money. However, halfway through the trip, it rained for three days, and his tent got completely wet. He stayed at a small guesthouse, where the owner taught him how to cook fresh fish. Naoto says that talking with the guesthouse owner was the best memory of his trip.',
    question: 'Why did Naoto stay at a guesthouse?',
    options: [
      ['A', 'He wanted to learn how to cook.', false],
      ['B', 'His tent got wet in the rain.', true],
      ['C', 'The campsites were all full.', false],
      ['D', 'He hurt his leg while cycling.', false],
    ],
  },
  { // 27 — work / working from home — key C
    speaker: 'm1',
    text: 'Olivia works at a bank in Manchester. Two years ago, her company began letting employees work from home twice a week. Olivia likes this because she saves two hours of travel time on those days. However, she sometimes misses chatting with her teammates, so once a month she organizes a lunch where everyone meets at a restaurant near the office. Her manager says these lunches have made the team friendlier.',
    question: 'What does Olivia do once a month?',
    options: [
      ['A', 'She visits a different branch of the bank.', false],
      ['B', 'She works extra hours at home.', false],
      ['C', 'She organizes a lunch for her team.', true],
      ['D', 'She has a meeting with her manager.', false],
    ],
  },
  { // 28 — environment / city announcement — key D
    speaker: 'w2',
    text: "Here is an announcement from Greenway City Hall. From next month, the city will collect used cooking oil from homes on the first Monday of every month. Please put the oil in a closed plastic bottle and leave it at your usual trash collection point. The oil will be turned into fuel for the city's buses. For more information, please visit the city website or call City Hall.",
    question: 'What will the city do with the used cooking oil?',
    options: [
      ['A', 'Sell it to local restaurants.', false],
      ['B', 'Use it to clean the buses.', false],
      ['C', 'Turn it into soap.', false],
      ['D', 'Make fuel for city buses.', true],
    ],
  },
  { // 29 — technology / museum news — key A
    speaker: 'm2',
    text: 'This is Radio Northfield with some local news. The Northfield Science Museum has introduced a new audio guide that visitors can use on their own smartphones. Visitors simply scan a code at the entrance, choose from six languages, and listen as they walk around. The museum decided to create the guide because the number of visitors from overseas has doubled in the past three years. The guide is free with a regular ticket.',
    question: 'Why did the museum create the new audio guide?',
    options: [
      ['A', 'The number of overseas visitors has grown.', true],
      ['B', 'Visitors complained about the old guide.', false],
      ['C', 'The museum wanted to sell more tickets.', false],
      ['D', 'The city asked the museum to do it.', false],
    ],
  },
  { // 30 — community / education — key C
    speaker: 'w1',
    text: 'Kenta is a high school teacher in Nagano. Last year, he noticed that many of his students did not know much about jobs in their own town. He started a program in which local workers, such as farmers, nurses, and engineers, visit the school to talk about their work. The students enjoy asking the visitors questions. Thanks to the program, some students have become interested in working in Nagano after graduation.',
    question: "What happens in Kenta's program?",
    options: [
      ['A', 'Students visit farms in Nagano.', false],
      ['B', 'Teachers learn about new jobs.', false],
      ['C', 'Local workers talk to students at school.', true],
      ['D', 'Students take part-time jobs in town.', false],
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
  const dir = mkdtempSync(join(tmpdir(), 'eiken-g2-'))
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
    .from('exam_tracks').select('id').eq('slug', 'eiken-grade-2').single()
  if (trackErr || !track) throw new Error('Track eiken-grade-2 not found — run add-practice-tests.sql first.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'EIKEN Grade 2 — Listening Mock Test 1', title_ja: '英検2級 リスニング模試1',
    mode: 'full_mock', time_limit_seconds: 1500, published: false,
    set_slug: 'eiken-g2-mock-01', set_title: 'EIKEN Grade 2 — Mock Test 1',
    set_title_ja: '英検2級 模試1', set_order: 2,
  })

  // ── 第1部: Conversation comprehension ──
  let sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: '第1部', title: 'Conversation Comprehension (会話の内容一致選択)',
    instructions: 'Listen to the conversation and the question, then choose the best answer from the four printed choices (A–D). Everything is heard only once.',
    order_index: 0,
  })
  for (const [i, item] of PART1.entries()) {
    const num = i + 1
    process.stdout.write(`第1部 — item ${num}/15 (Q${num}): audio… `)
    const turns = item.lines.map(([speaker, text], li) => ({
      speaker, text, gap: li === item.lines.length - 1 ? QUESTION_GAP : TURN_GAP,
    }))
    const lines = [
      { speaker: 'narrator', text: `Number ${num}.`, gap: TURN_GAP },
      ...turns,
      { speaker: 'narrator', text: `Question: ${item.question}`, gap: 0.3 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p1-${num}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, item.question, item.options)
    console.log('done.')
  }

  // ── 第2部: Passage comprehension ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: '第2部', title: 'Passage Comprehension (文の内容一致選択)',
    instructions: 'Listen to the short passage and the question, then choose the best answer from the four printed choices (A–D). Everything is heard only once.',
    order_index: 1,
  })
  for (const [i, item] of PART2.entries()) {
    const num = 16 + i
    process.stdout.write(`第2部 — item ${i + 1}/15 (Q${num}): audio… `)
    const lines = [
      { speaker: 'narrator', text: `Number ${num}.`, gap: TURN_GAP },
      { speaker: item.speaker, text: item.text, gap: QUESTION_GAP },
      { speaker: 'narrator', text: `Question: ${item.question}`, gap: 0.3 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p2-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, item.question, item.options)
    console.log('done.')
  }

  console.log(`\n✓ Seeded ${FORM_SLUG} — 30 listening questions (第1部:15 第2部:15). UNPUBLISHED (draft).`)
  console.log('  All options are printed (no spoken-option parts in Grade 2).')
  console.log('  Publish after review: update test_forms set published = true where slug = \'' + FORM_SLUG + '\'')
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
