-- ============================================================================
-- Vocab 101: Lesson 33 (A2): "Seasons"  (Unit 11, Weather and seasons)
-- ----------------------------------------------------------------------------
-- Words (all new): summer, winter, spring, autumn, snow, cloudy, coat, season.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('seasons', 'Seasons', '季節', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('summer', 'summer', NULL, NULL, NULL, 2, FALSE, NULL),
  ('winter', 'winter', NULL, NULL, NULL, 2, FALSE, NULL),
  ('spring', 'spring', NULL, NULL, NULL, 2, FALSE, NULL),
  ('autumn', 'autumn', NULL, NULL, NULL, 2, FALSE, NULL),
  ('snow', 'snow', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cloudy', 'cloudy', NULL, NULL, NULL, 2, FALSE, NULL),
  ('coat', 'coat', NULL, NULL, NULL, 2, FALSE, NULL),
  ('season', 'season', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='summer'), 'summer.n.season', 1, TRUE, 'noun', '夏', 'the warmest season of the year', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='winter'), 'winter.n.season', 1, TRUE, 'noun', '冬', 'the coldest season of the year', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spring'), 'spring.n.season', 1, TRUE, 'noun', '春', 'the season when plants start to grow', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='autumn'), 'autumn.n.season', 1, TRUE, 'noun', '秋', 'the season when leaves fall', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='snow'), 'snow.n.weather', 1, TRUE, 'noun', '雪', 'soft white pieces of frozen water that fall', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cloudy'), 'cloudy.adj.sky', 1, TRUE, 'adjective', '曇りの', 'with many clouds in the sky', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='coat'), 'coat.n.clothes', 1, TRUE, 'noun', 'コート', 'a warm outer piece of clothing', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='season'), 'season.n.time', 1, TRUE, 'noun', '季節', 'one of the four parts of the year', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('summer','winter','spring','autumn','snow','cloudy','coat','season')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='seasons'
WHERE s.slug IN ('summer.n.season','winter.n.season','spring.n.season','autumn.n.season','snow.n.weather','cloudy.adj.sky','coat.n.clothes','season.n.time')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-33', 11, 2, (SELECT id FROM vocab_categories WHERE slug='seasons'), 'Seasons', '季節', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-33'), s.id, x.ord
FROM (VALUES
  ('summer.n.season',0),('winter.n.season',1),('spring.n.season',2),('autumn.n.season',3),('snow.n.weather',4),('cloudy.adj.sky',5),('coat.n.clothes',6),('season.n.time',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-33'), 'conversation', 0, 'Favorite season', '好きな季節', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-33'), 'travel', 1, 'When to visit', 'いつ行く？', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-33'), 'business', 2, 'Seasonal planning', '季節の計画', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 0, 'npc', 'What''s your favorite {season}, summer or winter?', '好きな季節は？夏、それとも冬？', 'season', (SELECT id FROM vocab_senses WHERE slug='season.n.time'), ARRAY['month','season','weather','day']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 1, 'user', 'Definitely {summer}. I love the beach.', '絶対夏。海が大好き。', 'summer', (SELECT id FROM vocab_senses WHERE slug='summer.n.season'), ARRAY['spring','summer','winter','autumn']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 2, 'npc', 'Not {winter}, with all the snow?', '雪の多い冬じゃないの？', 'winter', (SELECT id FROM vocab_senses WHERE slug='winter.n.season'), ARRAY['autumn','spring','summer','winter']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 3, 'user', 'Too cold! But white {snow} is pretty.', '寒すぎ！でも白い雪はきれい。', 'snow', (SELECT id FROM vocab_senses WHERE slug='snow.n.weather'), ARRAY['snow','rain','sun','wind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 4, 'npc', 'True. Snowball fights are fun.', '確かに。雪合戦は楽しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 5, 'user', 'Ha, sometimes!', 'はは、時々ね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 6, 'npc', 'Summer it is for you.', '君は夏派だね。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 0, 'npc', 'When''s the best {season} to visit, spring or autumn?', '訪れるのに一番いい季節は？春か秋？', 'season', (SELECT id FROM vocab_senses WHERE slug='season.n.time'), ARRAY['season','day','weather','month']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 1, 'user', 'Is {spring} nice here, when the flowers bloom?', '花が咲く春はここではいい？', 'spring', (SELECT id FROM vocab_senses WHERE slug='spring.n.season'), ARRAY['spring','winter','autumn','summer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 2, 'npc', 'Very! {autumn} is beautiful too, with the red leaves.', 'とても！紅葉の秋もきれいだよ。', 'autumn', (SELECT id FROM vocab_senses WHERE slug='autumn.n.season'), ARRAY['winter','summer','spring','autumn']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 3, 'user', 'And the weather?', '天気は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 4, 'npc', 'Mild, though the sky is sometimes grey and {cloudy}.', '穏やか、でも時々空が灰色に曇る。', 'cloudy', (SELECT id FROM vocab_senses WHERE slug='cloudy.adj.sky'), ARRAY['cloudy','sunny','rainy','windy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 5, 'user', 'Perfect for walking.', '散歩にぴったり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 6, 'npc', 'Bring a light jacket.', '薄手のジャケットを持ってきて。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 0, 'npc', 'Let''s schedule the {winter} launch, around December.', '12月ごろ、冬の発売を予定しよう。', 'winter', (SELECT id FROM vocab_senses WHERE slug='winter.n.season'), ARRAY['autumn','summer','winter','spring']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 1, 'user', 'Good. But heavy {snow} could block the roads.', 'いいね。でも大雪で道がふさがるかも。', 'snow', (SELECT id FROM vocab_senses WHERE slug='snow.n.weather'), ARRAY['rain','sun','snow','wind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 2, 'npc', 'True. Start before the sky turns grey and {cloudy}?', '確かに。空が灰色に曇る前に始める？', 'cloudy', (SELECT id FROM vocab_senses WHERE slug='cloudy.adj.sky'), ARRAY['windy','cloudy','sunny','rainy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 3, 'user', 'Yes. Order warm {coat}s for the staff early.', 'うん。スタッフ用の暖かいコートも早めに。', 'coat', (SELECT id FROM vocab_senses WHERE slug='coat.n.clothes'), ARRAY['hat','bag','coat','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 4, 'npc', 'Good thinking.', 'いい考え。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 5, 'user', 'I''ll draft a timeline.', '予定表を作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 6, 'npc', 'Thanks.', 'ありがとう。', NULL, NULL, NULL);
