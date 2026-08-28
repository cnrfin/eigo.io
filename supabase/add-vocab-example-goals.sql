-- ============================================================================
-- Vocab 101 — goal categories on example sentences
-- ----------------------------------------------------------------------------
-- Each sense carries 3 examples, one per goal (business / travel / conversation).
-- The learner selects 2 of the 3 goals; the lesson randomizes examples between
-- their 2, leaving the third out. Run before re-seeding seed-vocab-101-pilot.sql.
-- ============================================================================

ALTER TABLE vocab_examples ADD COLUMN IF NOT EXISTS goal TEXT
  CHECK (goal IS NULL OR goal IN ('business', 'travel', 'conversation'));

CREATE INDEX IF NOT EXISTS idx_vocab_examples_goal ON vocab_examples(sense_id, goal);
