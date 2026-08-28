-- ============================================================================
-- Reset ONE user's review cycle for testing (word bank + phrase bank).
--
-- Makes every card due now and clears its schedule so you can run a fresh review
-- session from scratch — FSRS state back to `new` for the kept vocab-course
-- words, and the legacy SM-2 fields reset for lesson phrases. Scoped to a single
-- user; does not touch anyone else's progress.
--
-- Change the UUID (appears 3x below) if you ever want to reset a different account.
-- ============================================================================

UPDATE vocabulary_cards SET
  -- due immediately
  next_review_at = NOW(),
  last_reviewed  = NULL,
  review_count   = 0,
  comfort_level  = 'learning',
  -- FSRS state (word-bank cards)
  state          = 'new',
  stability      = NULL,
  difficulty     = NULL,
  scheduled_days = 0,
  reps           = 0,
  lapses         = 0,
  -- legacy SM-2 fields (phrase-bank cards)
  interval_days  = 1,
  ease_factor    = 2.5
WHERE user_id = '3c729db9-c04c-4a6f-ba27-102e24962118';

-- Clear this user's review history so the test starts clean (analytics table).
DELETE FROM vocab_review_history
WHERE user_id = '3c729db9-c04c-4a6f-ba27-102e24962118';

-- Confirm what got reset.
SELECT
  count(*)                                         AS total_cards,
  count(*) FILTER (WHERE vocab_sense_id IS NOT NULL) AS word_bank_cards,
  count(*) FILTER (WHERE phrase_id      IS NOT NULL) AS phrase_bank_cards
FROM vocabulary_cards
WHERE user_id = '3c729db9-c04c-4a6f-ba27-102e24962118';
