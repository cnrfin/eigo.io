-- ============================================================
--  Exam Pass (模試パス): allow plan = 'test' on subscriptions
-- ============================================================
--  ¥2,000/month, tests only (minutes_per_month = 0). Run once in the
--  Supabase SQL editor before the paywall deploy goes live.

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('light', 'standard', 'test'));
