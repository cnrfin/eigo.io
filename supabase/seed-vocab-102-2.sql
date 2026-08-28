-- ============================================================================
-- Vocab 102: vocab-102-2 - Getting on with people  (Unit 1)
-- Words: get along, fall out, make up, look up to, put up with, hang out, tell off, split up.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('getting-on', 'Getting on with people', '人付き合い', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('get along', 'get along', '/ɡet əˈlɔːŋ/', '/ɡet əˈlɒŋ/', NULL, 3, FALSE, NULL),
  ('fall out', 'fall out', '/ˌfɔːl ˈaʊt/', '/ˌfɔːl ˈaʊt/', NULL, 3, FALSE, NULL),
  ('make up', 'make up', '/ˌmeɪk ˈʌp/', '/ˌmeɪk ˈʌp/', NULL, 3, FALSE, NULL),
  ('look up to', 'look up to', '/ˌlʊk ˈʌp tuː/', '/ˌlʊk ˈʌp tuː/', NULL, 3, FALSE, NULL),
  ('put up with', 'put up with', '/ˌpʊt ˈʌp wɪð/', '/ˌpʊt ˈʌp wɪð/', NULL, 3, FALSE, NULL),
  ('hang out', 'hang out', '/ˌhæŋ ˈaʊt/', '/ˌhæŋ ˈaʊt/', NULL, 3, FALSE, NULL),
  ('tell off', 'tell off', '/ˌtel ˈɔːf/', '/ˌtel ˈɒf/', NULL, 3, FALSE, NULL),
  ('split up', 'split up', '/ˌsplɪt ˈʌp/', '/ˌsplɪt ˈʌp/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='get along'), 'get-along.phrv.relate', 1, TRUE, 'phrasal verb', '仲良くする', 'to have a friendly relationship with someone', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fall out'), 'fall-out.phrv.quarrel', 1, TRUE, 'phrasal verb', '仲たがいする', 'to argue and stop being friends', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='make up'), 'make-up.phrv.reconcile', 1, TRUE, 'phrasal verb', '仲直りする', 'to become friends again after an argument', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='look up to'), 'look-up-to.phrv.admire', 1, TRUE, 'phrasal verb', '尊敬する', 'to admire and respect someone', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put up with'), 'put-up-with.phrv.tolerate', 1, TRUE, 'phrasal verb', '我慢する', 'to accept something annoying without complaining', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hang out'), 'hang-out.phrv.socialize', 1, TRUE, 'phrasal verb', 'つるむ', 'to spend time relaxing with people', 'B1', 'くだけた言い方。友達同士でよく使う。'),
  ((SELECT id FROM vocab_words WHERE normalized='tell off'), 'tell-off.phrv.scold', 1, TRUE, 'phrasal verb', '叱る', 'to speak angrily to someone for doing wrong', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='split up'), 'split-up.phrv.separate', 1, TRUE, 'phrasal verb', '別れる', 'to end a romantic relationship', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('get along', 'fall out', 'make up', 'look up to', 'put up with', 'hang out', 'tell off', 'split up')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='fall-out.phrv.quarrel'), (SELECT id FROM vocab_senses WHERE slug='make-up.phrv.reconcile'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='make-up.phrv.reconcile'), (SELECT id FROM vocab_senses WHERE slug='fall-out.phrv.quarrel'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='getting-on'
WHERE s.slug IN ('get-along.phrv.relate', 'fall-out.phrv.quarrel', 'make-up.phrv.reconcile', 'look-up-to.phrv.admire', 'put-up-with.phrv.tolerate', 'hang-out.phrv.socialize', 'tell-off.phrv.scold', 'split-up.phrv.separate')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-2', 1, 1, (SELECT id FROM vocab_categories WHERE slug='getting-on'), 'Getting on with people', '人との付き合い方', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-2'), s.id, x.ord FROM (VALUES
  ('get-along.phrv.relate',0),('fall-out.phrv.quarrel',1),('make-up.phrv.reconcile',2),('look-up-to.phrv.admire',3),('put-up-with.phrv.tolerate',4),('hang-out.phrv.socialize',5),('tell-off.phrv.scold',6),('split-up.phrv.separate',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-2'), 'conversation', 0, 'Family and friends', '家族と友達', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-2'), 'travel', 1, 'Sharing a hostel', 'ホステルで相部屋', 'hostel', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-2'), 'business', 2, 'Office dynamics', '職場の人間関係', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 0, 'npc', 'How are things with your brother these days?', '最近お兄さんとはどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 1, 'user', 'Better now, actually.', '実は、今はよくなった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 2, 'npc', 'Didn''t you two {fall out} last year and stop talking?', '去年ケンカして口をきかなくなったよね？', 'fall out', (SELECT id FROM vocab_senses WHERE slug='fall-out.phrv.quarrel'), ARRAY['fall out','make up','hang out','get along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 3, 'user', 'We did, over something silly.', 'うん、くだらないことで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 4, 'npc', 'But you two always {make up} quickly after a fight.', 'でも二人ってケンカのあといつもすぐ仲直りするよね。', 'make up', (SELECT id FROM vocab_senses WHERE slug='make-up.phrv.reconcile'), ARRAY['make up','fall out','tell off','split up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 5, 'user', 'True. Now we''re close again.', '確かに。今はまた仲がいい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 6, 'npc', 'Good. Do you {get along} well with your sister too?', 'よかった。お姉さんとも仲良くしてる？', 'get along', (SELECT id FROM vocab_senses WHERE slug='get-along.phrv.relate'), ARRAY['get along','tell off','fall out','split up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 7, 'user', 'Yeah, she''s my best friend.', 'うん、一番の親友。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 8, 'npc', 'That''s sweet. I really {look up to} my older cousin; she''s my role model.', 'いいね。私はいとこを本当に尊敬してる。私のお手本なんだ。', 'look up to', (SELECT id FROM vocab_senses WHERE slug='look-up-to.phrv.admire'), ARRAY['look up to','tell off','put up with','fall out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 9, 'user', 'Role models matter.', 'お手本って大事だよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 10, 'npc', 'For sure. Hey, do you want to {hang out} on Saturday?', 'ほんとに。ねえ、土曜に遊ばない？', 'hang out', (SELECT id FROM vocab_senses WHERE slug='hang-out.phrv.socialize'), ARRAY['hang out','tell off','make up','fall out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 11, 'user', 'I''d love to. What should we do?', 'いいね。何する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 12, 'npc', 'Anywhere but that cafe; the owner will {tell off} anyone who''s loud.', 'あのカフェ以外で。オーナーはうるさい人を誰でも叱るから。', 'tell off', (SELECT id FROM vocab_senses WHERE slug='tell-off.phrv.scold'), ARRAY['tell off','look up to','hang out','get along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 13, 'user', 'Ha, let''s avoid that place.', 'はは、あそこは避けよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='conversation'), 14, 'npc', 'Deal. See you Saturday, {{user_name}}!', '決まり。土曜にね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 0, 'npc', 'First time staying in a hostel?', 'ホステルは初めて？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 1, 'user', 'Yeah. Are the shared rooms okay?', 'うん。相部屋って平気？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 2, 'npc', 'Mostly. You just {put up with} a bit of snoring at night.', 'だいたいね。夜のいびきを少し我慢するだけ。', 'put up with', (SELECT id FROM vocab_senses WHERE slug='put-up-with.phrv.tolerate'), ARRAY['put up with','look up to','hang out','split up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 3, 'user', 'I can handle that.', 'それくらい平気。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 4, 'npc', 'Good. Most travelers here {get along} really well.', 'よかった。ここの旅行者はみんな本当に仲良くしてる。', 'get along', (SELECT id FROM vocab_senses WHERE slug='get-along.phrv.relate'), ARRAY['get along','tell off','split up','put up with']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 5, 'user', 'That''s nice to hear.', 'それは嬉しいな。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 6, 'npc', 'We all {hang out} in the common room at night.', '夜はみんな共有スペースでつるんでる。', 'hang out', (SELECT id FROM vocab_senses WHERE slug='hang-out.phrv.socialize'), ARRAY['hang out','tell off','put up with','split up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 7, 'user', 'I''ll join tonight.', '今夜混ざるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 8, 'npc', 'Please do. There''s a couple from Canada, super nice.', 'ぜひ。カナダから来たカップルがいて、すごくいい人たち。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 9, 'user', 'A couple? I hope they don''t {split up} on the trip!', 'カップル？旅行中に別れないといいね！', 'split up', (SELECT id FROM vocab_senses WHERE slug='split-up.phrv.separate'), ARRAY['split up','hang out','get along','look up to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 10, 'npc', 'Ha, they seem solid.', 'はは、二人は仲良さそうだよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 11, 'user', 'Good. I actually {look up to} couples who travel together; it takes teamwork.', 'いいね。一緒に旅するカップルって尊敬する。チームワークがいるから。', 'look up to', (SELECT id FROM vocab_senses WHERE slug='look-up-to.phrv.admire'), ARRAY['look up to','put up with','tell off','split up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 12, 'npc', 'So true. Oh, quick house rule.', '本当に。あ、ちょっとしたルール。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 13, 'user', 'Let me guess. The staff {tell off} anyone who''s noisy after midnight?', '当ててみせる。スタッフは深夜にうるさい人を叱るんでしょ？', 'tell off', (SELECT id FROM vocab_senses WHERE slug='tell-off.phrv.scold'), ARRAY['tell off','hang out','get along','put up with']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='travel'), 14, 'npc', 'Exactly! You''ve done this before.', 'その通り！慣れてるね。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 0, 'npc', 'How''s your new team treating you?', '新しいチームはどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 1, 'user', 'Pretty well so far.', '今のところいい感じ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 2, 'npc', 'Do you {get along} well with your manager?', 'マネージャーとは仲良くやってる？', 'get along', (SELECT id FROM vocab_senses WHERE slug='get-along.phrv.relate'), ARRAY['get along','tell off','fall out','split up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 3, 'user', 'Yeah, she''s supportive.', 'うん、協力的だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 4, 'npc', 'You''re lucky. I really {look up to} mine; she taught me everything.', 'いいね。私は自分のマネージャーを本当に尊敬してる。全部教わったから。', 'look up to', (SELECT id FROM vocab_senses WHERE slug='look-up-to.phrv.admire'), ARRAY['look up to','put up with','tell off','fall out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 5, 'user', 'That''s a great boss to have.', 'いい上司だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 6, 'npc', 'The only thing I {put up with} is the long meetings.', '唯一我慢してるのは長い会議だけ。', 'put up with', (SELECT id FROM vocab_senses WHERE slug='put-up-with.phrv.tolerate'), ARRAY['put up with','make up','get along','tell off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 7, 'user', 'Ugh, those are the worst.', 'うわ、あれ最悪。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 8, 'npc', 'And my old boss would {tell off} people in front of everyone.', '前の上司はみんなの前で人を叱ってた。', 'tell off', (SELECT id FROM vocab_senses WHERE slug='tell-off.phrv.scold'), ARRAY['tell off','look up to','get along','make up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 9, 'user', 'That''s not okay at all.', 'それは全然よくないね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 10, 'npc', 'No. Two coworkers would {fall out} over it and stop speaking.', '同僚2人がそれでケンカして口をきかなくなることもあった。', 'fall out', (SELECT id FROM vocab_senses WHERE slug='fall-out.phrv.quarrel'), ARRAY['fall out','make up','look up to','put up with']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 11, 'user', 'Did they ever fix it?', 'その後、直った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 12, 'npc', 'Eventually they''d {make up} and shake hands.', '最終的には仲直りして握手してた。', 'make up', (SELECT id FROM vocab_senses WHERE slug='make-up.phrv.reconcile'), ARRAY['make up','fall out','tell off','put up with']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 13, 'user', 'Glad it ended well.', 'よく収まってよかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-2') AND goal='business'), 14, 'npc', 'Me too. Anyway, welcome to the team, {{user_name}}!', 'ね。ともかく、チームへようこそ、{{user_name}}！', NULL, NULL, NULL);
