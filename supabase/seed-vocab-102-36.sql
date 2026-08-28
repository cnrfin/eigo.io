-- ============================================================================
-- Vocab 102: vocab-102-36 - Going out  (Unit 12)
-- Words: venue, crowd, queue, festival, gig, encore, backstage, lineup.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('going-out', 'Going out', 'お出かけ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('venue', 'venue', '/ˈvenjuː/', '/ˈvenjuː/', NULL, 4, FALSE, NULL),
  ('crowd', 'crowd', '/kraʊd/', '/kraʊd/', NULL, 3, FALSE, NULL),
  ('queue', 'queue', '/kjuː/', '/kjuː/', NULL, 3, TRUE, '/kjuː/。「キュー」。ue は読まない。'),
  ('festival', 'festival', '/ˈfestɪvl/', '/ˈfestɪvl/', NULL, 3, FALSE, NULL),
  ('gig', 'gig', '/ɡɪɡ/', '/ɡɪɡ/', NULL, 4, FALSE, NULL),
  ('encore', 'encore', '/ˈɑːŋkɔːr/', '/ˈɒŋkɔː/', NULL, 4, FALSE, NULL),
  ('backstage', 'backstage', '/ˌbækˈsteɪdʒ/', '/ˌbækˈsteɪdʒ/', NULL, 4, FALSE, NULL),
  ('lineup', 'lineup', '/ˈlaɪnʌp/', '/ˈlaɪnʌp/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='venue'), 'venue.n.place', 1, TRUE, 'noun', '会場', 'a place where an event is held', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='crowd'), 'crowd.n.people', 1, TRUE, 'noun', '群衆', 'a large group of people together', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='queue'), 'queue.n.line', 1, TRUE, 'noun', '列', 'a line of people waiting for something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='festival'), 'festival.n.event', 1, TRUE, 'noun', '祭り', 'a series of events, often music, over some days', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gig'), 'gig.n.concert', 1, TRUE, 'noun', 'ライブ', 'a live performance by musicians', 'B2', 'くだけた言い方。'),
  ((SELECT id FROM vocab_words WHERE normalized='encore'), 'encore.n.extra', 1, TRUE, 'noun', 'アンコール', 'an extra performance after the audience cheers', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='backstage'), 'backstage.adv.behind', 1, TRUE, 'adverb', '舞台裏で', 'in or to the area behind a stage', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lineup'), 'lineup.n.acts', 1, TRUE, 'noun', '出演者一覧', 'the list of performers at an event', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('venue', 'crowd', 'queue', 'festival', 'gig', 'encore', 'backstage', 'lineup')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='going-out'
WHERE s.slug IN ('venue.n.place', 'crowd.n.people', 'queue.n.line', 'festival.n.event', 'gig.n.concert', 'encore.n.extra', 'backstage.adv.behind', 'lineup.n.acts')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-36', 12, 2, (SELECT id FROM vocab_categories WHERE slug='going-out'), 'Going out', '夜のお出かけ', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-36'), s.id, x.ord FROM (VALUES
  ('venue.n.place',0),('crowd.n.people',1),('queue.n.line',2),('festival.n.event',3),('gig.n.concert',4),('encore.n.extra',5),('backstage.adv.behind',6),('lineup.n.acts',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-36'), 'conversation', 0, 'A concert tonight', '今夜のコンサート', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-36'), 'travel', 1, 'A music festival', '音楽フェス', 'festival', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-36'), 'business', 2, 'A launch event', '発表イベント', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 0, 'npc', 'Excited for the concert tonight?', '今夜のコンサート楽しみ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 1, 'user', 'So excited! It''s my favorite band''s {gig}.', 'すごく！大好きなバンドのライブ。', 'gig', (SELECT id FROM vocab_senses WHERE slug='gig.n.concert'), ARRAY['gig','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 2, 'npc', 'Where is it?', 'どこで？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 3, 'user', 'At a small {venue} downtown.', '中心街の小さな会場で。', 'venue', (SELECT id FROM vocab_senses WHERE slug='venue.n.place'), ARRAY['venue','crowd','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 4, 'npc', 'Will it be packed?', '満員になる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 5, 'user', 'Yeah, a huge {crowd} is expected.', 'うん、大勢の観客が予想されてる。', 'crowd', (SELECT id FROM vocab_senses WHERE slug='crowd.n.people'), ARRAY['crowd','venue','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 6, 'npc', 'Get there early?', '早めに行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 7, 'user', 'Definitely, the {queue} will be long.', '絶対、列が長くなるから。', 'queue', (SELECT id FROM vocab_senses WHERE slug='queue.n.line'), ARRAY['queue','venue','crowd','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 8, 'npc', 'Who else is playing?', '他は誰が出るの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 9, 'user', 'The whole {lineup} is amazing this year.', '今年の出演陣は全部すごい。', 'lineup', (SELECT id FROM vocab_senses WHERE slug='lineup.n.acts'), ARRAY['lineup','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 10, 'npc', 'Hope they play your favorite.', '好きな曲やってくれるといいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 11, 'user', 'If we cheer, they''ll do an {encore}!', '盛り上がればアンコールしてくれる！', 'encore', (SELECT id FROM vocab_senses WHERE slug='encore.n.extra'), ARRAY['encore','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 12, 'npc', 'Let''s sing loud!', '大声で歌おう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 13, 'user', 'It''ll be epic.', '最高になるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 14, 'npc', 'See you there, {{user_name}}!', '現地でね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 0, 'npc', 'The summer festival is this weekend!', '夏フェスは今週末！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 1, 'user', 'I''ve never been to a music {festival} abroad.', '海外の音楽フェスは初めて。', 'festival', (SELECT id FROM vocab_senses WHERE slug='festival.n.event'), ARRAY['festival','crowd','queue','venue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 2, 'npc', 'It''s massive, three stages.', '巨大だよ、ステージ3つ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 3, 'user', 'The {lineup} looks incredible.', '出演陣がすごそう。', 'lineup', (SELECT id FROM vocab_senses WHERE slug='lineup.n.acts'), ARRAY['lineup','crowd','queue','venue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 4, 'npc', 'Some acts are secret.', '一部の出演は当日発表。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 5, 'user', 'The {crowd} will go wild for those.', 'それにはみんな大盛り上がりだね。', 'crowd', (SELECT id FROM vocab_senses WHERE slug='crowd.n.people'), ARRAY['crowd','festival','queue','venue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 6, 'npc', 'Bring water; it''s hot.', '水を持ってきて、暑いから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 7, 'user', 'And the {queue} for drinks is huge.', 'それに飲み物の列がすごく長い。', 'queue', (SELECT id FROM vocab_senses WHERE slug='queue.n.line'), ARRAY['queue','festival','crowd','venue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 8, 'npc', 'A friend gave us special passes.', '友達が特別パスをくれたんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 9, 'user', 'No way, can we go {backstage}?', 'まさか、舞台裏に行けるの？', 'backstage', (SELECT id FROM vocab_senses WHERE slug='backstage.adv.behind'), ARRAY['backstage','festival','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 10, 'npc', 'Yes, to meet a band!', 'うん、バンドに会えるよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 11, 'user', 'Amazing. Is the {venue} easy to reach?', 'すごい。会場は行きやすい？', 'venue', (SELECT id FROM vocab_senses WHERE slug='venue.n.place'), ARRAY['venue','festival','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 12, 'npc', 'Shuttle buses run all day.', 'シャトルバスが一日中出てる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 13, 'user', 'This will be unforgettable.', '忘れられない体験になる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 14, 'npc', 'Let''s go early!', '早めに行こう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 0, 'npc', 'Let''s plan the product launch party.', '製品発表パーティーを計画しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 1, 'user', 'We need a stylish {venue} for two hundred.', '200人向けのおしゃれな会場が要る。', 'venue', (SELECT id FROM vocab_senses WHERE slug='venue.n.place'), ARRAY['venue','crowd','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 2, 'npc', 'Expecting a big turnout?', '大勢来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 3, 'user', 'Yes, a big {crowd} of press and clients.', 'うん、報道とクライアントで大勢。', 'crowd', (SELECT id FROM vocab_senses WHERE slug='crowd.n.people'), ARRAY['crowd','venue','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 4, 'npc', 'How do we manage entry?', '入場はどう管理する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 5, 'user', 'A guest list to avoid a long {queue}.', '長い列を避けるためゲストリストで。', 'queue', (SELECT id FROM vocab_senses WHERE slug='queue.n.line'), ARRAY['queue','venue','crowd','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 6, 'npc', 'Any entertainment?', '余興は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 7, 'user', 'A {lineup} of speakers and a live band.', 'スピーカー陣とライブバンドの出演。', 'lineup', (SELECT id FROM vocab_senses WHERE slug='lineup.n.acts'), ARRAY['lineup','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 8, 'npc', 'Where do performers wait?', '出演者はどこで待つ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 9, 'user', 'We''ll set up a {backstage} area for them.', '彼ら用に舞台裏エリアを用意する。', 'backstage', (SELECT id FROM vocab_senses WHERE slug='backstage.adv.behind'), ARRAY['backstage','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 10, 'npc', 'Could we tie it to the city festival?', '街のフェスに合わせられる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 11, 'user', 'Good idea, during the {festival} week for buzz.', 'いいね、話題づくりにフェスの週に。', 'festival', (SELECT id FROM vocab_senses WHERE slug='festival.n.event'), ARRAY['festival','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 12, 'npc', 'Let''s lock the date.', '日程を確定しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 13, 'user', 'I''ll contact venues today.', '今日会場に連絡するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);
