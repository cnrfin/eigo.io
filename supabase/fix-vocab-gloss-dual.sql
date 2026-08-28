-- ════════════════════════════════════════════════════════════════════════════
-- Fix dual-term vocab glosses: keep the primary term, drop the slash-alternative.
-- Example: the "hello" gloss becomes just the first word instead of two.
--
-- A single clean gloss reads faster (esp. in Word Rush). We keep the FIRST term
-- (the primary, as authored) up to the fullwidth slash U+FF0F.
--
-- Targets the gloss_ja COLUMN only — nuance_note_ja legitimately uses the slash
-- inside confusable explanations and is left untouched.
-- Idempotent: after running, no gloss contains the slash, so re-runs are no-ops.
-- ════════════════════════════════════════════════════════════════════════════

UPDATE vocab_senses
SET gloss_ja = split_part(gloss_ja, chr(65295), 1)   -- chr(65295) = ／ (U+FF0F)
WHERE gloss_ja LIKE '%' || chr(65295) || '%';

-- Sanity check (expect 0):
--   SELECT count(*) FROM vocab_senses WHERE gloss_ja LIKE '%' || chr(65295) || '%';
