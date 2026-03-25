# eigo.io — iOS App Architecture Plan

## Overview

A React Native (Expo 54) universal iOS app (iPhone + iPad) that mirrors the core student-facing features of the eigo.io web platform. Same Supabase backend, same API routes — just a native mobile experience built for booking lessons on the go and reviewing phrases anywhere.

**Stack:** React Native · Expo 54 · iOS 26 · Reanimated 3 · Supabase JS · Expo Router
**Targets:** iPhone and iPad (universal binary)

---

## What the app does

The app gives students two things: the ability to book and manage lessons, and a place to study their phrase bank. It connects to the existing Next.js API and Supabase database — no backend changes needed.

**In scope:**

- Log in to existing accounts (Google, LINE, email/password) — no sign-up in-app
- Browse available slots and book lessons
- View upcoming lessons with countdown and join button
- View past lessons with transcripts, summaries, and phrase extraction
- Phrase bank with spaced repetition review sessions
- Bilingual UI (EN/JA) synced to user preference
- Push notifications for lesson reminders

**Out of scope (stays web-only):**

- Account creation / sign-up (users register on the web first)
- Admin dashboard (news, settings, student insights)
- AI test panel and seed endpoints
- Landing page / marketing site
- Payments or in-app purchases (all billing handled outside the app)

---

## Project structure

```
eigo-ios/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout (providers, fonts)
│   ├── index.tsx                 # Auth gate → redirect to /home or /sign-in
│   ├── sign-in.tsx               # Login/signup screen
│   ├── (tabs)/                   # Tab navigator (authenticated)
│   │   ├── _layout.tsx           # Tab bar config
│   │   ├── home.tsx              # Upcoming lessons + news
│   │   ├── book.tsx              # Calendar + slot picker
│   │   ├── history.tsx           # Past lessons list
│   │   └── phrases.tsx           # Phrase bank + review
│   ├── lesson/[id].tsx           # Lesson detail (transcript, summary, recording)
│   ├── review.tsx                # Full-screen review session
│   └── settings.tsx              # Profile, language, notifications
├── components/
│   ├── LessonCard.tsx            # Reusable lesson card (upcoming + history)
│   ├── CalendarPicker.tsx        # Date picker with availability dots
│   ├── SlotGrid.tsx              # Time slot selection grid
│   ├── PhraseCard.tsx            # Phrase bank card (flip, review badge)
│   ├── ReviewCard.tsx            # Review session card (question → answer → rate)
│   ├── RatingButtons.tsx         # Again / Hard / Good / Easy buttons
│   ├── ComfortBadge.tsx          # Learning / Reviewing / Mastered badge
│   ├── ProgressBar.tsx           # Review session progress bar
│   └── NewsCard.tsx              # News feed card
├── context/
│   ├── AuthContext.tsx            # Supabase auth session management
│   └── LanguageContext.tsx        # Locale state + i18n helper
├── lib/
│   ├── supabase.ts               # Supabase client init (with secure storage)
│   ├── srs.ts                    # Spaced repetition algorithm (copy from web)
│   ├── api.ts                    # API helper (base URL + auth headers)
│   └── i18n.ts                   # Translation strings
├── hooks/
│   ├── useLessons.ts             # Fetch upcoming/history lessons
│   ├── useVocab.ts               # Fetch vocab cards, review, add/remove
│   ├── useBooking.ts             # Available slots, book, cancel, reschedule
│   └── useNews.ts                # Fetch news feed
└── assets/                       # Fonts, images
```

---

## Screen-by-screen breakdown

### Sign In (login only — no registration)

Login screen with three options: Google OAuth, LINE OAuth, and email/password. Uses `supabase.auth.signInWithOAuth()` for social providers with Expo AuthSession for the redirect flow. No sign-up flow — users must create their account on the web first. The login screen should include a link to eigo.io for new users who need to register.

After login, fetch the user profile from the `profiles` table to get `preferred_language` and `avatar_url`.

### Home (tab)

The main screen students see after signing in.

- **Next lesson card** — date, time, duration, countdown timer. "Enter" button activates 10 minutes before the lesson and opens the Whereby room URL in an in-app browser or Safari.
- **Upcoming lessons** — compact list of remaining scheduled lessons. Tap to expand with reschedule/cancel options.
- **News feed** — bilingual posts from the `news` table, rendered with a simple markdown parser.

Data: `GET /api/calendar/upcoming` + `GET /api/news`

