-- Migration: Add Apple IAP support to subscriptions table
-- Run this in the Supabase SQL editor

-- 1. Allow subscriptions without Stripe (Apple IAP only)
ALTER TABLE subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;

-- 2. Add Apple-specific columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS apple_product_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'stripe'
  CHECK (payment_source IN ('stripe', 'apple'));

-- 3. Index for Apple transaction lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_apple
  ON subscriptions(apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;
