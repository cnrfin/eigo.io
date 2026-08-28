-- ============================================================================
-- Vocab 102: vocab-102-20 - Staying healthy  (Unit 7)
-- Words: work out, give up, cut down, warm up, put on, slow down, take up, ease off.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('staying-healthy', 'Staying healthy', '健康を保つ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('work out', 'work out', '/ˌwɜːrk ˈaʊt/', '/ˌwɜːk ˈaʊt/', NULL, 3, FALSE, NULL),
  ('give up', 'give up', '/ˌɡɪv ˈʌp/', '/ˌɡɪv ˈʌp/', NULL, 3, FALSE, NULL),
  ('cut down', 'cut down', '/ˌkʌt ˈdaʊn/', '/ˌkʌt ˈdaʊn/', NULL, 4, FALSE, NULL),
  ('warm up', 'warm up', '/ˌwɔːrm ˈʌp/', '/ˌwɔːm ˈʌp/', NULL, 3, FALSE, NULL),
  ('put on', 'put on', '/ˌpʊt ˈɑːn/', '/ˌpʊt ˈɒn/', NULL, 4, FALSE, NULL),
  ('slow down', 'slow down', '/ˌsloʊ ˈdaʊn/', '/ˌsləʊ ˈdaʊn/', NULL, 3, FALSE, NULL),
  ('take up', 'take up', '/ˌteɪk ˈʌp/', '/ˌteɪk ˈʌp/', NULL, 4, FALSE, NULL),
  ('ease off', 'ease off', '/ˌiːz ˈɔːf/', '/ˌiːz ˈɒf/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='work out'), 'work-out.phrv.exercise', 1, TRUE, 'phrasal verb', '運動する', 'to do physical exercise to get fit', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='give up'), 'give-up.phrv.quit', 1, TRUE, 'phrasal verb', 'やめる', 'to stop doing something, especially a habit', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cut down'), 'cut-down.phrv.reduce', 1, TRUE, 'phrasal verb', '（量を）減らす', 'to consume or do less of something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='warm up'), 'warm-up.phrv.prepare', 1, TRUE, 'phrasal verb', '準備運動をする', 'to prepare your body gently before exercise', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put on'), 'put-on.phrv.gain', 1, TRUE, 'phrasal verb', '（体重が）増える', 'to gain weight', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='slow down'), 'slow-down.phrv.decelerate', 1, TRUE, 'phrasal verb', 'ペースを落とす', 'to become less busy or move less fast; to rest more', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take up'), 'take-up.phrv.start', 1, TRUE, 'phrasal verb', '（趣味などを）始める', 'to start a new activity or hobby', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ease off'), 'ease-off.phrv.reduce', 1, TRUE, 'phrasal verb', '控える', 'to gradually do something with less effort or force', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('work out', 'give up', 'cut down', 'warm up', 'put on', 'slow down', 'take up', 'ease off')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='staying-healthy'
