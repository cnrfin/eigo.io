-- ============================================================================
-- Vocab 102: vocab-102-17 - Around the house  (Unit 6)
-- Words: tidy up, throw away, put away, clear out, move in, settle in, plug in, hang up.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('around-the-house', 'Around the house', '家事', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('tidy up', 'tidy up', '/ˌtaɪdi ˈʌp/', '/ˌtaɪdi ˈʌp/', NULL, 3, FALSE, NULL),
  ('throw away', 'throw away', '/ˌθroʊ əˈweɪ/', '/ˌθrəʊ əˈweɪ/', NULL, 3, FALSE, NULL),
  ('put away', 'put away', '/ˌpʊt əˈweɪ/', '/ˌpʊt əˈweɪ/', NULL, 3, FALSE, NULL),
  ('clear out', 'clear out', '/ˌklɪr ˈaʊt/', '/ˌklɪər ˈaʊt/', NULL, 4, FALSE, NULL),
  ('move in', 'move in', '/ˌmuːv ˈɪn/', '/ˌmuːv ˈɪn/', NULL, 3, FALSE, NULL),
  ('settle in', 'settle in', '/ˌsetl ˈɪn/', '/ˌsetl ˈɪn/', NULL, 4, FALSE, NULL),
  ('plug in', 'plug in', '/ˌplʌɡ ˈɪn/', '/ˌplʌɡ ˈɪn/', NULL, 3, FALSE, NULL),
  ('hang up', 'hang up', '/ˌhæŋ ˈʌp/', '/ˌhæŋ ˈʌp/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='tidy up'), 'tidy-up.phrv.neaten', 1, TRUE, 'phrasal verb', '片付ける', 'to make a place neat and in order', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='throw away'), 'throw-away.phrv.discard', 1, TRUE, 'phrasal verb', '捨てる', 'to get rid of something you do not want', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put away'), 'put-away.phrv.store', 1, TRUE, 'phrasal verb', 'しまう', 'to put something in the place where it is kept', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='clear out'), 'clear-out.phrv.empty', 1, TRUE, 'phrasal verb', '（不要な物を）片付ける', 'to remove things you no longer need from a space', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='move in'), 'move-in.phrv.occupy', 1, TRUE, 'phrasal verb', '引っ越してくる', 'to start living in a new home', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='settle in'), 'settle-in.phrv.adjust', 1, TRUE, 'phrasal verb', '慣れる', 'to get used to a new home or job', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plug in'), 'plug-in.phrv.connect', 1, TRUE, 'phrasal verb', 'プラグを差す', 'to connect a machine to electricity', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hang up'), 'hang-up.phrv.hang', 1, TRUE, 'phrasal verb', '掛ける', 'to put clothes on a hook or hanger', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('tidy up', 'throw away', 'put away', 'clear out', 'move in', 'settle in', 'plug in', 'hang up')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='around-the-house'
