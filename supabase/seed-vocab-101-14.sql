-- ============================================================================
-- Vocab 101: Lesson 14 (new): "Weather"  (Unit 11, Weather and seasons)
-- ----------------------------------------------------------------------------
-- Words: hot, cold, rain, sunny, warm, outside, wind, umbrella. All new.
-- American spelling, no em-dashes. Parked (published=FALSE) until Unit 11 fills
-- out. Reuses (played only): nice, today, tomorrow.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('weather', 'Weather', '天気', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('hot',      'hot',      '/hɑːt/',       '/hɒt/',        250, 1, FALSE, NULL),
  ('cold',     'cold',     '/koʊld/',      '/kəʊld/',      250, 1, FALSE, NULL),
  ('rain',     'rain',     '/reɪn/',       '/reɪn/',       400, 1, FALSE, NULL),
  ('sunny',    'sunny',    '/ˈsʌni/',      '/ˈsʌni/',      700, 2, FALSE, NULL),
  ('warm',     'warm',     '/wɔːrm/',      '/wɔːm/',       450, 1, FALSE, NULL),
  ('outside',  'outside',  '/ˌaʊtˈsaɪd/',  '/ˌaʊtˈsaɪd/',  400, 1, FALSE, NULL),
  ('wind',     'wind',     '/wɪnd/',       '/wɪnd/',       550, 2, FALSE, NULL),
  ('umbrella', 'umbrella', '/ʌmˈbrelə/',   '/ʌmˈbrelə/',   750, 2, FALSE, 'アンブレラ。/ʌmˈbrelə/。強勢は真ん中。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='hot'),      'hot.adj.temp',     1, TRUE, 'adjective', '暑い', 'having a high temperature', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cold'),     'cold.adj.chilly',  1, TRUE, 'adjective', '寒い', 'having a low temperature', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='rain'),     'rain.n.drops',     1, TRUE, 'noun',      '雨',       'water that falls from the clouds', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sunny'),    'sunny.adj.bright', 1, TRUE, 'adjective', '晴れた',   'with a lot of sun', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='warm'),     'warm.adj.mild',    1, TRUE, 'adjective', '暖かい',   'a little hot, in a pleasant way', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='outside'),  'outside.adv.out',  1, TRUE, 'adverb',    '外で', 'not inside a building', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wind'),     'wind.n.air',       1, TRUE, 'noun',      '風',       'air moving outside', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='umbrella'), 'umbrella.n.rain',  1, TRUE, 'noun',      '傘',       'a thing you hold over you in the rain', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('hot','cold','rain','sunny','warm','outside','wind','umbrella')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='hot.adj.temp'),    (SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), (SELECT id FROM vocab_senses WHERE slug='hot.adj.temp'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='warm.adj.mild'),   NULL, 'hot', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='weather'
