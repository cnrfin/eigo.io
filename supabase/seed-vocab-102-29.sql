-- ============================================================================
-- Vocab 102: vocab-102-29 - Cooking & recipes  (Unit 10)
-- Words: ingredient, chop, stir, bake, roast, spicy, flavor, leftovers.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('cooking-recipes', 'Cooking & recipes', '料理とレシピ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('ingredient', 'ingredient', '/ɪnˈɡriːdiənt/', '/ɪnˈɡriːdiənt/', NULL, 3, FALSE, NULL),
  ('chop', 'chop', '/tʃɑːp/', '/tʃɒp/', NULL, 3, FALSE, NULL),
  ('stir', 'stir', '/stɜːr/', '/stɜː/', NULL, 3, FALSE, NULL),
  ('bake', 'bake', '/beɪk/', '/beɪk/', NULL, 3, FALSE, NULL),
  ('roast', 'roast', '/roʊst/', '/rəʊst/', NULL, 4, FALSE, NULL),
  ('spicy', 'spicy', '/ˈspaɪsi/', '/ˈspaɪsi/', NULL, 3, FALSE, NULL),
  ('flavor', 'flavor', '/ˈfleɪvər/', '/ˈfleɪvə/', NULL, 3, FALSE, NULL),
  ('leftovers', 'leftovers', '/ˈleftoʊvərz/', '/ˈleftəʊvəz/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='ingredient'), 'ingredient.n.item', 1, TRUE, 'noun', '材料', 'one of the foods used to make a dish', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='chop'), 'chop.v.cut', 1, TRUE, 'verb', '刻む', 'to cut food into pieces with a knife', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stir'), 'stir.v.mix', 1, TRUE, 'verb', 'かき混ぜる', 'to move food around with a spoon', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bake'), 'bake.v.oven', 1, TRUE, 'verb', '（オーブンで）焼く', 'to cook bread or cakes in an oven', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='roast'), 'roast.v.oven2', 1, TRUE, 'verb', 'ローストする', 'to cook meat or vegetables in an oven with oil', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spicy'), 'spicy.adj.hot', 1, TRUE, 'adjective', '辛い', 'having a strong, hot taste from spices', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='flavor'), 'flavor.n.taste', 1, TRUE, 'noun', '風味', 'the taste of a particular food', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='leftovers'), 'leftovers.n.remains', 1, TRUE, 'noun', '残り物', 'food that is not eaten and kept for later', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('ingredient', 'chop', 'stir', 'bake', 'roast', 'spicy', 'flavor', 'leftovers')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='cooking-recipes'
