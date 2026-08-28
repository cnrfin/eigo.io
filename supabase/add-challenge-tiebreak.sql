-- ════════════════════════════════════════════════════════════════════════════
-- Challenge Mode — leaderboard tiebreaker: total response time.
-- Equal scores are ranked by who was faster overall (lower total_ms wins), so a
-- board never ends in an exact dead heat. See CHALLENGE-MODE-SPEC.md.
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE challenges         ADD COLUMN IF NOT EXISTS total_ms INT NOT NULL DEFAULT 0;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS total_ms INT NOT NULL DEFAULT 0;
