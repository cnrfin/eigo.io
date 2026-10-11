# AI tutor: implementation plan

**Status (2026-10-11): V1 built and the migration applied; waiting on a live test.**
- **Database:** `supabase/add-ai-tutor.sql` adds `bookings.lesson_kind` and `ai_minutes_charged`, `user_permissions.ai_enabled`, `ai_sessions` and `ai_tutor_profiles`. Applied 2026-10-11.
- **Server:**
  - `src/lib/ai-tutor/` holds the settings, the session brief, the GPT-Live client and the summary.
  - `POST /api/classroom/[id]/ai-session` starts the tutor.
  - `POST /api/classroom/[id]/ai-transcript` saves the transcript, then makes the summary automatically.
  - `GET /api/cron/ai-tutor-sweep` is the hard stop at the booked end. **Schedule it every minute in Vercel.**
  - `GET/PUT /api/ai-tutor/settings`.
  - The join, state, event and messages routes understand AI lessons.
- **Classroom:** `AiRoom.tsx` (a WebRTC connection to GPT-Live). It has a tutor tile, slide control through tool calls, "on screen now" context, the student's chat forwarded as context, time notes, and transcript saving.
- **Booking:**
  - The Connor / AI tutor pills with the 40% OFF badge, the usage bar and the plan minutes on the book button.
  - The AI path in `/api/calendar/book`: 0.6 ratio, no Whereby, no teacher calendar event, any time.
  - Cancelling refunds the AI minutes; rescheduling keeps the lesson an AI lesson.
- **History and dashboard:** an AI badge, the course/lesson (or フリートーク) on every item, no download for AI lessons, and AI lessons always open in the classroom.
- **Settings:** an 「AIチューターの設定」 card on the Settings page, for pilot users only.
  - Grouped in lesson order: Your AI tutor (voice, name, your name), How the AI tutor talks (speed, pace, personality, kind of English, Japanese support), Mistakes and practice, Lesson structure (warm-up, review last lesson, recap), About you.
  - Each row: title with a line saying what the current choice does (no static subtitles), options on the right.
  - Lesson focus is a behaviour picker (how the lesson is run), not extra exercises; pace covers free talk too.
  - Wording: always "AI tutor" / 「AIチューター」, never just "tutor".
  - Voice ▶ previews: `GET /api/ai-tutor/voice-preview/<voice>` makes the clip on first play (GPT-Live itself over a server WebSocket, so the preview is the real lesson voice), stores it in the slide-courses bucket under `_voices/`, and reuses it for everyone. About a cent per voice, once.
