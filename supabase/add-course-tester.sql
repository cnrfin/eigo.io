-- ============================================================
--  Course tester access
-- ============================================================
--  course_tester — non-admin accounts with this flag can SEE unpublished
--  (draft) courses, exactly like admins do, but with NO entitlement bypass:
--  they hit the real paywall/attempt gating, making them ideal for testing
--  the free-user flows end to end before a course goes live.
--  Run once in the SQL editor. Idempotent.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course_tester BOOLEAN NOT NULL DEFAULT false;

-- To grant a tester account draft access:
--   UPDATE profiles SET course_tester = true WHERE id = '<user-id>';
