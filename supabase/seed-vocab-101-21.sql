-- ============================================================================
-- Vocab 101: Lesson 21 (A2): "Supermarket"  (Unit 5, Food and eating)
-- ----------------------------------------------------------------------------
-- Words (all new): fresh, bottle, box, heavy, light, fruit, vegetable, list.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('supermarket', 'Supermarket', 'スーパー', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('fresh', 'fresh', NULL, NULL, NULL, 2, FALSE, NULL),
  ('bottle', 'bottle', NULL, NULL, NULL, 2, FALSE, NULL),
  ('box', 'box', NULL, NULL, NULL, 2, FALSE, NULL),
  ('heavy', 'heavy', NULL, NULL, NULL, 2, FALSE, NULL),
  ('light', 'light', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fruit', 'fruit', NULL, NULL, NULL, 2, FALSE, NULL),
  ('vegetable', 'vegetable', NULL, NULL, NULL, 2, FALSE, NULL),
  ('list', 'list', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='fresh'), 'fresh.adj.new', 1, TRUE, 'adjective', '新鮮な', 'recently made or picked; not old', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bottle'), 'bottle.n.container', 1, TRUE, 'noun', 'ボトル', 'a tall container for liquids', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='box'), 'box.n.container', 1, TRUE, 'noun', '箱', 'a container with straight sides', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='heavy'), 'heavy.adj.weight', 1, TRUE, 'adjective', '重い', 'weighing a lot', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='light'), 'light.adj.weight', 1, TRUE, 'adjective', '軽い', 'not weighing much', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fruit'), 'fruit.n.food', 1, TRUE, 'noun', '果物', 'sweet food that grows on plants, like apples', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='vegetable'), 'vegetable.n.food', 1, TRUE, 'noun', '野菜', 'a plant grown for food, like carrots', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='list'), 'list.n.items', 1, TRUE, 'noun', 'リスト', 'items written one under another', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('fresh','bottle','box','heavy','light','fruit','vegetable','list')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='heavy.adj.weight'), (SELECT id FROM vocab_senses WHERE slug='light.adj.weight'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='light.adj.weight'), (SELECT id FROM vocab_senses WHERE slug='heavy.adj.weight'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='supermarket'
WHERE s.slug IN ('fresh.adj.new','bottle.n.container','box.n.container','heavy.adj.weight','light.adj.weight','fruit.n.food','vegetable.n.food','list.n.items')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-21', 5, 2, (SELECT id FROM vocab_categories WHERE slug='supermarket'), 'Supermarket', 'スーパーマーケット', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-21'), s.id, x.ord
FROM (VALUES
  ('fresh.adj.new',0),('bottle.n.container',1),('box.n.container',2),('heavy.adj.weight',3),('light.adj.weight',4),('fruit.n.food',5),('vegetable.n.food',6),('list.n.items',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-21'), 'conversation', 0, 'Grocery run', '買い出し', 'supermarket', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-21'), 'travel', 1, 'At the market', '市場で', 'market', 'vendor'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-21'), 'business', 2, 'Office supplies', 'オフィス用品', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 0, 'npc', 'What''s on the shopping {list}?', '買い物リストには何がある？', 'list', (SELECT id FROM vocab_senses WHERE slug='list.n.items'), ARRAY['list','bottle','bag','box']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 1, 'user', 'We need sweet {fruit} like apples, and milk.', 'りんごみたいな甘い果物と、牛乳が要る。', 'fruit', (SELECT id FROM vocab_senses WHERE slug='fruit.n.food'), ARRAY['bread','fruit','rice','water']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 2, 'npc', 'Let''s get some fresh {vegetable}s like carrots too.', 'にんじんみたいな新鮮な野菜も買おう。', 'vegetable', (SELECT id FROM vocab_senses WHERE slug='vegetable.n.food'), ARRAY['box','bottle','vegetable','fruit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 3, 'user', 'Good. These look really {fresh}, picked today.', 'いいね。これ、今日採れたみたいで新鮮。', 'fresh', (SELECT id FROM vocab_senses WHERE slug='fresh.adj.new'), ARRAY['heavy','fresh','cheap','old']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 4, 'npc', 'Perfect. Anything else?', '完璧。他には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 5, 'user', 'Just eggs. Let''s check out.', '卵だけ。会計しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 6, 'npc', 'Right behind you.', 'すぐ後ろにいるよ。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 0, 'npc', 'Morning! Everything is {fresh}, picked this morning.', 'おはよう！全部、今朝採れたばかりで新鮮だよ。', 'fresh', (SELECT id FROM vocab_senses WHERE slug='fresh.adj.new'), ARRAY['old','dry','fresh','heavy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 1, 'user', 'Great! Some sweet {fruit}, please.', 'いいね！甘い果物をください。', 'fruit', (SELECT id FROM vocab_senses WHERE slug='fruit.n.food'), ARRAY['fruit','rice','bread','water']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 2, 'npc', 'Here. Also a {bottle} of juice?', 'はい。ジュースも一本どう？', 'bottle', (SELECT id FROM vocab_senses WHERE slug='bottle.n.container'), ARRAY['box','bag','bottle','list']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 3, 'user', 'Yes. Is the bag too {heavy} to carry?', 'うん。袋は重くて持てない？', 'heavy', (SELECT id FROM vocab_senses WHERE slug='heavy.adj.weight'), ARRAY['cheap','heavy','light','small']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 4, 'npc', 'A little. Want two bags?', '少し。袋二つにする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 5, 'user', 'Please. Thank you!', 'お願い。ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 6, 'npc', 'Enjoy!', 'どうぞ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 0, 'npc', 'The supply order arrived.', '備品の注文が届いたよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 1, 'user', 'Great. What''s in the cardboard {box}?', 'いいね。その段ボール箱に何が入ってる？', 'box', (SELECT id FROM vocab_senses WHERE slug='box.n.container'), ARRAY['list','box','bottle','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 2, 'npc', 'Paper and pens. Here''s the {list}.', '紙とペン。これがリスト。', 'list', (SELECT id FROM vocab_senses WHERE slug='list.n.items'), ARRAY['list','bag','box','bottle']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 3, 'user', 'This box is so {heavy}, I can''t lift it!', 'この箱すごく重くて、持ち上がらない！', 'heavy', (SELECT id FROM vocab_senses WHERE slug='heavy.adj.weight'), ARRAY['light','heavy','cheap','small']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 4, 'npc', 'That one''s {light}, though.', 'でもそっちは軽いよ。', 'light', (SELECT id FROM vocab_senses WHERE slug='light.adj.weight'), ARRAY['dark','heavy','light','big']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 5, 'user', 'I''ll carry it.', '運ぶよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 6, 'npc', 'Thanks!', 'ありがとう！', NULL, NULL, NULL);
