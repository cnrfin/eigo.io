# Classroom test suite

Tests for the live classroom (`src/components/classroom/`) and the AI tutor's classroom logic (`src/lib/ai-tutor/`, `src/lib/roleplay/`, `src/lib/classroom/`). Nothing here calls OpenAI, Supabase, Whereby or Stripe: everything outside the browser is mocked, so it runs anywhere (a laptop, a cloud session, CI) with no keys.

```bash
npm install                        # once (adds jsdom and esbuild, dev only)
npm run test:classroom             # everything: unit tests, then the classroom runs (about 7 minutes)
npm run test:classroom -- unit     # only the unit tests (a second)
npm run test:classroom -- run15    # one run
npm run test:classroom -- -v       # print every check
```

It exits with 1 if anything fails, and lists the failing checks. Run it after any change to the classroom, the AI tutor or role-plays. Don't change a test to make it pass unless the behaviour it checks was meant to change.

## Layout

| Folder | What |
|---|---|
| `unit/*.test.ts` | Pure logic, bundled with esbuild and run in Node. Each prints `ok …` / `FAIL …` lines |
| `rooms/run*.js` | A whole classroom in a simulated browser (jsdom): it renders `ClassroomApp`, joins, plays a lesson (spoken transcript, taps, timers) and checks what's on screen and what was sent |
| `harness/` | What the classroom runs share: `test.tsx` (renders the app, mocks `fetch` for every API route, records requests in `g.log`) and the mocked modules (`mock-*.tsx`) |
| `run-all.mjs` | Bundles, runs, summarises |
| `.build/` | Build output (ignored by git) |

## Unit tests

| File | Covers |
|---|---|
| `actions.test.ts` | The action judge's guardrails (`lib/ai-tutor/actions.ts`): what's possible from each screen, quotes must be real, the tutor alone can't start things |
| `ailayout.test.ts` | The AI classroom layout (`lib/classroom/layout.ts`): tutor, panel and slide placement at every size |
| `cards.test.ts`, `cards2.test.ts` | Correction / "how do I say" cards (`lib/ai-tutor/cards.ts`): validation, instant cards, matching a correction to the right line, fillers |
| `closecmd.test.ts` | Opening and closing a course by voice (`lib/classroom/course-commands.ts`) |
| `intent.test.ts` | Role-play panel voice commands (`lib/roleplay/intent.ts`) |
| `names.test.ts` | Recognising a course by its spoken name (`lib/ai-tutor/course-names.ts`) |
| `phrases.test.ts` | Phrases to save after a role-play (`lib/roleplay/phrases.ts`) |
| `roleplay.test.ts` | Every scene in `SCENES` is well formed, levels, progress, the tutor's start instruction |
| `ticks.test.ts` | Ticking role-play tasks (`lib/roleplay/ticks.ts`): only the student's own words count |

## Classroom runs

| Run | Covers |
|---|---|
| `run01` | Lessons with a teacher: lobby, joining, room, tiles, chat, leaving |
| `run02` | Course slides: loading a course, slide layout, moving slides, free talk |
| `run03` | Drawing and the whiteboard: tools, strokes sent and restored |
| `run04` | Rejoining after a refresh, the device check, text boxes |
| `run05` | Screen sharing |
| `run06` | Word look-up, saving words, the word list |
| `run07` | The AI classroom: calling screen, layout, the AI tutor's live connection, slide moves by voice and by the turn check, cards, activities, reports |
| `run08` | Goodbyes near the end: the slide stays put |
| `run09`, `run10` | The AI panel in free talk: the role-play / course list by voice and tap, opening a course by its spoken name |
| `run11` | Closing a course: by the student's words, the tutor's words (even when split by an interruption), ✕ |
| `run12` | Free-talk commands: back to free talk from the list, opening the course by voice, prompting a silent tutor on a new slide |
| `run13` | The action judge in the classroom: what it's sent, and its answers dropped when the screen changed or too soon after another |
| `run14` | Restarting a lesson from the beginning |
| `run15` | A full role-play: hints, ticks, the twist, mission complete, progress, swapping roles, the menu |
| `run16` | Mission complete waits for the student (a question arriving in pieces never acts) |
| `run17` | Start of an AI lesson: greeting prompt, reveal, the tutor can't start role-plays or courses by itself, patient silence handling |
| `run18` | Role-play ticks: no dropped or late ticks, feedback in the same breath, phrases to save |

## Writing a new run

Copy the closest `rooms/run*.js`. The top of each run sets up jsdom and mocks WebRTC; then:

- `T.run(join)` renders the classroom for a `join` response; `T.click(el)`, `T.tick(ms)`, `T.$(selector)`
- `emit({ type: 'session.output_transcript.delta', delta, start_ms, end_ms })` is the AI tutor speaking; `session.input_transcript.delta` is the student
- `g.turnResponse` (an object, or a function of the request body) is what `/ai-turn` answers; `g.turnDelay` slows it down; `g.CATALOG`, `g.RP_LIST`, `g.RP_SCENES` feed the course and role-play lists
- `g.log` holds every request (`'fetch POST /api/… {body}'`); `sent` holds what went to the AI tutor's data channel
- `check(name, condition, detail)` prints `ok` / `FAIL`; end with the `all passed` / `process.exit` lines like the others

Timings are real (the classroom waits 0.9–2.5 s before some checks), so keep the gaps in a run clear of the limits it tests.
