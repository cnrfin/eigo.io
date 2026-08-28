-- ============================================================================
-- vocab_cloze_items — a read-only VIEW that surfaces the gap-fill material
-- already authored inside the scenes, re-keyed BY SENSE so the flashcard / SRS
-- review engine can pull it per word.
--
-- Every blanked scene line (`blank_sense_id` set) already carries a natural
-- sentence, the answer, 4 human-fool-proofed distractors, and a JA translation.
-- This view flattens those lines into one row per (sense, line) so review can do:
--     SELECT * FROM vocab_cloze_items WHERE sense_id = $wordInBank
-- and get ready-made gap-fill items. The same rows feed sentence-building
-- (use text_en as the target sentence). No data is duplicated — it stays in
-- sync as the scenes are edited.
--
-- text_en keeps the `{answer}` brace token, exactly as the scene player renders
-- it; the review UI reuses the same split-on-{...} + option-shuffle logic.
-- Idempotent. Safe to re-run.
-- ============================================================================

DROP VIEW IF EXISTS vocab_cloze_items;

CREATE VIEW vocab_cloze_items
  WITH (security_invoker = true) AS
SELECT
  sl.blank_sense_id AS sense_id,
  sl.id             AS line_id,
  sl.text_en,                        -- contains the {answer} token
  sl.text_ja,
  sl.blank_answer   AS cloze_answer,
  sl.options,                        -- 4 incl. answer (order irrelevant; UI shuffles)
  sc.goal,                           -- business | travel | conversation (context flavour)
  sc.lesson_id,
  l.slug            AS lesson_slug
FROM vocab_scene_lines sl
JOIN vocab_scenes  sc ON sc.id = sl.scene_id
JOIN vocab_lessons l  ON l.id  = sc.lesson_id
WHERE sl.blank_sense_id IS NOT NULL          -- blanked lines only (play lines excluded)
  AND sl.options IS NOT NULL
  AND array_length(sl.options, 1) = 4        -- well-formed cloze only
  AND l.published = TRUE;                    -- only live course content

GRANT SELECT ON vocab_cloze_items TO anon, authenticated;
