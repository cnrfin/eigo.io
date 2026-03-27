-- =============================================================
-- MIGRATE EXISTING STUDENT — run after they sign up via Google
-- =============================================================
-- Replace ALL placeholder values below before running.
--
-- Find these values:
--   STUDENT_EMAIL       → their Google login email
--   STRIPE_CUSTOMER_ID  → Stripe dashboard → customer (starts with cus_)
--   STRIPE_SUB_ID       → Stripe dashboard → subscription (starts with sub_)
--   PLAN                → 'light' (120 min/month) or 'standard' (240 min/month)
--   BILLING_INTERVAL    → 'monthly' or 'yearly'
--   MINUTES             → 120 for light, 240 for standard
--   PERIOD_START        → current billing period start (from Stripe subscription)
--   PERIOD_END          → current billing period end (from Stripe subscription)
-- =============================================================

INSERT INTO subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  plan,
  billing_interval,
  price_tier,
  status,
  minutes_per_month,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
SELECT
  p.id,
  'STRIPE_CUSTOMER_ID',       -- e.g. 'cus_xxxxx'
  'STRIPE_SUB_ID',            -- e.g. 'sub_1M8LqaD2oUrwKH38JrvdRzLr'
  'PLAN',                     -- 'light' or 'standard'
  'BILLING_INTERVAL',         -- 'monthly' or 'yearly'
  'full',
  'active',
  MINUTES,                    -- 120 or 240
  'PERIOD_START',             -- e.g. '2026-03-15T00:00:00+09:00'
  'PERIOD_END',               -- e.g. '2026-04-15T00:00:00+09:00'
  false
FROM profiles p
WHERE p.email = 'STUDENT_EMAIL';

-- =============================================================
-- STUDENTS TO MIGRATE:
-- =============================================================
-- Miwa Kanto   | sub_1M8LqaD2oUrwKH38JrvdRzLr
-- Kie Kubota   | sub_1QJOaCD2oUrwKH38n00P7bhW
-- Maho Okubo   | sub_1L6LFfD2oUrwKH38euoR2Fn4
-- =============================================================
