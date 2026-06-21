-- ============================================================
--  Per-user feature permissions
-- ============================================================
--  Lets an admin grant or revoke individual features per user, on top of the
--  normal subscription/free gating — so a custom (e.g. discounted) plan can omit
--  features. A MISSING row means "everything allowed": existing users are
--  unaffected, and a feature is only ever restricted when a row sets it false.
--
--    courses_enabled        — can open course lessons (Pronunciation 101 etc.)
--    tests_enabled          — can start practice tests / exams
--    recordings_enabled     — lessons they book are cloud-recorded & playable
--    transcription_enabled  — lesson transcripts can be generated/viewed
--
--  Service-role only (RLS on, no policies) — same pattern as the other
--  admin-managed tables; all reads/writes go through service-role API routes.
--  Run once in the SQL editor. Idempotent.

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id               UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  courses_enabled       BOOLEAN NOT NULL DEFAULT true,
  tests_enabled         BOOLEAN NOT NULL DEFAULT true,
  recordings_enabled    BOOLEAN NOT NULL DEFAULT true,
  transcription_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            TEXT
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- To restrict a user (example — turn off courses + tests, keep lessons/recordings):
--   INSERT INTO user_permissions (user_id, courses_enabled, tests_enabled)
--   VALUES ('<user-id>', false, false)
--   ON CONFLICT (user_id) DO UPDATE
--     SET courses_enabled = EXCLUDED.courses_enabled,
--         tests_enabled   = EXCLUDED.tests_enabled,
--         updated_at      = NOW();
