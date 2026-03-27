# eigo.io — Subscription & Billing Architecture

## Overview

Add Stripe-powered subscriptions with minute-based lesson credits, self-service plan management, and a payment page for new signups. All prices in JPY.

---

## 1. Pricing Structure

### Plans

| Plan | Minutes/week | Monthly (with trial) | Monthly (no trial) | Yearly (with trial) | Yearly (no trial) |
|------|-------------|---------------------|--------------------|--------------------|-------------------|
| **Light** | 30 min/week (~2 hr/month) | ¥6,000 | ¥10,000 | ¥60,000 (¥5,000/mo) | ¥120,000 (¥10,000/mo) |
| **Standard** | 60 min/week (~4 hr/month) | ¥12,000 | ¥20,000 | ¥120,000 (¥10,000/mo) | ¥240,000 (¥20,000/mo) |

### Trial discount logic

- Every new user gets a **free 15-minute trial lesson**
- If they subscribe **within 48 hours** of completing the trial, they get discounted pricing
- After 48 hours the discount expires and they see full pricing
- This means **8 Stripe Price objects** total (2 plans × 2 intervals × 2 price tiers)

---

## 2. Database Schema

### New tables

```sql
-- Tracks Stripe subscription state
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('light', 'standard')),  -- 30min or 60min
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  price_tier TEXT NOT NULL CHECK (price_tier IN ('trial', 'full')),  -- which price they locked in
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'incomplete')),
  minutes_per_month INTEGER NOT NULL,  -- 120 or 240
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- one active subscription per user
);

-- Tracks minute usage within each billing period
CREATE TABLE minute_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  minutes_used INTEGER NOT NULL,  -- from booking.duration_minutes
  period_start TIMESTAMPTZ NOT NULL,  -- which billing period this belongs to
  action TEXT NOT NULL CHECK (action IN ('booked', 'cancelled_refund', 'no_show')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_minute_usage_user_period ON minute_usage(user_id, period_start);
```

### Modifications to existing tables

```sql
-- Add trial tracking to profiles
ALTER TABLE profiles ADD COLUMN trial_booking_id UUID REFERENCES bookings(id);
ALTER TABLE profiles ADD COLUMN trial_completed_at TIMESTAMPTZ;
-- trial_completed_at is set when the 15-min trial lesson is marked completed
-- the 48-hour discount window = trial_completed_at + INTERVAL '48 hours'
```

### RLS policies

```sql
-- Users can read their own subscription
CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own usage
CREATE POLICY "Users read own usage"
  ON minute_usage FOR SELECT USING (auth.uid() = user_id);

-- Only service role can INSERT/UPDATE (via API routes + webhooks)
```

---

## 3. Stripe Setup

### Products & Prices (create in Stripe Dashboard or via API)

```
Product: "eigo Light (30 min/week)"
  → Price: ¥6,000/month   (metadata: {plan: "light", tier: "trial"})
  → Price: ¥10,000/month   (metadata: {plan: "light", tier: "full"})
  → Price: ¥60,000/year   (metadata: {plan: "light", tier: "trial"})
  → Price: ¥120,000/year   (metadata: {plan: "light", tier: "full"})

Product: "eigo Standard (60 min/week)"
  → Price: ¥12,000/month  (metadata: {plan: "standard", tier: "trial"})
  → Price: ¥20,000/month  (metadata: {plan: "standard", tier: "full"})
  → Price: ¥120,000/year  (metadata: {plan: "standard", tier: "trial"})
  → Price: ¥240,000/year  (metadata: {plan: "standard", tier: "full"})
```

### Environment variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_LIGHT_MONTHLY_TRIAL=price_xxx
STRIPE_PRICE_LIGHT_MONTHLY_FULL=price_xxx
STRIPE_PRICE_LIGHT_YEARLY_TRIAL=price_xxx
STRIPE_PRICE_LIGHT_YEARLY_FULL=price_xxx
STRIPE_PRICE_STANDARD_MONTHLY_TRIAL=price_xxx
STRIPE_PRICE_STANDARD_MONTHLY_FULL=price_xxx
STRIPE_PRICE_STANDARD_YEARLY_TRIAL=price_xxx
STRIPE_PRICE_STANDARD_YEARLY_FULL=price_xxx
```

### Webhook events to handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription record, set period dates |
| `invoice.paid` | Reset minute usage for new period, update period dates |
| `customer.subscription.updated` | Sync plan/status changes (upgrades, downgrades) |
| `customer.subscription.deleted` | Mark subscription as cancelled |
| `invoice.payment_failed` | Mark as past_due, notify user |

---

## 4. API Routes

### New routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/stripe/checkout` | POST | Create Stripe Checkout session (picks correct price based on trial window) |
| `/api/stripe/webhook` | POST | Handle Stripe webhook events |
| `/api/stripe/portal` | POST | Create Stripe Customer Portal session (manage/cancel subscription) |
| `/api/subscription` | GET | Get current user's subscription + remaining minutes |
| `/api/subscription/usage` | GET | Get minute usage breakdown for current period |