WHERE s.slug IN ('tidy-up.phrv.neaten', 'throw-away.phrv.discard', 'put-away.phrv.store', 'clear-out.phrv.empty', 'move-in.phrv.occupy', 'settle-in.phrv.adjust', 'plug-in.phrv.connect', 'hang-up.phrv.hang')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-17', 6, 1, (SELECT id FROM vocab_categories WHERE slug='around-the-house'), 'Around the house', '家のことをする', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-17'), s.id, x.ord FROM (VALUES
  ('tidy-up.phrv.neaten',0),('throw-away.phrv.discard',1),('put-away.phrv.store',2),('clear-out.phrv.empty',3),('move-in.phrv.occupy',4),('settle-in.phrv.adjust',5),('plug-in.phrv.connect',6),('hang-up.phrv.hang',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-17'), 'conversation', 0, 'Cleaning day', '掃除の日', 'home', 'roommate'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-17'), 'travel', 1, 'Moving into a homestay', 'ホームステイに入る', 'house', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-17'), 'business', 2, 'Setting up an office', 'オフィスの準備', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 0, 'npc', 'This place is a mess. Cleaning day?', '散らかってるね。掃除する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 1, 'user', 'Yes, let''s {tidy up} the living room first.', 'うん、まずリビングを片付けよう。', 'tidy up', (SELECT id FROM vocab_senses WHERE slug='tidy-up.phrv.neaten'), ARRAY['tidy up','throw away','put away','clear out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 2, 'npc', 'There''s so much junk.', 'ガラクタが多い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 3, 'user', 'We can {throw away} these old magazines.', 'この古い雑誌は捨てられる。', 'throw away', (SELECT id FROM vocab_senses WHERE slug='throw-away.phrv.discard'), ARRAY['throw away','put away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 4, 'npc', 'What about the clean clothes?', 'きれいな服は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 5, 'user', 'I''ll {put away} the laundry in the drawers.', '洗濯物は引き出しにしまうよ。', 'put away', (SELECT id FROM vocab_senses WHERE slug='put-away.phrv.store'), ARRAY['put away','throw away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 6, 'npc', 'The closet is packed.', 'クローゼットがぱんぱん。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 7, 'user', 'Let''s {clear out} clothes we never wear.', '着ない服を整理しよう。', 'clear out', (SELECT id FROM vocab_senses WHERE slug='clear-out.phrv.empty'), ARRAY['clear out','plug in','hang up','throw away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 8, 'npc', 'Good idea. Where''s the vacuum?', 'いいね。掃除機どこ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 9, 'user', 'I''ll {plug in} the vacuum over here.', 'こっちで掃除機をつなぐね。', 'plug in', (SELECT id FROM vocab_senses WHERE slug='plug-in.phrv.connect'), ARRAY['plug in','hang up','put away','throw away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 10, 'npc', 'And these coats on the floor?', '床のコートは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 11, 'user', 'I''ll {hang up} the coats by the door.', 'コートはドアのそばに掛ける。', 'hang up', (SELECT id FROM vocab_senses WHERE slug='hang-up.phrv.hang'), ARRAY['hang up','plug in','throw away','put away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 12, 'npc', 'We make a good team.', 'いいチームだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 13, 'user', 'Almost done!', 'もう少し！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 14, 'npc', 'Pizza after, {{user_name}}?', 'あとでピザ食べる、{{user_name}}？', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 0, 'npc', 'Welcome! Your room is ready.', 'ようこそ！部屋の準備はできてます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 1, 'user', 'Thank you! When can I {move in}?', 'ありがとう！いつ入れますか？', 'move in', (SELECT id FROM vocab_senses WHERE slug='move-in.phrv.occupy'), ARRAY['move in','settle in','tidy up','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 2, 'npc', 'Right now, if you like.', 'よければ今すぐでも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 3, 'user', 'Great. It''ll take a day to {settle in}.', 'いいですね。慣れるのに一日かかりそう。', 'settle in', (SELECT id FROM vocab_senses WHERE slug='settle-in.phrv.adjust'), ARRAY['settle in','move in','plug in','throw away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 4, 'npc', 'Take your time. Here''s the closet.', 'ごゆっくり。ここがクローゼット。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 5, 'user', 'I''ll {hang up} my shirts here.', 'シャツはここに掛けます。', 'hang up', (SELECT id FROM vocab_senses WHERE slug='hang-up.phrv.hang'), ARRAY['hang up','plug in','put away','throw away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 6, 'npc', 'And drawers below for the rest.', '残りは下の引き出しに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 7, 'user', 'Perfect, I''ll {put away} my socks there.', '完璧、靴下はそこにしまいます。', 'put away', (SELECT id FROM vocab_senses WHERE slug='put-away.phrv.store'), ARRAY['put away','plug in','hang up','move in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 8, 'npc', 'There''s a desk for studying.', '勉強用の机もあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 9, 'user', 'Can I {plug in} my laptop by the desk?', '机のそばでノートPCをつないでいい？', 'plug in', (SELECT id FROM vocab_senses WHERE slug='plug-in.phrv.connect'), ARRAY['plug in','hang up','settle in','move in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 10, 'npc', 'Of course. Outlet''s on the wall.', 'もちろん。コンセントは壁に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 11, 'user', 'I''ll keep it neat and {tidy up} daily.', 'きれいに保って、毎日片付けます。', 'tidy up', (SELECT id FROM vocab_senses WHERE slug='tidy-up.phrv.neaten'), ARRAY['tidy up','move in','settle in','plug in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 12, 'npc', 'That''s very considerate.', 'とても気遣いがありますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 13, 'user', 'Thanks for having me.', 'お世話になります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 14, 'npc', 'Make yourself at home!', 'くつろいでね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 0, 'npc', 'Let''s get the new office ready.', '新しいオフィスを整えよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 1, 'user', 'First, let''s {clear out} the old boxes.', 'まず古い箱を片付けよう。', 'clear out', (SELECT id FROM vocab_senses WHERE slug='clear-out.phrv.empty'), ARRAY['clear out','plug in','hang up','settle in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 2, 'npc', 'Half of them are trash.', '半分はゴミだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 3, 'user', 'Right, we can {throw away} the broken chairs.', 'うん、壊れた椅子は捨てられる。', 'throw away', (SELECT id FROM vocab_senses WHERE slug='throw-away.phrv.discard'), ARRAY['throw away','put away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 4, 'npc', 'The files should stay, though.', 'でも書類は残そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 5, 'user', 'I''ll {put away} the files in the cabinet.', '書類はキャビネットにしまうよ。', 'put away', (SELECT id FROM vocab_senses WHERE slug='put-away.phrv.store'), ARRAY['put away','throw away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 6, 'npc', 'Good. Now the tech setup.', 'いいね。次は機器の設置。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 7, 'user', 'I''ll {plug in} the monitors and printer.', 'モニターとプリンターをつなぐ。', 'plug in', (SELECT id FROM vocab_senses WHERE slug='plug-in.phrv.connect'), ARRAY['plug in','hang up','throw away','clear out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 8, 'npc', 'The team arrives Monday.', 'チームは月曜に来る。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 9, 'user', 'They''ll need a day to {settle in}.', '慣れるのに一日いるね。', 'settle in', (SELECT id FROM vocab_senses WHERE slug='settle-in.phrv.adjust'), ARRAY['settle in','throw away','plug in','clear out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 10, 'npc', 'Let''s make it welcoming.', '居心地よくしよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 11, 'user', 'I''ll {tidy up} the desks before they come.', '来る前に机を片付けておく。', 'tidy up', (SELECT id FROM vocab_senses WHERE slug='tidy-up.phrv.neaten'), ARRAY['tidy up','throw away','plug in','clear out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 12, 'npc', 'Great teamwork.', 'いい連携だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 13, 'user', 'Almost ready.', 'もうすぐ完成。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
