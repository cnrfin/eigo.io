# AI classroom: panel, cards, word list and welcome call: implementation plan

Status: phases 1–2 built. Phase 1: side panel with chat and word list in both classrooms, save animations (`save-fly.ts`). Phase 2: correction and "How do I say…?" cards in all AI lessons (`AiCards.tsx`, helper `ai-assist` + `lib/ai-tutor/assist.ts` / `cards.ts`, voice matching `voice-match.ts`); migration `add-ai-panel.sql` applied.

UI rule: simple and clutter-free, existing eigo patterns, no AI-generated UI hallmarks. No "listening" badge anywhere: the student can always answer by voice, and each screen's instruction line ("タップか声で答えてください") says so.

## 1. What we're building

**Cards** slide up over whatever is in the main slot (slide, whiteboard or panel), one at a time:
- **Correction:** the mistake (struck through), the natural version, a one-line reason in Japanese. All AI lessons.
- **How do I say…?:** the student says something in Japanese or asks "How do you say…?"; the card shows the natural English plus a polite and a casual version. All AI lessons.
- **About you:** the facts gathered in the get-to-know-you part, to confirm and save to "About me". **Welcome call only.**

**The panel** is a third screen in the main slot, next to the slides and the whiteboard. It's square, flush left, with no border; the video tiles take the rest of the width. **Free talk only** (no course open), plus the daily AI review later. It hosts:
- Role-play scene (situation, goal, 60-second countdown, sentence starters)
- Course picks (2×2, the booking course-picker card; tapping one opens that course)
- Exercises: fill the gap, find the mistake, word order, read aloud (word recognition only, no pronunciation score)

**Word list:** this lesson's saved phrases, newest first, in a floating side panel shared with the chat (one at a time). AI classroom **and** tutor classroom. No review in class: the review comes after.

**Saving:** a correction or "How do I say…?" phrase saves itself a few seconds after it appears (or straight away on "save it"). The whole card shrinks into the word-bank button, which flashes white and squashes, with an undo. If the word list is open, it shrinks into its new row instead.

**End of call:** speaking time (with change since the first call from the second lesson on), longest answer, phrases saved, today's phrases, next lesson. For the welcome call: the plans button, and the About-you check if it wasn't confirmed.

**Welcome call (5 minutes):** follows the agreed timeline:

| Time | What happens |
|---|---|
| 0:00–0:30 | Hello, plus "you can say it in Japanese if you get stuck" |
| 0:30–1:45 | Get to know them: job, why English, goal, interests |
| ~1:45 | About-you card |
| 1:45–3:15 | 60-second role-play built on their goal (panel); corrections as cards, saved to the word list |
| 3:15–4:15 | One strength, one thing to work on; course picks on the panel |
| 4:15–5:00 | Recap and invite back; end-of-call screen |

## 2. Rules that keep it safe

- **The panel only exists in free talk** (no course open) and, later, in the AI review. With a course open:
  - the panel button is hidden
  - the panel cues aren't in the AI tutor's brief
  - the helper is never asked for panel content
  - the browser ignores panel cues even if the AI tutor says one

  This means "role play" on a course slide can never open the role-play screen. Opening a course from course picks switches the slot to the slides and the panel goes away.
- **The About-you card only exists in the welcome call** (`profiles.ai_trial_booking_id = booking.id`, already sent as `JoinInfo.aiWelcome`).
- **Nothing on screen is written by the voice model.** It only talks. A helper text model (the `ai-turn` pattern) decides and fills the cards and panel screens with structured JSON; the browser renders our own components. Taps and voice answers go back to the AI tutor as notes, the way `view` notes do today.
- **Spoken cues, not tool calls,** for anything the AI tutor starts (as with opening the course and the whiteboard): "Let's do a quick role-play", "Let's try a quick exercise", "Here are some courses for you". Questions don't trigger them.
- **Saving needs no confirmation** but always has an undo, and only the corrected phrase is ever saved.
- **About me is only written after a tap or a spoken "yes".** The new lines are added to what's there, never replacing it.
- **Voice answers only match what's on screen.** The browser matches the student's live transcript against the options shown; anything free-form (for example Japanese for course picks) goes to the helper with the options listed.