### Modified routes

| Route | Change |
|-------|--------|
| `/api/calendar/book` | **Add minute balance check** — reject if insufficient minutes remaining |
| `/api/calendar/cancel` | **Add minute refund logic** — refund minutes only if cancelled ≥15 min before lesson start |
| `/api/calendar/reschedule` | No change to minutes (already covered — old booking cancelled + new one created at same duration) |

---

## 5. Minute Tracking Logic

### How minutes work

```
minutes_per_month = 120 (light) or 240 (standard)
period = current_period_start → current_period_end (from Stripe)

remaining = minutes_per_month - SUM(minutes_used WHERE period_start = current_period_start AND action = 'booked')
           + SUM(minutes_used WHERE action = 'cancelled_refund')
```

### Booking flow (updated)

```
1. User selects timeslot(s) and duration
2. POST /api/calendar/book
3. Server checks:
   a. Does user have an active subscription? → if not, redirect to /plans
   b. Calculate remaining minutes for current period
   c. remaining >= requested duration? → if not, return 403 "Insufficient minutes"
4. If OK → create booking as normal + INSERT minute_usage(action='booked')
5. Return success
```

### Cancellation flow (updated)

```
1. User cancels a booking
2. POST /api/calendar/cancel
3. Server checks: is the lesson ≥15 minutes away?
   a. YES → cancel booking + INSERT minute_usage(action='cancelled_refund', minutes_used=negative)
   b. NO  → cancel booking + no refund (minutes already spent)
4. In both cases: delete Whereby room, remove Google Calendar events, send notifications
```

### Rescheduling

No minute change. The existing reschedule logic creates a new booking at the same duration and cancels the old one. We just need to make sure the minute_usage entries net to zero: the old booking's minutes are refunded (always, since rescheduling implies they're not no-showing) and the new booking deducts the same amount.

---

## 6. User-Facing Pages

### `/plans` — Payment page (new)

**When shown:**
- New users after signup (redirected from dashboard if no subscription)
- Existing free users
- From CTA on landing page

**Layout:**
- Two plan cards side by side: "Light" (30 min/week) and "Standard" (60 min/week)
- Toggle switch: Monthly / Yearly
- Each card shows price per month (yearly shows per-month equivalent + annual total)
- If within 48h trial window: show discounted price with crossed-out full price
- If trial window expired: show full price only
- CTA button → Stripe Checkout

**Trial discount countdown:**
- If `trial_completed_at` exists and is within 48h: show countdown timer "Discount expires in X hours Y minutes"
- Visual urgency without being pushy

### `/settings` — Subscription management (updated)

**New section: "Your Plan"**
- Current plan name + billing interval
- Next renewal date
- Minutes remaining this period (progress bar)
- Usage breakdown (booked / refunded / remaining)
- Buttons:
  - "Change Plan" → Stripe Customer Portal (handles upgrades/downgrades with proration)
  - "Cancel Subscription" → Stripe Customer Portal (sets cancel_at_period_end)
- If cancelled: show "Your plan ends on [date]" with option to resubscribe

### `/dashboard` — Booking calendar (updated)

- Show remaining minutes badge near the booking calendar
- If no subscription → show banner "Subscribe to start booking lessons" with link to /plans
- If insufficient minutes for selected slot → disable confirm button with tooltip "Not enough minutes remaining"

### Landing page — Plan CTA card

- Add a pricing section or card on the landing page
- "Choose your plan" with brief plan comparison
- CTA button → /plans (or auth modal → /plans if not logged in)

---

## 7. Trial System

### Flow

```
1. New user signs up
2. Dashboard shows: "Book your free 15-minute trial lesson"
3. User books 15-min lesson (no subscription required — trial is free)
4. After lesson is completed (status → 'completed'):
   - SET profiles.trial_booking_id = booking.id
   - SET profiles.trial_completed_at = NOW()
5. User sees /plans page with discounted pricing + 48h countdown
6. If they subscribe within 48h → trial-tier Stripe prices
7. If they subscribe after 48h → full-tier Stripe prices
```

### How we determine which price to show

```typescript
function getPriceTier(profile: Profile): 'trial' | 'full' {
  if (!profile.trial_completed_at) return 'full'  // never did trial
  const hoursSinceTrial = (Date.now() - new Date(profile.trial_completed_at).getTime()) / (1000 * 60 * 60)
  return hoursSinceTrial <= 48 ? 'trial' : 'full'
}
```

The price tier is locked in at checkout time. Once subscribed at the trial rate, they keep that rate for life (or until they cancel and resubscribe).

---

## 8. Existing User Migration (4 students)

> **Timing:** Do this once all 4 existing users have signed up on the new site.

