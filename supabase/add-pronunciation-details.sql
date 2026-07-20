-- ============================================================
--  Pronunciation attempt details (funnel only)
-- ============================================================
--  Anonymous (free-funnel) pronunciation attempts also store the full grade
--  breakdown + the node render info, so the post-sign-up results screen can
--  show the SAME information as the in-lesson challenge summary (model audio,
--  per-sound/word feedback, syllable + IPA strips, coaching). Regular accounts
--  store nothing here — they see the breakdown live in the lesson. Pruned with
--  the rest of the row by the abandoned-anon cleanup; the audio is pruned at
--  24h separately. Run once in the SQL editor. Idempotent.

ALTER TABLE pronunciation_attempts
  ADD COLUMN IF NOT EXISTS details JSONB;   -- { node: {...}, grade: {...} } for funnel attempts; NULL otherwise
