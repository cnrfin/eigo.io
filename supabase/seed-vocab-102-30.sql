-- ============================================================================
-- Vocab 102: vocab-102-30 - Food talk  (Unit 10)
-- Words: eat out, heat up, cut up, wash up, snack, craving, starving, tasty.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('food-talk', 'Food talk', '食べ物の話', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('eat out', 'eat out', '/ˌiːt ˈaʊt/', '/ˌiːt ˈaʊt/', NULL, 3, FALSE, NULL),
  ('heat up', 'heat up', '/ˌhiːt ˈʌp/', '/ˌhiːt ˈʌp/', NULL, 3, FALSE, NULL),
  ('cut up', 'cut up', '/ˌkʌt ˈʌp/', '/ˌkʌt ˈʌp/', NULL, 3, FALSE, NULL),
  ('wash up', 'wash up', '/ˌwɑːʃ ˈʌp/', '/ˌwɒʃ ˈʌp/', NULL, 3, FALSE, NULL),
  ('snack', 'snack', '/snæk/', '/snæk/', NULL, 3, FALSE, NULL),
  ('craving', 'craving', '/ˈkreɪvɪŋ/', '/ˈkreɪvɪŋ/', NULL, 4, FALSE, NULL),
  ('starving', 'starving', '/ˈstɑːrvɪŋ/', '/ˈstɑːvɪŋ/', NULL, 4, FALSE, NULL),
  ('tasty', 'tasty', '/ˈteɪsti/', '/ˈteɪsti/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='eat out'), 'eat-out.phrv.dine', 1, TRUE, 'phrasal verb', '外食する', 'to eat at a restaurant rather than at home', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='heat up'), 'heat-up.phrv.warm', 1, TRUE, 'phrasal verb', '温め直す', 'to make food warm again', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cut up'), 'cut-up.phrv.slice', 1, TRUE, 'phrasal verb', '切り分ける', 'to cut something into smaller pieces', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wash up'), 'wash-up.phrv.clean', 1, TRUE, 'phrasal verb', '皿を洗う', 'to wash the dishes after a meal', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='snack'), 'snack.n.food', 1, TRUE, 'noun', '軽食', 'a small amount of food eaten between meals', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='craving'), 'craving.n.desire', 1, TRUE, 'noun', '無性に食べたい気持ち', 'a strong wish to eat a particular food', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='starving'), 'starving.adj.hungry', 1, TRUE, 'adjective', '腹ぺこの', 'extremely hungry', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tasty'), 'tasty.adj.delicious', 1, TRUE, 'adjective', 'おいしい', 'having a good taste', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('eat out', 'heat up', 'cut up', 'wash up', 'snack', 'craving', 'starving', 'tasty')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='food-talk'
