# eigo classroom: implementation plan

This plan builds the new in-house classroom in eigo-web, on top of Whereby Embedded, Supabase and the shared slide renderer.

**Read these alongside it:**
- `mockups/classroom-mockup.html`: the clickable reference.
- `mockups/classroom-spec.md`: the behaviour rules and the decisions for the build.

The existing Whereby links stay in use until this is fully tested; see phase 7.

Paths are relative to the `eigo-web` root. This is **Next.js 16.2** (see `AGENTS.md`): read `node_modules/next/dist/docs/` before writing code. Client-only modules must be loaded with `next/dynamic(..., { ssr: false })` from a **client** component; it isn't allowed in server components.

---

## 0. What exists today (the starting point)

| Area | Today | Notes for this build |
|---|---|---|
| Booking | `POST /api/calendar/book` inserts `bookings` and creates a Whereby room (`src/lib/whereby.ts → createWherebyRoom`, `startTrigger: 'automatic-2nd-participant'`) | Keep this. The room and recording settings don't change. |
| Times | `bookings.date` + `start_time` are **Tokyo time**, `duration_minutes` ∈ {15,30,45,60,75}. There is no timestamp column. | Add one helper, `bookingWindow(b)`, that returns `{ start, end }` as `Date`s and is used everywhere. |
| Joining | `HomeView.tsx` links to `wherebyRoomUrl` in a new tab. `canEnter` (10 minutes early) only changes the button's opacity and **isn't enforced**. Admin uses `whereby_host_url` from `/admin`. | The new room enforces the rule on the server. |
| Admin / teacher | One hard-coded email: `ADMIN_EMAILS` in `src/lib/admin-redirect.ts` and `src/lib/admin.ts` (`verifyAdmin`, `isAdminEmail`). There's no role column. | The teacher is the admin. Use `isAdminEmail`; don't invent roles. |
| Auth in routes | Client sends `Authorization: Bearer <jwt>`. Routes use `verifySupabaseToken` (`src/lib/supabase-jwt.ts`) and the service-role client `getSupabaseAdmin()` (`src/lib/supabase-admin.ts`). There's no middleware or proxy. | Follow the same pattern. |
| Feature flags | `user_permissions(courses_enabled, tests_enabled, recordings_enabled, transcription_enabled)` via `src/lib/user-permissions.ts` | Add `classroom_enabled` for the pilot. |
| Recordings | Pulled on demand by room name (`/api/recordings*`, `src/lib/transcribe.ts`, `lesson-ai.ts`). There's no Whereby webhook. | No change needed. The classroom only stops recording at the booked end time. |
| Vocab and review | `vocabulary_phrases` (`booking_id` NOT NULL) + `vocabulary_cards` (FSRS, `src/lib/srs.ts`), `/api/vocabulary`. The design for saving from courses is in `src/lib/slides/VOCAB-SAVE.md`. | Implement that design, and extend it to lookups and chat. |
| Slide courses | JSON files in `studio/data/courses/<id>/`. The studio can POST to `EIGO_PUBLISH_URL`, but **no receiving endpoint exists**. The slide renderer isn't used anywhere in `src/app` yet. | Build the publish endpoint and the course storage (phase 0). |
| i18n | `src/lib/i18n.ts` (`translations.ja/en`) + `LanguageContext`. `profiles.preferred_language ∈ {ja,en}` | Add classroom strings there. The student UI follows `preferred_language`; the teacher UI is in English. |
| AI | OpenAI only (`OPENAI_API_KEY`). `gpt-5.4-nano` / `gpt-5.4-mini` are already in use. | Use `gpt-5.4-nano` for lookups and translation, with JSON output. |
| Realtime | **Not used anywhere.** The `supabase_realtime` publication has no tables. | New: private Broadcast channels with Realtime Authorization. |

### Supabase tables: what to touch and what to leave

There's one project (`EIGO-WEB`), shared by several apps.

- **Read or extend:**
  - `bookings`
  - `profiles`
  - `user_permissions`
  - `vocabulary_phrases`
  - `vocabulary_cards`
  - `lesson_summaries` (read only)
  - `bookings.status` now allows `no_show` (applied 2026-10-06)
