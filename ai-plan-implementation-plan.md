# AI plan + AI minute top-ups: implementation plan

Status: Phases 0–2 built (fixes; migration applied; minutes module; AI plan checkout, access, AI-only booking, welcome call, plans card for pilot students). Phases 3–4 planned.
**Everything new is visible to pilot students only** (`user_permissions.ai_enabled`, and admins) until the big AI rollout (course slides + new classroom). iOS comes later, rebuilt from the ground up; v1 is web only.

UI rule: keep it simple and clutter-free, in the existing eigo patterns (pill tabs, squircle cards, the plans page). Show only what the student needs to act; no explanations of how the maths works.

## 1. What we're building

**Two kinds of minutes**
- **Plan minutes** (Lite 120 / Standard 240 a month): lessons with the teacher, as now.
- **AI minutes:** AI tutor lessons, 1:1 (a 15-minute AI lesson uses 15 AI minutes). They come from the **AI plan** (150 a month) and from **top-ups** (any subscriber).
- An AI lesson uses **AI minutes first**. A Lite/Standard student with no AI minutes uses plan minutes at 60% (as today: 15 minutes uses 9). (Confirmed by Connor.)

**AI plan (AIプラン)**
- ¥2,980 / month (150 AI minutes), or ¥29,800 / year (1,800 AI minutes for the year, up front).
- AI lessons only (no lessons with the teacher), all courses and mock exams included, the daily 3-minute AI review once that's built.
- **Free trial:** one free **5-minute AI call** per account. The AI tutor gives a friendly welcome to the platform and gets to know the student with some free talk. It doesn't use up the teacher trial.

**Top-ups:** +60 AI minutes for ¥980, one-off payment, for any subscriber. Used after the month's AI minutes; valid for 3 months.

**Exam Pass:** no current subscribers. Rather than rename it in code, the AI plan gets its own plan id (`ai`) and Exam Pass stops being sold at the rollout (the AI plan replaces it at the same price, with everything Exam Pass had plus AI lessons). In Stripe, the "Exam Pass" product can simply be renamed "AI Plan" and its ¥2,980 monthly price reused; a ¥29,800 yearly price is added to it. Until the rollout, non-pilot students still see Exam Pass.

Cost check (about ¥8–9 per AI minute): 150 minutes fully used ≈ ¥1,300 + review ≤ ¥700 + Stripe ≈ ¥110 → worst case ≈ ¥2,100 (30% margin), typical ≈ ¥1,250 (57%). A 60-minute top-up fully used ≈ ¥550 (44%). The 5-minute trial ≈ ¥45.

## 2. Phase 0 (built): fixes to how minutes are counted

- **Yearly plans get the whole year's minutes up front.** Minutes are counted per billing period, and `subscriptions.minutes_per_month` is the allowance for that period. Website (and Apple) yearly purchases used to store one month's minutes (120 for Lite) for the whole year; now `planAllowance(plan, interval)` stores 12 × the monthly amount for yearly plans (Lite 1,440 / Standard 2,880; AI plan 1,800). Plan changes in the Billing Portal only reset the allowance when the plan or interval actually changes, so renewals and custom allowances set by hand (the 2 custom yearly students, 1,500 each) are left alone.
- **Cancel refunds go back to the period they were charged in**, and refund exactly what was charged (nothing for uncharged trial / test bookings).
- Settings shows the right plan name (Exam Pass was shown as "Student Standard") and hides the minutes bar for plans with no lesson minutes; the `Subscription` type includes `'test'`.

## 3. Data changes (migrations, applied only with approval)

1. `subscriptions.plan` CHECK: add `'ai'`. New column `ai_minutes_per_month INT NOT NULL DEFAULT 0` (AI minutes per billing period: 150 monthly / 1,800 yearly on the AI plan, 0 for others), so plan minutes and AI minutes stay separate.
2. New table `minute_topups`: `id, user_id, minutes, source ('stripe'|'admin'), stripe_checkout_session_id UNIQUE, purchased_at, expires_at`. RLS: user reads own; service role writes.
3. `minute_usage`: new column `pool TEXT NOT NULL DEFAULT 'plan'` (`'plan'` | `'ai'` | `'topup'`) and `topup_id UUID NULL`. Existing rows are `'plan'`, so nothing changes for them.
4. `profiles.ai_trial_booking_id UUID NULL` (the free 5-minute call, once per account).

## 4. Rules (one module: `src/lib/minutes.ts`)

