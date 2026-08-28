-- ============================================================================
-- Vocab 102: vocab-102-23 - On the move  (Unit 8)
-- Words: set off, get around, drop off, pick up, hurry up, take off, get on, hold up.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('on-the-move', 'On the move', '移動する', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('set off', 'set off', '/ˌset ˈɔːf/', '/ˌset ˈɒf/', NULL, 4, FALSE, NULL),
  ('get around', 'get around', '/ˌɡet əˈraʊnd/', '/ˌɡet əˈraʊnd/', NULL, 4, FALSE, NULL),
  ('drop off', 'drop off', '/ˌdrɑːp ˈɔːf/', '/ˌdrɒp ˈɒf/', NULL, 3, FALSE, NULL),
  ('pick up', 'pick up', '/ˌpɪk ˈʌp/', '/ˌpɪk ˈʌp/', NULL, 3, FALSE, NULL),
  ('hurry up', 'hurry up', '/ˌhɜːri ˈʌp/', '/ˌhʌri ˈʌp/', NULL, 3, FALSE, NULL),
  ('take off', 'take off', '/ˌteɪk ˈɔːf/', '/ˌteɪk ˈɒf/', NULL, 3, FALSE, NULL),
  ('get on', 'get on', '/ˌɡet ˈɑːn/', '/ˌɡet ˈɒn/', NULL, 3, FALSE, NULL),
  ('hold up', 'hold up', '/ˌhoʊld ˈʌp/', '/ˌhəʊld ˈʌp/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='set off'), 'set-off.phrv.depart', 1, TRUE, 'phrasal verb', '出発する', 'to start a journey', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get around'), 'get-around.phrv.travel', 1, TRUE, 'phrasal verb', '（あちこち）移動する', 'to travel from place to place in an area', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='drop off'), 'drop-off.phrv.deliver', 1, TRUE, 'phrasal verb', '（人・物を）送り届ける', 'to take someone or something to a place and leave it', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pick up'), 'pick-up.phrv.collect', 1, TRUE, 'phrasal verb', '迎えに行く', 'to collect someone or something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hurry up'), 'hurry-up.phrv.hasten', 1, TRUE, 'phrasal verb', '急ぐ', 'to do something more quickly', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take off'), 'take-off.phrv.depart', 1, TRUE, 'phrasal verb', '離陸する', 'to leave the ground and begin to fly', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get on'), 'get-on.phrv.board', 1, TRUE, 'phrasal verb', '（乗り物に）乗る', 'to enter a bus, train, or plane', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hold up'), 'hold-up.phrv.delay', 1, TRUE, 'phrasal verb', '遅らせる', 'to make someone or something late', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('set off', 'get around', 'drop off', 'pick up', 'hurry up', 'take off', 'get on', 'hold up')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='on-the-move'