- **Don't touch:**
  - **The exam / mini-course system:** `courses`, `course_levels`, `lessons`, `lesson_screens`, `lesson_progress`, `assets`. These names are taken, so the new tables use the `slide_` and `classroom_` prefixes and never reuse them.
  - **iOS vocab app:** `vocab_*`, `core_vocab`, `user_vocab_state`, `review_logs`, `review_sessions`.
  - **CUPS / teacup:** `memories`, `memory_*`, `teacup_settings`, `conversation*`.
  - **Social / challenges:** `challenge*`, `friendships`, `kudos`, `photo_challenges`, `achievements`, `user_achievements`, `accessories`, `user_accessories`, `user_streaks`, `activity_*`, `weekly_challenges`, `submission_reactions`, `user_blocks`, `username_blocklist`.
  - **Tests:** `exams`, `exam_tracks`, `questions`, `question_*`, `sections`, `test_*`, `responses`, `rubrics`, `score_scales`, `attempt_skill_scores`.
  - **Other:** `sayafterme_usage`, `news`, `site_settings`, `support_tickets`, `campaign_signups`, `guest_rate_limit`, `content_reports`, `study_days`.
- **Careful:** `profiles` has no `native_language` or `role` column. `teacup_settings.native_language` belongs to CUPS, so don't read it; the migration adds `profiles.native_language` instead.

### Things found while surveying (fix alongside or before)

1. `GET /api/recordings?roomUrl=` has **no auth check**. Add the same ownership or admin check as `/api/recordings/audio`.
2. `/api/recordings/audio` and `audio-extract` check `profiles.role === 'admin'`, but that column doesn't exist. Use `isAdminEmail`.
3. `POST /api/calendar/reschedule` hard-codes `recording: true`. It should follow `perms.recordings_enabled`, as `book` does.
4. `bookings.reminder_30min_sent` and `summary_nudge_sent` exist in the database but not in any SQL file in `supabase/`. The new migration adds them with `ADD COLUMN IF NOT EXISTS` so the files match the database (check the real column defaults first).

---

## 1. Data model (one migration: `supabase/add-classroom.sql`)

This follows the repo's convention of hand-applied SQL files. Every new table gets **RLS on**. Server routes use the service role; client reads go through API routes, except the Realtime channel.

```sql
-- 1. Pilot flag
alter table user_permissions add column if not exists classroom_enabled boolean not null default false;

-- 2. Student's native language (for chat translation and word lookups). UI language stays profiles.preferred_language.
alter table profiles add column if not exists native_language text not null default 'ja';

-- 3. Published slide courses (from the studio). Not the exam `courses` table.
create table slide_courses (
  id text primary key,                 -- e.g. 'c_greatbritain'
  slug text unique not null,
  title text not null, title_ja text,
  level text,                          -- CEFR
  published boolean not null default false,
  version integer not null default 1,
  course jsonb not null,               -- the full Course JSON (units → lessons → slides)
  updated_at timestamptz not null default now()
);
-- assets: storage bucket 'slide-courses' (public read): <courseId>/<path from course.json>

-- 3b. No-show status: ALREADY APPLIED (supabase/add-booking-no-show.sql, 2026-10-06).
--     bookings.status ∈ {confirmed, cancelled, completed, no_show}

-- 3c. Lesson chat, stored on the booking (a lesson is ~10 messages, so one jsonb array is plenty)
alter table bookings add column if not exists chat_log jsonb not null default '[]'::jsonb;
-- each item: { id, from: 'teacher'|'student', text?, file?: { path, name, size, type }, at: ISO }
-- Append atomically (two people can send at the same moment), called by the messages API with the service role:
create or replace function append_lesson_chat(p_booking uuid, p_msg jsonb)
returns void language sql security definer set search_path = public as $$
  update bookings set chat_log = chat_log || jsonb_build_array(p_msg), updated_at = now()
  where id = p_booking and jsonb_array_length(chat_log) < 500;
$$;
revoke execute on function append_lesson_chat(uuid, jsonb) from public, anon, authenticated;

-- Schema drift: columns that exist in the DB but not in any SQL file
alter table bookings add column if not exists reminder_30min_sent boolean default false;
alter table bookings add column if not exists summary_nudge_sent boolean default false;

-- 4. Course chosen for a booking (optional; null = free talk)
alter table bookings add column if not exists slide_course_id text references slide_courses(id);
alter table bookings add column if not exists slide_lesson_id text;   -- Lesson.id inside the course JSON

-- 5. Live lesson state: survives refreshes and drop-outs
create table classroom_sessions (
  booking_id uuid primary key references bookings(id) on delete cascade,
  started_at timestamptz,              -- lesson clock: first moment both people were in the room
  ended_at timestamptz,                -- teacher pressed "End lesson for everyone"
  recording_stopped_at timestamptz,
  course_id text references slide_courses(id),
  lesson_id text,
  used_course boolean not null default false,   -- any course open during the lesson → lesson-complete layout F
  state jsonb not null default '{}'::jsonb,     -- { slideId, whiteboard, mode:'course'|'free' , studentDraw, followTeacher }
  updated_at timestamptz not null default now()
);
create table classroom_ink (                    -- drawings per slide + the lesson whiteboard
  booking_id uuid references bookings(id) on delete cascade,
  surface text not null,                        -- slide id, or 'board'
  items jsonb not null default '[]'::jsonb,     -- stroke/line/shape/text items in 1280×960 stage coords
  updated_at timestamptz not null default now(),
  primary key (booking_id, surface)
);
create table classroom_activity (               -- true/false + matching answers
  booking_id uuid references bookings(id) on delete cascade,
  block_id text not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (booking_id, block_id)
);
-- chat files: private storage bucket 'classroom-files' (paths are kept in bookings.chat_log)
create table lesson_ratings (                   -- admin-only: no select policy for students

  booking_id uuid primary key references bookings(id) on delete cascade,
  user_id uuid not null references profiles(id),
  stars smallint not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- 6. Where each student is in each course ("pick up where we left off")
create table slide_course_progress (
  user_id uuid references profiles(id) on delete cascade,
  course_id text references slide_courses(id),
  lesson_id text,              -- last lesson used
  slide_id text,               -- last slide reached
  completed_lesson_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- 7. AI cache for word lookups and chat translation
create table ai_lookup_cache (
  kind text not null check (kind in ('word','chat')),
  lang text not null,          -- target language, e.g. 'ja'
  key text not null,           -- sha256 of normalised term + sentence (word) or message text (chat)
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (kind, lang, key)
);

-- 8. Saving words from courses, lookups and chat into the existing review system (VOCAB-SAVE.md)
alter table vocabulary_phrases alter column booking_id drop not null;
alter table vocabulary_phrases add column if not exists source text not null default 'lesson'
  check (source in ('lesson','course','lookup','chat'));
alter table vocabulary_phrases add column if not exists source_course_id text;
alter table vocabulary_phrases add column if not exists source_item_id text;   -- VocabItem.id, or 'lk:<term>' / 'chat:<hash>'
create unique index if not exists vocabulary_phrases_source_uniq
  on vocabulary_phrases (user_id, source_course_id, source_item_id) where source_item_id is not null;
```

