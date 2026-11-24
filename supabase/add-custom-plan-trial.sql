-- Custom plan links: the 48-hour trial price (3-month plans, a 38% coupon).
-- A trial link applies STRIPE_TRIAL_COUPON_3MONTH, never the sale, and stops
-- working 48 hours after it's made. Existing links are unaffected (no trial, no expiry).

ALTER TABLE custom_plan_offers
  ADD COLUMN IF NOT EXISTS apply_trial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_percent NUMERIC,      -- the coupon's % when the link was made (for the admin list)
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;      -- null = no expiry
