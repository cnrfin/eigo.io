-- AI tutor (GPT-Live voice lessons in the classroom). See ai-tutor-implementation-plan.md.
-- Safe to re-run.

-- 1. Bookings: human (Connor, Whereby) or AI lesson, and the plan minutes charged.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lesson_kind TEXT NOT NULL DEFAULT 'human';
DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_lesson_kind_check CHECK (lesson_kind IN ('human', 'ai'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ai_minutes_charged INTEGER;

-- 2. Pilot flag (opt-in, like classroom_enabled).
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. One row per GPT-Live session (a reconnect makes a new one). Service role only.
CREATE TABLE IF NOT EXISTS ai_sessions (
  session_id   TEXT PRIMARY KEY,                       -- OpenAI Live session id (opaque)
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voice        TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at      TIMESTAMPTZ NOT NULL,                   -- booked end: the sweep hangs up after this
  ended_at     TIMESTAMPTZ,
  duration_s   INTEGER,
  end_reason   TEXT,                                   -- close_requested / expired / swept / replaced / ...
  flags        JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ai_sessions_open_idx ON ai_sessions (ends_at) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS ai_sessions_booking_idx ON ai_sessions (booking_id);
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;

-- 4. "My AI tutor" settings. The student reads and writes their own row.
CREATE TABLE IF NOT EXISTS ai_tutor_profiles (
  user_id     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ai_tutor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own ai tutor profile read" ON ai_tutor_profiles;
CREATE POLICY "own ai tutor profile read" ON ai_tutor_profiles FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own ai tutor profile insert" ON ai_tutor_profiles;
CREATE POLICY "own ai tutor profile insert" ON ai_tutor_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own ai tutor profile update" ON ai_tutor_profiles;
CREATE POLICY "own ai tutor profile update" ON ai_tutor_profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
