-- ============================================================================
-- Vocab 102: vocab-102-3 - Life & background  (Unit 1)
-- Words: grow up, childhood, hometown, generation, retire, ambition, achieve, elderly.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('life-background', 'Life & background', '生い立ち', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('grow up', 'grow up', '/ˌɡroʊ ˈʌp/', '/ˌɡrəʊ ˈʌp/', NULL, 3, FALSE, NULL),
  ('childhood', 'childhood', '/ˈtʃaɪldhʊd/', '/ˈtʃaɪldhʊd/', NULL, 3, FALSE, NULL),
  ('hometown', 'hometown', '/ˈhoʊmtaʊn/', '/ˈhəʊmtaʊn/', NULL, 3, FALSE, NULL),
  ('generation', 'generation', '/ˌdʒenəˈreɪʃn/', '/ˌdʒenəˈreɪʃn/', NULL, 4, FALSE, NULL),
  ('retire', 'retire', '/rɪˈtaɪər/', '/rɪˈtaɪə/', NULL, 3, FALSE, NULL),
  ('ambition', 'ambition', '/æmˈbɪʃn/', '/æmˈbɪʃn/', NULL, 4, FALSE, NULL),
  ('achieve', 'achieve', '/əˈtʃiːv/', '/əˈtʃiːv/', NULL, 3, FALSE, NULL),
  ('elderly', 'elderly', '/ˈeldərli/', '/ˈeldəli/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='grow up'), 'grow-up.phrv.mature', 1, TRUE, 'phrasal verb', '育つ', 'to become an adult; to spend your childhood', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='childhood'), 'childhood.n.youth', 1, TRUE, 'noun', '子供時代', 'the time in your life when you are a child', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hometown'), 'hometown.n.origin', 1, TRUE, 'noun', '故郷', 'the town where you were born or grew up', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='generation'), 'generation.n.cohort', 1, TRUE, 'noun', '世代', 'all the people born around the same time', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='retire'), 'retire.v.stopwork', 1, TRUE, 'verb', '引退する', 'to stop working, usually because of age', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ambition'), 'ambition.n.goal', 1, TRUE, 'noun', '野心', 'a strong wish to achieve something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='achieve'), 'achieve.v.succeed', 1, TRUE, 'verb', '達成する', 'to succeed in doing something after effort', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='elderly'), 'elderly.adj.old', 1, TRUE, 'adjective', '高齢の', 'a polite word for old, used about people', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('grow up', 'childhood', 'hometown', 'generation', 'retire', 'ambition', 'achieve', 'elderly')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='elderly.adj.old'), NULL, 'old', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='ambition.n.goal'), NULL, 'goal', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='life-background'
