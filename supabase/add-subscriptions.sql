-- Migration: Add subscription and minute usage tables
-- Run this in the Supabase SQL editor

-- 1. Subscriptions table — links Supabase users to Stripe subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('light', 'standard')),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  price_tier TEXT NOT NULL CHECK (price_tier IN ('trial', 'full')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'incomplete')),
  minutes_per_month INTEGER NOT NULL,  -- 120 (light) or 240 (standard)
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Minute usage table — tracks minute debits/credits per billing period
CREATE TABLE IF NOT EXISTS minute_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  minutes_used INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('booked', 'cancelled_refund', 'no_show')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add trial tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_booking_id UUID REFERENCES bookings(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_completed_at TIMESTAMPTZ;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_minute_usage_user_period ON minute_usage(user_id, period_start);

-- 5. RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE minute_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own usage
CREATE POLICY "Users read own usage"
  ON minute_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for API routes + webhooks)
CREATE POLICY "Service role full access subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access minute_usage"
  ON minute_usage FOR ALL
  USING (auth.role() = 'service_role');
