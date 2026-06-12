-- ============================================================
--  Admin testing override
-- ============================================================
--  admin_simulate_free — when true on an ADMIN account, entitlement checks
--  treat the admin as a free (non-subscribed) user so gating, attempt
--  counting and upsell flows can be tested first-hand. Admin draft
--  visibility (unpublished courses/tests) is unaffected. Toggled from the
--  admin page's Testing tab. No effect on non-admin accounts.
--  Run once in the SQL editor. Idempotent.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_simulate_free BOOLEAN NOT NULL DEFAULT false;
