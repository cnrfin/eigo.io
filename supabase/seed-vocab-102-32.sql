-- ============================================================================
-- Vocab 102: vocab-102-32 - Weather & climate  (Unit 11)
-- Words: forecast, humid, freezing, storm, thunder, breeze, foggy, mild.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('weather-climate', 'Weather & climate', '天気と気候', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('forecast', 'forecast', '/ˈfɔːrkæst/', '/ˈfɔːkɑːst/', NULL, 4, FALSE, NULL),
  ('humid', 'humid', '/ˈhjuːmɪd/', '/ˈhjuːmɪd/', NULL, 4, FALSE, NULL),
  ('freezing', 'freezing', '/ˈfriːzɪŋ/', '/ˈfriːzɪŋ/', NULL, 3, FALSE, NULL),
  ('storm', 'storm', '/stɔːrm/', '/stɔːm/', NULL, 3, FALSE, NULL),
  ('thunder', 'thunder', '/ˈθʌndər/', '/ˈθʌndə/', NULL, 3, FALSE, NULL),
  ('breeze', 'breeze', '/briːz/', '/briːz/', NULL, 4, FALSE, NULL),
  ('foggy', 'foggy', '/ˈfɑːɡi/', '/ˈfɒɡi/', NULL, 4, FALSE, NULL),
  ('mild', 'mild', '/maɪld/', '/maɪld/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='forecast'), 'forecast.n.prediction', 1, TRUE, 'noun', '予報', 'a statement of what the weather will be', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='humid'), 'humid.adj.damp', 1, TRUE, 'adjective', '蒸し暑い', 'having a lot of moisture in the air; sticky', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='freezing'), 'freezing.adj.cold', 1, TRUE, 'adjective', '凍えるほど寒い', 'extremely cold', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='storm'), 'storm.n.weather', 1, TRUE, 'noun', '嵐', 'very bad weather with strong wind and rain', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='thunder'), 'thunder.n.sound', 1, TRUE, 'noun', '雷（の音）', 'the loud noise you hear during a storm', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='breeze'), 'breeze.n.wind', 1, TRUE, 'noun', 'そよ風', 'a light, gentle wind', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='foggy'), 'foggy.adj.misty', 1, TRUE, 'adjective', '霧の', 'full of thick cloud near the ground; hard to see', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mild'), 'mild.adj.gentle', 1, TRUE, 'adjective', '穏やかな', 'not too hot and not too cold', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('forecast', 'humid', 'freezing', 'storm', 'thunder', 'breeze', 'foggy', 'mild')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='weather-climate'
WHERE s.slug IN ('forecast.n.prediction', 'humid.adj.damp', 'freezing.adj.cold', 'storm.n.weather', 'thunder.n.sound', 'breeze.n.wind', 'foggy.adj.misty', 'mild.adj.gentle')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-32', 11, 1, (SELECT id FROM vocab_categories WHERE slug='weather-climate'), 'Weather & climate', '天気と気候', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-32'), s.id, x.ord FROM (VALUES
  ('forecast.n.prediction',0),('humid.adj.damp',1),('freezing.adj.cold',2),('storm.n.weather',3),('thunder.n.sound',4),('breeze.n.wind',5),('foggy.adj.misty',6),('mild.adj.gentle',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-32'), 'conversation', 0, 'Weather chat', '天気の話', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-32'), 'travel', 1, 'Weather on a hike', 'ハイキングの天気', 'mountain', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-32'), 'business', 2, 'An outdoor event', '屋外イベント', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 0, 'npc', 'What''s the weather like today?', '今日の天気どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 1, 'user', 'The {forecast} says rain later.', '予報だと後で雨。', 'forecast', (SELECT id FROM vocab_senses WHERE slug='forecast.n.prediction'), ARRAY['forecast','breeze','thunder','storm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 2, 'npc', 'Ugh. It''s sticky outside.', 'うわ。外はじめじめ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 3, 'user', 'So {humid}; my shirt is stuck to me.', 'すごく蒸し暑い、シャツが張り付く。', 'humid', (SELECT id FROM vocab_senses WHERE slug='humid.adj.damp'), ARRAY['humid','freezing','foggy','mild']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 4, 'npc', 'Is a big one coming?', '大きいのが来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 5, 'user', 'Yeah, a {storm} tonight, they say.', 'うん、今夜嵐だって。', 'storm', (SELECT id FROM vocab_senses WHERE slug='storm.n.weather'), ARRAY['storm','breeze','forecast','thunder']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 6, 'npc', 'I hate the loud sky.', '雷の音が苦手。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 7, 'user', 'The {thunder} scares my dog.', '雷でうちの犬が怖がる。', 'thunder', (SELECT id FROM vocab_senses WHERE slug='thunder.n.sound'), ARRAY['thunder','breeze','forecast','storm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 8, 'npc', 'At least there''s some air now.', '今は少し風があるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 9, 'user', 'Yes, a nice cool {breeze}.', 'うん、いい涼しいそよ風。', 'breeze', (SELECT id FROM vocab_senses WHERE slug='breeze.n.wind'), ARRAY['breeze','storm','thunder','forecast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 10, 'npc', 'Winter was brutal, though.', 'でも冬はきつかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 11, 'user', 'So {freezing}; I couldn''t feel my hands.', '凍えるほど寒くて、手の感覚がなかった。', 'freezing', (SELECT id FROM vocab_senses WHERE slug='freezing.adj.cold'), ARRAY['freezing','humid','foggy','mild']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 12, 'npc', 'I prefer summer.', '夏の方が好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 13, 'user', 'Same here.', '私も。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='conversation'), 14, 'npc', 'Stay dry tonight, {{user_name}}.', '今夜は濡れないでね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 0, 'npc', 'Ready for the mountain hike?', '山のハイキングの準備はいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 1, 'user', 'Almost. What''s the {forecast}?', 'もう少し。予報は？', 'forecast', (SELECT id FROM vocab_senses WHERE slug='forecast.n.prediction'), ARRAY['forecast','breeze','thunder','storm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 2, 'npc', 'Clear, but visibility is low early.', '晴れ、でも朝は視界が悪いです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 3, 'user', 'Is it {foggy} at the top?', '頂上は霧ですか？', 'foggy', (SELECT id FROM vocab_senses WHERE slug='foggy.adj.misty'), ARRAY['foggy','humid','freezing','mild']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 4, 'npc', 'In the morning, yes.', '朝はそうですね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 5, 'user', 'I hope it''s {mild}, not too cold.', '穏やかだといいな、寒すぎず。', 'mild', (SELECT id FROM vocab_senses WHERE slug='mild.adj.gentle'), ARRAY['mild','humid','freezing','foggy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 6, 'npc', 'Pleasant, around twenty degrees.', '快適です、20度くらい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 7, 'user', 'Lovely. A light {breeze} would be nice.', 'いいですね。軽いそよ風があるといい。', 'breeze', (SELECT id FROM vocab_senses WHERE slug='breeze.n.wind'), ARRAY['breeze','storm','thunder','forecast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 8, 'npc', 'There usually is up high.', '高い所にはたいていありますよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 9, 'user', 'Good, the valley felt so {humid}.', 'よかった、谷はすごく蒸し暑かった。', 'humid', (SELECT id FROM vocab_senses WHERE slug='humid.adj.damp'), ARRAY['humid','freezing','foggy','mild']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 10, 'npc', 'The mountain air is fresher.', '山の空気の方が新鮮です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 11, 'user', 'No {storm} risk today, right?', '今日は嵐の心配はないですよね？', 'storm', (SELECT id FROM vocab_senses WHERE slug='storm.n.weather'), ARRAY['storm','breeze','thunder','forecast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 12, 'npc', 'None at all. Perfect day.', '全くなし。最高の日です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 13, 'user', 'Let''s set off!', '出発しましょう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='travel'), 14, 'npc', 'Beautiful views ahead!', 'この先いい景色ですよ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 0, 'npc', 'The company picnic is Saturday.', '会社のピクニックは土曜。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 1, 'user', 'Have you checked the {forecast}?', '予報は確認した？', 'forecast', (SELECT id FROM vocab_senses WHERE slug='forecast.n.prediction'), ARRAY['forecast','breeze','thunder','storm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 2, 'npc', 'Looks uncertain.', '微妙みたい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 3, 'user', 'If there''s a {storm}, we need a backup tent.', '嵐なら、予備のテントが要る。', 'storm', (SELECT id FROM vocab_senses WHERE slug='storm.n.weather'), ARRAY['storm','breeze','forecast','thunder']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 4, 'npc', 'Good thinking.', 'いい考え。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 5, 'user', 'We must move indoors if we hear {thunder}.', '雷が聞こえたら屋内へ移動しないと。', 'thunder', (SELECT id FROM vocab_senses WHERE slug='thunder.n.sound'), ARRAY['thunder','breeze','forecast','storm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 6, 'npc', 'Safety first. Temperature okay?', '安全第一。気温は大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 7, 'user', 'Should be {mild}, good for outdoors.', '穏やかなはず、屋外にちょうどいい。', 'mild', (SELECT id FROM vocab_senses WHERE slug='mild.adj.gentle'), ARRAY['mild','humid','freezing','foggy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 8, 'npc', 'Not too sticky, I hope.', 'じめじめしすぎないといいけど。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 9, 'user', 'It might be a bit {humid} by noon.', '昼ごろは少し蒸し暑いかも。', 'humid', (SELECT id FROM vocab_senses WHERE slug='humid.adj.damp'), ARRAY['humid','freezing','foggy','mild']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 10, 'npc', 'We''ll bring plenty of water.', '水をたくさん用意しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 11, 'user', 'And jackets in case evening gets {freezing}.', '夜に凍えるほど寒くなる場合に備えて上着も。', 'freezing', (SELECT id FROM vocab_senses WHERE slug='freezing.adj.cold'), ARRAY['freezing','humid','foggy','mild']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 12, 'npc', 'Great planning.', 'いい段取り。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 13, 'user', 'I''ll confirm the tent rental.', 'テントのレンタルを確定するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-32') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
