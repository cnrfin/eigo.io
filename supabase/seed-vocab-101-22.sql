-- ============================================================================
-- Vocab 101: Lesson 22 (A2): "Cooking"  (Unit 5, Food and eating)
-- ----------------------------------------------------------------------------
-- Words (all new): cut, add, mix, taste, boil, fry, recipe, plate.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('cooking', 'Cooking', '料理', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('cut', 'cut', NULL, NULL, NULL, 2, FALSE, NULL),
  ('add', 'add', NULL, NULL, NULL, 2, FALSE, NULL),
  ('mix', 'mix', NULL, NULL, NULL, 2, FALSE, NULL),
  ('taste', 'taste', NULL, NULL, NULL, 2, FALSE, NULL),
  ('boil', 'boil', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fry', 'fry', NULL, NULL, NULL, 2, FALSE, NULL),
  ('recipe', 'recipe', NULL, NULL, NULL, 2, FALSE, NULL),
  ('plate', 'plate', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='cut'), 'cut.v.knife', 1, TRUE, 'verb', '切る', 'to divide something with a knife', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='add'), 'add.v.put', 1, TRUE, 'verb', '加える', 'to put something with something else', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mix'), 'mix.v.stir', 1, TRUE, 'verb', '混ぜる', 'to stir things together', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='taste'), 'taste.v.try', 1, TRUE, 'verb', '味見する', 'to try a small amount of food', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='boil'), 'boil.v.heat', 1, TRUE, 'verb', '茹でる', 'to heat water or food until it bubbles', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fry'), 'fry.v.pan', 1, TRUE, 'verb', '炒める', 'to cook food in hot oil', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='recipe'), 'recipe.n.food', 1, TRUE, 'noun', 'レシピ', 'instructions for making a dish', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plate'), 'plate.n.dish', 1, TRUE, 'noun', '皿', 'a flat dish you put food on', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('cut','add','mix','taste','boil','fry','recipe','plate')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='cooking'
WHERE s.slug IN ('cut.v.knife','add.v.put','mix.v.stir','taste.v.try','boil.v.heat','fry.v.pan','recipe.n.food','plate.n.dish')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-22', 5, 3, (SELECT id FROM vocab_categories WHERE slug='cooking'), 'Cooking', '料理', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-22'), s.id, x.ord
FROM (VALUES
  ('cut.v.knife',0),('add.v.put',1),('mix.v.stir',2),('taste.v.try',3),('boil.v.heat',4),('fry.v.pan',5),('recipe.n.food',6),('plate.n.dish',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-22'), 'conversation', 0, 'Cooking together', '一緒に料理', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-22'), 'travel', 1, 'A local dish', '地元の料理', 'guesthouse', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-22'), 'business', 2, 'Team lunch', 'チームランチ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 0, 'npc', 'Thanks for helping me cook!', '料理手伝ってくれてありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 1, 'user', 'Of course! Should I {cut} the onions into small pieces?', 'もちろん！玉ねぎを小さく切ろうか？', 'cut', (SELECT id FROM vocab_senses WHERE slug='cut.v.knife'), ARRAY['boil','cut','mix','wash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 2, 'npc', 'Yes. Then {add} them to the pan.', 'うん。それからフライパンに入れて。', 'add', (SELECT id FROM vocab_senses WHERE slug='add.v.put'), ARRAY['add','taste','cut','wash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 3, 'user', 'Okay. Now I''ll {mix} everything.', '了解。全部混ぜるね。', 'mix', (SELECT id FROM vocab_senses WHERE slug='mix.v.stir'), ARRAY['boil','mix','fry','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 4, 'npc', 'Can you {taste} it? Enough salt?', '味見してくれる？塩は足りてる？', 'taste', (SELECT id FROM vocab_senses WHERE slug='taste.v.try'), ARRAY['mix','add','cut','taste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 5, 'user', 'Mmm, it''s perfect.', 'んー、完璧。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 6, 'npc', 'You''re a natural!', '才能あるね！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 0, 'npc', 'Tonight I''ll teach you a local dish.', '今夜は地元の料理を教えるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 1, 'user', 'Exciting! Is the {recipe} hard?', '楽しみ！レシピは難しい？', 'recipe', (SELECT id FROM vocab_senses WHERE slug='recipe.n.food'), ARRAY['list','plate','bottle','recipe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 2, 'npc', 'No. First we {boil} the noodles in hot water.', 'いいえ。まず麺を熱湯で茹でます。', 'boil', (SELECT id FROM vocab_senses WHERE slug='boil.v.heat'), ARRAY['mix','boil','fry','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 3, 'user', 'And the vegetables?', '野菜は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 4, 'npc', 'We {fry} them quickly in oil.', '油でさっと炒めます。', 'fry', (SELECT id FROM vocab_senses WHERE slug='fry.v.pan'), ARRAY['cut','wash','boil','fry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 5, 'user', 'It smells amazing. Can I {taste}?', 'いい匂い。味見していい？', 'taste', (SELECT id FROM vocab_senses WHERE slug='taste.v.try'), ARRAY['add','cut','taste','mix']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 6, 'npc', 'Go ahead!', 'どうぞ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 0, 'npc', 'Everyone brought food for the potluck!', 'みんな持ち寄りで料理を持ってきた！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 1, 'user', 'Nice! Put it on this {plate}.', 'いいね！この皿に置いて。', 'plate', (SELECT id FROM vocab_senses WHERE slug='plate.n.dish'), ARRAY['plate','list','box','bottle']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 2, 'npc', 'Should I {add} some sauce?', 'ソースを足す？', 'add', (SELECT id FROM vocab_senses WHERE slug='add.v.put'), ARRAY['add','wash','cut','taste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 3, 'user', 'Sure. Then {mix} and toss the salad.', 'うん。それからサラダを混ぜ合わせて。', 'mix', (SELECT id FROM vocab_senses WHERE slug='mix.v.stir'), ARRAY['boil','fry','cut','mix']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 4, 'npc', 'Can you {cut} the bread?', 'パンを切ってくれる？', 'cut', (SELECT id FROM vocab_senses WHERE slug='cut.v.knife'), ARRAY['boil','wash','mix','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 5, 'user', 'On it!', '了解！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 6, 'npc', 'This looks great.', 'おいしそう。', NULL, NULL, NULL);
