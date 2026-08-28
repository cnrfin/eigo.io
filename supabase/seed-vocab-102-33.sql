-- ============================================================================
-- Vocab 102: vocab-102-33 - Environment  (Unit 11)
-- Words: pollution, recycle, waste, litter, climate, sustainable, protect, clean up.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('environment', 'Environment', '環境', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pollution', 'pollution', '/pəˈluːʃn/', '/pəˈluːʃn/', NULL, 3, FALSE, NULL),
  ('recycle', 'recycle', '/ˌriːˈsaɪkl/', '/ˌriːˈsaɪkl/', NULL, 3, FALSE, NULL),
  ('waste', 'waste', '/weɪst/', '/weɪst/', NULL, 3, FALSE, NULL),
  ('litter', 'litter', '/ˈlɪtər/', '/ˈlɪtə/', NULL, 4, FALSE, NULL),
  ('climate', 'climate', '/ˈklaɪmət/', '/ˈklaɪmət/', NULL, 3, FALSE, NULL),
  ('sustainable', 'sustainable', '/səˈsteɪnəbl/', '/səˈsteɪnəbl/', NULL, 4, FALSE, NULL),
  ('protect', 'protect', '/prəˈtekt/', '/prəˈtekt/', NULL, 3, FALSE, NULL),
  ('clean up', 'clean up', '/ˌkliːn ˈʌp/', '/ˌkliːn ˈʌp/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pollution'), 'pollution.n.dirt', 1, TRUE, 'noun', '汚染', 'harmful dirt in the air, water, or land', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='recycle'), 'recycle.v.reuse', 1, TRUE, 'verb', 'リサイクルする', 'to treat used items so they can be used again', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='waste'), 'waste.n.rubbish', 1, TRUE, 'noun', '廃棄物', 'material that is thrown away', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='litter'), 'litter.n.trash', 1, TRUE, 'noun', '（散らかった）ごみ', 'rubbish left in a public place', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='climate'), 'climate.n.weather', 1, TRUE, 'noun', '気候', 'the usual weather of a place over a long time', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sustainable'), 'sustainable.adj.green', 1, TRUE, 'adjective', '持続可能な', 'able to continue without harming the environment', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='protect'), 'protect.v.guard', 1, TRUE, 'verb', '守る', 'to keep something safe from harm', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='clean up'), 'clean-up.phrv.tidy', 1, TRUE, 'phrasal verb', 'きれいに片付ける', 'to remove dirt or rubbish from a place', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pollution', 'recycle', 'waste', 'litter', 'climate', 'sustainable', 'protect', 'clean up')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='environment'
