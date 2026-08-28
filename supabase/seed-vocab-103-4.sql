-- ============================================================================
-- Vocab 103: vocab-103-4 - Weighing views  (Unit 2)
-- Words: bear in mind, take into account, see eye to eye, beg to differ, on the fence, food for thought, common ground, devil's advocate.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('weighing-views', 'Weighing views', '意見を比べる', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('bear in mind', 'bear in mind', '/ˌber ɪn ˈmaɪnd/', '/ˌbeə ɪn ˈmaɪnd/', NULL, 5, FALSE, NULL),
  ('take into account', 'take into account', '/ˌteɪk ɪntu əˈkaʊnt/', '/ˌteɪk ɪntu əˈkaʊnt/', NULL, 5, FALSE, NULL),
  ('see eye to eye', 'see eye to eye', '/ˌsiː aɪ tu ˈaɪ/', '/ˌsiː aɪ tu ˈaɪ/', NULL, 5, FALSE, NULL),
  ('beg to differ', 'beg to differ', '/ˌbeɡ tu ˈdɪfər/', '/ˌbeɡ tu ˈdɪfə/', NULL, 5, FALSE, NULL),
  ('on the fence', 'on the fence', '/ˌɑːn ðə ˈfens/', '/ˌɒn ðə ˈfens/', NULL, 5, FALSE, NULL),
  ('food for thought', 'food for thought', '/ˌfuːd fər ˈθɔːt/', '/ˌfuːd fə ˈθɔːt/', NULL, 5, FALSE, NULL),
  ('common ground', 'common ground', '/ˌkɑːmən ˈɡraʊnd/', '/ˌkɒmən ˈɡraʊnd/', NULL, 5, FALSE, NULL),
  ('devil''s advocate', 'devil''s advocate', '/ˌdevlz ˈædvəkət/', '/ˌdevlz ˈædvəkət/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='bear in mind'), 'bear-in-mind.idiom.remember', 1, TRUE, 'idiom', '心に留めておく', 'to remember and consider something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take into account'), 'take-into-account.idiom.consider', 1, TRUE, 'idiom', '考慮に入れる', 'to consider something when making a decision', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='see eye to eye'), 'see-eye-to-eye.idiom.agree', 1, TRUE, 'idiom', '意見が完全に一致する', 'to agree completely with someone', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='beg to differ'), 'beg-to-differ.idiom.disagree', 1, TRUE, 'idiom', '（丁寧に）異論を唱える', 'to politely disagree', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='on the fence'), 'on-the-fence.idiom.undecided', 1, TRUE, 'idiom', 'どっちつかず', 'unable to decide between two choices', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='food for thought'), 'food-for-thought.idiom.reflect', 1, TRUE, 'idiom', '考えさせられること', 'something worth thinking about carefully', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='common ground'), 'common-ground.idiom.shared', 1, TRUE, 'idiom', '共通点', 'shared views or interests that help people agree', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='devil''s advocate'), 'devils-advocate.idiom.contrarian', 1, TRUE, 'idiom', 'あえて反対の立場をとる人', 'someone who argues the opposite side to test an idea', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('bear in mind', 'take into account', 'see eye to eye', 'beg to differ', 'on the fence', 'food for thought', 'common ground', 'devil''s advocate')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='bear-in-mind.idiom.remember'), (SELECT id FROM vocab_senses WHERE slug='take-into-account.idiom.consider'), NULL, 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='see-eye-to-eye.idiom.agree'), (SELECT id FROM vocab_senses WHERE slug='beg-to-differ.idiom.disagree'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='weighing-views'
WHERE s.slug IN ('bear-in-mind.idiom.remember', 'take-into-account.idiom.consider', 'see-eye-to-eye.idiom.agree', 'beg-to-differ.idiom.disagree', 'on-the-fence.idiom.undecided', 'food-for-thought.idiom.reflect', 'common-ground.idiom.shared', 'devils-advocate.idiom.contrarian')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-4', 2, 1, (SELECT id FROM vocab_categories WHERE slug='weighing-views'), 'Weighing views', '意見を比べて考える', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-4'), s.id, x.ord FROM (VALUES
  ('bear-in-mind.idiom.remember',0),('take-into-account.idiom.consider',1),('see-eye-to-eye.idiom.agree',2),('beg-to-differ.idiom.disagree',3),('on-the-fence.idiom.undecided',4),('food-for-thought.idiom.reflect',5),('common-ground.idiom.shared',6),('devils-advocate.idiom.contrarian',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-4'), 'conversation', 0, 'A big decision', '大きな決断', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-4'), 'travel', 1, 'Planning with a group', 'グループで計画', 'hostel', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-4'), 'business', 2, 'A strategy meeting', '戦略会議', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 0, 'npc', 'Have you decided on the job offer?', '仕事のオファー、決めた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 1, 'user', 'Not yet, I''m still {on the fence}.', 'まだ、決めかねてる。', 'on the fence', (SELECT id FROM vocab_senses WHERE slug='on-the-fence.idiom.undecided'), ARRAY['on the fence','common ground','food for thought','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 2, 'npc', 'The pay is great, though.', 'でも給料はいいよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 3, 'user', 'I''d {beg to differ}; the hours are brutal.', 'そこは異論あり、勤務時間がきつい。', 'beg to differ', (SELECT id FROM vocab_senses WHERE slug='beg-to-differ.idiom.disagree'), ARRAY['beg to differ','see eye to eye','bear in mind','take into account']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 4, 'npc', 'Fair. But growth matters.', 'なるほど。でも成長は大事。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 5, 'user', 'There we {see eye to eye}; growth is key.', 'そこは意見が一致、成長が鍵。', 'see eye to eye', (SELECT id FROM vocab_senses WHERE slug='see-eye-to-eye.idiom.agree'), ARRAY['see eye to eye','beg to differ','bear in mind','take into account']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 6, 'npc', 'So we agree on something!', 'じゃあ一致点があるね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 7, 'user', 'Ha, we found some {common ground}.', 'はは、共通点が見つかった。', 'common ground', (SELECT id FROM vocab_senses WHERE slug='common-ground.idiom.shared'), ARRAY['common ground','on the fence','food for thought','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 8, 'npc', 'Think about the commute too.', '通勤も考えなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 9, 'user', 'Good point. I''ll {bear in mind} the travel time.', '確かに。移動時間を心に留めておく。', 'bear in mind', (SELECT id FROM vocab_senses WHERE slug='bear-in-mind.idiom.remember'), ARRAY['bear in mind','see eye to eye','beg to differ','on the fence']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 10, 'npc', 'It''s a lot to consider.', '考えることが多いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 11, 'user', 'Definitely. That''s real {food for thought}.', '本当に。すごく考えさせられる。', 'food for thought', (SELECT id FROM vocab_senses WHERE slug='food-for-thought.idiom.reflect'), ARRAY['food for thought','common ground','on the fence','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 12, 'npc', 'Sleep on it.', '一晩考えて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 13, 'user', 'I will, thanks.', 'そうする、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='conversation'), 14, 'npc', 'You''ll choose well, {{user_name}}.', 'いい選択をするよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 0, 'npc', 'Beach or mountains this weekend?', '今週末は海？山？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 1, 'user', 'We should {take into account} the weather first.', 'まず天気を考慮に入れよう。', 'take into account', (SELECT id FROM vocab_senses WHERE slug='take-into-account.idiom.consider'), ARRAY['take into account','see eye to eye','beg to differ','on the fence']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 2, 'npc', 'Rain both days, sadly.', '残念、両日とも雨。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 3, 'user', 'Then I''m {on the fence} about going at all.', 'じゃあ出かけるか自体、決めかねる。', 'on the fence', (SELECT id FROM vocab_senses WHERE slug='on-the-fence.idiom.undecided'), ARRAY['on the fence','common ground','food for thought','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 4, 'npc', 'Let''s find something everyone likes.', 'みんなが好きなものを探そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 5, 'user', 'Yes, let''s find {common ground}.', 'うん、共通点を見つけよう。', 'common ground', (SELECT id FROM vocab_senses WHERE slug='common-ground.idiom.shared'), ARRAY['common ground','on the fence','food for thought','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 6, 'npc', 'A spa day? Indoors and relaxing.', 'スパは？屋内でのんびり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 7, 'user', 'Now we {see eye to eye}! Perfect.', 'それなら意見一致！完璧。', 'see eye to eye', (SELECT id FROM vocab_senses WHERE slug='see-eye-to-eye.idiom.agree'), ARRAY['see eye to eye','beg to differ','take into account','on the fence']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 8, 'npc', 'But it''s pricey.', 'でも高い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 9, 'user', 'Let me play {devil''s advocate}: is it worth it?', 'あえて反対の立場で言うと、その価値ある？', 'devil''s advocate', (SELECT id FROM vocab_senses WHERE slug='devils-advocate.idiom.contrarian'), ARRAY['devil''s advocate','common ground','on the fence','food for thought']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 10, 'npc', 'Good question. Split the cost?', 'いい質問。割り勘にする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 11, 'user', 'Hmm, that''s {food for thought}.', 'うーん、考えさせられる。', 'food for thought', (SELECT id FROM vocab_senses WHERE slug='food-for-thought.idiom.reflect'), ARRAY['food for thought','common ground','on the fence','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 12, 'npc', 'Let''s decide over lunch.', '昼食を食べながら決めよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 13, 'user', 'Deal.', '決まり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='travel'), 14, 'npc', 'Sorted!', '解決！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 0, 'npc', 'Should we enter the new market?', '新市場に参入すべき？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 1, 'user', 'We should {bear in mind} the competition there.', 'そこの競合を心に留めておくべき。', 'bear in mind', (SELECT id FROM vocab_senses WHERE slug='bear-in-mind.idiom.remember'), ARRAY['bear in mind','see eye to eye','beg to differ','on the fence']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 2, 'npc', 'It''s strong, true.', '強敵だね、確かに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 3, 'user', 'And we must {take into account} the setup costs.', 'それに初期費用も考慮に入れないと。', 'take into account', (SELECT id FROM vocab_senses WHERE slug='take-into-account.idiom.consider'), ARRAY['take into account','see eye to eye','beg to differ','common ground']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 4, 'npc', 'Marketing thinks it''s low-risk.', 'マーケは低リスクと見てる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 5, 'user', 'I''d {beg to differ}; it''s a big investment.', '異論あり、大きな投資だよ。', 'beg to differ', (SELECT id FROM vocab_senses WHERE slug='beg-to-differ.idiom.disagree'), ARRAY['beg to differ','see eye to eye','bear in mind','on the fence']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 6, 'npc', 'On timing, though, we agree?', 'でもタイミングは合ってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 7, 'user', 'Yes, on timing we {see eye to eye}.', 'うん、タイミングは意見一致。', 'see eye to eye', (SELECT id FROM vocab_senses WHERE slug='see-eye-to-eye.idiom.agree'), ARRAY['see eye to eye','beg to differ','bear in mind','take into account']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 8, 'npc', 'Let me challenge the plan.', '計画に異議を唱えてみる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 9, 'user', 'Good, play {devil''s advocate} for a minute.', 'いいね、少しあえて反対の立場で。', 'devil''s advocate', (SELECT id FROM vocab_senses WHERE slug='devils-advocate.idiom.contrarian'), ARRAY['devil''s advocate','common ground','on the fence','food for thought']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 10, 'npc', 'What if demand is low?', '需要が低かったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 11, 'user', 'Fair. Let''s find {common ground} with finance.', 'なるほど。財務と共通点を探ろう。', 'common ground', (SELECT id FROM vocab_senses WHERE slug='common-ground.idiom.shared'), ARRAY['common ground','on the fence','food for thought','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 12, 'npc', 'I''ll set up that meeting.', 'その会議を設定するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 13, 'user', 'Great, thanks.', 'いいね、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-4') AND goal='business'), 14, 'npc', 'Solid thinking, {{user_name}}.', 'しっかりした考えだね、{{user_name}}。', NULL, NULL, NULL);
