-- ============================================================================
-- Memory triage decisions — the evidence for evidence-based level progression.
--
-- Every "I know this" / "Add to vocab" choice during a photo's triage is logged
-- with the level it was made at. When the learner's recent ~30 decisions AT
-- THEIR CURRENT LEVEL are ≥85% "known", the app suggests moving up a level
-- (a proportion-over-a-reliable-sample rule, per the vocabulary-levels-test
-- literature). Tagging each row with its level means a level-up resets the
-- evidence automatically — the next jump needs a fresh ~30 at the new level.
--
-- Idempotent; safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS memory_triage_decisions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term       TEXT NOT NULL,
  level      TEXT NOT NULL,               -- learner's CEFR level when they decided
  known      BOOLEAN NOT NULL,            -- true = "I know this", false = "Add to vocab"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE memory_triage_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own triage decisions" ON memory_triage_decisions;
CREATE POLICY "own triage decisions" ON memory_triage_decisions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_triage_user_level_time
  ON memory_triage_decisions(user_id, level, created_at DESC);
