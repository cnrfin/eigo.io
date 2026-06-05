-- ============================================================
--  Practice tests: review mode + async grading support
-- ============================================================
--  review_mode       — whether the student chose AI or human grading for a
--                      submitted attempt (only relevant when the test has
--                      AI-graded writing/speaking questions).
--  grading_started_at — claim timestamp so the background grader (and cron
--                      backstop) don't double-process the same attempt.
--
--  AI-review attempts are scored asynchronously (the student can leave and come
--  back); the /api/cron/grade-attempts worker finalizes them. Idempotent.
-- ============================================================

ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS review_mode TEXT
  CHECK (review_mode IN ('ai', 'human'));
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS grading_started_at TIMESTAMPTZ;

-- Fast lookup for the background grader: attempts awaiting AI grading.
CREATE INDEX IF NOT EXISTS idx_test_attempts_pending_ai
  ON test_attempts (status, review_mode)
  WHERE status = 'submitted' AND review_mode = 'ai';
