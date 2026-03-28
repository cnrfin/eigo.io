# eigo.io — iOS App Architecture Plan

## Overview

A React Native (Expo 54) universal iOS app (iPhone + iPad) that mirrors the core student-facing features of the eigo.io web platform. Same Supabase backend, same API routes — just a native mobile experience built for booking lessons on the go and reviewing phrases anywhere.

**Stack:** React Native · Expo 54 · iOS 26 · Reanimated 3 · Supabase JS · Expo Router
**Targets:** iPhone and iPad (universal binary)

---

## What the app does

The app gives students the full eigo.io experience: sign up, book a trial lesson, subscribe to a plan via Stripe, book and manage lessons, and study their phrase bank. It connects to the existing Next.js API and Supabase database — minimal backend changes needed (just accepting mobile deep links for Stripe redirects).

**In scope:**

- Sign up for new accounts (Google, LINE, email/password) and log in to existing ones
- Trial lesson gating — new users book a free trial before seeing plan options
- Plan selection and Stripe checkout for subscriptions (light / standard, monthly / yearly)
- Browse available slots and book lessons (with minute balance enforcement)
- View upcoming lessons with countdown and join button
- View past lessons with transcripts, summaries, and phrase extraction
- Phrase bank with spaced repetition review sessions
- Subscription management (view plan, minutes remaining, cancel via Stripe portal)
- Bilingual UI (EN/JA) synced to user preference
- Push notifications for lesson reminders

**Out of scope (stays web-only):**

- Admin dashboard (news, settings, student insights)
- AI test panel and seed endpoints
- Landing page / marketing site

---

## Project structure

```
eigo-ios/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout (providers, fonts)
│   ├── index.tsx                 # Auth gate → redirect to /home or /sign-in
│   ├── sign-in.tsx               # Login + signup screen (toggle mode)
│   ├── plans.tsx                 # Plan selection after trial completion
│   ├── payment/
│   │   ├── success.tsx           # Deep link target after Stripe payment
│   │   └── cancel.tsx            # Deep link target if payment cancelled
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
│   ├── useSubscription.ts        # Fetch subscription status + minute balance
│   └── useNews.ts                # Fetch news feed
└── assets/                       # Fonts, images
```

---

## Screen-by-screen breakdown

### Sign In / Sign Up

Auth screen with three provider options: Google OAuth, LINE OAuth, and email/password. Toggle between "Log in" and "Sign up" modes. Uses `supabase.auth.signInWithOAuth()` / `supabase.auth.signUp()` for the respective flows, with Expo AuthSession handling OAuth redirects.

After auth, fetch the user profile from the `profiles` table to get `preferred_language`, `avatar_url`, `trial_completed_at`, and subscription status. Route the user based on their state:

- **No trial booked** → Book tab with trial prompt
- **Trial booked, not completed** → Home tab showing upcoming trial lesson
- **Trial completed, no subscription** → Plan selection screen (with trial discount countdown if within 48h)
- **Active subscription** → Home tab (normal flow)

### Plan Selection

Shown after trial completion when the user has no active subscription. Mirrors the web pricing flow.

- **Plan cards** — Light (120 min/month) and Standard (240 min/month) with monthly/yearly toggle.
- **Trial discount banner** — if within 48 hours of trial completion, show discounted prices with a countdown timer. Uses the same `trialHoursRemaining()` logic from the web.
- **"Subscribe" button** → opens Stripe Checkout in an in-app browser (see Payments section below).
- After successful payment, the Stripe webhook creates the subscription record server-side. The app polls `GET /api/subscription` until active, then navigates to Home.

Data: `GET /api/stripe/prices` (plan details) + `POST /api/stripe/checkout` (create session) + `GET /api/subscription` (poll for activation)

### Home (tab)

The main screen students see after signing in.

- **Next lesson card** — date, time, duration, countdown timer. "Enter" button activates 10 minutes before the lesson and opens the Whereby room URL in an in-app browser or Safari.
- **Upcoming lessons** — compact list of remaining scheduled lessons. Tap to expand with reschedule/cancel options.
- **News feed** — bilingual posts from the `news` table, rendered with a simple markdown parser.

Data: `GET /api/calendar/upcoming` + `GET /api/news`

### Book (tab)

Calendar and slot picker for scheduling new lessons.

