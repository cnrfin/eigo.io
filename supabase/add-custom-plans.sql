-- Custom plans: a plan made for one student (any recurring Stripe price, any
-- number of minutes per payment), paid through an eigo.io/pay/<token> link.

-- 1. Subscriptions can be a custom plan. Minutes still live in
--    minutes_per_month, which already means "minutes per billing period".
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('light', 'standard', 'test', 'ai', 'custom'));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_interval_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_interval_check
  CHECK (billing_interval IN ('monthly', 'yearly', 'custom'));

-- 2. One row per payment link the admin creates.
CREATE TABLE IF NOT EXISTS custom_plan_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,                      -- the eigo.io/pay/<token> part
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_price_id TEXT NOT NULL,
  price_jpy INTEGER NOT NULL,                      -- the price before any sale discount
  interval_unit TEXT NOT NULL CHECK (interval_unit IN ('day', 'week', 'month', 'year')),
  interval_count INTEGER NOT NULL CHECK (interval_count > 0),
  minutes_per_period INTEGER NOT NULL CHECK (minutes_per_period > 0),
  apply_sale BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_custom_plan_offers_user ON custom_plan_offers(user_id);

-- Only the API routes (service role) read or write offers; no client policies.
ALTER TABLE custom_plan_offers ENABLE ROW LEVEL SECURITY;
