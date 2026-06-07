/**
 * Full-length TOEIC L&R LISTENING mock 3 — 100 questions, 4 parts, full_mock.
 *
 *   Part 1 —  6 photographs (image + 4 spoken statements; options NOT printed)
 *   Part 2 — 25 question-response (question + 3 spoken responses; NOT printed)
 *   Part 3 — 13 conversations × 3 printed questions (Q32–70)
 *   Part 4 — 10 talks × 3 printed questions (Q71–100)
 *
 * Entirely fresh content vs Mocks 1–2 (no scenario overlap) and balanced
 * answer keys (P1 spread A–D, P2 ≈ 8/9/8 across A/B/C, P3/P4 spread A–D
 * evenly). Seeded UNPUBLISHED (draft for review).
 *
 * Generates every clip with ElevenLabs (US + UK voices, TOEIC-style accent
 * mix), uploads to the private test-assets bucket and seeds the form. Part 1
 * photos are attached SEPARATELY once you have the images — see
 * supabase/TOEIC-PART1-PHOTOS-03.md and scripts/attach-toeic-part1-images-03.mjs.
 * The form works without them (questions render; the picture area is empty).
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-toeic-listening-full-03.mjs
 * Re-running REFRESHES the form (deletes + regenerates everything).
 * Set TTS_CACHE_DIR=… to cache generated segments so an interrupted run
 * resumes without re-billing already-generated lines.
 * Set PRECACHE_ONLY=1 to ONLY generate the TTS segments into the cache —
 * no uploads, no DB writes. Useful to warm the cache in short bursts, then
 * do one fast full run.
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
const FORM_SLUG = 'toeic-lr-listening-mock-03'
const MODEL = 'eleven_v3'
const STABILITY = 0.5

// TOEIC uses a mix of accents (US / UK / AU / CA). We use the four voices
// already used elsewhere in the project: two US, two UK.
const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const VOICE = { narrator: US_F, m1: US_M, m2: UK_M, w1: US_F, w2: UK_F }
const LABEL = { narrator: 'Narrator', m1: 'Man', m2: 'Man', w1: 'Woman', w2: 'Woman' }

// ────────────────────────────────────────────────────────────────────────────
// PART 1 — Photographs (6 items, Q1–6)
// audio: "Number N." + statements A–D. Printed options are letter-only.
// Correct keys: B D A C A D (A×2, B×1, C×1, D×2 — no letter more than twice).
// ────────────────────────────────────────────────────────────────────────────
const PART1 = [
  {
    image: `images/${FORM_SLUG}-p1-1.jpg`,
    photo: 'A florist standing at a shop window, arranging flowers in a window display. Buckets of cut flowers are visible inside the shop.',
    statements: [
      ['A', 'A woman is watering some plants.', false],
      ['B', 'A woman is arranging flowers in a window.', true],
      ['C', 'Some flowers are being loaded into a van.', false],
      ['D', 'A woman is sweeping the shop floor.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-2.jpg`,
    photo: 'A chef in a white uniform standing at a stainless-steel counter in a restaurant kitchen, carefully arranging food on a plate.',
    statements: [
      ['A', 'A chef is chopping some vegetables.', false],
      ['B', 'Some dishes are being washed in a sink.', false],
      ['C', 'A waiter is taking an order.', false],
      ['D', 'A chef is arranging food on a plate.', true],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-3.jpg`,
    photo: 'Commuters stepping through the open doors of a train stopped at a station platform.',
    statements: [
      ['A', 'Some people are boarding a train.', true],
      ['B', 'Passengers are buying tickets from a machine.', false],
      ['C', 'A train is departing from the station.', false],
      ['D', 'Some people are walking up a staircase.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-4.jpg`,
    photo: 'A gardener using hedge trimmers to trim a tall hedge alongside a garden path.',
    statements: [
      ['A', 'A man is mowing a lawn.', false],
      ['B', 'A man is raking some leaves.', false],
      ['C', 'A man is trimming a hedge.', true],
      ['D', 'A man is planting some flowers.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-5.jpg`,
    photo: 'A receptionist behind a front desk handing a visitor badge to a man in a suit in an office lobby.',
    statements: [
      ['A', 'A woman is handing a man a badge.', true],
      ['B', 'A man is signing a document.', false],
      ['C', 'A woman is talking on the telephone.', false],
      ['D', 'Some visitors are seated in a lobby.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-6.jpg`,
    photo: 'Two movers in work clothes loading a sofa into the back of a moving truck parked at the curb.',
    statements: [
      ['A', 'Some furniture is being assembled.', false],
      ['B', 'A truck is being repaired.', false],
      ['C', 'Some men are wrapping a sofa in plastic.', false],
      ['D', 'Some furniture is being loaded into a truck.', true],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 2 — Question–Response (25 items, Q7–31)
// audio: "Number N." + question + responses A/B/C. Printed options letter-only.
// q = [voice of question, question text]; r = [[A text, correct], [B...], [C...]]
// Correct keys: C A B B C A C B A B A C B A C C B A B C A B C A B (A:8 B:9 C:8).
// ────────────────────────────────────────────────────────────────────────────
const PART2 = [
  { q: ['m1', 'Why is this invoice fifty dollars more than the quote?'], r: [['By credit card, please.', false], ['Yes, it was delivered yesterday.', false], ['They added a charge for express shipping.', true]] },
  { q: ['w2', 'What time is the courier coming to pick up these packages?'], r: [['Between three and four, usually.', true], ['Three large boxes.', false], ['To the Berlin office.', false]] },
  { q: ['m2', 'How do I reset my email password?'], r: [['It’s a very secure system.', false], ['There’s a link on the login page.', true], ['Yes, I emailed her this morning.', false]] },
  { q: ['w1', 'Is there visitor parking at your building?'], r: [['He arrived by taxi.', false], ['Yes, behind the main entrance.', true], ['The visit went very well.', false]] },
  { q: ['m1', 'How many people should I tell the caterer to expect?'], r: [['A vegetarian option, please.', false], ['In the banquet hall.', false], ['Let’s say forty, to be safe.', true]] },
  { q: ['w2', 'Has the holiday schedule for December been posted yet?'], r: [['Yes, it went up this morning.', true], ['A two-week vacation.', false], ['In late December, I think.', false]] },
  { q: ['m2', 'Did anyone turn in a black umbrella yesterday?'], r: [['It’s supposed to rain again tomorrow.', false], ['I left at five o’clock.', false], ['Let me check the lost-and-found box.', true]] },
  { q: ['w1', 'When will my new business cards be ready?'], r: [['Two hundred and fifty.', false], ['The printer promised them by Thursday.', true], ['On heavier paper.', false]] },
  { q: ['m1', 'What day does the new accountant start?'], r: [['A week from Monday.', true], ['In the finance department.', false], ['She has ten years of experience.', false]] },
  { q: ['w2', 'Could you make a dinner reservation for the clients on Friday?'], r: [['The fish was excellent.', false], ['Of course — how many people?', true], ['They arrived on Thursday.', false]] },
  { q: ['m2', 'Where do we keep the spare toner cartridges?'], r: [['In the supply room, bottom shelf.', true], ['It prints in colour.', false], ['About once a month.', false]] },
  { q: ['w1', 'Would you prefer the conference call at nine or at eleven?'], r: [['It lasted an hour.', false], ['On the speakerphone.', false], ['Eleven — I have another meeting at nine.', true]] },
  { q: ['m1', 'Who’s picking up the clients from the airport?'], r: [['Flight three oh two.', false], ['Daniel offered to drive.', true], ['At the international terminal.', false]] },
  { q: ['w2', 'These new chairs are much more comfortable, aren’t they?'], r: [['Yes, much better than the old ones.', true], ['Please have a seat.', false], ['In the meeting room.', false]] },
  { q: ['m2', 'Why has the staff entrance been locked all morning?'], r: [['With a key card.', false], ['At eight o’clock.', false], ['They’re repaving the walkway outside.', true]] },
  { q: ['w1', 'Have you tried the new sandwich shop on the corner?'], r: [['A ham and cheese, please.', false], ['It opens at seven.', false], ['Not yet, but I’ve heard good things.', true]] },
  { q: ['m1', 'Should we print the handouts in colour or black and white?'], r: [['Twenty pages each.', false], ['Black and white is fine — it’s just for reference.', true], ['The printer is down the hall.', false]] },
  { q: ['w2', 'Whose mug is this in the sink?'], r: [['I think it’s Priya’s.', true], ['Coffee, please.', false], ['The dishwasher is full.', false]] },
  { q: ['m2', 'Don’t we need to renew the software licence this month?'], r: [['A new laptop.', false], ['Yes, it expires on the thirtieth.', true], ['He works in IT.', false]] },
  { q: ['w1', 'Where can I find the key for the stationery cupboard?'], r: [['Pens and notepads, mostly.', false], ['Every Monday morning.', false], ['Ask the receptionist — she keeps it.', true]] },
  { q: ['m1', 'How did the product demonstration go yesterday?'], r: [['Really well — they asked for a quote.', true], ['At the client’s headquarters.', false], ['A new vacuum cleaner.', false]] },
  { q: ['w2', 'Can I borrow your stapler for a minute?'], r: [['Some paper clips.', false], ['Sure, it’s right here.', true], ['Twenty copies.', false]] },
  { q: ['m2', 'When are they repainting the hallway?'], r: [['A pale green, I think.', false], ['On the second floor.', false], ['Over the weekend, so the smell can clear.', true]] },
  { q: ['w1', 'Why was the morning train so crowded today?'], r: [['There’s a baseball game this afternoon.', true], ['Every ten minutes.', false], ['I usually take the bus.', false]] },
  { q: ['m1', 'You’ve sent the contract to the legal team, haven’t you?'], r: [['A two-year agreement.', false], ['Yes, first thing this morning.', true], ['On the fifth floor.', false]] },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 3 — Conversations (13 × 3 questions, Q32–70). Questions ARE printed.
// Correct keys spread A:9 B:10 C:10 D:10.
// ────────────────────────────────────────────────────────────────────────────
const PART3 = [
  {
    title: 'Conversation 1', first: 32,
    lines: [
      ['w1', 'Hi, is this the IT helpdesk? My laptop battery has been terrible lately — it goes from full to empty in about an hour, even when I’m just writing emails.'],
      ['m1', 'That sounds like the battery itself is failing — they usually last about three years, and your machine is one of the older models. Can you bring it down to the second floor?'],
      ['w1', 'I have back-to-back meetings until four. Could I drop it off after that?'],
      ['m1', 'Sure. We have replacement batteries in stock, so the swap only takes about twenty minutes. You won’t lose any files, but save your work before you hand it over, just in case.'],
      ['w1', 'Will do. Should I bring anything else?'],
      ['m1', 'Bring the charger as well, please — sometimes a worn cable is part of the problem, so I’d like to test it too.'],
    ],
    questions: [
      { prompt: 'What problem does the woman mention?', options: [['A', 'Her laptop will not turn on', false], ['B', 'Her screen keeps flickering', false], ['C', 'Her emails are not sending', false], ['D', 'Her battery runs out quickly', true]] },
      { prompt: 'According to the man, what is the most likely cause?', options: [['A', 'A software update', false], ['B', 'The battery is old', true], ['C', 'A faulty power outlet', false], ['D', 'Too many open programs', false]] },
      { prompt: 'What does the man ask the woman to bring?', options: [['A', 'Her charger', true], ['B', 'Her ID badge', false], ['C', 'A backup drive', false], ['D', 'Her meeting schedule', false]] },
    ],
  },
  {
    title: 'Conversation 2', first: 35,
    lines: [
      ['w2', 'Hello, I ordered flowers for a wedding on the eighteenth — the name is Park. I’d like to make a change, if it’s not too late.'],
      ['m2', 'Let me pull up the order… here it is. Thirty table arrangements and two large displays for the entrance. What would you like to change?'],
      ['w2', 'The bride has decided she’d prefer white roses instead of pink ones for the entrance displays.'],
      ['m2', 'That’s no problem at all — white roses are actually in season right now, so it’ll bring the price down slightly. I’ll email you a revised invoice this afternoon.'],
      ['w2', 'Wonderful. And just to confirm — you’re delivering everything to the hotel by ten that morning?'],
      ['m2', 'That’s right, and our team will stay to set up the entrance displays as well.'],
    ],
    questions: [
      { prompt: 'Why is the woman calling?', options: [['A', 'To cancel an order', false], ['B', 'To ask about a delivery fee', false], ['C', 'To change an order', true], ['D', 'To complain about some flowers', false]] },
      { prompt: 'What does the man say about white roses?', options: [['A', 'They are more expensive', false], ['B', 'They will lower the price', true], ['C', 'They must be ordered a month ahead', false], ['D', 'They are difficult to find', false]] },
      { prompt: 'What does the man say his team will do?', options: [['A', 'Decorate the wedding tables', false], ['B', 'Contact the hotel directly', false], ['C', 'Photograph the arrangements', false], ['D', 'Set up the entrance displays', true]] },
    ],
  },
  {
    title: 'Conversation 3', first: 38,
    lines: [
      ['m1', 'So, this is the office space I mentioned on the phone — the whole sixth floor, just over four hundred square metres. The previous tenant moved out last month.'],
      ['w1', 'It’s much bigger than our current place, that’s for sure. We have thirty-five staff now, and we’re hiring ten more next year.'],
      ['m1', 'Then this should fit comfortably. There’s a server room at the back, and the lease includes twelve parking spaces in the basement.'],
      ['w1', 'Good. My one concern is the train noise — we’re right next to the line, aren’t we?'],
      ['m1', 'The windows were replaced with double glazing two years ago. Why don’t we pause and just listen for a minute? A train is due about now.'],
      ['w1', 'Fair enough. If it’s quiet, I’ll bring our managing director to see the place on Thursday.'],
    ],
    questions: [
      { prompt: 'Who most likely is the man?', options: [['A', 'A real estate agent', true], ['B', 'An architect', false], ['C', 'A moving-company employee', false], ['D', 'A construction worker', false]] },
      { prompt: 'What is the woman concerned about?', options: [['A', 'The size of the office', false], ['B', 'The cost of the lease', false], ['C', 'The number of parking spaces', false], ['D', 'Noise from a train line', true]] },
      { prompt: 'What does the woman say she may do on Thursday?', options: [['A', 'Sign the lease', false], ['B', 'Measure the office', false], ['C', 'Return with her managing director', true], ['D', 'Meet the previous tenant', false]] },
    ],
  },
  {
    title: 'Conversation 4', first: 41,
    lines: [
      ['m2', 'Excuse me, my flight to Denver was just cancelled — the board says it’s because of the storm. What are my options?'],
      ['w2', 'Yes, I’m sorry — everything into Denver is grounded until this evening. I can put you on the nine p.m. flight tonight, or the seven a.m. one tomorrow.'],
      ['m2', 'I’m giving a presentation at ten tomorrow morning, so tonight, please.'],
      ['w2', 'Done — seat fourteen C. Since the cancellation was weather-related, we can’t cover a hotel, but here’s a meal voucher you can use at any restaurant in the terminal.'],
      ['m2', 'I see. And will my suitcase transfer automatically?'],
      ['w2', 'It will — it’s already tagged through to the new flight. You can check its status on our mobile app, by the way.'],
    ],
    questions: [
      { prompt: 'Why was the man’s flight cancelled?', options: [['A', 'A mechanical problem', false], ['B', 'Bad weather', true], ['C', 'A crew shortage', false], ['D', 'A computer failure', false]] },
      { prompt: 'Why does the man choose the evening flight?', options: [['A', 'He has a presentation in the morning', true], ['B', 'It is less expensive', false], ['C', 'He prefers flying at night', false], ['D', 'The morning flight is full', false]] },
      { prompt: 'What does the woman give the man?', options: [['A', 'A hotel voucher', false], ['B', 'An upgraded seat', false], ['C', 'A meal voucher', true], ['D', 'A luggage tag', false]] },
    ],
  },
  {
    title: 'Conversation 5', first: 44,
    lines: [
      ['w1', 'Hi, this is Naomi Reed at Calder Industries. I’d like to book lunch for our board meeting next Wednesday — twelve people, in our ninth-floor boardroom.'],
      ['m1', 'We can certainly do that. Our executive buffet is the most popular choice for board meetings — sandwiches, two salads, and a fruit platter.'],
      ['w1', 'That sounds right. One thing — our chairman has a nut allergy, so nothing with nuts, please.'],
      ['m1', 'Noted. We’ll prepare everything nut-free in a separate area of the kitchen. What time should we set up?'],
      ['w1', 'The meeting breaks at twelve thirty, so everything should be ready by twelve fifteen.'],
      ['m1', 'No problem. I’ll send the confirmation and the invoice to your email today.'],
    ],
    questions: [
      { prompt: 'What is the woman arranging?', options: [['A', 'A retirement party', false], ['B', 'A client dinner', false], ['C', 'A staff picnic', false], ['D', 'Lunch for a board meeting', true]] },
      { prompt: 'What does the woman ask the man to do?', options: [['A', 'Add another salad', false], ['B', 'Provide vegetarian options', false], ['C', 'Avoid using nuts', true], ['D', 'Set up an extra table', false]] },
      { prompt: 'What will the man send today?', options: [['A', 'A menu sample', false], ['B', 'A confirmation and an invoice', true], ['C', 'A delivery schedule', false], ['D', 'A list of ingredients', false]] },
    ],
  },
  {
    title: 'Conversation 6', first: 47,
    lines: [
      ['m2', 'Hi Carla, it’s Stefan at Holt and Webb. Our photocopier lease runs out at the end of next month, and I wanted to talk about renewing.'],
      ['w2', 'Good timing — there’s a new model out that scans double-sided automatically and uses about thirty percent less toner.'],
      ['m2', 'Interesting. Would switching models change the monthly rate, though? Our budget hasn’t moved.'],
      ['w2', 'If you sign a three-year lease instead of two, the monthly cost stays exactly the same, and we’d include the maintenance plan for free.'],
      ['m2', 'That could work. Could you send me the details in writing? I need to show our finance team before I can agree to anything.'],
      ['w2', 'Of course — I’ll put together a proposal and have it to you by tomorrow morning.'],
    ],
    questions: [
      { prompt: 'Why is the man calling?', options: [['A', 'To discuss renewing a lease', true], ['B', 'To report a broken photocopier', false], ['C', 'To order more toner', false], ['D', 'To cancel a contract', false]] },
      { prompt: 'What does the woman say about the new model?', options: [['A', 'It prints faster', false], ['B', 'It uses less toner', true], ['C', 'It takes up less space', false], ['D', 'It costs less per month', false]] },
      { prompt: 'What does the man ask the woman to do?', options: [['A', 'Lower the monthly rate', false], ['B', 'Call the finance team', false], ['C', 'Extend the current lease', false], ['D', 'Send a written proposal', true]] },
    ],
  },
  {
    title: 'Conversation 7', first: 50,
    lines: [
      ['m1', 'Hello, this is Owen Marsh. I have a cleaning booked for Thursday at nine, but something’s come up at work and I need to move it.'],
      ['w1', 'Let me see what we have… Dr. Lin is fully booked on Friday, but there’s an opening Monday at eight thirty or Wednesday at four.'],
      ['m1', 'Monday at eight thirty works. Is the appointment still with Dr. Lin?'],
      ['w1', 'It is. Oh, and our records show you’re due for X-rays this visit — that adds about fifteen minutes, so plan to be here until around nine thirty.'],
      ['m1', 'Understood. Do I need to do anything beforehand?'],
      ['w1', 'Just bring your updated insurance card if you’ve received the new one — the one on file expires this month.'],
    ],
    questions: [
      { prompt: 'Why is the man calling?', options: [['A', 'To cancel his insurance', false], ['B', 'To ask about some X-ray results', false], ['C', 'To reschedule an appointment', true], ['D', 'To register as a new patient', false]] },
      { prompt: 'Why will the appointment take longer than usual?', options: [['A', 'X-rays will be taken', true], ['B', 'A new dentist is starting', false], ['C', 'Some paperwork must be completed', false], ['D', 'The clinic is short-staffed', false]] },
      { prompt: 'What is the man asked to bring?', options: [['A', 'A referral letter', false], ['B', 'An insurance card', true], ['C', 'A payment receipt', false], ['D', 'His appointment slip', false]] },
    ],
  },
  {
    title: 'Conversation 8', first: 53,
    lines: [
      ['w2', 'Hi, I’m calling about the sofa I bought on Saturday — order six six three one. The delivery is set for tomorrow, but no one gave me a time.'],
      ['m2', 'Let me check the route… you’re currently down for sometime between nine and six, but I can narrow that. The driver will be in your area in the afternoon — let’s say between two and five.'],
      ['w2', 'That’s still a wide window. Is there any way to get a call before they arrive?'],
      ['m2', 'Absolutely — I’ll add a note for the driver to phone you thirty minutes ahead. Also, please make sure the hallway is clear; the sofa comes in one piece, and it’s quite wide.'],
      ['w2', 'Good point. I’ll move the bookshelf by the door tonight.'],
      ['m2', 'Perfect. And keep your order number handy in case you need to call back.'],
    ],
    questions: [
      { prompt: 'Why is the woman calling?', options: [['A', 'To cancel an order', false], ['B', 'To report a damaged sofa', false], ['C', 'To change a delivery address', false], ['D', 'To ask about a delivery time', true]] },
      { prompt: 'What does the man say the driver will do?', options: [['A', 'Assemble the sofa', false], ['B', 'Arrive in the morning', false], ['C', 'Call thirty minutes in advance', true], ['D', 'Bring the sofa in two pieces', false]] },
      { prompt: 'What will the woman do tonight?', options: [['A', 'Move a bookshelf', true], ['B', 'Measure the hallway', false], ['C', 'Write down her order number', false], ['D', 'Visit the store', false]] },
    ],
  },
  {
    title: 'Conversation 9', first: 56,
    lines: [
      ['m1', 'Morning, Jess. I just looked at the proof for our highway billboard, and the phone number is wrong — it shows our old number, the one we retired in March.'],
      ['w1', 'Oh no, good catch. I must have pulled it from the previous campaign file. I’ll correct it right away.'],
      ['m1', 'Thanks. How does this affect the schedule? The billboard is supposed to go up on the first.'],
      ['w1', 'We’re fine — the printer doesn’t need the final file until Friday. I’ll send you a corrected proof within the hour, and once you approve it, we’re back on track.'],
      ['m1', 'Great. While you’re in there, could you make the website address a little bigger? Drivers only get a few seconds to read it.'],
      ['w1', 'Sure — I’ll enlarge it and make it bold, and you can judge both changes on the new proof.'],
    ],
    questions: [
      { prompt: 'What problem does the man mention?', options: [['A', 'A billboard was damaged', false], ['B', 'A phone number is incorrect', true], ['C', 'A payment is overdue', false], ['D', 'A campaign was cancelled', false]] },
      { prompt: 'What does the woman say about the schedule?', options: [['A', 'The billboard will go up late', false], ['B', 'The printer needs the file today', false], ['C', 'The campaign will be shortened', false], ['D', 'There is still time before the deadline', true]] },
      { prompt: 'What does the man ask the woman to change?', options: [['A', 'The background colour', false], ['B', 'The company logo', false], ['C', 'The size of the website address', true], ['D', 'The product photo', false]] },
    ],
  },
  {
    title: 'Conversation 10', first: 59,
    lines: [
      ['w2', 'Hi Mateo — the results of the cafeteria survey are in. Overall people are happy, but there were two clear themes in the comments.'],
      ['m2', 'Let me guess: the lines at noon?'],
      ['w2', 'That was one, yes. The other was more vegetarian choices — almost a third of respondents asked for at least one meat-free main dish every day.'],
      ['m2', 'That’s very doable. We already do meat-free Mondays; I can extend that to a daily option starting next month. For the lines, what if we opened the salad counter fifteen minutes earlier?'],
      ['w2', 'I think people would love that. Could you write up both changes? I’d like to include them when I email the survey results to everyone.'],
      ['m2', 'Sure — I’ll have a short summary to you by Friday.'],
    ],
    questions: [
      { prompt: 'What are the speakers mainly discussing?', options: [['A', 'The results of a survey', true], ['B', 'The cost of cafeteria meals', false], ['C', 'The hiring of kitchen staff', false], ['D', 'A change to lunch breaks', false]] },
      { prompt: 'What did many survey respondents request?', options: [['A', 'Lower prices', false], ['B', 'More vegetarian dishes', true], ['C', 'Faster service at the register', false], ['D', 'More seating', false]] },
      { prompt: 'What will the man send by Friday?', options: [['A', 'The survey questions', false], ['B', 'A new menu', false], ['C', 'A list of suppliers', false], ['D', 'A summary of the changes', true]] },
    ],
  },
  {
    title: 'Conversation 11', first: 62,
    lines: [
      ['m1', 'Hi Dana — I heard facilities is installing charging stations for electric cars in the parking garage. Is that true?'],
      ['w1', 'It is. Six chargers on level one, ready by the end of the month. We’re finalising the rules for using them now.'],
      ['m1', 'That’s great news — I just ordered an electric car. Will there be a fee to use them?'],
      ['w1', 'Charging will be free for the first year while we see how much they’re used. The main rule is a four-hour limit per car so everyone gets a turn — you’ll book a slot through the parking app.'],
      ['m1', 'Makes sense. How do I get access?'],
      ['w1', 'Send me your licence-plate number and I’ll add you to the system before the chargers go live.'],
    ],
    questions: [
      { prompt: 'What is being installed in the parking garage?', options: [['A', 'Charging stations for electric cars', true], ['B', 'New lighting', false], ['C', 'Security cameras', false], ['D', 'A ticket machine', false]] },
      { prompt: 'What does the woman say about the cost?', options: [['A', 'It will be added to parking fees', false], ['B', 'It depends on the time of day', false], ['C', 'Charging will be free at first', true], ['D', 'Employees will get a discount', false]] },
      { prompt: 'What does the woman ask the man to send?', options: [['A', 'A photo of his car', false], ['B', 'His licence-plate number', true], ['C', 'A booking request', false], ['D', 'A copy of his parking permit', false]] },
    ],
  },
  {
    title: 'Conversation 12', first: 65,
    lines: [
      ['w2', 'Thanks for coming up, Raj. Half our team works from home now, and the people dialling in to meetings say they can’t hear anyone sitting at the far end of this room.'],
      ['m2', 'That’s common — a laptop microphone only picks up about two metres. I’d suggest a ceiling microphone, plus a wide-angle camera that automatically focuses on whoever is speaking.'],
      ['w2', 'How disruptive is the installation? This room is booked almost every day.'],
      ['m2', 'We can do the whole thing in one evening, after six. You’d be ready for meetings the next morning.'],
      ['w2', 'Let’s do it. Could you also run a short training session? People struggle even with the equipment we have now.'],
      ['m2', 'Happy to — I’ll do a fifteen-minute demonstration at your next team meeting.'],
    ],
    questions: [
      { prompt: 'What problem does the woman mention?', options: [['A', 'A room is often double-booked', false], ['B', 'A camera is out of focus', false], ['C', 'Remote participants cannot hear well', true], ['D', 'The internet connection is slow', false]] },
      { prompt: 'What does the man say about the installation?', options: [['A', 'It requires closing the room for a week', false], ['B', 'It must be approved by management', false], ['C', 'It has already been scheduled', false], ['D', 'It can be completed in one evening', true]] },
      { prompt: 'What does the woman ask the man to provide?', options: [['A', 'A training session', true], ['B', 'A cost estimate', false], ['C', 'A spare microphone', false], ['D', 'A list of equipment', false]] },
    ],
  },
  {
    title: 'Conversation 13', first: 68,
    lines: [
      ['m1', 'Excuse me — I think there’s been a mix-up at the coat check. I handed in a grey coat, but this one isn’t mine. Mine has a red scarf in the sleeve.'],
      ['w2', 'Oh, I do apologise. Two grey coats came in around the same time. May I see your ticket again?… Ah, here’s the problem — the number tag on this hook is upside down. Yours is fifty-one, not fifteen.'],
      ['m1', 'That explains it. Is mine still here, then?'],
      ['w2', 'Yes — here it is, scarf and all. And the other visitor hasn’t come back yet, so no harm done. I’m very sorry for the confusion.'],
      ['m1', 'No problem at all. Actually, while I’m here — what time does the gift shop close? I wanted to pick up a catalogue of the glass exhibition.'],
      ['w2', 'It closes with the museum at six, but the catalogue is also sold at the information desk, which stays open half an hour later.'],
    ],
    questions: [
      { prompt: 'Where does the conversation most likely take place?', options: [['A', 'At a clothing store', false], ['B', 'At a museum', true], ['C', 'At a dry cleaner', false], ['D', 'At a hotel', false]] },
      { prompt: 'What caused the mix-up?', options: [['A', 'Two tickets were switched', false], ['B', 'The man lost his ticket', false], ['C', 'A coat was given to another visitor', false], ['D', 'A number tag was upside down', true]] },
      { prompt: 'What does the woman say about the catalogue?', options: [['A', 'It is sold out', false], ['B', 'It is free for members', false], ['C', 'It is also available at the information desk', true], ['D', 'It can be ordered online', false]] },
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 4 — Talks (10 × 3 questions, Q71–100). Questions ARE printed.
// Correct keys spread A:8 B:7 C:7 D:8.
// ────────────────────────────────────────────────────────────────────────────
const PART4 = [
  {
    title: 'Announcement', first: 71, speaker: 'w2', kind: 'announcement',
    text: 'Good afternoon, passengers, and welcome aboard the Coral Bay ferry. Before we depart, please give your attention to this short safety announcement. Life jackets are stored in the white lockers at the end of each row of seats, and a crew member will demonstrate how to put one on in just a moment. While we’re under way, please remain seated as much as possible, and take extra care on the outer stairways, which can be slippery when wet. If you’re travelling with a vehicle, please note that the car deck is closed during the crossing — so take anything you need with you now. We’ll arrive at Harper’s Landing in about forty minutes. Thank you, and enjoy the crossing.',
    questions: [
      { prompt: 'What is the main purpose of the announcement?', options: [['A', 'To explain a delay', false], ['B', 'To give safety information', true], ['C', 'To advertise onboard services', false], ['D', 'To announce a schedule change', false]] },
      { prompt: 'Why should passengers be careful on the stairways?', options: [['A', 'They are being repaired', false], ['B', 'They are narrow', false], ['C', 'They are poorly lit', false], ['D', 'They may be slippery', true]] },
      { prompt: 'What should drivers do now?', options: [['A', 'Take their belongings from their vehicles', true], ['B', 'Move their cars to the upper deck', false], ['C', 'Show their tickets to the crew', false], ['D', 'Put on a life jacket', false]] },
    ],
  },
  {
    title: 'Podcast excerpt', first: 74, speaker: 'm1', kind: 'broadcast',
    text: 'You’re listening to Career Forward. Today’s topic: networking for people who hate networking. Here’s the thing — most of us picture a crowded reception where you hand out business cards to strangers. But research shows the most valuable professional connections usually come from people you already know slightly: former colleagues, old classmates, someone you met once at a workshop. So this week, instead of attending another event, try this: write to two people you haven’t spoken to in over a year. Don’t ask for anything — just share an article they might find useful, or congratulate them on something recent. Small, genuine messages keep a network alive far better than a stack of business cards. After the break, I’ll be talking with a recruiter about what to say when you do need to ask for help.',
    questions: [
      { prompt: 'What is the speaker mainly discussing?', options: [['A', 'How to organise a reception', false], ['B', 'How to design business cards', false], ['C', 'How to maintain professional connections', true], ['D', 'How to apply for jobs', false]] },
      { prompt: 'According to the speaker, where do valuable connections usually come from?', options: [['A', 'People one already knows slightly', true], ['B', 'Crowded networking events', false], ['C', 'Online job boards', false], ['D', 'Professional recruiters', false]] },
      { prompt: 'What does the speaker suggest listeners do this week?', options: [['A', 'Attend a workshop', false], ['B', 'Print new business cards', false], ['C', 'Meet with a recruiter', false], ['D', 'Contact two old acquaintances', true]] },
    ],
  },
  {
    title: 'Radio broadcast', first: 77, speaker: 'w1', kind: 'radio broadcast',
    text: 'In local news, the Riverside Marathon takes place this Sunday, and drivers should plan ahead. Roads along the race route — including Harbor Drive, Mill Street, and the entire waterfront loop — will be closed from six in the morning until about two in the afternoon. City buses will run on detour routes all day, and the number twelve bus will not stop downtown at all. If you’re heading to the airport on Sunday, the city recommends taking the train, as taxis will face long detours. Residents along the route can still leave their driveways before six a.m. or after the final runners pass. For a full map of the closures, visit the city’s website. And if you’re not driving — come out and cheer; over three thousand runners are expected this year.',
    questions: [
      { prompt: 'What event will take place on Sunday?', options: [['A', 'A street festival', false], ['B', 'A marathon', true], ['C', 'A bicycle race', false], ['D', 'A parade', false]] },
      { prompt: 'How does the speaker suggest travelling to the airport on Sunday?', options: [['A', 'By taxi', false], ['B', 'By bus', false], ['C', 'By train', true], ['D', 'By car', false]] },
      { prompt: 'Where can listeners find a map of the road closures?', options: [['A', 'On the city’s website', true], ['B', 'At city hall', false], ['C', 'In the local newspaper', false], ['D', 'At bus stops', false]] },
    ],
  },
  {
    title: 'Excerpt from a meeting', first: 80, speaker: 'm2', kind: 'excerpt from a meeting',
    text: 'Before everyone heads back to their desks, a few words about the new telephone system that goes live on Monday. Your extension numbers stay the same, but there are two changes you need to know about. First, to transfer a call, you’ll now press the star key followed by the extension — not the hash key, which now puts the caller on hold instead. Second, voicemails will no longer be stored on the handset; they’ll arrive in your email inbox as audio files, so you can listen to them anywhere. Your old saved messages will be deleted on Friday, so if there’s anything you need to keep, write it down before then. There’s a one-page quick guide next to every phone, and IT will run drop-in sessions in the training room all next week.',
    questions: [
      { prompt: 'What is the speaker mainly talking about?', options: [['A', 'A new email policy', false], ['B', 'An office relocation', false], ['C', 'Some new staff members', false], ['D', 'A new telephone system', true]] },
      { prompt: 'How will staff receive voicemails after Monday?', options: [['A', 'By email', true], ['B', 'On their handsets', false], ['C', 'Through a mobile app', false], ['D', 'As written transcripts', false]] },
      { prompt: 'What should listeners do before Friday?', options: [['A', 'Update their extension numbers', false], ['B', 'Attend a drop-in session', false], ['C', 'Note down any messages they need to keep', true], ['D', 'Collect a quick guide from IT', false]] },
    ],
  },
  {
    title: 'Speech', first: 83, speaker: 'w2', kind: 'speech',
    text: 'Good evening, everyone, and thank you for joining us for the opening of “Shorelines”, our new exhibition of contemporary coastal photography. Tonight is special for two reasons. First, every one of the forty works you’ll see was taken within fifty kilometres of this gallery — this is very much a portrait of our own coast. Second, the artist, Mira Talbot, grew up just three streets from here, and this is her first exhibition in her home town. Mira will give a short talk in the main room at eight o’clock, and she has kindly agreed to answer questions afterwards. Catalogues are available at the front desk, and twenty percent of tonight’s sales will be donated to the coastal cleanup volunteers you can see in several of the photographs. Please enjoy the exhibition.',
    questions: [
      { prompt: 'What kind of event is taking place?', options: [['A', 'An exhibition opening', true], ['B', 'A book launch', false], ['C', 'A charity auction', false], ['D', 'A photography class', false]] },
      { prompt: 'What does the speaker say about the artist?', options: [['A', 'She lives overseas', false], ['B', 'She teaches photography', false], ['C', 'She has exhibited here before', false], ['D', 'She grew up nearby', true]] },
      { prompt: 'What will happen at eight o’clock?', options: [['A', 'The gallery will close', false], ['B', 'The artist will give a talk', true], ['C', 'A donation will be presented', false], ['D', 'Catalogues will go on sale', false]] },
    ],
  },
  {
    title: 'Telephone message', first: 86, speaker: 'm1', kind: 'telephone message',
    text: 'Hello, this message is for all registered patrons of the Eastgate Public Library; I’m calling with an update about the renovation. The main building will close on the fifth of next month and is expected to reopen in early spring. During the closure, a temporary branch will operate in the community centre on Doyle Street, with a smaller collection but the same opening hours. All current loans have been automatically extended until the temporary branch opens, so there’s no need to rush your books back — and no late fees will be charged during the move. Reserved items can be collected from the temporary branch starting on the eighth. For questions, stay on the line to speak with a librarian, or visit our website. Thank you.',
    questions: [
      { prompt: 'Why will the library close?', options: [['A', 'It is moving to a new city', false], ['B', 'Its funding was reduced', false], ['C', 'It is being renovated', true], ['D', 'It is changing owners', false]] },
      { prompt: 'What does the speaker say about the temporary branch?', options: [['A', 'It opens only on weekends', false], ['B', 'It will keep the same opening hours', true], ['C', 'It has a larger collection', false], ['D', 'It is next to the main building', false]] },
      { prompt: 'What does the speaker say about current loans?', options: [['A', 'They must be returned by the fifth', false], ['B', 'They can only be renewed online', false], ['C', 'They are limited to five items', false], ['D', 'They have been automatically extended', true]] },
    ],
  },
  {
    title: 'Introduction', first: 89, speaker: 'w1', kind: 'talk',
    text: 'Ladies and gentlemen, welcome to the main stage of the Homeware Expo! In five minutes, chef Antonio Reyes will demonstrate the new VersaPro multi-cooker — and he’ll prepare a complete three-course meal in under forty minutes, right here in front of you. While we set up, a couple of notes. Everything chef Reyes cooks today will be offered as free samples at the end of the demonstration — we just ask that you stay in your seats until the serving staff come around. Also, everyone in the audience today will receive a voucher for twenty percent off the multi-cooker at the company booth — that’s booth one fifteen, near the west entrance. The voucher is valid today and tomorrow only. Now, please put your hands together for chef Antonio Reyes!',
    questions: [
      { prompt: 'Where is the talk most likely taking place?', options: [['A', 'At a trade show', true], ['B', 'At a cooking school', false], ['C', 'At a restaurant', false], ['D', 'In a television studio', false]] },
      { prompt: 'What are audience members asked to do?', options: [['A', 'Turn off their phones', false], ['B', 'Line up at the booth', false], ['C', 'Remain seated until samples are served', true], ['D', 'Fill out a feedback form', false]] },
      { prompt: 'What does the speaker say about the voucher?', options: [['A', 'It can be used online', false], ['B', 'It is valid for two days', true], ['C', 'It requires a minimum purchase', false], ['D', 'It will be mailed to attendees', false]] },
    ],
  },
  {
    title: 'Excerpt from a meeting 2', first: 92, speaker: 'm2', kind: 'excerpt from a meeting',
    text: 'One more thing before the morning shift starts. From Thursday to Sunday we’re hosting the delegation from the Aurora Film Festival — twenty-two guests, all on the executive floor. A few points. Their schedules are demanding, so the kitchen will offer them breakfast from five a.m., two hours earlier than usual, and room service should expect late orders as well. Second, journalists may try to wait in the lobby — any press inquiries go straight to Ms. Petrov, the duty manager. No information about the guests, not even confirming that they’re staying here, should be given out by anyone else. Finally, the festival has reserved the rooftop lounge for a private reception on Saturday night, so it will be closed to other guests from six o’clock. Direct any questions to your supervisor. Thank you.',
    questions: [
      { prompt: 'Who is the speaker most likely addressing?', options: [['A', 'Festival organisers', false], ['B', 'A group of journalists', false], ['C', 'Some hotel guests', false], ['D', 'Hotel employees', true]] },
      { prompt: 'What change will the kitchen make?', options: [['A', 'It will close earlier', false], ['B', 'It will serve breakfast earlier', true], ['C', 'It will offer a new menu', false], ['D', 'It will hire extra staff', false]] },
      { prompt: 'Who should respond to questions from the press?', options: [['A', 'The kitchen manager', false], ['B', 'Any available staff member', false], ['C', 'The duty manager', true], ['D', 'The festival delegation', false]] },
    ],
  },
  {
    title: 'Announcement 2', first: 95, speaker: 'w2', kind: 'announcement',
    text: 'Good evening, ladies and gentlemen, and welcome to the Meridian Club lounge. A few announcements for our guests this evening. Due to a private event, the quiet zone at the rear of the lounge will be unavailable until eight o’clock; we apologise for any inconvenience. The hot buffet has just been refreshed, and tonight’s chef’s special — a selection of regional dishes — is available at the carving station until nine. For guests on flight M R six two to Singapore: boarding has been delayed by approximately thirty minutes, and we will make a further announcement when your gate is confirmed, so there is no need to leave the lounge yet. Finally, may we remind all guests that shower suites can be reserved at the front desk. Thank you.',
    questions: [
      { prompt: 'Where is the announcement being made?', options: [['A', 'On board an airplane', false], ['B', 'At a hotel restaurant', false], ['C', 'In an airport lounge', true], ['D', 'At a boarding gate', false]] },
      { prompt: 'Why is the quiet zone unavailable?', options: [['A', 'It is being cleaned', false], ['B', 'It is being renovated', false], ['C', 'It is too crowded', false], ['D', 'A private event is being held', true]] },
      { prompt: 'What are passengers on the Singapore flight advised to do?', options: [['A', 'Stay in the lounge for now', true], ['B', 'Proceed to the gate', false], ['C', 'Speak to the front desk', false], ['D', 'Collect a meal voucher', false]] },
    ],
  },
  {
    title: 'Recorded message', first: 98, speaker: 'm1', kind: 'recorded message',
    text: 'Thank you for calling Northfield Water. All of our agents are currently assisting other customers; please stay on the line and your call will be answered in the order it was received. Your estimated waiting time is approximately ten minutes. Did you know that many requests can be handled without waiting? If you’re calling to report a change of address or to submit a meter reading, you can do both in minutes at northfield water dot com, or on our free mobile app. If you’re calling about the temporary service interruption in the Brookside district, repairs are under way and supply is expected to be restored by five p.m. today — there is no need to report it. For all other matters, please continue to hold and an agent will be with you shortly. Thank you for your patience.',
    questions: [
      { prompt: 'What kind of company has the caller reached?', options: [['A', 'An electricity provider', false], ['B', 'A water company', true], ['C', 'A telephone company', false], ['D', 'A plumbing service', false]] },
      { prompt: 'According to the message, what can callers do on the website?', options: [['A', 'Submit a meter reading', true], ['B', 'Schedule a repair visit', false], ['C', 'Speak with an agent', false], ['D', 'Pay a late fee', false]] },
      { prompt: 'What does the speaker say about the Brookside district?', options: [['A', 'Its water bills will increase', false], ['B', 'It is getting new meters', false], ['C', 'Customers there should call back later', false], ['D', 'Service will be restored by five p.m.', true]] },
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
  if (segments.length === 1) return segments[0].buffer
  const dir = mkdtempSync(join(tmpdir(), 'toeic-full-'))
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
    ? join(CACHE_DIR, 'clip-' + createHash('sha1').update(path + '|' + lines.map(l => `${VOICE[l.speaker]}|${l.text}|${l.gap ?? 0.4}`).join('\n')).digest('hex') + '.mp3')
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
  ...PART4.map((_, i) => `listening/${FORM_SLUG}-p4-${i + 1}.mp3`),
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
    .from('exam_tracks').select('id').eq('slug', 'toeic-lr').single()
  if (trackErr || !track) throw new Error('Track toeic-lr not found — run add-practice-tests.sql first.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'TOEIC L&R Mock 3 — Listening', title_ja: 'TOEIC L&R 模試3 リスニング',
    mode: 'full_mock', time_limit_seconds: 2700, published: false,
    set_slug: 'toeic-lr-mock-03', set_title: 'TOEIC L&R — Mock Test 3',
    set_title_ja: 'TOEIC L&R 模試3', set_order: 0,
  })

  // ── Part 1: Photographs ──
  let sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 1', title: 'Photographs',
    instructions: 'Look at the picture and listen to the four statements (A–D). Choose the statement that best describes what you see. The statements are NOT printed and are heard only once.',
    order_index: 0,
  })
  for (const [i, item] of PART1.entries()) {
    process.stdout.write(`Part 1 — photo ${i + 1}/6: audio… `)
    const lines = [
      { speaker: 'narrator', text: `Number ${i + 1}. Look at the picture.`, gap: 1.0 },
      ...item.statements.map(([label, text]) => ({
        speaker: i % 2 === 0 ? 'm2' : 'w2', text: `${label}. ${text}`, gap: 0.9,
      })),
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p1-${i + 1}.mp3`, lines)
    // image_asset_id stays NULL — attach with scripts/attach-toeic-part1-images-03.mjs
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, 'Choose the statement that best describes the picture.',
      item.statements.map(([label, , correct]) => [label, '', correct]))
    console.log('done.')
  }

  // ── Part 2: Question–Response ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 2', title: 'Question–Response',
    instructions: 'Listen to the question or statement and the three responses (A–C). Choose the best response. Nothing is printed and everything is heard only once.',
    order_index: 1,
  })
  for (const [i, item] of PART2.entries()) {
    const num = 7 + i
    process.stdout.write(`Part 2 — item ${i + 1}/25 (Q${num}): audio… `)
    const [qSpeaker, qText] = item.q
    const rSpeaker = qSpeaker === 'w1' || qSpeaker === 'w2' ? 'm1' : 'w2'
    const lines = [
      { speaker: 'narrator', text: `Number ${num}.`, gap: 0.7 },
      { speaker: qSpeaker, text: qText, gap: 0.8 },
      ...item.r.map(([text], ri) => ({ speaker: rSpeaker, text: `${'ABC'[ri]}. ${text}`, gap: 0.8 })),
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p2-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, 'Choose the best response to what you hear.',
      item.r.map(([, correct], ri) => ['ABC'[ri], '', correct]))
    console.log('done.')
  }

  // ── Part 3: Conversations ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 3', title: 'Conversations',
    instructions: 'Listen to the conversation, then answer the three printed questions (A–D). Each conversation is heard only once.',
    order_index: 2,
  })
  for (const [i, convo] of PART3.entries()) {
    const last = convo.first + 2
    process.stdout.write(`Part 3 — conversation ${i + 1}/13 (Q${convo.first}–${last}): audio… `)
    const lines = [
      { speaker: 'narrator', text: `Questions ${convo.first} through ${last} refer to the following conversation.`, gap: 0.9 },
      ...convo.lines.map(([speaker, text]) => ({ speaker, text, gap: 0.4 })),
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p3-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    for (const [qi, q] of convo.questions.entries()) {
      await addQuestion(supabase, groupId, qi, q.prompt, q.options)
    }
    console.log('done.')
  }

  // ── Part 4: Talks ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 4', title: 'Talks',
    instructions: 'Listen to the talk, then answer the three printed questions (A–D). Each talk is heard only once.',
    order_index: 3,
  })
  for (const [i, talk] of PART4.entries()) {
    const last = talk.first + 2
    process.stdout.write(`Part 4 — talk ${i + 1}/10 (Q${talk.first}–${last}): audio… `)
    const lines = [
      { speaker: 'narrator', text: `Questions ${talk.first} through ${last} refer to the following ${talk.kind}.`, gap: 0.9 },
      { speaker: talk.speaker, text: talk.text, gap: 0.3 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p4-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    for (const [qi, q] of talk.questions.entries()) {
      await addQuestion(supabase, groupId, qi, q.prompt, q.options)
    }
    console.log('done.')
  }

  console.log(`\n✓ Seeded ${FORM_SLUG} — 100 listening questions (P1:6 P2:25 P3:39 P4:30). UNPUBLISHED (draft).`)
  console.log('  Part 1 photos: see supabase/TOEIC-PART1-PHOTOS-03.md, then run scripts/attach-toeic-part1-images-03.mjs')
  console.log('  Publish after review: update test_forms set published = true where slug = \'' + FORM_SLUG + '\'')
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