WHERE s.slug IN ('work-out.phrv.exercise', 'give-up.phrv.quit', 'cut-down.phrv.reduce', 'warm-up.phrv.prepare', 'put-on.phrv.gain', 'slow-down.phrv.decelerate', 'take-up.phrv.start', 'ease-off.phrv.reduce')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-20', 7, 1, (SELECT id FROM vocab_categories WHERE slug='staying-healthy'), 'Staying healthy', '健康を保つ', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-20'), s.id, x.ord FROM (VALUES
  ('work-out.phrv.exercise',0),('give-up.phrv.quit',1),('cut-down.phrv.reduce',2),('warm-up.phrv.prepare',3),('put-on.phrv.gain',4),('slow-down.phrv.decelerate',5),('take-up.phrv.start',6),('ease-off.phrv.reduce',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-20'), 'conversation', 0, 'New Year resolutions', '新年の抱負', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-20'), 'travel', 1, 'At the hotel gym', 'ホテルのジムで', 'gym', 'trainer'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-20'), 'business', 2, 'Avoiding burnout', '燃え尽きを防ぐ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 0, 'npc', 'Any resolutions this year?', '今年の抱負はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 1, 'user', 'Yes, I want to {work out} three times a week.', 'うん、週3回運動したい。', 'work out', (SELECT id FROM vocab_senses WHERE slug='work-out.phrv.exercise'), ARRAY['work out','give up','cut down','warm up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 2, 'npc', 'Good goal. Diet changes?', 'いい目標。食事は変える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 3, 'user', 'I''ll {cut down} on sugar and soda.', '砂糖と炭酸を減らす。', 'cut down', (SELECT id FROM vocab_senses WHERE slug='cut-down.phrv.reduce'), ARRAY['cut down','take up','warm up','slow down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 4, 'npc', 'Smart. Quitting anything?', '賢い。何かやめる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 5, 'user', 'Yeah, I''m trying to {give up} smoking.', 'うん、たばこをやめようとしてる。', 'give up', (SELECT id FROM vocab_senses WHERE slug='give-up.phrv.quit'), ARRAY['give up','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 6, 'npc', 'That''s a big one. Good luck!', 'それは大きいね。頑張って！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 7, 'user', 'I don''t want to {put on} more weight either.', 'これ以上体重を増やしたくもない。', 'put on', (SELECT id FROM vocab_senses WHERE slug='put-on.phrv.gain'), ARRAY['put on','warm up','slow down','take up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 8, 'npc', 'Exercise helps with that.', '運動が効くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 9, 'user', 'I might also {take up} swimming.', '水泳も始めるかも。', 'take up', (SELECT id FROM vocab_senses WHERE slug='take-up.phrv.start'), ARRAY['take up','warm up','put on','cut down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 10, 'npc', 'Nice variety.', 'いいバランス。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 11, 'user', 'And in general, I want to {slow down} and rest more.', 'それに全体的にペースを落として休みたい。', 'slow down', (SELECT id FROM vocab_senses WHERE slug='slow-down.phrv.decelerate'), ARRAY['slow down','warm up','put on','cut down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 12, 'npc', 'Balance is everything.', 'バランスが大事。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 13, 'user', 'This year''s the year!', '今年こそ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 14, 'npc', 'You''ve got this, {{user_name}}.', 'できるよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 0, 'npc', 'First time using the hotel gym?', 'ホテルのジムは初めて？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 1, 'user', 'Yes, I like to {work out} while traveling.', 'はい、旅行中も運動したくて。', 'work out', (SELECT id FROM vocab_senses WHERE slug='work-out.phrv.exercise'), ARRAY['work out','give up','cut down','warm up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 2, 'npc', 'Great. Do you stretch first?', 'いいね。先にストレッチする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 3, 'user', 'Always. I {warm up} before I run.', '必ず。走る前に準備運動します。', 'warm up', (SELECT id FROM vocab_senses WHERE slug='warm-up.phrv.prepare'), ARRAY['warm up','give up','put on','take up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 4, 'npc', 'Good habit. Any injuries?', 'いい習慣。けがは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 5, 'user', 'My knee is sore, so I''ll {ease off} today.', '膝が痛いので、今日は控えめにします。', 'ease off', (SELECT id FROM vocab_senses WHERE slug='ease-off.phrv.reduce'), ARRAY['ease off','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 6, 'npc', 'Wise. Don''t push too hard.', '賢明。無理しないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 7, 'user', 'Right, I''ll {slow down} on the treadmill.', 'はい、ランニングマシンではペースを落とします。', 'slow down', (SELECT id FROM vocab_senses WHERE slug='slow-down.phrv.decelerate'), ARRAY['slow down','warm up','put on','take up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 8, 'npc', 'There''s a hike tomorrow too.', '明日はハイキングもあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 9, 'user', 'Nice! I''ve wanted to {take up} hiking.', 'いいですね！ハイキングを始めたかった。', 'take up', (SELECT id FROM vocab_senses WHERE slug='take-up.phrv.start'), ARRAY['take up','warm up','put on','ease off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 10, 'npc', 'It''s a beautiful trail.', 'きれいなコースですよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 11, 'user', 'Just don''t let me {put on} weight from the buffet!', 'ビュッフェで太らないようにしないと！', 'put on', (SELECT id FROM vocab_senses WHERE slug='put-on.phrv.gain'), ARRAY['put on','warm up','ease off','slow down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 12, 'npc', 'Ha, hike it off!', 'はは、歩いて消費しましょう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 13, 'user', 'Deal!', '了解！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 14, 'npc', 'Enjoy your workout!', '運動を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 0, 'npc', 'You''ve been working nonstop lately.', '最近ずっと働きづめだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 1, 'user', 'I know. I need to {slow down} a bit.', 'わかってる。少しペースを落とさないと。', 'slow down', (SELECT id FROM vocab_senses WHERE slug='slow-down.phrv.decelerate'), ARRAY['slow down','warm up','put on','take up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 2, 'npc', 'Take a real lunch break.', 'ちゃんと昼休みを取りなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 3, 'user', 'Yeah, I should {cut down} on late nights.', 'うん、夜更かしを減らすべきだね。', 'cut down', (SELECT id FROM vocab_senses WHERE slug='cut-down.phrv.reduce'), ARRAY['cut down','take up','warm up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 4, 'npc', 'Are you sleeping enough?', '睡眠は足りてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 5, 'user', 'No. I might {give up} checking email at night.', '足りない。夜のメールチェックをやめようかな。', 'give up', (SELECT id FROM vocab_senses WHERE slug='give-up.phrv.quit'), ARRAY['give up','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 6, 'npc', 'That would help a lot.', 'それはかなり効くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 7, 'user', 'I''ll {ease off} the overtime this month.', '今月は残業を控えるよ。', 'ease off', (SELECT id FROM vocab_senses WHERE slug='ease-off.phrv.reduce'), ARRAY['ease off','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 8, 'npc', 'Do you exercise at all?', '運動はしてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 9, 'user', 'I try to {work out} on weekends.', '週末に運動しようとしてる。', 'work out', (SELECT id FROM vocab_senses WHERE slug='work-out.phrv.exercise'), ARRAY['work out','give up','cut down','warm up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 10, 'npc', 'Even a short walk helps.', '短い散歩でも効くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 11, 'user', 'True. I''ll {warm up} with a morning stretch.', '確かに。朝のストレッチから始める。', 'warm up', (SELECT id FROM vocab_senses WHERE slug='warm-up.phrv.prepare'), ARRAY['warm up','give up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 12, 'npc', 'Look after yourself.', '体を大事にね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 13, 'user', 'Thanks for the nudge.', '背中を押してくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);
