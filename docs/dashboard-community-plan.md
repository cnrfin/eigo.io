# Dashboard redesign and community: plan

**Status:** agreed direction, to be built later. The layout reference is `mockups/dashboard-social.html` (the mockups folder is gitignored, so keep a copy).

## What it is

- **A 3-column dashboard:**
  - **Left:** a thin icon rail pinned to the far left that opens on hover, with the profile button at the bottom.
  - **Centre:** the main content.
  - **Right:** a column whose content depends on the page.
- **One floating button**, "Talk to Tom" (the student's AI tutor name).
- **On phones:**
  - a bottom tab bar (Home, Book, Courses, Phrases, You) and a slim top bar;
  - the right column moves into the page: on top for Courses, Phrases, History and Tests, below the main content for Book and Profile.
- **Home:**
  - a greeting, then a progress graph (three stats that switch the graph, 1W / 1M / 6M / 1Y / All);
  - then a post box, then the community feed (All / Challenges / Questions / News).
- **Other tabs:** Book, Courses, Phrases, History, Tests and Profile (with settings) move into the same layout. Activity (notifications) is left out for now.

## Design rules

- **The mockup is a layout example only.** The build reuses eigo-web's existing elements, styles and animations:
  - SquircleCard, pill tabs, framer-motion transitions;
  - BookingCalendar, CourseSheet, AiStartCard, HistoryLessonCard, the phrase review flow.
- **Changes are limited to placement:** columns, rail, tab bar, right-column content.
- **Bilingual:** all new text needs Japanese and English.
- **Design system:** update the eigo-design-system skill with any new layout rules.
- **Choices fixed while mocking up:**
  - challenge blocks use the normal container background (no green tint);
  - quiz-type challenges show the right answer (✓) and a wrong pick (✗) after answering, not just poll percentages;
  - the booking calendar sits above the times, and "Repeat weekly" is in the right column.

## Community rules

| | Free account | Paying student (Lite / Standard) | Admin |
|---|---|---|---|
| Read the feed, like posts | ✓ | ✓ | ✓ |
| Answer challenges and polls | ✓ | ✓ | ✓ |
| Post, ask questions, make polls and quizzes | | ✓ (English only) | ✓ |
| Reply | | ✓ | ✓ |
| Photos and voice clips | | ✓ | ✓ |
| Video | | | ✓ (to start) |
| Daily challenges, news, teacher's notes | | | ✓ |

- **Handles:** students appear under a random handle (e.g. sunny_kiwi), never their real name. They can get a new random name; real names are only used for lessons.
- **Daily challenges (admin):**
  - fill in the phrase or idiom;
  - choose the preposition for a phrasal verb (a quiz with one right answer);
  - "Would you rather…?" (a poll);
  - plus news and updates with images or video.
- **Post types:** text, question, poll, quiz (one right answer), fill the gap, would you rather. The post box toolbar has photo/video, voice clip, then the interactive types.
- **Teacher's notes:** the admin can add a teacher's note under any post, like a community note: one per post, praise first, at most one correction.
- **"Check my English"** can be used **once a day** per student. Students are encouraged to use their own English. After it's used, the option greys out until tomorrow.
- **Challenge phrases:** answers to challenges can be saved to the student's phrases.

## Migrations

Ask before applying any of these.

**Already in the database (all empty, from earlier builds):**
- **To reuse:**
  - `user_blocks`;
  - `content_reports`;
  - `username_blocklist`;
  - `profiles.username`, `username_updated_at` and `is_social_visible`.
- **To leave alone:** `challenges`, `challenge_submissions`, `submission_reactions`, `kudos` and `friendships`. They belong to older game and photo-challenge features.
- **Check first:** whether the iOS app uses `profiles.username`. If it does, the community handle needs its own column.

| # | Change | Purpose |
|---|---|---|
| 1 | **Handles** on `profiles`: a random adjective_animal name in `username`, an avatar colour; names checked against `username_blocklist` | Community name; real name never shown |
| 2 | **`posts`**: author, type (text / question / poll / quiz / fill / would-you-rather / news), body, media paths, voice clip path, status (pending / live / hidden / removed), moderation result (jsonb), closes_at, publish_at (scheduled daily challenges), like and reply counts, parent_id for replies | Every post in the feed |
| 3 | **`post_options`**: post, position, label, is_correct, vote count. Accepted answers for fill-the-gap are stored on the post | Polls, quizzes, challenges |
| 4 | **`post_answers`**: post, user, option or typed answer, is_correct, created_at; unique per post and user | Votes, scores, "64% got it right" |
| 5 | **`post_likes`**: post and user (primary key) | Likes |
| 6 | **`teacher_notes`**: post (one per post), author, body, created_at | Teacher's notes |
| 7 | **Reports and blocks**: `content_reports` with target type 'post'; `user_blocks` | Safety |
| 8 | **News**: copy `news` rows into `posts` as news posts, then retire the old news section | One feed |
| 9 | **Storage**: a `post-media` bucket (images, voice clips, video), with size limits | Uploads |
| 10 | **Phrases**: allow a 'community' source on phrase cards | Save challenge phrases |
| 11 | **English check counter**: last-used date per student | Once-a-day limit |
| 12 | **Progress**: a daily summary per user (practice minutes, lessons, phrases learned, and AI speaking minutes kept separately), built from bookings, AI sessions and phrase reviews. Start as a view; make it a table only if it gets slow | 1W–All graphs |

Like and reply counts should be kept up to date by triggers. The feed is paged by time (cursor), with no realtime.

## Things to get right

1. **Rules enforced on the server.** Free vs paid permissions live in RLS or the API, not just the screen.
2. **No early answers.** Correct answers and percentages only reach the browser after the student has answered.
3. **Every post is checked before it goes live:**
   - **The OpenAI moderation endpoint** (free, text and images) covers abuse, harassment, sexual content and self-harm.
   - **The helper model** checks for English only; no names, LINE IDs, phone numbers, emails, social handles or workplaces; and no spam.
   - **Anything unclear** goes to an admin review queue.
   - **Reports:** posts hide automatically after a few reports, and blocked users disappear from the blocker's feed.
4. **Media:**
   - remove location data from photos;
   - voice clips are capped at about 60 seconds and turned into text so they can be checked;
   - video is admin-only at first.
5. **Admin tools:**
   - a post composer with scheduling (a week of daily challenges at once);
   - a challenge bank;
   - the review queue;
   - a "Teacher's note" button on every post.
6. **Legal and privacy:**
   - update the terms for user posts (APPI);
   - write the community rules page;
   - deleting an account removes the user's posts, likes and answers;
   - community pages are hidden from search engines.
7. **Starting with few students.** Admin daily challenges and news keep the feed alive from day one. No fake users.

## AI cost (October 2026 prices, from third-party trackers; check OpenAI's pricing page)

- **Moderation endpoint:** reported free.
- **GPT-6 Luna:** $0.10 per million input tokens, $0.50 per million output tokens.
  - One post check is about 600 tokens in and 80 out, **≈ $0.0001 per post** (≈ $0.0002 with an image).
  - Voice clips add a small per-minute transcription cost.

| Volume | Rough monthly cost |
|---|---|
| 1,000 posts | ≈ $0.10–0.20 |
| 10,000 posts | ≈ $1–2 |
| Daily English checks (30 students, every day) | ≈ $0.25 |

AI cost is negligible. The real cost is admin time for the review queue and teacher's notes.

## Progress graph: what it measures

- **Human lessons** only record lesson length. **AI lessons** also record how long the student spoke.
- **The graph and the greeting use "Practice time":** lesson minutes from human and AI lessons, counted the same way. "You've practised English for 14h 20m since you joined eigo."
- **The three stats:** practice time, lessons, phrases learned.
  - "Phrases learned" means reviewed correctly 3 or more times (to confirm).
- **The line is cumulative,** so it never dips.
- **Change figures:** "↑ x% vs before" can go down and discourage students, so show only rises, or use "this week: 42m".
- **Measured speaking time shows only on AI lessons,** in History, e.g. "You spoke for 11 of 25 minutes".
- **Later, optional:** estimate speaking time for human lessons from transcripts, only if students want it.
- **New students:** the graph shows "Your progress will show here after your first lesson" until there's a week of data.

## Build order

1. **New dashboard layout and progress graph (no community).**
   - Split `app/dashboard/page.tsx` (about 2,300 lines, tabs as screen state) into real routes: `/dashboard`, `/dashboard/book`, `/phrases`, `/history` and so on.
   - Build the rail, the phone tab bar and the per-page right columns.
2. **Admin-only posts:** news and daily challenges, with answers, likes and saving phrases.
3. **Student posts:** questions, polls and quizzes, with checks before posting, teacher's notes, reports and the once-a-day English check.
4. **Later:** replies, voice clips, and notifications (the Activity tab).