## 3. How it works

### 3.1 The helper (server)

Extend `ai-turn` rather than adding a second call per turn: one fast text model call (`AI_TUTOR_TURN_MODEL`) after each turn returns:

```
{ move, slide,                          // as today (course lessons)
  card?:  { kind: 'correction', was, now, why_ja }
        | { kind: 'say', heard_ja, normal, polite, casual }
        | { kind: 'about', rows: [{ key, value }] },        // welcome call only
  profile?: { job?, goal?, interests?, uses? } }            // running facts, welcome call only
```

- Free talk lessons call it too (today only course lessons do), with no slide fields.
- New lib `src/lib/ai-tutor/assist.ts` holds the prompt and the parsing; `turn.ts` keeps the slide part.
- **Panel content** comes from a separate on-demand call, `POST /api/classroom/[id]/ai-panel { what: 'roleplay' | 'courses' | 'gap' | 'mistake' | 'order' | 'read', lines }`. It runs when the AI tutor says a panel cue, and returns the screen's JSON:
  - role-play: scene id, goal and starters
  - courses: four catalog ids, the top pick first, free talk always last
  - exercises: the sentence, options and answer, built from this lesson's corrections and phrases
- Refused (403) when a course is open or it isn't an AI lesson.
- Course picks reuse `slide-courses/catalog` (it already returns level, scenes and progress).

### 3.2 The browser (AiRoom)

