-- ============================================================================
-- vocab_match_items — a read-only VIEW that surfaces the antonym / synonym
-- links (from vocab_relations) as review-ready rows for the two "match" games:
--   * match a similar word   → relation_type IN ('synonym','near_synonym')
--   * match an opposite word  → relation_type = 'antonym'
--
-- One row per (studied sense, target). The target is either an in-corpus sense
-- (its headword + JA gloss come along for display / distractor building) or an
-- out-of-corpus word carried as plain text. The review engine can do:
--     SELECT * FROM vocab_match_items
--     WHERE sense_id = $wordInBank AND relation_type = 'antonym';
-- and get the correct answer word to show; wrong options are drawn at runtime
-- from same-pos / same-category senses.
--
-- Stays in sync with vocab_relations (seed-vocab-relations.sql). Idempotent.
-- ============================================================================

DROP VIEW IF EXISTS vocab_match_items;

CREATE VIEW vocab_match_items
  WITH (security_invoker = true) AS
SELECT
  r.from_sense_id                        AS sense_id,
  r.relation_type,
  COALESCE(tw.normalized, r.to_text)     AS target_word,     -- what to show
  ts.gloss_ja                            AS target_gloss_ja, -- NULL for out-of-corpus
  ts.pos                                 AS target_pos,      -- NULL for out-of-corpus
  r.to_sense_id                          AS target_sense_id, -- NULL for out-of-corpus
  r.note_ja
FROM vocab_relations r
LEFT JOIN vocab_senses ts ON ts.id      = r.to_sense_id
LEFT JOIN vocab_words  tw ON tw.id      = ts.word_id
WHERE r.relation_type IN ('synonym','near_synonym','antonym')
  AND COALESCE(tw.normalized, r.to_text) IS NOT NULL;

GRANT SELECT ON vocab_match_items TO anon, authenticated;