### Book (tab)

Calendar and slot picker for scheduling new lessons.

- **Calendar** — horizontal scrolling week view or monthly grid. Dates with available slots get a dot indicator. Fetches availability per date from `GET /api/calendar/available`.
- **Slot grid** — shows available times for the selected date. Tap to select.
- **Duration toggle** — 30 or 60 minute options.
- **Confirm sheet** — bottom sheet summary before booking. Hits `POST /api/calendar/book`.

This is the most interaction-heavy screen — Reanimated for the calendar scroll and slot selection animations.

### History (tab)

Scrollable list of past lessons, paginated (20 per load, "Show more" at bottom).

Each card shows date/time/duration with three action buttons:

- **Transcript** — fetches from `GET /api/transcriptions`. Shows loading state while Whereby generates it.
- **Summary** — appears after transcript is loaded. Hits `POST /api/lessons/analyze` (or `GET` if cached). Expands inline to show summary, key topics, mistake patterns, and extracted phrases.
- **Watch** — opens recording URL from `GET /api/recordings`.

Phrases from the summary have an "Add to bank" button that calls `POST /api/vocabulary`.

Data: `GET /api/calendar/history`

### Phrases (tab)

The phrase bank with spaced repetition.

- **Review banner** — shows when cards are due. "Review" button navigates to the full-screen review session.
- **Filter pills** — All / Learning / Reviewing / Mastered.
- **Card list** — each card shows the English phrase, category badge, next review time, and comfort dot. Tap to expand and see the Japanese translation, example sentence, explanation, review count, and a remove button.
- **Pagination** — 20 cards visible, "Show more" to load next batch.

Data: `GET /api/vocabulary`

### Review session (full screen)

Pushed as a modal/stack screen from the Phrases tab. Not a tab itself.

- **Progress bar** at the top showing position in the queue.
- **Card** — shows English phrase and example. Tap to flip and reveal the Japanese translation and explanation.
- **Rating buttons** — Again (red) / Hard (yellow) / Good (blue) / Easy (green) with preview intervals. Muted pastel style. Calls `POST /api/vocabulary` with `{ cardId, rating }`.
- Cards animate between each other (Reanimated shared transitions).
- Session ends when all due cards are reviewed → returns to Phrases tab.

The `srs.ts` algorithm is pure TypeScript and can be copied directly from the web codebase.

### Settings

- Display name and contact email (editable)
- Avatar (from profile or upload)
- Language toggle (EN/JA)
- Push notification preferences
- Sign out

---

## Authentication

Supabase auth with `@supabase/supabase-js` + `expo-secure-store` for token persistence.

```
Google  → supabase.auth.signInWithOAuth() via Expo AuthSession
LINE    → Custom OAuth flow (same as web, redirect back to app via deep link)
Email   → supabase.auth.signInWithPassword() (login only, no signUp)
```

LINE OAuth needs a custom redirect URI registered for the app scheme (e.g. `eigo://auth/line/callback`). The existing `/api/auth/line` endpoint would need a small tweak to accept a `redirect_uri` parameter for mobile.

Session tokens are stored in `expo-secure-store` and attached to all API calls via an auth header.

---

## API layer

The app talks to the same Next.js API routes hosted on Vercel. No new backend needed.

```typescript
// lib/api.ts
const BASE_URL = 'https://eigo.io'

export async function api(path: string, options?: RequestInit) {
  const session = await getSession() // from secure store
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...options?.headers,
    },
  })
}
```

All existing API routes already accept Bearer token auth — no changes needed.

---

## Push notifications

Replace the current email/cron reminder system with native push notifications for mobile users.

- **Expo Notifications** for push token registration.
- Store the push token in the `profiles` table (new column: `expo_push_token`).
- Update the existing `/api/cron/reminders` endpoint to send push notifications via Expo's push API alongside existing email/LINE reminders.
- Notifications: 30-minute lesson reminder, booking confirmation, cancellation.

---

## Reanimated usage

Where native animations add real value:

- **Review card flip** — spring animation when revealing the answer.
- **Card transitions** — slide left/right between review cards using `Layout.springify()`.
- **Progress bar** — animated width changes during review sessions.
- **Calendar scroll** — smooth horizontal week scrolling with snap points.
- **Tab transitions** — shared element transitions between phrase list and review screen.
- **Pull to refresh** — on all list screens.

