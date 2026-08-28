-- ============================================================================
-- Vocab 102: vocab-102-28 - Eating out  (Unit 10)
-- Words: reservation, starter, dessert, tip, waiter, cuisine, vegetarian, menu.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('eating-out', 'Eating out', '外食', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('reservation', 'reservation', '/ˌrezərˈveɪʃn/', '/ˌrezəˈveɪʃn/', NULL, 3, FALSE, NULL),
  ('starter', 'starter', '/ˈstɑːrtər/', '/ˈstɑːtə/', NULL, 4, FALSE, NULL),
  ('dessert', 'dessert', '/dɪˈzɜːrt/', '/dɪˈzɜːt/', NULL, 3, FALSE, NULL),
  ('tip', 'tip', '/tɪp/', '/tɪp/', NULL, 3, FALSE, NULL),
  ('waiter', 'waiter', '/ˈweɪtər/', '/ˈweɪtə/', NULL, 3, FALSE, NULL),
  ('cuisine', 'cuisine', '/kwɪˈziːn/', '/kwɪˈziːn/', NULL, 4, FALSE, NULL),
  ('vegetarian', 'vegetarian', '/ˌvedʒəˈteriən/', '/ˌvedʒəˈteəriən/', NULL, 3, FALSE, NULL),
  ('menu', 'menu', '/ˈmenjuː/', '/ˈmenjuː/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='reservation'), 'reservation.n.booking', 1, TRUE, 'noun', '予約', 'an arrangement to keep a table for you', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='starter'), 'starter.n.appetizer', 1, TRUE, 'noun', '前菜', 'a small first dish before the main meal', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dessert'), 'dessert.n.sweet', 1, TRUE, 'noun', 'デザート', 'sweet food eaten at the end of a meal', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tip'), 'tip.n.gratuity', 1, TRUE, 'noun', 'チップ', 'extra money given to thank a server', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='waiter'), 'waiter.n.server', 1, TRUE, 'noun', 'ウェイター', 'a person who serves food in a restaurant', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cuisine'), 'cuisine.n.cooking', 1, TRUE, 'noun', '料理（の種類）', 'a style of cooking from a place', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='vegetarian'), 'vegetarian.n.diet', 1, TRUE, 'noun', 'ベジタリアン', 'a person who does not eat meat', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='menu'), 'menu.n.list', 1, TRUE, 'noun', 'メニュー', 'a list of the food a restaurant offers', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('reservation', 'starter', 'dessert', 'tip', 'waiter', 'cuisine', 'vegetarian', 'menu')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='eating-out'
