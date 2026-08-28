-- ════════════════════════════════════════════════════════════════════════════
-- Challenge Mode — Phase 2: shareable challenges + attempts (the social layer).
-- See eigo-ios/docs/CHALLENGE-MODE-SPEC.md §5.
--
-- A "challenge" is one creator's locked run over a challenge_set. Others open the
-- share link, play the SAME set, and their FIRST attempt is compared. Only numbers
-- (scores) + a display-name snapshot travel between users → no UGC surface.
--
-- Display names are snapshotted onto the rows so the leaderboard never needs to
-- read other users' profiles. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS challenges (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,   -- also the share token
  set_id             UUID NOT NULL REFERENCES challenge_sets(id) ON DELETE CASCADE,
  creator_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name       TEXT,                    -- display-name snapshot
  creator_score      INT NOT NULL,
  creator_best_combo INT NOT NULL DEFAULT 0,
  total_ms           INT NOT NULL DEFAULT 0,   -- creator's total response time (tiebreaker)
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_attempts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id  UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name     TEXT,                          -- display-name snapshot
  score         INT NOT NULL,
  best_combo    INT NOT NULL DEFAULT 0,
  total_ms      INT NOT NULL DEFAULT 0,        -- total response time (tiebreaker)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (challenge_id, user_id)               -- first-attempt-counts (insert-once)
);

CREATE INDEX IF NOT EXISTS idx_challenges_creator        ON challenges(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_chal   ON challenge_attempts(challenge_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Read: any signed-in user (the challenge id is an unguessable share token, and
-- scores/names aren't sensitive — this is the "anyone with the link sees the
-- board" model). Write: only your own creator row / your own attempt.
ALTER TABLE challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenges read"          ON challenges;
DROP POLICY IF EXISTS "challenges insert own"    ON challenges;
DROP POLICY IF EXISTS "attempts read"            ON challenge_attempts;
DROP POLICY IF EXISTS "attempts insert own"      ON challenge_attempts;

CREATE POLICY "challenges read"       ON challenges          FOR SELECT TO authenticated USING (true);
CREATE POLICY "challenges insert own" ON challenges          FOR INSERT TO authenticated WITH CHECK (creator_user_id = auth.uid());
CREATE POLICY "attempts read"         ON challenge_attempts  FOR SELECT TO authenticated USING (true);
CREATE POLICY "attempts insert own"   ON challenge_attempts  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- No UPDATE/DELETE policies: rows are immutable; the UNIQUE constraint keeps the first attempt.