- **Admin:** an "AI tutor (pilot)" permission toggle.
- **After the first test lesson (2026-10-11):**
  - The AI classroom uses the same slide + tiles layout as a lesson with Connor (4:3 slide, AI tutor tile, student tile), with the drawing toolbar and the whiteboard (the student's own; the AI tutor can't see them).
  - Student actions reach the AI tutor: chat messages, word lookups, saved words, true/false and matching answers, and audio/video finishing. `POST /api/classroom/[id]/ai-context` turns each into a fixed-template `session.instructions.append` on the sideband (the browser still can't write instructions). `thinking.append` is only for quiet facts like the slide on screen; per OpenAI it doesn't prompt a reaction.
  - Time notes come from the server's booked end: 5 min, 2 min and 1 min ("don't say goodbye yet"), then goodbye at about 20 seconds left.
  - Opening a course from the AI lesson: every brief lists the published courses and where the student is in each, and the AI tutor has an `open_lesson` tool (lesson_id "" continues where they left off). `POST /api/classroom/[id]/ai-open` works out the lesson and slide and saves it; the page then renews the GPT-Live session, because a running session can't take a new lesson plan. The new session is given the recent conversation (from the saved transcript) and told not to greet again, and the student sees "Opening the lesson…" for those few seconds.
  - Starting: the classroom shows "Calling your AI tutor…" until the AI tutor speaks, and the server tells it to greet the student on connect (GPT-Live otherwise waits for the caller). AI lessons have a voice-only device check (no camera).
  - Slide discipline (after the second test): the startup instructions hold only a one-line-per-slide outline. Each time a slide appears, the server sends its full content plus a checklist (every vocabulary word, dialogue, statement, activity) as an instruction, so the AI tutor can only teach what's on screen. It has no go_to_slide (no jumping); it moves one slide at a time with next_slide once every item is covered. Pace changes the amount of practice, never what's covered.
  - Never ending early by mistake: events from a replaced connection are ignored, a session that closes with time left shows Reconnect (and reconnects by itself up to 3 times) instead of ending the lesson, the summary is only made near the booked end, and the sweep finishes lessons whose end passed in the last 10 minutes.
  - Slide control moved out of the voice model (third test): GPT-Live's delegated tool calls took 10–20 s and often never happened. The AI tutor now just says it's moving on; "next slide" in its speech changes the slide instantly in the browser, and after each turn `POST /api/classroom/[id]/ai-turn` asks gpt-5.4-nano (`AI_TUTOR_TURN_MODEL`) whether to go next / back / return. The voice session only has open_lesson and write_in_chat tools.
  - Coverage gate removed (fifth test): it blocked moves and, whenever the check failed, told the AI tutor that everything was still missing ("let's do question 3" on a loop). Now: "next slide" in the AI tutor's speech moves instantly (held only if said before the student has spoken on a new slide); the turn check is a safety net that only ever moves (tutor or student wants to move on, "I can't see it", back, return) and does nothing if it fails; the student also has working Next/Back buttons. The check's token budget was raised and it uses reasoning_effort low, since an empty answer from the reasoning model was the likely cause of the failures.
  - Opening a lesson no longer reconnects: since slide content arrives per slide, the server just sends a "lesson opened" note (title, objective, outline) and then the first slide's content.
  - Full length: an AI lesson lasts its booked length from when the AI tutor first starts (+20 s for connecting), even if the student is late; the end is fixed at the first session and reused by reconnects. It can first start until the booked end.
  - The AI tutor leads: the rules say to move on when a slide is done, and after about 9 seconds of silence the classroom sends a nudge.
- **Checked:** subset typecheck, lint (no errors), the booking jsdom test (12 new AI checks), a jsdom test of AiRoom with mocked WebRTC (15 checks), and the existing classroom suite.
- **Not yet:** daily news topics for free talk (V1 free talk uses the student's interests and history); per-slide AI notes in the studio; cost alerts.

**Goal:** a voice-only AI tutor that teaches the eigo courses (or runs free talk) in the existing classroom. Each student shapes their own tutor (voice, style, corrections, Japanese support). It's cheaper than a human lesson, uses fewer plan minutes, and ends automatically at the booked time in a way students can't get around.

**Provider: OpenAI GPT-Live-1.**
- **Pacing:** Connor tested it and found the pacing and turn-taking the most natural. It's a full-duplex model: it listens while it speaks, handles interruptions and "uh-huh"s, and doesn't cut in on pauses.
- **Voices:** Connor tested Vale and Arbor on OpenAI's site, but they **aren't in the API's voice list** (they may be ChatGPT-app voices). The API voices are: alloy, ash, ballad, beacon, bossa, brise, cedar, cinder, coral, delta, echo, flitz, gleam, harema, juni, marin, meridian, nira, noeul, nuri, quartz, ripple, sage, shida, shimmer, sillage, stone, tempo, verse, vesper, willow. Vesper is British. Pick the shortlist by testing these in the API playground. OpenAI doesn't publish accents or genders for them (only Quartz is described, as Australian-influenced). Every session and preview now includes `ACCENT_RULE` ("Speak British English…"), and the list is Vesper, Meridian, Willow and Quartz (chosen 2026-10-11).
- **Price:** $0.05 per minute, billed per second.
- **Fallback:** ElevenLabs Agents (British voice library, about $0.08/min plus its AI model).

How GPT-Live-1 is put together:
- **Two parts:** GPT-Live handles the spoken conversation and hands "thinking and tools" to a backend text model. That backend is called **delegation**, e.g. `gpt-6-luna` through Responses delegation.
- **Connections:** the browser connects by WebRTC. Our server creates the session and can attach a **sideband** connection, or call the hang-up endpoint, to watch or end it.
- **What's fixed at startup:** model, voice, audio and instructions (up to 16,384 tokens) plus up to 8,192 tokens of starting history. These can't be changed mid-session; only the backend delegation settings can.
- **Text only:** it doesn't take images, so slides are described to it as text, which we already have.

---

## 1. How it works

```
Student books an "AI lesson" (course lesson or free talk, any time)
  → minutes deducted at the AI rate (30-min lesson = 18 plan minutes)
  → no Whereby room, no teacher calendar event

Student opens /classroom/[bookingId]  (same classroom, AI mode)
  → browser makes a WebRTC offer and sends it to our server
  → our server checks the booking + time window, builds the session brief
     (fixed eigo rules + the student's tutor settings + lesson plan or free-talk topics
      + learner memory), and creates the GPT-Live session with OpenAI:
       POST /v1/live/sessions  { model: gpt-live-1, voice, instructions, input,
                                 delegation: responses (gpt-6-luna + classroom tools),
                                 frontend client permissions locked down }
  → our server returns only the WebRTC answer; the API key never leaves the server
  → records session_id → booking in ai_sessions
  → the tutor teaches; when it wants to change a slide etc. the backend issues a function
     call, the classroom runs it, and the result goes back
  → on every slide change the classroom sends a short "what's on screen" update
     (session.thinking.append), so the tutor always knows what the student sees
  → at the booked end our server hangs the session up (scheduled job), and the UI
     wraps up a minute earlier with a closing line
  → transcript + usage are saved → existing summary pipeline → course progress updates
```

The AI replaces the teacher's video tile with a small "tutor" tile (voice level + status). The slide, whiteboard, chat, word lookup and activities all work as they do now. Students already can't control slides, and the AI now does what the teacher would.

---

## 2. Anti-gaming (must-have)

The server decides everything that matters. The browser only carries audio.

1. **Charge at booking.** AI minutes are recorded in `minute_usage` when the lesson is booked, never by the client.
2. **The server creates every session.** The browser can't open a GPT-Live session on its own, because only our server holds the API key. `POST /api/classroom/[id]/ai-session` only starts one if:
   - the booking is an AI lesson owned by the caller
   - the time is within start (minus 5 min) and the booked end
   - no other live session is running for that booking; any older one is closed first
3. **Instructions fixed at startup.** The rules, tutor settings, lesson plan and voice are set by our server when it creates the session. GPT-Live doesn't allow them to be changed mid-session.

   The session is created with `client.data_channel.allowed_client_events` set to only what the classroom needs: `response.item.create` and `response.create` (tool results), `session.thinking.append` (the "on screen now" context) and `session.close`. The browser can't send `session.instructions.append`, `session.commentary.append` or `session.update`, so it can't change the rules.
4. **Hard stop from our server at the booked end.**
   - A scheduled job runs every minute (Vercel cron, or Supabase `pg_cron` + an Edge Function).
   - It calls `POST /v1/live/sessions/{id}/hangup` for every session whose booking has ended. If that endpoint isn't available for WebRTC sessions (it's only documented for SIP calls), it attaches briefly over the sideband (`wss://api.openai.com/v1/live/sessions/{id}/attach`) and sends `session.close`.
   - This doesn't depend on the student's browser at all. Closing the tab, reloading or editing scripts change nothing.
   - The session's own duration limit (reason `expired`) is a second safety net.
5. **Reconnects can't add time.** A reconnect creates a fresh session that gets hung up at the same booked end time, so total time can never pass the booking.
6. **Student text is data, not instructions.** "About me" text and typed messages go in as clearly labelled data, never as instructions.
7. **Monitoring.** We flag repeated reconnects, safety-filter endings, and off-topic or prompt-injection attempts in transcripts on the admin dashboard. Later we can add a live guardrail through the sideband.

The on-screen countdown is for show only. Points 2–5 enforce the limit.

---

## 2b. Recording and history for AI lessons (V1)

**Decided:** V1 keeps **no audio or video recording** for AI lessons. The student trades the recording for more speaking practice (the 40%-off minutes). AI lessons have no Whereby room, so there's no Whereby recording cost either.

1. **Transcript (always):**
   - GPT-Live streams both sides as text while the lesson runs, and the transcript is saved to the booking.
   - **No cleanup step.** It's already clean text, unlike Whereby's speech-to-text, so it goes straight to the summary (the same ChatGPT summary call as tutor lessons).
   - Learner memory reads it like any other summary.
2. **History item for AI lessons:** different from tutor lessons.
   - An 「AI」 badge next to the date.
   - Shows the lesson (course + lesson, or 「フリートーク」), the summary, and a "Transcript" button. The transcript appears as a two-speaker chat (student / AI tutor).
   - No recording, download or "listen again" buttons, and no "create summary" prompt, since the summary is made automatically when the lesson ends.
   - Saved words and topics appear as they do for tutor lessons.
   - **All history items** (tutor and AI) show what the lesson was: course + lesson number/title, or 「フリートーク」. Tutor lessons get it from `bookings.slide_course_id` / `slide_lesson_id`.
3. **Later (not V1):** optional audio recorded in the browser (compressed, about 15 MB per 30 minutes), or GPT-Live's own stored recording, if students ask for it.

---

## 3. Data model (one migration)

- **`bookings.lesson_kind`:** `'human' | 'ai'`, default `'human'`.
- **`bookings.ai_minutes_charged`:** int, for display and audit.
- **New table `ai_sessions`:**
  - `session_id` (pk; the OpenAI Live session id)
  - `booking_id`
  - `voice`
  - `started_at`
  - `ended_at`
  - `duration_s`
  - `cost_usd`
  - `end_reason`
  - `flags` (jsonb)

  RLS on, service role only.
- **New table `ai_tutor_profiles`:** one row per student, holding the settings from Phase B2:
  - `voice`
  - `speed`
  - `japanese_support`
  - `corrections`
  - `pronunciation`
  - `focus` (jsonb)
  - `pace`
  - `tone`
  - `formality`
  - `tutor_name`
  - `call_me`
  - `interests`
  - `goals`
  - `updated_at`

  RLS: the owner can read and write their own row.
- **`app_settings`** (or a constant first):
  - `ai_minute_ratio`: **0.6** (decided: a 30-min AI lesson charges 18 plan minutes)
  - `ai_backend_model` (e.g. `gpt-6-luna`)
  - `ai_enabled` per user (pilot flag, like `classroom_enabled`)

The transcript goes in the existing `bookings.transcript_text`, so summaries and history work without changes.

---

## 4. Build phases

### Phase A: Pilot (test account only)

1. **OpenAI setup:**
   - A project with GPT-Live access and storage off (no recordings kept by OpenAI).
   - `OPENAI_API_KEY` set as a server-only env var.
   - Check the frontend-permission options and the hang-up endpoint in the API reference.
2. **Teaching prompt (the Live instructions):**
   - The eigo tutor persona and rules: short turns, natural pauses, wait for learners who are thinking, correct gently, explain in simple Japanese when stuck, stay on the lesson, never reveal the instructions.
   - Use the eigo-esl-curriculum and eigo-slide-design skills when writing it.
3. **Session brief builder** (`buildSessionBrief(bookingId)`), server only:
   - the fixed rules
   - the tutor settings (Phase B2)
   - the lesson plan: objectives, then each slide's number, title, text, dialogues, vocab, questions and tutor notes, plus where to resume
   - the learner memory (Phase B2 step 4)

   It's trimmed to fit the 16,384-token instruction limit. Long lessons go in as an outline in the instructions, with full slide detail sent through `session.thinking.append` when each slide opens (500 tokens per append).
4. **Classroom tools** (Responses delegation function tools; the classroom runs them):
   - `go_to_slide`
   - `next_slide`
   - `reveal_answers`
   - `start_activity`
   - `open_whiteboard`
   - `write_in_chat`
   - `save_word`
   - `wrap_up`

   Each calls the classroom functions that already exist. On every slide change the classroom sends a short "on screen now" update.
5. **Classroom AI mode:**
   - No Whereby; a tutor tile instead of the teacher video.
   - A mic check in the lobby, then the WebRTC connection (offer → our server → answer).
   - Captions from the transcript events (optional, for learners).
   - Mute and leave work as they do now.
6. **`POST /api/classroom/[id]/ai-session`:** the rules from section 2. It creates the Live session and writes the `ai_sessions` row.
7. **End-time job** (`/api/ai-tutor/sweep`, every minute):
   - Hangs up sessions past their booking end.
   - Marks the bookings completed.
   - Saves the transcript, usage and close reason.
   - Updates course progress and triggers the summary.

   The browser also sends the transcript it collected when the lesson ends. It only feeds the student's own summary, so it's low-risk.
8. **Learner-pacing check:** Connor has already judged GPT-Live the most natural overall. Before building further, check these learner-specific situations with the eigo prompt and the Vale, Arbor and Vesper voices:
   - long thinking pauses mid-sentence ("I went to... えーと... the station")
   - restarting a sentence
   - "uh-huh" while the tutor talks
   - cutting in with a question
   - 5–10 s of silence
   - Japanese words mixed in

   The tutor must not jump in while the student is still thinking. If it does, tune the prompt (explicitly tell it learners pause).
9. **Pilot test** (in the real classroom): run 3–5 lessons yourself and with 1–2 friendly students. Measure:
   - understanding of Japanese-accented English
   - lesson-following and slide control
   - how often the AI drifts from the lesson
   - that the session really stops at the booked end
   - real cost per lesson

### Phase B: Booking and minutes

1. **Booking form** (designs: `mockups/booking-tutor-picker.html` option E and `mockups/booking-ai-minutes.html`):
   - **Tutor picker:** this replaces the single "Connor とレッスンを予約" line with two pills, 「Connor」 and 「AIチューター」.
     - The selected pill uses the site's selected-pill style with the profile picture on its left. The other pill is text only.
     - The AI pill has a small light-sage 「40% OFF」 badge on its top-right corner. It turns grey along with the pill when the AI tutor isn't selected.
     - When switching, the picture grows into the newly selected pill with a slight spring, and the old one's picture shrinks away. With reduced motion it switches instantly.
   - **Lesson length buttons stay as they are.** "30 min" always means a 30-minute lesson.
   - **Usage bar** under the lengths:
     - It shows this month's plan minutes, the part this booking uses (sage), and the balance after booking ("この予約で 36分 使用 · 予約後 144分").
     - With the AI tutor, a dashed outline shows what the same booking would use with Connor.
     - It updates live as times and lengths change.
   - **Book button:** a second line confirms the plan minutes ("プランから36分使用").
   - **AI lessons** aren't limited by your calendar (any time, with a short lead time), and can be a course lesson or free talk.
2. **`/api/calendar/book`:** an AI path with no Whereby room and no Google event for you. It charges `ceil(duration × ai_minute_ratio)` minutes and assigns the next course lesson as now.
3. **Other lesson lengths** (15/45/60): nothing extra to set up. The end-time job uses each booking's own end time.
4. **Dashboard, history and admin:**
   - AI lessons are labelled.
   - Admin gets an "AI lessons" card: count, minutes, cost, flags.
   - Transcripts are visible to admin.

### Phase B2: My AI tutor (personalisation) and AI free talk

1. **「マイAIチューター」 settings page** (dashboard → Settings, also reachable from the AI booking):
   - **Voice:** a curated list with a ▶ sample button (short pre-generated clips, so no live cost):
     - Vale and Arbor (tested, natural)
     - Vesper (British)
     - optionally Willow and Stone (Irish) and Quartz and Ripple (Australian), for students who want other accents

     The voice is fixed when the session is created, so a change applies from the next lesson.
   - **Speaking speed:** ゆっくり / ふつう / ナチュラル.
   - **Japanese support:**
     - English only
     - Japanese only when I'm stuck (default)
     - Explain grammar in Japanese
   - **Corrections:**
     - Let small mistakes go
     - Correct at the end of each activity (default)
     - Correct me straight away
   - **Pronunciation:** relaxed / normal / strict.
   - **Focus:** pick what to do more of (speaking / listening / reading / vocabulary). This shapes how the AI uses each slide: more discussion questions, more "listen and answer", or more read-aloud.
   - **Pace:** relaxed (fewer slides, more practice) / standard / brisk.
   - **Tone:** warm and encouraging / calm / upbeat and funny / professional.
   - **Formality:** casual or polite English from the tutor.
   - **Names:** what the tutor is called, and what it calls the student.
   - **About me:** job, hobbies and goals (e.g. a trip to London, IELTS, work meetings). Used for examples and free-talk topics.
   - **Lesson start:** whether to do a quick warm-up chat.
   - **Lesson end:** a recap of 3 key phrases at the end, in the chat.
2. **Server-side prompt building:**
   - `get_session_brief` turns the settings into short rule lines, e.g. "Correct pronunciation strictly: model the word, ask them to repeat once."
   - It adds them to the fixed eigo teaching rules. The student's free text (about me) goes in as clearly marked data, never as instructions, which guards against prompt injection.
3. **AI free talk:**
   - Same classroom, no slides.
   - The AI brings interesting topics, mixing the student's interests and goals with **recent news**. It also uses their level and recently saved phrases.
   - **Daily news topics (cron):**
     - Once a day the server fetches about 30 fresh headlines from a news API (UK, Japan and world; light categories: culture, sport, tech, food, travel, science, entertainment).
     - Heavy or distressing stories are filtered out.
     - A cheap text model writes a level-adjusted brief for each (2–3 sentences, 3 useful words, 2 discussion questions, the source link), cached in a `news_topics` table.
     - Summaries only, never full articles.
   - **Picking topics:** `get_session_brief` gives the AI 3–5 topics that match the student's interests. A `talk_topics` log avoids repeating topics with the same student.
   - **Facts come from us:** the AI only discusses news from the brief and doesn't make up current events.
   - **Sources in the chat:** with `write_in_chat`, the tutor can drop the source link and key words into the chat.
   - It writes key phrases and corrections in the chat with a `write_in_chat` client tool, so the student can save them as words, as they do now.
   - It's charged at the same 0.6 ratio.
4. **Learner memory (from data we already have).** `get_session_brief` also builds a short "about this student" section from:
   - **`lesson_summaries.key_topics`:** topics they talk about most and talked about recently. This lets free talk pick threads back up ("Last time you mentioned your trip to Osaka. How did it go?") and avoid topics they've done to death.
   - **`lesson_summaries.mistake_patterns`:** their recurring mistakes, e.g. dropping articles, or past tense with "did + went". The tutor works one or two of these into each lesson and gently corrects them when they come up.
   - **`lesson_summaries.summary_en`** for their last 1–2 lessons: what they practised and what was planned next.
   - **`vocabulary_phrases` + `vocabulary_cards`:** saved phrases that are due for review or still "learning". The tutor recycles 3–5 of them naturally in conversation, which ties AI lessons to the review deck.
   - **`pronunciation_attempts`:** sounds they find hard. Used when pronunciation correction is set to normal or strict.
   - **`profiles.exam_scores` and course progress:** their level and goals (e.g. IELTS), to set vocabulary level and topic choice.
   - **Past AI lesson transcripts:** these already become summaries through the same pipeline, so AI lessons feed back into this memory automatically.

   **Rules:**
   - Keep it short: a compact digest of the last 5–10 lessons, not raw history.
   - The digest is built on our server and given to the AI as data, never as instructions.
   - The student can turn it off with 「レッスン履歴をAIチューターに使う」 (on by default) in their tutor settings.
   - The digest covers human and AI lessons alike, so the AI tutor knows what was done with you as well.
5. **Change any time:** settings apply from the next lesson. Defaults are good enough that most students never need to open the page.

### Phase C: Teaching quality

1. **Per-slide AI notes:** an optional field in the studio for how the AI should run each slide. Falls back to the tutor notes. Fill these in for Great Britain for Beginners first.
2. **Ratings:** the existing lesson rating appears after AI lessons too, so you can compare AI and human scores.
3. **Pronunciation and vocabulary:** words saved during AI lessons go to the review deck as now. Lesson vocabulary is listed in the prompt so the AI listens for it.
4. **Regular review:** read a sample of transcripts weekly for a month and tune the prompt.

### Phase D: Launch

1. **Pricing copy:** explain AI lessons in the plans and FAQ (cheaper in minutes, voice only, course-based).
2. **Rollout:** turn on `ai_enabled` for everyone once pilot ratings and flags look healthy.
3. **Cost guard:** alerts if a day's AI cost goes above a set amount, plus a hard per-user daily cap.

---

## 5. Cost check (per 30-minute AI lesson)

| | Estimate |
|---|---|
| GPT-Live-1 voice | $0.05/min × 30 = $1.50 (about ¥225) |
| Backend model (`gpt-6-luna`, only when the tutor uses tools or reasons) | small, roughly ¥10–40 |
| **Total** | **about ¥240–270** |
| Earned at 18 min charged | ¥830 (discounted) / ¥1,390 (full) |

**Decided:** 18 minutes charged (ratio 0.6). That leaves about **¥560–590 per lesson on discounted plans** and about **¥1,120–1,150 at full price**. That's about ¥150–180 more per lesson than the ElevenLabs option. Confirm the backend cost in the pilot.

Limits:
- **Concurrent sessions:** 50 on OpenAI's entry ("Build") tier, which is plenty to start.
- **Per-student daily cap:** a hard cap per student per day stays in the plan (Phase D).

---

## 6. Decisions and open questions

**Decided (2026-10-11):**
- Provider: OpenAI GPT-Live-1 (most natural pacing in Connor's test; $0.05/min). ElevenLabs Agents is the fallback.
- Minute ratio 0.6 (30 → 18).
- AI free talk is offered as well as courses.
- Course progress is shared between AI and human lessons.
- Students personalise their own tutor (section 4, Phase B2) instead of us building several tutor personalities.

**Open:**
1. **Lock-down check:** confirm the frontend client permissions stop the browser from appending instructions, and that the hang-up endpoint works on WebRTC sessions (Phase A).
2. **News source for free talk:** pick a news API with commercial terms that suit us, and check its licence allows summaries.
3. **Voices:** the final list (Vale, Arbor, Vesper, and whether to offer the Irish and Australian voices). A custom voice made from your own recording is also possible later, subject to OpenAI's approval.
4. **Backend model:** `gpt-6-luna` to start; try `gpt-6-sol` only if lesson-following needs it.
5. **Trial users:** can they try one AI lesson?

## 7. Reuses from the classroom (no new work)

- Classroom page, slide stage, whiteboard, chat, word lookup and saving, true/false and matching
- Course loading, progress, catalog, lesson queue
- Ratings, summaries, transcripts, history, admin dashboard
- Pilot flags, booking flow and test mode
