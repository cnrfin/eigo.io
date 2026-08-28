-- ════════════════════════════════════════════════════════════════════════════
-- Challenge Mode — Phase 0 schema (curated sets)
-- See eigo-ios/docs/CHALLENGE-MODE-SPEC.md.
--
-- This migration adds the *content* tables only: the curated, CEFR-graded sets
-- players compete over. The per-challenge tables (challenges, challenge_attempts)
-- come in Phase 2 when sharing/results are built.
--
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Curated sets, grouped by CEFR band ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_sets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  cefr_level  TEXT NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1')),
  title_en    TEXT NOT NULL,
  title_ja    TEXT NOT NULL,
  emoji       TEXT,
  order_index INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Fixed word list per set (membership is fixed; order may shuffle at runtime)
CREATE TABLE IF NOT EXISTS challenge_set_items (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id         UUID NOT NULL REFERENCES challenge_sets(id) ON DELETE CASCADE,
  vocab_sense_id UUID NOT NULL REFERENCES vocab_senses(id) ON DELETE CASCADE,
  position       INT NOT NULL DEFAULT 0,
  UNIQUE (set_id, vocab_sense_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_sets_active     ON challenge_sets(active, cefr_level, order_index);
CREATE INDEX IF NOT EXISTS idx_challenge_set_items_set   ON challenge_set_items(set_id);
CREATE INDEX IF NOT EXISTS idx_challenge_set_items_sense ON challenge_set_items(vocab_sense_id);

-- ── RLS — curated content is readable by any signed-in user (mirrors vocab_*) ─
ALTER TABLE challenge_sets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_set_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_sets read"      ON challenge_sets;
DROP POLICY IF EXISTS "challenge_set_items read" ON challenge_set_items;

CREATE POLICY "challenge_sets read"      ON challenge_sets      FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "challenge_set_items read" ON challenge_set_items FOR SELECT TO authenticated USING (true);
-- Writes are admin/seed-only (service role bypasses RLS); no INSERT/UPDATE policy for users.