WHERE s.slug IN ('pollution.n.dirt', 'recycle.v.reuse', 'waste.n.rubbish', 'litter.n.trash', 'climate.n.weather', 'sustainable.adj.green', 'protect.v.guard', 'clean-up.phrv.tidy')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-33', 11, 2, (SELECT id FROM vocab_categories WHERE slug='environment'), 'Environment', '環境を守る', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-33'), s.id, x.ord FROM (VALUES
  ('pollution.n.dirt',0),('recycle.v.reuse',1),('waste.n.rubbish',2),('litter.n.trash',3),('climate.n.weather',4),('sustainable.adj.green',5),('protect.v.guard',6),('clean-up.phrv.tidy',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-33'), 'conversation', 0, 'Going green', 'エコな暮らし', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-33'), 'travel', 1, 'An eco reserve', '自然保護区', 'reserve', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-33'), 'business', 2, 'Company sustainability', '会社の環境対策', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 0, 'npc', 'You''re really into eco stuff now.', '最近エコにハマってるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 1, 'user', 'Yeah, I {recycle} everything I can.', 'うん、できるものは全部リサイクルしてる。', 'recycle', (SELECT id FROM vocab_senses WHERE slug='recycle.v.reuse'), ARRAY['recycle','protect','clean up','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 2, 'npc', 'Does it make a difference?', '効果あるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 3, 'user', 'It cuts my household {waste} in half.', '家庭のごみが半分になった。', 'waste', (SELECT id FROM vocab_senses WHERE slug='waste.n.rubbish'), ARRAY['waste','litter','pollution','climate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 4, 'npc', 'Nice. What else do you do?', 'いいね。他には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 5, 'user', 'I help {clean up} the local park on weekends.', '週末に地元の公園を片付けてる。', 'clean up', (SELECT id FROM vocab_senses WHERE slug='clean-up.phrv.tidy'), ARRAY['clean up','recycle','protect','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 6, 'npc', 'That''s kind. Is it messy there?', '偉いね。そこ散らかってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 7, 'user', 'So much {litter} after busy days.', '混んだ日のあとはごみだらけ。', 'litter', (SELECT id FROM vocab_senses WHERE slug='litter.n.trash'), ARRAY['litter','waste','pollution','climate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 8, 'npc', 'People should care more.', 'もっと気にかけるべきだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 9, 'user', 'We all need to {protect} nature.', 'みんなで自然を守らないと。', 'protect', (SELECT id FROM vocab_senses WHERE slug='protect.v.guard'), ARRAY['protect','recycle','clean up','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 10, 'npc', 'The air''s been bad too.', '空気も悪くなってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 11, 'user', 'Yeah, city {pollution} is getting worse.', 'うん、都市の汚染がひどくなってる。', 'pollution', (SELECT id FROM vocab_senses WHERE slug='pollution.n.dirt'), ARRAY['pollution','litter','waste','climate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 12, 'npc', 'Small actions add up.', '小さな行動が積み重なる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 13, 'user', 'Every bit helps.', '少しずつでも効く。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='conversation'), 14, 'npc', 'You inspire me, {{user_name}}.', '刺激をもらうよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 0, 'npc', 'Welcome to our eco reserve.', '自然保護区へようこそ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 1, 'user', 'Amazing. How do you {protect} the wildlife?', 'すごい。どうやって野生動物を守ってるんですか？', 'protect', (SELECT id FROM vocab_senses WHERE slug='protect.v.guard'), ARRAY['protect','recycle','clean up','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 2, 'npc', 'Strict rules and few visitors.', '厳しい規則と少人数制です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 3, 'user', 'Has the {climate} changed the forest?', '気候で森は変わりましたか？', 'climate', (SELECT id FROM vocab_senses WHERE slug='climate.n.weather'), ARRAY['climate','litter','waste','pollution']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 4, 'npc', 'Yes, drier summers each year.', 'はい、毎年夏が乾燥してきています。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 5, 'user', 'Is your tourism {sustainable}?', 'ここの観光は持続可能ですか？', 'sustainable', (SELECT id FROM vocab_senses WHERE slug='sustainable.adj.green'), ARRAY['sustainable','litter','waste','pollution']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 6, 'npc', 'Very. We limit numbers daily.', 'とても。毎日人数を制限しています。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 7, 'user', 'Good. I see no {litter} anywhere.', 'いいですね。ごみが全然ない。', 'litter', (SELECT id FROM vocab_senses WHERE slug='litter.n.trash'), ARRAY['litter','waste','pollution','climate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 8, 'npc', 'Guests carry everything out.', 'お客様が全部持ち帰ります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 9, 'user', 'Do volunteers {clean up} the trails?', 'ボランティアが小道を片付けるんですか？', 'clean up', (SELECT id FROM vocab_senses WHERE slug='clean-up.phrv.tidy'), ARRAY['clean up','recycle','protect','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 10, 'npc', 'Monthly, yes.', 'はい、毎月。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 11, 'user', 'And the river? Any {pollution}?', '川は？汚染はありますか？', 'pollution', (SELECT id FROM vocab_senses WHERE slug='pollution.n.dirt'), ARRAY['pollution','litter','waste','climate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 12, 'npc', 'It''s clean enough to drink.', '飲めるほどきれいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 13, 'user', 'That''s incredible.', '信じられない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='travel'), 14, 'npc', 'Enjoy the reserve!', '保護区を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 0, 'npc', 'We need a greener office plan.', 'もっとエコなオフィス計画が要る。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 1, 'user', 'Let''s set {sustainable} goals for the year.', '今年の持続可能な目標を立てよう。', 'sustainable', (SELECT id FROM vocab_senses WHERE slug='sustainable.adj.green'), ARRAY['sustainable','litter','waste','pollution']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 2, 'npc', 'Where do we start?', 'どこから始める？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 3, 'user', 'First, cut paper {waste} by going digital.', 'まず、デジタル化で紙のごみを減らす。', 'waste', (SELECT id FROM vocab_senses WHERE slug='waste.n.rubbish'), ARRAY['waste','litter','pollution','climate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 4, 'npc', 'And the bins?', 'ごみ箱は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 5, 'user', 'Add clear stations so staff {recycle} easily.', '分かりやすい分別場所を作って、簡単にリサイクルできるように。', 'recycle', (SELECT id FROM vocab_senses WHERE slug='recycle.v.reuse'), ARRAY['recycle','protect','clean up','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 6, 'npc', 'Good. Anything bigger?', 'いいね。もっと大きいことは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 7, 'user', 'Switch to clean energy to lower {pollution}.', 'クリーンエネルギーに切り替えて汚染を減らす。', 'pollution', (SELECT id FROM vocab_senses WHERE slug='pollution.n.dirt'), ARRAY['pollution','litter','waste','climate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 8, 'npc', 'That helps our image too.', '会社の印象にもいい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 9, 'user', 'Yes, clients care about {climate} action.', 'うん、クライアントは気候対策を重視する。', 'climate', (SELECT id FROM vocab_senses WHERE slug='climate.n.weather'), ARRAY['climate','litter','waste','pollution']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 10, 'npc', 'Let''s make it official policy.', '正式な方針にしよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 11, 'user', 'A promise to {protect} the environment.', '環境を守るという約束だね。', 'protect', (SELECT id FROM vocab_senses WHERE slug='protect.v.guard'), ARRAY['protect','recycle','clean up','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 12, 'npc', 'I''ll draft the plan.', '計画を作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 13, 'user', 'I''ll gather the data.', 'データを集める。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-33') AND goal='business'), 14, 'npc', 'Great teamwork, {{user_name}}.', 'いい連携だね、{{user_name}}。', NULL, NULL, NULL);
