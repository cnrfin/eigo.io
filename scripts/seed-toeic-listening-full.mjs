/**
 * Full-length TOEIC L&R LISTENING mock — 100 questions, 4 parts, full_mock.
 *
 *   Part 1 —  6 photographs (image + 4 spoken statements; options NOT printed)
 *   Part 2 — 25 question-response (question + 3 spoken responses; NOT printed)
 *   Part 3 — 13 conversations × 3 printed questions (Q32–70)
 *   Part 4 — 10 talks × 3 printed questions (Q71–100)
 *
 * Generates every clip with ElevenLabs (US + UK voices, TOEIC-style accent
 * mix), uploads to the private test-assets bucket and seeds the form. Part 1
 * photos are attached SEPARATELY once you have the images — see
 * supabase/TOEIC-PART1-PHOTOS.md and scripts/attach-toeic-part1-images.mjs.
 * The form works without them (questions render; the picture area is empty).
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-toeic-listening-full.mjs
 * Re-running REFRESHES the form (deletes + regenerates everything).
 * All content is ORIGINAL.
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
const FORM_SLUG = 'toeic-lr-listening-mock-01'
const MODEL = 'eleven_v3'

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
// ────────────────────────────────────────────────────────────────────────────
const PART1 = [
  {
    image: `images/${FORM_SLUG}-p1-1.jpg`,
    photo: 'A woman sitting at an office desk, typing on a laptop. A coffee mug and some documents are on the desk. No one else is in the picture.',
    statements: [
      ['A', 'A woman is typing on a laptop.', true],
      ['B', 'A woman is pouring some coffee.', false],
      ['C', 'A woman is filing some documents.', false],
      ['D', 'A woman is closing a window.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-2.jpg`,
    photo: 'Two workers in safety vests loading cardboard boxes into the back of a delivery van parked on a street.',
    statements: [
      ['A', 'The men are sealing some boxes with tape.', false],
      ['B', 'The men are loading boxes into a vehicle.', true],
      ['C', 'The men are repairing a van.', false],
      ['D', 'The men are sweeping the street.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-3.jpg`,
    photo: 'Four colleagues seated around a meeting-room table. One woman is standing and pointing at a chart on a screen.',
    statements: [
      ['A', 'The people are leaving the room.', false],
      ['B', 'Some chairs are being stacked in a corner.', false],
      ['C', 'A woman is pointing at a screen.', true],
      ['D', 'A man is handing out some folders.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-4.jpg`,
    photo: 'A man watering potted plants displayed outside a small shop entrance.',
    statements: [
      ['A', 'The man is planting a tree.', false],
      ['B', 'The man is carrying pots into the shop.', false],
      ['C', 'The man is locking the shop door.', false],
      ['D', 'The man is watering some plants.', true],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-5.jpg`,
    photo: 'Several cyclists riding along a paved riverside path. A bridge is visible in the background.',
    statements: [
      ['A', 'Some people are cycling along a path.', true],
      ['B', 'Some people are fishing from a bridge.', false],
      ['C', 'Some boats are docked at a pier.', false],
      ['D', 'Some people are repairing their bicycles.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-6.jpg`,
    photo: 'A waiter arranging glasses and cutlery on outdoor tables at a café terrace. The chairs are empty.',
    statements: [
      ['A', 'Customers are being served their meals.', false],
      ['B', 'A man is setting some tables.', true],
      ['C', 'A man is taking an order.', false],
      ['D', 'The tables are occupied by diners.', false],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 2 — Question–Response (25 items, Q7–31)
// audio: "Number N." + question + responses A/B/C. Printed options letter-only.
// q = [voice of question, question text]; r = [[A text, correct], [B...], [C...]]
// ────────────────────────────────────────────────────────────────────────────
const PART2 = [
  { q: ['w1', 'Where is the marketing department?'], r: [['On the fourth floor.', true], ['At nine o’clock.', false], ['Yes, twice a week.', false]] },
  { q: ['m2', 'When does the workshop begin?'], r: [['In conference room B.', false], ['Right after lunch.', true], ['About thirty people.', false]] },
  { q: ['w2', 'Who approved the travel budget?'], r: [['To Singapore.', false], ['Around two thousand dollars.', false], ['The finance director.', true]] },
  { q: ['m1', 'Why is the elevator out of service?'], r: [['It’s being inspected.', true], ['On the ground floor.', false], ['No, take the stairs.', false]] },
  { q: ['w1', 'How do I get reimbursed for the taxi fare?'], r: [['About twenty minutes.', false], ['Submit the receipt online.', true], ['He went by train.', false]] },
  { q: ['m2', 'Would you like the window seat or the aisle?'], r: [['A round-trip ticket.', false], ['The aisle, please.', true], ['It departs at noon.', false]] },
  { q: ['w2', 'Haven’t you met the new branch manager yet?'], r: [['Yes, on Monday.', true], ['The main branch downtown.', false], ['A management seminar.', false]] },
  { q: ['m1', 'Which printer should I use for the colour brochures?'], r: [['Two hundred copies.', false], ['The one by the copy room.', true], ['Yes, in colour.', false]] },
  { q: ['w1', 'The client meeting went well, didn’t it?'], r: [['At the client’s office.', false], ['Better than expected.', true], ['A new contract.', false]] },
  { q: ['m2', 'Could you forward me the sales report?'], r: [['Sure, right away.', true], ['Last quarter’s figures.', false], ['No, he’s in sales.', false]] },
  { q: ['w2', 'How often does the shuttle run to the airport?'], r: [['Every half hour.', true], ['About forty minutes.', false], ['From terminal two.', false]] },
  { q: ['m1', 'Who’s going to train the new staff?'], r: [['Next Tuesday.', false], ['Ms. Alvarez volunteered.', true], ['In the training room.', false]] },
  { q: ['w1', 'Should we order more paper, or do we have enough?'], r: [['The supply cabinet is full.', true], ['Double-sided, please.', false], ['By Friday at the latest.', false]] },
  { q: ['m2', 'Where can I find the conference schedule?'], r: [['It starts tomorrow.', false], ['It’s posted on the intranet.', true], ['Three keynote speakers.', false]] },
  { q: ['w2', 'Why don’t we move the deadline to next week?'], r: [['Good idea — I’ll tell the team.', true], ['It was due yesterday.', false], ['On the second draft.', false]] },
  { q: ['m1', 'When will the renovation be finished?'], r: [['The lobby and the café.', false], ['By the end of the month.', true], ['A construction company.', false]] },
  { q: ['w1', 'Do you want me to book the meeting room?'], r: [['Yes, for ten o’clock, please.', true], ['It seats twelve.', false], ['The booking was cancelled.', false]] },
  { q: ['m2', 'What did you think of the candidate this morning?'], r: [['At the second interview.', false], ['Very impressive, actually.', true], ['Around ten a.m.', false]] },
  { q: ['w2', 'How much does the express shipping cost?'], r: [['Within two business days.', false], ['Fifteen dollars per package.', true], ['To our warehouse.', false]] },
  { q: ['m1', 'The quarterly figures are due today, aren’t they?'], r: [['Yes, by five o’clock.', true], ['Four times a year.', false], ['Higher than last quarter.', false]] },
  { q: ['w1', 'Whose laptop is this on the table?'], r: [['It’s brand new.', false], ['I think it’s Marco’s.', true], ['On the desk, please.', false]] },
  { q: ['m2', 'Could I see the lunch menu, please?'], r: [['Of course, here you are.', true], ['Table for two.', false], ['The kitchen closes at three.', false]] },
  { q: ['w2', 'Are you attending the trade fair in person or online?'], r: [['I’ll be there in person.', true], ['It was very crowded.', false], ['Twice a year.', false]] },
  { q: ['m1', 'Why was the product launch postponed?'], r: [['At the press conference.', false], ['Some tests aren’t finished yet.', true], ['A new smartphone.', false]] },
  { q: ['w1', 'You’ve backed up the customer database, right?'], r: [['Yes, it runs automatically every night.', true], ['About five thousand records.', false], ['The IT department is upstairs.', false]] },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 3 — Conversations (13 × 3 questions, Q32–70). Questions ARE printed.
// ────────────────────────────────────────────────────────────────────────────
const PART3 = [
  {
    title: 'Conversation 1', first: 32,
    lines: [
      ['w1', 'Hi Tomas, the projector in room three isn’t working again. I have a client demo at two.'],
      ['m1', 'Sorry about that — the replacement bulb arrived this morning, but I haven’t installed it yet.'],
      ['w1', 'Could you do it before lunch? I’d like to test my slides in there beforehand.'],
      ['m1', 'Sure, I’ll head up now. If anything else fails, you could use the portable one as a backup.'],
      ['w1', 'Good thinking. I’ll pick it up from the storeroom just in case.'],
    ],
    questions: [
      { prompt: 'What problem does the woman mention?', options: [['A', 'A projector is not working', true], ['B', 'A room is double-booked', false], ['C', 'A client cancelled a meeting', false], ['D', 'Some slides were deleted', false]] },
      { prompt: 'What does the man say arrived this morning?', options: [['A', 'A new projector', false], ['B', 'A replacement bulb', true], ['C', 'A client contract', false], ['D', 'A storeroom key', false]] },
      { prompt: 'What will the woman most likely do next?', options: [['A', 'Reschedule her demo', false], ['B', 'Call the storeroom', false], ['C', 'Get a portable projector', true], ['D', 'Print her slides', false]] },
    ],
  },
  {
    title: 'Conversation 2', first: 35,
    lines: [
      ['m2', 'Welcome to Harborview Hotel. Checking in?'],
      ['w2', 'Yes, the reservation is under Chen — two nights, a non-smoking double.'],
      ['m2', 'I have it here. Unfortunately your room won’t be ready until three. You’re welcome to leave your luggage with us.'],
      ['w2', 'That would help. Also, is the fitness centre open to guests?'],
      ['m2', 'It is — on the second floor, open until ten p.m. And breakfast is served in the lobby restaurant from six thirty.'],
      ['w2', 'Perfect. I’ll just take a receipt for the luggage, please.'],
    ],
    questions: [
      { prompt: 'Where does the conversation most likely take place?', options: [['A', 'At an airport', false], ['B', 'At a hotel', true], ['C', 'At a fitness centre', false], ['D', 'At a restaurant', false]] },
      { prompt: 'What does the man offer to do?', options: [['A', 'Upgrade the room', false], ['B', 'Store the woman’s luggage', true], ['C', 'Refund a deposit', false], ['D', 'Book a taxi', false]] },
      { prompt: 'What does the woman ask about?', options: [['A', 'Breakfast hours', false], ['B', 'The checkout time', false], ['C', 'The fitness centre', true], ['D', 'Parking fees', false]] },
    ],
  },
  {
    title: 'Conversation 3', first: 38,
    lines: [
      ['w1', 'Raj, the caterer just emailed — they can’t do Friday’s retirement party anymore.'],
      ['m1', 'Oh no. Did they suggest anyone else?'],
      ['w1', 'They recommended Garden Bistro. The menu looks similar and it’s actually a bit cheaper.'],
      ['m1', 'Let’s try them. We’ll need food for about forty people, and remember several are vegetarian.'],
      ['w1', 'I’ll call them now and ask for a quote by tomorrow morning.'],
      ['m1', 'Great. If it’s reasonable, I’ll get the director to approve it the same day.'],
    ],
    questions: [
      { prompt: 'What event are the speakers planning?', options: [['A', 'A product launch', false], ['B', 'A retirement party', true], ['C', 'A training session', false], ['D', 'A board meeting', false]] },
      { prompt: 'What does the woman say about Garden Bistro?', options: [['A', 'It is fully booked', false], ['B', 'It is somewhat cheaper', true], ['C', 'It is far from the office', false], ['D', 'It has new management', false]] },
      { prompt: 'What will the woman do next?', options: [['A', 'Request a price quote', true], ['B', 'Email the director', false], ['C', 'Change the party date', false], ['D', 'Order decorations', false]] },
    ],
  },
  {
    title: 'Conversation 4', first: 41,
    lines: [
      ['m2', 'Hi, I bought this electric kettle here last week, but it stopped heating after two days.'],
      ['w2', 'I’m sorry to hear that. Do you have the receipt with you?'],
      ['m2', 'I do — here it is. I’d prefer a replacement rather than a refund, if possible.'],
      ['w2', 'Of course. We have the same model in stock. I just need you to fill in this short exchange form.'],
      ['m2', 'No problem. Also, does the warranty start over with the new one?'],
      ['w2', 'Yes, the replacement comes with a fresh one-year warranty.'],
    ],
    questions: [
      { prompt: 'Why is the man visiting the store?', options: [['A', 'To buy a gift', false], ['B', 'To return a faulty product', true], ['C', 'To collect an order', false], ['D', 'To ask about a sale', false]] },
      { prompt: 'What does the man prefer?', options: [['A', 'A refund', false], ['B', 'Store credit', false], ['C', 'A replacement', true], ['D', 'A repair', false]] },
      { prompt: 'What does the woman say about the warranty?', options: [['A', 'It cannot be extended', false], ['B', 'It restarts with the replacement', true], ['C', 'It expired last week', false], ['D', 'It covers accidental damage', false]] },
    ],
  },
  {
    title: 'Conversation 5', first: 44,
    lines: [
      ['w2', 'Daniel, have you seen the new expense system? Every receipt has to be photographed and uploaded now.'],
      ['m1', 'I tried it yesterday. It rejected my dinner receipt because the image was blurry.'],
      ['w2', 'That happened to me too. Apparently there’s a workshop on Thursday showing how to use it properly.'],
      ['m1', 'Thursday’s difficult — I’m visiting the supplier in the morning.'],
      ['w2', 'It’s in the afternoon, at four. And they’re recording it for anyone who can’t come.'],
      ['m1', 'Four works, actually. I’ll sign up when I’m back at my desk.'],
    ],
    questions: [
      { prompt: 'What are the speakers mainly discussing?', options: [['A', 'A new expense system', true], ['B', 'A supplier contract', false], ['C', 'A team dinner', false], ['D', 'A camera purchase', false]] },
      { prompt: 'What problem did the man have?', options: [['A', 'He lost a receipt', false], ['B', 'His upload was rejected', true], ['C', 'His account was locked', false], ['D', 'He missed a deadline', false]] },
      { prompt: 'What will the man probably do on Thursday afternoon?', options: [['A', 'Visit a supplier', false], ['B', 'Watch a recording', false], ['C', 'Attend a workshop', true], ['D', 'Submit his expenses', false]] },
    ],
  },
  {
    title: 'Conversation 6', first: 47,
    lines: [
      ['m2', 'Citywide Dental, good afternoon.'],
      ['w1', 'Hello, I’d like to move my cleaning appointment. I’m booked for Wednesday at nine, but something’s come up at work.'],
      ['m2', 'Let me check… we could see you Thursday at one thirty, or Friday at eight.'],
      ['w1', 'Friday at eight is better — before my shift starts.'],
      ['m2', 'Done. Please remember to bring your updated insurance card; the policy numbers changed this year.'],
      ['w1', 'Good point. I’ll bring the new one. Thanks so much.'],
    ],
    questions: [
      { prompt: 'Why is the woman calling?', options: [['A', 'To cancel her insurance', false], ['B', 'To reschedule an appointment', true], ['C', 'To ask about prices', false], ['D', 'To make a complaint', false]] },
      { prompt: 'When will the woman visit the clinic?', options: [['A', 'Wednesday at 9:00', false], ['B', 'Thursday at 1:30', false], ['C', 'Friday at 8:00', true], ['D', 'Friday at 1:30', false]] },
      { prompt: 'What is the woman asked to bring?', options: [['A', 'A referral letter', false], ['B', 'Her insurance card', true], ['C', 'A payment receipt', false], ['D', 'Her work schedule', false]] },
    ],
  },
  {
    title: 'Conversation 7', first: 50,
    lines: [
      ['w2', 'The printing company sent over the trade-show banners. Have you had a look?'],
      ['m1', 'Just now. The colours look great, but our website address is missing from the bottom of the large one.'],
      ['w2', 'You’re right — the proof we approved definitely had it. I’ll ask them to reprint that banner.'],
      ['m1', 'The show is on Saturday. Can they turn it around that fast?'],
      ['w2', 'They offer a forty-eight-hour rush service. It costs extra, but they should cover it since it’s their error.'],
      ['m1', 'Agreed. Mention that the mistake was on their side when you call.'],
    ],
    questions: [
      { prompt: 'What is wrong with the large banner?', options: [['A', 'The colours are faded', false], ['B', 'The website address is missing', true], ['C', 'The logo is outdated', false], ['D', 'The size is incorrect', false]] },
      { prompt: 'When is the trade show?', options: [['A', 'On Thursday', false], ['B', 'On Friday', false], ['C', 'On Saturday', true], ['D', 'On Sunday', false]] },
      { prompt: 'Who do the speakers think should pay for the rush service?', options: [['A', 'The printing company', true], ['B', 'The marketing team', false], ['C', 'The trade-show organisers', false], ['D', 'The sales department', false]] },
    ],
  },
  {
    title: 'Conversation 8', first: 53,
    lines: [
      ['m1', 'Priya, the landlord called about renewing our office lease. The new rate is eight percent higher.'],
      ['w1', 'Eight percent? That’s steep. The building across the street was advertising space last month.'],
      ['m1', 'True, but moving would disrupt the whole team, and we’d have to rewire the server room.'],
      ['w1', 'Then let’s negotiate. If we sign for three years instead of one, they might soften the increase.'],
      ['m1', 'Worth a try. Could you put together a comparison of nearby rents before Friday’s call?'],
      ['w1', 'I’ll have it ready by Thursday afternoon.'],
    ],
    questions: [
      { prompt: 'What are the speakers discussing?', options: [['A', 'Hiring more staff', false], ['B', 'Renewing an office lease', true], ['C', 'Upgrading their servers', false], ['D', 'Opening a new branch', false]] },
      { prompt: 'What does the woman suggest?', options: [['A', 'Moving immediately', false], ['B', 'Signing a longer lease', true], ['C', 'Paying the higher rate', false], ['D', 'Subletting some space', false]] },
      { prompt: 'What will the woman prepare?', options: [['A', 'A rent comparison', true], ['B', 'A moving schedule', false], ['C', 'A server inventory', false], ['D', 'A meeting agenda', false]] },
    ],
  },
  {
    title: 'Conversation 9', first: 56,
    lines: [
      ['w2', 'Excuse me, does this train stop at Riverside Station?'],
      ['m2', 'Not this one — this is the express. You’ll want the local service on platform two.'],
      ['w2', 'Oh dear. I have an interview near Riverside at eleven.'],
      ['m2', 'You’ll be fine. The local leaves in ten minutes and takes about twenty-five to Riverside.'],
      ['w2', 'That’s a relief. Do I need a different ticket?'],
      ['m2', 'No, the same ticket works on both services.'],
    ],
    questions: [
      { prompt: 'Where does this conversation most likely take place?', options: [['A', 'At a bus terminal', false], ['B', 'At a train station', true], ['C', 'At an airport', false], ['D', 'In a taxi', false]] },
      { prompt: 'Why is the woman travelling?', options: [['A', 'For a job interview', true], ['B', 'For a holiday', false], ['C', 'To visit a client', false], ['D', 'To attend a wedding', false]] },
      { prompt: 'What does the man say about the ticket?', options: [['A', 'It must be exchanged', false], ['B', 'It is valid on both trains', true], ['C', 'It expired this morning', false], ['D', 'It costs extra on the local', false]] },
    ],
  },
  {
    title: 'Conversation 10', first: 59,
    lines: [
      ['m1', 'Have you finished reviewing the applications for the design position?'],
      ['w2', 'Almost. Out of sixty, I’ve shortlisted five. Two have impressive portfolio sites.'],
      ['m1', 'Only five? The posting closes tonight, so a few more might still come in.'],
      ['w2', 'I’ll check again on Monday. Could you sit in on the first round of interviews next week?'],
      ['m1', 'Wednesday and Thursday are open for me.'],
      ['w2', 'Let’s block Wednesday morning, then. I’ll send calendar invitations today.'],
    ],
    questions: [
      { prompt: 'What position are the speakers hiring for?', options: [['A', 'A sales manager', false], ['B', 'A designer', true], ['C', 'An accountant', false], ['D', 'A receptionist', false]] },
      { prompt: 'What does the woman say about two of the candidates?', options: [['A', 'They live overseas', false], ['B', 'They have strong portfolios', true], ['C', 'They asked for high salaries', false], ['D', 'They withdrew their applications', false]] },
      { prompt: 'What will the woman send today?', options: [['A', 'Rejection letters', false], ['B', 'A job offer', false], ['C', 'Calendar invitations', true], ['D', 'A revised job posting', false]] },
    ],
  },
  {
    title: 'Conversation 11', first: 62,
    lines: [
      ['w1', 'IT helpdesk, this is Dana.'],
      ['m2', 'Hi Dana, my laptop won’t connect to the office Wi-Fi since the update last night. I’ve restarted twice.'],
      ['w1', 'A few people have reported that. There’s a fix — I can install it remotely, but the laptop needs to stay plugged in for about fifteen minutes.'],
      ['m2', 'Go ahead. Meanwhile, can I use the cable at my desk to get online?'],
      ['w1', 'Yes, the wired connection isn’t affected. I’ll message you the moment the patch is done.'],
      ['m2', 'Thanks — I have a video call at half past, so the sooner the better.'],
    ],
    questions: [
      { prompt: 'What problem is the man reporting?', options: [['A', 'A broken screen', false], ['B', 'A Wi-Fi connection issue', true], ['C', 'A forgotten password', false], ['D', 'A missing file', false]] },
      { prompt: 'What does the woman say she will do?', options: [['A', 'Replace the laptop', false], ['B', 'Visit his desk', false], ['C', 'Install a fix remotely', true], ['D', 'Restart the office router', false]] },
      { prompt: 'Why is the man in a hurry?', options: [['A', 'He has a video call soon', true], ['B', 'He is leaving for the airport', false], ['C', 'His battery is low', false], ['D', 'The helpdesk is closing', false]] },
    ],
  },
  {
    title: 'Conversation 12', first: 65,
    lines: [
      ['m1', 'The quarterly customer survey results are in. Overall satisfaction is up four points.'],
      ['w2', 'That’s great news. What’s driving it?'],
      ['m1', 'Mostly the faster delivery times since we opened the regional warehouse. But ratings for our phone support actually dropped.'],
      ['w2', 'Hmm. The support team has been short-staffed since two people left in March.'],
      ['m1', 'Exactly. I’d like to propose two new hires in tomorrow’s budget meeting.'],
      ['w2', 'Include the survey chart in your slides — it makes the case by itself.'],
    ],
    questions: [
      { prompt: 'What does the man say improved?', options: [['A', 'Overall customer satisfaction', true], ['B', 'Phone support ratings', false], ['C', 'Employee retention', false], ['D', 'Website traffic', false]] },
      { prompt: 'According to the woman, why did support ratings fall?', options: [['A', 'A new phone system failed', false], ['B', 'The team is short-staffed', true], ['C', 'Training was cancelled', false], ['D', 'Call volumes doubled', false]] },
      { prompt: 'What does the man plan to do tomorrow?', options: [['A', 'Visit the warehouse', false], ['B', 'Interview candidates', false], ['C', 'Propose hiring two people', true], ['D', 'Redesign the survey', false]] },
    ],
  },
  {
    title: 'Conversation 13', first: 68,
    lines: [
      ['w2', 'Hi Omar — quick question about the team offsite. Is the venue confirmed?'],
      ['m2', 'Yes, the lakeside conference centre, two weeks from Friday. I’m arranging the coach now.'],
      ['w2', 'How long is the drive? Some people asked if they could come by car instead.'],
      ['m2', 'About an hour and a quarter. Driving is fine, but parking there is limited, so they should let me know by Monday.'],
      ['w2', 'I’ll pass that on. And is the agenda final? Marketing wants a slot to present the rebrand.'],
      ['m2', 'There’s a free half hour after lunch — tell them it’s theirs if they confirm today.'],
    ],
    questions: [
      { prompt: 'What event are the speakers discussing?', options: [['A', 'A client visit', false], ['B', 'A team offsite', true], ['C', 'A product launch', false], ['D', 'A charity run', false]] },
      { prompt: 'Why should drivers inform the man by Monday?', options: [['A', 'Parking is limited', true], ['B', 'Tickets must be printed', false], ['C', 'The coach leaves early', false], ['D', 'The road will be closed', false]] },
      { prompt: 'What does the marketing team want to do?', options: [['A', 'Choose the venue', false], ['B', 'Present a rebrand', true], ['C', 'Extend the lunch break', false], ['D', 'Cancel their slot', false]] },
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 4 — Talks (10 × 3 questions, Q71–100). Questions ARE printed.
// ────────────────────────────────────────────────────────────────────────────
const PART4 = [
  {
    title: 'Telephone message', first: 71, speaker: 'w1', kind: 'telephone message',
    text: 'Hello, this message is for Mr. Okada. This is Renee calling from Lakeland Office Furniture. The standing desk you ordered arrived at our warehouse this morning, ahead of schedule. We can deliver it on Wednesday between one and five, or you’re welcome to collect it yourself any day before seven. Please note our showroom is closed this Sunday for inventory. Call us back on five five five, two one nine eight to confirm which option suits you. Thank you.',
    questions: [
      { prompt: 'What type of business is the speaker calling from?', options: [['A', 'A furniture store', true], ['B', 'A delivery service', false], ['C', 'An electronics shop', false], ['D', 'A storage facility', false]] },
      { prompt: 'What does the speaker say about the order?', options: [['A', 'It was damaged', false], ['B', 'It arrived early', true], ['C', 'It was delayed', false], ['D', 'It is out of stock', false]] },
      { prompt: 'Why is the listener asked to call back?', options: [['A', 'To make a payment', false], ['B', 'To change the order', false], ['C', 'To confirm a delivery option', true], ['D', 'To leave a review', false]] },
    ],
  },
  {
    title: 'Announcement', first: 74, speaker: 'm2', kind: 'announcement',
    text: 'Good morning, everyone, and welcome aboard the nine fifteen ferry to Bell Island. Today’s crossing will take approximately fifty minutes. Light refreshments are available from the kiosk on the upper deck, and the outdoor viewing area at the front of the boat is open, though we do recommend a jacket — it’s quite windy today. Please keep your ticket with you, as it will be checked again when you disembark. On behalf of the whole crew, we hope you enjoy the journey.',
    questions: [
      { prompt: 'Where is the announcement being made?', options: [['A', 'On a ferry', true], ['B', 'On an airplane', false], ['C', 'On a train', false], ['D', 'At a bus station', false]] },
      { prompt: 'What does the speaker recommend?', options: [['A', 'Buying a return ticket', false], ['B', 'Wearing a jacket outside', true], ['C', 'Arriving early', false], ['D', 'Reserving a seat', false]] },
      { prompt: 'Why should passengers keep their tickets?', options: [['A', 'They will be checked at arrival', true], ['B', 'They include a meal voucher', false], ['C', 'They are needed for parking', false], ['D', 'They can be refunded', false]] },
    ],
  },
  {
    title: 'Advertisement', first: 77, speaker: 'w2', kind: 'advertisement',
    text: 'Is your closet overflowing, but you still have nothing to wear? Visit Second Chapter, the city’s largest second-hand clothing store, now open in the Greenfield Mall. Every item is inspected and professionally cleaned before it reaches our racks. This month only, bring in three pieces of your own clothing in good condition and receive a ten-dollar voucher. We’re open seven days a week until nine p.m. Second Chapter — great style shouldn’t cost the earth.',
    questions: [
      { prompt: 'What kind of business is being advertised?', options: [['A', 'A dry cleaner', false], ['B', 'A second-hand clothing store', true], ['C', 'A tailor', false], ['D', 'A shopping mall', false]] },
      { prompt: 'How can customers get a voucher this month?', options: [['A', 'By spending over fifty dollars', false], ['B', 'By bringing in three items of clothing', true], ['C', 'By joining a membership programme', false], ['D', 'By writing an online review', false]] },
      { prompt: 'What does the speaker say about the store’s items?', options: [['A', 'They are imported', false], ['B', 'They are cleaned before sale', true], ['C', 'They are designer brands', false], ['D', 'They cannot be returned', false]] },
    ],
  },
  {
    title: 'Excerpt from a meeting', first: 80, speaker: 'm1', kind: 'excerpt from a meeting',
    text: 'Before we wrap up, a quick update on the office move. The new building on Carter Street will be ready on the first of next month. Packing crates will be delivered to each department this Friday — please label everything with your team’s colour code, which facilities emailed yesterday. IT will move the servers over the weekend of the twenty-second, so expect the shared drives to be offline from Saturday morning until Sunday evening. If you have equipment that needs special handling, let facilities know by Wednesday.',
    questions: [
      { prompt: 'What is the speaker mainly discussing?', options: [['A', 'An office relocation', true], ['B', 'A hiring freeze', false], ['C', 'A new client', false], ['D', 'A budget review', false]] },
      { prompt: 'What will happen this Friday?', options: [['A', 'The servers will be moved', false], ['B', 'Packing crates will be delivered', true], ['C', 'The shared drives will go offline', false], ['D', 'The new building will open', false]] },
      { prompt: 'Why would employees contact the facilities team?', options: [['A', 'To request a colour code', false], ['B', 'To reserve a parking space', false], ['C', 'To report special-handling equipment', true], ['D', 'To order new furniture', false]] },
    ],
  },
  {
    title: 'Radio broadcast', first: 83, speaker: 'w1', kind: 'radio broadcast',
    text: 'And now for the local traffic report, brought to you by Metro FM. Repair work on the Harbour Bridge continues this week, with the two right-hand lanes closed until Friday evening. Drivers heading into the business district should expect delays of up to twenty-five minutes during the morning rush. As an alternative, the city is adding extra trains on the Blue Line all this week, and the riverside park-and-ride is free until the work is finished. We’ll have another update at the top of the hour.',
    questions: [
      { prompt: 'What is causing the traffic delays?', options: [['A', 'A public parade', false], ['B', 'Bridge repair work', true], ['C', 'A road accident', false], ['D', 'Heavy snowfall', false]] },
      { prompt: 'How long might morning delays last?', options: [['A', 'Ten minutes', false], ['B', 'Fifteen minutes', false], ['C', 'Twenty-five minutes', true], ['D', 'An hour', false]] },
      { prompt: 'What is temporarily free?', options: [['A', 'Blue Line tickets', false], ['B', 'The park-and-ride', true], ['C', 'Bridge tolls', false], ['D', 'City-centre parking', false]] },
    ],
  },
  {
    title: 'Tour information', first: 86, speaker: 'm2', kind: 'talk',
    text: 'Welcome to the Westbrook Chocolate Factory, everyone. My name’s Liam, and I’ll be your guide this afternoon. Our tour lasts about an hour. We’ll begin in the roasting room, move on to the production line, and finish — most importantly — in the tasting room, where you can sample three of our newest flavours. Two quick reminders: photography is welcome everywhere except the production line, and please don’t touch any machinery. If you have questions at any point, just ask. Right — follow me through the blue doors.',
    questions: [
      { prompt: 'Who most likely is the speaker?', options: [['A', 'A tour guide', true], ['B', 'A chocolate buyer', false], ['C', 'A factory engineer', false], ['D', 'A safety inspector', false]] },
      { prompt: 'Where will the tour end?', options: [['A', 'In the roasting room', false], ['B', 'On the production line', false], ['C', 'In the tasting room', true], ['D', 'In the gift shop', false]] },
      { prompt: 'What are visitors NOT allowed to do?', options: [['A', 'Ask questions during the tour', false], ['B', 'Take photos of the production line', true], ['C', 'Sample new flavours', false], ['D', 'Use the blue doors', false]] },
    ],
  },
  {
    title: 'Telephone message 2', first: 89, speaker: 'w2', kind: 'telephone message',
    text: 'Hi Marcus, it’s Elena from accounting. I’m going through the May invoices and invoice four seven one from Brightline Supplies seems to be missing a purchase-order number, so I can’t process the payment. Could you check with whoever placed the order and send me the PO number by Thursday? Otherwise the payment will slip into next month’s run and the supplier may add a late fee. I’m in meetings most of tomorrow, so email is better than calling. Thanks a lot.',
    questions: [
      { prompt: 'What department does the speaker work in?', options: [['A', 'Accounting', true], ['B', 'Purchasing', false], ['C', 'Sales', false], ['D', 'Customer service', false]] },
      { prompt: 'What is the problem with the invoice?', options: [['A', 'The amount is wrong', false], ['B', 'A purchase-order number is missing', true], ['C', 'It was paid twice', false], ['D', 'It was sent to the wrong company', false]] },
      { prompt: 'How does the speaker prefer to be contacted?', options: [['A', 'By phone', false], ['B', 'By email', true], ['C', 'In person', false], ['D', 'By text message', false]] },
    ],
  },
  {
    title: 'Announcement 2', first: 92, speaker: 'm1', kind: 'announcement',
    text: 'Attention, all staff. The annual fire-safety inspection will take place this Thursday morning. At approximately ten o’clock the alarm will sound, and everyone must leave the building by the nearest stairway — the elevators will be switched off during the drill. Please gather at your department’s assembly point in the south parking lot, where your floor warden will take attendance. The whole exercise should take no more than twenty minutes. Department managers, kindly review the updated evacuation map with your teams before Thursday.',
    questions: [
      { prompt: 'What will happen on Thursday morning?', options: [['A', 'A fire drill', true], ['B', 'A staff party', false], ['C', 'A power cut', false], ['D', 'A building renovation', false]] },
      { prompt: 'Why will the elevators be unavailable?', options: [['A', 'They are being repaired', false], ['B', 'They are switched off during the drill', true], ['C', 'They are reserved for visitors', false], ['D', 'They failed an inspection', false]] },
      { prompt: 'What should managers do before Thursday?', options: [['A', 'Take attendance', false], ['B', 'Test the alarm', false], ['C', 'Review the evacuation map with teams', true], ['D', 'Park in the south lot', false]] },
    ],
  },
  {
    title: 'Podcast excerpt', first: 95, speaker: 'w1', kind: 'broadcast',
    text: 'Welcome back to Small Business Weekly. Today’s tip is about customer reviews. Many owners only respond to negative feedback, but research shows replying to positive reviews matters just as much — it tells customers you’re paying attention. Keep responses short, mention something specific from the review, and avoid copying the same message every time. Set aside fifteen minutes twice a week; that’s usually enough for a small shop. After the break, I’ll be talking to a bakery owner who doubled her repeat customers in six months. Stay with us.',
    questions: [
      { prompt: 'What is the main topic of the talk?', options: [['A', 'Responding to customer reviews', true], ['B', 'Hiring seasonal staff', false], ['C', 'Designing a website', false], ['D', 'Reducing business costs', false]] },
      { prompt: 'What does the speaker advise listeners to avoid?', options: [['A', 'Replying to negative reviews', false], ['B', 'Using identical responses', true], ['C', 'Mentioning specific details', false], ['D', 'Spending fifteen minutes a week', false]] },
      { prompt: 'Who will the speaker talk to next?', options: [['A', 'A bakery owner', true], ['B', 'A marketing professor', false], ['C', 'A restaurant critic', false], ['D', 'A software developer', false]] },
    ],
  },
  {
    title: 'Excerpt from a workshop', first: 98, speaker: 'm2', kind: 'talk',
    text: 'Alright, let’s move to the last part of today’s time-management workshop: the weekly review. Every Friday, block out thirty minutes before you leave. First, clear your inbox down to the messages that still need action. Second, look at next week’s calendar and flag anything that needs preparation. And third — this is the step most people skip — write down your top three priorities for Monday morning. People who do this report starting the week noticeably calmer. Your handout has a one-page template; try it for the next month and we’ll compare notes at the follow-up session.',
    questions: [
      { prompt: 'What is the speaker explaining?', options: [['A', 'A weekly review routine', true], ['B', 'A hiring process', false], ['C', 'A filing system', false], ['D', 'A travel policy', false]] },
      { prompt: 'According to the speaker, which step do most people skip?', options: [['A', 'Clearing the inbox', false], ['B', 'Checking the calendar', false], ['C', 'Writing Monday’s priorities', true], ['D', 'Printing the template', false]] },
      { prompt: 'What will happen at the follow-up session?', options: [['A', 'A test will be given', false], ['B', 'Participants will compare results', true], ['C', 'A new template will be handed out', false], ['D', 'Priorities will be assigned', false]] },
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
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 1500 * attempt)); return tts(text, voiceId, attempt + 1) }
    throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`)
  }
  return Buffer.from(await res.arrayBuffer())
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
    segments.push({ buffer: await tts(line.text, VOICE[line.speaker]), gapAfter: line.gap ?? 0.4 })
  }
  return joinSegments(segments)
}

async function insertOne(supabase, table, row) {
  const { data, error } = await supabase.from(table).insert(row).select('id').single()
  if (error) throw new Error(`${table} insert: ${error.message}`)
  return data.id
}

async function uploadClip(supabase, path, lines) {
  const audio = await buildClip(lines)
  const { error } = await supabase.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error(`upload ${path}: ${error.message}`)
  const transcript = lines.map(l => `${LABEL[l.speaker]}: ${l.text}`).join('\n')
  return insertOne(supabase, 'assets', { type: 'audio', storage_path: path, transcript, alt_text: '' })
}

async function addQuestion(supabase, groupId, orderIndex, prompt, options) {
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
    title: 'TOEIC L&R Mock 1 — Listening', title_ja: 'TOEIC L&R 模試1 リスニング',
    mode: 'full_mock', time_limit_seconds: 2700, published: true,
    set_slug: 'toeic-lr-mock-01', set_title: 'TOEIC L&R — Mock Test 1',
    set_title_ja: 'TOEIC L&R 模試1', set_order: 0,
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
    // image_asset_id stays NULL — attach with scripts/attach-toeic-part1-images.mjs
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

  console.log(`\n✓ Seeded ${FORM_SLUG} — 100 listening questions (P1:6 P2:25 P3:39 P4:30).`)
  console.log('  Part 1 photos: see supabase/TOEIC-PART1-PHOTOS.md, then run scripts/attach-toeic-part1-images.mjs')
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
