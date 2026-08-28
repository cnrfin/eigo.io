-- ============================================================================
-- FSRS scheduling for kept vocab-course cards.
--
-- Replaces the simplified SM-2 (interval_days / ease_factor) with FSRS-5 state
-- for `vocabulary_cards`. The old columns are kept (harmless) so nothing that
-- still reads them breaks; the app now writes/reads the FSRS columns below.
--
-- Reuses the existing `last_reviewed` column as the FSRS last-review timestamp.
-- Idempotent. Safe to re-run (backfill is guarded on stability IS NULL).
-- ============================================================================

-- ── FSRS card state ─────────────────────────────────────────────────────────
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'new'
  CHECK (state IN ('new', 'learning', 'review', 'relearning'));
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS stability REAL;        -- days; NULL for new
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS difficulty REAL;       -- 1..10; NULL for new
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS scheduled_days REAL NOT NULL DEFAULT 0;
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS reps INT NOT NULL DEFAULT 0;
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS lapses INT NOT NULL DEFAULT 0;

-- ── Backfill existing progress (one-time; guarded so re-runs never clobber) ──
-- A card that has been reviewed becomes a `review` card whose stability seeds
-- from its old interval (interval ≈ stability at the 0.9 retention target), and
-- a neutral difficulty. Untouched cards stay `new`. next_review_at is preserved,
-- so nobody's schedule jumps.
UPDATE vocabulary_cards SET
  state      = 'review',
  stability  = GREATEST(interval_days, 0.5),
  difficulty = 5.0,
  reps       = GREATEST(review_count, 1)
WHERE stability IS NULL AND COALESCE(review_count, 0) > 0;

-- ── Review history (analytics + future per-user FSRS weight optimization) ────
CREATE TABLE IF NOT EXISTS vocab_review_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id              UUID NOT NULL REFERENCES vocabulary_cards(id) ON DELETE CASCADE,
  grade                INT  NOT NULL,                -- 1..4
  previous_state       TEXT,
  new_state            TEXT,
  previous_stability   REAL,
  new_stability        REAL,
  previous_difficulty  REAL,
  new_difficulty       REAL,
  retrievability       REAL,                         -- predicted recall at review time
  response_time_ms     INT,
  reviewed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vocab_review_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own vocab review history" ON vocab_review_history;
CREATE POLICY "own vocab review history" ON vocab_review_history
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_vrh_user_card ON vocab_review_history(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_vrh_card_time ON vocab_review_history(card_id, reviewed_at);