- `cards` state: one card at a time. A new card replaces the old one; the save timer is about 5 seconds. A correction or "say" card tells the AI tutor "saved" or "the student chose the polite version" through a new `ai-context` action, `{ kind: 'panel', note }`.
- `panel` state: `null` or the current screen; the main slot shows `'slides' | 'whiteboard' | 'panel'`. Stored in `classroom_sessions.state.panel`, so a reconnect brings it back.
- **Voice matching:** new `src/lib/ai-tutor/voice-match.ts` (`norm`, `near`, `inOrder`, from the mockup), fed by `session.input_transcript.delta`. Each screen and card declares what it accepts. Results go to the AI tutor as notes ("Gap fill: correct on the 2nd try").
- **Brief (`brief.ts`):**
  - free talk gets the panel cues and "wait for the screen's result note before reacting to an answer"
  - all AI lessons get "when you correct, say: *A more natural way is: …*" (makes the helper's job easy)
  - the welcome call gets the new timeline script (section 1)

### 3.3 Layout

- `computeLayout` gets a `slot: 'slide' | 'panel'` option: for the panel the slot is square, flush left, as tall as the room allows, and the tiles take the leftover width (at least 160px).
- **Side panel:** the chat and the word list become one floating side panel (absolute, over the right edge), in both `Room.tsx` and `AiRoom.tsx`. Opening one replaces the other; tapping the open one closes it. The chat no longer squeezes the layout (`chatOpen` drops out of `computeLayout`). On narrow screens it keeps today's full-height behaviour.

### 3.4 Data (one migration, applied only with approval)

1. `vocabulary_phrases.source`: allow `'tutor'` (CHECK in `supabase/add-classroom.sql`, section 9). Key `(user, 'tutor', 'tutor:<hash of phrase>')`; the review card is due tomorrow, as for other sources. `words` route: add `'tutor'` to `SOURCES`; the source label in the list is the AI tutor's name.
2. `bookings.ai_stats JSONB NULL`: `{ speakingSec, totalSec, longestSec, saved }`, written by the final `ai-transcript` call from the transcript timings, so "+18% since your first call" can compare against the first AI booking's stats.

No new tables. The About-you save updates `ai_tutor_profiles.settings.aboutMe` (600-character limit, added to, never replacing).

## 4. Files

**New:**
- `src/lib/ai-tutor/assist.ts`
- `src/lib/ai-tutor/voice-match.ts`
- `src/lib/ai-tutor/panel.ts` (screen types and validation)
- `src/app/api/classroom/[id]/ai-panel/route.ts`
- `src/app/api/classroom/[id]/ai-profile/route.ts` (About-you save)
- `src/components/classroom/cards/`: `CardHost.tsx`, `CorrectionCard.tsx`, `SayCard.tsx`, `AboutCard.tsx`, `save-fly.ts` (the shared-element shrink and the button flash)
- `src/components/classroom/panel/`: `AiPanel.tsx` (host and square slot), `RolePlay.tsx`, `CoursePicks.tsx` (renders the `CourseSheet` card; export it from there rather than copying), `GapFill.tsx`, `FindMistake.tsx`, `WordOrder.tsx`, `ReadAloud.tsx`
- `src/components/classroom/SidePanel.tsx` (chat or words), `WordList.tsx`
- `src/components/classroom/AiLessonEnd.tsx`
- `supabase/add-ai-panel.sql`

**Changed:**
- `AiRoom.tsx` (cards, panel, slot switching, voice matching, panel button for free talk)
- `Room.tsx` (side panel and word list)
- `ChatPanel.tsx` (moves into `SidePanel`)
- `classroom.css`
- `layout.ts`
- `ai-turn/route.ts` and `turn.ts`
- `ai-context/route.ts` (the `panel` action)
- `ai-transcript/route.ts` (stats)
- `words/route.ts` (`tutor` source)
- `brief.ts`
- `client.ts`
- `booking/CourseSheet.tsx` (export `Card`)

## 5. Phases

| Phase | What | Notes |
|---|---|---|
| 1 | Side panel: chat and word list, floating, in both classrooms; `tutor` word source; the save shrink and flash | Useful on its own (tutor classroom too). Migration item 1 |
| 2 | Helper and cards: corrections and "How do I say…?" in all AI lessons; voice matching for cards; brief wording for corrections | **Built.** The helper is its own small route (`ai-assist`), asked only after turns that look like a correction or a translation (`mayHaveCard`), rather than part of `ai-turn` |
| 3 | Panel host and layout; role-play; course picks; free-talk-only gating; welcome-call script, About-you card and save | The full welcome call works end to end after this |
| 4 | Exercises (gap, mistake, order, read aloud) with voice answers | Built from the lesson's own corrections and phrases |
| 5 | End-of-call screen and stats | Migration item 2 |
| Later | Daily AI review: the same exercise screens, fed by the student's review cards | Separate feature |

Each phase: type-check, lint, the classroom test harness (`run7`, extended), a test page with the real components (`mockups/_*`, not committed), then a commit command.

## 6. Tests to add

- Gating:
  - with a course open, a panel cue does nothing
  - `ai-panel` returns 403
  - the panel button is hidden
  - "role play" on a course slide doesn't open anything
- The About-you card appears only when `aiWelcome` is set, and saving adds to "About me" without replacing it
- The correction card saves after the timer, undo deletes the phrase, and the mistake is never saved
- Voice matching:
  - only on-screen options are accepted
  - a word heard as nearly the same ("wifey" for "Wi-Fi") doesn't count as read
  - word order fills in spoken order
- Side panel: opening the chat closes the word list and the other way round; the layout doesn't change size when either opens
- Stats: speaking time and longest answer from a known transcript

## 7. Risks and open points

- **Helper misses or false corrections:** the card only shows when the AI tutor's own words contain the better version (it said it out loud), so a card never contradicts the voice.
- **Short single words are misheard** (can / could): only on-screen options count, and a wrong guess can be retried by tap.
- **The AI tutor reacting before the screen result:** the brief tells it to wait for the note; the notes arrive within about a second.
- **Cost:** the helper already runs per turn in course lessons. Adding free talk and the card fields keeps it at about ¥1–2 a lesson; `ai-panel` is a few calls a lesson.
- **Open:**
  - Card position while the side panel is open: overlap is fine for now
  - Whether the tutor classroom's word list should also show the teacher's chat phrases as saveable: today only the student saves, and that stays
