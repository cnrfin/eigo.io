-- ============================================================================
-- Vocab 103: vocab-103-12 - Emotion idioms  (Unit 6)
-- Words: on edge, over the moon, down in the dumps, mixed feelings, at ease, on cloud nine, lose your cool, get cold feet.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('emotion-idioms', 'Emotion idioms', '感情の言い回し', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('on edge', 'on edge', '/ˌɑːn ˈedʒ/', '/ˌɒn ˈedʒ/', NULL, 5, FALSE, NULL),
  ('over the moon', 'over the moon', '/ˌoʊvər ðə ˈmuːn/', '/ˌəʊvə ðə ˈmuːn/', NULL, 5, FALSE, NULL),
  ('down in the dumps', 'down in the dumps', '/ˌdaʊn ɪn ðə ˈdʌmps/', '/ˌdaʊn ɪn ðə ˈdʌmps/', NULL, 5, FALSE, NULL),
  ('mixed feelings', 'mixed feelings', '/ˌmɪkst ˈfiːlɪŋz/', '/ˌmɪkst ˈfiːlɪŋz/', NULL, 5, FALSE, NULL),
  ('at ease', 'at ease', '/ˌæt ˈiːz/', '/ˌæt ˈiːz/', NULL, 5, FALSE, NULL),
  ('on cloud nine', 'on cloud nine', '/ˌɑːn klaʊd ˈnaɪn/', '/ˌɒn klaʊd ˈnaɪn/', NULL, 5, FALSE, NULL),
  ('lose your cool', 'lose your cool', '/ˌluːz jər ˈkuːl/', '/ˌluːz jə ˈkuːl/', NULL, 5, FALSE, NULL),
  ('get cold feet', 'get cold feet', '/ˌɡet koʊld ˈfiːt/', '/ˌɡet kəʊld ˈfiːt/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='on edge'), 'on-edge.idiom.tense', 1, TRUE, 'idiom', 'ピリピリして', 'nervous and easily upset', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='over the moon'), 'over-the-moon.idiom.thrilled', 1, TRUE, 'idiom', '大喜びで', 'extremely happy about something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='down in the dumps'), 'down-in-dumps.idiom.sad', 1, TRUE, 'idiom', '落ち込んで', 'sad and low in spirits', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mixed feelings'), 'mixed-feelings.idiom.ambivalent', 1, TRUE, 'idiom', '複雑な気持ち', 'both positive and negative feelings at once', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='at ease'), 'at-ease.idiom.relaxed', 1, TRUE, 'idiom', 'くつろいで', 'relaxed and comfortable', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='on cloud nine'), 'on-cloud-nine.idiom.euphoric', 1, TRUE, 'idiom', '有頂天で', 'extremely happy and excited', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lose your cool'), 'lose-your-cool.idiom.angry', 1, TRUE, 'idiom', '冷静さを失う', 'to become angry and lose self-control', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get cold feet'), 'get-cold-feet.idiom.nervous', 1, TRUE, 'idiom', '怖じ気づく', 'to become too nervous to do something planned', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('on edge', 'over the moon', 'down in the dumps', 'mixed feelings', 'at ease', 'on cloud nine', 'lose your cool', 'get cold feet')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='emotion-idioms'