WHERE s.slug IN ('ingredient.n.item', 'chop.v.cut', 'stir.v.mix', 'bake.v.oven', 'roast.v.oven2', 'spicy.adj.hot', 'flavor.n.taste', 'leftovers.n.remains')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-29', 10, 1, (SELECT id FROM vocab_categories WHERE slug='cooking-recipes'), 'Cooking & recipes', '料理とレシピ', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-29'), s.id, x.ord FROM (VALUES
  ('ingredient.n.item',0),('chop.v.cut',1),('stir.v.mix',2),('bake.v.oven',3),('roast.v.oven2',4),('spicy.adj.hot',5),('flavor.n.taste',6),('leftovers.n.remains',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-29'), 'conversation', 0, 'Cooking together', '一緒に料理', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-29'), 'travel', 1, 'A cooking class', '料理教室', 'kitchen', 'chef'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-29'), 'business', 2, 'Catering an event', 'イベントのケータリング', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 0, 'npc', 'What are we making tonight?', '今夜は何を作る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 1, 'user', 'A curry. Do we have every {ingredient}?', 'カレー。材料は全部ある？', 'ingredient', (SELECT id FROM vocab_senses WHERE slug='ingredient.n.item'), ARRAY['ingredient','flavor','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 2, 'npc', 'I think so. What first?', 'たぶん。まず何する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 3, 'user', 'Can you {chop} the onions?', '玉ねぎを刻んでくれる？', 'chop', (SELECT id FROM vocab_senses WHERE slug='chop.v.cut'), ARRAY['chop','stir','bake','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 4, 'npc', 'Sure. Then?', 'いいよ。次は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 5, 'user', 'I''ll {stir} the sauce so it doesn''t burn.', '焦げないようにソースをかき混ぜる。', 'stir', (SELECT id FROM vocab_senses WHERE slug='stir.v.mix'), ARRAY['stir','chop','bake','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 6, 'npc', 'Smells great. Is it hot?', 'いい匂い。辛い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 7, 'user', 'A little {spicy}, but not too much.', '少し辛いけど、そんなに強くない。', 'spicy', (SELECT id FROM vocab_senses WHERE slug='spicy.adj.hot'), ARRAY['spicy','flavor','leftovers','ingredient']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 8, 'npc', 'Needs more taste maybe?', 'もう少し味がほしいかも？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 9, 'user', 'Add salt for more {flavor}.', '塩を足して風味を出そう。', 'flavor', (SELECT id FROM vocab_senses WHERE slug='flavor.n.taste'), ARRAY['flavor','ingredient','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 10, 'npc', 'This makes a lot.', 'たくさんできるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 11, 'user', 'Good, {leftovers} for lunch tomorrow.', 'いいね、残りは明日のランチに。', 'leftovers', (SELECT id FROM vocab_senses WHERE slug='leftovers.n.remains'), ARRAY['leftovers','ingredient','flavor','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 12, 'npc', 'Perfect meal prep.', '完璧な作り置き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 13, 'user', 'Let''s eat!', '食べよう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 14, 'npc', 'Smells amazing, {{user_name}}.', 'いい匂い、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 0, 'npc', 'Today we make a traditional dish.', '今日は伝統料理を作ります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 1, 'user', 'Great. What''s the key {ingredient}?', 'いいですね。重要な材料は？', 'ingredient', (SELECT id FROM vocab_senses WHERE slug='ingredient.n.item'), ARRAY['ingredient','flavor','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 2, 'npc', 'Fresh herbs. First, prep the vegetables.', '新鮮なハーブです。まず野菜の下ごしらえ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 3, 'user', 'Should I {chop} them finely?', '細かく刻みますか？', 'chop', (SELECT id FROM vocab_senses WHERE slug='chop.v.cut'), ARRAY['chop','stir','bake','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 4, 'npc', 'Yes, small pieces. Now the sauce.', 'はい、小さく。次はソース。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 5, 'user', 'I''ll {stir} it slowly over low heat.', '弱火でゆっくりかき混ぜます。', 'stir', (SELECT id FROM vocab_senses WHERE slug='stir.v.mix'), ARRAY['stir','chop','bake','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 6, 'npc', 'For the bread, use the oven.', 'パンはオーブンで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 7, 'user', 'How long do I {bake} the bread?', 'パンはどれくらい焼きますか？', 'bake', (SELECT id FROM vocab_senses WHERE slug='bake.v.oven'), ARRAY['bake','chop','stir','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 8, 'npc', 'Twenty minutes. And the chicken?', '20分です。鶏肉は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 9, 'user', 'I''ll {roast} the chicken with vegetables.', '鶏肉を野菜と一緒にローストします。', 'roast', (SELECT id FROM vocab_senses WHERE slug='roast.v.oven2'), ARRAY['roast','chop','stir','bake']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 10, 'npc', 'Add chili if you like heat.', '辛いのが好きならチリを。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 11, 'user', 'Yes, I love it {spicy}.', 'はい、辛いのが大好きです。', 'spicy', (SELECT id FROM vocab_senses WHERE slug='spicy.adj.hot'), ARRAY['spicy','flavor','ingredient','leftovers']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 12, 'npc', 'You''re a natural!', '筋がいいですね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 13, 'user', 'This is so fun.', 'すごく楽しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 14, 'npc', 'Enjoy your dish!', '料理を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 0, 'npc', 'Let''s plan the office lunch menu.', 'オフィスランチの献立を決めよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 1, 'user', 'First, list every {ingredient} we need.', 'まず必要な材料を全部書き出そう。', 'ingredient', (SELECT id FROM vocab_senses WHERE slug='ingredient.n.item'), ARRAY['ingredient','flavor','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 2, 'npc', 'Some staff love bold tastes.', '濃い味が好きな人もいる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 3, 'user', 'We''ll offer dishes with rich {flavor}.', 'しっかりした風味の料理を用意する。', 'flavor', (SELECT id FROM vocab_senses WHERE slug='flavor.n.taste'), ARRAY['flavor','ingredient','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 4, 'npc', 'But not everyone likes heat.', 'でも全員が辛いの好きじゃない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 5, 'user', 'Right, one mild and one {spicy} option.', 'そうだね、マイルドと辛いのを一つずつ。', 'spicy', (SELECT id FROM vocab_senses WHERE slug='spicy.adj.hot'), ARRAY['spicy','flavor','ingredient','leftovers']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 6, 'npc', 'Main dish ideas?', 'メインの案は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 7, 'user', 'A big {roast} of vegetables and chicken.', '野菜と鶏肉の大きなローストを。', 'roast', (SELECT id FROM vocab_senses WHERE slug='roast.v.oven2'), ARRAY['roast','chop','stir','bake']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 8, 'npc', 'And something baked?', '焼き物は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 9, 'user', 'Yes, I''ll {bake} fresh bread rolls.', 'うん、焼きたてのロールパンを焼く。', 'bake', (SELECT id FROM vocab_senses WHERE slug='bake.v.oven'), ARRAY['bake','chop','stir','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 10, 'npc', 'What about extra food?', '余った料理は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 11, 'user', 'Any {leftovers} go to the break room.', '残り物は休憩室へ。', 'leftovers', (SELECT id FROM vocab_senses WHERE slug='leftovers.n.remains'), ARRAY['leftovers','ingredient','flavor','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 12, 'npc', 'Everyone will love that.', 'みんな喜ぶよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 13, 'user', 'I''ll send the order.', '注文を出すね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);
