-- ============================================================================
-- Vocab 101: Lesson 18 (A2): "Around town"  (Unit 3, Home and town)
-- ----------------------------------------------------------------------------
-- Words (all new): bank, park, library, market, corner, museum, shop, bridge.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('around-town', 'Around town', '町なか', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('bank', 'bank', NULL, NULL, NULL, 2, FALSE, NULL),
  ('park', 'park', NULL, NULL, NULL, 2, FALSE, NULL),
  ('library', 'library', NULL, NULL, NULL, 2, FALSE, NULL),
  ('market', 'market', NULL, NULL, NULL, 2, FALSE, NULL),
  ('corner', 'corner', NULL, NULL, NULL, 2, FALSE, NULL),
  ('museum', 'museum', NULL, NULL, NULL, 2, FALSE, NULL),
  ('shop', 'shop', NULL, NULL, NULL, 2, FALSE, NULL),
  ('bridge', 'bridge', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='bank'), 'bank.n.money', 1, TRUE, 'noun', '銀行', 'a place that keeps and lends money', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='park'), 'park.n.green', 1, TRUE, 'noun', '公園', 'an open green area in a town', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='library'), 'library.n.books', 1, TRUE, 'noun', '図書館', 'a place with books you can borrow', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='market'), 'market.n.stalls', 1, TRUE, 'noun', '市場', 'a place where people buy and sell goods', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='corner'), 'corner.n.turn', 1, TRUE, 'noun', '角', 'the place where two streets meet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='museum'), 'museum.n.art', 1, TRUE, 'noun', '博物館', 'a place that shows art or history', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shop'), 'shop.n.store', 1, TRUE, 'noun', '店', 'a place where you buy things', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bridge'), 'bridge.n.cross', 1, TRUE, 'noun', '橋', 'a structure built over a river or road', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('bank','park','library','market','corner','museum','shop','bridge')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='around-town'
WHERE s.slug IN ('bank.n.money','park.n.green','library.n.books','market.n.stalls','corner.n.turn','museum.n.art','shop.n.store','bridge.n.cross')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-18', 3, 4, (SELECT id FROM vocab_categories WHERE slug='around-town'), 'Around town', '町なか', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-18'), s.id, x.ord
FROM (VALUES
  ('bank.n.money',0),('park.n.green',1),('library.n.books',2),('market.n.stalls',3),('corner.n.turn',4),('museum.n.art',5),('shop.n.store',6),('bridge.n.cross',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-18'), 'travel', 0, 'Finding places', '場所を探す', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-18'), 'conversation', 1, 'A day out', 'お出かけ', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-18'), 'business', 2, 'Lunch spot', 'ランチの場所', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 0, 'npc', 'You look lost. Need help?', '迷ってる？手伝おうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 1, 'user', 'Yes! Where''s the nearest {bank} to change money?', 'はい！お金を両替する一番近い銀行は？', 'bank', (SELECT id FROM vocab_senses WHERE slug='bank.n.money'), ARRAY['shop','bank','museum','park']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 2, 'npc', 'Two streets down, on the {corner} where two roads meet.', '二本先、道が交わる角に。', 'corner', (SELECT id FROM vocab_senses WHERE slug='corner.n.turn'), ARRAY['corner','library','market','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 3, 'user', 'Thanks. Is there a {library} to borrow books nearby?', 'ありがとう。本を借りる図書館は近くに？', 'library', (SELECT id FROM vocab_senses WHERE slug='library.n.books'), ARRAY['bank','library','market','park']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 4, 'npc', 'Yes, next to the big {park} with the trees.', 'うん、木のある大きな公園の隣。', 'park', (SELECT id FROM vocab_senses WHERE slug='park.n.green'), ARRAY['shop','corner','park','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 5, 'user', 'Perfect, thank you so much!', '完璧、どうもありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 6, 'npc', 'No problem. Enjoy the town!', 'どういたしまして。町を楽しんで！', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 0, 'npc', 'What should we do today?', '今日は何しよう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 1, 'user', 'Let''s visit the {market} to buy fresh food first.', 'まず市場で新鮮な食材を買おう。', 'market', (SELECT id FROM vocab_senses WHERE slug='market.n.stalls'), ARRAY['library','bank','market','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 2, 'npc', 'Good idea. Then the art {museum}?', 'いいね。それから美術館？', 'museum', (SELECT id FROM vocab_senses WHERE slug='museum.n.art'), ARRAY['park','bank','museum','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 3, 'user', 'Yes! And a little {shop} to buy gifts after.', 'うん！そのあと小さな店でお土産を。', 'shop', (SELECT id FROM vocab_senses WHERE slug='shop.n.store'), ARRAY['corner','shop','park','bank']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 4, 'npc', 'Sounds fun. Lunch on the grass in the {park}?', '楽しそう。公園の芝生でお昼？', 'park', (SELECT id FROM vocab_senses WHERE slug='park.n.green'), ARRAY['museum','market','park','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 5, 'user', 'Love it. Let''s go!', 'いいね。行こう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 6, 'npc', 'Best day ever.', '最高の一日。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 0, 'npc', 'Want to grab lunch nearby?', '近くでランチどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 1, 'user', 'Sure. There''s a good {shop} for sandwiches.', 'いいね。サンドイッチのいい店がある。', 'shop', (SELECT id FROM vocab_senses WHERE slug='shop.n.store'), ARRAY['shop','park','bank','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 2, 'npc', 'Where is it?', 'どこ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 3, 'user', 'Just past the {bank} where I get cash.', '現金をおろす銀行を過ぎたところ。', 'bank', (SELECT id FROM vocab_senses WHERE slug='bank.n.money'), ARRAY['museum','shop','park','bank']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 4, 'npc', 'Oh, near the {corner} where the streets meet?', '道が交わる角の近く？', 'corner', (SELECT id FROM vocab_senses WHERE slug='corner.n.turn'), ARRAY['corner','bridge','park','market']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 5, 'user', 'Yes, right after the {bridge} over the river.', '川にかかる橋のすぐ先。', 'bridge', (SELECT id FROM vocab_senses WHERE slug='bridge.n.cross'), ARRAY['park','corner','shop','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 6, 'npc', 'Great, let''s go.', 'いいね、行こう。', NULL, NULL, NULL);