WHERE s.slug IN ('hot.adj.temp','cold.adj.chilly','rain.n.drops','sunny.adj.bright','warm.adj.mild','outside.adv.out','wind.n.air','umbrella.n.rain')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-14', 11, 1, (SELECT id FROM vocab_categories WHERE slug='weather'), 'Weather', '天気', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-14'), s.id, x.ord
FROM (VALUES
  ('hot.adj.temp',0),('cold.adj.chilly',1),('rain.n.drops',2),('sunny.adj.bright',3),
  ('warm.adj.mild',4),('outside.adv.out',5),('wind.n.air',6),('umbrella.n.rain',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-14'), 'conversation', 0, 'Small talk',           '天気の話',       'park',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-14'), 'travel',       1, 'Asking a local',       '地元の人に聞く', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-14'), 'business',     2, 'An event may change',  '予定が変わるかも', 'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 0, 'npc',  'Beautiful day, isn''t it?',              'いい天気だね。',                     NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 1, 'user', 'Yes! It''s so {sunny}, not a single cloud.',           'うん！雲一つなくて、よく晴れてる。',         'sunny', (SELECT id FROM vocab_senses WHERE slug='sunny.adj.bright'), ARRAY['windy','cloudy','sunny','rainy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 2, 'npc',  'I know. It''s a little {hot} for me, I''m sweating.','だね。私にはちょっと暑くて、汗ばむよ。', 'hot', (SELECT id FROM vocab_senses WHERE slug='hot.adj.temp'), ARRAY['late','hot','near','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 3, 'user', 'Really? I think it''s pleasantly {warm}, not cold at all.', '本当？ちょうどよく暖かくて、全然寒くないよ。','warm', (SELECT id FROM vocab_senses WHERE slug='warm.adj.mild'), ARRAY['busy','warm','cold','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 4, 'npc',  'Ha, maybe. Yesterday was freezing {cold}; I wore my coat.',    'はは、かもね。昨日は凍えるほど寒くて、コートを着た。','cold', (SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), ARRAY['easy','free','hot','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 5, 'user', 'True! I like this weather much better.',  '確かに！今日の方がずっといいな。',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 6, 'npc',  'Same. Let''s sit and enjoy it.',         'だね。座って楽しもう。',             NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 0, 'npc',  'Enjoying your trip so far?',             '旅行は楽しんでる？',                 NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 1, 'user', 'Yes! Will there be {rain} tomorrow? I''d better pack an umbrella.',    'うん！明日は雨が降る？傘を用意しなきゃ。',         'rain', (SELECT id FROM vocab_senses WHERE slug='rain.n.drops'), ARRAY['snow','sun','wind','rain']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 2, 'npc',  'Maybe in the evening. Bring an {umbrella} so you stay dry.','夕方はあるかも。濡れないように傘を持って。', 'umbrella', (SELECT id FROM vocab_senses WHERE slug='umbrella.n.rain'), ARRAY['coat','bag','map','umbrella']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 3, 'user', 'Good idea. Is it usually {sunny} here, or grey and cloudy?',  'いいね。ここは普段晴れてる？それとも曇りがち？',     'sunny', (SELECT id FROM vocab_senses WHERE slug='sunny.adj.bright'), ARRAY['sunny','cold','rainy','late']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 4, 'npc',  'Most days, yes. Great for walking.',     'たいていはね。散歩にいいよ。',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 5, 'user', 'Perfect. I love being {outside} in the fresh air.',       '最高。外の新鮮な空気が好きなんだ。',     'outside', (SELECT id FROM vocab_senses WHERE slug='outside.adv.out'), ARRAY['alone','outside','busy','inside']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 6, 'npc',  'Then you''ll love this town!',           'ならこの町を気に入るよ！',           NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 0, 'npc',  'Did you hear? The outdoor event might change.','聞いた？屋外イベントが変わるかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 1, 'user', 'Oh no. Is it the {rain}? It''s pouring outside.',               'えっ。雨のせい？外は土砂降り。',                   'rain', (SELECT id FROM vocab_senses WHERE slug='rain.n.drops'), ARRAY['sun','rain','heat','snow']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 2, 'npc',  'Partly. And the {wind} is strong; it''s blowing hats off.','半分は。それに風が強くて、帽子が飛ばされる。',   'wind', (SELECT id FROM vocab_senses WHERE slug='wind.n.air'), ARRAY['wind','floor','sun','street']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 3, 'user', 'That''s a shame. It''s also freezing {cold}; I can see my breath.',  '残念。しかも凍えるほど寒くて、息が白い。',         'cold', (SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), ARRAY['cold','free','hot','easy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 4, 'npc',  'Right. In this weather we shouldn''t meet {outside}.','ですね。この天気だと外で集まらない方が。','outside', (SELECT id FROM vocab_senses WHERE slug='outside.adv.out'), ARRAY['early','late','outside','inside']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 5, 'user', 'Agreed. Let''s move it indoors.',        '賛成。室内に移そう。',               NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 6, 'npc',  'I''ll email everyone now.',              '今みんなにメールするね。',           NULL, NULL, NULL);
