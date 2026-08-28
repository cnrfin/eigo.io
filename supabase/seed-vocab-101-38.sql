-- ============================================================================
-- Vocab 101: Lesson 38 (A2): "Nature & animals"  (Unit 13, The wider world)
-- ----------------------------------------------------------------------------
-- Words (all new): tree, sea, mountain, dog, cat, bird, river, flower.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('nature', 'Nature and animals', '自然と動物', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('tree', 'tree', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sea', 'sea', NULL, NULL, NULL, 2, FALSE, NULL),
  ('mountain', 'mountain', NULL, NULL, NULL, 2, FALSE, NULL),
  ('dog', 'dog', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cat', 'cat', NULL, NULL, NULL, 2, FALSE, NULL),
  ('bird', 'bird', NULL, NULL, NULL, 2, FALSE, NULL),
  ('river', 'river', NULL, NULL, NULL, 2, FALSE, NULL),
  ('flower', 'flower', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='tree'), 'tree.n.plant', 1, TRUE, 'noun', '木', 'a tall plant with a trunk and branches', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sea'), 'sea.n.water', 1, TRUE, 'noun', '海', 'the large body of salt water', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mountain'), 'mountain.n.land', 1, TRUE, 'noun', '山', 'a very high area of land', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dog'), 'dog.n.animal', 1, TRUE, 'noun', '犬', 'a common animal kept as a pet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cat'), 'cat.n.animal', 1, TRUE, 'noun', '猫', 'a small animal often kept as a pet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bird'), 'bird.n.animal', 1, TRUE, 'noun', '鳥', 'an animal with feathers and wings', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='river'), 'river.n.water', 1, TRUE, 'noun', '川', 'a long line of water that flows to the sea', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='flower'), 'flower.n.plant', 1, TRUE, 'noun', '花', 'the colorful part of a plant', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('tree','sea','mountain','dog','cat','bird','river','flower')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='nature'
WHERE s.slug IN ('tree.n.plant','sea.n.water','mountain.n.land','dog.n.animal','cat.n.animal','bird.n.animal','river.n.water','flower.n.plant')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-38', 13, 2, (SELECT id FROM vocab_categories WHERE slug='nature'), 'Nature & animals', '自然と動物', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-38'), s.id, x.ord
FROM (VALUES
  ('tree.n.plant',0),('sea.n.water',1),('mountain.n.land',2),('dog.n.animal',3),('cat.n.animal',4),('bird.n.animal',5),('river.n.water',6),('flower.n.plant',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-38'), 'conversation', 0, 'A walk in nature', '自然の中を歩く', 'park', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-38'), 'travel', 1, 'A nature tour', '自然ツアー', 'street', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-38'), 'business', 2, 'Office pets and plants', 'オフィスのペットと植物', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 0, 'npc', 'It''s so peaceful here.', 'ここ、すごく静か。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 1, 'user', 'Look at that huge {tree}!', 'あの大きな木見て！', 'tree', (SELECT id FROM vocab_senses WHERE slug='tree.n.plant'), ARRAY['bird','flower','river','tree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 2, 'npc', 'And listen, a {bird} is singing.', '聞いて、鳥が鳴いてる。', 'bird', (SELECT id FROM vocab_senses WHERE slug='bird.n.animal'), ARRAY['cat','bird','dog','fish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 3, 'user', 'Beautiful. Are those red {flower}s, the blooming ones, wild?', 'きれい。あの咲いてる赤い花、野生？', 'flower', (SELECT id FROM vocab_senses WHERE slug='flower.n.plant'), ARRAY['grass','river','tree','flower']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 4, 'npc', 'Yes. The {river}, where the water flows, is close too.', 'うん。水が流れる川も近いよ。', 'river', (SELECT id FROM vocab_senses WHERE slug='river.n.water'), ARRAY['sea','river','tree','road']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 5, 'user', 'Perfect spot for a picnic.', 'ピクニックに最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 6, 'npc', 'Let''s stay a while.', '少しいよう。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 0, 'npc', 'Today we''ll see the countryside.', '今日は田舎を見ます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 1, 'user', 'Will we climb that tall {mountain}?', 'あの高い山に登る？', 'mountain', (SELECT id FROM vocab_senses WHERE slug='mountain.n.land'), ARRAY['mountain','river','tree','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 2, 'npc', 'Part of it. Then down to the {sea} to swim in salt water.', '途中まで。それから塩水で泳げる海へ下ります。', 'sea', (SELECT id FROM vocab_senses WHERE slug='sea.n.water'), ARRAY['park','river','street','sea']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 3, 'user', 'Is there a {river} to cross on the way?', '途中に渡る川はある？', 'river', (SELECT id FROM vocab_senses WHERE slug='river.n.water'), ARRAY['road','tree','river','sea']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 4, 'npc', 'Yes, with old {tree}s along it.', 'はい、古い木々が並んでます。', 'tree', (SELECT id FROM vocab_senses WHERE slug='tree.n.plant'), ARRAY['tree','flower','bird','river']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 5, 'user', 'Sounds gorgeous.', '素敵そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 6, 'npc', 'It is. Let''s go.', 'ええ。行きましょう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 0, 'npc', 'The office feels dull lately.', '最近オフィスが味気ない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 1, 'user', 'Maybe an office {dog} to pet and walk?', 'なでたり散歩したりできるオフィス犬でもどう？', 'dog', (SELECT id FROM vocab_senses WHERE slug='dog.n.animal'), ARRAY['dog','cat','bird','fish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 2, 'npc', 'Ha! I''m more of a {cat} person; I love how they purr.', 'はは！私は猫派、あのゴロゴロが好き。', 'cat', (SELECT id FROM vocab_senses WHERE slug='cat.n.animal'), ARRAY['cat','dog','bird','fish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 3, 'user', 'Then some plants? A {flower} on each desk.', 'じゃあ植物？机ごとに花を。', 'flower', (SELECT id FROM vocab_senses WHERE slug='flower.n.plant'), ARRAY['tree','grass','river','flower']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 4, 'npc', 'Nice. Maybe a small {bird} in a cage too?', 'いいね。小さな鳥を鳥かごに入れるのも？', 'bird', (SELECT id FROM vocab_senses WHERE slug='bird.n.animal'), ARRAY['bird','dog','fish','cat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 5, 'user', 'Let''s start with plants.', 'まず植物から。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 6, 'npc', 'Agreed.', '賛成。', NULL, NULL, NULL);
