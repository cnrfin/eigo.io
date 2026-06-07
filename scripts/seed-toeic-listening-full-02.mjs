/**
 * Full-length TOEIC L&R LISTENING mock 2 — 100 questions, 4 parts, full_mock.
 *
 *   Part 1 —  6 photographs (image + 4 spoken statements; options NOT printed)
 *   Part 2 — 25 question-response (question + 3 spoken responses; NOT printed)
 *   Part 3 — 13 conversations × 3 printed questions (Q32–70)
 *   Part 4 — 10 talks × 3 printed questions (Q71–100)
 *
 * Entirely fresh content vs Mock 1 (no scenario overlap) and balanced answer
 * keys (P1 spread A–D, P2 ≈ 8/9/8 across A/B/C, P3/P4 spread A–D evenly).
 * Seeded UNPUBLISHED (draft for review).
 *
 * Generates every clip with ElevenLabs (US + UK voices, TOEIC-style accent
 * mix), uploads to the private test-assets bucket and seeds the form. Part 1
 * photos are attached SEPARATELY once you have the images — see
 * supabase/TOEIC-PART1-PHOTOS-02.md and scripts/attach-toeic-part1-images-02.mjs.
 * The form works without them (questions render; the picture area is empty).
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-toeic-listening-full-02.mjs
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
const FORM_SLUG = 'toeic-lr-listening-mock-02'
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
// Correct keys: C A D B C A (A×2, B×1, C×2, D×1 — no letter more than twice).
// ────────────────────────────────────────────────────────────────────────────
const PART1 = [
  {
    image: `images/${FORM_SLUG}-p1-1.jpg`,
    photo: 'A mechanic in overalls leaning over the open hood of a car in a repair garage, examining the engine. Tools are visible nearby.',
    statements: [
      ['A', 'A man is washing a car.', false],
      ['B', 'A man is changing a tire.', false],
      ['C', 'A man is examining a car engine.', true],
      ['D', 'A man is driving out of a garage.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-2.jpg`,
    photo: 'A woman with a shopping cart in a supermarket aisle, reaching for an item on a shelf. No staff or checkout in view.',
    statements: [
      ['A', 'A woman is reaching for an item on a shelf.', true],
      ['B', 'A woman is paying at a cash register.', false],
      ['C', 'A woman is stocking some shelves.', false],
      ['D', 'A woman is weighing some vegetables.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-3.jpg`,
    photo: 'Passengers seated in an airport departure-gate waiting area with suitcases beside them. An airplane is visible through the window.',
    statements: [
      ['A', 'Passengers are boarding an airplane.', false],
      ['B', 'Travellers are checking in their luggage.', false],
      ['C', 'A plane is taking off from a runway.', false],
      ['D', 'Some people are waiting in a seating area.', true],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-4.jpg`,
    photo: 'A man standing on a stepladder, painting an interior wall with a roller. A tray of paint sits on the floor.',
    statements: [
      ['A', 'A man is climbing down a ladder.', false],
      ['B', 'A man is painting a wall.', true],
      ['C', 'A man is installing a window.', false],
      ['D', 'A man is hanging a picture.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-5.jpg`,
    photo: 'An outdoor market stall under an awning with fruit and vegetables neatly displayed in crates. A few customers are browsing.',
    statements: [
      ['A', 'A vendor is weighing some fruit.', false],
      ['B', 'Some crates are being unloaded from a truck.', false],
      ['C', 'Some produce is displayed at a market stall.', true],
      ['D', 'Customers are standing in line to pay.', false],
    ],
  },
  {
    image: `images/${FORM_SLUG}-p1-6.jpg`,
    photo: 'A man in a library placing a book onto a shelf while holding several other books in his arm. The reading tables are unoccupied.',
    statements: [
      ['A', 'A man is placing a book on a shelf.', true],
      ['B', 'A man is reading at a table.', false],
      ['C', 'Some books are stacked on the floor.', false],
      ['D', 'A man is checking out some books.', false],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 2 — Question–Response (25 items, Q7–31)
// audio: "Number N." + question + responses A/B/C. Printed options letter-only.
// q = [voice of question, question text]; r = [[A text, correct], [B...], [C...]]
// Correct keys: B A C C B A B C A B A C B C A A C B B C A B C A B (A:8 B:9 C:8).
// ────────────────────────────────────────────────────────────────────────────
const PART2 = [
  { q: ['m1', 'Who’s presenting at the staff meeting tomorrow?'], r: [['In the main hall.', false], ['Ms. Tanaka from human resources.', true], ['Yes, I’ll be there.', false]] },
  { q: ['w2', 'Where should I park while my car is being serviced?'], r: [['There’s a lot behind the building.', true], ['About two hours.', false], ['An oil change and new brakes.', false]] },
  { q: ['m2', 'When is the rent payment due?'], r: [['Six hundred dollars.', false], ['To the landlord.', false], ['On the first of the month.', true]] },
  { q: ['w1', 'How long is the warranty on this dishwasher?'], r: [['It washes very quietly.', false], ['In the kitchen appliances section.', false], ['Two years from the date of purchase.', true]] },
  { q: ['m1', 'Why is the staff cafeteria closed today?'], r: [['The daily special is pasta.', false], ['The kitchen is being deep-cleaned.', true], ['At eleven thirty.', false]] },
  { q: ['w2', 'Would you mind covering my shift on Saturday?'], r: [['Sure, I don’t have any plans.', true], ['The schedule is on the wall.', false], ['He worked last weekend.', false]] },
  { q: ['m2', 'Has the shipment from Osaka arrived yet?'], r: [['By sea freight.', false], ['It’s due in this afternoon.', true], ['Twelve pallets.', false]] },
  { q: ['w1', 'Which gym membership plan did you sign up for?'], r: [['Three times a week.', false], ['The treadmills are brand new.', false], ['The annual one — it’s cheaper per month.', true]] },
  { q: ['m1', 'Aren’t you giving the safety briefing this afternoon?'], r: [['No, Mr. Ito is doing it.', true], ['Hard hats and gloves.', false], ['It was very informative.', false]] },
  { q: ['w2', 'What’s the fastest way to the convention centre from here?'], r: [['It holds five thousand people.', false], ['Take the subway — it’s only two stops.', true], ['The convention starts Thursday.', false]] },
  { q: ['m2', 'Do you sell replacement filters for this coffee machine?'], r: [['Yes, they’re in aisle seven.', true], ['Cream and sugar, please.', false], ['It brews ten cups.', false]] },
  { q: ['w1', 'Why don’t we share a taxi to the seminar?'], r: [['A receipt, please.', false], ['It was a long presentation.', false], ['Great — that’ll save us both money.', true]] },
  { q: ['m1', 'Whose turn is it to lock up tonight?'], r: [['With the spare key.', false], ['I believe it’s Hannah’s.', true], ['At the front entrance.', false]] },
  { q: ['w2', 'How many people have registered for the webinar?'], r: [['On the registration page.', false], ['It’s free to attend.', false], ['Just over a hundred so far.', true]] },
  { q: ['m2', 'Should I email the agenda now or wait until Monday?'], r: [['Send it now so people can prepare.', true], ['The meeting was productive.', false], ['Yes, he emailed me.', false]] },
  { q: ['w1', 'The new security badges look different, don’t they?'], r: [['Yes, they added a photo.', true], ['At the security desk.', false], ['Every two years.', false]] },
  { q: ['m1', 'When can the plumber come to fix the leak?'], r: [['Under the kitchen sink.', false], ['It’s an old pipe.', false], ['Tomorrow morning at the earliest.', true]] },
  { q: ['w2', 'Where did you buy that desk lamp?'], r: [['It’s very bright.', false], ['At the home goods store on Pine Street.', true], ['Last Thursday.', false]] },
  { q: ['m2', 'Have the auditors finished reviewing our accounts?'], r: [['An accounting degree.', false], ['They’ll wrap up by Friday.', true], ['In the finance office.', false]] },
  { q: ['w1', 'Would you rather take the morning flight or the evening one?'], r: [['Seat twenty-three A.', false], ['Two checked bags.', false], ['The morning one — I’d like to arrive early.', true]] },
  { q: ['m1', 'Why are there so many people in the lobby?'], r: [['A tour group just checked in.', true], ['The lobby was renovated.', false], ['Through the revolving door.', false]] },
  { q: ['w2', 'Can you recommend a good place for lunch near the station?'], r: [['Yes, I’ve already eaten.', false], ['There’s a noodle shop just across the street.', true], ['Around noon, usually.', false]] },
  { q: ['m2', 'How was the photography exhibition?'], r: [['A digital camera.', false], ['Next to the city hall.', false], ['Honestly, a bit crowded.', true]] },
  { q: ['w1', 'Didn’t you used to work at the airport?'], r: [['Yes, for almost five years.', true], ['Gate twenty-two.', false], ['My flight was delayed.', false]] },
  { q: ['m1', 'The heating in this office isn’t working properly, is it?'], r: [['It’s seventy degrees outside.', false], ['No, maintenance is coming to look at it.', true], ['A new air conditioner.', false]] },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 3 — Conversations (13 × 3 questions, Q32–70). Questions ARE printed.
// Correct keys spread A:10 B:10 C:9 D:10.
// ────────────────────────────────────────────────────────────────────────────
const PART3 = [
  {
    title: 'Conversation 1', first: 32,
    lines: [
      ['m1', 'Good morning. What can we do for your car today?'],
      ['w1', 'It’s been making a squealing noise whenever I brake, especially going downhill.'],
      ['m1', 'That usually means the brake pads are worn. We can inspect it right away, but if they need replacing, the car won’t be ready until tomorrow afternoon — we’d have to order the parts.'],
      ['w1', 'Tomorrow? I need to drive to a conference first thing in the morning.'],
      ['m1', 'In that case, we offer a courtesy car at no charge. You’d just need to return it with a full tank.'],
      ['w1', 'That solves it. I’ll fill out the paperwork now.'],
    ],
    questions: [
      { prompt: 'What problem does the woman mention?', options: [['A', 'Her car will not start', false], ['B', 'Her brakes are making a noise', true], ['C', 'A warning light is on', false], ['D', 'One of her tires is flat', false]] },
      { prompt: 'Why might the repair take until tomorrow?', options: [['A', 'The shop is short-staffed', false], ['B', 'The mechanic is leaving early', false], ['C', 'The car needs a full inspection', false], ['D', 'Parts have to be ordered', true]] },
      { prompt: 'What does the man offer the woman?', options: [['A', 'A free courtesy car', true], ['B', 'A discount on parts', false], ['C', 'A ride to the conference', false], ['D', 'A full tank of fuel', false]] },
    ],
  },
  {
    title: 'Conversation 2', first: 35,
    lines: [
      ['w2', 'Welcome to Peak Fitness. Are you interested in joining?'],
      ['m2', 'Yes, I just moved to the neighbourhood. What do memberships cost?'],
      ['w2', 'Forty dollars a month, or four hundred for the year if you pay up front. The annual plan also includes two free sessions with a personal trainer.'],
      ['m2', 'Tempting. Is the pool included, too?'],
      ['w2', 'The pool is closed for re-tiling until the end of next month, I’m afraid. But all members get access once it reopens.'],
      ['m2', 'All right. I’ll start with the monthly plan and switch to annual once the pool is open.'],
    ],
    questions: [
      { prompt: 'Why is the man interested in the gym?', options: [['A', 'His doctor recommended it', false], ['B', 'His friend is a member', false], ['C', 'He recently moved to the area', true], ['D', 'His office is nearby', false]] },
      { prompt: 'What does the annual plan include?', options: [['A', 'Free personal-training sessions', true], ['B', 'A swimming class', false], ['C', 'Guest passes', false], ['D', 'A locker rental', false]] },
      { prompt: 'What does the woman say about the pool?', options: [['A', 'It is open only in summer', false], ['B', 'It costs extra to use', false], ['C', 'It is reserved for classes', false], ['D', 'It is temporarily closed', true]] },
    ],
  },
  {
    title: 'Conversation 3', first: 38,
    lines: [
      ['m2', 'Hi, I’m here to pick up a prescription for Alan Brooks.'],
      ['w2', 'One moment… I see it, but our system shows your insurance information has expired. Has your plan changed recently?'],
      ['m2', 'Oh — yes, my company switched providers in April. I have the new card right here.'],
      ['w2', 'Perfect, I’ll update your file. It’ll take about ten minutes to process. Also, your doctor authorised two refills, so next time you can order through our mobile app instead of waiting in line.'],
      ['m2', 'Good to know. I’ll browse the vitamin aisle while I wait.'],
    ],
    questions: [
      { prompt: 'Where does the conversation most likely take place?', options: [['A', 'At a doctor’s office', false], ['B', 'At an insurance company', false], ['C', 'At a supermarket', false], ['D', 'At a pharmacy', true]] },
      { prompt: 'What problem does the woman mention?', options: [['A', 'A prescription has run out', false], ['B', 'Some insurance information is out of date', true], ['C', 'The medication is out of stock', false], ['D', 'The doctor cannot be reached', false]] },
      { prompt: 'What does the woman suggest the man do next time?', options: [['A', 'Come earlier in the day', false], ['B', 'Call his doctor first', false], ['C', 'Use the mobile app', true], ['D', 'Visit a different branch', false]] },
    ],
  },
  {
    title: 'Conversation 4', first: 41,
    lines: [
      ['w1', 'Marcus, the first issue of the employee newsletter goes out next month. Could you write a short piece introducing the new branch in Denver?'],
      ['m1', 'Happy to. How many words are we talking about?'],
      ['w1', 'Around three hundred — and a couple of photos of the office would be great.'],
      ['m1', 'I’ll ask the branch manager to send some. What’s the deadline?'],
      ['w1', 'The fifteenth. That gives our designer a full week for the layout.'],
      ['m1', 'No problem. Actually, my cousin lives in Denver — maybe I could include a few tips about the city for anyone relocating.'],
      ['w1', 'I love that idea. Readers will appreciate the personal touch.'],
    ],
    questions: [
      { prompt: 'What is the woman preparing?', options: [['A', 'An employee newsletter', true], ['B', 'A press release', false], ['C', 'A training manual', false], ['D', 'An annual report', false]] },
      { prompt: 'What will the man request from the branch manager?', options: [['A', 'A budget estimate', false], ['B', 'A staff list', false], ['C', 'Some photographs', true], ['D', 'A floor plan', false]] },
      { prompt: 'What does the man offer to add?', options: [['A', 'An interview with the designer', false], ['B', 'Tips about the city', true], ['C', 'A map of the new office', false], ['D', 'A list of job openings', false]] },
    ],
  },
  {
    title: 'Conversation 5', first: 44,
    lines: [
      ['m2', 'So, this is the two-bedroom I mentioned on the phone. It was repainted last week, and the building has a shared rooftop terrace.'],
      ['w2', 'It’s brighter than I expected. Is the rent really twelve hundred a month?'],
      ['m2', 'It is — heating included. The only thing is, the landlord is asking for a two-month deposit instead of the usual one.'],
      ['w2', 'Hmm. Well, the location is ideal — my office is just one subway stop away. Could I see the laundry room before I decide?'],
      ['m2', 'Of course, it’s in the basement. And if you apply today, the landlord can have the lease ready by Friday.'],
    ],
    questions: [
      { prompt: 'Who most likely is the man?', options: [['A', 'A landlord', false], ['B', 'A real estate agent', true], ['C', 'A moving company employee', false], ['D', 'A bank clerk', false]] },
      { prompt: 'What does the man say about the deposit?', options: [['A', 'It can be paid in instalments', false], ['B', 'It was recently reduced', false], ['C', 'It includes the first month’s rent', false], ['D', 'It is larger than usual', true]] },
      { prompt: 'Why does the woman like the location?', options: [['A', 'It is near a park', false], ['B', 'It has a rooftop view', false], ['C', 'It is close to her workplace', true], ['D', 'It is on a quiet street', false]] },
    ],
  },
  {
    title: 'Conversation 6', first: 47,
    lines: [
      ['w1', 'Hi Victor, it’s Lena at the Olive Tree restaurant. This morning’s delivery only had half the tomatoes we ordered.'],
      ['m1', 'I’m sorry, Lena. The storm last week damaged a lot of the local crop, so we’re rationing what we have.'],
      ['w1', 'I understand, but we’re fully booked this weekend. Is there any way to get more?'],
      ['m1', 'I can send an extra crate from our greenhouse stock on Friday morning. Those cost slightly more, but I’ll give them to you at the regular price this once.'],
      ['w1', 'That would be a lifesaver. While I have you — could we add fresh basil to our standing weekly order?'],
      ['m1', 'Done. I’ll update the order form today.'],
    ],
    questions: [
      { prompt: 'Why is the woman calling?', options: [['A', 'To cancel a weekend booking', false], ['B', 'To complain about prices', false], ['C', 'To change a delivery address', false], ['D', 'To report an incomplete delivery', true]] },
      { prompt: 'According to the man, what caused the shortage?', options: [['A', 'A storm damaged some crops', true], ['B', 'A truck broke down', false], ['C', 'An order form was lost', false], ['D', 'A warehouse flooded', false]] },
      { prompt: 'What does the woman ask to add to her weekly order?', options: [['A', 'Tomatoes', false], ['B', 'Basil', true], ['C', 'Olives', false], ['D', 'Lettuce', false]] },
    ],
  },
  {
    title: 'Conversation 7', first: 50,
    lines: [
      ['m2', 'Sophie, good news — the novelist Clara Hayes agreed to do a signing here on the twentieth.'],
      ['w2', 'That’s fantastic! Her last book sold out twice. How many copies should we order?'],
      ['m2', 'Let’s say eighty. Her publisher offers a discount on orders over fifty, so that works in our favour.'],
      ['w2', 'Should we move the event upstairs? The reading corner only seats about twenty people.'],
      ['m2', 'Good point — the upstairs gallery holds sixty. Could you design a poster for the window this week?'],
      ['w2', 'Sure. I’ll have a draft for you by Wednesday.'],
    ],
    questions: [
      { prompt: 'What event are the speakers planning?', options: [['A', 'A poetry reading', false], ['B', 'A store anniversary', false], ['C', 'A book signing', true], ['D', 'A writing workshop', false]] },
      { prompt: 'Why will the speakers order more than fifty copies?', options: [['A', 'The first shipment sold out', false], ['B', 'A discount applies to larger orders', true], ['C', 'The publisher requires it', false], ['D', 'They expect many online orders', false]] },
      { prompt: 'What will the woman do this week?', options: [['A', 'Contact the publisher', false], ['B', 'Rearrange the reading corner', false], ['C', 'Email the author', false], ['D', 'Design a poster', true]] },
    ],
  },
  {
    title: 'Conversation 8', first: 53,
    lines: [
      ['w1', 'Jun, I’m finalising your trip to the Chicago conference. There’s a direct flight Monday at seven a.m., or one with a stopover that leaves at ten.'],
      ['m1', 'The seven o’clock, definitely — I want to attend the opening session at two.'],
      ['w1', 'Done. Now, the conference hotel is full, but there’s one a ten-minute walk away. It’s actually cheaper, and breakfast is included.'],
      ['m1', 'That’s fine. Oh — could you also register me for the panel discussion on renewable energy on Tuesday? Seats are limited.'],
      ['w1', 'I’ll do it as soon as registration opens at noon, and I’ll forward all the confirmations by the end of the day.'],
    ],
    questions: [
      { prompt: 'Why does the man choose the earlier flight?', options: [['A', 'He wants to attend the opening session', true], ['B', 'It is cheaper', false], ['C', 'The other flight was cancelled', false], ['D', 'He dislikes evening flights', false]] },
      { prompt: 'What does the woman say about the alternative hotel?', options: [['A', 'It is next to the airport', false], ['B', 'It has a conference room', false], ['C', 'It is fully booked', false], ['D', 'It costs less than the conference hotel', true]] },
      { prompt: 'What does the man ask the woman to do?', options: [['A', 'Book a rental car', false], ['B', 'Print his boarding pass', false], ['C', 'Register him for a panel discussion', true], ['D', 'Cancel a reservation', false]] },
    ],
  },
  {
    title: 'Conversation 9', first: 56,
    lines: [
      ['m1', 'Hello, I think I lost my debit card over the weekend. Can you block it, please?'],
      ['w2', 'Right away… Done — the card is frozen, and I don’t see any unusual transactions on your account.'],
      ['m1', 'What a relief. How long does a replacement take?'],
      ['w2', 'Five to seven business days by mail. Or, if you need one sooner, we can print a temporary card here in about fifteen minutes.'],
      ['m1', 'I’d like that, please. I’m travelling on Thursday.'],
      ['w2', 'No problem. While the card prints, would you like to update your contact details? The phone number we have looks out of date.'],
    ],
    questions: [
      { prompt: 'Why is the man visiting the bank?', options: [['A', 'To open a new account', false], ['B', 'To report a lost card', true], ['C', 'To apply for a loan', false], ['D', 'To withdraw some cash', false]] },
      { prompt: 'What does the woman offer to do?', options: [['A', 'Waive a monthly fee', false], ['B', 'Mail a card overnight', false], ['C', 'Print a temporary card', true], ['D', 'Increase his credit limit', false]] },
      { prompt: 'What does the woman say about the man’s account?', options: [['A', 'There are no unusual transactions', true], ['B', 'It was opened recently', false], ['C', 'It has a low balance', false], ['D', 'It is linked to an old address', false]] },
    ],
  },
  {
    title: 'Conversation 10', first: 59,
    lines: [
      ['w2', 'Hello, I’m calling from Brightwave Consulting. We’d like professional headshots for our website — about fifteen employees.'],
      ['m2', 'We can certainly do that. For groups that size, it’s usually easier if we come to your office. We bring a portable backdrop and lights.'],
      ['w2', 'Even better. How long would you need?'],
      ['m2', 'Roughly five minutes per person, so under two hours in total. We’d just need a room with space to set up — a meeting room works well.'],
      ['w2', 'We have one free on the twenty-fourth. Could you send a quote today? My director wants to approve the cost before we book anything.'],
      ['m2', 'You’ll have it within the hour, along with a link to some sample portraits.'],
    ],
    questions: [
      { prompt: 'Why is the woman calling?', options: [['A', 'To order business cards', false], ['B', 'To reschedule a photo shoot', false], ['C', 'To buy a camera', false], ['D', 'To arrange staff photographs', true]] },
      { prompt: 'What does the man suggest?', options: [['A', 'Taking the photos at the woman’s office', true], ['B', 'Booking two separate days', false], ['C', 'Photographing outdoors', false], ['D', 'Hiring a second photographer', false]] },
      { prompt: 'What does the woman’s director want to do?', options: [['A', 'Choose the backdrop', false], ['B', 'Approve the cost', true], ['C', 'Be photographed first', false], ['D', 'Meet the photographer', false]] },
    ],
  },
  {
    title: 'Conversation 11', first: 62,
    lines: [
      ['m1', 'Hi, I dropped off a navy suit on Monday — the ticket says it would be ready today.'],
      ['w1', 'Let me check… I’m so sorry, there’s a delay. Our pressing machine broke down yesterday, and a technician is coming this afternoon.'],
      ['m1', 'Oh no. I need the suit for an awards dinner on Friday evening.'],
      ['w1', 'It will definitely be ready by Friday at noon. And for the inconvenience, we’ll take twenty percent off your bill.'],
      ['m1', 'I appreciate that. Could you also replace the missing button on the jacket cuff?'],
      ['w1', 'Of course — our seamstress can do that at no extra charge. I’ll call you the moment everything’s done.'],
    ],
    questions: [
      { prompt: 'Why is the man’s suit not ready?', options: [['A', 'It was sent to another branch', false], ['B', 'The ticket was misplaced', false], ['C', 'A machine broke down', true], ['D', 'The order was forgotten', false]] },
      { prompt: 'Why does the man need the suit by Friday?', options: [['A', 'He has a job interview', false], ['B', 'He is leaving on a trip', false], ['C', 'He is attending a wedding', false], ['D', 'He is going to an awards dinner', true]] },
      { prompt: 'What does the woman offer the man?', options: [['A', 'A discount on his bill', true], ['B', 'Free home delivery', false], ['C', 'A replacement suit', false], ['D', 'A full refund', false]] },
    ],
  },
  {
    title: 'Conversation 12', first: 65,
    lines: [
      ['w2', 'Diego, the new handheld scanners arrive on Thursday. They’ll replace the paper checklists completely.'],
      ['m2', 'Finally. Counting stock by hand takes my team half a day every week.'],
      ['w2', 'Exactly — the supplier says counts will take under an hour with the scanners. There’s a training session Thursday at three in the break room.'],
      ['m2', 'Two of my staff work the early shift, though. They’ll be gone by three.'],
      ['w2', 'Then send them to the morning session at eight, before the floor opens. Same content.'],
      ['m2', 'Perfect. Should we keep the paper checklists as a backup at first?'],
      ['w2', 'Good idea. Let’s run both systems until the end of next week, just to be safe.'],
    ],
    questions: [
      { prompt: 'What is arriving on Thursday?', options: [['A', 'Handheld scanners', true], ['B', 'Paper checklists', false], ['C', 'New shelving units', false], ['D', 'A stock delivery', false]] },
      { prompt: 'What problem does the man mention?', options: [['A', 'The break room is too small', false], ['B', 'Some staff cannot attend the afternoon session', true], ['C', 'The supplier is unreliable', false], ['D', 'The scanners are too expensive', false]] },
      { prompt: 'What do the speakers decide to do?', options: [['A', 'Delay the training', false], ['B', 'Hire more staff', false], ['C', 'Stop using paper immediately', false], ['D', 'Use both systems temporarily', true]] },
    ],
  },
  {
    title: 'Conversation 13', first: 68,
    lines: [
      ['m2', 'Aisha, sign-ups for the volunteer day are open. We’re cleaning up Riverton Park on the first Saturday of next month.'],
      ['w1', 'Great. How many people so far?'],
      ['m2', 'Twenty-six. The city is providing gloves and trash bags, but we should bring our own drinking water.'],
      ['w1', 'I can ask the cafeteria to donate some bottled water. What about lunch?'],
      ['m2', 'The company is paying for sandwiches from the deli on Fifth Street. Oh — and everyone gets a volunteer T-shirt; people just need to put their size on the sign-up sheet.'],
      ['w1', 'I’ll email everyone today to remind them about the sizes.'],
    ],
    questions: [
      { prompt: 'What event are the speakers discussing?', options: [['A', 'A company picnic', false], ['B', 'A sports tournament', false], ['C', 'A park cleanup', true], ['D', 'A charity auction', false]] },
      { prompt: 'What will the city provide?', options: [['A', 'Bottled water', false], ['B', 'Gloves and trash bags', true], ['C', 'Sandwiches', false], ['D', 'T-shirts', false]] },
      { prompt: 'What will the woman do today?', options: [['A', 'Send a reminder email', true], ['B', 'Order the T-shirts', false], ['C', 'Visit the deli', false], ['D', 'Contact the city', false]] },
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// PART 4 — Talks (10 × 3 questions, Q71–100). Questions ARE printed.
// Correct keys spread A:8 B:7 C:7 D:8.
// ────────────────────────────────────────────────────────────────────────────
const PART4 = [
  {
    title: 'Telephone message', first: 71, speaker: 'm1', kind: 'telephone message',
    text: 'Hi, this message is for Ms. Calloway. It’s Greg from Rapid Flow Plumbing, returning your call about the leak under your bathroom sink. I had a cancellation, so I could actually come by tomorrow morning at nine instead of next Tuesday. The repair itself should take less than an hour, but if the pipe behind the wall is corroded, I may need to come back with different fittings. In the meantime, please keep the water valve under the sink turned off, just as you’ve been doing. Call me back at five five five, four four seven two to confirm that tomorrow works for you.',
    questions: [
      { prompt: 'Who most likely is the speaker?', options: [['A', 'A building inspector', false], ['B', 'A hardware store clerk', false], ['C', 'A plumber', true], ['D', 'A property manager', false]] },
      { prompt: 'Why can the speaker come earlier than planned?', options: [['A', 'Another appointment was cancelled', true], ['B', 'He finished a job early', false], ['C', 'Some parts arrived sooner', false], ['D', 'His schedule was printed incorrectly', false]] },
      { prompt: 'What should the listener continue to do?', options: [['A', 'Collect the dripping water', false], ['B', 'Avoid using the bathroom', false], ['C', 'Wait by the phone', false], ['D', 'Keep a valve turned off', true]] },
    ],
  },
  {
    title: 'Announcement', first: 74, speaker: 'w2', kind: 'announcement',
    text: 'May I have your attention, please. This is an announcement for passengers on Skyline Airways flight two eight four to Vancouver. Due to a gate change, this flight will now depart from gate B seventeen, not gate B five as printed on your boarding pass. Gate B seventeen is located past the duty-free shops, about a ten-minute walk from this area. The departure time remains four forty-five, and boarding will begin at four o’clock, starting with passengers needing assistance and families with small children. Please have your passport and boarding pass ready. Once again, flight two eight four to Vancouver now departs from gate B seventeen.',
    questions: [
      { prompt: 'What is the purpose of the announcement?', options: [['A', 'To report a delay', false], ['B', 'To announce a gate change', true], ['C', 'To call a missing passenger', false], ['D', 'To cancel a flight', false]] },
      { prompt: 'What does the speaker say about the departure time?', options: [['A', 'It is forty-five minutes later', false], ['B', 'It will be announced soon', false], ['C', 'It has been moved up', false], ['D', 'It has not changed', true]] },
      { prompt: 'Who will board first?', options: [['A', 'Passengers needing assistance', true], ['B', 'Business-class passengers', false], ['C', 'Frequent flyers', false], ['D', 'Passengers seated at the rear', false]] },
    ],
  },
  {
    title: 'Advertisement', first: 77, speaker: 'm2', kind: 'advertisement',
    text: 'Tired of deciding what’s for dinner? Let FreshCrate decide for you. Every week, we deliver a chilled box with pre-measured ingredients and easy recipe cards for three delicious meals — most ready in under thirty minutes. Choose from our classic, vegetarian, or family menus, and skip a week whenever you like — there’s no long-term commitment. This month, new customers get their first box for half price, plus a free set of kitchen utensils. Visit freshcrate dot com and use the code DINNER at checkout. FreshCrate — home cooking, without the homework.',
    questions: [
      { prompt: 'What is being advertised?', options: [['A', 'A meal-kit delivery service', true], ['B', 'A cooking school', false], ['C', 'A restaurant chain', false], ['D', 'A kitchen appliance', false]] },
      { prompt: 'What does the speaker say customers can do?', options: [['A', 'Return unused ingredients', false], ['B', 'Order extra recipe cards', false], ['C', 'Skip a week at any time', true], ['D', 'Visit the company kitchen', false]] },
      { prompt: 'What free item will new customers receive?', options: [['A', 'Their first box', false], ['B', 'A set of kitchen utensils', true], ['C', 'A recipe book', false], ['D', 'A month of deliveries', false]] },
    ],
  },
  {
    title: 'Excerpt from a meeting', first: 80, speaker: 'w1', kind: 'excerpt from a meeting',
    text: 'One last item before we finish. Starting Monday, the office is introducing a new recycling program. The big change: the individual trash bins at your desks are going away. Instead, you’ll find sorting stations on every floor — one beside the kitchen and one by the printers — with separate containers for paper, plastic, and general waste. The cleaning staff told us that over half of what we throw away is paper that could be recycled, so this should make a real difference. Also, the old desk bins won’t be wasted: facilities is donating them to the community garden for use as planters. If you have questions, there’s a short guide on the intranet under Green Office.',
    questions: [
      { prompt: 'What is the speaker mainly talking about?', options: [['A', 'A kitchen renovation', false], ['B', 'A donation drive', false], ['C', 'Some new printers', false], ['D', 'A recycling program', true]] },
      { prompt: 'What will be removed from the office?', options: [['A', 'The sorting stations', false], ['B', 'Individual desk bins', true], ['C', 'The kitchen containers', false], ['D', 'Some old printers', false]] },
      { prompt: 'What will happen to the old bins?', options: [['A', 'They will be thrown away', false], ['B', 'They will be sold to staff', false], ['C', 'They will be donated to a garden', true], ['D', 'They will be stored in the basement', false]] },
    ],
  },
  {
    title: 'Radio broadcast', first: 83, speaker: 'm1', kind: 'radio broadcast',
    text: 'Good morning, here’s your weekend weather on Radio Lakeside. Today stays dry and mild, with sunshine and a high of nineteen degrees — a perfect afternoon for the farmers’ market downtown. Saturday is a different story: a band of heavy rain moves in around midday and continues into the evening, with possible thunderstorms along the coast. If you’re heading to the open-air cinema on Saturday night, do check whether the screening is still going ahead. By Sunday morning, the rain clears and we’re back to sunny skies — though it will be windy, so hold onto your hats. Your next update is at half past the hour.',
    questions: [
      { prompt: 'When will the heavy rain arrive?', options: [['A', 'This morning', false], ['B', 'Saturday around midday', true], ['C', 'Saturday night', false], ['D', 'Sunday morning', false]] },
      { prompt: 'What might be affected on Saturday night?', options: [['A', 'An open-air cinema screening', true], ['B', 'A farmers’ market', false], ['C', 'A coastal ferry service', false], ['D', 'A downtown parade', false]] },
      { prompt: 'What will the weather be like on Sunday?', options: [['A', 'Rainy and cold', false], ['B', 'Foggy', false], ['C', 'Stormy along the coast', false], ['D', 'Sunny but windy', true]] },
    ],
  },
  {
    title: 'Tour information', first: 86, speaker: 'w2', kind: 'talk',
    text: 'Welcome to the Halverton Museum of Natural History. My name is Priya, and I’ll be your guide for the next forty-five minutes. We’ll start here in the Ocean Hall, then move through the dinosaur gallery, and end with our newest exhibition — a collection of meteorites, including one you’re actually allowed to touch. A few housekeeping notes: photography without flash is fine in every gallery, but please don’t lean on the display cases — some of them are over a hundred years old themselves. The gift shop and café are on the ground floor, and the museum stays open until six tonight. If you get separated from the group, just ask any staff member in a green vest. Shall we begin?',
    questions: [
      { prompt: 'Where does the tour take place?', options: [['A', 'At an art gallery', false], ['B', 'At an aquarium', false], ['C', 'At a natural history museum', true], ['D', 'At a science laboratory', false]] },
      { prompt: 'What does the guide say about the meteorite exhibition?', options: [['A', 'It is closed today', false], ['B', 'It requires a separate ticket', false], ['C', 'It is on the ground floor', false], ['D', 'Visitors may touch one item', true]] },
      { prompt: 'What are visitors asked NOT to do?', options: [['A', 'Take any photographs', false], ['B', 'Lean on the display cases', true], ['C', 'Visit the café during the tour', false], ['D', 'Talk to staff members', false]] },
    ],
  },
  {
    title: 'Telephone message 2', first: 89, speaker: 'm2', kind: 'telephone message',
    text: 'Good afternoon, this message is for Hannah Whitfield. This is Theo calling from ClearSight Optical on Marsden Avenue. Your new glasses are ready for collection. When you come in, we’ll adjust the frames to fit you properly — it only takes a few minutes, so there’s no need to book a time. One more thing: you also asked about prescription sunglasses. The frames you liked are currently out of stock, but the supplier expects more in about two weeks, and I can call you when they arrive if you’d like. We’re open until five thirty on weekdays and until one on Saturdays. See you soon.',
    questions: [
      { prompt: 'Why is the speaker calling?', options: [['A', 'To say an order is ready', true], ['B', 'To confirm an appointment', false], ['C', 'To reschedule an eye exam', false], ['D', 'To request a payment', false]] },
      { prompt: 'What does the speaker say about the frame adjustment?', options: [['A', 'It must be booked online', false], ['B', 'No appointment is necessary', true], ['C', 'It takes about an hour', false], ['D', 'It costs extra', false]] },
      { prompt: 'What does the speaker say about the sunglasses frames?', options: [['A', 'They have been discontinued', false], ['B', 'They arrived this morning', false], ['C', 'They are out of stock', true], ['D', 'They are on sale', false]] },
    ],
  },
  {
    title: 'Announcement 2', first: 92, speaker: 'w1', kind: 'announcement',
    text: 'Attention, Holbrook’s shoppers. With the holiday season upon us, we’re pleased to announce extended opening hours: starting this Friday, the store will stay open until ten p.m. every night through the end of December. Our complimentary gift-wrapping counter has returned to its usual spot beside the escalators on the second floor — simply show your receipt. And this weekend only, members of our rewards program receive an extra fifteen percent off all toys and games on level three. Not a member yet? Signing up takes two minutes at any register. From all of us at Holbrook’s, happy holidays, and thank you for shopping with us.',
    questions: [
      { prompt: 'What is the announcement mainly about?', options: [['A', 'A store relocation', false], ['B', 'A new rewards program', false], ['C', 'A product recall', false], ['D', 'Extended holiday hours', true]] },
      { prompt: 'Where is the gift-wrapping counter?', options: [['A', 'At the main entrance', false], ['B', 'On level three', false], ['C', 'On the second floor', true], ['D', 'At any register', false]] },
      { prompt: 'How can shoppers get the discount on toys?', options: [['A', 'By being a rewards member', true], ['B', 'By spending over fifty dollars', false], ['C', 'By showing a receipt', false], ['D', 'By shopping after ten p.m.', false]] },
    ],
  },
  {
    title: 'Speech', first: 95, speaker: 'm1', kind: 'speech',
    text: 'Good evening, everyone, and welcome to our annual employee awards dinner. It’s my pleasure to present this year’s Innovation Award. Our winner joined the company just three years ago as a junior engineer in the packaging division. Last spring, she proposed a redesign of our shipping cartons that uses thirty percent less cardboard — an idea that has already saved the company over two hundred thousand dollars and significantly reduced our waste. What impressed the judges most, though, was that she built the first prototypes herself, at her own desk, with a pair of scissors and a glue gun. Please join me in congratulating this year’s winner — Maria Santos!',
    questions: [
      { prompt: 'Where is the speech most likely being given?', options: [['A', 'At a product launch', false], ['B', 'At an awards dinner', true], ['C', 'At a retirement party', false], ['D', 'At a shareholders’ meeting', false]] },
      { prompt: 'What did the winner propose?', options: [['A', 'A redesign of shipping cartons', true], ['B', 'A new adhesive formula', false], ['C', 'A recycling partnership', false], ['D', 'A faster delivery route', false]] },
      { prompt: 'What impressed the judges most?', options: [['A', 'The amount of money saved', false], ['B', 'The winner’s engineering degree', false], ['C', 'The winner’s years of service', false], ['D', 'She built the prototypes herself', true]] },
    ],
  },
  {
    title: 'Excerpt from a training session', first: 98, speaker: 'w2', kind: 'talk',
    text: 'Let’s finish today’s session with the most difficult situation you’ll face on the phones: an angry caller. The single most important rule is — don’t interrupt. Let the customer finish describing the problem completely, even if you spotted the solution in the first ten seconds. Interrupting almost always makes the call longer, not shorter. Then, before offering any fix, briefly repeat the problem back in your own words. This shows the caller that you actually listened, and it’s the fastest way to calm a conversation down. Finally, if you can’t solve the issue yourself, never say “that’s not my department.” Instead, stay on the line while you transfer them, and introduce the caller to your colleague. Tomorrow we’ll practise all of this with role plays in pairs.',
    questions: [
      { prompt: 'What is the training session about?', options: [['A', 'Selling products by phone', false], ['B', 'Writing complaint reports', false], ['C', 'Dealing with upset callers', true], ['D', 'Using new telephone equipment', false]] },
      { prompt: 'According to the speaker, what should employees do first?', options: [['A', 'Offer a quick solution', false], ['B', 'Transfer the call', false], ['C', 'Apologise repeatedly', false], ['D', 'Let the caller finish speaking', true]] },
      { prompt: 'What will participants do tomorrow?', options: [['A', 'Practise role plays', true], ['B', 'Take a written test', false], ['C', 'Listen to recorded calls', false], ['D', 'Visit another department', false]] },
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
    title: 'TOEIC L&R Mock 2 — Listening', title_ja: 'TOEIC L&R 模試2 リスニング',
    mode: 'full_mock', time_limit_seconds: 2700, published: false,
    set_slug: 'toeic-lr-mock-02', set_title: 'TOEIC L&R — Mock Test 2',
    set_title_ja: 'TOEIC L&R 模試2', set_order: 0,
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
    // image_asset_id stays NULL — attach with scripts/attach-toeic-part1-images-02.mjs
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
  console.log('  Part 1 photos: see supabase/TOEIC-PART1-PHOTOS-02.md, then run scripts/attach-toeic-part1-images-02.mjs')
  console.log('  Publish after review: update test_forms set published = true where slug = \'' + FORM_SLUG + '\'')
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
