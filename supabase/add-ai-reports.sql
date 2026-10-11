-- AI lessons: problem reports from the classroom's flag button.
CREATE TABLE IF NOT EXISTS ai_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id  TEXT,
  reason      TEXT NOT NULL,           -- slide | audio | content | other
  note        TEXT,
  course_id   TEXT,
  lesson_id   TEXT,
  slide_id    TEXT,
  slide_no    INTEGER,
  recent      TEXT,                    -- the last minute or so of the conversation
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_reports_created_idx ON ai_reports (created_at DESC);
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY; -- server (service role) only
