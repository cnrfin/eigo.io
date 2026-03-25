-- Add spaced repetition fields to vocabulary_cards
-- Uses a simplified SM-2 algorithm for scheduling reviews

-- Interval in days until next review (starts at 1)
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS interval_days REAL NOT NULL DEFAULT 1;

-- Ease factor (multiplier for interval growth, starts at 2.5 per SM-2)
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS ease_factor REAL NOT NULL DEFAULT 2.5;

-- When this card is next due for review
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index for efficiently querying due cards
CREATE INDEX IF NOT EXISTS idx_vocabulary_cards_next_review ON vocabulary_cards(user_id, next_review_at);
