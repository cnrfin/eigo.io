-- ============================================================================
-- Vocab 102: vocab-102-6 - Handling feelings  (Unit 2)
-- Words: cheer up, calm down, get over, look forward to, freak out, chill out, fed up, feel like.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('handling-feelings', 'Handling feelings', '気持ちの整理', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('cheer up', 'cheer up', '/ˌtʃɪr ˈʌp/', '/ˌtʃɪər ˈʌp/', NULL, 3, FALSE, NULL),
  ('calm down', 'calm down', '/ˌkɑːm ˈdaʊn/', '/ˌkɑːm ˈdaʊn/', NULL, 3, TRUE, 'calm の l は発音しない。/kɑːm/。'),
  ('get over', 'get over', '/ˌɡet ˈoʊvər/', '/ˌɡet ˈəʊvə/', NULL, 4, FALSE, NULL),
  ('look forward to', 'look forward to', '/ˌlʊk ˈfɔːrwərd tuː/', '/ˌlʊk ˈfɔːwəd tuː/', NULL, 3, FALSE, NULL),
  ('freak out', 'freak out', '/ˌfriːk ˈaʊt/', '/ˌfriːk ˈaʊt/', NULL, 4, FALSE, NULL),
  ('chill out', 'chill out', '/ˌtʃɪl ˈaʊt/', '/ˌtʃɪl ˈaʊt/', NULL, 4, FALSE, NULL),
  ('fed up', 'fed up', '/ˌfed ˈʌp/', '/ˌfed ˈʌp/', NULL, 4, FALSE, NULL),
  ('feel like', 'feel like', '/ˈfiːl laɪk/', '/ˈfiːl laɪk/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='cheer up'), 'cheer-up.phrv.gladden', 1, TRUE, 'phrasal verb', '元気を出す', 'to become or make someone less sad', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='calm down'), 'calm-down.phrv.settle', 1, TRUE, 'phrasal verb', '落ち着く', 'to become less angry or upset', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get over'), 'get-over.phrv.recover', 1, TRUE, 'phrasal verb', '立ち直る', 'to feel better after something bad or an illness', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='look forward to'), 'look-forward-to.phrv.anticipate', 1, TRUE, 'phrasal verb', '楽しみにする', 'to feel happy about something that is going to happen', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='freak out'), 'freak-out.phrv.panic', 1, TRUE, 'phrasal verb', 'パニックになる', 'to suddenly react with fear or panic', 'B2', 'くだけた言い方。'),
  ((SELECT id FROM vocab_words WHERE normalized='chill out'), 'chill-out.phrv.relax', 1, TRUE, 'phrasal verb', 'くつろぐ', 'to relax completely', 'B2', 'くだけた言い方。'),
  ((SELECT id FROM vocab_words WHERE normalized='fed up'), 'fed-up.phr.annoyed', 1, TRUE, 'phrase', 'うんざりして', 'annoyed and bored with something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='feel like'), 'feel-like.phrv.want', 1, TRUE, 'phrasal verb', '…したい気分', 'to want to do or have something', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('cheer up', 'calm down', 'get over', 'look forward to', 'freak out', 'chill out', 'fed up', 'feel like')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='handling-feelings'
WHERE s.slug IN ('cheer-up.phrv.gladden', 'calm-down.phrv.settle', 'get-over.phrv.recover', 'look-forward-to.phrv.anticipate', 'freak-out.phrv.panic', 'chill-out.phrv.relax', 'fed-up.phr.annoyed', 'feel-like.phrv.want')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-6', 2, 2, (SELECT id FROM vocab_categories WHERE slug='handling-feelings'), 'Handling feelings', '気持ちとの向き合い方', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-6'), s.id, x.ord FROM (VALUES
  ('cheer-up.phrv.gladden',0),('calm-down.phrv.settle',1),('get-over.phrv.recover',2),('look-forward-to.phrv.anticipate',3),('freak-out.phrv.panic',4),('chill-out.phrv.relax',5),('fed-up.phr.annoyed',6),('feel-like.phrv.want',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-6'), 'conversation', 0, 'A friend is upset', '落ち込む友達', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-6'), 'travel', 1, 'A flight delay', 'フライトの遅延', 'airport', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-6'), 'business', 2, 'Deadline stress', '締め切りのストレス', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 0, 'npc', 'Ugh, I''m having the worst day.', 'うう、最悪な一日。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 1, 'user', 'Hey, {calm down} and tell me what happened.', 'ねえ、落ち着いて、何があったか話して。', 'calm down', (SELECT id FROM vocab_senses WHERE slug='calm-down.phrv.settle'), ARRAY['calm down','cheer up','freak out','chill out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 2, 'npc', 'I missed my train and then my bus.', '電車を逃して、バスも逃した。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 3, 'user', 'Okay, don''t {freak out}; you''ll get there.', '大丈夫、パニックにならないで。ちゃんと着くよ。', 'freak out', (SELECT id FROM vocab_senses WHERE slug='freak-out.phrv.panic'), ARRAY['freak out','chill out','feel like','cheer up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 4, 'npc', 'I know, I''m just so behind today.', 'わかってる、今日はとにかく遅れてて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 5, 'user', 'Let''s {cheer up} with some coffee, my treat.', 'コーヒーで元気出そう、私のおごり。', 'cheer up', (SELECT id FROM vocab_senses WHERE slug='cheer-up.phrv.gladden'), ARRAY['cheer up','calm down','freak out','feel like']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 6, 'npc', 'That would actually help.', 'それは正直助かる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 7, 'user', 'You sound {fed up} with the trains lately.', '最近、電車にうんざりしてるみたいだね。', 'fed up', (SELECT id FROM vocab_senses WHERE slug='fed-up.phr.annoyed'), ARRAY['fed up','cheer up','calm down','chill out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 8, 'npc', 'So fed up. They''re always late.', '本当にうんざり。いつも遅れる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 9, 'user', 'After coffee, let''s just {chill out} in the park.', 'コーヒーの後、公園でのんびりしよう。', 'chill out', (SELECT id FROM vocab_senses WHERE slug='chill-out.phrv.relax'), ARRAY['chill out','freak out','feel like','calm down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 10, 'npc', 'Yes please. I need to relax.', 'ぜひ。リラックスしたい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 11, 'user', 'Same. I {feel like} doing nothing today.', '私も。今日は何もしたくない気分。', 'feel like', (SELECT id FROM vocab_senses WHERE slug='feel-like.phrv.want'), ARRAY['feel like','cheer up','calm down','freak out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 12, 'npc', 'Ha, sounds perfect.', 'はは、完璧。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 13, 'user', 'Let''s go, my treat.', '行こう、おごるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='conversation'), 14, 'npc', 'You''re the best, {{user_name}}.', '最高だね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 0, 'npc', 'Excited for the trip?', '旅行、楽しみ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 1, 'user', 'So much! I {look forward to} this every year.', 'すごく！毎年これを楽しみにしてる。', 'look forward to', (SELECT id FROM vocab_senses WHERE slug='look-forward-to.phrv.anticipate'), ARRAY['look forward to','get over','freak out','fed up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 2, 'npc', 'Same. Did you hear about the delay, though?', '私も。でも遅延のこと聞いた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 3, 'user', 'Don''t tell me that, I''ll {freak out}!', '言わないで、パニックになる！', 'freak out', (SELECT id FROM vocab_senses WHERE slug='freak-out.phrv.panic'), ARRAY['freak out','chill out','look forward to','get over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 4, 'npc', 'It''s only an hour, relax.', 'たった1時間だよ、落ち着いて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 5, 'user', 'Okay, okay, I''ll {calm down}.', 'わかった、落ち着く。', 'calm down', (SELECT id FROM vocab_senses WHERE slug='calm-down.phrv.settle'), ARRAY['calm down','look forward to','fed up','get over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 6, 'npc', 'Good. Let''s grab a snack while we wait.', 'よし。待つ間に軽く食べよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 7, 'user', 'Sure. I''m a bit {fed up} with airport waiting, honestly.', 'いいね。正直、空港で待つのはうんざり。', 'fed up', (SELECT id FROM vocab_senses WHERE slug='fed-up.phr.annoyed'), ARRAY['fed up','look forward to','freak out','chill out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 8, 'npc', 'Ha, everyone is. Let''s find a quiet gate.', 'はは、みんなそう。静かなゲートを探そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 9, 'user', 'Yes, let''s {chill out} until they board us.', 'うん、搭乗までのんびりしよう。', 'chill out', (SELECT id FROM vocab_senses WHERE slug='chill-out.phrv.relax'), ARRAY['chill out','freak out','look forward to','get over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 10, 'npc', 'By the way, are you over your cold?', 'ところで、風邪は治った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 11, 'user', 'Almost. It took a week to {get over} it.', 'もう少し。治るのに1週間かかった。', 'get over', (SELECT id FROM vocab_senses WHERE slug='get-over.phrv.recover'), ARRAY['get over','cheer up','freak out','feel like']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 12, 'npc', 'Glad you''re better. The trip will help.', 'よくなってよかった。旅行が効くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 13, 'user', 'Definitely. Let''s board soon.', '本当に。早く乗りたい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='travel'), 14, 'npc', 'Won''t be long now.', 'もうすぐだよ。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 0, 'npc', 'The deadline just moved to Friday.', '締め切りが金曜に前倒しになった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 1, 'user', 'What? Okay, let me not {freak out}.', 'え？よし、パニックにならないでおこう。', 'freak out', (SELECT id FROM vocab_senses WHERE slug='freak-out.phrv.panic'), ARRAY['freak out','chill out','look forward to','cheer up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 2, 'npc', 'We can do it if we plan now.', '今計画すれば間に合う。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 3, 'user', 'You''re right. I''ll {calm down} and make a list.', 'そうだね。落ち着いてリストを作る。', 'calm down', (SELECT id FROM vocab_senses WHERE slug='calm-down.phrv.settle'), ARRAY['calm down','look forward to','get over','fed up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 4, 'npc', 'Good. Split the tasks with me.', 'いいね。タスクを分けよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 5, 'user', 'Thanks. I''m {fed up} with last-minute changes, though.', 'ありがとう。でも土壇場の変更にはうんざり。', 'fed up', (SELECT id FROM vocab_senses WHERE slug='fed-up.phr.annoyed'), ARRAY['fed up','cheer up','look forward to','chill out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 6, 'npc', 'Same here. Management keeps shifting things.', '同じく。上がころころ変える。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 7, 'user', 'We''ll {get over} it, like always.', 'いつも通り乗り越えるよ。', 'get over', (SELECT id FROM vocab_senses WHERE slug='get-over.phrv.recover'), ARRAY['get over','freak out','look forward to','feel like']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 8, 'npc', 'True. We always pull through.', '確かに。いつも何とかなる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 9, 'user', 'Let''s {cheer up} the team with lunch on me.', 'ランチをおごってチームを元気づけよう。', 'cheer up', (SELECT id FROM vocab_senses WHERE slug='cheer-up.phrv.gladden'), ARRAY['cheer up','freak out','calm down','fed up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 10, 'npc', 'They''ll love that.', 'みんな喜ぶよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 11, 'user', 'And after Friday, I {look forward to} a long weekend.', 'それに金曜の後は、長い週末を楽しみにしてる。', 'look forward to', (SELECT id FROM vocab_senses WHERE slug='look-forward-to.phrv.anticipate'), ARRAY['look forward to','get over','freak out','fed up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 12, 'npc', 'You''ve earned it.', '当然の休みだよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 13, 'user', 'Let''s get to work.', 'さあ、取りかかろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-6') AND goal='business'), 14, 'npc', 'Right behind you, {{user_name}}.', 'すぐ後ろにいるよ、{{user_name}}。', NULL, NULL, NULL);