**RLS for the new tables:** the student who owns the booking can read rows for that booking. All writes go through API routes using the service role, which also lets the admin (teacher) in.

**Realtime Authorization** (Supabase private channels): add a policy on `realtime.messages` so the topic `classroom:<bookingId>` is open only to the booking's `user_id` and the admin. The admin check is a small SQL function that compares `auth.jwt()->>'email'` with the admin email, kept in one place.

---

## 2. Architecture

```
/classroom/[bookingId]            (src/app/classroom/[bookingId]/page.tsx: server shell + metadata)
  └─ <ClassroomApp/>              client, loaded with next/dynamic { ssr:false }
       ├─ Lobby (pre-join)        useLocalMedia: camera / mic / speaker, test chime, background
       ├─ Room                    WherebyProvider + useRoomConnection(roomUrl, { localMedia, roomKey? })
       │    ├─ TopBar             title, slide controls, teacher view, whiteboard, settings, timer + REC, End
       │    ├─ Stage              layout engine (FLIP), SlideBox (SlideCanvas + ink + cursors + overlays), tiles
       │    ├─ Toolbar            canvas tools drawer
       │    ├─ Controls           Cam / Mic / Share / Chat / Library
       │    ├─ ChatPanel          messages, files, translate, unread badge, tile pop-ups
       │    └─ Dialogs            Settings, Library, End
       └─ LessonComplete          layouts F / B, chat download, rating
```

- **Code location:** `src/components/classroom/*` (components), `src/lib/classroom/*` (layout engine, sync, ink model, clock, i18n keys).
- **Shared slide code:** `src/lib/slides` stays framework-free and is shared with the studio.
- **Whereby:** `@whereby.com/browser-sdk` (new dependency), React hooks.
  - The student connects with `bookings.whereby_room_url`.
  - The teacher connects with the same room URL plus the **host `roomKey`** parsed from `whereby_host_url`, which gives access to host actions (`endMeeting`, `muteParticipants`, `askToSpeak`, `askToTurnOnScreenshare`, `stopParticipantScreenshare`, `stopCloudRecording`).
