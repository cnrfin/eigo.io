-- ============================================================================
-- Test attempts — add a resumable "awaiting_speaking" state.
-- ----------------------------------------------------------------------------
-- Lets a submitted/scored attempt be re-opened for the SPEAKING section only,
-- so a student can come back and record the audio they skipped without
-- re-taking (or re-grading) the rest of the test. See test-finalize.ts /
-- test-grade-attempt.ts (onlyMissing) for the grading side.
-- Safe to run once.
-- ============================================================================

ALTER TABLE test_attempts DROP CONSTRAINT IF EXISTS test_attempts_status_check;
ALTER TABLE test_attempts ADD CONSTRAINT test_attempts_status_check
  CHECK (status IN ('in_progress', 'submitted', 'scored', 'awaiting_speaking'));
