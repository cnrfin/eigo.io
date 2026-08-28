-- ════════════════════════════════════════════════════════════════════════════
-- Challenge Mode — seed CEFR-graded sets, one per (course level × CEFR band).
--
-- Model (agreed): a challenge = one course *level/theme* at one CEFR band.
--   • Band is each lesson's modal vocab_senses.cefr (101=A1/A2, 102=B1/B2, 103=C1).
--   • For each (band, level_index) we take that level's first 2 lessons (by order)
--     and combine their words → ~16-word sets, uniform and fair.
--   • Reviews (-review slugs) excluded. All complete content included.
--
-- ⚠️ READ-ONLY on the vocab course: this writes ONLY to challenge_* tables and
--    never modifies vocab_lessons / vocab_senses / vocab_lesson_items. Taking the
--    "first 2 lessons" also sidesteps the A1 Level-1 mis-level quirk without any
--    course edit. Fully re-runnable.
-- ════════════════════════════════════════════════════════════════════════════

-- Per-lesson band (modal CEFR of its words), non-review course lessons only.
WITH lesson_band AS (
  SELECT l.id AS lesson_id, l.slug, l.title_en, l.title_ja, l.level_index, l.order_index,
         mode() WITHIN GROUP (ORDER BY s.cefr) AS band
  FROM vocab_lessons l
  JOIN vocab_lesson_items li ON li.lesson_id = l.id
  JOIN vocab_senses s ON s.id = li.sense_id
  WHERE l.slug LIKE 'vocab-1%'
    AND l.slug NOT LIKE '%-review'
    AND s.cefr IS NOT NULL
  GROUP BY l.id, l.slug, l.title_en, l.title_ja, l.level_index, l.order_index
),
-- First 2 lessons of each (band, level).
picked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY band, level_index ORDER BY order_index, slug) AS rn
  FROM lesson_band
),
sets AS (
  SELECT band, level_index,
         'chal-' || band || '-l' || level_index AS slug,
         string_agg(title_en, ' · ' ORDER BY rn) AS title_en,
         string_agg(title_ja, ' · ' ORDER BY rn) AS title_ja
  FROM picked WHERE rn <= 2
  GROUP BY band, level_index
)
-- 1) Upsert the sets.
INSERT INTO challenge_sets (slug, cefr_level, title_en, title_ja, emoji, order_index)
SELECT s.slug, s.band, s.title_en, s.title_ja,
       CASE s.band
         WHEN 'A1' THEN '🌱' WHEN 'A2' THEN '🌿'
         WHEN 'B1' THEN '⚡' WHEN 'B2' THEN '🔥'
         WHEN 'C1' THEN '🚀' ELSE '🎯'
       END,
       s.level_index
FROM sets s
ON CONFLICT (slug) DO UPDATE SET
  cefr_level = EXCLUDED.cefr_level,
  title_en   = EXCLUDED.title_en,
  title_ja   = EXCLUDED.title_ja,
  emoji      = EXCLUDED.emoji,
  order_index = EXCLUDED.order_index;

-- 2) Rebuild the word lists (clean re-run: clear then re-insert).
DELETE FROM challenge_set_items
WHERE set_id IN (SELECT id FROM challenge_sets WHERE slug LIKE 'chal-%');

WITH lesson_band AS (
  SELECT l.id AS lesson_id, l.slug, l.level_index, l.order_index,
         mode() WITHIN GROUP (ORDER BY s.cefr) AS band
  FROM vocab_lessons l
  JOIN vocab_lesson_items li ON li.lesson_id = l.id
  JOIN vocab_senses s ON s.id = li.sense_id
  WHERE l.slug LIKE 'vocab-1%'
    AND l.slug NOT LIKE '%-review'
    AND s.cefr IS NOT NULL
  GROUP BY l.id, l.slug, l.level_index, l.order_index
),
picked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY band, level_index ORDER BY order_index, slug) AS rn
  FROM lesson_band
),
set_lessons AS (
  SELECT 'chal-' || band || '-l' || level_index AS set_slug, lesson_id, rn
  FROM picked WHERE rn <= 2
)
INSERT INTO challenge_set_items (set_id, vocab_sense_id, position)
SELECT cs.id,
       li.sense_id,
       ROW_NUMBER() OVER (PARTITION BY cs.id ORDER BY sl.rn, li.order_index) - 1
FROM set_lessons sl
JOIN challenge_sets cs ON cs.slug = sl.set_slug
JOIN vocab_lesson_items li ON li.lesson_id = sl.lesson_id
ON CONFLICT (set_id, vocab_sense_id) DO NOTHING;   -- dedupe if a sense repeats across the 2 lessons

-- Sanity check (run manually):
--   SELECT cs.cefr_level, cs.order_index AS level, cs.title_en, count(csi.*) AS words
--   FROM challenge_sets cs LEFT JOIN challenge_set_items csi ON csi.set_id = cs.id
--   GROUP BY cs.id ORDER BY cs.cefr_level, cs.order_index;