Keep it restrained — Reanimated for interactions that feel better native, standard Animated API or LayoutAnimation for simple fades.

---

## iPad support

Expo 54 builds a universal binary by default — the app runs on both iPhone and iPad with no separate build. The main work is making layouts responsive so they look intentional on larger screens rather than just stretched.

**What needs adaptive layout:**

- **Booking calendar** — use a wider grid on iPad (show full month) vs. compact week view on iPhone.
- **Phrase bank & history lists** — two-column grid on iPad, single column on iPhone.
- **Review cards** — centered at a max width (~500px) on iPad rather than full-bleed.
- **Settings screen** — centered form with max width on iPad.

Use `useWindowDimensions()` to detect screen size and adjust layouts. A simple breakpoint at 768px (standard iPad min width) is enough — no need for a full responsive framework.

**iPad-specific considerations:**

- Support split-screen multitasking (students might have the lesson video on one side and the app on the other).
- Test landscape orientation — the booking calendar and review session should work in both orientations.

---

## App Store review notes

**No payments in-app:** The app has no in-app purchases, subscriptions, or payment flows. All billing is handled outside the app. This keeps things clean with Apple's guidelines — no revenue share concerns.

**Login-only (no registration):** Users must create accounts on the web. The app only supports logging in to existing accounts. This is fine for App Store approval, but Apple's review team needs to test the app. You must provide a **demo account** (email + password) in App Store Connect when submitting for review.

**Content:** The app is an educational companion for English language lessons. No user-generated public content, no social features, no content moderation concerns.

---

## Shared code with web

These files can be copied directly from the web codebase with zero changes:

| File | What it does |
|------|-------------|
| `src/lib/srs.ts` | Spaced repetition algorithm (calculateNextReview, formatNextReview, previewIntervals) |
| `src/lib/i18n.ts` | Translation strings |

The API route signatures are identical — the mobile app is just a different client hitting the same endpoints.

---

## Dependencies

```json
{
  "expo": "~54.0.0",
  "react-native": "0.76.x",
  "expo-router": "~4.0.0",
  "react-native-reanimated": "~3.16.0",
  "@supabase/supabase-js": "^2.x",
  "expo-secure-store": "~14.0.0",
  "expo-auth-session": "~6.0.0",
  "expo-notifications": "~0.29.0",
  "expo-web-browser": "~14.0.0",
  "expo-image": "~2.0.0",
  "react-native-gesture-handler": "~2.20.0",
  "@expo/vector-icons": "^14.0.0"
}
```

---

## Phased build plan

### Phase 1 — Core (week 1–2)

Get the app functional with the essentials.

- Project setup (Expo 54, Router, Reanimated, Supabase)
- Auth flow — login only, no sign-up (Google, LINE, email) with link to web for registration
- Home tab (upcoming lessons, enter room, countdown)
- Book tab (calendar, slots, booking flow)
- Settings screen (profile, language, sign out)
- iPad adaptive layouts (responsive breakpoints, multi-column grids)

### Phase 2 — History & Analysis (week 3)

Bring lesson insights to mobile.

- History tab (past lessons list, pagination)
- Transcript fetching and display
- AI summary with inline accordion (topics, mistakes, phrases)
- "Add to bank" from summary phrases

### Phase 3 — Phrase Bank & SRS (week 4)

The study experience.

- Phrases tab (card list, filters, pagination)
- Review session screen (flip cards, rating buttons, progress bar)
- SRS integration (due count, next review badges)
- Reanimated card transitions

### Phase 4 — Polish & Notifications (week 5)

Ship-ready quality.

- Push notification setup (Expo Notifications)
- Update cron endpoint for push delivery
- Haptic feedback on review ratings
- Error states and offline handling
- iPad landscape and split-screen testing
- App Store assets (iPhone + iPad screenshots, description)
- Create demo account for App Store review team
- TestFlight beta

---

## Database changes needed

Minimal — just one new column for push tokens:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
```

The cron reminders endpoint gets updated to check for this column and send push notifications when present.

---

## LINE OAuth adjustment

The existing LINE auth flow redirects back to a web URL. For mobile, the `/api/auth/line` endpoint needs to accept an optional `platform=ios` parameter and redirect to the app's deep link scheme instead:

```
Current:  redirect to https://eigo.io/auth/line/complete
Mobile:   redirect to eigo://auth/line/complete
```

This is a small change to the existing route — everything else in the LINE flow stays the same.