- **Sync:** Supabase Realtime **Broadcast** on the private channel `classroom:<bookingId>`.
  - Fast events (cursor, live strokes) are broadcast only.
  - State changes are broadcast for instant display **and** written through an API route (debounced about 500 ms for ink) so they survive refreshes.
  - On (re)join, the client loads `GET /api/classroom/[id]/state`, then subscribes.
- **Mapping each feature to its source:**

  | Feature | Source |
  |---|---|
  | Video, audio, screen share | Whereby |
  | Chat | Our own: `bookings.chat_log` + Broadcast (not Whereby chat, so we can translate, save words and download) |
  | Slide position, teacher view (local only), whiteboard, ink, cursors, zoom (local only), activities | Supabase Realtime + tables |
  | Lesson clock | `classroom_sessions.started_at`, set by the server |
  | Recording | Whereby auto-start (unchanged) + teacher client stops it at the booked end time |

---

## 3. Phases

Each phase is shippable to the **pilot** (users with `classroom_enabled`) and testable on its own.

### Phase 0: Foundations ✅ (done 2026-10-06)
1. **Migration:** `supabase/add-classroom.sql`, applied to EIGO-WEB and checked (tables, RLS, buckets, Realtime policies tested for owner / stranger / admin). `is_eigo_admin()` duplicates the admin email from `src/lib/admin.ts`: change both together.
2. **Dependencies:** `@whereby.com/browser-sdk ^3.31.0` added to `package.json` (peer: React ≥ 18.2). Run `npm install` on the Mac so the lockfile and native packages stay correct.
3. **Helpers** in `src/lib/classroom/`:
   - `booking-window.ts`: `bookingWindow(booking)` → `{ start, end, studentOpensAt, closesAt, noShowAt }` (Tokyo time → `Date`).
   - `access.ts`: `classroomAccess(user, booking, session, now)` → `{ allowed, role }` or `{ allowed: false, reason: 'not_found'|'cancelled'|'too_early'|'ended' }`.
     - **Admin:** any time, any booking that isn't cancelled.
     - **Student:** from `start − 10 min` until `end + 60 min` (when the Whereby room expires), unless the teacher has ended the lesson. A `no_show` student who turns up late still gets in.
4. **Course publishing:** `POST /api/slide-courses/publish`, in two steps because courses are 20–70 MB:
   - `prepare`: validates the course and returns signed upload URLs for new or changed files only (compared by size).
   - The studio uploads the files straight to the `slide-courses` bucket (3 at a time).
   - `commit`: checks every file is there, then upserts `slide_courses` (published, version + 1).
   - `studio/server/fileApi.ts` was updated to this flow.
   - **Setup:** add `EIGO_PUBLISH_KEY` (any long random string) to Vercel. In `studio/.env.local`, set `EIGO_PUBLISH_URL=https://eigo.io/api/slide-courses/publish` and the same key.
   - Before publishing, run `node studio/scripts/localize-images.mjs`, so remote Pexels links become local course images.
5. **Pilot flag:** `classroom_enabled` is in the admin Permissions tab ("New classroom (pilot)"). Unlike the other flags it's **opt-in**: no row means off.

### Phase 1: The core room (no slides yet)

**Status (2026-10-06): built, ready for the first two-browser test.**
- **Pages and components:** `src/app/classroom/[bookingId]` and `src/components/classroom/*`.
  - Lobby, room, tiles with audio dots, Cam / Mic / Chat controls, free-talk layout (`src/lib/classroom/layout.ts`).
  - Lesson clock (server `started_at`), REC badge, teacher stops recording at the booked end.
  - End dialog, "left" and "lesson complete" (layout B) screens, rating, chat download, text chat with tile pop-ups and unread badge, join/leave toasts, reconnect banner.
- **APIs:** `join`, `event` (student_joined / start / recording_stopped / end), `messages`, `rating`, `chat` (download). The separate start/state/end routes listed below were merged into `event`.
- **Strings:** `src/lib/classroom/i18n.ts` (ja/en), not `src/lib/i18n.ts`.
- **Styles:** `src/components/classroom/classroom.css` is the mockup CSS scoped under `.cr`.
- **Links:** the dashboard lesson card and the admin lesson list open `/classroom/[id]` for pilot students. Admin keeps a small "Whereby" fallback link. Pilot lessons stay listed until the room closes (end + 60 min).
- **Tests:** render test with the Whereby SDK mocked (45 checks) in the work folder; not yet tested against real Whereby.
- **Not in this step:** chat attachments, translation, settings, screen share, pop-out, tile menu, library, no-show prompt. These follow in the later phases as planned.
1. **Route and access:**
   - `src/app/classroom/[bookingId]/page.tsx`.
   - `GET /api/classroom/[id]/join` returns `{ role, roomUrl, roomKey?, booking, window, session, otherName, uiLang, nativeLang }` or `403 { reason }`. The page explains each reason: too early (with a countdown), ended, not yours.
