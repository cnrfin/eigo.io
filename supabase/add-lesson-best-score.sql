-- ============================================================
--  Lesson best score (pronunciation challenge result)
-- ============================================================
--  Stores the learner's best lesson run (the challenge's average score). Shown
--  under the lesson on the course map. Only ever moves up, set by
--  POST /api/courses/lessons/[id] on challenge completion.
--  Run once in the SQL editor. Idempotent.

ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS best_score INTEGER;
