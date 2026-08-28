-- ============================================================================
-- Vocab 101: Lesson 35 (A2): "Problems & complaints"  (Unit 12, Services and problems)
-- ----------------------------------------------------------------------------
-- Words (all new): broken, wrong, fix, return, problem, complain, refund, replace.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('problems', 'Problems and complaints', 'トラブルと苦情', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('broken', 'broken', NULL, NULL, NULL, 2, FALSE, NULL),
  ('wrong', 'wrong', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fix', 'fix', NULL, NULL, NULL, 2, FALSE, NULL),
  ('return', 'return', NULL, NULL, NULL, 2, FALSE, NULL),
  ('problem', 'problem', NULL, NULL, NULL, 2, FALSE, NULL),
  ('complain', 'complain', NULL, NULL, NULL, 2, FALSE, NULL),
  ('refund', 'refund', NULL, NULL, NULL, 2, FALSE, NULL),
  ('replace', 'replace', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='broken'), 'broken.adj.damaged', 1, TRUE, 'adjective', '壊れた', 'damaged and not working', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wrong'), 'wrong.adj.incorrect', 1, TRUE, 'adjective', '間違った', 'not correct or not right', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fix'), 'fix.v.repair', 1, TRUE, 'verb', '直す', 'to repair something that is broken', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='return'), 'return.v.giveback', 1, TRUE, 'verb', '返品する', 'to take or send something back', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='problem'), 'problem.n.issue', 1, TRUE, 'noun', '問題', 'something that is wrong and needs fixing', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='complain'), 'complain.v.protest', 1, TRUE, 'verb', '苦情を言う', 'to say you are not happy about something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='refund'), 'refund.n.money', 1, TRUE, 'noun', '返金', 'money given back to you', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='replace'), 'replace.v.swap', 1, TRUE, 'verb', '交換する', 'to put a new thing in place of another', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('broken','wrong','fix','return','problem','complain','refund','replace')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='problems'
WHERE s.slug IN ('broken.adj.damaged','wrong.adj.incorrect','fix.v.repair','return.v.giveback','problem.n.issue','complain.v.protest','refund.n.money','replace.v.swap')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-35', 12, 2, (SELECT id FROM vocab_categories WHERE slug='problems'), 'Problems & complaints', 'トラブルと苦情', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-35'), s.id, x.ord
FROM (VALUES
  ('broken.adj.damaged',0),('wrong.adj.incorrect',1),('fix.v.repair',2),('return.v.giveback',3),('problem.n.issue',4),('complain.v.protest',5),('refund.n.money',6),('replace.v.swap',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-35'), 'travel', 0, 'A faulty item', '不良品', 'shop', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-35'), 'conversation', 1, 'Tech trouble', '機械トラブル', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-35'), 'business', 2, 'Handling a complaint', '苦情対応', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 0, 'npc', 'Hi, how can I help?', 'こんにちは、どうされましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 1, 'user', 'This phone is {broken}.', 'この電話、壊れてます。', 'broken', (SELECT id FROM vocab_senses WHERE slug='broken.adj.damaged'), ARRAY['cheap','quiet','fresh','broken']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 2, 'npc', 'Oh no. Would you like to {return} it for a refund?', 'あらら。返品して返金されますか？', 'return', (SELECT id FROM vocab_senses WHERE slug='return.v.giveback'), ARRAY['return','open','keep','send']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 3, 'user', 'Yes. Can I get a {refund}?', 'はい。返金してもらえますか？', 'refund', (SELECT id FROM vocab_senses WHERE slug='refund.n.money'), ARRAY['refund','receipt','ticket','change']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 4, 'npc', 'Of course, or we can {replace} it with a new one.', 'もちろん、または新品と交換できます。', 'replace', (SELECT id FROM vocab_senses WHERE slug='replace.v.swap'), ARRAY['return','lose','break','replace']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 5, 'user', 'A new one would be great.', '新品がいいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 6, 'npc', 'Right away.', 'すぐに。', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 0, 'npc', 'Why are you frowning at your laptop?', 'なんでパソコンにしかめ面？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 1, 'user', 'The screen is {broken}.', '画面が壊れてる。', 'broken', (SELECT id FROM vocab_senses WHERE slug='broken.adj.damaged'), ARRAY['fresh','clean','broken','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 2, 'npc', 'Is the charger {wrong} too?', '充電器も違うやつ？', 'wrong', (SELECT id FROM vocab_senses WHERE slug='wrong.adj.incorrect'), ARRAY['free','wrong','easy','right']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 3, 'user', 'Maybe. Can you {fix} it?', 'かも。直せる？', 'fix', (SELECT id FROM vocab_senses WHERE slug='fix.v.repair'), ARRAY['fix','break','lose','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 4, 'npc', 'Let me see the {problem}.', '問題を見せて。', 'problem', (SELECT id FROM vocab_senses WHERE slug='problem.n.issue'), ARRAY['answer','plan','problem','view']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 5, 'user', 'Thanks, you''re a lifesaver.', 'ありがとう、助かる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 6, 'npc', 'Let''s take a look.', '見てみよう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 0, 'npc', 'A customer just called, upset.', 'お客様から怒りの電話が。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 1, 'user', 'What''s the {problem}?', '何が問題？', 'problem', (SELECT id FROM vocab_senses WHERE slug='problem.n.issue'), ARRAY['plan','answer','view','problem']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 2, 'npc', 'Their order was {wrong}.', '注文が間違ってた。', 'wrong', (SELECT id FROM vocab_senses WHERE slug='wrong.adj.incorrect'), ARRAY['right','easy','wrong','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 3, 'user', 'Did they {complain} in writing?', '書面で苦情が来た？', 'complain', (SELECT id FROM vocab_senses WHERE slug='complain.v.protest'), ARRAY['relax','complain','laugh','agree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 4, 'npc', 'Yes. Can we {fix} it today?', 'うん。今日中に直せる？', 'fix', (SELECT id FROM vocab_senses WHERE slug='fix.v.repair'), ARRAY['fix','lose','break','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 5, 'user', 'I''ll call them now.', '今すぐ電話する。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 6, 'npc', 'Thank you.', 'ありがとう。', NULL, NULL, NULL);
