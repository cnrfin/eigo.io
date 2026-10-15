-- AI classroom: panel, cards and word list (ai-panel-implementation-plan.md, section 3.4).
-- Safe to run more than once.

-- 1. Phrases the AI tutor saves for the student (corrections, "How do I say…?") get their own source,
--    so the word list can label them with the AI tutor's name. Keyed (user, 'tutor', 'tutor:<hash>').
ALTER TABLE vocabulary_phrases DROP CONSTRAINT IF EXISTS vocabulary_phrases_source_check;
ALTER TABLE vocabulary_phrases ADD CONSTRAINT vocabulary_phrases_source_check
  CHECK (source IN ('lesson', 'course', 'lookup', 'chat', 'tutor'));

-- 2. (phase 5) End-of-call stats for AI lessons: { speakingSec, totalSec, longestSec, saved }
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ai_stats JSONB;
