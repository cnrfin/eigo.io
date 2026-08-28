-- ============================================================================
-- Vocab 101 — Lesson 10 (new): "Home"  (Unit 3)
-- ----------------------------------------------------------------------------
-- Words: house, room, kitchen, bathroom, bed, garden, door, window. Blanks are
-- pinned by function (cook → kitchen, shower → bathroom, etc.). Reuses shower
-- (L7) in a played line. American spelling, no em-dashes. Options answer-first.
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('home', 'Home', '家', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('house',    'house',    '/haʊs/',       '/haʊs/',       130, 1, FALSE, NULL),
  ('room',     'room',     '/ruːm/',       '/ruːm/',       160, 1, FALSE, 'ルーム。/ruːm/。'),
  ('kitchen',  'kitchen',  '/ˈkɪtʃən/',    '/ˈkɪtʃən/',    420, 1, FALSE, 'キッチン。/ˈkɪtʃən/。'),
  ('bathroom', 'bathroom', '/ˈbæθruːm/',   '/ˈbɑːθruːm/',  520, 1, FALSE, NULL),
  ('bed',      'bed',      '/bɛd/',        '/bed/',        240, 1, FALSE, 'ベッド。/bɛd/。'),
  ('garden',   'garden',   '/ˈɡɑːrdn/',    '/ˈɡɑːdn/',     450, 1, FALSE, NULL),
  ('door',     'door',     '/dɔːr/',       '/dɔː/',        200, 1, FALSE, NULL),
  ('window',   'window',   '/ˈwɪndoʊ/',    '/ˈwɪndəʊ/',    300, 1, FALSE, 'ウィンドウ。/ˈwɪndoʊ/。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='house'),    'house.n.building',   1, TRUE, 'noun', '家',       'a building where people live', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='room'),     'room.n.space',       1, TRUE, 'noun', '部屋',     'a part of a building with its own walls', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='kitchen'),  'kitchen.n.cook',     1, TRUE, 'noun', '台所', 'the room where you cook', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bathroom'), 'bathroom.n.wash',    1, TRUE, 'noun', '浴室', 'the room with a bath, shower, or toilet', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bed'),      'bed.n.sleep',        1, TRUE, 'noun', 'ベッド',   'the piece of furniture you sleep on', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='garden'),   'garden.n.yard',      1, TRUE, 'noun', '庭',       'an outdoor area with plants next to a house', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='door'),     'door.n.entry',       1, TRUE, 'noun', 'ドア', 'the part you open to go in or out', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='window'),   'window.n.glass',     1, TRUE, 'noun', '窓',       'the glass opening in a wall that lets in light', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('house','room','kitchen','bathroom','bed','garden','door','window')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='garden.n.yard'),    NULL, 'yard',   'near_synonym', 'アメリカ英語では yard も使う。'),
  ((SELECT id FROM vocab_senses WHERE slug='bathroom.n.wash'),  NULL, 'toilet', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='door.n.entry'),     (SELECT id FROM vocab_senses WHERE slug='window.n.glass'), NULL, 'confusable', 'door=出入りする扉、window=光を入れる窓。');

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='home'
WHERE s.slug IN ('house.n.building','room.n.space','kitchen.n.cook','bathroom.n.wash','bed.n.sleep','garden.n.yard','door.n.entry','window.n.glass')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-10', 1, 10, (SELECT id FROM vocab_categories WHERE slug='home'), 'Home', '家', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-10'), s.id, x.ord
FROM (VALUES
  ('house.n.building',0),('room.n.space',1),('kitchen.n.cook',2),('bathroom.n.wash',3),
  ('bed.n.sleep',4),('garden.n.yard',5),('door.n.entry',6),('window.n.glass',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-10'), 'conversation', 0, 'Describing your new place', '新居を紹介する', 'home',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-10'), 'travel',       1, 'A host shows you around',   '宿の案内',       'home',   'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-10'), 'business',     2, 'Working from home',         '在宅勤務',       'home',   'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 0, 'npc', 'So how is the new place?', '新しい家はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 1, 'user', 'I love it! It''s a small {house} with a garden.', '気に入ってる！庭付きの小さな家なんだ。', 'house', (SELECT id FROM vocab_senses WHERE slug='house.n.building'), ARRAY['station','office','car','house']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 2, 'npc', 'A garden? Nice! How many rooms?', '庭付き？いいね！部屋はいくつ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 3, 'user', 'Three. And a big {kitchen} for cooking.', '3つ。それに料理用の大きなキッチン。', 'kitchen', (SELECT id FROM vocab_senses WHERE slug='kitchen.n.cook'), ARRAY['kitchen','bathroom','garage','closet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 4, 'npc', 'You love cooking. Any outdoor space?', '料理好きだもんね。外のスペースは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 5, 'user', 'Yeah, I grow flowers in the {garden}.', 'うん、庭で花を育ててるよ。', 'garden', (SELECT id FROM vocab_senses WHERE slug='garden.n.yard'), ARRAY['garden','bathroom','garage','kitchen']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 6, 'npc', 'Sounds lovely. Is your room upstairs?', 'すてき。部屋は2階？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 7, 'user', 'Yeah, with a huge {bed}. So comfy!', 'うん、大きなベッドがあってすごく快適！', 'bed', (SELECT id FROM vocab_senses WHERE slug='bed.n.sleep'), ARRAY['bed','shelf','sink','desk']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 8, 'npc', 'I''m jealous! Can I visit?', 'いいなあ！遊びに行っていい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 9, 'user', 'Of course! It has a great {window} view too.', 'もちろん！窓からの眺めもいいんだ。', 'window', (SELECT id FROM vocab_senses WHERE slug='window.n.glass'), ARRAY['door','wall','floor','window']);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 0, 'npc', 'Welcome! Let me show you around.', 'ようこそ！ご案内しますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 1, 'user', 'Thanks, it''s lovely!', 'ありがとう、すてきですね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 2, 'npc', 'This is the {kitchen}, you can cook here.', 'ここがキッチンです、料理できますよ。', 'kitchen', (SELECT id FROM vocab_senses WHERE slug='kitchen.n.cook'), ARRAY['garage','hallway','kitchen','garden']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 3, 'user', 'Perfect. Where''s the {bathroom}? I''d like to shower.', 'いいですね。浴室はどこですか？シャワーを浴びたくて。', 'bathroom', (SELECT id FROM vocab_senses WHERE slug='bathroom.n.wash'), ARRAY['garden','bathroom','kitchen','garage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 4, 'npc', 'Just down the hall. Your bedroom is here.', '廊下の先です。寝室はこちら。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 5, 'user', 'Oh nice, a big {bed}!', 'わあ、大きなベッド！', 'bed', (SELECT id FROM vocab_senses WHERE slug='bed.n.sleep'), ARRAY['sink','shelf','bed','stove']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 6, 'npc', 'Yes, and the {window} opens for fresh air.', 'ええ、窓を開けると換気できますよ。', 'window', (SELECT id FROM vocab_senses WHERE slug='window.n.glass'), ARRAY['roof','floor','door','window']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 7, 'user', 'Perfect. Is there wifi?', '完璧です。Wi-Fiはありますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 8, 'npc', 'Yes, the password is on the fridge. Make yourself at home.', 'はい、パスワードは冷蔵庫に。ごゆっくり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 9, 'user', 'Thanks! Should I lock the {door} when I go out?', 'ありがとう！出かける時はドアに鍵をかけますか？', 'door', (SELECT id FROM vocab_senses WHERE slug='door.n.entry'), ARRAY['window','box','door','gate']);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 0, 'npc', 'Do you work from home these days?', '最近は在宅で働いてるんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 1, 'user', 'Yes, I turned a spare {room} into an office.', 'はい、空き部屋をオフィスにしました。', 'room', (SELECT id FROM vocab_senses WHERE slug='room.n.space'), ARRAY['garage','garden','room','kitchen']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 2, 'npc', 'Smart. Is it quiet?', '賢いですね。静かですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 3, 'user', 'Very. I just close the {door} and focus.', 'とても。ドアを閉めれば集中できます。', 'door', (SELECT id FROM vocab_senses WHERE slug='door.n.entry'), ARRAY['door','window','book','laptop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 4, 'npc', 'Nice setup. Good light?', 'いい環境ですね。明るいですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 5, 'user', 'Yeah, a big {window} next to my desk.', 'ええ、机の隣に大きな窓があります。', 'window', (SELECT id FROM vocab_senses WHERE slug='window.n.glass'), ARRAY['wall','window','floor','door']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 6, 'npc', 'Lucky! I work in my kitchen.', 'いいなあ！私はキッチンで働いてます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 7, 'user', 'Ha! My whole {house} is my office now.', 'はは！今や家全体がオフィスです。', 'house', (SELECT id FROM vocab_senses WHERE slug='house.n.building'), ARRAY['house','city','office','car']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 8, 'npc', 'True for all of us these days!', '今はみんなそうですよね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 9, 'user', 'At least the walk to the {bathroom} is short!', '少なくともトイレまでは近いです！', 'bathroom', (SELECT id FROM vocab_senses WHERE slug='bathroom.n.wash'), ARRAY['bathroom','station','airport','office']);