WHERE s.slug IN ('eat-out.phrv.dine', 'heat-up.phrv.warm', 'cut-up.phrv.slice', 'wash-up.phrv.clean', 'snack.n.food', 'craving.n.desire', 'starving.adj.hungry', 'tasty.adj.delicious')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-30', 10, 2, (SELECT id FROM vocab_categories WHERE slug='food-talk'), 'Food talk', '食べ物の話', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-30'), s.id, x.ord FROM (VALUES
  ('eat-out.phrv.dine',0),('heat-up.phrv.warm',1),('cut-up.phrv.slice',2),('wash-up.phrv.clean',3),('snack.n.food',4),('craving.n.desire',5),('starving.adj.hungry',6),('tasty.adj.delicious',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-30'), 'conversation', 0, 'Hungry after work', '仕事のあと空腹', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-30'), 'travel', 1, 'Self-catering at a hostel', 'ホステルで自炊', 'hostel', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-30'), 'business', 2, 'Office lunch', 'オフィスランチ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 0, 'npc', 'I''m so hungry after that shift.', 'あのシフトのあと、すごく空腹。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 1, 'user', 'Me too, I''m absolutely {starving}.', '私も、完全に腹ぺこ。', 'starving', (SELECT id FROM vocab_senses WHERE slug='starving.adj.hungry'), ARRAY['starving','tasty','snack','craving']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 2, 'npc', 'Cook or go out?', '作る？それとも外食？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 3, 'user', 'Let''s {eat out}; I don''t want to cook.', '外食しよう、料理したくない。', 'eat out', (SELECT id FROM vocab_senses WHERE slug='eat-out.phrv.dine'), ARRAY['eat out','heat up','cut up','wash up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 4, 'npc', 'Any cravings?', '何か食べたいものある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 5, 'user', 'I have a real {craving} for pizza.', 'ピザが無性に食べたい。', 'craving', (SELECT id FROM vocab_senses WHERE slug='craving.n.desire'), ARRAY['craving','snack','starving','tasty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 6, 'npc', 'Pizza it is! Or leftovers at home?', 'ピザだね！それとも家の残り物？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 7, 'user', 'We could just {heat up} last night''s pasta.', '昨夜のパスタを温め直してもいいね。', 'heat up', (SELECT id FROM vocab_senses WHERE slug='heat-up.phrv.warm'), ARRAY['heat up','cut up','wash up','eat out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 8, 'npc', 'True, that was delicious.', '確かに、あれ美味しかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 9, 'user', 'It was so {tasty}, even better reheated.', 'すごくおいしかった、温め直すともっといい。', 'tasty', (SELECT id FROM vocab_senses WHERE slug='tasty.adj.delicious'), ARRAY['tasty','snack','starving','craving']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 10, 'npc', 'Let''s do that and save money.', 'それにして節約しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 11, 'user', 'And grab a {snack} now to hold us over.', '今は軽食でつなごう。', 'snack', (SELECT id FROM vocab_senses WHERE slug='snack.n.food'), ARRAY['snack','craving','starving','tasty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 12, 'npc', 'Smart plan.', 'いい考え。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 13, 'user', 'Food in ten minutes!', '10分でごはん！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='conversation'), 14, 'npc', 'You''re a hero, {{user_name}}.', '救世主だね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 0, 'npc', 'The hostel kitchen is free tonight.', '今夜はホステルのキッチンが空いてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 1, 'user', 'Perfect, I''m {starving} after the hike.', '完璧、ハイキングのあと腹ぺこ。', 'starving', (SELECT id FROM vocab_senses WHERE slug='starving.adj.hungry'), ARRAY['starving','tasty','snack','craving']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 2, 'npc', 'Let''s make a quick salad.', 'さっとサラダを作ろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 3, 'user', 'I''ll {cut up} the tomatoes and cucumber.', 'トマトときゅうりを切り分けるね。', 'cut up', (SELECT id FROM vocab_senses WHERE slug='cut-up.phrv.slice'), ARRAY['cut up','wash up','heat up','eat out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 4, 'npc', 'And the soup from yesterday?', '昨日のスープは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 5, 'user', 'I''ll {heat up} the soup on the stove.', 'スープをコンロで温め直す。', 'heat up', (SELECT id FROM vocab_senses WHERE slug='heat-up.phrv.warm'), ARRAY['heat up','cut up','wash up','eat out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 6, 'npc', 'Smells good already.', 'もういい匂い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 7, 'user', 'It''ll be simple but {tasty}.', 'シンプルだけどおいしいよ。', 'tasty', (SELECT id FROM vocab_senses WHERE slug='tasty.adj.delicious'), ARRAY['tasty','snack','starving','craving']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 8, 'npc', 'Should we go out instead?', 'やっぱり外に食べに行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 9, 'user', 'No, let''s not {eat out} tonight; save cash.', 'ううん、今夜は外食しない、節約。', 'eat out', (SELECT id FROM vocab_senses WHERE slug='eat-out.phrv.dine'), ARRAY['eat out','heat up','cut up','wash up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 10, 'npc', 'Agreed. I''ll clean after.', '賛成。あとで片付けるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 11, 'user', 'Thanks, I''ll {wash up} the pots.', 'ありがとう、鍋は私が洗うね。', 'wash up', (SELECT id FROM vocab_senses WHERE slug='wash-up.phrv.clean'), ARRAY['wash up','cut up','heat up','eat out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 12, 'npc', 'Teamwork!', 'チームワーク！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 13, 'user', 'Dinner''s ready!', '夕飯できた！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='travel'), 14, 'npc', 'Looks great!', 'おいしそう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 0, 'npc', 'Team lunch today, in or out?', '今日のランチ、社内？外？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 1, 'user', 'Let''s {eat out} for a change.', 'たまには外食しよう。', 'eat out', (SELECT id FROM vocab_senses WHERE slug='eat-out.phrv.dine'), ARRAY['eat out','heat up','cut up','wash up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 2, 'npc', 'Everyone''s busy, though.', 'でもみんな忙しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 3, 'user', 'True, maybe just {heat up} lunches at desks.', '確かに、じゃあ席で温めるだけにしよう。', 'heat up', (SELECT id FROM vocab_senses WHERE slug='heat-up.phrv.warm'), ARRAY['heat up','cut up','wash up','eat out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 4, 'npc', 'I brought a big salad to share.', '大きなサラダをシェア用に持ってきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 5, 'user', 'I''ll {cut up} some bread to go with it.', '合わせるパンを切り分けるよ。', 'cut up', (SELECT id FROM vocab_senses WHERE slug='cut-up.phrv.slice'), ARRAY['cut up','wash up','heat up','eat out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 6, 'npc', 'Anyone want something sweet?', '甘いもの欲しい人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 7, 'user', 'I''ve got a {craving} for chocolate.', 'チョコが無性に食べたい。', 'craving', (SELECT id FROM vocab_senses WHERE slug='craving.n.desire'), ARRAY['craving','snack','starving','tasty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 8, 'npc', 'There are cookies in the kitchen.', 'キッチンにクッキーがあるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 9, 'user', 'Perfect, a little {snack} for the afternoon.', '完璧、午後の軽食に。', 'snack', (SELECT id FROM vocab_senses WHERE slug='snack.n.food'), ARRAY['snack','craving','starving','tasty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 10, 'npc', 'This salad is great, by the way.', 'ところでこのサラダ最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 11, 'user', 'So {tasty}! You should share the recipe.', 'すごくおいしい！レシピ教えて。', 'tasty', (SELECT id FROM vocab_senses WHERE slug='tasty.adj.delicious'), ARRAY['tasty','snack','starving','craving']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 12, 'npc', 'I will after lunch.', 'ランチのあとにね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 13, 'user', 'Thanks for bringing it.', '持ってきてくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-30') AND goal='business'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);