WHERE s.slug IN ('set-off.phrv.depart', 'get-around.phrv.travel', 'drop-off.phrv.deliver', 'pick-up.phrv.collect', 'hurry-up.phrv.hasten', 'take-off.phrv.depart', 'get-on.phrv.board', 'hold-up.phrv.delay')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-23', 8, 1, (SELECT id FROM vocab_categories WHERE slug='on-the-move'), 'On the move', '移動する', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-23'), s.id, x.ord FROM (VALUES
  ('set-off.phrv.depart',0),('get-around.phrv.travel',1),('drop-off.phrv.deliver',2),('pick-up.phrv.collect',3),('hurry-up.phrv.hasten',4),('take-off.phrv.depart',5),('get-on.phrv.board',6),('hold-up.phrv.delay',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-23'), 'conversation', 0, 'Planning a day out', 'お出かけの計画', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-23'), 'travel', 1, 'At the airport', '空港で', 'airport', 'companion'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-23'), 'business', 2, 'A tight schedule', 'タイトな日程', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 0, 'npc', 'What time should we leave tomorrow?', '明日は何時に出る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 1, 'user', 'Let''s {set off} early, around seven.', '早めに、7時ごろ出発しよう。', 'set off', (SELECT id FROM vocab_senses WHERE slug='set-off.phrv.depart'), ARRAY['set off','get around','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 2, 'npc', 'How will we travel there?', 'どうやって行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 3, 'user', 'We can {get around} the city by bike.', '街は自転車で移動できるよ。', 'get around', (SELECT id FROM vocab_senses WHERE slug='get-around.phrv.travel'), ARRAY['get around','set off','drop off','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 4, 'npc', 'Do you need a ride to mine?', 'うちまで送ろうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 5, 'user', 'Yes, could you {pick up} me at the station?', 'うん、駅で拾ってくれる？', 'pick up', (SELECT id FROM vocab_senses WHERE slug='pick-up.phrv.collect'), ARRAY['pick up','drop off','hurry up','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 6, 'npc', 'Sure. And after?', 'いいよ。そのあとは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 7, 'user', 'You can {drop off} me at home later.', 'あとで家に送ってくれればいい。', 'drop off', (SELECT id FROM vocab_senses WHERE slug='drop-off.phrv.deliver'), ARRAY['drop off','pick up','set off','get around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 8, 'npc', 'Great. Don''t be late!', 'いいね。遅れないでね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 9, 'user', 'I''ll {hurry up} in the morning, promise.', '朝は急ぐよ、約束する。', 'hurry up', (SELECT id FROM vocab_senses WHERE slug='hurry-up.phrv.hasten'), ARRAY['hurry up','hold up','set off','get around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 10, 'npc', 'Traffic can be bad.', '渋滞するかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 11, 'user', 'True, roadworks might {hold up} the buses.', '確かに、工事でバスが遅れるかも。', 'hold up', (SELECT id FROM vocab_senses WHERE slug='hold-up.phrv.delay'), ARRAY['hold up','hurry up','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 12, 'npc', 'Bikes it is, then.', 'じゃあ自転車で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 13, 'user', 'Perfect plan!', '完璧な計画！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 14, 'npc', 'See you at seven, {{user_name}}.', '7時にね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 0, 'npc', 'Our gate just opened.', 'ゲートが開いたよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 1, 'user', 'Great, let''s {get on} the plane early.', 'いいね、早めに飛行機に乗ろう。', 'get on', (SELECT id FROM vocab_senses WHERE slug='get-on.phrv.board'), ARRAY['get on','take off','set off','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 2, 'npc', 'What time do we leave?', '出発は何時？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 3, 'user', 'We {take off} at ten sharp.', '10時ちょうどに離陸する。', 'take off', (SELECT id FROM vocab_senses WHERE slug='take-off.phrv.depart'), ARRAY['take off','get on','pick up','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 4, 'npc', 'We''re a little slow.', 'ちょっと遅れ気味。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 5, 'user', 'Let''s {hurry up}, boarding ends soon.', '急ごう、搭乗がもうすぐ締め切り。', 'hurry up', (SELECT id FROM vocab_senses WHERE slug='hurry-up.phrv.hasten'), ARRAY['hurry up','hold up','set off','get on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 6, 'npc', 'Did we leave the hotel on time?', 'ホテルは時間通りに出た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 7, 'user', 'Yes, we {set off} with plenty of time.', 'うん、余裕を持って出発した。', 'set off', (SELECT id FROM vocab_senses WHERE slug='set-off.phrv.depart'), ARRAY['set off','get on','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 8, 'npc', 'Good, no stress.', 'よかった、焦らずに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 9, 'user', 'The security line did {hold up} us a bit.', '保安検査で少し足止めされたけどね。', 'hold up', (SELECT id FROM vocab_senses WHERE slug='hold-up.phrv.delay'), ARRAY['hold up','hurry up','get on','take off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 10, 'npc', 'Who''s meeting us on arrival?', '着いたら誰が迎えに来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 11, 'user', 'My cousin will {pick up} us at the airport.', 'いとこが空港で迎えに来てくれる。', 'pick up', (SELECT id FROM vocab_senses WHERE slug='pick-up.phrv.collect'), ARRAY['pick up','drop off','get on','take off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 12, 'npc', 'Perfect. Let''s board.', '完璧。乗ろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 13, 'user', 'After you!', 'お先にどうぞ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 14, 'npc', 'Here we go!', '行こう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 0, 'npc', 'The client meeting is across town at two.', 'クライアント会議は2時に街の反対側。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 1, 'user', 'We should {set off} by noon to be safe.', '安全のため正午には出発すべき。', 'set off', (SELECT id FROM vocab_senses WHERE slug='set-off.phrv.depart'), ARRAY['set off','get on','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 2, 'npc', 'How do we get there?', 'どうやって行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 3, 'user', 'It''s easiest to {get around} by taxi today.', '今日はタクシーで移動するのが楽。', 'get around', (SELECT id FROM vocab_senses WHERE slug='get-around.phrv.travel'), ARRAY['get around','set off','drop off','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 4, 'npc', 'Traffic might be heavy.', '渋滞するかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 5, 'user', 'Yeah, an accident could {hold up} us.', 'うん、事故で足止めされるかも。', 'hold up', (SELECT id FROM vocab_senses WHERE slug='hold-up.phrv.delay'), ARRAY['hold up','hurry up','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 6, 'npc', 'Let''s leave earlier then.', 'じゃあ早めに出よう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 7, 'user', 'Agreed. I''ll {hurry up} and finish this email.', '賛成。急いでこのメールを片付ける。', 'hurry up', (SELECT id FROM vocab_senses WHERE slug='hurry-up.phrv.hasten'), ARRAY['hurry up','hold up','set off','get around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 8, 'npc', 'Should we grab the samples?', 'サンプルも持っていく？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 9, 'user', 'Yes, and {drop off} them at reception first.', 'うん、先に受付に届けよう。', 'drop off', (SELECT id FROM vocab_senses WHERE slug='drop-off.phrv.deliver'), ARRAY['drop off','pick up','set off','get around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 10, 'npc', 'Our flight home is tonight, right?', '帰りの便は今夜だよね？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 11, 'user', 'Yes, we {take off} at nine, so no delays.', 'うん、9時に離陸だから遅れは禁物。', 'take off', (SELECT id FROM vocab_senses WHERE slug='take-off.phrv.depart'), ARRAY['take off','get on','pick up','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 12, 'npc', 'Busy day ahead.', '忙しい一日だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 13, 'user', 'Let''s do this.', 'やろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 14, 'npc', 'Right behind you, {{user_name}}.', 'すぐ後ろにいるよ、{{user_name}}。', NULL, NULL, NULL);
