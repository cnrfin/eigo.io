-- AI plan + AI minute top-ups (ai-plan-implementation-plan.md, Phase 1).
-- Additive only: existing subscriptions, usage rows and bookings keep working unchanged.

-- 1. The AI plan, and AI minutes per billing period (AI plan: 150 monthly / 1,800 yearly; other plans 0)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check CHECK (plan IN ('light', 'standard', 'test', 'ai'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ai_minutes_per_month INT NOT NULL DEFAULT 0;

-- 2. Top-ups: AI minutes bought one-off, valid for 3 months
CREATE TABLE IF NOT EXISTS minute_topups (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  minutes                     INT NOT NULL CHECK (minutes > 0),
  source                      TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'admin')),
  stripe_checkout_session_id  TEXT UNIQUE,
  note                        TEXT,
  purchased_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at                  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS minute_topups_user_idx ON minute_topups (user_id, expires_at);
ALTER TABLE minute_topups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own topups" ON minute_topups;
CREATE POLICY "Users read own topups" ON minute_topups FOR SELECT USING (auth.uid() = user_id);

-- 3. Which pool a charge came from: 'plan' (teacher minutes, the default, so existing rows are unchanged),
--    'ai' (the AI plan's monthly AI minutes) or 'topup' (a top-up, see topup_id)
ALTER TABLE minute_usage ADD COLUMN IF NOT EXISTS pool TEXT NOT NULL DEFAULT 'plan';
ALTER TABLE minute_usage DROP CONSTRAINT IF EXISTS minute_usage_pool_check;
ALTER TABLE minute_usage ADD CONSTRAINT minute_usage_pool_check CHECK (pool IN ('plan', 'ai', 'topup'));
ALTER TABLE minute_usage ADD COLUMN IF NOT EXISTS topup_id UUID REFERENCES minute_topups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS minute_usage_topup_idx ON minute_usage (topup_id) WHERE topup_id IS NOT NULL;

-- 4. The free 5-minute AI call (once per account)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_trial_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