- **Balance:** `{ plan: {left, total}, ai: {left, total}, topup: {left, nextExpiry} }`, counted in the current billing period (top-ups by their own expiry).
- **Charging an AI lesson:** AI minutes (monthly) → top-ups (soonest-expiring first) → plan minutes at 60%. One lesson can be split across pools (one `minute_usage` row per pool).
- **Refunds:** reverse exactly the rows the booking was charged; a refund to an expired top-up is dropped.
- **Lengths offered:** `aiLengthOptions` takes the AI-minute equivalent of everything available (15 / 30 / "use what's left", minimum 5), so the start card and booking keep working unchanged.
- **AI plan can't book teacher lessons:** refused in `/api/calendar/book` and reschedule (`PLAN_AI_ONLY`).
- **AI access:** `hasAiAccess(user)` = admin, or `ai_enabled`, or an active AI plan. Replaces the separate `ai_enabled` checks.
- **Free trial call:** a pilot student with no subscription and no `ai_trial_booking_id` can start one 5-minute AI call (start card: "5分の無料体験"). The session brief switches to an onboarding script: welcome, what eigo can do, a short chat to get to know them. Afterwards: the plans page.

## 5. Payments (Stripe only)

- AI plan: env `STRIPE_PRICE_AI_MONTHLY` (reuse the Exam Pass ¥2,980 price, product renamed) and `STRIPE_PRICE_AI_YEARLY` (¥29,800). Added to `PlanName`, `PLAN_MINUTES` (`ai: 0` plan minutes), AI minutes 150, `PRICE_ENV_MAP`, display name "AIプラン" / "AI Plan".
- Top-up: env `STRIPE_PRICE_TOPUP_60` (¥980, one-off). Route `POST /api/stripe/topup` → Checkout `mode: 'payment'`, `metadata: { kind: 'topup', minutes: 60 }`.
- Webhook: `checkout.session.completed` with `metadata.kind === 'topup'` → insert `minute_topups` (idempotent on the session id). Subscription handling as now, plus a price → plan lookup so plan switches made in the Billing Portal set `plan`, `minutes_per_month` and `ai_minutes_per_month` correctly.
- Plan switching stays in the Stripe Billing Portal (Lite ↔ Standard ↔ AI).

Connor creates in Stripe: rename the Exam Pass product, add the yearly price, add the top-up price; add the three env vars on Vercel.

## 6. Screens (pilot only)

- **Profile popup** (click the avatar in the dashboard): the minute bars, then a button.
  - Lite/Standard: two thin bars, "レッスン 80 / 120分" and "AI 45分".
  - AI plan: one bar, "AI 120 / 150分".
  - Top-up minutes are included in the AI number (no separate bar).
  - Button: "AI分数を追加" → the top-up page.
- **Top-up page** (`/dashboard/topup`, in the style of the plans page): one card, "+60分 · ¥980", "3か月有効", Buy → Stripe Checkout → back with a short "追加しました" toast. Nothing else.
- **Start card:** when out of minutes, the message plus "AI分数を追加" (the same top-up page). Free-trial students see "5分の無料体験" instead.
- **Plans page:** the AI plan card next to Lite/Standard for pilot students (monthly / yearly toggle as the others). Three short lines: "月150分のAIレッスン", "すべてのコース・模試", "毎日の3分復習".
- **Dashboard (AI plan):** "Talk to AI tutor" stays the main action; "Book lesson" opens booking on the AI tutor with no teacher pill.
- **Settings → Plan:** plan name, the same bars, "AI分数を追加".
- **Admin → Students:** plan and AI minutes; a "grant AI minutes" action (writes an admin top-up).

## 7. Phases

| Phase | What | Notes |
|---|---|---|
| 0 | Monthly windows for yearly plans; refunds to the charged month; plan names | **Built** |
| 1 | Migrations + `minutes.ts` / `minutes-core.ts` (pools, split charges, refunds, balance) | **Built**: migration `add-ai-plan.sql` applied; AI bookings, start now and refunds go through it |
| 2 | AI plan: Stripe prices, checkout, webhook price → plan, `aiAccess`, AI-only booking gate, free 5-minute call | **Built** (plus the AI plan card on the plans page for pilot students) |
| 3 | Top-ups: route, webhook branch, top-up page | |
| 4 | Screens: profile popup bars, start card, plans card, booking, settings, admin | Pilot only |
| — | Daily 3-minute review | Separate feature; included in the AI plan when built |
| — | iOS | Later, rebuilt from the ground up |