WHERE s.slug IN ('on-edge.idiom.tense', 'over-the-moon.idiom.thrilled', 'down-in-dumps.idiom.sad', 'mixed-feelings.idiom.ambivalent', 'at-ease.idiom.relaxed', 'on-cloud-nine.idiom.euphoric', 'lose-your-cool.idiom.angry', 'get-cold-feet.idiom.nervous')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-12', 6, 1, (SELECT id FROM vocab_categories WHERE slug='emotion-idioms'), 'Emotion idioms', '感情の言い回し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-12'), s.id, x.ord FROM (VALUES
  ('on-edge.idiom.tense',0),('over-the-moon.idiom.thrilled',1),('down-in-dumps.idiom.sad',2),('mixed-feelings.idiom.ambivalent',3),('at-ease.idiom.relaxed',4),('on-cloud-nine.idiom.euphoric',5),('lose-your-cool.idiom.angry',6),('get-cold-feet.idiom.nervous',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-12'), 'conversation', 0, 'Big news', '大きな知らせ', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-12'), 'travel', 1, 'The night before', '旅立ちの前夜', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-12'), 'business', 2, 'Under pressure', 'プレッシャーの中で', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 0, 'npc', 'You got the job! How do you feel?', '仕事決まったね！どんな気分？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 1, 'user', 'I''m {over the moon}, I can''t stop smiling!', '大喜び、笑いが止まらない！', 'over the moon', (SELECT id FROM vocab_senses WHERE slug='over-the-moon.idiom.thrilled'), ARRAY['over the moon','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 2, 'npc', 'You deserve it! Any nerves?', '当然だよ！不安は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 3, 'user', 'A few {mixed feelings}; I''ll miss my old team.', '少し複雑な気持ち、前のチームが恋しくなる。', 'mixed feelings', (SELECT id FROM vocab_senses WHERE slug='mixed-feelings.idiom.ambivalent'), ARRAY['mixed feelings','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 4, 'npc', 'Understandable.', '分かるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 5, 'user', 'I''m a bit {on edge} about the first day.', '初日のことでちょっとピリピリしてる。', 'on edge', (SELECT id FROM vocab_senses WHERE slug='on-edge.idiom.tense'), ARRAY['on edge','over the moon','at ease','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 6, 'npc', 'You''ll settle fast.', 'すぐ慣れるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 7, 'user', 'I hope I don''t {get cold feet} before starting.', '始める前に怖じ気づかないといいけど。', 'get cold feet', (SELECT id FROM vocab_senses WHERE slug='get-cold-feet.idiom.nervous'), ARRAY['get cold feet','over the moon','at ease','mixed feelings']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 8, 'npc', 'You won''t. Remember last month?', '大丈夫。先月のこと覚えてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 9, 'user', 'Yeah, I was so {down in the dumps} then.', 'うん、あの時はすごく落ち込んでた。', 'down in the dumps', (SELECT id FROM vocab_senses WHERE slug='down-in-dumps.idiom.sad'), ARRAY['down in the dumps','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 10, 'npc', 'And now look at you!', 'それが今や！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 11, 'user', 'True, I feel more {at ease} now.', '確かに、今はもっと落ち着いてる。', 'at ease', (SELECT id FROM vocab_senses WHERE slug='at-ease.idiom.relaxed'), ARRAY['at ease','over the moon','on edge','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 12, 'npc', 'Let''s celebrate!', 'お祝いしよう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 13, 'user', 'Yes, please!', 'ぜひ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 14, 'npc', 'So proud of you, {{user_name}}.', '誇らしいよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 0, 'npc', 'Tomorrow''s the big trip!', '明日は待ちに待った旅！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 1, 'user', 'I''m {on cloud nine}, I''ve dreamed of this for years.', '有頂天、何年も夢見てたんだ。', 'on cloud nine', (SELECT id FROM vocab_senses WHERE slug='on-cloud-nine.idiom.euphoric'), ARRAY['on cloud nine','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 2, 'npc', 'Any last-minute doubts?', '直前の迷いは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 3, 'user', 'A little; I hope I don''t {get cold feet} at the airport.', '少し、空港で怖じ気づかないといいけど。', 'get cold feet', (SELECT id FROM vocab_senses WHERE slug='get-cold-feet.idiom.nervous'), ARRAY['get cold feet','over the moon','at ease','mixed feelings']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 4, 'npc', 'You''ll be fine once you board.', '乗ってしまえば大丈夫。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 5, 'user', 'I''m {on edge} about the long flight, though.', 'でも長いフライトでピリピリしてる。', 'on edge', (SELECT id FROM vocab_senses WHERE slug='on-edge.idiom.tense'), ARRAY['on edge','over the moon','at ease','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 6, 'npc', 'Watch a movie, relax.', '映画でも見てリラックス。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 7, 'user', 'Good idea; that''ll put me {at ease}.', 'いいね、それで落ち着ける。', 'at ease', (SELECT id FROM vocab_senses WHERE slug='at-ease.idiom.relaxed'), ARRAY['at ease','over the moon','on edge','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 8, 'npc', 'Excited to leave home?', '家を離れるの、わくわくする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 9, 'user', '{mixed feelings}; I''ll miss my dog.', '複雑、愛犬が恋しくなる。', 'mixed feelings', (SELECT id FROM vocab_senses WHERE slug='mixed-feelings.idiom.ambivalent'), ARRAY['mixed feelings','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 10, 'npc', 'He''ll be waiting when you''re back.', '帰ったら待ってるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 11, 'user', 'True. Overall I''m {over the moon}.', '確かに。全体的には大喜び。', 'over the moon', (SELECT id FROM vocab_senses WHERE slug='over-the-moon.idiom.thrilled'), ARRAY['over the moon','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 12, 'npc', 'Have the time of your life!', '最高の時間を！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 13, 'user', 'I will!', 'うん！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 14, 'npc', 'Send postcards!', '絵葉書送ってね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 0, 'npc', 'The deadline is crushing everyone.', '締め切りでみんな押しつぶされそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 1, 'user', 'The whole team is {on edge} today.', '今日はチーム全体がピリピリしてる。', 'on edge', (SELECT id FROM vocab_senses WHERE slug='on-edge.idiom.tense'), ARRAY['on edge','over the moon','at ease','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 2, 'npc', 'Tempers are short.', 'みんな気が立ってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 3, 'user', 'I nearly did {lose your cool} in the standup.', '朝会で冷静さを失いそうだった。', 'lose your cool', (SELECT id FROM vocab_senses WHERE slug='lose-your-cool.idiom.angry'), ARRAY['lose your cool','at ease','over the moon','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 4, 'npc', 'Take a breather.', '一息ついて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 5, 'user', 'A short walk puts me {at ease}.', '短い散歩で落ち着く。', 'at ease', (SELECT id FROM vocab_senses WHERE slug='at-ease.idiom.relaxed'), ARRAY['at ease','over the moon','on edge','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 6, 'npc', 'Did we win the client, by the way?', 'ところでクライアント取れた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 7, 'user', 'Yes! I''m {over the moon} about it.', 'うん！それについては大喜び。', 'over the moon', (SELECT id FROM vocab_senses WHERE slug='over-the-moon.idiom.thrilled'), ARRAY['over the moon','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 8, 'npc', 'That lifts the mood!', '気分が上がるね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 9, 'user', 'For sure. People were {down in the dumps} last week.', '本当に。先週はみんな落ち込んでた。', 'down in the dumps', (SELECT id FROM vocab_senses WHERE slug='down-in-dumps.idiom.sad'), ARRAY['down in the dumps','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 10, 'npc', 'Feelings about the extra work, though?', 'でも追加業務については？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 11, 'user', 'Honestly, {mixed feelings}; proud but tired.', '正直、複雑、誇らしいけど疲れた。', 'mixed feelings', (SELECT id FROM vocab_senses WHERE slug='mixed-feelings.idiom.ambivalent'), ARRAY['mixed feelings','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 12, 'npc', 'Let''s celebrate briefly, then rest.', '少しお祝いして、休もう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 13, 'user', 'Sounds perfect.', '完璧。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 14, 'npc', 'Well earned, {{user_name}}.', 'よく頑張った、{{user_name}}。', NULL, NULL, NULL);
