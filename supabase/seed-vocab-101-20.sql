-- ============================================================================
-- Vocab 101: Lesson 20 (A2): "Chores"  (Unit 4, Daily life)
-- ----------------------------------------------------------------------------
-- Words (all new): clean, wash, tidy, mess, dishes, laundry, trash, sweep.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('chores', 'Chores', '家事', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('clean', 'clean', NULL, NULL, NULL, 2, FALSE, NULL),
  ('wash', 'wash', NULL, NULL, NULL, 2, FALSE, NULL),
  ('tidy', 'tidy', NULL, NULL, NULL, 2, FALSE, NULL),
  ('mess', 'mess', NULL, NULL, NULL, 2, FALSE, NULL),
  ('dishes', 'dishes', NULL, NULL, NULL, 2, FALSE, NULL),
  ('laundry', 'laundry', NULL, NULL, NULL, 2, FALSE, NULL),
  ('trash', 'trash', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sweep', 'sweep', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='clean'), 'clean.v.tidy', 1, TRUE, 'verb', '掃除する', 'to remove dirt and make something clean', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wash'), 'wash.v.clean', 1, TRUE, 'verb', '洗う', 'to clean something with water', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tidy'), 'tidy.v.order', 1, TRUE, 'verb', '片づける', 'to put things in their proper place', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mess'), 'mess.n.disorder', 1, TRUE, 'noun', '散らかり', 'a dirty or untidy state', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dishes'), 'dishes.n.plates', 1, TRUE, 'noun', '食器', 'the plates and bowls you eat from', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='laundry'), 'laundry.n.wash', 1, TRUE, 'noun', '洗濯物', 'clothes that need washing', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='trash'), 'trash.n.waste', 1, TRUE, 'noun', 'ゴミ', 'things you throw away', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sweep'), 'sweep.v.broom', 1, TRUE, 'verb', '掃く', 'to clean a floor with a brush', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('clean','wash','tidy','mess','dishes','laundry','trash','sweep')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='chores'
WHERE s.slug IN ('clean.v.tidy','wash.v.clean','tidy.v.order','mess.n.disorder','dishes.n.plates','laundry.n.wash','trash.n.waste','sweep.v.broom')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-20', 4, 4, (SELECT id FROM vocab_categories WHERE slug='chores'), 'Chores', '家事', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-20'), s.id, x.ord
FROM (VALUES
  ('clean.v.tidy',0),('wash.v.clean',1),('tidy.v.order',2),('mess.n.disorder',3),('dishes.n.plates',4),('laundry.n.wash',5),('trash.n.waste',6),('sweep.v.broom',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-20'), 'conversation', 0, 'Splitting chores', '家事の分担', 'home', 'roommate'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-20'), 'travel', 1, 'House rules', '家のルール', 'guesthouse', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-20'), 'business', 2, 'Tidy the office', 'オフィスを片づける', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 0, 'npc', 'Should we split the chores?', '家事を分担しない？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 1, 'user', 'Sure. I''ll {clean} the kitchen until it shines.', 'いいよ。台所をピカピカに掃除する。', 'clean', (SELECT id FROM vocab_senses WHERE slug='clean.v.tidy'), ARRAY['sleep','cook','clean','mess']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 2, 'npc', 'Great. I''ll wash the {dishes} in the sink.', 'じゃあシンクで食器を洗うよ。', 'dishes', (SELECT id FROM vocab_senses WHERE slug='dishes.n.plates'), ARRAY['trash','floor','laundry','dishes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 3, 'user', 'Can you take out the {trash} to the bin too?', 'ゴミをゴミ箱に出してくれる？', 'trash', (SELECT id FROM vocab_senses WHERE slug='trash.n.waste'), ARRAY['trash','box','bag','dishes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 4, 'npc', 'Sure. Who washes the {laundry}, the clothes?', 'いいよ。洗濯物（服）は誰が洗う？', 'laundry', (SELECT id FROM vocab_senses WHERE slug='laundry.n.wash'), ARRAY['dishes','mess','trash','laundry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 5, 'user', 'Let''s take turns.', '交代でやろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 6, 'npc', 'Deal!', '決まり！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 0, 'npc', 'A few house rules, if that''s okay.', '家のルールをいくつか、いい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 1, 'user', 'Of course.', 'もちろん。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 2, 'npc', 'Please {tidy} your room each day.', '毎日部屋を片づけてね。', 'tidy', (SELECT id FROM vocab_senses WHERE slug='tidy.v.order'), ARRAY['cook','break','mess','tidy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 3, 'user', 'No problem. Should I {wash} my dishes?', '了解。食器は洗いますか？', 'wash', (SELECT id FROM vocab_senses WHERE slug='wash.v.clean'), ARRAY['wash','throw','break','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 4, 'npc', 'Yes please. Don''t leave a {mess}.', 'お願いね。散らかさないで。', 'mess', (SELECT id FROM vocab_senses WHERE slug='mess.n.disorder'), ARRAY['mess','plan','noise','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 5, 'user', 'Understood. I''ll even {sweep} the floor.', '分かりました。床も掃きます。', 'sweep', (SELECT id FROM vocab_senses WHERE slug='sweep.v.broom'), ARRAY['cook','wash','sweep','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 6, 'npc', 'Wonderful! Thank you.', '素晴らしい！ありがとう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 0, 'npc', 'The office is a bit messy today.', '今日はオフィスが少し散らかってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 1, 'user', 'Let''s {clean} up so the room looks neat.', '部屋がきれいに見えるよう片づけよう。', 'clean', (SELECT id FROM vocab_senses WHERE slug='clean.v.tidy'), ARRAY['break','clean','mess','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 2, 'npc', 'Good call. I''ll empty the {trash} can.', 'いいね。ゴミ箱を空にする。', 'trash', (SELECT id FROM vocab_senses WHERE slug='trash.n.waste'), ARRAY['trash','dishes','box','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 3, 'user', 'And I''ll {tidy} the desks and put things away.', '机を片づけて物をしまうよ。', 'tidy', (SELECT id FROM vocab_senses WHERE slug='tidy.v.order'), ARRAY['tidy','cook','break','mess']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 4, 'npc', 'Someone left dirty {dishes} in the sink.', '誰かが汚れた食器をシンクに置いてる。', 'dishes', (SELECT id FROM vocab_senses WHERE slug='dishes.n.plates'), ARRAY['floor','laundry','trash','dishes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 5, 'user', 'I''ll wash them quickly.', 'さっと洗うよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 6, 'npc', 'Thanks, team!', 'ありがとう、みんな！', NULL, NULL, NULL);
