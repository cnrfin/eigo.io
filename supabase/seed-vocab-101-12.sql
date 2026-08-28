-- ============================================================================
-- Vocab 101: Lesson 12 (new): "At the hotel"  (Unit 9, Travel and holidays)
-- ----------------------------------------------------------------------------
-- Words: key, night, stay, bag, floor, guest, breakfast, reception. All new.
-- American spelling, no em-dashes. Parked (published=FALSE) until Unit 9 fills
-- out. Reuses (played only): name, please, thanks, help, right.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('hotel', 'At the hotel', 'ホテル', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('key',       'key',       '/kiː/',        '/kiː/',        400, 1, FALSE, 'キー。/kiː/。'),
  ('night',     'night',     '/naɪt/',       '/naɪt/',       200, 1, FALSE, NULL),
  ('stay',      'stay',      '/steɪ/',       '/steɪ/',       300, 1, FALSE, 'ステイ。/steɪ/。'),
  ('bag',       'bag',       '/bæɡ/',        '/bæɡ/',        350, 1, TRUE,  'バッグ。/bæɡ/。母音は「ア」に近い。'),
  ('floor',     'floor',     '/flɔːr/',      '/flɔː/',       450, 1, FALSE, NULL),
  ('guest',     'guest',     '/ɡest/',       '/ɡest/',       600, 2, FALSE, 'ゲスト。/ɡest/。'),
  ('breakfast', 'breakfast', '/ˈbrekfəst/',  '/ˈbrekfəst/',  550, 2, FALSE, 'ブレックファスト。/ˈbrekfəst/。'),
  ('reception', 'reception', '/rɪˈsepʃən/',  '/rɪˈsepʃən/',  900, 2, FALSE, 'レセプション。/rɪˈsepʃən/。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='key'),       'key.n.lock',       1, TRUE, 'noun', '鍵',       'a small object that opens a lock or door', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='night'),     'night.n.time',     1, TRUE, 'noun', '夜',   'the dark part of the day; one night of a stay', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stay'),      'stay.v.remain',    1, TRUE, 'verb', '泊まる', 'to live somewhere for a short time, like a hotel', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bag'),       'bag.n.luggage',    1, TRUE, 'noun', 'かばん', 'a container you carry things in', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='floor'),     'floor.n.level',    1, TRUE, 'noun', '階',       'one level of a building', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='guest'),     'guest.n.visitor',  1, TRUE, 'noun', '客', 'a person who stays at a hotel or visits', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='breakfast'), 'breakfast.n.meal', 1, TRUE, 'noun', '朝食',     'the first meal of the day', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reception'), 'reception.n.desk', 1, TRUE, 'noun', '受付', 'the desk where hotel guests check in', 'A2', 'ホテルの「フロント」は英語では reception / front desk。')
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('key','night','stay','bag','floor','guest','breakfast','reception')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='guest.n.visitor'), NULL, 'visitor', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='stay.v.remain'),   NULL, 'remain',  'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='hotel'
WHERE s.slug IN ('key.n.lock','night.n.time','stay.v.remain','bag.n.luggage','floor.n.level','guest.n.visitor','breakfast.n.meal','reception.n.desk')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-12', 9, 1, (SELECT id FROM vocab_categories WHERE slug='hotel'), 'At the hotel', 'ホテルにて', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-12'), s.id, x.ord
FROM (VALUES
  ('key.n.lock',0),('night.n.time',1),('stay.v.remain',2),('bag.n.luggage',3),
  ('floor.n.level',4),('guest.n.visitor',5),('breakfast.n.meal',6),('reception.n.desk',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-12'), 'travel',       0, 'Checking in',            'チェックイン',     'hotel', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-12'), 'business',     1, 'A work trip',            '出張',             'hotel', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-12'), 'conversation', 2, 'Telling a friend',       '友達に伝える',     'lobby', 'friend');

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 0, 'npc',  'Good evening! Do you have a reservation?',   'こんばんは！ご予約はありますか？',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 1, 'user', 'Yes, a room for two {night}s, please.',             'はい、2泊の部屋をお願いします。',         'night', (SELECT id FROM vocab_senses WHERE slug='night.n.time'), ARRAY['hour','night','day','week']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 2, 'npc',  'Perfect. Here is your room {key}.',          'かしこまりました。お部屋の鍵です。', 'key', (SELECT id FROM vocab_senses WHERE slug='key.n.lock'), ARRAY['bag','map','card','key']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 3, 'user', 'Thank you. Which {floor} is the room on?',   'ありがとう。部屋は何階ですか？',     'floor', (SELECT id FROM vocab_senses WHERE slug='floor.n.level'), ARRAY['side','street','door','floor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 4, 'npc',  'The third floor. The lift is on your right.','3階です。エレベーターは右手に。',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 5, 'user', 'Great. Could I {stay} one extra night?',     'いいですね。もう1泊できますか？',   'stay', (SELECT id FROM vocab_senses WHERE slug='stay.v.remain'), ARRAY['leave','call','move','stay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 6, 'npc',  'Of course, just let us know.',               'もちろん、お知らせください。',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 7, 'user', 'Thanks so much!',                            'どうもありがとう！',                 NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 0, 'npc',  'Welcome. Are you here for business?',        'ようこそ。お仕事ですか？',           NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 1, 'user', 'Yes. Is {breakfast} in the morning included?',              'はい。朝の朝食は付いていますか？',       'breakfast', (SELECT id FROM vocab_senses WHERE slug='breakfast.n.meal'), ARRAY['breakfast','coffee','parking','dinner']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 2, 'npc',  'Yes, from seven. Need help with your {bag}?','はい、7時から。お荷物をお持ちしますか？', 'bag', (SELECT id FROM vocab_senses WHERE slug='bag.n.luggage'), ARRAY['bag','coat','box','key']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 3, 'user', 'No thanks. Where is {reception} in the morning?','大丈夫です。朝は受付はどこですか？', 'reception', (SELECT id FROM vocab_senses WHERE slug='reception.n.desk'), ARRAY['station','reception','garden','kitchen']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 4, 'npc',  'Right here by the door. Are you our only {guest} tonight?','こちら、ドアの横です。今夜のお客様はお一人ですか？', 'guest', (SELECT id FROM vocab_senses WHERE slug='guest.n.visitor'), ARRAY['guest','driver','friend','worker']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 5, 'user', 'A colleague is coming later too.',           '同僚も後で来ます。',                 NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 6, 'npc',  'Lovely. Enjoy your stay!',                   'かしこまりました。ごゆっくりどうぞ！', NULL, NULL, NULL);

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 0, 'npc',  'Hey! How''s the hotel?',                  'やあ！ホテルはどう？',               NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 1, 'user', 'Really nice. I''m here for three {night}s and two days.','すごくいいよ。2泊3日で来てるんだ。',       'night', (SELECT id FROM vocab_senses WHERE slug='night.n.time'), ARRAY['night','week','hour','day']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 2, 'npc',  'Nice! Is the morning {breakfast} any good?',      'いいね！朝の朝食はおいしい？',           'breakfast', (SELECT id FROM vocab_senses WHERE slug='breakfast.n.meal'), ARRAY['dinner','coffee','lunch','breakfast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 3, 'user', 'Amazing. Where should I put my travel {bag}?',   '最高。旅行かばんはどこに置こう？',       'bag', (SELECT id FROM vocab_senses WHERE slug='bag.n.luggage'), ARRAY['book','coat','key','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 4, 'npc',  'Just leave it here. How long will you {stay}?','ここに置いて。どのくらい泊まるの？', 'stay', (SELECT id FROM vocab_senses WHERE slug='stay.v.remain'), ARRAY['pay','stay','walk','leave']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 5, 'user', 'Until Friday, then I go home.',            '金曜まで、それから帰るよ。',         NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 6, 'npc',  'Let''s get dinner before you leave!',     '帰る前に夕飯食べようよ！',           NULL, NULL, NULL);
