-- ============================================================
--  Pronunciation attempts (pronunciation course grading history)
-- ============================================================
--  One row per graded speak/challenge attempt. Used to compute a per-lesson
--  pronunciation score (average of the best attempt per item) shown under the
--  lesson on the course map. Service-role only — all writes/reads go through
--  /api/courses/* (the grading route inserts; /api/courses aggregates).
--  Run once in the SQL editor. Idempotent.

CREATE TABLE IF NOT EXISTS pronunciation_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id      UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  screen_id      UUID REFERENCES lesson_screens(id) ON DELETE SET NULL,
  item_key       TEXT NOT NULL,            -- stable id for the graded item (reference text)
  reference_text TEXT NOT NULL,
  target_label   TEXT,
  score          INTEGER NOT NULL,         -- the basis we graded on (target phoneme or sentence composite)
  overall        INTEGER,                  -- Azure overall PronScore, for reference
  verdict        TEXT,                     -- great | good | retry
  accent         TEXT,                     -- en-GB | en-US
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pronunciation_attempts ENABLE ROW LEVEL SECURITY;
-- (no policies: anon/authenticated cannot read or write; the API uses service role)

-- Per-user-per-lesson lookups, newest first (drives the lesson score).
CREATE INDEX IF NOT EXISTS idx_pron_attempts_user_lesson
  ON pronunciation_attempts(user_id, lesson_id, created_at DESC);
