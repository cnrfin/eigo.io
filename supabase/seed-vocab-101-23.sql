-- ============================================================================
-- Vocab 101: Lesson 23 (A2): "Clothes & sizes"  (Unit 6, Shopping and money)
-- ----------------------------------------------------------------------------
-- Words (all new): wear, jacket, shoes, tight, loose, shirt, hat, fit.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('clothes', 'Clothes and sizes', '服とサイズ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('wear', 'wear', NULL, NULL, NULL, 2, FALSE, NULL),
  ('jacket', 'jacket', NULL, NULL, NULL, 2, FALSE, NULL),
  ('shoes', 'shoes', NULL, NULL, NULL, 2, FALSE, NULL),
  ('tight', 'tight', NULL, NULL, NULL, 2, FALSE, NULL),
  ('loose', 'loose', NULL, NULL, NULL, 2, FALSE, NULL),
  ('shirt', 'shirt', NULL, NULL, NULL, 2, FALSE, NULL),
  ('hat', 'hat', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fit', 'fit', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='wear'), 'wear.v.clothes', 1, TRUE, 'verb', '着る', 'to have clothes on your body', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='jacket'), 'jacket.n.clothes', 1, TRUE, 'noun', 'ジャケット', 'a short coat', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shoes'), 'shoes.n.clothes', 1, TRUE, 'noun', '靴', 'things you wear on your feet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tight'), 'tight.adj.fit', 1, TRUE, 'adjective', 'きつい', 'fitting too closely', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='loose'), 'loose.adj.fit', 1, TRUE, 'adjective', 'ゆるい', 'not tight; fitting freely', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shirt'), 'shirt.n.clothes', 1, TRUE, 'noun', 'シャツ', 'a top with a collar and sleeves', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hat'), 'hat.n.clothes', 1, TRUE, 'noun', '帽子', 'something you wear on your head', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fit'), 'fit.v.size', 1, TRUE, 'verb', '（サイズが）合う', 'to be the right size', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('wear','jacket','shoes','tight','loose','shirt','hat','fit')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), (SELECT id FROM vocab_senses WHERE slug='loose.adj.fit'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='loose.adj.fit'), (SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='clothes'
WHERE s.slug IN ('wear.v.clothes','jacket.n.clothes','shoes.n.clothes','tight.adj.fit','loose.adj.fit','shirt.n.clothes','hat.n.clothes','fit.v.size')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-23', 6, 2, (SELECT id FROM vocab_categories WHERE slug='clothes'), 'Clothes & sizes', '服とサイズ', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-23'), s.id, x.ord
FROM (VALUES
  ('wear.v.clothes',0),('jacket.n.clothes',1),('shoes.n.clothes',2),('tight.adj.fit',3),('loose.adj.fit',4),('shirt.n.clothes',5),('hat.n.clothes',6),('fit.v.size',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-23'), 'travel', 0, 'Trying clothes on', '試着', 'shop', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-23'), 'conversation', 1, 'What to wear', '何を着る', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-23'), 'business', 2, 'Dress code', '服装規定', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 0, 'npc', 'Can I help you find a size?', 'サイズをお探ししましょうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 1, 'user', 'Yes. Does this collared {shirt} come in medium?', 'はい。この襟付きシャツ、Mサイズある？', 'shirt', (SELECT id FROM vocab_senses WHERE slug='shirt.n.clothes'), ARRAY['jacket','shoes','hat','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 2, 'npc', 'Here. How does it {fit}?', 'どうぞ。サイズは合う？', 'fit', (SELECT id FROM vocab_senses WHERE slug='fit.v.size'), ARRAY['wear','cut','buy','fit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 3, 'user', 'A bit {tight}; I can barely move my arms.', '少しきつくて、腕がほとんど動かせない。', 'tight', (SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), ARRAY['loose','heavy','big','tight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 4, 'npc', 'Try a large. And these {shoes}?', 'Lを試して。この靴は？', 'shoes', (SELECT id FROM vocab_senses WHERE slug='shoes.n.clothes'), ARRAY['hat','jacket','shoes','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 5, 'user', 'They''re comfy. I''ll take both.', '履き心地いい。両方買う。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 6, 'npc', 'Great choice!', 'いい選択！', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 0, 'npc', 'What are you going to {wear} tonight?', '今夜は何を着るの？', 'wear', (SELECT id FROM vocab_senses WHERE slug='wear.v.clothes'), ARRAY['buy','fold','wash','wear']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 1, 'user', 'Maybe my blue {jacket} over a shirt.', 'シャツの上に青いジャケットかな。', 'jacket', (SELECT id FROM vocab_senses WHERE slug='jacket.n.clothes'), ARRAY['jacket','shirt','hat','shoes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 2, 'npc', 'Nice. With a {hat} on your head?', 'いいね。頭に帽子をかぶる？', 'hat', (SELECT id FROM vocab_senses WHERE slug='hat.n.clothes'), ARRAY['jacket','shoes','hat','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 3, 'user', 'No, hats look weird on me.', 'いや、帽子は似合わない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 4, 'npc', 'Ha! What about that shirt?', 'はは！あのシャツは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 5, 'user', 'It''s too {loose} now; it slips off my shoulders.', '今はゆるすぎて、肩からずり落ちる。', 'loose', (SELECT id FROM vocab_senses WHERE slug='loose.adj.fit'), ARRAY['short','loose','heavy','tight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 6, 'npc', 'The jacket it is!', 'じゃあジャケットで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 0, 'npc', 'What''s the dress code Friday?', '金曜の服装は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 1, 'user', 'Casual. You can {wear} anything neat.', 'カジュアル。清潔ならなんでもいい。', 'wear', (SELECT id FROM vocab_senses WHERE slug='wear.v.clothes'), ARRAY['fold','wash','buy','wear']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 2, 'npc', 'Is a {jacket} needed to stay warm?', '暖かくするのにジャケットは要る？', 'jacket', (SELECT id FROM vocab_senses WHERE slug='jacket.n.clothes'), ARRAY['shirt','jacket','hat','shoes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 3, 'user', 'A nice {shirt} with a collar is fine.', '襟付きのきれいなシャツで大丈夫。', 'shirt', (SELECT id FROM vocab_senses WHERE slug='shirt.n.clothes'), ARRAY['jacket','shoes','hat','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 4, 'npc', 'Good. Ties feel too {tight} around the neck anyway.', 'よかった。ネクタイは首がきつすぎるし。', 'tight', (SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), ARRAY['heavy','loose','big','tight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 5, 'user', 'Agreed!', '賛成！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 6, 'npc', 'See you Friday.', '金曜にね。', NULL, NULL, NULL);