These users already have active recurring Stripe subscriptions (mix of plans). We link their existing subscriptions rather than creating new ones:

1. **Match each user's Supabase profile to their Stripe customer** — search Stripe Dashboard by email to get `stripe_customer_id` and `stripe_subscription_id`
2. **Pull subscription details from Stripe** — plan type (light/standard), billing interval (monthly/yearly), current period start/end dates, and status
3. **Insert subscription records** linking Supabase `user_id` to existing Stripe data:

```sql
INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, billing_interval, price_tier, status, minutes_per_month, current_period_start, current_period_end)
VALUES
  -- Replace with actual UUIDs, Stripe IDs, and dates from each user's subscription
  ('supabase-uuid-1', 'cus_xxx', 'sub_xxx', 'light', 'monthly', 'trial', 'active', 120, '2026-03-01', '2026-04-01'),
  ('supabase-uuid-2', 'cus_xxx', 'sub_xxx', 'standard', 'yearly', 'trial', 'active', 240, '2026-01-15', '2027-01-15')
  -- etc for remaining users
;
```

4. **Webhook takes over from here** — once linked, Stripe webhook events (`invoice.paid`, `customer.subscription.updated`, etc.) will automatically keep period dates and status in sync going forward

Only 4 users, so this is a quick manual process via Stripe Dashboard + one SQL insert.

---

## 9. Admin Dashboard Additions

### Subscription overview (new section in Overview tab)

- Active subscribers count
- Monthly recurring revenue (MRR)
- Plan distribution (light vs standard)

### Student detail (update Students tab)

- Show subscription status, plan, remaining minutes
- Show minute usage history

---

## 10. Implementation Phases

### Phase A: Stripe foundation (do first)
1. `npm install stripe`
2. Create Stripe products + prices (8 price objects)
3. Add database tables (subscriptions, minute_usage, profile columns)
4. Build `/api/stripe/checkout` — creates Checkout session
5. Build `/api/stripe/webhook` — handles subscription lifecycle events
6. Build `/api/stripe/portal` — creates Customer Portal session
7. Build `/api/subscription` — returns subscription + remaining minutes

### Phase B: Payment page + settings
1. Build `/plans` page — plan cards, monthly/yearly toggle, trial countdown
2. Update `/settings` — add "Your Plan" section with usage bar + manage buttons
3. Add redirect logic: dashboard → /plans if no subscription

### Phase C: Booking integration
1. Update `/api/calendar/book` — check minute balance before confirming
2. Update `/api/calendar/cancel` — refund minutes if ≥15 min before lesson
3. Update dashboard UI — show remaining minutes, disable booking when insufficient
4. Handle rescheduling minute accounting

### Phase D: Trial system
1. Add trial_completed_at tracking to profiles
2. Allow one free 15-min booking without subscription
3. Implement 48h discount window logic in checkout route
4. Show countdown timer on /plans page

### Phase E: Landing page + admin + migration
1. Add pricing section to landing page
2. Update admin dashboard with subscription data
3. Manually migrate existing 4 users in Stripe + DB

---

## 11. Key Files to Create/Modify

### New files
```
src/app/plans/page.tsx              — Payment/plans page
src/app/api/stripe/checkout/route.ts — Create Checkout sessions
src/app/api/stripe/webhook/route.ts  — Stripe webhook handler
src/app/api/stripe/portal/route.ts   — Customer Portal sessions
src/app/api/subscription/route.ts    — Get subscription + balance
src/app/api/subscription/usage/route.ts — Usage breakdown
src/lib/stripe.ts                    — Stripe client + helper functions
src/lib/subscription.ts              — Minute calculation, trial window logic
supabase/add-subscriptions.sql       — Migration for new tables
```

### Modified files
```
src/app/api/calendar/book/route.ts   — Add minute balance check
src/app/api/calendar/cancel/route.ts — Add minute refund logic
src/app/dashboard/page.tsx           — Remaining minutes display, no-sub banner
src/app/settings/page.tsx            — "Your Plan" section
src/app/admin/page.tsx               — Subscription overview + student detail
src/app/page.tsx                     — Pricing CTA section
src/context/AuthContext.tsx           — Expose subscription state (optional)
src/lib/i18n.ts                      — New translations for plans/subscription UI
supabase/schema.sql                  — Add new tables to master schema
.env.local                           — Stripe keys
```

---

## 12. Security Considerations

- **Webhook signature verification**: Always verify `stripe-signature` header to prevent spoofed events
- **Server-side price selection**: Never trust the client for which price to charge — server determines trial/full tier
- **RLS on new tables**: Users can only read their own subscription/usage; all writes go through service role
- **Idempotent webhooks**: Handle duplicate webhook deliveries gracefully (check if subscription already exists before inserting)
- **No client-side minute calculation**: Always verify remaining minutes server-side in the booking route