2. **Lobby:** camera preview (mirrored), mic level, device pickers (`enumerateDevices`), a speaker test using `setSinkId` where supported, background presets (`getUsableCameraEffectPresets`), and "Join lesson".
3. **Room connection:** `useRoomConnection`, `VideoView` tiles, mute and camera, audio dots (Web Audio `AnalyserNode` on each track), and the muted badge. There's no speaking border.
4. **Layout engine:** port `doLayout` / `layoutSlots` / `place` (FLIP) from the mockup into `src/lib/classroom/layout.ts`. It covers:
   - side and stacked modes
   - tall-screen tiles (16:9 to 3:4, or stacked full width)
   - free-talk video-only mode
   - lifting the controls in course mode only
   - the phone breakpoints
5. **Top bar and controls:** sized as in the mockup. On desktop the bottom buttons are 60px and sit 28px below the content.
6. **Lesson clock:**
   - When the teacher's client sees both people present, it calls `POST /api/classroom/[id]/start`, which sets `started_at` once (idempotent).
   - Both clients show `elapsed / duration`: amber in the last 5 minutes, then a red "Time's up +mm:ss".
7. **Join and leave toasts:** only for the other person ("Aiko has joined!", "Aiko left the room"), from Whereby participant changes.
8. **Recording:** keep the auto-start.
   - The teacher's client schedules `stopCloudRecording()` at `window.end`.
   - On every participant join after the end time, it checks `state.cloudRecording` and stops it again.
   - It writes `recording_stopped_at`.
   - The REC badge is shown from `state.cloudRecording`.
   - If the stop never fires (e.g. the teacher's tab closed), the recording simply runs on. No trimming: Whereby stores the full file either way, so trimming wouldn't save anything.
9. **End dialog:** the before / after-time-up wording and options exactly as in the spec.
   - "End lesson for everyone" calls host `endMeeting()`, sets `classroom_sessions.ended_at` and `bookings.status = 'completed'`.
   - "Leave for now" calls `leaveRoom()`.
10. **Chat:**
    - Messages are broadcast for instant display and appended to `bookings.chat_log` through `POST /api/classroom/[id]/messages`, which calls `append_lesson_chat` (one atomic SQL append, so two messages sent at once can't overwrite each other). Rejoining loads the array back.
    - Teacher bubbles are peach and student bubbles are grey.
    - Unread badge on the button's corner (22px, cleared when the chat opens).
    - Pop-up over the sender's tile (about 4 seconds, scales with the tile).
    - Files go to `classroom-files/<bookingId>/<uuid>-<name>` with a 20 MB limit and an allow-list (images, pdf, office docs, audio; enforced by the bucket). Downloads use signed URLs.
    - Attachments are **deleted after 30 days** by a daily cron (`/api/cron/prune-classroom-files`, modelled on `prune-pron-audio`). The text stays in `chat_log` for good; after 30 days a file link shows "File expired".
    - The chat download is generated from `chat_log`, at the end of the lesson and later from the lesson summary page. No copy of the download is stored.
11. **Lesson complete:**
    - After `ended_at`, or when leaving after time is up, show layout **B** (no saved words) or **F** (saved words) as in the spec.
    - `POST /api/classroom/[id]/rating` writes `lesson_ratings`. Ratings are **admin-only**: the student never sees them again after submitting.
    - Chat download builds a `.txt` from `bookings.chat_log`, server-side so both people get the same file.
12. **i18n:** all student-facing strings go into `src/lib/i18n.ts` (`ja` / `en`) and are chosen by `preferred_language`. The teacher UI is in English.

### Phase 2: Slides

**Status (2026-10-06): built, ready to test.**
- **Slides in the room:** `SlideStage.tsx` places the slide (side / stacked layouts) and scales it. Zoom is local: pinch, double-tap, Ctrl/⌘ + wheel, the % chip resets.
- **Navigation (teacher only):** prev / next, ← → keys, thumbnail grid, ✕ to close the course (free talk). Teacher view toggle (eye button or N), on by default.
- **Sync:** the teacher's change is broadcast at once (`open` event) and saved after 400 ms (`POST /api/classroom/[id]/state`). A student who (re)connects asks the teacher for the current slide (`hello`). Video and audio blocks play and pause together (`media` event, no echo).
- **Library (teacher):** `GET /api/classroom/[id]/library` lists published courses with "In class now / Continue / Done" for this student.
- **Course data:** `GET /api/classroom/[id]/course` returns the course JSON and the asset base URL.
- **Progress:** every saved slide updates `slide_course_progress`. Reaching a lesson's last slide marks it completed. Opening a lesson from the Library, or a booked lesson, resumes at the saved slide unless that lesson is finished.
- **Tests:** a second render test using the real beginner course (38 checks).
- **Still to come:** the student can't pick a course when booking (phase 6), so for now the teacher opens lessons from the Library.
1. **Load the course:**
   - The course comes from `slide_courses` (`bookings.slide_course_id` / `slide_lesson_id`, or `classroom_sessions.course_id` once changed).
   - Render `SlideCanvas` with `assetBase` = the public bucket URL + `<courseId>/`, inside `SlideCharacters`, `SlideVocabSave`, `SlideActivity` and `SlideMediaSync`.
2. **Slide navigation:** the teacher only (prev / next / thumbnails, arrow keys).
   - The current slide is broadcast and persisted in `classroom_sessions.state.slideId`. Store the slide **id**, not an index.
   - The student follows. They have no slide controls.
3. **Teacher view toggle:** teacher only, **on by default**, local to the teacher. It swaps `mode` between `'teacher'` and `'student'`.
4. **Library:** the teacher lists `slide_courses` (published) and their lessons.
   - Opening a lesson updates the session `course_id` / `lesson_id` and broadcasts it.
   - The ✕ closes the course (free talk); it's hidden on phones.
   - Opening any course sets `used_course = true`.
5. **Free talk:** with no course, the room starts in the video-only layout. The whiteboard and screen sharing still show the 4:3 area.
6. **Zoom:** pinch, double-tap and Ctrl/⌘-wheel, local only. Port the gesture rules from the spec.
7. **Pick up next time:**
   - On every slide change, upsert `slide_course_progress(user_id, course_id, lesson_id, slide_id)` (debounced).
   - When the lesson ends on a lesson's last slide, add it to `completed_lesson_ids`.
   - The booking form preselects the course and lesson from this row: the same lesson at `slide_id` if it wasn't finished, otherwise the next lesson.
8. **Media sync:** `SlideMediaSync.onEvent` → broadcast play / pause / seek.

### Phase 3: Canvas, whiteboard and cursors

**Status (2026-10-06): built, ready to test.**
- **Drawing engine:** `src/components/classroom/ink.ts`, one per classroom, so drawings survive leaving and rejoining. Pen, highlighter, line (Shift snaps), rectangle / ellipse (Shift = square / circle), text, eraser, select (click, shift-click, marquee, drag, Delete, recolour), undo (60 steps per surface), clear.
- **Toolbar:** `Toolbar.tsx`, the frosted drawer with the handle and notch, for both teacher and student. Keys V P H L R O T E, ⌘Z, Delete.
- **Sync:** every change is sent at once (`ink` ops: add / pts at about 30 Hz / set / del / all). Each surface is saved 800 ms after its last change (`PUT /api/classroom/[id]/ink`, table `classroom_ink`), and anything pending is saved when the tab closes. Drawings are loaded in `join`.
- **Whiteboard:** one per lesson (surface `board`). Either person toggles it (button or W); it's shared and saved in `classroom_sessions.state.whiteboard` (`event` type `whiteboard`). The teacher moving slides or opening a lesson closes it. In free talk it gives the 4:3 area.
- **Live cursors:** the pointer is sent at up to 20 Hz in stage coordinates, shown with a name label at a constant size, and fades after 6 s still. Touch: one finger draws with a drawing tool, two fingers pinch; pan and double-tap zoom only with the select tool.
- **Tests:** a third render test (32 checks) with a stub canvas.
- **Not yet:** the "Let the student draw" and cursor on/off settings (phase 4 settings).
1. **Ink model:** port the ink model (`kind`, `pts`, `a`/`b`, text) and the tools: pen, highlighter, line (Shift snaps), shape (rectangle / ellipse, Shift for square / circle), text, eraser and select (click, shift-click, marquee, drag, Backspace / Delete, recolour, undo history).
2. **Who can draw:** the student can use every canvas tool but never the slide controls. There's a teacher setting "Let the student draw", default **on**.
3. **Sync:** live stroke points are broadcast (throttled to about 30 Hz). The finished item and the full `items` list are persisted to `classroom_ink` (debounced), keyed by slide id, or `board` for the one-per-lesson whiteboard.
4. **Live cursors:** broadcast the pointer in stage coordinates at up to 20 Hz. Draw an arrow with a translucent name badge, at a constant on-screen size. The Settings toggle is local.

### Phase 4: Sharing, controls and settings
1. **Screen share:** teacher and student. Use `startScreenshare` / `stopScreenshare`; the slide area takes the shape of the share. The stop toast is context-aware: whiteboard / slide N / "Screen sharing stopped".
2. **Pop-out video (P):** `videoElement.requestPictureInPicture()` on the other person's `VideoView`. This works in Chrome and Safari 17+. The tile shows "… video is in a separate window". No toasts.
3. **Teacher tile menu:**
   - "Mute {name}" uses `muteParticipants`, then becomes "Ask {name} to unmute" (`askToSpeak`).
   - "Ask to share screen" uses `askToTurnOnScreenshare`.
   - "Stop their share" uses `stopParticipantScreenshare`.
   - "Pop out video".
4. **Settings:**
   - Devices.
   - Background (`switchCameraEffect` / `switchCameraEffectCustom` / `clearCameraEffect`, hidden if no presets are usable).
   - Noise reduction (`enable/disableAudioDenoiser`, after `isAudioDenoiserSupported()`).
   - HD and low data (`toggleHdMode` / `toggleLowDataMode`).
   - Mirror (CSS).
   - Cursors.
   - Theme.
   - Visual effects (Auto / Full / Reduced; Auto = reduced on ≤4 GB memory, ≤4 cores, or reduced transparency).
   - The demo-only tabs from the mockup are **not** built.
5. **Reconnecting banner:** shown on `signalTrouble`, cleared on `signalOk`.

### Phase 5: Interactive slides, lookups and translation
1. **Word lookup:**
   - **Finding the word:** use `caretPositionFromPoint` / `caretRangeFromPoint`, with eligible-text rules as in the spec.
   - **Drawing it:** use the CSS Custom Highlight API (`::highlight(lk-hover|lk-sel|lk-saved)`), so React's DOM is never changed.
   - **Gestures:** follow the spec's table exactly (tap, long-press then drag, pan and pinch win).
   - **API:** `POST /api/classroom/lookup` with `{ term, sentence, lang }`. It answers from the course's own `VocabItem`s first, then `ai_lookup_cache`, then `gpt-5.4-nano`, which returns JSON `{ term, pos, translation, example }`.
2. **Saving words:** use one endpoint, `POST /api/vocabulary` with `action: 'saveFromClassroom'`. It upserts `vocabulary_phrases` with `source` (`course` / `lookup` / `chat`), `source_course_id`, `source_item_id` and the booking id when in a lesson. It then adds a `vocabulary_cards` row that is due now (`phrase_id`, FSRS defaults). The existing `SlideVocabSave` + button uses the same endpoint. Saved terms turn teal and bold everywhere in the lesson.
3. **Chat translation:**
   - **Students:** a translate icon on teacher messages calls `POST /api/classroom/translate` with `{ messageId }` and returns the translation into `profiles.native_language`. It's cached in `ai_lookup_cache(kind='chat')`.
   - **Saving:** "+ Save to my words" appears for messages of 10 words or fewer.
4. **True/false and matching:** these are already implemented as block types in `src/lib/slides` (`truefalse`, `match`). Give them a `SlideActivity` provider:
   - `get` / `set` read and write `classroom_activity`, and are broadcast, so both people see every answer.
   - `onResult` shows its toast only to the person who answered.
5. **Review Now:** opens the dashboard's vocabulary review with the newly due cards.

### Phase 6: Booking and dashboard integration
1. **Booking form:** an optional "Add a course" control. Course + lesson are preselected from `slide_course_progress`. It writes `bookings.slide_course_id` / `slide_lesson_id`. Free talk is the default when nothing is chosen.
2. **Dashboard:** if `classroom_enabled`, `HeroLesson` links to `/classroom/<bookingId>` in the same tab, otherwise to the Whereby URL as today.
3. **Admin:** the `/admin` lesson list shows an "Enter classroom" link to `/classroom/<bookingId>` for pilot users.
4. **Ratings on the admin dashboard (admin-only):**
   - A "Lesson ratings" card on `/admin`: average stars (last 30 days), count, and the latest ratings with student name, date and comment.
   - Stars shown next to each past lesson on the admin student page (`/api/admin/students/[id]`).
   - New route `GET /api/admin/ratings` (`verifyAdmin`). Students have no route or policy that reads `lesson_ratings`.
5. **No-show:** at start + 15 minutes, if the student has never joined, the booking is a no-show.
   - The teacher's room shows "Aiko hasn't joined: marked as no-show" with an Undo.
   - `POST /api/classroom/[id]/no-show` sets `bookings.status = 'no_show'` (or back to `'confirmed'` on undo). A student who arrives later still gets in, and that also undoes it.
   - Minutes are deducted at booking time and a no-show doesn't refund them, so `minute_usage` isn't touched.
6. **Existing queries that need to know about `no_show`** (they all filter by status today):
   - `api/calendar/history`: include `no_show` so the student sees the lesson as "Missed" (and `HomeView` / history UI shows that label instead of a summary prompt).
   - `api/admin/stats`: "completed lessons" currently counts past `confirmed` + `completed`; exclude `no_show` and show a no-show count.
   - `api/admin/students/[id]`: show the status label.
   - `api/cron/summary-nudge`: only nudges `confirmed`, so no-shows are already skipped. `api/calendar/upcoming`, `api/admin/lessons` and `api/cron/reminders` also only read `confirmed`, which is correct.

### Phase 7: Testing and rollout
1. **Two-browser test plan:** teacher in Chrome, student in Safari 17+ and on a phone.
   - Join / leave / rejoin and recovery. Kill the tab mid-stroke and on the whiteboard, and check that everything is restored.
   - Clock start and amber / red; recording stop at the end time (check the file length in the Whereby dashboard).
   - End dialog paths; lesson-complete F / B; chat files and translation.
   - Lookups while zoomed; true/false and matching sync; screen share both ways; PiP.
   - Reduced effects; slow network (DevTools throttling) and `signalTrouble`.
2. **Pilot:** turn on `classroom_enabled` for the admin plus one or two students. The old Whereby links stay the default for everyone else.
3. **Switch-over:** when stable, make the classroom the default and keep the raw Whereby link as an admin-only fallback.

---

## 4. API routes (new)

| Route | Who | Does |
|---|---|---|
| `GET /api/classroom/[id]/join` | owner or admin | access check, room URL / roomKey, booking window, session, names, languages |
| `GET /api/classroom/[id]/state` | owner or admin | session state, ink (all surfaces), activity, chat history |
| `POST /api/classroom/[id]/start` | admin | set `started_at` once |
| `POST /api/classroom/[id]/state` | owner or admin | patch session state (slide, whiteboard, mode, course / lesson) |
| `PUT /api/classroom/[id]/ink/[surface]` | owner or admin | replace items for a surface (debounced writer) |
| `PUT /api/classroom/[id]/activity/[blockId]` | owner or admin | activity state |
| `POST /api/classroom/[id]/messages` | owner or admin | text or file message (file upload via signed upload URL) |
| `POST /api/classroom/[id]/end` | admin | `ended_at`, `bookings.status='completed'`, course progress |
| `POST /api/classroom/[id]/no-show` | admin | mark (or undo) a no-show |
| `POST /api/classroom/[id]/rating` | owner | rating + comment (write-only for students) |
| `GET /api/admin/ratings` | admin | ratings list + averages for the admin dashboard |
| `GET /api/classroom/[id]/chat.txt` | owner or admin | chat download, built from `chat_log` (used by the lesson-complete screen and the summary page) |
| `GET /api/cron/prune-classroom-files` | cron secret | delete chat attachments older than 30 days |
| `POST /api/classroom/lookup` | signed in | word or phrase lookup (cached) |
| `POST /api/classroom/translate` | owner | translate a teacher message (cached) |
| `POST /api/slide-courses/publish` ✅ | studio key | publish a course (`prepare` → direct uploads → `commit`) |
| `POST /api/vocabulary` (`action:'saveFromClassroom'`) | owner | save to word list + create card |

---

## 5. Performance rules (from the mockup)

- **Animation:** animate only `transform` and `opacity`. Layout changes use FLIP. Modals have no blur-in.
- **Blur:** no `backdrop-filter` on anything that moves every frame.
- **Loops:** cursor and audio dots write to the DOM only when values change.
- **Ink:** draw incrementally while drawing; do the full redraw on stroke end.
- **Thumbnails:** build them in idle batches with `content-visibility: auto`.
- **Reduced effects:** solid panels instead of frosted ones.
- **`prefers-reduced-motion`** is honoured.

## 6. Open questions to settle during the build
None right now.

Settled: ratings are admin-only; recordings are never trimmed; no-shows keep their minutes; chat text is kept in the booking, attachments are deleted after 30 days.