- **Minutes remaining badge** — top-right corner showing remaining minutes for the current billing period (same as web booking tab).
- **Calendar** — horizontal scrolling week view or monthly grid. Dates with available slots get a dot indicator. Fetches availability per date from `GET /api/calendar/available`.
- **Slot grid** — shows available times for the selected date. Tap to select.
- **Duration toggle** — 30 or 60 minute options. Disabled options greyed out if insufficient minutes remaining.
- **Confirm sheet** — bottom sheet summary before booking. Shows minutes to be deducted. Hits `POST /api/calendar/book`.
- **No subscription state** — if user has no active subscription, show a prompt to complete their trial or select a plan instead of the calendar.

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
- **Subscription panel** — current plan, billing interval, minutes usage bar (depleting), renewal/cancellation date. "Manage subscription" button opens the Stripe billing portal in an in-app browser.
- Sign out

---

## Authentication

Supabase auth with `@supabase/supabase-js` + `expo-secure-store` for token persistence. Both sign-up and login are supported.

```
Google  → supabase.auth.signInWithOAuth() via Expo AuthSession (handles both new + existing users)
LINE    → Custom OAuth flow (same as web, redirect back to app via deep link)
Email   → supabase.auth.signUp() for new users / supabase.auth.signInWithPassword() for existing
```

LINE OAuth needs a custom redirect URI registered for the app scheme (e.g. `eigo://auth/line/callback`). The existing `/api/auth/line` endpoint would need a small tweak to accept a `redirect_uri` parameter for mobile.

Session tokens are stored in `expo-secure-store` and attached to all API calls via an auth header.

On first sign-up, the `profiles` row is created automatically by the existing Supabase trigger. The app then routes to the trial booking flow.

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

## Payments (Stripe — external payment)

### Why external payment is allowed

eigo.io provides **one-to-one English tutoring with a real human teacher** — this qualifies as a "real-world service" (person-to-person tutoring) under Apple's App Store Review Guidelines §3.1.3(e). Apps that facilitate real-world services (tutoring, personal training, real estate tours, etc.) have always been permitted to use external payment processors. No Apple commission applies.

Additionally, following the April 2025 Epic v. Apple ruling, US App Store apps can link to external payment methods without commission. Since eigo.io serves students in both Japan and the US, the real-world service exemption is the primary basis (applies globally), with the Epic ruling as additional coverage for US users.

### Payment flow

The app never collects payment information directly. All payment is handled through Stripe Checkout, opened in an in-app browser (`expo-web-browser`).

```
1. User completes trial lesson
2. App shows Plan Selection screen with pricing
3. User taps "Subscribe" on their chosen plan
4. App calls POST /api/stripe/checkout with:
   - plan (light / standard)
   - billing_interval (monthly / yearly)
   - price_tier (trial / full — based on trialHoursRemaining)
   - success_url: eigo://payment/success
   - cancel_url: eigo://payment/cancel
5. API returns Stripe Checkout session URL
6. App opens URL in expo-web-browser (Safari view controller)
7. User completes payment on Stripe's hosted page
8. Stripe redirects to eigo://payment/success (deep link back to app)
9. Stripe webhook fires → creates subscription in Supabase (server-side)
10. App polls GET /api/subscription until status is active
11. App navigates to Home tab with full access
```

### Subscription management

- **View subscription** — Settings screen shows plan details and minute balance via `GET /api/subscription`.
- **Cancel / change plan** — "Manage subscription" button calls `POST /api/stripe/portal` to get a Stripe billing portal URL, then opens it in an in-app browser. Portal is configured to enforce "cancel at end of billing period."
- **Webhook sync** — all subscription state changes (cancel, reactivate, period renewal) are handled by the existing `/api/stripe/webhook` endpoint. The app just reads the current state from the API.

### Deep link configuration

Register the `eigo://` scheme in `app.json` for payment redirect handling:

```json
{
  "expo": {
    "scheme": "eigo",
    "ios": {
      "associatedDomains": ["applinks:eigo.io"]
    }
  }
}
```

The app's root layout listens for deep links and routes `eigo://payment/success` and `eigo://payment/cancel` to the appropriate screens.

### Backend changes needed for mobile payments

Minimal — the existing Stripe checkout and webhook routes already handle everything. Two small additions:

1. **`POST /api/stripe/checkout`** — accept `success_url` and `cancel_url` parameters (currently hardcoded to web URLs). When the request includes a mobile deep link URL, use it instead.
2. **`app.json` scheme registration** — register `eigo://` as the app's URL scheme so Stripe can redirect back after payment.

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

**Real-world service exemption (Guidelines §3.1.3(e)):** eigo.io connects students with a real human English tutor for live one-to-one video lessons. This is a real-world, person-to-person service — the same category as personal training apps, tutoring platforms, and home service apps. Under Apple's guidelines, apps facilitating real-world services may use external payment processors (Stripe) without Apple's in-app purchase system and without commission. The subscription pays for scheduled time with a real teacher, not for digital content.

**No IAP integration needed:** The app uses Stripe Checkout (opened in a Safari view controller via `expo-web-browser`) for all payment. No StoreKit integration, no IAP, no Apple commission. This is standard practice for tutoring and service-booking apps on the App Store.

**Full sign-up and login supported:** Users can create new accounts or log in to existing ones directly in the app. Apple's review team needs to test the full flow — provide a **demo account** (email + password) in App Store Connect, and ensure the demo account has an active subscription so reviewers can access all features. Also provide clear instructions for testing the trial → subscription flow with a second test account.

**Content:** The app is an educational platform for English language lessons. No user-generated public content, no social features, no content moderation concerns.

**Review submission notes to include:**
- Explain that the app facilitates real-world tutoring services (live video lessons with a human teacher) and uses external payment per Guidelines §3.1.3(e).
- Provide demo credentials for a subscribed account and a fresh account (to test trial flow).
- Note that payment is processed via Stripe Checkout in a Safari view controller — no payment data is collected within the app itself.

---

## Shared code with web

These files can be copied directly from the web codebase with zero changes:

| File | What it does |
|------|-------------|
| `src/lib/srs.ts` | Spaced repetition algorithm (calculateNextReview, formatNextReview, previewIntervals) |
| `src/lib/i18n.ts` | Translation strings |
| `src/lib/stripe.ts` | Price tier types, plan definitions, price lookups |
| `src/lib/subscription.ts` | `getPriceTier()`, `trialHoursRemaining()` — pure functions for trial discount logic |

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
  "expo-web-browser": "~14.0.0",       // Used for Stripe Checkout + billing portal
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
- Auth flow — sign-up and login (Google, LINE, email)
- User state routing (trial → plan selection → home)
- Home tab (upcoming lessons, enter room, countdown)
- Book tab (calendar, slots, booking flow, minute balance badge)
- Settings screen (profile, language, subscription panel, sign out)
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

### Phase 4 — Payments & Subscriptions (week 5)

Stripe integration and subscription management.

- Plan selection screen (pricing cards, monthly/yearly toggle, trial discount countdown)
- Stripe Checkout flow via expo-web-browser
- Deep link handling for payment success/cancel redirects (`eigo://payment/*`)
- Subscription polling after payment completion
- Settings subscription panel (plan info, minutes bar, manage/cancel via Stripe portal)
- Update `POST /api/stripe/checkout` to accept mobile deep link URLs
- Test full trial → checkout → subscription → booking flow end-to-end

### Phase 5 — Polish & Notifications (week 6)

Ship-ready quality.

- Push notification setup (Expo Notifications)
- Update cron endpoint for push delivery
- Haptic feedback on review ratings
- Error states and offline handling
- iPad landscape and split-screen testing
- App Store assets (iPhone + iPad screenshots, description)
- Create two demo accounts for App Store review (one subscribed, one fresh for trial flow)
- Write App Store review notes explaining real-world service exemption
- TestFlight beta

---

## Database changes needed

Minimal — just one new column for push tokens. The subscription, minute_usage, and profile tables already exist and support the full payment flow.

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
```

The cron reminders endpoint gets updated to check for this column and send push notifications when present.

No new tables needed for payments — the existing `subscriptions`, `minute_usage`, and `profiles` tables (with `trial_completed_at`) handle everything.

---

## LINE OAuth adjustment

The existing LINE auth flow redirects back to a web URL. For mobile, the `/api/auth/line` endpoint needs to accept an optional `platform=ios` parameter and redirect to the app's deep link scheme instead:

```
Current:  redirect to https://eigo.io/auth/line/complete
Mobile:   redirect to eigo://auth/line/complete
```

This is a small change to the existing route — everything else in the LINE flow stays the same.