WHERE s.slug IN ('reservation.n.booking', 'starter.n.appetizer', 'dessert.n.sweet', 'tip.n.gratuity', 'waiter.n.server', 'cuisine.n.cooking', 'vegetarian.n.diet', 'menu.n.list')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-28', 10, 0, (SELECT id FROM vocab_categories WHERE slug='eating-out'), 'Eating out', '外食する', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-28'), s.id, x.ord FROM (VALUES
  ('reservation.n.booking',0),('starter.n.appetizer',1),('dessert.n.sweet',2),('tip.n.gratuity',3),('waiter.n.server',4),('cuisine.n.cooking',5),('vegetarian.n.diet',6),('menu.n.list',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-28'), 'conversation', 0, 'Choosing where to eat', '店を選ぶ', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-28'), 'travel', 1, 'A restaurant abroad', '海外のレストラン', 'restaurant', 'waiter'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-28'), 'business', 2, 'A client dinner', '接待ディナー', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 0, 'npc', 'Shall we try that new restaurant?', 'あの新しいレストラン行ってみる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 1, 'user', 'Yes! Should I make a {reservation}?', 'うん！予約しようか？', 'reservation', (SELECT id FROM vocab_senses WHERE slug='reservation.n.booking'), ARRAY['reservation','starter','dessert','tip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 2, 'npc', 'Good idea, it gets busy.', 'いいね、混むから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 3, 'user', 'What {cuisine} do they serve?', 'どんな料理を出すの？', 'cuisine', (SELECT id FROM vocab_senses WHERE slug='cuisine.n.cooking'), ARRAY['cuisine','menu','tip','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 4, 'npc', 'Italian, I think.', 'イタリアンだと思う。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 5, 'user', 'Perfect. Their {menu} looks amazing online.', '完璧。ネットで見たメニューがすごくよさそう。', 'menu', (SELECT id FROM vocab_senses WHERE slug='menu.n.list'), ARRAY['menu','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 6, 'npc', 'I''m starving already.', 'もうお腹ぺこぺこ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 7, 'user', 'Let''s get a {starter} to share first.', 'まず前菜をシェアしよう。', 'starter', (SELECT id FROM vocab_senses WHERE slug='starter.n.appetizer'), ARRAY['starter','tip','dessert','waiter']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 8, 'npc', 'And save room for something sweet.', '甘いものの分も残しておこう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 9, 'user', 'Definitely a {dessert} at the end.', '最後は絶対デザート。', 'dessert', (SELECT id FROM vocab_senses WHERE slug='dessert.n.sweet'), ARRAY['dessert','tip','starter','menu']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 10, 'npc', 'Do we tip there?', 'あそこチップいる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 11, 'user', 'Yes, if the {waiter} is helpful.', 'うん、ウェイターが親切ならね。', 'waiter', (SELECT id FROM vocab_senses WHERE slug='waiter.n.server'), ARRAY['waiter','menu','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 12, 'npc', 'Let''s go tonight!', '今夜行こう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 13, 'user', 'I''ll book a table.', 'テーブルを予約するね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 14, 'npc', 'Can''t wait, {{user_name}}.', '楽しみ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 0, 'npc', 'Good evening. Here''s your table.', 'こんばんは。こちらのお席です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 1, 'user', 'Thank you. Could I see the {menu}?', 'ありがとう。メニューを見せてもらえますか？', 'menu', (SELECT id FROM vocab_senses WHERE slug='menu.n.list'), ARRAY['menu','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 2, 'npc', 'Of course. Any dietary needs?', 'もちろん。食事制限はありますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 3, 'user', 'Yes, I''m {vegetarian}; no meat please.', 'はい、ベジタリアンなので肉抜きで。', 'vegetarian', (SELECT id FROM vocab_senses WHERE slug='vegetarian.n.diet'), ARRAY['vegetarian','starter','dessert','tip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 4, 'npc', 'We have great veggie dishes.', '野菜料理が充実してます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 5, 'user', 'Wonderful, I love local {cuisine}.', '素敵、地元の料理が大好きです。', 'cuisine', (SELECT id FROM vocab_senses WHERE slug='cuisine.n.cooking'), ARRAY['cuisine','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 6, 'npc', 'Would you like to begin with something?', '何か前菜はいかがですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 7, 'user', 'A soup {starter}, please.', 'スープの前菜をお願いします。', 'starter', (SELECT id FROM vocab_senses WHERE slug='starter.n.appetizer'), ARRAY['starter','tip','dessert','menu']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 8, 'npc', 'Excellent. And after?', 'かしこまりました。そのあとは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 9, 'user', 'I''ll decide on {dessert} later.', 'デザートは後で決めます。', 'dessert', (SELECT id FROM vocab_senses WHERE slug='dessert.n.sweet'), ARRAY['dessert','tip','starter','menu']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 10, 'npc', 'Take your time.', 'ごゆっくり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 11, 'user', 'By the way, is a {tip} included in the bill?', 'ところで、チップは会計に含まれますか？', 'tip', (SELECT id FROM vocab_senses WHERE slug='tip.n.gratuity'), ARRAY['tip','starter','dessert','menu']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 12, 'npc', 'It''s optional here.', 'こちらでは任意です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 13, 'user', 'Good to know, thank you.', '分かりました、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 14, 'npc', 'Enjoy your meal!', 'お食事を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 0, 'npc', 'Where should we take the client?', 'クライアントをどこに連れて行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 1, 'user', 'I''ll make a {reservation} somewhere nice.', 'どこかいい店を予約するよ。', 'reservation', (SELECT id FROM vocab_senses WHERE slug='reservation.n.booking'), ARRAY['reservation','starter','dessert','tip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 2, 'npc', 'They like fine food.', '彼らは上質な料理が好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 3, 'user', 'Then French {cuisine} would impress them.', 'ならフランス料理で印象づけられる。', 'cuisine', (SELECT id FROM vocab_senses WHERE slug='cuisine.n.cooking'), ARRAY['cuisine','menu','tip','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 4, 'npc', 'Good call. Big group?', 'いいね。大人数？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 5, 'user', 'Six of us. I''ll check the {menu} for options.', '6人。メニューで選択肢を確認する。', 'menu', (SELECT id FROM vocab_senses WHERE slug='menu.n.list'), ARRAY['menu','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 6, 'npc', 'Order some things to share.', 'シェアできるものを頼もう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 7, 'user', 'Yes, a few {starter}s for the table.', 'うん、テーブルに前菜をいくつか。', 'starter', (SELECT id FROM vocab_senses WHERE slug='starter.n.appetizer'), ARRAY['starter','tip','dessert','waiter']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 8, 'npc', 'Make sure service is smooth.', 'サービスがスムーズなように。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 9, 'user', 'I''ll ask for an experienced {waiter}.', '経験豊富なウェイターをお願いする。', 'waiter', (SELECT id FROM vocab_senses WHERE slug='waiter.n.server'), ARRAY['waiter','menu','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 10, 'npc', 'And the bill?', '会計は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 11, 'user', 'The company covers it, plus a generous {tip}.', '会社持ちで、チップも多めに。', 'tip', (SELECT id FROM vocab_senses WHERE slug='tip.n.gratuity'), ARRAY['tip','menu','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 12, 'npc', 'Perfect. Let''s impress them.', '完璧。印象づけよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 13, 'user', 'I''ll confirm the table.', '席を確定するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
