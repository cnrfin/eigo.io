/**
 * EIKEN Grade Pre-1 — Listening Mock Test 1 (29 questions, CEFR B2).
 *
 *   Part 1 (12) — conversation (4-8 turns, two speakers) + spoken question;
 *                 printed 4-option MCQ (A–D).
 *   Part 2 (12) — SIX ~150-word academic-lite passages, TWO questions each;
 *                 both questions are spoken at the end of the clip
 *                 ('Question No. 13. … Question No. 14. …') and printed.
 *   Part 3 (5)  — Real-Life format: a printed SITUATION (question_groups.
 *                 passage_text) + an announcement/voicemail clip; one printed
 *                 MCQ asking what the listener should do. No spoken question —
 *                 the printed prompt carries it.
 *
 * Level: CEFR B2 — adult work / study / daily-life conversations and
 * academic-lite monologues (science, history, society). TEMPO is 1.0
 * (natural delivery — this is a B2 exam); the atempo stage is kept in
 * joinSegments so the clip-cache hash convention matches the other seeds.
 * Gaps: 0.5 s between turns, 0.8 s before spoken questions.
 * Balanced keys A–D per part, no letter three times in a row.
 * Transcripts contain the correct answers.
 *
 * Seeded UNPUBLISHED (draft for review), set 'eiken-pre1-mock-01' together
 * with the reading/writing/speaking forms from supabase/seed-eiken-pre1-mock.sql.
 *
 * Run locally (uses .env.local — needs SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY):
 *   node --env-file=.env.local scripts/seed-eiken-pre1-listening-mock.mjs
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
const FORM_SLUG = 'eiken-pre1-listening-mock-01'
const MODEL = 'eleven_v3'
const STABILITY = 0.5

// Pre-1 is delivered at natural speed (B2 exam) — no slowdown.
const TEMPO = 1.0
// Gaps: 0.5 s between conversation turns, 0.8 s before spoken questions.
const TURN_GAP = 0.5
const QUESTION_GAP = 0.8

// EIKEN audio is mostly North-American; we keep one UK voice for variety,
// reusing the four voices already used elsewhere in the project.
const US_F = 'uYXf8XasLslADfZ2MB4u'
const US_M = 'UgBBYS2sOqTuMpoF3BR0'
const UK_F = 'lcMyyd2HUfFzxdCaC4Ta'
const UK_M = 'fNYuJl2dBlX9V7NxmjnV'
const VOICE = { narrator: UK_F, m1: US_M, m2: UK_M, w1: US_F, w2: UK_F }
const LABEL = { narrator: 'Narrator', m1: 'Man', m2: 'Man', w1: 'Woman', w2: 'Woman' }

// ────────────────────────────────────────────────────────────────────────────
// Part 1 — 会話の内容一致選択 (12 items, Q1–12)
// Conversation (4-8 turns, two speakers) + spoken question; printed 4-option MCQ.
// Keys: B D A C C B A D B A D C (A:3 B:3 C:3 D:3 — no letter 3× in a row).
// ────────────────────────────────────────────────────────────────────────────
const PART1 = [
  { // 1 — workplace / overseas transfer — key B
    lines: [
      ['w1', "Mark, I heard you applied for the transfer to the Singapore office. Any news?"],
      ['m1', "Actually, yes. They offered me the position yesterday, but I haven't accepted it yet."],
      ['w1', "Really? I thought you'd jump at the chance. You've been talking about working abroad for years."],
      ['m1', "I know, but the timing's complicated. My daughter just started high school, and my wife's business here is finally taking off."],
      ['w1', "Couldn't you go on your own for the first year and see how things work out?"],
      ['m1', "That's exactly what we're discussing tonight. The company needs my answer by Friday."],
    ],
    question: 'What is the man’s problem?',
    options: [
      ['A', 'He was turned down for the overseas position.', false],
      ['B', 'He cannot decide whether to accept an offer.', true],
      ['C', 'His daughter refuses to change schools.', false],
      ['D', 'He missed the application deadline.', false],
    ],
  },
  { // 2 — university / paper extension — key D
    lines: [
      ['m2', "Professor Hale, do you have a moment? It's about my term paper on urban planning."],
      ['w2', 'Of course, come in. Is everything going smoothly?'],
      ['m2', "Not exactly. The city archive I needed was closed for renovation, so I couldn't get to the original documents until this week."],
      ['w2', "I see. That's hardly your fault. How much more time do you think you'd need?"],
      ['m2', 'If I could submit it next Wednesday instead of this Friday, that would be enough.'],
      ['w2', "All right. But given the extra time, I'll expect a particularly thorough analysis."],
    ],
    question: 'What will the student probably do?',
    options: [
      ['A', 'Change the topic of his paper.', false],
      ['B', 'Visit a different archive this week.', false],
      ['C', 'Submit his paper this Friday.', false],
      ['D', 'Hand in his paper next Wednesday.', true],
    ],
  },
  { // 3 — apartment / repairs — key A
    lines: [
      ['w1', "Hello, Mr. Romano? This is Beth Carter in apartment 4B. I'm afraid the kitchen faucet has started leaking again."],
      ['m1', 'Again? I had a plumber fix that just last month.'],
      ['w1', "I know, and it was fine for a few weeks. But now it's worse than before — water is collecting under the sink."],
      ['m1', "That doesn't sound good. It could damage the cabinet. Will you be home tomorrow morning?"],
      ['w1', 'I have to work, but my roommate will be here until noon.'],
      ['m1', "Fine. I'll send someone between nine and eleven, and this time I'll have them put in a completely new faucet."],
    ],
    question: 'What does the landlord decide to do?',
    options: [
      ['A', 'Have the faucet replaced entirely.', true],
      ['B', 'Hire a different plumber next month.', false],
      ['C', 'Inspect the apartment himself.', false],
      ['D', 'Ask the tenant to stay home from work.', false],
    ],
  },
  { // 4 — household budget / gym — key C
    lines: [
      ['m2', "Honey, the gym sent us a renewal notice. The annual fee is going up to six hundred dollars."],
      ['w2', 'Six hundred? That’s a forty-percent increase. How often did we actually go last year?'],
      ['m2', 'Honestly? Maybe twice a month. Mostly we just paid for the privilege of feeling guilty.'],
      ['w2', 'Then renewing makes no sense. The city pool is only four dollars a visit, and we both said we preferred swimming anyway.'],
      ['m2', 'True. And we could jog in the park in the mornings for free.'],
      ['w2', "Right. Let's cancel before the renewal date, then."],
    ],
    question: 'What will the couple probably do?',
    options: [
      ['A', 'Negotiate a lower membership fee.', false],
      ['B', 'Switch to morning classes at the gym.', false],
      ['C', 'Let their gym membership expire.', true],
      ['D', 'Buy exercise equipment for their home.', false],
    ],
  },
  { // 5 — workplace / presentation equipment — key C
    lines: [
      ['w2', "Daniel, about tomorrow's client presentation — have you checked the equipment in the meeting room?"],
      ['m1', "I tried this afternoon, but the projector wouldn't connect to my laptop. IT says they can't look at it until tomorrow afternoon."],
      ['w2', "That's after the presentation. We can't risk it failing in front of the client."],
      ['m1', "I agree. I could print handouts of the slides instead, but it's a forty-page deck."],
      ['w2', "What about booking the small conference room on the sixth floor? Its screen worked perfectly at Monday's meeting."],
      ['m1', "Good thinking. I'll reserve it right now and let the client know about the room change."],
    ],
    question: 'What will the man do next?',
    options: [
      ['A', 'Ask IT to repair the projector immediately.', false],
      ['B', 'Print copies of all his slides.', false],
      ['C', 'Reserve a different meeting room.', true],
      ['D', 'Postpone the client presentation.', false],
    ],
  },
  { // 6 — career / job offer — key B
    lines: [
      ['m2', 'You look thoughtful, Rachel. Everything okay?'],
      ['w1', 'I got a job offer from a design firm in Denver. Better pay, more responsibility — everything I said I wanted.'],
      ['m2', "That's fantastic! So why don't you sound excited?"],
      ['w1', "Because the salary difference disappears once you factor in Denver's rents. And I'd be leaving the team I built here."],
      ['m2', "Have you told your manager? She might match the offer to keep you."],
      ['w1', "That's what I'm leaning toward — at least giving her the chance before I decide anything."],
    ],
    question: 'What will the woman probably do first?',
    options: [
      ['A', 'Accept the position in Denver.', false],
      ['B', 'Discuss the offer with her manager.', true],
      ['C', 'Look for a cheaper apartment.', false],
      ['D', 'Ask her team members for advice.', false],
    ],
  },
  { // 7 — hotel / noise complaint — key A
    lines: [
      ['m1', "Good evening. I'm in room 512. I hate to complain, but there's construction noise coming from the floor above, and I have an early flight tomorrow."],
      ['w2', "I'm terribly sorry, sir. We're renovating the sixth floor, but the workers should have finished at five."],
      ['m1', "Well, the drilling is still going on now, at nine o'clock."],
      ['w2', "That's unacceptable. I'll call the site manager right away. In the meantime, I can move you to a quiet room on the third floor, well away from the work area."],
      ['m1', "I'd appreciate that. I just need a decent night's sleep."],
      ['w2', "Of course. I'll also arrange a complimentary breakfast for the inconvenience."],
    ],
    question: 'What does the woman offer to do for the man?',
    options: [
      ['A', 'Move him to a quieter room.', true],
      ['B', 'Refund his room charge.', false],
      ['C', 'Book him onto a later flight.', false],
      ['D', 'Halt the renovation work for the week.', false],
    ],
  },
  { // 8 — home renovation / estimates — key D
    lines: [
      ['w2', "I've been comparing the two estimates for the kitchen renovation. Hartley Brothers want twenty-two thousand."],
      ['m2', 'And the other company?'],
      ['w2', "Eighteen, but they can't start until October, and their price doesn't include removing the old cabinets."],
      ['m2', 'So once you add that in, the difference pretty much disappears.'],
      ['w2', "Exactly. And Hartley could begin next month and finish well before your parents visit at Thanksgiving."],
      ['m2', "That settles it, then. Let's go with the higher bid — it's actually the better deal."],
    ],
    question: 'Why do the speakers choose Hartley Brothers?',
    options: [
      ['A', 'Their estimate is the lowest overall.', false],
      ['B', 'They were recommended by relatives.', false],
      ['C', 'They offer a longer guarantee.', false],
      ['D', 'They can complete the work sooner.', true],
    ],
  },
  { // 9 — commuting / lifestyle — key B
    lines: [
      ['m2', "Morning, Keiko. I didn't know you cycled to work. Where's your car?"],
      ['w1', 'I sold it last month. Between the parking fees and the insurance, it was costing me a fortune.'],
      ['m2', "But isn't the ride exhausting? You live pretty far out."],
      ['w1', "It's about forty minutes, but the city just opened a riverside cycle path, so I avoid the traffic completely. Honestly, it's faster than driving during rush hour."],
      ['m2', 'Hmm, maybe I should give it a try. My doctor keeps telling me I need more exercise.'],
      ['w1', 'You can borrow my old bike this weekend and see how you find it.'],
    ],
    question: 'Why did the woman start cycling to work?',
    options: [
      ['A', 'Her doctor advised her to exercise more.', false],
      ['B', 'Keeping a car was too expensive.', true],
      ['C', 'Her car broke down last month.', false],
      ['D', 'The bus service in her area was cut.', false],
    ],
  },
  { // 10 — student / internship decision — key A
    lines: [
      ['w2', 'So, Jason, you wanted to talk about your course selection for next semester?'],
      ['m1', "Yes. I'm torn between the advanced statistics seminar and the marketing internship program."],
      ['w2', "Both are valuable. What's your hesitation?"],
      ['m1', "The internship runs three days a week, so I'd have to drop another class to fit it in — which would mean graduating a semester late."],
      ['w2', 'True. But employers in your field consistently tell us they value practical experience over one more elective. A single semester’s delay rarely matters.'],
      ['m1', "That's reassuring. In that case, I'll put in my application for the internship today."],
    ],
    question: 'What has the man decided to do?',
    options: [
      ['A', 'Apply for the internship program.', true],
      ['B', 'Take the statistics seminar instead.', false],
      ['C', 'Graduate a semester earlier than planned.', false],
      ['D', 'Drop out of the marketing program.', false],
    ],
  },
  { // 11 — neighborhood / community garden — key D
    lines: [
      ['w1', "Oh, Mr. Aldridge, I'm glad I caught you. Did you see the notice about turning the empty lot on Birch Street into a community garden?"],
      ['m2', "I did. To be honest, I'm skeptical. Who's going to maintain it? These projects always start with enthusiasm and end up abandoned."],
      ['w1', "That's why the residents' association is proposing a rotation system — each household would look after it for just one week a year."],
      ['m2', 'One week a year? That sounds manageable, I suppose.'],
      ['w1', "There's a planning meeting on Thursday evening at the community center. We'd value your experience — you kept that beautiful garden of yours for years."],
      ['m2', 'Well, I can at least come and hear the details before I make up my mind.'],
    ],
    question: 'What will the man probably do on Thursday?',
    options: [
      ['A', 'Sign up to maintain the garden.', false],
      ['B', 'Start clearing the empty lot.', false],
      ['C', 'Vote against the proposal.', false],
      ['D', 'Attend a meeting about the plan.', true],
    ],
  },
  { // 12 — car repair / phone call — key C
    lines: [
      ['m1', 'Ms. Porter? This is Vince from Eastside Auto, calling about your car.'],
      ['w2', "Oh, yes. Did you find out what's causing that noise?"],
      ['m1', "We did. The good news is the engine's fine. The bad news is the transmission needs major work — around two thousand dollars, parts and labor."],
      ['w2', "Two thousand? The car's barely worth three. Is it even worth repairing?"],
      ['m1', "Frankly, in your position, I'd put that money toward a newer vehicle. We do have some certified used cars on the lot, if you'd like to take a look."],
      ['w2', "I think I'd better do that. Could I come by on Saturday morning?"],
    ],
    question: 'What does the woman decide to do?',
    options: [
      ['A', 'Pay for the transmission repair.', false],
      ['B', 'Get an estimate from another garage.', false],
      ['C', 'Look at used cars on Saturday.', true],
      ['D', 'Sell her car to the mechanic.', false],
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Part 2 — 文の内容一致選択 (6 passages × 2 questions, Q13–24)
// ~150-word academic-lite passage; BOTH questions spoken at the end of the
// clip ('Question No. 13. … Question No. 14. …') and printed with 4 options.
// Keys: Q13–24 = A C D B A D B A D C C B (A:3 B:3 C:3 D:3 — no run of 3).
// ────────────────────────────────────────────────────────────────────────────
const PART2 = [
  { // (A) Q13–14 — society/science: urban beekeeping — keys A, C
    title: 'Rooftop Honey',
    speaker: 'w1',
    text: 'In recent years, beekeeping has moved from the countryside into the heart of major cities. Hotels, banks, and even opera houses in London, Paris, and Tokyo now keep beehives on their roofs. Surprisingly, urban bees often produce more honey than rural ones. City parks and gardens contain a wide variety of flowering plants throughout the year, while modern farmland is frequently planted with a single crop that blooms for only a few weeks. In addition, cities tend to use fewer of the agricultural chemicals that can harm bees. However, experts warn that the trend has limits. If too many hives are concentrated in one neighborhood, the bees compete for nectar, and wild pollinators such as butterflies and native bees may be pushed out. Some cities, including London, now encourage residents to plant more flowers instead of simply adding more hives.',
    questions: [
      {
        prompt: 'Why do urban bees often produce more honey than rural bees?',
        options: [
          ['A', 'Cities offer a variety of flowers throughout the year.', true],
          ['B', 'City hives are larger than rural ones.', false],
          ['C', 'Urban beekeepers use special equipment.', false],
          ['D', 'Rural bees lose their honey to wild animals.', false],
        ],
      },
      {
        prompt: 'What is one thing experts warn about?',
        options: [
          ['A', 'Honey from city rooftops may be unsafe to eat.', false],
          ['B', 'Hotels are losing interest in keeping bees.', false],
          ['C', 'Too many hives can push out wild pollinators.', true],
          ['D', 'City bees need more chemicals than farm bees.', false],
        ],
      },
    ],
  },
  { // (B) Q15–16 — history: the longitude problem — keys D, B
    title: 'The Carpenter’s Clock',
    speaker: 'm2',
    text: 'For centuries, sailors could easily determine how far north or south they were by observing the sun and stars. Finding their east-west position, known as longitude, was far more difficult, and mistakes often led to shipwrecks. In 1714, the British government offered a huge cash prize to anyone who could solve the problem. Most scientists believed the answer lay in astronomy, and they largely ignored John Harrison, a self-taught carpenter who insisted that the solution was an extremely accurate clock. If sailors knew the exact time back home, they could compare it with local time at sea and calculate their position. Harrison spent more than forty years building and improving his marine clocks. His fourth design lost only a few seconds during a voyage across the Atlantic. Although officials were slow to pay him the full prize, his invention transformed ocean navigation.',
    questions: [
      {
        prompt: 'What was John Harrison’s solution to the longitude problem?',
        options: [
          ['A', 'A new method of observing the stars.', false],
          ['B', 'A more detailed map of the Atlantic.', false],
          ['C', 'A faster type of sailing ship.', false],
          ['D', 'A highly accurate clock.', true],
        ],
      },
      {
        prompt: 'What do we learn about Harrison?',
        options: [
          ['A', 'He was a well-known astronomer.', false],
          ['B', 'He worked on his clocks for over forty years.', true],
          ['C', 'He received the prize money immediately.', false],
          ['D', 'His first design was tested on the Atlantic.', false],
        ],
      },
    ],
  },
  { // (C) Q17–18 — science: sleep and memory — keys A, D
    title: 'Why All-Nighters Fail',
    speaker: 'w2',
    text: 'Students often stay up all night studying before an exam, but research suggests this strategy may backfire. Scientists have found that sleep plays a central role in fixing new information into long-term memory. During deep sleep, the brain replays patterns of activity that occurred during the day, strengthening the connections between brain cells. In one experiment, two groups of volunteers learned a list of word pairs. Those who slept for eight hours afterward remembered significantly more pairs than those who stayed awake, even after the second group was later allowed to rest. Sleep before learning matters as well: other studies show that tired brains are slower to absorb new material in the first place. Researchers therefore advise students to spread their study over several days and protect their sleep, rather than sacrificing it for a few extra hours with their textbooks.',
    questions: [
      {
        prompt: 'According to the speaker, what happens during deep sleep?',
        options: [
          ['A', 'The brain replays the day’s activity to strengthen memory.', true],
          ['B', 'The brain erases unnecessary information.', false],
          ['C', 'New brain cells are produced rapidly.', false],
          ['D', 'The brain stops reacting to outside noise.', false],
        ],
      },
      {
        prompt: 'What do researchers advise students to do?',
        options: [
          ['A', 'Study together with a partner before exams.', false],
          ['B', 'Take short naps during study breaks.', false],
          ['C', 'Memorize new material early in the morning.', false],
          ['D', 'Spread their study over several days and sleep well.', true],
        ],
      },
    ],
  },
  { // (D) Q19–20 — history/environment: the Aral Sea — keys B, A
    title: 'A Disappearing Sea',
    speaker: 'm1',
    text: 'The Aral Sea, lying between Kazakhstan and Uzbekistan, was once the fourth-largest lake in the world. In the 1960s, planners in the Soviet Union began diverting the two rivers that fed the lake in order to irrigate enormous cotton fields in the surrounding desert. The project made the region a major cotton producer, but the cost was severe. Starved of fresh water, the lake began to shrink, and within a few decades it had lost more than half its area. Fishing towns that once stood on the shore found themselves dozens of kilometers from the water, and the local fishing industry collapsed. Wind picked up salt and chemicals from the exposed lakebed, damaging crops and public health. More recently, however, a dam completed in 2005 has helped the smaller northern part of the lake recover, and fish catches there have slowly begun to rise.',
    questions: [
      {
        prompt: 'Why did the Aral Sea begin to shrink?',
        options: [
          ['A', 'The region’s climate suddenly became hotter.', false],
          ['B', 'Water from its rivers was redirected to farmland.', true],
          ['C', 'A dam was built across the lake in the 1960s.', false],
          ['D', 'Fishing towns used up too much of its water.', false],
        ],
      },
      {
        prompt: 'What has happened since 2005?',
        options: [
          ['A', 'Part of the lake has started to recover.', true],
          ['B', 'Cotton farming has been completely abandoned.', false],
          ['C', 'All of the fishing towns have been rebuilt.', false],
          ['D', 'The southern part has returned to its full size.', false],
        ],
      },
    ],
  },
  { // (E) Q21–22 — society: four-day workweek — keys D, C
    title: 'The Four-Day Experiment',
    speaker: 'w2',
    text: 'In recent years, companies in several countries have experimented with a four-day workweek, in which employees work fewer hours for the same pay. The largest trial so far took place in the United Kingdom, involving around sixty companies and almost three thousand workers. The results attracted worldwide attention. Most participating companies reported that productivity stayed the same or improved, while employees said they slept better, exercised more, and spent more time with their families. Resignations fell sharply, which saved companies the considerable cost of hiring and training replacements. Nevertheless, the model does not suit every workplace. Hospitals, restaurants, and factories that must operate continuously found scheduling difficult, and some employees felt pressure to squeeze five days of work into four. Even so, when the British trial ended, more than ninety percent of the companies decided to continue with the shorter week.',
    questions: [
      {
        prompt: 'What was one result of the British trial?',
        options: [
          ['A', 'Productivity fell slightly at most companies.', false],
          ['B', 'Employees demanded higher salaries.', false],
          ['C', 'Hiring costs increased at most firms.', false],
          ['D', 'Far fewer workers quit their jobs.', true],
        ],
      },
      {
        prompt: 'What problem did some workplaces experience?',
        options: [
          ['A', 'Customers complained about shorter opening hours.', false],
          ['B', 'Managers refused to take part in the trial.', false],
          ['C', 'Arranging continuous staffing was difficult.', true],
          ['D', 'Employees took too many days of sick leave.', false],
        ],
      },
    ],
  },
  { // (F) Q23–24 — science: firefly decline — keys C, B
    title: 'Fading Lights',
    speaker: 'm2',
    text: 'On summer evenings, fireflies once filled fields and gardens with their glow, but in many regions their numbers are falling. Scientists studying the decline point to three main causes. The first is the loss of habitat, as wetlands and meadows are converted into housing and roads. The second is the use of pesticides, which kill not only the fireflies themselves but also the snails and worms that their young feed on. The third, and perhaps most surprising, is artificial light. Fireflies flash to attract partners, and each species has its own pattern of signals. Streetlights and bright signs can drown out these signals, so the insects fail to find one another. Researchers say ordinary citizens can help: turning off garden lights on summer nights, leaving a wild corner in the yard, and avoiding chemical sprays all make gardens friendlier to fireflies.',
    questions: [
      {
        prompt: 'According to scientists, why is artificial light a problem for fireflies?',
        options: [
          ['A', 'It raises the temperature above gardens.', false],
          ['B', 'It attracts birds that feed on fireflies.', false],
          ['C', 'It interferes with their mating signals.', true],
          ['D', 'It permanently changes the color of their flashes.', false],
        ],
      },
      {
        prompt: 'What is one way people can help fireflies?',
        options: [
          ['A', 'Catching them and releasing them in fields.', false],
          ['B', 'Switching off outdoor lights at night.', true],
          ['C', 'Feeding their young with fresh leaves.', false],
          ['D', 'Planting bright flowers near streetlights.', false],
        ],
      },
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Part 3 — Real-Life形式 (5 items, Q25–29)
// Printed SITUATION (question_groups.passage_text) + announcement/voicemail
// audio; one printed MCQ asking what the listener should do. No spoken
// question — the printed prompt carries it.
// Keys: C A D B A (A:2 B:1 C:1 D:1 — no run of 3).
// ────────────────────────────────────────────────────────────────────────────
const PART3 = [
  { // 25 — airport announcement — key C
    situation: 'You are at an airport in Chicago. You have a connecting flight to Boston and want to get there today. You hear the following announcement.',
    speaker: 'w2',
    text: 'Attention, passengers. Due to a mechanical issue, Flight 270 to Boston, scheduled to depart at three p.m. from Gate 12, has been canceled. Passengers holding tickets for Flight 270 have two options. Those who wish to travel today may take Flight 488, departing at five thirty p.m. To reserve a seat on Flight 488, please proceed to the transfer desk in Terminal 2 as soon as possible, as seats are limited. Passengers who prefer to travel tomorrow morning instead should go to the airline service counter near Gate 5, where hotel vouchers for tonight will be provided. We apologize for the inconvenience and thank you for your patience.',
    prompt: 'What should you do?',
    options: [
      ['A', 'Go to the service counter near Gate 5.', false],
      ['B', 'Wait at Gate 12 for further information.', false],
      ['C', 'Reserve a seat at the transfer desk in Terminal 2.', true],
      ['D', 'Pick up a hotel voucher for tonight.', false],
    ],
  },
  { // 26 — dentist voicemail — key A
    situation: 'You have a dental appointment next Tuesday at 4 p.m. Because of your job, you cannot leave work before 5 p.m. on weekdays. You hear this voicemail from your dentist’s office.',
    speaker: 'w1',
    text: 'Hello, this is Riverside Dental calling for Ms. Walker. Unfortunately, Dr. Shaw has to attend a conference next Tuesday afternoon, so we need to reschedule your four o’clock appointment. We can offer you three alternatives: Tuesday at nine a.m. with Dr. Shaw, Wednesday at five thirty p.m. with Dr. Patel, or the following Monday at four p.m. with Dr. Shaw. Dr. Patel is new to our clinic but comes highly recommended. Please call us back by Friday to let us know which appointment you would like, or we will have to cancel your booking. Thank you, and we apologize for the change.',
    prompt: 'What should you do?',
    options: [
      ['A', 'Ask for the Wednesday evening appointment.', true],
      ['B', 'Take the Tuesday morning slot with Dr. Shaw.', false],
      ['C', 'Keep your original appointment time.', false],
      ['D', 'Visit the clinic next Monday at 4 p.m.', false],
    ],
  },
  { // 27 — museum announcement — key D
    situation: 'You are visiting a science museum. It is now 1:30 p.m., and you want to see the 2:30 planetarium show, but you have not bought a ticket for it yet. You hear the following announcement.',
    speaker: 'm1',
    text: 'Good afternoon, visitors. Today’s special planetarium show, Journey to Mars, will begin at two thirty p.m. Please note that planetarium tickets are not included in general admission and must be purchased separately. Tickets for the two thirty show are on sale now at the information desk on the first floor until two p.m. Any remaining tickets will then be sold at the planetarium entrance on the third floor from two fifteen. Seats are limited, and this morning’s show sold out well before it began, so we strongly recommend purchasing your ticket early. Thank you, and enjoy your visit.',
    prompt: 'What should you do?',
    options: [
      ['A', 'Go straight to the planetarium entrance on the third floor.', false],
      ['B', 'Wait until 2:15 to buy a ticket.', false],
      ['C', 'Show your general admission ticket at the show.', false],
      ['D', 'Buy a ticket at the first-floor information desk now.', true],
    ],
  },
  { // 28 — language school orientation — key B
    situation: 'You are a new student at a language school. You want to join the conversation club, which meets on Thursdays. You hear the following announcement during orientation.',
    speaker: 'w2',
    text: 'Welcome to Westgate Language School. Before we finish, a few words about our clubs. The film club meets on Mondays in Room 4 — no registration is needed, so just come along. The conversation club is extremely popular and is limited to fifteen members, so you must sign up in advance. Please note that registration is no longer handled at the school office. Instead, write your name on the sign-up sheet posted on the noticeboard in the student lounge by Wednesday afternoon. Places will be given in order of sign-up, and the first meeting is this Thursday at six p.m. We look forward to seeing you there.',
    prompt: 'What should you do to join the conversation club?',
    options: [
      ['A', 'Go to the school office before Wednesday.', false],
      ['B', 'Write your name on the list in the student lounge.', true],
      ['C', 'Simply attend the meeting on Thursday at 6 p.m.', false],
      ['D', 'Sign up at the film club meeting on Monday.', false],
    ],
  },
  { // 29 — department store announcement — key A
    situation: 'You are shopping at a department store. You parked your gray van, whose license plate begins with 7JK, on level two of the store’s parking garage. You hear the following announcement.',
    speaker: 'm2',
    text: 'May I have your attention, please. This is an announcement for the owner of a gray van with a license plate beginning with seven, J, K, parked on level two of the parking garage. Your vehicle’s headlights have been left on. To avoid draining your battery, please go to the security office, located next to the garage elevator on level one, where a member of our staff will accompany you to your vehicle. Please note that the parking garage closes at nine p.m. tonight. We thank you for shopping with us and wish you a pleasant evening.',
    prompt: 'What should you do?',
    options: [
      ['A', 'Go to the security office next to the level-one elevator.', true],
      ['B', 'Move your van to a different level before 9 p.m.', false],
      ['C', 'Wait beside your van for a member of staff.', false],
      ['D', 'Report your license plate number at the information desk.', false],
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
  const dir = mkdtempSync(join(tmpdir(), 'eiken-pre1-'))
  try {
    const inputs = [], filters = [], labels = []
    segments.forEach((seg, i) => {
      const p = join(dir, `seg${i}.mp3`); writeFileSync(p, seg.buffer)
      inputs.push('-i', p)
      // Constant tempo applied to every segment BEFORE the padded gap
      // (TEMPO is 1.0 for Pre-1 — natural B2 delivery — but the stage is
      // kept so the clip-cache hash convention matches the other seeds).
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
    .from('exam_tracks').select('id').eq('slug', 'eiken-grade-pre1').single()
  if (trackErr || !track) throw new Error('Track eiken-grade-pre1 not found — run add-practice-tests.sql first.')

  await cleanup(supabase)

  const formId = await insertOne(supabase, 'test_forms', {
    track_id: track.id, slug: FORM_SLUG,
    title: 'EIKEN Grade Pre-1 — Listening Mock Test 1', title_ja: '英検準1級 リスニング模試1',
    mode: 'full_mock', time_limit_seconds: 1800, published: false,
    set_slug: 'eiken-pre1-mock-01', set_title: 'EIKEN Grade Pre-1 — Mock Test 1',
    set_title_ja: '英検準1級 模試1', set_order: 2,
  })

  // ── Part 1: Conversation comprehension ──
  let sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 1', title: 'Conversation Comprehension (会話の内容一致選択)',
    instructions: 'Listen to the conversation and the question, then choose the best answer from the four printed choices (A–D). Everything is heard only once.',
    order_index: 0,
  })
  for (const [i, item] of PART1.entries()) {
    process.stdout.write(`Part 1 — item ${i + 1}/12 (Q${i + 1}): audio… `)
    const turns = item.lines.map(([speaker, text], li) => ({
      speaker, text, gap: li === item.lines.length - 1 ? QUESTION_GAP : TURN_GAP,
    }))
    const lines = [
      { speaker: 'narrator', text: `Number ${i + 1}.`, gap: TURN_GAP },
      ...turns,
      { speaker: 'narrator', text: `Question. ${item.question}`, gap: 0.3 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p1-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, item.question, item.options)
    console.log('done.')
  }

  // ── Part 2: Passage comprehension (2 questions per passage) ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 2', title: 'Passage Comprehension (文の内容一致選択)',
    instructions: 'Listen to the passage. Two questions follow each passage; both are spoken after the passage and printed below with four choices (A–D). Everything is heard only once.',
    order_index: 1,
  })
  for (const [i, item] of PART2.entries()) {
    const num1 = 13 + i * 2
    const num2 = num1 + 1
    process.stdout.write(`Part 2 — passage ${i + 1}/6 (Q${num1}–${num2}): audio… `)
    const lines = [
      { speaker: 'narrator', text: `Numbers ${num1} and ${num2}. ${item.title}.`, gap: TURN_GAP },
      { speaker: item.speaker, text: item.text, gap: QUESTION_GAP },
      { speaker: 'narrator', text: `Question Number ${num1}. ${item.questions[0].prompt}`, gap: QUESTION_GAP },
      { speaker: 'narrator', text: `Question Number ${num2}. ${item.questions[1].prompt}`, gap: 0.3 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p2-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
    })
    await addQuestion(supabase, groupId, 0, item.questions[0].prompt, item.questions[0].options)
    await addQuestion(supabase, groupId, 1, item.questions[1].prompt, item.questions[1].options)
    console.log('done.')
  }

  // ── Part 3: Real-Life format ──
  sec = await insertOne(supabase, 'sections', {
    form_id: formId, skill: 'listening', part_label: 'Part 3', title: 'Real-Life Listening (Real-Life形式の内容一致選択)',
    instructions: 'Read the printed Situation first (you have 10 seconds in the real exam). Then listen to the announcement or message and choose the best answer from the four printed choices (A–D). No question is spoken. Everything is heard only once.',
    order_index: 2,
  })
  for (const [i, item] of PART3.entries()) {
    const num = 25 + i
    process.stdout.write(`Part 3 — item ${i + 1}/5 (Q${num}): audio… `)
    const lines = [
      { speaker: 'narrator', text: `Number ${num}.`, gap: QUESTION_GAP },
      { speaker: item.speaker, text: item.text, gap: 0.3 },
    ]
    const assetId = await uploadClip(supabase, `listening/${FORM_SLUG}-p3-${i + 1}.mp3`, lines)
    const groupId = await insertOne(supabase, 'question_groups', {
      section_id: sec, order_index: i, stimulus_type: 'audio', audio_asset_id: assetId,
      passage_text: `Situation: ${item.situation}`,
    })
    await addQuestion(supabase, groupId, 0, item.prompt, item.options)
    console.log('done.')
  }

  console.log(`\n✓ Seeded ${FORM_SLUG} — 29 listening questions (Part 1:12 Part 2:12 Part 3:5). UNPUBLISHED (draft).`)
  console.log('  Publish after review: update test_forms set published = true where slug = \'' + FORM_SLUG + '\'')
}

main().catch(err => { console.error('\nSeed failed:', err.message); process.exit(1) })