WHERE s.slug IN ('grow-up.phrv.mature', 'childhood.n.youth', 'hometown.n.origin', 'generation.n.cohort', 'retire.v.stopwork', 'ambition.n.goal', 'achieve.v.succeed', 'elderly.adj.old')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-3', 1, 2, (SELECT id FROM vocab_categories WHERE slug='life-background'), 'Life & background', '生い立ちと経歴', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-3'), s.id, x.ord FROM (VALUES
  ('grow-up.phrv.mature',0),('childhood.n.youth',1),('hometown.n.origin',2),('generation.n.cohort',3),('retire.v.stopwork',4),('ambition.n.goal',5),('achieve.v.succeed',6),('elderly.adj.old',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-3'), 'conversation', 0, 'Where you''re from', '出身の話', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-3'), 'travel', 1, 'Visiting a village', '村を訪ねる', 'village', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-3'), 'business', 2, 'A colleague retires', '同僚の引退', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 0, 'npc', 'Where are you from originally?', 'もともとはどこの出身？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 1, 'user', 'A small town up north.', '北の方の小さな町。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 2, 'npc', 'Do you miss your {hometown}?', '地元が恋しい？', 'hometown', (SELECT id FROM vocab_senses WHERE slug='hometown.n.origin'), ARRAY['hometown','childhood','generation','ambition']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 3, 'user', 'Sometimes. It''s quiet there.', 'たまに。静かなところ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 4, 'npc', 'Did you {grow up} there, or move as a kid?', 'そこで育ったの？それとも子供の頃に引っ越した？', 'grow up', (SELECT id FROM vocab_senses WHERE slug='grow-up.phrv.mature'), ARRAY['grow up','retire','achieve','settle']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 5, 'user', 'Grew up there, then left at eighteen.', 'そこで育って、18で出た。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 6, 'npc', 'What was your {childhood} like?', '子供時代はどんな感じだった？', 'childhood', (SELECT id FROM vocab_senses WHERE slug='childhood.n.youth'), ARRAY['childhood','hometown','generation','ambition']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 7, 'user', 'Happy. Lots of time outdoors.', '幸せだった。外でよく遊んだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 8, 'npc', 'Nice. As a kid, what was your big {ambition}?', 'いいね。子供の頃の大きな夢は？', 'ambition', (SELECT id FROM vocab_senses WHERE slug='ambition.n.goal'), ARRAY['ambition','childhood','hometown','generation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 9, 'user', 'I wanted to be an astronaut!', '宇宙飛行士になりたかった！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 10, 'npc', 'Ha! Did you {achieve} any of your childhood dreams?', 'はは！子供の頃の夢、どれか叶えた？', 'achieve', (SELECT id FROM vocab_senses WHERE slug='achieve.v.succeed'), ARRAY['achieve','retire','grow up','miss']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 11, 'user', 'Some of them, in a way.', 'いくつかは、ある意味ね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 12, 'npc', 'Our {generation} had big dreams, didn''t we?', '私たちの世代は大きな夢を持ってたよね。', 'generation', (SELECT id FROM vocab_senses WHERE slug='generation.n.cohort'), ARRAY['generation','childhood','hometown','ambition']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 13, 'user', 'We definitely did.', '本当にそうだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='conversation'), 14, 'npc', 'Let''s chase them a bit more, {{user_name}}.', 'もう少し追いかけようよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 0, 'npc', 'Welcome to our village! It''s small but lovely.', '私たちの村へようこそ！小さいけどいいところ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 1, 'user', 'It''s beautiful. Have you always lived here?', '素敵ですね。ずっとここに？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 2, 'npc', 'Yes, I did {grow up} here and never left.', 'ええ、ここで育って、ずっと離れませんでした。', 'grow up', (SELECT id FROM vocab_senses WHERE slug='grow-up.phrv.mature'), ARRAY['grow up','retire','achieve','arrive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 3, 'user', 'That''s lovely. It feels peaceful.', 'いいですね。穏やかです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 4, 'npc', 'It''s my {hometown}, so I know every street.', 'ここは私の地元なので、どの通りも知ってます。', 'hometown', (SELECT id FROM vocab_senses WHERE slug='hometown.n.origin'), ARRAY['hometown','childhood','generation','ambition']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 5, 'user', 'You must have great memories here.', 'いい思い出がたくさんありそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 6, 'npc', 'So many. My whole {childhood} was in these hills.', 'たくさん。子供時代はずっとこの丘で過ごしました。', 'childhood', (SELECT id FROM vocab_senses WHERE slug='childhood.n.youth'), ARRAY['childhood','hometown','retire','ambition']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 7, 'user', 'Do young people stay, or leave?', '若い人は残る？それとも出ていく？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 8, 'npc', 'Most leave for the city, sadly.', '残念ながら、多くは都会へ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 9, 'user', 'So mostly {elderly} people live here now?', 'じゃあ今は高齢の人が中心ですか？', 'elderly', (SELECT id FROM vocab_senses WHERE slug='elderly.adj.old'), ARRAY['elderly','childhood','hometown','ambition']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 10, 'npc', 'Yes, but we like the quiet.', 'ええ、でも静けさが気に入ってます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 11, 'user', 'It''s a lovely place to {retire} and rest.', '引退してゆっくり過ごすにはいい場所ですね。', 'retire', (SELECT id FROM vocab_senses WHERE slug='retire.v.stopwork'), ARRAY['retire','achieve','grow up','arrive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 12, 'npc', 'That''s why many older folks move back.', 'だから年配の人が戻ってくるんです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 13, 'user', 'After a busy life, they {achieve} some peace at last.', '忙しい人生のあと、やっと安らぎを手に入れるんですね。', 'achieve', (SELECT id FROM vocab_senses WHERE slug='achieve.v.succeed'), ARRAY['achieve','retire','grow up','miss']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='travel'), 14, 'npc', 'Beautifully put. Enjoy your stay!', '素敵な言い方ですね。滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 0, 'npc', 'Did you hear? Mr. Sato is retiring next month.', '聞いた？佐藤さん、来月引退するって。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 1, 'user', 'Already? He''s been here forever.', 'もう？ずっといた人だよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 2, 'npc', 'Yeah, he''s ready to {retire} after forty years.', 'うん、40年働いて引退する準備ができたって。', 'retire', (SELECT id FROM vocab_senses WHERE slug='retire.v.stopwork'), ARRAY['retire','achieve','grow up','arrive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 3, 'user', 'Forty years is impressive.', '40年はすごい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 4, 'npc', 'He did {achieve} a lot; he built this whole department.', '彼は本当に多くを成し遂げた。この部署を一から作った。', 'achieve', (SELECT id FROM vocab_senses WHERE slug='achieve.v.succeed'), ARRAY['achieve','retire','grow up','miss']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 5, 'user', 'A real legacy.', '立派な功績だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 6, 'npc', 'He trained a whole {generation} of managers here.', 'ここでマネージャーの世代をまるごと育てた。', 'generation', (SELECT id FROM vocab_senses WHERE slug='generation.n.cohort'), ARRAY['generation','ambition','childhood','hometown']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 7, 'user', 'We owe him a lot.', 'お世話になったね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 8, 'npc', 'Do you have the same {ambition} to lead one day?', 'いつか率いたいっていう同じ野心、ある？', 'ambition', (SELECT id FROM vocab_senses WHERE slug='ambition.n.goal'), ARRAY['ambition','generation','childhood','hometown']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 9, 'user', 'Maybe. I''m learning a lot first.', 'たぶん。まずはたくさん学んでる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 10, 'npc', 'Good plan. Juniors {grow up} fast in this team.', 'いい計画。このチームでは若手が早く成長する。', 'grow up', (SELECT id FROM vocab_senses WHERE slug='grow-up.phrv.mature'), ARRAY['grow up','retire','achieve','arrive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 11, 'user', 'I''ve noticed that.', 'それは感じてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 12, 'npc', 'By the way, he''s opening a small shop back in his {hometown}.', 'ところで、地元で小さな店を開くんだって。', 'hometown', (SELECT id FROM vocab_senses WHERE slug='hometown.n.origin'), ARRAY['hometown','childhood','generation','ambition']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 13, 'user', 'That''s a lovely way to start again.', '素敵な再スタートだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-3') AND goal='business'), 14, 'npc', 'It is. Let''s plan his send-off, {{user_name}}.', 'ね。送別会を計画しよう、{{user_name}}。', NULL, NULL, NULL);
