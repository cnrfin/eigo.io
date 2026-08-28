-- ============================================================================
-- Vocab 102 - apply ALL (B1-B2): 39 lessons + 13 review capstones, published.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql (same tables as 101).
-- Idempotent; wrapped in a transaction. Safe to re-run.
-- ============================================================================
BEGIN;

-- ===== seed-vocab-102-1.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-1 - Personality traits  (Unit 1)
-- Words: confident, shy, honest, lazy, generous, patient, selfish, reliable.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('personality-traits', 'Personality traits', '性格', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('confident', 'confident', '/ˈkɑːnfɪdənt/', '/ˈkɒnfɪdənt/', NULL, 3, FALSE, NULL),
  ('shy', 'shy', '/ʃaɪ/', '/ʃaɪ/', NULL, 3, FALSE, NULL),
  ('honest', 'honest', '/ˈɑːnɪst/', '/ˈɒnɪst/', NULL, 3, TRUE, '先頭の h は発音しない。/ˈɑːnɪst/。'),
  ('lazy', 'lazy', '/ˈleɪzi/', '/ˈleɪzi/', NULL, 3, FALSE, NULL),
  ('generous', 'generous', '/ˈdʒenərəs/', '/ˈdʒenərəs/', NULL, 3, FALSE, NULL),
  ('patient', 'patient', '/ˈpeɪʃənt/', '/ˈpeɪʃənt/', NULL, 3, FALSE, NULL),
  ('selfish', 'selfish', '/ˈselfɪʃ/', '/ˈselfɪʃ/', NULL, 3, FALSE, NULL),
  ('reliable', 'reliable', '/rɪˈlaɪəbl/', '/rɪˈlaɪəbl/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='confident'), 'confident.adj.sure', 1, TRUE, 'adjective', '自信がある', 'sure of yourself and your abilities', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shy'), 'shy.adj.timid', 1, TRUE, 'adjective', '内気な', 'nervous about meeting or talking to people', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='honest'), 'honest.adj.truthful', 1, TRUE, 'adjective', '正直な', 'always telling the truth', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lazy'), 'lazy.adj.idle', 1, TRUE, 'adjective', '怠惰な', 'not wanting to work or make an effort', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='generous'), 'generous.adj.giving', 1, TRUE, 'adjective', '気前がいい', 'happy to give money, help, or time', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='patient'), 'patient.adj.calm', 1, TRUE, 'adjective', '忍耐強い', 'able to wait calmly without getting annoyed', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='selfish'), 'selfish.adj.egotist', 1, TRUE, 'adjective', '自己中心的な', 'caring only about yourself, not others', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reliable'), 'reliable.adj.dependable', 1, TRUE, 'adjective', '頼りになる', 'able to be trusted to do what you promise', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('confident', 'shy', 'honest', 'lazy', 'generous', 'patient', 'selfish', 'reliable')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='confident.adj.sure'), (SELECT id FROM vocab_senses WHERE slug='shy.adj.timid'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='shy.adj.timid'), (SELECT id FROM vocab_senses WHERE slug='confident.adj.sure'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='generous.adj.giving'), (SELECT id FROM vocab_senses WHERE slug='selfish.adj.egotist'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='selfish.adj.egotist'), (SELECT id FROM vocab_senses WHERE slug='generous.adj.giving'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='reliable.adj.dependable'), NULL, 'dependable', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='personality-traits'
WHERE s.slug IN ('confident.adj.sure', 'shy.adj.timid', 'honest.adj.truthful', 'lazy.adj.idle', 'generous.adj.giving', 'patient.adj.calm', 'selfish.adj.egotist', 'reliable.adj.dependable')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-1', 1, 0, (SELECT id FROM vocab_categories WHERE slug='personality-traits'), 'Personality traits', '性格を表す言葉', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-1'), s.id, x.ord FROM (VALUES
  ('confident.adj.sure',0),('shy.adj.timid',1),('honest.adj.truthful',2),('lazy.adj.idle',3),('generous.adj.giving',4),('patient.adj.calm',5),('selfish.adj.egotist',6),('reliable.adj.dependable',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-1'), 'conversation', 0, 'Meeting a friend of a friend', '友達の友達に会う', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-1'), 'travel', 1, 'On a small group tour', '少人数ツアーで', 'street', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-1'), 'business', 2, 'A new team member', '新しいチームメンバー', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 0, 'npc', 'So, I want to introduce you to my friend Rio.', 'ねえ、友達のリオを紹介したいんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 1, 'user', 'Sure! What''s she like?', 'いいね！どんな人？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 2, 'npc', 'Really {confident}. She''ll talk to anyone at a party.', 'すごく自信家。パーティーで誰にでも話しかけるよ。', 'confident', (SELECT id FROM vocab_senses WHERE slug='confident.adj.sure'), ARRAY['confident','shy','lazy','honest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 3, 'user', 'Nice. I''m the opposite at parties.', 'いいね。私はパーティーだと逆かも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 4, 'npc', 'You''re a bit {shy} at first, sure, but you warm up.', '最初は少し内気だけど、慣れてくるよね。', 'shy', (SELECT id FROM vocab_senses WHERE slug='shy.adj.timid'), ARRAY['shy','generous','reliable','confident']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 5, 'user', 'True. Tell me more about her.', '確かに。彼女のこともっと教えて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 6, 'npc', 'She''s so {generous}; she always pays for dinner and brings gifts.', '本当に気前がよくて、いつも夕食をおごってプレゼントも持ってくる。', 'generous', (SELECT id FROM vocab_senses WHERE slug='generous.adj.giving'), ARRAY['generous','selfish','shy','lazy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 7, 'user', 'Wow, that''s kind.', 'わあ、優しいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 8, 'npc', 'And super {patient}; she never gets annoyed waiting.', 'しかもすごく忍耐強くて、待たされても全然イライラしない。', 'patient', (SELECT id FROM vocab_senses WHERE slug='patient.adj.calm'), ARRAY['patient','confident','honest','lazy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 9, 'user', 'I like that. Can I count on her?', 'いいね。頼りにできる人？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 10, 'npc', 'Definitely {reliable}. If she says she''ll come, she comes.', '間違いなく頼りになる。来るって言ったら必ず来る。', 'reliable', (SELECT id FROM vocab_senses WHERE slug='reliable.adj.dependable'), ARRAY['reliable','shy','selfish','lazy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 11, 'user', 'She sounds great. Any flaws?', '素敵な人だね。欠点は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 12, 'npc', 'She''s brutally {honest}; she tells you the truth even when it hurts.', '歯に衣着せず正直で、痛いことでも本当のことを言う。', 'honest', (SELECT id FROM vocab_senses WHERE slug='honest.adj.truthful'), ARRAY['honest','generous','patient','confident']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 13, 'user', 'That''s refreshing, actually.', 'それ、むしろ気持ちいいかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='conversation'), 14, 'npc', 'Right? You two will get along. I''ll introduce you, {{user_name}}.', 'でしょ？きっと気が合うよ。紹介するね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 0, 'npc', 'Welcome to the tour! Small group today, just six of you.', 'ツアーへようこそ！今日は少人数で、6人だけです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 1, 'user', 'Great. Is everyone friendly?', 'いいですね。みんな感じいいですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 2, 'npc', 'Very. One man is so {generous}; he bought coffee for the whole group.', 'とても。ある男性はすごく気前がよくて、グループ全員にコーヒーを買ってくれました。', 'generous', (SELECT id FROM vocab_senses WHERE slug='generous.adj.giving'), ARRAY['generous','shy','lazy','selfish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 3, 'user', 'That''s kind of him.', '親切ですね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 4, 'npc', 'There''s also a girl who''s quite {shy}; she hasn''t spoken much yet.', 'それと、かなり内気な女の子もいて、まだあまり話していません。', 'shy', (SELECT id FROM vocab_senses WHERE slug='shy.adj.timid'), ARRAY['shy','generous','honest','patient']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 5, 'user', 'I''ll say hello to her later.', 'あとで挨拶しますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 6, 'npc', 'Please do. You''ll need to be {patient}; she takes time to open up.', 'ぜひ。少し忍耐強くね、心を開くのに時間がかかるので。', 'patient', (SELECT id FROM vocab_senses WHERE slug='patient.adj.calm'), ARRAY['patient','lazy','selfish','generous']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 7, 'user', 'No problem. What''s the plan today?', '大丈夫です。今日の予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 8, 'npc', 'A long walk up the hill, then the old temple.', '丘を登る長い散歩、それから古いお寺です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 9, 'user', 'Sounds good. I hope I''m not too {lazy} for the climb.', 'いいですね。登りで怠けすぎないといいけど。', 'lazy', (SELECT id FROM vocab_senses WHERE slug='lazy.adj.idle'), ARRAY['lazy','honest','generous','shy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 10, 'npc', 'Ha! Take your time.', 'はは！ゆっくりどうぞ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 11, 'user', 'I''ll be {honest}, I didn''t train at all.', '正直に言うと、全然トレーニングしてないんです。', 'honest', (SELECT id FROM vocab_senses WHERE slug='honest.adj.truthful'), ARRAY['honest','patient','generous','shy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 12, 'npc', 'Most people don''t! You''ll be fine.', 'みんなそうですよ！大丈夫です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 13, 'user', 'I won''t rush ahead and be {selfish}; I''ll stay with the group.', '先を急いで自分勝手にはしません。グループと一緒にいます。', 'selfish', (SELECT id FROM vocab_senses WHERE slug='selfish.adj.egotist'), ARRAY['selfish','patient','honest','shy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='travel'), 14, 'npc', 'Perfect attitude. Let''s set off!', 'いい心がけですね。出発しましょう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 0, 'npc', 'Have you worked with the new analyst yet?', '新しいアナリストともう仕事した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 1, 'user', 'Not yet. What''s he like to work with?', 'まだ。一緒に働くとどんな感じ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 2, 'npc', 'Very {reliable}; he always hits his deadlines.', 'とても頼りになるよ。いつも締め切りを守る。', 'reliable', (SELECT id FROM vocab_senses WHERE slug='reliable.adj.dependable'), ARRAY['reliable','lazy','shy','selfish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 3, 'user', 'That''s what we need.', 'それは助かる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 4, 'npc', 'He''s {confident} too; he presents to clients without any nerves.', '自信もあって、緊張せずにクライアントにプレゼンする。', 'confident', (SELECT id FROM vocab_senses WHERE slug='confident.adj.sure'), ARRAY['confident','shy','lazy','honest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 5, 'user', 'Good. Is he easy to talk to?', 'いいね。話しやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 6, 'npc', 'Yes, and very {honest}; he''ll tell you if a plan won''t work.', 'うん、それにとても正直で、計画がうまくいかないなら言ってくれる。', 'honest', (SELECT id FROM vocab_senses WHERE slug='honest.adj.truthful'), ARRAY['honest','selfish','lazy','shy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 7, 'user', 'I appreciate that in a teammate.', 'チームメイトとしてありがたいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 8, 'npc', 'He''s {patient} with the interns, and never rushes them.', 'インターンにも忍耐強くて、急かさない。', 'patient', (SELECT id FROM vocab_senses WHERE slug='patient.adj.calm'), ARRAY['patient','selfish','confident','shy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 9, 'user', 'Any downsides?', '欠点は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 10, 'npc', 'Honestly, no. He''s not {selfish} at all; he shares credit with the team.', '正直、ない。全然自己中じゃなくて、手柄をチームと分け合う。', 'selfish', (SELECT id FROM vocab_senses WHERE slug='selfish.adj.egotist'), ARRAY['selfish','reliable','honest','patient']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 11, 'user', 'He sounds like a strong hire.', 'いい採用みたいだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 12, 'npc', 'He is. Not {lazy} either; he stays until the work is done.', 'そうだね。怠け者でもない。仕事が終わるまで残る。', 'lazy', (SELECT id FROM vocab_senses WHERE slug='lazy.adj.idle'), ARRAY['lazy','honest','patient','confident']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 13, 'user', 'I''ll set up a meeting with him.', '彼とミーティングを組むよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-1') AND goal='business'), 14, 'npc', 'Great. You''ll like working together, {{user_name}}.', 'いいね。一緒に働くの気に入ると思うよ、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-2.sql =====
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

-- ===== seed-vocab-102-3.sql =====
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

-- ===== seed-vocab-102-4.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-4 - Nuanced emotions  (Unit 2)
-- Words: nervous, relieved, embarrassed, jealous, proud, frustrated, anxious, grateful.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('emotions', 'Emotions', '感情', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('nervous', 'nervous', '/ˈnɜːrvəs/', '/ˈnɜːvəs/', NULL, 3, FALSE, NULL),
  ('relieved', 'relieved', '/rɪˈliːvd/', '/rɪˈliːvd/', NULL, 3, FALSE, NULL),
  ('embarrassed', 'embarrassed', '/ɪmˈbærəst/', '/ɪmˈbærəst/', NULL, 3, FALSE, NULL),
  ('jealous', 'jealous', '/ˈdʒeləs/', '/ˈdʒeləs/', NULL, 4, FALSE, NULL),
  ('proud', 'proud', '/praʊd/', '/praʊd/', NULL, 3, FALSE, NULL),
  ('frustrated', 'frustrated', '/ˈfrʌstreɪtɪd/', '/frʌsˈtreɪtɪd/', NULL, 4, FALSE, NULL),
  ('anxious', 'anxious', '/ˈæŋkʃəs/', '/ˈæŋkʃəs/', NULL, 4, FALSE, NULL),
  ('grateful', 'grateful', '/ˈɡreɪtfl/', '/ˈɡreɪtfl/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='nervous'), 'nervous.adj.tense', 1, TRUE, 'adjective', '緊張して', 'worried and slightly afraid', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='relieved'), 'relieved.adj.eased', 1, TRUE, 'adjective', 'ほっとした', 'glad because a worry has gone away', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='embarrassed'), 'embarrassed.adj.ashamed', 1, TRUE, 'adjective', '恥ずかしい', 'shy or ashamed in front of other people', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='jealous'), 'jealous.adj.envious', 1, TRUE, 'adjective', '嫉妬して', 'unhappy because you want what someone else has', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='proud'), 'proud.adj.pleased', 1, TRUE, 'adjective', '誇りに思う', 'pleased about something good you or others did', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='frustrated'), 'frustrated.adj.annoyed', 1, TRUE, 'adjective', 'いら立った', 'annoyed because you cannot do what you want', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='anxious'), 'anxious.adj.worried', 1, TRUE, 'adjective', '不安な', 'worried about something that might happen', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='grateful'), 'grateful.adj.thankful', 1, TRUE, 'adjective', '感謝して', 'thankful for something someone did', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('nervous', 'relieved', 'embarrassed', 'jealous', 'proud', 'frustrated', 'anxious', 'grateful')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), (SELECT id FROM vocab_senses WHERE slug='anxious.adj.worried'), NULL, 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='grateful.adj.thankful'), NULL, 'thankful', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='jealous.adj.envious'), NULL, 'envious', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='emotions'
WHERE s.slug IN ('nervous.adj.tense', 'relieved.adj.eased', 'embarrassed.adj.ashamed', 'jealous.adj.envious', 'proud.adj.pleased', 'frustrated.adj.annoyed', 'anxious.adj.worried', 'grateful.adj.thankful')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-4', 2, 0, (SELECT id FROM vocab_categories WHERE slug='emotions'), 'Nuanced emotions', '感情を細かく表す', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-4'), s.id, x.ord FROM (VALUES
  ('nervous.adj.tense',0),('relieved.adj.eased',1),('embarrassed.adj.ashamed',2),('jealous.adj.envious',3),('proud.adj.pleased',4),('frustrated.adj.annoyed',5),('anxious.adj.worried',6),('grateful.adj.thankful',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-4'), 'conversation', 0, 'Before an interview', '面接の前に', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-4'), 'travel', 1, 'A nervous flyer', '飛行機が苦手', 'airport', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-4'), 'business', 2, 'Before the pitch', 'プレゼンの前に', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 0, 'npc', 'You seem quiet today. Everything okay?', '今日は静かだね。大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 1, 'user', 'I''m just {nervous}; I have a big interview tomorrow.', '緊張してるだけ。明日大事な面接があって。', 'nervous', (SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), ARRAY['nervous','relieved','proud','grateful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 2, 'npc', 'Ah, that makes sense. You''ll do great.', 'なるほど。きっとうまくいくよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 3, 'user', 'Thanks. I''m also {frustrated}; I keep forgetting my answers.', 'ありがとう。それにいらいらする。答えを忘れちゃって。', 'frustrated', (SELECT id FROM vocab_senses WHERE slug='frustrated.adj.annoyed'), ARRAY['frustrated','relieved','proud','embarrassed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 4, 'npc', 'Take a breath. Practice with me?', '深呼吸して。私と練習する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 5, 'user', 'That would help. I''m really {grateful} for that.', '助かる。本当に感謝する。', 'grateful', (SELECT id FROM vocab_senses WHERE slug='grateful.adj.thankful'), ARRAY['grateful','jealous','nervous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 6, 'npc', 'Of course. Tell me about your last job.', 'もちろん。前の仕事のこと教えて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 7, 'user', 'I led a big project. I''m quite {proud} of it.', '大きなプロジェクトを率いた。結構誇りに思ってる。', 'proud', (SELECT id FROM vocab_senses WHERE slug='proud.adj.pleased'), ARRAY['proud','embarrassed','nervous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 8, 'npc', 'That''s a great story. Use it tomorrow.', 'いい話だね。明日それを使いなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 9, 'user', 'I will. Last time I was so {embarrassed}; I blanked completely.', 'そうする。前回はすごく恥ずかしくて、頭が真っ白になった。', 'embarrassed', (SELECT id FROM vocab_senses WHERE slug='embarrassed.adj.ashamed'), ARRAY['embarrassed','relieved','grateful','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 10, 'npc', 'Happens to everyone. You''re ready now.', '誰にでもある。もう大丈夫だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 11, 'user', 'Honestly, I feel {relieved} just talking it through.', '正直、話しただけでほっとした。', 'relieved', (SELECT id FROM vocab_senses WHERE slug='relieved.adj.eased'), ARRAY['relieved','nervous','jealous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 12, 'npc', 'Good. Message me after, okay?', 'よかった。終わったら連絡してね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 13, 'user', 'I will. Thanks for listening.', 'するね。聞いてくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 14, 'npc', 'Anytime, {{user_name}}. Good luck!', 'いつでも、{{user_name}}。頑張って！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 0, 'npc', 'Big trip ahead? You look a bit tense.', '大きな旅？少し緊張してるみたい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 1, 'user', 'Yeah, I''m {anxious} about the long flight.', 'うん、長いフライトが不安で。', 'anxious', (SELECT id FROM vocab_senses WHERE slug='anxious.adj.worried'), ARRAY['anxious','proud','grateful','relieved']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 2, 'npc', 'First time flying far?', '遠くへ飛ぶのは初めて？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 3, 'user', 'Kind of. I''m {nervous} during takeoff especially.', 'まあね。特に離陸のとき緊張する。', 'nervous', (SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), ARRAY['nervous','jealous','relieved','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 4, 'npc', 'Takeoff is quick, don''t worry.', '離陸はすぐだよ、心配ないよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 5, 'user', 'You seem so calm. I''m a little {jealous} of that!', 'すごく落ち着いてるね。ちょっと羨ましい！', 'jealous', (SELECT id FROM vocab_senses WHERE slug='jealous.adj.envious'), ARRAY['jealous','grateful','nervous','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 6, 'npc', 'Ha! I fly a lot for work.', 'はは！仕事でよく飛ぶんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 7, 'user', 'Lucky you. I''m {grateful} you''re sitting next to me, honestly.', 'いいなあ。正直、隣に座ってくれて感謝してる。', 'grateful', (SELECT id FROM vocab_senses WHERE slug='grateful.adj.thankful'), ARRAY['grateful','anxious','jealous','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 8, 'npc', 'Happy to help. Deep breaths at takeoff.', '喜んで。離陸のときは深呼吸してね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 9, 'user', 'Okay. I''ll feel {relieved} once we''re in the air.', 'わかった。空に上がればほっとすると思う。', 'relieved', (SELECT id FROM vocab_senses WHERE slug='relieved.adj.eased'), ARRAY['relieved','nervous','jealous','anxious']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 10, 'npc', 'Exactly. Where are you headed?', 'そうそう。どこへ行くの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 11, 'user', 'To see my sister graduate. I''m so {proud} of her.', '妹の卒業式を見に。すごく誇りに思ってる。', 'proud', (SELECT id FROM vocab_senses WHERE slug='proud.adj.pleased'), ARRAY['proud','anxious','jealous','nervous']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 12, 'npc', 'That''s wonderful. Congratulations to her.', '素敵だね。おめでとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 13, 'user', 'Thank you. I feel calmer already.', 'ありがとう。もう落ち着いてきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 14, 'npc', 'See? You''ve got this.', 'ね？大丈夫だよ。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 0, 'npc', 'Ready for the client pitch?', 'クライアントへのプレゼン、準備できてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 1, 'user', 'Almost. I''m a bit {nervous}; it''s a huge account.', 'もう少し。少し緊張してる。大きな案件だから。', 'nervous', (SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), ARRAY['nervous','proud','relieved','grateful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 2, 'npc', 'You''ve prepared well. What''s worrying you?', 'よく準備してるよ。何が気がかり？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 3, 'user', 'I''m so {frustrated}; the slides keep crashing.', 'すごくいらいらする。スライドが何度も落ちて。', 'frustrated', (SELECT id FROM vocab_senses WHERE slug='frustrated.adj.annoyed'), ARRAY['frustrated','proud','relieved','grateful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 4, 'npc', 'Let me fix the file for you.', 'ファイル直してあげる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 5, 'user', 'Thank you. I''m really {grateful} for the help.', 'ありがとう。本当に感謝する。', 'grateful', (SELECT id FROM vocab_senses WHERE slug='grateful.adj.thankful'), ARRAY['grateful','jealous','nervous','embarrassed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 6, 'npc', 'Done. It runs smoothly now.', 'できた。もうスムーズに動くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 7, 'user', 'Oh, I''m so {relieved}! That was stressing me out.', 'ああ、ほっとした！すごくストレスだった。', 'relieved', (SELECT id FROM vocab_senses WHERE slug='relieved.adj.eased'), ARRAY['relieved','nervous','proud','jealous']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 8, 'npc', 'Now go show them your work.', 'さあ、成果を見せてきて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 9, 'user', 'I will. I''m actually {proud} of this campaign.', 'そうする。実はこのキャンペーン、誇りに思ってる。', 'proud', (SELECT id FROM vocab_senses WHERE slug='proud.adj.pleased'), ARRAY['proud','embarrassed','nervous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 10, 'npc', 'You should be. It''s excellent.', '当然だよ。素晴らしいから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 11, 'user', 'Last pitch I froze and felt so {embarrassed}.', '前回はプレゼンで固まって、すごく恥ずかしかった。', 'embarrassed', (SELECT id FROM vocab_senses WHERE slug='embarrassed.adj.ashamed'), ARRAY['embarrassed','relieved','grateful','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 12, 'npc', 'Not this time. You''re ready.', '今回は違う。もう大丈夫。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 13, 'user', 'Thanks for the boost.', '励ましてくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 14, 'npc', 'Anytime. Go get them, {{user_name}}!', 'いつでも。頑張って、{{user_name}}！', NULL, NULL, NULL);

-- ===== seed-vocab-102-5.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-5 - Giving opinions  (Unit 2)
-- Words: opinion, agree, disagree, suggest, prefer, admit, doubt, reckon.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('opinions', 'Giving opinions', '意見を言う', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('opinion', 'opinion', '/əˈpɪnjən/', '/əˈpɪnjən/', NULL, 3, FALSE, NULL),
  ('agree', 'agree', '/əˈɡriː/', '/əˈɡriː/', NULL, 3, FALSE, NULL),
  ('disagree', 'disagree', '/ˌdɪsəˈɡriː/', '/ˌdɪsəˈɡriː/', NULL, 3, FALSE, NULL),
  ('suggest', 'suggest', '/səˈdʒest/', '/səˈdʒest/', NULL, 3, FALSE, NULL),
  ('prefer', 'prefer', '/prɪˈfɜːr/', '/prɪˈfɜː/', NULL, 3, FALSE, NULL),
  ('admit', 'admit', '/ədˈmɪt/', '/ədˈmɪt/', NULL, 4, FALSE, NULL),
  ('doubt', 'doubt', '/daʊt/', '/daʊt/', NULL, 4, TRUE, 'b は発音しない。/daʊt/。'),
  ('reckon', 'reckon', '/ˈrekən/', '/ˈrekən/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='opinion'), 'opinion.n.view', 1, TRUE, 'noun', '意見', 'what you think or believe about something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='agree'), 'agree.v.concur', 1, TRUE, 'verb', '同意する', 'to have the same opinion as someone', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='disagree'), 'disagree.v.differ', 1, TRUE, 'verb', '反対する', 'to have a different opinion from someone', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='suggest'), 'suggest.v.propose', 1, TRUE, 'verb', '提案する', 'to offer an idea or plan for others to consider', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='prefer'), 'prefer.v.rather', 1, TRUE, 'verb', 'の方を好む', 'to like one thing more than another', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='admit'), 'admit.v.confess', 1, TRUE, 'verb', '認める', 'to agree that something is true, often unwillingly', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='doubt'), 'doubt.v.question', 1, TRUE, 'verb', '疑う', 'to think that something may not be true', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reckon'), 'reckon.v.think', 1, TRUE, 'verb', '…だと思う', 'to think or believe something (informal)', 'B2', 'くだけた言い方の「思う」。会話向け。')
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('opinion', 'agree', 'disagree', 'suggest', 'prefer', 'admit', 'doubt', 'reckon')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), (SELECT id FROM vocab_senses WHERE slug='disagree.v.differ'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='disagree.v.differ'), (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='opinions'
WHERE s.slug IN ('opinion.n.view', 'agree.v.concur', 'disagree.v.differ', 'suggest.v.propose', 'prefer.v.rather', 'admit.v.confess', 'doubt.v.question', 'reckon.v.think')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-5', 2, 1, (SELECT id FROM vocab_categories WHERE slug='opinions'), 'Giving opinions', '意見の言い方', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-5'), s.id, x.ord FROM (VALUES
  ('opinion.n.view',0),('agree.v.concur',1),('disagree.v.differ',2),('suggest.v.propose',3),('prefer.v.rather',4),('admit.v.confess',5),('doubt.v.question',6),('reckon.v.think',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-5'), 'conversation', 0, 'Choosing a restaurant', '店を選ぶ', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-5'), 'travel', 1, 'Planning the day', '一日の計画', 'hotel', 'travel buddy'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-5'), 'business', 2, 'A launch decision', '発売の判断', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 0, 'npc', 'Where should we eat tonight?', '今夜どこで食べる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 1, 'user', 'Can I {suggest} the new ramen place?', '新しいラーメン屋を提案してもいい？', 'suggest', (SELECT id FROM vocab_senses WHERE slug='suggest.v.propose'), ARRAY['suggest','admit','doubt','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 2, 'npc', 'Hmm, it''s always crowded.', 'うーん、いつも混んでるよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 3, 'user', 'True. I {prefer} somewhere quiet anyway.', '確かに。どっちにしても静かな方が好き。', 'prefer', (SELECT id FROM vocab_senses WHERE slug='prefer.v.rather'), ARRAY['prefer','agree','disagree','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 4, 'npc', 'Same. What about the cafe on Fifth?', '私も。5番街のカフェは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 5, 'user', 'I {agree}, that''s a good choice.', '賛成、いい選択だね。', 'agree', (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), ARRAY['agree','disagree','admit','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 6, 'npc', 'Great. Though it can be pricey.', 'いいね。ちょっと高いかもだけど。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 7, 'user', 'I {doubt} it''s that expensive for lunch.', 'ランチならそんなに高くないと思うよ。', 'doubt', (SELECT id FROM vocab_senses WHERE slug='doubt.v.question'), ARRAY['doubt','agree','suggest','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 8, 'npc', 'You might be right. Let''s check the menu.', 'そうかも。メニュー見てみよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 9, 'user', 'In my {opinion}, their pasta is the best.', '私の意見では、あそこのパスタが一番。', 'opinion', (SELECT id FROM vocab_senses WHERE slug='opinion.n.view'), ARRAY['opinion','agree','doubt','suggest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 10, 'npc', 'Bold claim! I''ve never tried it.', '自信あるね！食べたことないや。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 11, 'user', 'I''ll {admit}, I go there too often.', '認めるよ、行きすぎてるって。', 'admit', (SELECT id FROM vocab_senses WHERE slug='admit.v.confess'), ARRAY['admit','disagree','prefer','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 12, 'npc', 'Ha, let''s go then.', 'はは、じゃあ行こう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 13, 'user', 'Perfect, I''m hungry.', 'いいね、お腹すいた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 14, 'npc', 'Let''s walk over, {{user_name}}.', '歩いて行こう、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 0, 'npc', 'Shall we do the museum or the beach first?', '美術館と海、どっちを先にする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 1, 'user', 'I {reckon} the beach first, before it gets hot.', '暑くなる前に、海が先だと思う。', 'reckon', (SELECT id FROM vocab_senses WHERE slug='reckon.v.think'), ARRAY['reckon','admit','doubt','agree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 2, 'npc', 'Hmm, mornings are best for the museum, though.', 'うーん、美術館は午前がいいけどね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 3, 'user', 'I {disagree}; the beach is quieter early.', '反対だな、海は朝の方が空いてる。', 'disagree', (SELECT id FROM vocab_senses WHERE slug='disagree.v.differ'), ARRAY['disagree','agree','suggest','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 4, 'npc', 'Fair point. I can be flexible.', '一理あるね。合わせられるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 5, 'user', 'Can I {suggest} the beach now, museum after lunch?', '海を今、美術館を昼食後にって提案してもいい？', 'suggest', (SELECT id FROM vocab_senses WHERE slug='suggest.v.propose'), ARRAY['suggest','admit','doubt','reckon']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 6, 'npc', 'That works for me.', 'それでいいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 7, 'user', 'Good. I {prefer} the sea in the morning.', 'よかった。海は朝の方が好き。', 'prefer', (SELECT id FROM vocab_senses WHERE slug='prefer.v.rather'), ARRAY['prefer','agree','disagree','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 8, 'npc', 'Me too, actually.', '実は私も。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 9, 'user', 'See, we {agree} after all!', 'ほら、結局意見が合った！', 'agree', (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), ARRAY['agree','disagree','admit','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 10, 'npc', 'Ha, we usually do.', 'はは、たいていそうだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 11, 'user', 'In my {opinion}, flexible plans are the best plans.', '私の意見では、柔軟な計画が一番いい。', 'opinion', (SELECT id FROM vocab_senses WHERE slug='opinion.n.view'), ARRAY['opinion','doubt','suggest','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 12, 'npc', 'Wise words. Let''s grab our bags.', '名言だね。荷物取ってこよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 13, 'user', 'Ready when you are.', 'いつでもいいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 14, 'npc', 'Off we go!', '出発！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 0, 'npc', 'So, do we launch in June or July?', 'で、発売は6月？7月？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 1, 'user', 'In my {opinion}, July gives us more time.', '私の意見では、7月の方が時間に余裕がある。', 'opinion', (SELECT id FROM vocab_senses WHERE slug='opinion.n.view'), ARRAY['opinion','doubt','agree','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 2, 'npc', 'Interesting. Marketing wants June.', 'なるほど。マーケは6月推し。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 3, 'user', 'I {disagree} with June; it''s too rushed.', '6月には反対、急ぎすぎる。', 'disagree', (SELECT id FROM vocab_senses WHERE slug='disagree.v.differ'), ARRAY['disagree','agree','suggest','reckon']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 4, 'npc', 'You may be right. What''s your plan?', '確かに。案は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 5, 'user', 'I''d {suggest} a soft launch in July.', '7月にソフトローンチを提案するよ。', 'suggest', (SELECT id FROM vocab_senses WHERE slug='suggest.v.propose'), ARRAY['suggest','admit','doubt','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 6, 'npc', 'The client might push back, though.', 'でもクライアントが渋るかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 7, 'user', 'I {doubt} they''ll mind a short delay.', '短い遅れなら気にしないと思う。', 'doubt', (SELECT id FROM vocab_senses WHERE slug='doubt.v.question'), ARRAY['doubt','agree','suggest','opinion']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 8, 'npc', 'Okay. Can you present this idea?', 'わかった。この案、発表できる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 9, 'user', 'Sure, though I''ll {admit} I''m still refining it.', 'いいよ、まだ詰めてるのは認めるけど。', 'admit', (SELECT id FROM vocab_senses WHERE slug='admit.v.confess'), ARRAY['admit','disagree','prefer','agree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 10, 'npc', 'That''s fine. The team will like it.', '大丈夫。チームも気に入るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 11, 'user', 'I hope they {agree} once they see the timeline.', '日程を見たら賛成してくれるといいな。', 'agree', (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), ARRAY['agree','disagree','doubt','suggest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 12, 'npc', 'Let''s find out in the meeting.', '会議で確かめよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 13, 'user', 'I''ll set it up.', 'セットするね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 14, 'npc', 'Great work, {{user_name}}.', 'いい仕事だね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-6.sql =====
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

-- ===== seed-vocab-102-7.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-7 - The workplace  (Unit 3)
-- Words: salary, promotion, overtime, staff, manager, department, shift, contract.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('workplace', 'The workplace', '職場', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('salary', 'salary', '/ˈsæləri/', '/ˈsæləri/', NULL, 3, FALSE, NULL),
  ('promotion', 'promotion', '/prəˈmoʊʃn/', '/prəˈməʊʃn/', NULL, 4, FALSE, NULL),
  ('overtime', 'overtime', '/ˈoʊvərtaɪm/', '/ˈəʊvətaɪm/', NULL, 4, FALSE, NULL),
  ('staff', 'staff', '/stæf/', '/stɑːf/', NULL, 3, FALSE, NULL),
  ('manager', 'manager', '/ˈmænɪdʒər/', '/ˈmænɪdʒə/', NULL, 3, FALSE, NULL),
  ('department', 'department', '/dɪˈpɑːrtmənt/', '/dɪˈpɑːtmənt/', NULL, 3, FALSE, NULL),
  ('shift', 'shift', '/ʃɪft/', '/ʃɪft/', NULL, 3, FALSE, NULL),
  ('contract', 'contract', '/ˈkɑːntrækt/', '/ˈkɒntrækt/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='salary'), 'salary.n.pay', 1, TRUE, 'noun', '給料', 'the money you are paid each month for your job', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='promotion'), 'promotion.n.advance', 1, TRUE, 'noun', '昇進', 'a move to a higher, more important job', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='overtime'), 'overtime.n.extrahours', 1, TRUE, 'noun', '残業', 'extra hours you work beyond your normal time', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='staff'), 'staff.n.employees', 1, TRUE, 'noun', '従業員', 'the group of people who work for a company', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='manager'), 'manager.n.boss', 1, TRUE, 'noun', '管理職', 'a person who leads a team or business', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='department'), 'department.n.section', 1, TRUE, 'noun', '部署', 'a section of a company or organization', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shift'), 'shift.n.workperiod', 1, TRUE, 'noun', 'シフト', 'a set period of work time', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='contract'), 'contract.n.agreement', 1, TRUE, 'noun', '契約', 'a written work agreement', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('salary', 'promotion', 'overtime', 'staff', 'manager', 'department', 'shift', 'contract')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='workplace'
WHERE s.slug IN ('salary.n.pay', 'promotion.n.advance', 'overtime.n.extrahours', 'staff.n.employees', 'manager.n.boss', 'department.n.section', 'shift.n.workperiod', 'contract.n.agreement')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-7', 3, 0, (SELECT id FROM vocab_categories WHERE slug='workplace'), 'The workplace', '職場のことば', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-7'), s.id, x.ord FROM (VALUES
  ('salary.n.pay',0),('promotion.n.advance',1),('overtime.n.extrahours',2),('staff.n.employees',3),('manager.n.boss',4),('department.n.section',5),('shift.n.workperiod',6),('contract.n.agreement',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-7'), 'conversation', 0, 'Your new job', '新しい仕事', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-7'), 'travel', 1, 'A working holiday', 'ワーキングホリデー', 'hostel', 'employer'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-7'), 'business', 2, 'Onboarding paperwork', '入社手続き', 'office', 'HR staff');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 0, 'npc', 'How''s the new job going?', '新しい仕事どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 1, 'user', 'Good! I''m in the design {department}.', 'いい感じ！デザイン部にいるよ。', 'department', (SELECT id FROM vocab_senses WHERE slug='department.n.section'), ARRAY['department','salary','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 2, 'npc', 'Nice. Do you like your team?', 'いいね。チームは好き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 3, 'user', 'Yeah, my {manager} is really supportive.', 'うん、上司がすごく協力的。', 'manager', (SELECT id FROM vocab_senses WHERE slug='manager.n.boss'), ARRAY['manager','promotion','overtime','staff']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 4, 'npc', 'That helps a lot. Good hours?', '助かるね。時間はいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 5, 'user', 'Mostly. My {shift} runs nine to five.', 'だいたい。勤務は9時から5時。', 'shift', (SELECT id FROM vocab_senses WHERE slug='shift.n.workperiod'), ARRAY['shift','salary','department','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 6, 'npc', 'No late nights?', '夜遅くはない？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 7, 'user', 'Sometimes I do {overtime} when we''re busy.', '忙しいときは残業もする。', 'overtime', (SELECT id FROM vocab_senses WHERE slug='overtime.n.extrahours'), ARRAY['overtime','promotion','staff','manager']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 8, 'npc', 'As long as they pay you for it.', 'ちゃんと払ってくれるならね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 9, 'user', 'They do. My {salary} is fair for the work.', '払ってくれる。仕事に見合った給料だよ。', 'salary', (SELECT id FROM vocab_senses WHERE slug='salary.n.pay'), ARRAY['salary','shift','department','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 10, 'npc', 'That''s great. Room to grow?', 'いいね。昇進の余地は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 11, 'user', 'Yes, there''s a {promotion} in a year if I do well.', 'うん、頑張れば1年で昇進がある。', 'promotion', (SELECT id FROM vocab_senses WHERE slug='promotion.n.advance'), ARRAY['promotion','overtime','staff','shift']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 12, 'npc', 'Sounds like a keeper.', 'いい職場だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 13, 'user', 'I think so too.', '私もそう思う。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 14, 'npc', 'Happy for you, {{user_name}}.', 'よかったね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 0, 'npc', 'So you want to work here over the summer?', '夏の間ここで働きたいの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 1, 'user', 'Yes! Are you hiring {staff} right now?', 'はい！今、従業員を募集してますか？', 'staff', (SELECT id FROM vocab_senses WHERE slug='staff.n.employees'), ARRAY['staff','salary','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 2, 'npc', 'We are. Mostly at the front desk.', 'してるよ。主にフロントで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 3, 'user', 'Great. What {shift} would I work?', 'いいですね。どのシフトになりますか？', 'shift', (SELECT id FROM vocab_senses WHERE slug='shift.n.workperiod'), ARRAY['shift','salary','staff','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 4, 'npc', 'Evenings, five to eleven.', '夕方、5時から11時。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 5, 'user', 'Okay. And what''s the {salary}?', 'わかりました。給料は？', 'salary', (SELECT id FROM vocab_senses WHERE slug='salary.n.pay'), ARRAY['salary','staff','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 6, 'npc', 'It''s hourly, paid every two weeks.', '時給制で、2週間ごとの支払い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 7, 'user', 'Is there {overtime} if I stay late?', '遅くまで残ったら残業はつきますか？', 'overtime', (SELECT id FROM vocab_senses WHERE slug='overtime.n.extrahours'), ARRAY['overtime','staff','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 8, 'npc', 'Yes, extra pay after eleven.', 'うん、11時以降は割増。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 9, 'user', 'Do I sign a {contract} for the season?', 'シーズンの契約書にサインしますか？', 'contract', (SELECT id FROM vocab_senses WHERE slug='contract.n.agreement'), ARRAY['contract','staff','shift','salary']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 10, 'npc', 'Yes, a three-month one.', 'うん、3か月のね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 11, 'user', 'Who would be my {manager}?', '私の上司は誰になりますか？', 'manager', (SELECT id FROM vocab_senses WHERE slug='manager.n.boss'), ARRAY['manager','staff','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 12, 'npc', 'That would be me!', '私だよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 13, 'user', 'Perfect. When can I start?', '完璧です。いつから始められますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 14, 'npc', 'How about Monday?', '月曜はどう？', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 0, 'npc', 'Welcome aboard! Let''s finish your paperwork.', 'ようこそ！書類を済ませましょう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 1, 'user', 'Thanks. Where do I sign the {contract}?', 'ありがとう。契約書はどこにサインを？', 'contract', (SELECT id FROM vocab_senses WHERE slug='contract.n.agreement'), ARRAY['contract','salary','staff','department']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 2, 'npc', 'Right here. Two years, as we agreed.', 'ここです。合意通り2年で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 3, 'user', 'And my {salary} is paid monthly?', '給料は月払いですか？', 'salary', (SELECT id FROM vocab_senses WHERE slug='salary.n.pay'), ARRAY['salary','staff','department','promotion']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 4, 'npc', 'Yes, on the 25th each month.', 'はい、毎月25日に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 5, 'user', 'Which {department} will I be in?', 'どの部署になりますか？', 'department', (SELECT id FROM vocab_senses WHERE slug='department.n.section'), ARRAY['department','staff','promotion','overtime']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 6, 'npc', 'Product, on the third floor.', '3階のプロダクト部です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 7, 'user', 'How many {staff} are on the team?', 'チームには何人いますか？', 'staff', (SELECT id FROM vocab_senses WHERE slug='staff.n.employees'), ARRAY['staff','salary','promotion','overtime']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 8, 'npc', 'About twelve, all friendly.', '12人くらい、みんな感じいいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 9, 'user', 'Is {overtime} common here?', 'ここは残業が多いですか？', 'overtime', (SELECT id FROM vocab_senses WHERE slug='overtime.n.extrahours'), ARRAY['overtime','salary','department','promotion']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 10, 'npc', 'Rarely, we respect your time.', 'ほとんどない、時間を大切にしてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 11, 'user', 'Good to hear. Is there room for {promotion}?', 'よかった。昇進の余地はありますか？', 'promotion', (SELECT id FROM vocab_senses WHERE slug='promotion.n.advance'), ARRAY['promotion','staff','overtime','department']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 12, 'npc', 'Definitely, we promote from within.', 'もちろん、社内から昇進させます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 13, 'user', 'That''s motivating.', 'やる気が出ます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 14, 'npc', 'Glad you''re here, {{user_name}}.', '来てくれて嬉しいよ、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-8.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-8 - Job hunting  (Unit 3)
-- Words: apply for, take on, hand in, fill in, turn down, carry out, look into, sort out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('job-hunting', 'Job hunting', '就職活動', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('apply for', 'apply for', '/əˈplaɪ fɔːr/', '/əˈplaɪ fɔː/', NULL, 3, FALSE, NULL),
  ('take on', 'take on', '/ˌteɪk ˈɑːn/', '/ˌteɪk ˈɒn/', NULL, 4, FALSE, NULL),
  ('hand in', 'hand in', '/ˌhænd ˈɪn/', '/ˌhænd ˈɪn/', NULL, 3, FALSE, NULL),
  ('fill in', 'fill in', '/ˌfɪl ˈɪn/', '/ˌfɪl ˈɪn/', NULL, 3, FALSE, NULL),
  ('turn down', 'turn down', '/ˌtɜːrn ˈdaʊn/', '/ˌtɜːn ˈdaʊn/', NULL, 4, FALSE, NULL),
  ('carry out', 'carry out', '/ˌkæri ˈaʊt/', '/ˌkæri ˈaʊt/', NULL, 4, FALSE, NULL),
  ('look into', 'look into', '/ˌlʊk ˈɪntuː/', '/ˌlʊk ˈɪntuː/', NULL, 4, FALSE, NULL),
  ('sort out', 'sort out', '/ˌsɔːrt ˈaʊt/', '/ˌsɔːt ˈaʊt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='apply for'), 'apply-for.phrv.request', 1, TRUE, 'phrasal verb', '応募する', 'to formally ask for a job or place', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take on'), 'take-on.phrv.accept', 1, TRUE, 'phrasal verb', '引き受ける', 'to accept work or responsibility', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hand in'), 'hand-in.phrv.submit', 1, TRUE, 'phrasal verb', '提出する', 'to give something to a person in authority', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fill in'), 'fill-in.phrv.complete', 1, TRUE, 'phrasal verb', '記入する', 'to write information in the spaces on a form', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='turn down'), 'turn-down.phrv.refuse', 1, TRUE, 'phrasal verb', '断る', 'to refuse an offer or request', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='carry out'), 'carry-out.phrv.perform', 1, TRUE, 'phrasal verb', '実行する', 'to do a task or plan', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='look into'), 'look-into.phrv.investigate', 1, TRUE, 'phrasal verb', '調べる', 'to investigate or examine something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sort out'), 'sort-out.phrv.resolve', 1, TRUE, 'phrasal verb', '解決する', 'to deal with a problem successfully', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('apply for', 'take on', 'hand in', 'fill in', 'turn down', 'carry out', 'look into', 'sort out')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='sort-out.phrv.resolve'), NULL, 'resolve', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='job-hunting'
WHERE s.slug IN ('apply-for.phrv.request', 'take-on.phrv.accept', 'hand-in.phrv.submit', 'fill-in.phrv.complete', 'turn-down.phrv.refuse', 'carry-out.phrv.perform', 'look-into.phrv.investigate', 'sort-out.phrv.resolve')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-8', 3, 1, (SELECT id FROM vocab_categories WHERE slug='job-hunting'), 'Job hunting', '仕事を探す', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-8'), s.id, x.ord FROM (VALUES
  ('apply-for.phrv.request',0),('take-on.phrv.accept',1),('hand-in.phrv.submit',2),('fill-in.phrv.complete',3),('turn-down.phrv.refuse',4),('carry-out.phrv.perform',5),('look-into.phrv.investigate',6),('sort-out.phrv.resolve',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-8'), 'conversation', 0, 'Job hunting', '仕事探し', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-8'), 'travel', 1, 'The work permit office', '就労許可の窓口', 'office', 'official'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-8'), 'business', 2, 'Delegating a project', 'プロジェクトの分担', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 0, 'npc', 'I heard you''re job hunting. Any luck?', '仕事探してるって聞いたよ。どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 1, 'user', 'Some! I might {apply for} a role at a design studio.', 'まあまあ！デザイン事務所の求人に応募するかも。', 'apply for', (SELECT id FROM vocab_senses WHERE slug='apply-for.phrv.request'), ARRAY['apply for','hand in','turn down','sort out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 2, 'npc', 'Nice! Have you sent your CV?', 'いいね！履歴書は送った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 3, 'user', 'Not yet. I''ll {hand in} my application tomorrow.', 'まだ。明日応募書類を提出するよ。', 'hand in', (SELECT id FROM vocab_senses WHERE slug='hand-in.phrv.submit'), ARRAY['hand in','take on','look into','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 4, 'npc', 'Do they need a form too?', 'フォームも必要なの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 5, 'user', 'Yeah, I still need to {fill in} the online form.', 'うん、まだオンラインフォームに記入しないと。', 'fill in', (SELECT id FROM vocab_senses WHERE slug='fill-in.phrv.complete'), ARRAY['fill in','carry out','take on','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 6, 'npc', 'Don''t rush it.', '焦らないでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 7, 'user', 'I won''t. I''ll also {look into} the company culture first.', '焦らない。会社の雰囲気も先に調べるよ。', 'look into', (SELECT id FROM vocab_senses WHERE slug='look-into.phrv.investigate'), ARRAY['look into','hand in','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 8, 'npc', 'Smart. What if they offer low pay?', '賢い。給料が低かったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 9, 'user', 'Then I''ll politely {turn down} the offer.', 'そのときは丁寧に断るよ。', 'turn down', (SELECT id FROM vocab_senses WHERE slug='turn-down.phrv.refuse'), ARRAY['turn down','apply for','fill in','hand in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 10, 'npc', 'Good boundaries. Busy otherwise?', 'いい線引きだね。他は忙しい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 11, 'user', 'A little. I might {take on} some freelance work meanwhile.', '少し。その間フリーの仕事も引き受けるかも。', 'take on', (SELECT id FROM vocab_senses WHERE slug='take-on.phrv.accept'), ARRAY['take on','hand in','fill in','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 12, 'npc', 'Keep me posted!', 'また教えてね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 13, 'user', 'I will, thanks.', 'うん、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 14, 'npc', 'You''ve got this, {{user_name}}.', '大丈夫だよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 0, 'npc', 'Good morning. How can I help?', 'おはようございます。ご用件は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 1, 'user', 'I''d like to {apply for} a work permit.', '就労許可を申請したいです。', 'apply for', (SELECT id FROM vocab_senses WHERE slug='apply-for.phrv.request'), ARRAY['apply for','hand in','turn down','sort out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 2, 'npc', 'Sure. Do you have the form?', 'はい。用紙はお持ちですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 3, 'user', 'Yes, but I need to {fill in} a few boxes.', 'はい、でもいくつか記入が必要です。', 'fill in', (SELECT id FROM vocab_senses WHERE slug='fill-in.phrv.complete'), ARRAY['fill in','carry out','take on','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 4, 'npc', 'Take your time. Sign at the bottom.', 'ごゆっくり。下にサインを。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 5, 'user', 'Done. Where do I {hand in} the papers?', 'できました。書類はどこに提出を？', 'hand in', (SELECT id FROM vocab_senses WHERE slug='hand-in.phrv.submit'), ARRAY['hand in','look into','take on','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 6, 'npc', 'At window three.', '3番窓口です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 7, 'user', 'Great. Can you {sort out} my start date too?', 'ありがとう。開始日も調整してもらえますか？', 'sort out', (SELECT id FROM vocab_senses WHERE slug='sort-out.phrv.resolve'), ARRAY['sort out','apply for','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 8, 'npc', 'We''ll confirm that by email.', 'メールで確認します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 9, 'user', 'Could you {look into} my visa status while I wait?', '待っている間、ビザの状況を調べてもらえますか？', 'look into', (SELECT id FROM vocab_senses WHERE slug='look-into.phrv.investigate'), ARRAY['look into','hand in','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 10, 'npc', 'Let me check the system.', 'システムを確認しますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 11, 'user', 'Thanks. I know you {carry out} lots of checks.', 'ありがとう。たくさんの確認を行っているんですよね。', 'carry out', (SELECT id FROM vocab_senses WHERE slug='carry-out.phrv.perform'), ARRAY['carry out','apply for','turn down','hand in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 12, 'npc', 'All done. You''re approved!', '完了です。承認されました！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 13, 'user', 'That''s wonderful, thank you.', 'よかった、ありがとうございます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 14, 'npc', 'Welcome, and good luck!', 'ようこそ、頑張ってください！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 0, 'npc', 'Can you help with the new client project?', '新しいクライアントの案件、手伝える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 1, 'user', 'Sure, I can {take on} the research part.', 'いいよ、リサーチの部分を引き受ける。', 'take on', (SELECT id FROM vocab_senses WHERE slug='take-on.phrv.accept'), ARRAY['take on','hand in','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 2, 'npc', 'Great. It''s a lot of work.', '助かる。かなりの量だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 3, 'user', 'No problem. I''ll {carry out} the interviews first.', '大丈夫。まずインタビューを実行するよ。', 'carry out', (SELECT id FROM vocab_senses WHERE slug='carry-out.phrv.perform'), ARRAY['carry out','hand in','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 4, 'npc', 'There''s a data issue too.', 'データの問題もあるんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 5, 'user', 'I''ll {look into} the numbers this afternoon.', '午後に数字を調べるよ。', 'look into', (SELECT id FROM vocab_senses WHERE slug='look-into.phrv.investigate'), ARRAY['look into','hand in','turn down','apply for']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 6, 'npc', 'Thanks. When can you finish?', 'ありがとう。いつ終わる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 7, 'user', 'I''ll {hand in} the draft by Thursday.', '木曜までにドラフトを提出する。', 'hand in', (SELECT id FROM vocab_senses WHERE slug='hand-in.phrv.submit'), ARRAY['hand in','take on','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 8, 'npc', 'The client keeps changing the brief.', 'クライアントが要件をころころ変える。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 9, 'user', 'Let me {sort out} the requirements with them.', '要件を先方と整理してくるよ。', 'sort out', (SELECT id FROM vocab_senses WHERE slug='sort-out.phrv.resolve'), ARRAY['sort out','apply for','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 10, 'npc', 'Perfect. One more small task?', '完璧。もう一つ小さい仕事いい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 11, 'user', 'Honestly, I''ll {turn down} extra work this week; I''m full.', '正直、今週は追加は断るよ、手一杯で。', 'turn down', (SELECT id FROM vocab_senses WHERE slug='turn-down.phrv.refuse'), ARRAY['turn down','take on','hand in','carry out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 12, 'npc', 'Fair enough. Focus on the main job.', '了解。メインに集中して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 13, 'user', 'Thanks for understanding.', '分かってくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 14, 'npc', 'Of course, {{user_name}}.', 'もちろん、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-9.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-9 - Meetings & tasks  (Unit 3)
-- Words: schedule, arrange, cancel, postpone, attend, agenda, presentation, workload.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('meetings-tasks', 'Meetings & tasks', '会議と仕事', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('schedule', 'schedule', '/ˈskedʒuːl/', '/ˈʃedjuːl/', NULL, 3, FALSE, NULL),
  ('arrange', 'arrange', '/əˈreɪndʒ/', '/əˈreɪndʒ/', NULL, 3, FALSE, NULL),
  ('cancel', 'cancel', '/ˈkænsl/', '/ˈkænsl/', NULL, 3, FALSE, NULL),
  ('postpone', 'postpone', '/poʊsˈtpoʊn/', '/pəˈspəʊn/', NULL, 4, FALSE, NULL),
  ('attend', 'attend', '/əˈtend/', '/əˈtend/', NULL, 3, FALSE, NULL),
  ('agenda', 'agenda', '/əˈdʒendə/', '/əˈdʒendə/', NULL, 4, FALSE, NULL),
  ('presentation', 'presentation', '/ˌpreznˈteɪʃn/', '/ˌpreznˈteɪʃn/', NULL, 3, FALSE, NULL),
  ('workload', 'workload', '/ˈwɜːrkloʊd/', '/ˈwɜːkləʊd/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='schedule'), 'schedule.n.timetable', 1, TRUE, 'noun', '予定表', 'a plan of when things will happen', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='arrange'), 'arrange.v.organize', 1, TRUE, 'verb', '手配する', 'to plan or organize something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cancel'), 'cancel.v.calloff', 1, TRUE, 'verb', '中止する', 'to decide that something will not happen', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='postpone'), 'postpone.v.delay', 1, TRUE, 'verb', '延期する', 'to move something to a later time', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='attend'), 'attend.v.gotomeeting', 1, TRUE, 'verb', '出席する', 'to go to an event or meeting', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='agenda'), 'agenda.n.itemlist', 1, TRUE, 'noun', '議題', 'a list of things to discuss at a meeting', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='presentation'), 'presentation.n.talk', 1, TRUE, 'noun', 'プレゼン', 'a talk giving information to a group', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='workload'), 'workload.n.amount', 1, TRUE, 'noun', '仕事量', 'the amount of work a person has to do', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('schedule', 'arrange', 'cancel', 'postpone', 'attend', 'agenda', 'presentation', 'workload')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='postpone.v.delay'), NULL, 'delay', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='meetings-tasks'
WHERE s.slug IN ('schedule.n.timetable', 'arrange.v.organize', 'cancel.v.calloff', 'postpone.v.delay', 'attend.v.gotomeeting', 'agenda.n.itemlist', 'presentation.n.talk', 'workload.n.amount')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-9', 3, 2, (SELECT id FROM vocab_categories WHERE slug='meetings-tasks'), 'Meetings & tasks', '会議とタスク', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-9'), s.id, x.ord FROM (VALUES
  ('schedule.n.timetable',0),('arrange.v.organize',1),('cancel.v.calloff',2),('postpone.v.delay',3),('attend.v.gotomeeting',4),('agenda.n.itemlist',5),('presentation.n.talk',6),('workload.n.amount',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-9'), 'conversation', 0, 'Planning a party', 'パーティーの計画', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-9'), 'travel', 1, 'A tour itinerary', 'ツアーの日程', 'hotel', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-9'), 'business', 2, 'Organizing a review', '会議の準備', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 0, 'npc', 'Are we still doing the party this weekend?', '今週末のパーティー、まだやる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 1, 'user', 'Yes! I''ll {arrange} the food and drinks.', 'うん！食べ物と飲み物を手配するよ。', 'arrange', (SELECT id FROM vocab_senses WHERE slug='arrange.v.organize'), ARRAY['arrange','cancel','postpone','attend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 2, 'npc', 'Great. What time?', 'いいね。何時？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 3, 'user', 'Let''s {schedule} it for seven on Saturday.', '土曜の7時に予定しよう。', 'schedule', (SELECT id FROM vocab_senses WHERE slug='schedule.n.timetable'), ARRAY['schedule','cancel','attend','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 4, 'npc', 'Perfect. Is everyone coming?', '完璧。みんな来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 5, 'user', 'Most can {attend}; a few are unsure.', 'ほとんど出席できる。数人は未定。', 'attend', (SELECT id FROM vocab_senses WHERE slug='attend.v.gotomeeting'), ARRAY['attend','cancel','arrange','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 6, 'npc', 'What if it rains?', '雨だったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 7, 'user', 'Then we''ll {postpone} it to Sunday.', 'そのときは日曜に延期する。', 'postpone', (SELECT id FROM vocab_senses WHERE slug='postpone.v.delay'), ARRAY['postpone','arrange','attend','cancel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 8, 'npc', 'And if it storms both days?', '両日とも荒れたら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 9, 'user', 'Then we sadly {cancel} and try next month.', '残念だけど中止して、来月にする。', 'cancel', (SELECT id FROM vocab_senses WHERE slug='cancel.v.calloff'), ARRAY['cancel','arrange','attend','schedule']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 10, 'npc', 'Fingers crossed for sun.', '晴れますように。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 11, 'user', 'Me too. I need a break from my {workload}.', '私も。仕事量から解放されたい。', 'workload', (SELECT id FROM vocab_senses WHERE slug='workload.n.amount'), ARRAY['workload','agenda','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 12, 'npc', 'You work too hard!', '働きすぎだよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 13, 'user', 'This party is my reward.', 'このパーティーがご褒美。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 14, 'npc', 'Well earned, {{user_name}}.', '当然のご褒美だね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 0, 'npc', 'Here''s the plan for your three days.', '3日間のプランです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 1, 'user', 'Thanks. Is the {schedule} flexible?', 'ありがとう。予定は融通きく？', 'schedule', (SELECT id FROM vocab_senses WHERE slug='schedule.n.timetable'), ARRAY['schedule','agenda','workload','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 2, 'npc', 'Somewhat. Mornings are fixed.', '少しは。午前は固定です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 3, 'user', 'Can I {attend} the cooking class on day two?', '2日目の料理教室に参加できますか？', 'attend', (SELECT id FROM vocab_senses WHERE slug='attend.v.gotomeeting'), ARRAY['attend','cancel','arrange','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 4, 'npc', 'Of course, I''ll add you.', 'もちろん、追加します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 5, 'user', 'Could you {arrange} a taxi for the airport too?', '空港へのタクシーも手配してもらえますか？', 'arrange', (SELECT id FROM vocab_senses WHERE slug='arrange.v.organize'), ARRAY['arrange','cancel','attend','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 6, 'npc', 'Done. Anything to remove?', '了解。外したいものは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 7, 'user', 'Let''s {cancel} the museum; I''ve seen it.', '美術館は中止で。もう見たので。', 'cancel', (SELECT id FROM vocab_senses WHERE slug='cancel.v.calloff'), ARRAY['cancel','arrange','attend','schedule']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 8, 'npc', 'No problem. The hike is weather-dependent.', '大丈夫。ハイキングは天気次第です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 9, 'user', 'If it rains, can we {postpone} the hike?', '雨なら、ハイキングは延期できますか？', 'postpone', (SELECT id FROM vocab_senses WHERE slug='postpone.v.delay'), ARRAY['postpone','arrange','attend','cancel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 10, 'npc', 'Yes, we''ll move it to day three.', 'はい、3日目に移します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 11, 'user', 'Great. What''s on the {agenda} for tonight?', 'いいですね。今夜の予定は何ですか？', 'agenda', (SELECT id FROM vocab_senses WHERE slug='agenda.n.itemlist'), ARRAY['agenda','workload','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 12, 'npc', 'A welcome dinner by the harbor.', '港での歓迎ディナーです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 13, 'user', 'That sounds lovely.', '素敵ですね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 14, 'npc', 'Enjoy your stay!', '滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 0, 'npc', 'Can you set up the quarterly review?', '四半期レビューを準備できる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 1, 'user', 'Sure. I''ll {schedule} it for next Tuesday.', 'いいよ。来週火曜に予定するね。', 'schedule', (SELECT id FROM vocab_senses WHERE slug='schedule.n.timetable'), ARRAY['schedule','cancel','attend','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 2, 'npc', 'Good. Who needs to be there?', 'いいね。誰が必要？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 3, 'user', 'All team leads should {attend}.', 'チームリーダー全員が出席すべき。', 'attend', (SELECT id FROM vocab_senses WHERE slug='attend.v.gotomeeting'), ARRAY['attend','cancel','arrange','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 4, 'npc', 'Send them the topics in advance.', '事前に議題を送って。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 5, 'user', 'I''ll email the {agenda} tomorrow.', '明日、議題をメールするよ。', 'agenda', (SELECT id FROM vocab_senses WHERE slug='agenda.n.itemlist'), ARRAY['agenda','workload','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 6, 'npc', 'Are you presenting the results?', '結果は君が発表する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 7, 'user', 'Yes, I''m preparing the {presentation} now.', 'うん、今プレゼンを準備してる。', 'presentation', (SELECT id FROM vocab_senses WHERE slug='presentation.n.talk'), ARRAY['presentation','agenda','schedule','workload']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 8, 'npc', 'The CEO might be traveling that day.', 'その日、CEOは出張かも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 9, 'user', 'If so, we can {postpone} it a week.', 'それなら1週間延期できる。', 'postpone', (SELECT id FROM vocab_senses WHERE slug='postpone.v.delay'), ARRAY['postpone','arrange','attend','cancel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 10, 'npc', 'Let''s keep it if we can.', 'できれば予定通りで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 11, 'user', 'Agreed. My {workload} is lighter next week anyway.', '賛成。どのみち来週は仕事量が軽い。', 'workload', (SELECT id FROM vocab_senses WHERE slug='workload.n.amount'), ARRAY['workload','agenda','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 12, 'npc', 'Perfect. Thanks for organizing.', '完璧。準備ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 13, 'user', 'Happy to help.', '喜んで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 14, 'npc', 'You''re a star, {{user_name}}.', '助かるよ、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-10.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-10 - University life  (Unit 4)
-- Words: degree, lecture, seminar, assignment, tutor, campus, graduate, scholarship.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('university-life', 'University life', '大学生活', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('degree', 'degree', '/dɪˈɡriː/', '/dɪˈɡriː/', NULL, 3, FALSE, NULL),
  ('lecture', 'lecture', '/ˈlektʃər/', '/ˈlektʃə/', NULL, 3, FALSE, NULL),
  ('seminar', 'seminar', '/ˈsemɪnɑːr/', '/ˈsemɪnɑː/', NULL, 4, FALSE, NULL),
  ('assignment', 'assignment', '/əˈsaɪnmənt/', '/əˈsaɪnmənt/', NULL, 3, FALSE, NULL),
  ('tutor', 'tutor', '/ˈtuːtər/', '/ˈtjuːtə/', NULL, 3, FALSE, NULL),
  ('campus', 'campus', '/ˈkæmpəs/', '/ˈkæmpəs/', NULL, 3, FALSE, NULL),
  ('graduate', 'graduate', '/ˈɡrædʒueɪt/', '/ˈɡrædʒueɪt/', NULL, 3, FALSE, NULL),
  ('scholarship', 'scholarship', '/ˈskɑːlərʃɪp/', '/ˈskɒləʃɪp/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='degree'), 'degree.n.qualification', 1, TRUE, 'noun', '学位', 'a qualification you get from a university', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lecture'), 'lecture.n.talk', 1, TRUE, 'noun', '講義', 'a formal talk that teaches students', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='seminar'), 'seminar.n.class', 1, TRUE, 'noun', '演習', 'a small class for discussion', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='assignment'), 'assignment.n.task', 1, TRUE, 'noun', '課題', 'a piece of work given to students', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tutor'), 'tutor.n.teacher', 1, TRUE, 'noun', '個人指導の先生', 'a teacher who helps one or a few students', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='campus'), 'campus.n.grounds', 1, TRUE, 'noun', 'キャンパス', 'the grounds and buildings of a university', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='graduate'), 'graduate.v.finish', 1, TRUE, 'verb', '卒業する', 'to finish your studies at a university', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='scholarship'), 'scholarship.n.grant', 1, TRUE, 'noun', '奨学金', 'money given to help a student study', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('degree', 'lecture', 'seminar', 'assignment', 'tutor', 'campus', 'graduate', 'scholarship')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='university-life'
WHERE s.slug IN ('degree.n.qualification', 'lecture.n.talk', 'seminar.n.class', 'assignment.n.task', 'tutor.n.teacher', 'campus.n.grounds', 'graduate.v.finish', 'scholarship.n.grant')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-10', 4, 0, (SELECT id FROM vocab_categories WHERE slug='university-life'), 'University life', '大学生活', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-10'), s.id, x.ord FROM (VALUES
  ('degree.n.qualification',0),('lecture.n.talk',1),('seminar.n.class',2),('assignment.n.task',3),('tutor.n.teacher',4),('campus.n.grounds',5),('graduate.v.finish',6),('scholarship.n.grant',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-10'), 'conversation', 0, 'At university', '大学で', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-10'), 'travel', 1, 'A campus tour abroad', '留学先のキャンパス見学', 'campus', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-10'), 'business', 2, 'Hiring a graduate', '新卒の採用', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 0, 'npc', 'How''s university treating you?', '大学はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 1, 'user', 'Busy! I''m doing a {degree} in biology.', '忙しい！生物学の学位を取ってる。', 'degree', (SELECT id FROM vocab_senses WHERE slug='degree.n.qualification'), ARRAY['degree','lecture','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 2, 'npc', 'Cool. Hard classes?', 'いいね。授業は難しい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 3, 'user', 'The morning {lecture} is tough; it''s three hours.', '朝の講義がきつい、3時間もある。', 'lecture', (SELECT id FROM vocab_senses WHERE slug='lecture.n.talk'), ARRAY['lecture','degree','campus','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 4, 'npc', 'Yikes. Lots of homework?', 'うわ。宿題は多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 5, 'user', 'Yeah, I have an {assignment} due every week.', 'うん、毎週課題の締め切りがある。', 'assignment', (SELECT id FROM vocab_senses WHERE slug='assignment.n.task'), ARRAY['assignment','tutor','campus','degree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 6, 'npc', 'Who helps when you''re stuck?', '困ったとき誰が助けてくれる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 7, 'user', 'My {tutor} meets me every Thursday.', '指導の先生が毎週木曜に見てくれる。', 'tutor', (SELECT id FROM vocab_senses WHERE slug='tutor.n.teacher'), ARRAY['tutor','lecture','degree','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 8, 'npc', 'Nice support. Do you live nearby?', 'いいサポートだね。近くに住んでる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 9, 'user', 'I live right on {campus}, near the library.', 'キャンパス内、図書館の近くに住んでる。', 'campus', (SELECT id FROM vocab_senses WHERE slug='campus.n.grounds'), ARRAY['campus','degree','lecture','assignment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 10, 'npc', 'Convenient! When do you finish?', '便利だね！いつ終わるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 11, 'user', 'I {graduate} next summer, finally.', '来年の夏にやっと卒業する。', 'graduate', (SELECT id FROM vocab_senses WHERE slug='graduate.v.finish'), ARRAY['graduate','lecture','campus','assignment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 12, 'npc', 'Exciting times ahead.', 'この先が楽しみだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 13, 'user', 'Can''t wait.', '待ちきれない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 14, 'npc', 'Proud of you, {{user_name}}.', '誇らしいよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 0, 'npc', 'Welcome! Ready for the campus tour?', 'ようこそ！キャンパス見学の準備はいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 1, 'user', 'Yes! The {campus} is beautiful.', 'はい！キャンパスがきれいですね。', 'campus', (SELECT id FROM vocab_senses WHERE slug='campus.n.grounds'), ARRAY['campus','degree','lecture','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 2, 'npc', 'Thanks. Are you here for a full program?', 'ありがとう。正規の課程で来たの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 3, 'user', 'One semester, part of my {degree} back home.', '1学期だけ、母国の学位の一部です。', 'degree', (SELECT id FROM vocab_senses WHERE slug='degree.n.qualification'), ARRAY['degree','seminar','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 4, 'npc', 'Great. Did you get funding?', 'いいね。資金は出た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 5, 'user', 'Yes, a {scholarship} covers my tuition.', 'はい、奨学金が学費をカバーしてます。', 'scholarship', (SELECT id FROM vocab_senses WHERE slug='scholarship.n.grant'), ARRAY['scholarship','lecture','campus','seminar']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 6, 'npc', 'Wonderful. Small classes here.', '素晴らしい。ここは少人数制。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 7, 'user', 'I heard each {seminar} has just twelve students.', 'ゼミは12人だけって聞きました。', 'seminar', (SELECT id FROM vocab_senses WHERE slug='seminar.n.class'), ARRAY['seminar','degree','campus','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 8, 'npc', 'Correct. Big lectures too, though.', 'その通り。大きな講義もあるけどね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 9, 'user', 'I don''t mind a big {lecture} now and then.', 'たまの大講義は気になりません。', 'lecture', (SELECT id FROM vocab_senses WHERE slug='lecture.n.talk'), ARRAY['lecture','campus','seminar','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 10, 'npc', 'Good attitude. Exchange students love it.', 'いい姿勢だね。交換留学生に人気だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 11, 'user', 'Do exchange students {graduate} with a certificate?', '交換留学生は修了証をもらって卒業できますか？', 'graduate', (SELECT id FROM vocab_senses WHERE slug='graduate.v.finish'), ARRAY['graduate','lecture','campus','seminar']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 12, 'npc', 'Yes, at the end of the term.', 'はい、学期の終わりに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 13, 'user', 'Perfect. Let''s see the library.', '完璧です。図書館を見ましょう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 14, 'npc', 'Right this way!', 'こちらへどうぞ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 0, 'npc', 'This candidate just finished school.', 'この候補者は学校を出たばかり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 1, 'user', 'Did she {graduate} this year?', '彼女は今年卒業したの？', 'graduate', (SELECT id FROM vocab_senses WHERE slug='graduate.v.finish'), ARRAY['graduate','lecture','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 2, 'npc', 'Yes, top of her class.', 'うん、首席で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 3, 'user', 'What {degree} does she hold?', 'どんな学位を持ってる？', 'degree', (SELECT id FROM vocab_senses WHERE slug='degree.n.qualification'), ARRAY['degree','seminar','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 4, 'npc', 'Computer science, with honors.', 'コンピュータ科学、優等で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 5, 'user', 'Impressive. Did she have a {scholarship}?', 'すごい。奨学金は受けてた？', 'scholarship', (SELECT id FROM vocab_senses WHERE slug='scholarship.n.grant'), ARRAY['scholarship','lecture','campus','seminar']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 6, 'npc', 'A full one, actually.', '実は全額のを。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 7, 'user', 'Any teaching experience, like leading a {seminar}?', 'ゼミを担当したような指導経験は？', 'seminar', (SELECT id FROM vocab_senses WHERE slug='seminar.n.class'), ARRAY['seminar','degree','campus','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 8, 'npc', 'She ran student workshops, yes.', '学生向けワークショップをやってたよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 9, 'user', 'Can we give her a small {assignment} as a test?', '試しに小さな課題を出せる？', 'assignment', (SELECT id FROM vocab_senses WHERE slug='assignment.n.task'), ARRAY['assignment','tutor','campus','degree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 10, 'npc', 'Good idea. A short project.', 'いい考え。短いプロジェクトで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 11, 'user', 'And pair her with a {tutor} for the first month?', '最初の1か月は指導係をつけては？', 'tutor', (SELECT id FROM vocab_senses WHERE slug='tutor.n.teacher'), ARRAY['tutor','lecture','degree','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 12, 'npc', 'Perfect onboarding plan.', '完璧な受け入れ計画だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 13, 'user', 'Let''s invite her in.', '面接に呼ぼう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 14, 'npc', 'Agreed, {{user_name}}.', '賛成、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-11.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-11 - Studying  (Unit 4)
-- Words: catch up, fall behind, keep up, go over, note down, take in, sign up, look up.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('studying', 'Studying', '勉強のしかた', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('catch up', 'catch up', '/ˌkætʃ ˈʌp/', '/ˌkætʃ ˈʌp/', NULL, 3, FALSE, NULL),
  ('fall behind', 'fall behind', '/ˌfɔːl bɪˈhaɪnd/', '/ˌfɔːl bɪˈhaɪnd/', NULL, 4, FALSE, NULL),
  ('keep up', 'keep up', '/ˌkiːp ˈʌp/', '/ˌkiːp ˈʌp/', NULL, 3, FALSE, NULL),
  ('go over', 'go over', '/ˌɡoʊ ˈoʊvər/', '/ˌɡəʊ ˈəʊvə/', NULL, 3, FALSE, NULL),
  ('note down', 'note down', '/ˌnoʊt ˈdaʊn/', '/ˌnəʊt ˈdaʊn/', NULL, 3, FALSE, NULL),
  ('take in', 'take in', '/ˌteɪk ˈɪn/', '/ˌteɪk ˈɪn/', NULL, 4, FALSE, NULL),
  ('sign up', 'sign up', '/ˌsaɪn ˈʌp/', '/ˌsaɪn ˈʌp/', NULL, 3, FALSE, NULL),
  ('look up', 'look up', '/ˌlʊk ˈʌp/', '/ˌlʊk ˈʌp/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='catch up'), 'catch-up.phrv.reach', 1, TRUE, 'phrasal verb', '追いつく', 'to reach the same level or point as others', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fall behind'), 'fall-behind.phrv.lag', 1, TRUE, 'phrasal verb', '遅れる', 'to progress more slowly than others', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='keep up'), 'keep-up.phrv.maintain', 1, TRUE, 'phrasal verb', 'ついていく', 'to stay at the same level or speed as others', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='go over'), 'go-over.phrv.review', 1, TRUE, 'phrasal verb', '見直す', 'to review or check something carefully', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='note down'), 'note-down.phrv.record', 1, TRUE, 'phrasal verb', '書き留める', 'to write something so you remember it', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take in'), 'take-in.phrv.absorb', 1, TRUE, 'phrasal verb', '理解する', 'to understand and remember information', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sign up'), 'sign-up.phrv.enroll', 1, TRUE, 'phrasal verb', '申し込む', 'to put your name on a list to join something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='look up'), 'look-up.phrv.find', 1, TRUE, 'phrasal verb', '（情報を）調べる', 'to find information in a book or online', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('catch up', 'fall behind', 'keep up', 'go over', 'note down', 'take in', 'sign up', 'look up')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='keep-up.phrv.maintain'), (SELECT id FROM vocab_senses WHERE slug='fall-behind.phrv.lag'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='fall-behind.phrv.lag'), (SELECT id FROM vocab_senses WHERE slug='keep-up.phrv.maintain'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='studying'
WHERE s.slug IN ('catch-up.phrv.reach', 'fall-behind.phrv.lag', 'keep-up.phrv.maintain', 'go-over.phrv.review', 'note-down.phrv.record', 'take-in.phrv.absorb', 'sign-up.phrv.enroll', 'look-up.phrv.find')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-11', 4, 1, (SELECT id FROM vocab_categories WHERE slug='studying'), 'Studying', '勉強のしかた', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-11'), s.id, x.ord FROM (VALUES
  ('catch-up.phrv.reach',0),('fall-behind.phrv.lag',1),('keep-up.phrv.maintain',2),('go-over.phrv.review',3),('note-down.phrv.record',4),('take-in.phrv.absorb',5),('sign-up.phrv.enroll',6),('look-up.phrv.find',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-11'), 'conversation', 0, 'Study group', '勉強会', 'library', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-11'), 'travel', 1, 'A language course', '語学コース', 'school', 'teacher'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-11'), 'business', 2, 'Training a new hire', '新人研修', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 0, 'npc', 'You missed class yesterday, right?', '昨日授業休んだよね？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 1, 'user', 'Yeah, I need to {catch up} on the notes.', 'うん、ノートを追いつかないと。', 'catch up', (SELECT id FROM vocab_senses WHERE slug='catch-up.phrv.reach'), ARRAY['catch up','sign up','look up','note down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 2, 'npc', 'I can share mine.', '私のを共有するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 3, 'user', 'Thanks! Can we {go over} them together?', 'ありがとう！一緒に見直せる？', 'go over', (SELECT id FROM vocab_senses WHERE slug='go-over.phrv.review'), ARRAY['go over','sign up','keep up','look up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 4, 'npc', 'Sure. It''s a lot of material.', 'いいよ。量が多いけど。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 5, 'user', 'I know. It''s hard to {take in} all at once.', 'わかる。一度に理解するのは大変。', 'take in', (SELECT id FROM vocab_senses WHERE slug='take-in.phrv.absorb'), ARRAY['take in','sign up','note down','look up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 6, 'npc', 'Let''s do a bit at a time.', '少しずつやろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 7, 'user', 'Good plan. I''ll {note down} the key points.', 'いい計画。要点を書き留めるね。', 'note down', (SELECT id FROM vocab_senses WHERE slug='note-down.phrv.record'), ARRAY['note down','sign up','keep up','catch up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 8, 'npc', 'The pace this term is fast.', '今学期はペースが速い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 9, 'user', 'Really fast. I struggle to {keep up}.', '本当に速い。ついていくのが大変。', 'keep up', (SELECT id FROM vocab_senses WHERE slug='keep-up.phrv.maintain'), ARRAY['keep up','sign up','look up','note down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 10, 'npc', 'Same. We can''t afford to slip.', '同じ。遅れるわけにいかない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 11, 'user', 'Agreed. I don''t want to {fall behind} again.', '賛成。また遅れたくない。', 'fall behind', (SELECT id FROM vocab_senses WHERE slug='fall-behind.phrv.lag'), ARRAY['fall behind','sign up','look up','go over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 12, 'npc', 'We''ll help each other.', '助け合おう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 13, 'user', 'Deal. Same time tomorrow?', '決まり。明日も同じ時間？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='conversation'), 14, 'npc', 'See you then, {{user_name}}.', 'じゃあまた、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 0, 'npc', 'Interested in our language course?', 'うちの語学コースに興味ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 1, 'user', 'Yes, how do I {sign up}?', 'はい、どうやって申し込みますか？', 'sign up', (SELECT id FROM vocab_senses WHERE slug='sign-up.phrv.enroll'), ARRAY['sign up','look up','catch up','go over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 2, 'npc', 'Just fill this form. Beginner level?', 'この用紙に記入を。初級ですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 3, 'user', 'Maybe elementary; I can {keep up} a little.', '初中級かも。少しはついていけます。', 'keep up', (SELECT id FROM vocab_senses WHERE slug='keep-up.phrv.maintain'), ARRAY['keep up','sign up','look up','note down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 4, 'npc', 'Great. We speak only the local language in class.', 'いいね。授業は現地語だけです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 5, 'user', 'That''s intense. Hard to {take in} at first.', '大変ですね。最初は理解が難しそう。', 'take in', (SELECT id FROM vocab_senses WHERE slug='take-in.phrv.absorb'), ARRAY['take in','sign up','look up','catch up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 6, 'npc', 'You''ll adjust fast. Bring a notebook.', 'すぐ慣れます。ノートを持ってきて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 7, 'user', 'I will, to {note down} new words.', 'はい、新しい単語を書き留めます。', 'note down', (SELECT id FROM vocab_senses WHERE slug='note-down.phrv.record'), ARRAY['note down','sign up','keep up','catch up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 8, 'npc', 'And a dictionary app helps.', '辞書アプリも役立つよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 9, 'user', 'Good idea, so I can {look up} words quickly.', 'いい考え、単語をすぐ調べられます。', 'look up', (SELECT id FROM vocab_senses WHERE slug='look-up.phrv.find'), ARRAY['look up','sign up','keep up','note down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 10, 'npc', 'If you miss a day, don''t worry.', '一日休んでも心配ないよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 11, 'user', 'Thanks. I''ll {catch up} with the recordings.', 'ありがとう。録画で追いつきます。', 'catch up', (SELECT id FROM vocab_senses WHERE slug='catch-up.phrv.reach'), ARRAY['catch up','sign up','look up','go over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 12, 'npc', 'Perfect. Class starts Monday.', '完璧。授業は月曜から。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 13, 'user', 'I''ll be there early.', '早めに行きます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='travel'), 14, 'npc', 'Wonderful, see you!', '楽しみ、またね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 0, 'npc', 'Can you train the new hire this week?', '今週、新人を教えられる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 1, 'user', 'Sure. I''ll {go over} the basics first.', 'いいよ。まず基本を見直すね。', 'go over', (SELECT id FROM vocab_senses WHERE slug='go-over.phrv.review'), ARRAY['go over','sign up','look up','fall behind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 2, 'npc', 'There''s a lot of systems to learn.', '覚えるシステムが多いんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 3, 'user', 'Yeah, it''s a lot to {take in} in a week.', 'うん、一週間で吸収するのは多い。', 'take in', (SELECT id FROM vocab_senses WHERE slug='take-in.phrv.absorb'), ARRAY['take in','sign up','look up','catch up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 4, 'npc', 'Give them time.', '時間をあげて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 5, 'user', 'I''ll have them {sign up} for the online course too.', 'オンライン講座にも登録させるよ。', 'sign up', (SELECT id FROM vocab_senses WHERE slug='sign-up.phrv.enroll'), ARRAY['sign up','keep up','look up','go over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 6, 'npc', 'Good. They missed Monday''s session.', 'いいね。月曜のセッションは休んだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 7, 'user', 'No problem, they can {catch up} with the recording.', '大丈夫、録画で追いつける。', 'catch up', (SELECT id FROM vocab_senses WHERE slug='catch-up.phrv.reach'), ARRAY['catch up','sign up','look up','keep up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 8, 'npc', 'Can they handle the pace?', 'ペースについてこられる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 9, 'user', 'I think they''ll {keep up} fine; they''re sharp.', '大丈夫だと思う、飲み込みが早い。', 'keep up', (SELECT id FROM vocab_senses WHERE slug='keep-up.phrv.maintain'), ARRAY['keep up','sign up','look up','go over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 10, 'npc', 'Great. What if they get stuck?', 'いいね。詰まったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 11, 'user', 'They can {look up} answers in our internal wiki.', '社内ウィキで答えを調べられる。', 'look up', (SELECT id FROM vocab_senses WHERE slug='look-up.phrv.find'), ARRAY['look up','sign up','keep up','catch up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 12, 'npc', 'Perfect. Thanks for mentoring.', '完璧。指導ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 13, 'user', 'Happy to.', '喜んで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-11') AND goal='business'), 14, 'npc', 'You''re great at this, {{user_name}}.', '君は教えるのが上手だね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-12.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-12 - Skills & knowledge  (Unit 4)
-- Words: skill, ability, talent, knowledge, experience, qualification, expert, beginner.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('skills-knowledge', 'Skills & knowledge', '能力と知識', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('skill', 'skill', '/skɪl/', '/skɪl/', NULL, 3, FALSE, NULL),
  ('ability', 'ability', '/əˈbɪləti/', '/əˈbɪləti/', NULL, 3, FALSE, NULL),
  ('talent', 'talent', '/ˈtælənt/', '/ˈtælənt/', NULL, 3, FALSE, NULL),
  ('knowledge', 'knowledge', '/ˈnɑːlɪdʒ/', '/ˈnɒlɪdʒ/', NULL, 3, TRUE, 'k は発音しない。/ˈnɑːlɪdʒ/。'),
  ('experience', 'experience', '/ɪkˈspɪriəns/', '/ɪkˈspɪəriəns/', NULL, 3, FALSE, NULL),
  ('qualification', 'qualification', '/ˌkwɑːlɪfɪˈkeɪʃn/', '/ˌkwɒlɪfɪˈkeɪʃn/', NULL, 4, FALSE, NULL),
  ('expert', 'expert', '/ˈekspɜːrt/', '/ˈekspɜːt/', NULL, 3, FALSE, NULL),
  ('beginner', 'beginner', '/bɪˈɡɪnər/', '/bɪˈɡɪnə/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='skill'), 'skill.n.ability', 1, TRUE, 'noun', '技能', 'an ability to do something well, learned with practice', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ability'), 'ability.n.capacity', 1, TRUE, 'noun', '能力', 'the power or knowledge to do something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='talent'), 'talent.n.gift', 1, TRUE, 'noun', '才能', 'a natural ability to do something well', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='knowledge'), 'knowledge.n.info', 1, TRUE, 'noun', '知識', 'the information and understanding you have', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='experience'), 'experience.n.practice', 1, TRUE, 'noun', '経験', 'skill or knowledge gained from doing something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='qualification'), 'qualification.n.credential', 1, TRUE, 'noun', '資格', 'an official record of passing an exam or course', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='expert'), 'expert.n.specialist', 1, TRUE, 'noun', '専門家', 'a person with great skill or knowledge', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='beginner'), 'beginner.n.novice', 1, TRUE, 'noun', '初心者', 'a person who is just starting to learn something', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('skill', 'ability', 'talent', 'knowledge', 'experience', 'qualification', 'expert', 'beginner')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), (SELECT id FROM vocab_senses WHERE slug='beginner.n.novice'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='beginner.n.novice'), (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='talent.n.gift'), NULL, 'gift', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='skills-knowledge'
WHERE s.slug IN ('skill.n.ability', 'ability.n.capacity', 'talent.n.gift', 'knowledge.n.info', 'experience.n.practice', 'qualification.n.credential', 'expert.n.specialist', 'beginner.n.novice')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-12', 4, 2, (SELECT id FROM vocab_categories WHERE slug='skills-knowledge'), 'Skills & knowledge', '能力と知識', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-12'), s.id, x.ord FROM (VALUES
  ('skill.n.ability',0),('ability.n.capacity',1),('talent.n.gift',2),('knowledge.n.info',3),('experience.n.practice',4),('qualification.n.credential',5),('expert.n.specialist',6),('beginner.n.novice',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-12'), 'conversation', 0, 'Learning a hobby', '趣味を始める', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-12'), 'travel', 1, 'A cooking workshop', '料理教室', 'kitchen', 'chef'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-12'), 'business', 2, 'Assessing a candidate', '候補者の評価', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 0, 'npc', 'You started painting? How''s it going?', '絵を始めたの？どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 1, 'user', 'I''m a total {beginner}, but it''s fun.', '完全な初心者だけど、楽しい。', 'beginner', (SELECT id FROM vocab_senses WHERE slug='beginner.n.novice'), ARRAY['beginner','expert','talent','skill']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 2, 'npc', 'Everyone starts somewhere.', '誰でも最初はそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 3, 'user', 'True. It''s a {skill} I''ve always wanted.', '確かに。ずっと欲しかったスキルなんだ。', 'skill', (SELECT id FROM vocab_senses WHERE slug='skill.n.ability'), ARRAY['skill','expert','beginner','experience']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 4, 'npc', 'Do you have a natural eye for it?', '生まれつきセンスある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 5, 'user', 'Not much {talent}, honestly, but I practice.', '正直あまり才能はないけど、練習してる。', 'talent', (SELECT id FROM vocab_senses WHERE slug='talent.n.gift'), ARRAY['talent','beginner','expert','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 6, 'npc', 'Practice beats talent anyway.', '結局、練習が才能に勝るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 7, 'user', 'I hope so. My {ability} is slowly improving.', 'そうだといいな。能力は少しずつ上がってる。', 'ability', (SELECT id FROM vocab_senses WHERE slug='ability.n.capacity'), ARRAY['ability','beginner','expert','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 8, 'npc', 'Are you taking classes?', '教室に通ってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 9, 'user', 'Yeah, my teacher is a real {expert}.', 'うん、先生は本物の専門家。', 'expert', (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), ARRAY['expert','beginner','talent','skill']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 10, 'npc', 'Lucky you. Learn a lot?', 'いいね。たくさん学んでる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 11, 'user', 'Loads. She has years of {experience}.', 'すごく。長年の経験がある人。', 'experience', (SELECT id FROM vocab_senses WHERE slug='experience.n.practice'), ARRAY['experience','beginner','talent','ability']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 12, 'npc', 'Keep at it!', '続けてね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 13, 'user', 'I will.', 'うん。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 14, 'npc', 'Show me a painting soon, {{user_name}}.', '今度絵を見せてね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 0, 'npc', 'Welcome to the cooking class! Cooked before?', '料理教室へようこそ！料理の経験は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 1, 'user', 'A bit, but I''m mostly a {beginner}.', '少しだけ、でもほぼ初心者です。', 'beginner', (SELECT id FROM vocab_senses WHERE slug='beginner.n.novice'), ARRAY['beginner','expert','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 2, 'npc', 'No problem. We start simple.', '大丈夫。簡単なものから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 3, 'user', 'I''d love to learn the {skill} of fresh pasta.', '生パスタのスキルを学びたいです。', 'skill', (SELECT id FROM vocab_senses WHERE slug='skill.n.ability'), ARRAY['skill','expert','beginner','knowledge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 4, 'npc', 'It''s easier than it looks.', '見た目より簡単だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 5, 'user', 'My {knowledge} of Italian food is small.', 'イタリア料理の知識は少ないんです。', 'knowledge', (SELECT id FROM vocab_senses WHERE slug='knowledge.n.info'), ARRAY['knowledge','beginner','expert','talent']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 6, 'npc', 'You''ll learn fast here.', 'ここですぐ学べるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 7, 'user', 'Are you a trained {expert}?', '訓練を受けた専門家ですか？', 'expert', (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), ARRAY['expert','beginner','talent','skill']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 8, 'npc', 'Thirty years in the kitchen.', '厨房で30年。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 9, 'user', 'Wow, so much {experience}!', 'わあ、経験が豊富ですね！', 'experience', (SELECT id FROM vocab_senses WHERE slug='experience.n.practice'), ARRAY['experience','beginner','talent','knowledge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 10, 'npc', 'It all adds up over time.', '時間をかけて積み重なるんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 11, 'user', 'You clearly have real {talent} too.', '本物の才能もありますね。', 'talent', (SELECT id FROM vocab_senses WHERE slug='talent.n.gift'), ARRAY['talent','beginner','expert','knowledge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 12, 'npc', 'You''re kind. Let''s cook!', '優しいね。さあ作ろう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 13, 'user', 'I''m excited!', 'わくわくします！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 14, 'npc', 'Aprons on, everyone!', 'みんなエプロンを！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 0, 'npc', 'What did you think of the applicant?', 'あの応募者どう思った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 1, 'user', 'Strong. She has the right {qualification} for the role.', '優秀。この役職に合う資格を持ってる。', 'qualification', (SELECT id FROM vocab_senses WHERE slug='qualification.n.credential'), ARRAY['qualification','beginner','talent','expert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 2, 'npc', 'Any hands-on background?', '実務経験は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 3, 'user', 'Yes, five years of {experience} in sales.', 'うん、営業で5年の経験。', 'experience', (SELECT id FROM vocab_senses WHERE slug='experience.n.practice'), ARRAY['experience','beginner','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 4, 'npc', 'Good. Technical side?', 'いいね。技術面は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 5, 'user', 'Solid {knowledge} of our software.', 'うちのソフトの知識もしっかりある。', 'knowledge', (SELECT id FROM vocab_senses WHERE slug='knowledge.n.info'), ARRAY['knowledge','beginner','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 6, 'npc', 'Can she lead a team?', 'チームを率いられる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 7, 'user', 'I think she has the {ability} to manage people.', '人をまとめる能力があると思う。', 'ability', (SELECT id FROM vocab_senses WHERE slug='ability.n.capacity'), ARRAY['ability','beginner','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 8, 'npc', 'What''s her strongest area?', '一番の強みは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 9, 'user', 'Communication is her best {skill}.', 'コミュニケーションが一番のスキル。', 'skill', (SELECT id FROM vocab_senses WHERE slug='skill.n.ability'), ARRAY['skill','beginner','qualification','expert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 10, 'npc', 'We need that badly.', 'それがまさに必要だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 11, 'user', 'And she''s an {expert} in data analysis.', 'それにデータ分析の専門家でもある。', 'expert', (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), ARRAY['expert','beginner','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 12, 'npc', 'Sounds like a great hire.', 'いい採用になりそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 13, 'user', 'Let''s make an offer.', 'オファーを出そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 14, 'npc', 'Agreed, {{user_name}}.', '賛成、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-13.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-13 - Managing money  (Unit 5)
-- Words: budget, save up, afford, borrow, lend, owe, debt, spend.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('managing-money', 'Managing money', 'お金の管理', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('budget', 'budget', '/ˈbʌdʒɪt/', '/ˈbʌdʒɪt/', NULL, 3, FALSE, NULL),
  ('save up', 'save up', '/ˌseɪv ˈʌp/', '/ˌseɪv ˈʌp/', NULL, 3, FALSE, NULL),
  ('afford', 'afford', '/əˈfɔːrd/', '/əˈfɔːd/', NULL, 3, FALSE, NULL),
  ('borrow', 'borrow', '/ˈbɑːroʊ/', '/ˈbɒrəʊ/', NULL, 3, FALSE, NULL),
  ('lend', 'lend', '/lend/', '/lend/', NULL, 3, FALSE, NULL),
  ('owe', 'owe', '/oʊ/', '/əʊ/', NULL, 4, TRUE, '/oʊ/。「オウ」。w は発音しない。'),
  ('debt', 'debt', '/det/', '/det/', NULL, 4, TRUE, 'b は発音しない。/det/。'),
  ('spend', 'spend', '/spend/', '/spend/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='budget'), 'budget.n.plan', 1, TRUE, 'noun', '予算', 'a plan of how much money you can spend', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='save up'), 'save-up.phrv.store', 1, TRUE, 'phrasal verb', '貯金する', 'to keep money so you can use it later', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='afford'), 'afford.v.manage', 1, TRUE, 'verb', '買う余裕がある', 'to have enough money for something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='borrow'), 'borrow.v.take', 1, TRUE, 'verb', '借りる', 'to take and use something you will give back', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lend'), 'lend.v.give', 1, TRUE, 'verb', '貸す', 'to give something to someone for a short time', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='owe'), 'owe.v.debt', 1, TRUE, 'verb', '借りがある', 'to need to pay money back to someone', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='debt'), 'debt.n.money', 1, TRUE, 'noun', '借金', 'money that you owe to someone', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spend'), 'spend.v.pay', 1, TRUE, 'verb', '（お金を）使う', 'to use money to buy things', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('budget', 'save up', 'afford', 'borrow', 'lend', 'owe', 'debt', 'spend')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='borrow.v.take'), (SELECT id FROM vocab_senses WHERE slug='lend.v.give'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='lend.v.give'), (SELECT id FROM vocab_senses WHERE slug='borrow.v.take'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='managing-money'
WHERE s.slug IN ('budget.n.plan', 'save-up.phrv.store', 'afford.v.manage', 'borrow.v.take', 'lend.v.give', 'owe.v.debt', 'debt.n.money', 'spend.v.pay')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-13', 5, 0, (SELECT id FROM vocab_categories WHERE slug='managing-money'), 'Managing money', 'お金の管理', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-13'), s.id, x.ord FROM (VALUES
  ('budget.n.plan',0),('save-up.phrv.store',1),('afford.v.manage',2),('borrow.v.take',3),('lend.v.give',4),('owe.v.debt',5),('debt.n.money',6),('spend.v.pay',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-13'), 'conversation', 0, 'Saving for a trip', '旅行のために貯金', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-13'), 'travel', 1, 'Splitting costs', '費用の分担', 'street', 'travel buddy'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-13'), 'business', 2, 'A budget meeting', '予算会議', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 0, 'npc', 'Are you coming on the ski trip?', 'スキー旅行来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 1, 'user', 'I want to, but I need to {save up} first.', '行きたいけど、まず貯金しないと。', 'save up', (SELECT id FROM vocab_senses WHERE slug='save-up.phrv.store'), ARRAY['save up','spend','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 2, 'npc', 'How much is it?', 'いくらなの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 3, 'user', 'A lot. I''m not sure I can {afford} it.', '結構する。買う余裕があるか分からない。', 'afford', (SELECT id FROM vocab_senses WHERE slug='afford.v.manage'), ARRAY['afford','borrow','lend','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 4, 'npc', 'Make a plan for it.', '計画を立てなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 5, 'user', 'Good idea. I''ll set a monthly {budget}.', 'いい考え。毎月の予算を決める。', 'budget', (SELECT id FROM vocab_senses WHERE slug='budget.n.plan'), ARRAY['budget','debt','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 6, 'npc', 'And cut out coffee shops!', 'カフェ通いをやめて！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 7, 'user', 'Ha, true. I {spend} too much on coffee.', 'はは、確かに。コーヒーに使いすぎ。', 'spend', (SELECT id FROM vocab_senses WHERE slug='spend.v.pay'), ARRAY['spend','save up','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 8, 'npc', 'You could ask your brother for help.', 'お兄さんに頼めば？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 9, 'user', 'I don''t like to {borrow} money from family.', '家族からお金を借りるのは好きじゃない。', 'borrow', (SELECT id FROM vocab_senses WHERE slug='borrow.v.take'), ARRAY['borrow','lend','spend','afford']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 10, 'npc', 'Fair. Independence feels good.', '分かる。自立はいいよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 11, 'user', 'Right. I hate to {owe} anyone.', 'うん。誰かに借りがあるのは嫌。', 'owe', (SELECT id FROM vocab_senses WHERE slug='owe.v.debt'), ARRAY['owe','spend','save up','budget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 12, 'npc', 'You''ll get there by winter.', '冬までには貯まるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 13, 'user', 'That''s the goal!', 'それが目標！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 14, 'npc', 'Save hard, {{user_name}}!', 'しっかり貯めてね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 0, 'npc', 'The taxi was more than we thought.', 'タクシー、思ったより高かった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 1, 'user', 'No worries, I can {lend} you some cash.', '大丈夫、少し貸すよ。', 'lend', (SELECT id FROM vocab_senses WHERE slug='lend.v.give'), ARRAY['lend','borrow','owe','spend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 2, 'npc', 'Thanks! I''ll pay you back tonight.', 'ありがとう！今夜返すね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 3, 'user', 'No rush. You don''t {owe} me much.', '急がないで。そんなに借りはないよ。', 'owe', (SELECT id FROM vocab_senses WHERE slug='owe.v.debt'), ARRAY['owe','lend','spend','afford']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 4, 'npc', 'Still, I keep track.', 'でも記録はしてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 5, 'user', 'Same. I keep a travel {budget} on my phone.', '私も。スマホで旅行の予算をつけてる。', 'budget', (SELECT id FROM vocab_senses WHERE slug='budget.n.plan'), ARRAY['budget','debt','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 6, 'npc', 'Smart. Are we overspending?', '賢い。使いすぎてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 7, 'user', 'A little. We {spend} a lot on food.', '少し。食事にお金を使いすぎ。', 'spend', (SELECT id FROM vocab_senses WHERE slug='spend.v.pay'), ARRAY['spend','lend','borrow','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 8, 'npc', 'Let''s cook tomorrow to save.', '明日は自炊で節約しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 9, 'user', 'Good plan. Then we can {afford} the boat tour.', 'いいね。そうすればボートツアーに行ける。', 'afford', (SELECT id FROM vocab_senses WHERE slug='afford.v.manage'), ARRAY['afford','lend','borrow','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 10, 'npc', 'Yes! I really want to do that.', 'うん！それすごくやりたい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 11, 'user', 'If you''re short, you can {borrow} from me.', '足りなかったら私から借りていいよ。', 'borrow', (SELECT id FROM vocab_senses WHERE slug='borrow.v.take'), ARRAY['borrow','lend','spend','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 12, 'npc', 'You''re a lifesaver.', '助かるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 13, 'user', 'We look after each other.', 'お互い様だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 14, 'npc', 'Best travel buddy, {{user_name}}.', '最高の旅仲間だね、{{user_name}}。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 0, 'npc', 'We need to review the team finances.', 'チームの財務を見直す必要がある。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 1, 'user', 'Sure. Our {budget} is tight this quarter.', '了解。今期は予算が厳しい。', 'budget', (SELECT id FROM vocab_senses WHERE slug='budget.n.plan'), ARRAY['budget','debt','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 2, 'npc', 'Where can we cut?', 'どこを削れる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 3, 'user', 'We {spend} too much on software licenses.', 'ソフトのライセンスに使いすぎてる。', 'spend', (SELECT id FROM vocab_senses WHERE slug='spend.v.pay'), ARRAY['spend','save up','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 4, 'npc', 'Can we drop a few tools?', 'ツールをいくつか減らせる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 5, 'user', 'Yes, we can''t {afford} all of them.', 'うん、全部は買う余裕がない。', 'afford', (SELECT id FROM vocab_senses WHERE slug='afford.v.manage'), ARRAY['afford','borrow','lend','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 6, 'npc', 'Any outstanding bills?', '未払いの請求は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 7, 'user', 'We still {owe} the printing company.', '印刷会社にまだ借りがある。', 'owe', (SELECT id FROM vocab_senses WHERE slug='owe.v.debt'), ARRAY['owe','spend','save up','budget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 8, 'npc', 'Let''s clear that first.', 'まずそれを片付けよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 9, 'user', 'Agreed. Carrying {debt} looks bad on reports.', '賛成。借金を抱えるのは報告書で印象が悪い。', 'debt', (SELECT id FROM vocab_senses WHERE slug='debt.n.money'), ARRAY['debt','budget','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 10, 'npc', 'Good thinking. Anything for savings?', 'いい考え。貯蓄の予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 11, 'user', 'We could {save up} for new laptops next year.', '来年の新しいノートPCのために貯められる。', 'save up', (SELECT id FROM vocab_senses WHERE slug='save-up.phrv.store'), ARRAY['save up','spend','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 12, 'npc', 'Let''s put that in the plan.', '計画に入れよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 13, 'user', 'I''ll write it up.', 'まとめておくね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-14.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-14 - Bills & spending  (Unit 5)
-- Words: pay off, cut back, pay back, run out, top up, take out, get by, splash out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('bills-spending', 'Bills & spending', '支払いと出費', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pay off', 'pay off', '/ˌpeɪ ˈɔːf/', '/ˌpeɪ ˈɒf/', NULL, 4, FALSE, NULL),
  ('cut back', 'cut back', '/ˌkʌt ˈbæk/', '/ˌkʌt ˈbæk/', NULL, 4, FALSE, NULL),
  ('pay back', 'pay back', '/ˌpeɪ ˈbæk/', '/ˌpeɪ ˈbæk/', NULL, 3, FALSE, NULL),
  ('run out', 'run out', '/ˌrʌn ˈaʊt/', '/ˌrʌn ˈaʊt/', NULL, 3, FALSE, NULL),
  ('top up', 'top up', '/ˌtɑːp ˈʌp/', '/ˌtɒp ˈʌp/', NULL, 4, FALSE, NULL),
  ('take out', 'take out', '/ˌteɪk ˈaʊt/', '/ˌteɪk ˈaʊt/', NULL, 4, FALSE, NULL),
  ('get by', 'get by', '/ˌɡet ˈbaɪ/', '/ˌɡet ˈbaɪ/', NULL, 4, FALSE, NULL),
  ('splash out', 'splash out', '/ˌsplæʃ ˈaʊt/', '/ˌsplæʃ ˈaʊt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pay off'), 'pay-off.phrv.clear', 1, TRUE, 'phrasal verb', '完済する', 'to finish paying money that you owe', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cut back'), 'cut-back.phrv.reduce', 1, TRUE, 'phrasal verb', '切り詰める', 'to spend or use less of something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pay back'), 'pay-back.phrv.repay', 1, TRUE, 'phrasal verb', '返済する', 'to return money you borrowed from someone', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='run out'), 'run-out.phrv.deplete', 1, TRUE, 'phrasal verb', '使い果たす', 'to have none of something left', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='top up'), 'top-up.phrv.refill', 1, TRUE, 'phrasal verb', 'チャージする', 'to add money or credit to something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take out'), 'take-out.phrv.withdraw', 1, TRUE, 'phrasal verb', '引き出す', 'to remove money from a bank, or get a loan', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get by'), 'get-by.phrv.manage', 1, TRUE, 'phrasal verb', '何とかやっていく', 'to manage with the money or things you have', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='splash out'), 'splash-out.phrv.spend', 1, TRUE, 'phrasal verb', '奮発する', 'to spend a lot of money on something special', 'B2', 'くだけた言い方。')
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pay off', 'cut back', 'pay back', 'run out', 'top up', 'take out', 'get by', 'splash out')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='bills-spending'
WHERE s.slug IN ('pay-off.phrv.clear', 'cut-back.phrv.reduce', 'pay-back.phrv.repay', 'run-out.phrv.deplete', 'top-up.phrv.refill', 'take-out.phrv.withdraw', 'get-by.phrv.manage', 'splash-out.phrv.spend')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-14', 5, 1, (SELECT id FROM vocab_categories WHERE slug='bills-spending'), 'Bills & spending', '支払いと出費', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-14'), s.id, x.ord FROM (VALUES
  ('pay-off.phrv.clear',0),('cut-back.phrv.reduce',1),('pay-back.phrv.repay',2),('run-out.phrv.deplete',3),('top-up.phrv.refill',4),('take-out.phrv.withdraw',5),('get-by.phrv.manage',6),('splash-out.phrv.spend',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-14'), 'conversation', 0, 'Getting finances in order', '家計の立て直し', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-14'), 'travel', 1, 'Money on the road', '旅先でのお金', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-14'), 'business', 2, 'Cutting company costs', '経費削減', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 0, 'npc', 'How''s the new budget going?', '新しい予算はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 1, 'user', 'Good. I had to {cut back} on eating out.', 'いい感じ。外食を切り詰めた。', 'cut back', (SELECT id FROM vocab_senses WHERE slug='cut-back.phrv.reduce'), ARRAY['cut back','splash out','top up','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 2, 'npc', 'That adds up fast.', 'それ、すぐ差が出るよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 3, 'user', 'It does. I''m trying to {pay off} my credit card.', 'そうなの。クレカを完済しようとしてる。', 'pay off', (SELECT id FROM vocab_senses WHERE slug='pay-off.phrv.clear'), ARRAY['pay off','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 4, 'npc', 'Nice goal. Almost done?', 'いい目標。もうすぐ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 5, 'user', 'Close, but I always {run out} of money by month-end.', 'もう少し、でも月末にはいつもお金が尽きる。', 'run out', (SELECT id FROM vocab_senses WHERE slug='run-out.phrv.deplete'), ARRAY['run out','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 6, 'npc', 'Tough. Do you manage okay?', '大変。何とかなってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 7, 'user', 'I {get by}, just barely.', 'ぎりぎり何とかやってる。', 'get by', (SELECT id FROM vocab_senses WHERE slug='get-by.phrv.manage'), ARRAY['get by','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 8, 'npc', 'Did you pay me for the concert yet?', 'コンサート代、もう払った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 9, 'user', 'Oh! Let me {pay back} that now.', 'あ！今返すね。', 'pay back', (SELECT id FROM vocab_senses WHERE slug='pay-back.phrv.repay'), ARRAY['pay back','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 10, 'npc', 'Thanks. Treat yourself sometimes, though.', 'ありがとう。でもたまには自分にご褒美を。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 11, 'user', 'Maybe. I might {splash out} on a nice dinner once.', 'かもね。一度いいディナーに奮発するかも。', 'splash out', (SELECT id FROM vocab_senses WHERE slug='splash-out.phrv.spend'), ARRAY['splash out','cut back','run out','get by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 12, 'npc', 'You deserve it.', 'その価値あるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 13, 'user', 'After the card''s paid, yeah.', 'カードを返してからね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 14, 'npc', 'Good discipline, {{user_name}}.', 'えらいね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 0, 'npc', 'Do you have cash for the market?', '市場用の現金ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 1, 'user', 'Not yet. I need to {take out} some from an ATM.', 'まだ。ATMで引き出さないと。', 'take out', (SELECT id FROM vocab_senses WHERE slug='take-out.phrv.withdraw'), ARRAY['take out','top up','pay off','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 2, 'npc', 'There''s one around the corner.', '角を曲がったところにあるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 3, 'user', 'Great. I''ll also {top up} my travel card.', 'いいね。交通カードもチャージする。', 'top up', (SELECT id FROM vocab_senses WHERE slug='top-up.phrv.refill'), ARRAY['top up','pay off','pay back','run out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 4, 'npc', 'Good, buses only take the card.', 'うん、バスはカードだけだから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 5, 'user', 'I don''t want to {run out} of credit mid-trip.', '旅の途中で残高がなくなるのは嫌。', 'run out', (SELECT id FROM vocab_senses WHERE slug='run-out.phrv.deplete'), ARRAY['run out','pay off','pay back','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 6, 'npc', 'Smart. Traveling on a budget?', '賢い。節約旅行？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 7, 'user', 'Yeah, but I {get by} fine on street food.', 'うん、でも屋台で十分やっていける。', 'get by', (SELECT id FROM vocab_senses WHERE slug='get-by.phrv.manage'), ARRAY['get by','top up','pay off','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 8, 'npc', 'It''s delicious and cheap here.', 'ここのは美味しくて安い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 9, 'user', 'Exactly. I {cut back} on fancy restaurants.', 'そう。高級店は控えてる。', 'cut back', (SELECT id FROM vocab_senses WHERE slug='cut-back.phrv.reduce'), ARRAY['cut back','top up','pay off','run out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 10, 'npc', 'But treat yourself once, right?', 'でも一度は贅沢するでしょ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 11, 'user', 'For sure. I''ll {splash out} on one special meal.', 'もちろん。一度は特別な食事に奮発する。', 'splash out', (SELECT id FROM vocab_senses WHERE slug='splash-out.phrv.spend'), ARRAY['splash out','cut back','run out','get by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 12, 'npc', 'The harbor restaurant is worth it.', '港のレストランは行く価値あるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 13, 'user', 'Let''s save that for the last night.', '最終夜のために取っておこう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 14, 'npc', 'Perfect plan!', '完璧な計画！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 0, 'npc', 'Finance wants us to reduce costs.', '財務が経費削減を求めてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 1, 'user', 'Okay. We can {cut back} on travel expenses.', '了解。出張費を切り詰められる。', 'cut back', (SELECT id FROM vocab_senses WHERE slug='cut-back.phrv.reduce'), ARRAY['cut back','splash out','top up','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 2, 'npc', 'Good. Any loans to clear?', 'いいね。返すローンは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 3, 'user', 'Yes, we should {pay off} the equipment loan early.', 'うん、設備ローンは早めに完済すべき。', 'pay off', (SELECT id FROM vocab_senses WHERE slug='pay-off.phrv.clear'), ARRAY['pay off','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 4, 'npc', 'Do we need new machines this year?', '今年、新しい機械は必要？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 5, 'user', 'If so, we''d have to {take out} another loan.', 'もし必要なら、別のローンを組むことになる。', 'take out', (SELECT id FROM vocab_senses WHERE slug='take-out.phrv.withdraw'), ARRAY['take out','top up','pay back','run out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 6, 'npc', 'Let''s avoid that.', 'それは避けよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 7, 'user', 'Agreed. We can {get by} with the current ones.', '賛成。今のもので何とかやっていける。', 'get by', (SELECT id FROM vocab_senses WHERE slug='get-by.phrv.manage'), ARRAY['get by','top up','pay back','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 8, 'npc', 'What about the supply budget?', '備品の予算は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 9, 'user', 'We nearly {run out} of materials last month.', '先月、資材がほぼ底をついた。', 'run out', (SELECT id FROM vocab_senses WHERE slug='run-out.phrv.deplete'), ARRAY['run out','top up','pay off','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 10, 'npc', 'Let''s plan better this time.', '今回はもっと計画的に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 11, 'user', 'I''ll {top up} the stock before it''s critical.', '危なくなる前に在庫を補充する。', 'top up', (SELECT id FROM vocab_senses WHERE slug='top-up.phrv.refill'), ARRAY['top up','cut back','run out','get by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 12, 'npc', 'Great. Send me the numbers.', 'いいね。数字を送って。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 13, 'user', 'On it.', '了解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-15.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-15 - Bargains  (Unit 5)
-- Words: bargain, discount, sale, voucher, brand, quality, secondhand, luxury.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('bargains', 'Bargains', 'お得な買い物', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('bargain', 'bargain', '/ˈbɑːrɡɪn/', '/ˈbɑːɡɪn/', NULL, 4, FALSE, NULL),
  ('discount', 'discount', '/ˈdɪskaʊnt/', '/ˈdɪskaʊnt/', NULL, 3, FALSE, NULL),
  ('sale', 'sale', '/seɪl/', '/seɪl/', NULL, 3, FALSE, NULL),
  ('voucher', 'voucher', '/ˈvaʊtʃər/', '/ˈvaʊtʃə/', NULL, 4, FALSE, NULL),
  ('brand', 'brand', '/brænd/', '/brænd/', NULL, 3, FALSE, NULL),
  ('quality', 'quality', '/ˈkwɑːləti/', '/ˈkwɒləti/', NULL, 3, FALSE, NULL),
  ('secondhand', 'secondhand', '/ˌsekəndˈhænd/', '/ˌsekəndˈhænd/', NULL, 4, FALSE, NULL),
  ('luxury', 'luxury', '/ˈlʌkʃəri/', '/ˈlʌkʃəri/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='bargain'), 'bargain.n.deal', 1, TRUE, 'noun', 'お買い得', 'something you buy for less than its usual price', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='discount'), 'discount.n.reduction', 1, TRUE, 'noun', '割引', 'an amount taken off the normal price', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sale'), 'sale.n.event', 1, TRUE, 'noun', 'セール', 'a time when a shop sells things at lower prices', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='voucher'), 'voucher.n.coupon', 1, TRUE, 'noun', 'クーポン券', 'a ticket you can use instead of money', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='brand'), 'brand.n.make', 1, TRUE, 'noun', 'ブランド', 'a product made by a particular company', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='quality'), 'quality.n.standard', 1, TRUE, 'noun', '品質', 'how good or bad something is', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='secondhand'), 'secondhand.adj.used', 1, TRUE, 'adjective', '中古の', 'not new; owned by someone before', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='luxury'), 'luxury.n.expensive', 1, TRUE, 'noun', '高級品', 'something expensive that is nice but not necessary', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('bargain', 'discount', 'sale', 'voucher', 'brand', 'quality', 'secondhand', 'luxury')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='bargains'
WHERE s.slug IN ('bargain.n.deal', 'discount.n.reduction', 'sale.n.event', 'voucher.n.coupon', 'brand.n.make', 'quality.n.standard', 'secondhand.adj.used', 'luxury.n.expensive')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-15', 5, 2, (SELECT id FROM vocab_categories WHERE slug='bargains'), 'Bargains', 'お得に買う', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-15'), s.id, x.ord FROM (VALUES
  ('bargain.n.deal',0),('discount.n.reduction',1),('sale.n.event',2),('voucher.n.coupon',3),('brand.n.make',4),('quality.n.standard',5),('secondhand.adj.used',6),('luxury.n.expensive',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-15'), 'conversation', 0, 'Shopping smart', '賢い買い物', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-15'), 'travel', 1, 'Souvenir shopping', 'お土産の買い物', 'market', 'vendor'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-15'), 'business', 2, 'Choosing a supplier', '仕入先を選ぶ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 0, 'npc', 'Nice jacket! Was it expensive?', 'いいジャケット！高かった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 1, 'user', 'No, it was a total {bargain}!', 'ううん、超お買い得だった！', 'bargain', (SELECT id FROM vocab_senses WHERE slug='bargain.n.deal'), ARRAY['bargain','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 2, 'npc', 'Really? Where from?', '本当？どこで？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 3, 'user', 'There''s a big {sale} at the mall right now.', '今モールで大きなセールをやってる。', 'sale', (SELECT id FROM vocab_senses WHERE slug='sale.n.event'), ARRAY['sale','brand','quality','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 4, 'npc', 'How much off?', 'どれくらい安い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 5, 'user', 'I got a fifty percent {discount}.', '50パーセント引きだった。', 'discount', (SELECT id FROM vocab_senses WHERE slug='discount.n.reduction'), ARRAY['discount','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 6, 'npc', 'Wow. Is it a known label?', 'わあ。有名ブランド？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 7, 'user', 'Yeah, it''s a popular {brand} too.', 'うん、人気のブランドでもある。', 'brand', (SELECT id FROM vocab_senses WHERE slug='brand.n.make'), ARRAY['brand','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 8, 'npc', 'And it feels well made.', '作りもよさそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 9, 'user', 'The {quality} is surprisingly good.', '品質が思ったよりいい。', 'quality', (SELECT id FROM vocab_senses WHERE slug='quality.n.standard'), ARRAY['quality','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 10, 'npc', 'Do you ever buy used?', '中古も買う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 11, 'user', 'Sometimes. I love {secondhand} shops for jeans.', 'たまに。ジーンズは中古店が好き。', 'secondhand', (SELECT id FROM vocab_senses WHERE slug='secondhand.adj.used'), ARRAY['secondhand','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 12, 'npc', 'Smart shopper!', '買い物上手！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 13, 'user', 'I hate paying full price.', '定価で買うのが嫌なの。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 14, 'npc', 'Take me next time, {{user_name}}!', '次は連れてって、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 0, 'npc', 'See anything you like?', '気に入ったものある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 1, 'user', 'This scarf looks like a {bargain}.', 'このスカーフ、お買い得そう。', 'bargain', (SELECT id FROM vocab_senses WHERE slug='bargain.n.deal'), ARRAY['bargain','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 2, 'npc', 'Good eye! Handmade, too.', 'お目が高い！手作りだよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 3, 'user', 'Any {discount} if I buy two?', '2枚買ったら割引ある？', 'discount', (SELECT id FROM vocab_senses WHERE slug='discount.n.reduction'), ARRAY['discount','brand','quality','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 4, 'npc', 'For you, ten percent off.', 'あなたには10パーセント引き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 5, 'user', 'Deal. The {quality} feels lovely.', '決まり。品質がすごくいい。', 'quality', (SELECT id FROM vocab_senses WHERE slug='quality.n.standard'), ARRAY['quality','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 6, 'npc', 'Pure silk. Here''s a little extra.', '純シルクだよ。これはおまけ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 7, 'user', 'A {voucher} for the cafe next door? Thanks!', '隣のカフェのクーポン？ありがとう！', 'voucher', (SELECT id FROM vocab_senses WHERE slug='voucher.n.coupon'), ARRAY['voucher','brand','quality','sale']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 8, 'npc', 'Enjoy. Looking for anything special?', 'どうぞ。特別なものを探してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 9, 'user', 'Maybe one {luxury} gift for my mother.', '母に高級な贈り物を一つ、かな。', 'luxury', (SELECT id FROM vocab_senses WHERE slug='luxury.n.expensive'), ARRAY['luxury','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 10, 'npc', 'This jewelry box is our finest.', 'この宝石箱が一番の品です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 11, 'user', 'Is it a local {brand}?', '地元のブランド？', 'brand', (SELECT id FROM vocab_senses WHERE slug='brand.n.make'), ARRAY['brand','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 12, 'npc', 'Made by a family here for generations.', '代々続く地元の家族の作です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 13, 'user', 'Then I''ll take it.', 'じゃあ、それをもらいます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 14, 'npc', 'She''ll love it!', 'お母様、喜ぶよ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 0, 'npc', 'Which supplier should we choose?', 'どの仕入先にする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 1, 'user', 'The first one has better {quality}.', '1社目の方が品質がいい。', 'quality', (SELECT id FROM vocab_senses WHERE slug='quality.n.standard'), ARRAY['quality','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 2, 'npc', 'But the second is cheaper.', 'でも2社目の方が安い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 3, 'user', 'True, their price is a real {bargain}.', '確かに、あそこの価格はかなりお得。', 'bargain', (SELECT id FROM vocab_senses WHERE slug='bargain.n.deal'), ARRAY['bargain','brand','sale','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 4, 'npc', 'Do they offer bulk deals?', 'まとめ買いの割引はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 5, 'user', 'Yes, a {discount} for large orders.', 'うん、大口注文には割引がある。', 'discount', (SELECT id FROM vocab_senses WHERE slug='discount.n.reduction'), ARRAY['discount','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 6, 'npc', 'Are they a trusted name?', '信頼できる会社？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 7, 'user', 'It''s a well-known {brand} in the industry.', '業界では有名なブランドだよ。', 'brand', (SELECT id FROM vocab_senses WHERE slug='brand.n.make'), ARRAY['brand','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 8, 'npc', 'Our clients like premium goods.', 'うちの客は高級品を好む。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 9, 'user', 'Then maybe we need a {luxury} option too.', 'なら高級な選択肢も必要かも。', 'luxury', (SELECT id FROM vocab_senses WHERE slug='luxury.n.expensive'), ARRAY['luxury','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 10, 'npc', 'Good point. Two tiers?', 'なるほど。2段階にする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 11, 'user', 'Yes, and a {sale} price for the basic line.', 'うん、基本ラインはセール価格で。', 'sale', (SELECT id FROM vocab_senses WHERE slug='sale.n.event'), ARRAY['sale','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 12, 'npc', 'Let''s draft the proposal.', '提案書を作ろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 13, 'user', 'I''ll compare both quotes.', '両方の見積もりを比べるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 14, 'npc', 'Great work, {{user_name}}.', 'いい仕事だね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-16.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-16 - Housing  (Unit 6)
-- Words: rent, landlord, mortgage, furniture, neighborhood, suburb, spacious, cozy.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('housing', 'Housing', '住まい', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('rent', 'rent', '/rent/', '/rent/', NULL, 3, FALSE, NULL),
  ('landlord', 'landlord', '/ˈlændlɔːrd/', '/ˈlændlɔːd/', NULL, 4, FALSE, NULL),
  ('mortgage', 'mortgage', '/ˈmɔːrɡɪdʒ/', '/ˈmɔːɡɪdʒ/', NULL, 4, TRUE, 't は発音しない。/ˈmɔːrɡɪdʒ/。'),
  ('furniture', 'furniture', '/ˈfɜːrnɪtʃər/', '/ˈfɜːnɪtʃə/', NULL, 3, FALSE, NULL),
  ('neighborhood', 'neighborhood', '/ˈneɪbərhʊd/', '/ˈneɪbəhʊd/', NULL, 3, FALSE, NULL),
  ('suburb', 'suburb', '/ˈsʌbɜːrb/', '/ˈsʌbɜːb/', NULL, 4, FALSE, NULL),
  ('spacious', 'spacious', '/ˈspeɪʃəs/', '/ˈspeɪʃəs/', NULL, 4, FALSE, NULL),
  ('cozy', 'cozy', '/ˈkoʊzi/', '/ˈkəʊzi/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='rent'), 'rent.n.payment', 1, TRUE, 'noun', '家賃', 'the money you pay to live in a place you do not own', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='landlord'), 'landlord.n.owner', 1, TRUE, 'noun', '家主', 'a person who owns a place and rents it to others', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mortgage'), 'mortgage.n.loan', 1, TRUE, 'noun', '住宅ローン', 'a loan used to buy a house', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='furniture'), 'furniture.n.items', 1, TRUE, 'noun', '家具', 'things like tables, chairs and beds in a room', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='neighborhood'), 'neighborhood.n.area', 1, TRUE, 'noun', '近所', 'the local area around your home and its community', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='suburb'), 'suburb.n.outer', 1, TRUE, 'noun', '郊外', 'an area on the edge of a city, away from the center', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spacious'), 'spacious.adj.roomy', 1, TRUE, 'adjective', '広々とした', 'having plenty of room inside', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cozy'), 'cozy.adj.snug', 1, TRUE, 'adjective', '居心地のいい', 'small, warm and comfortable', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('rent', 'landlord', 'mortgage', 'furniture', 'neighborhood', 'suburb', 'spacious', 'cozy')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='housing'
WHERE s.slug IN ('rent.n.payment', 'landlord.n.owner', 'mortgage.n.loan', 'furniture.n.items', 'neighborhood.n.area', 'suburb.n.outer', 'spacious.adj.roomy', 'cozy.adj.snug')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-16', 6, 0, (SELECT id FROM vocab_categories WHERE slug='housing'), 'Housing', '住まい探し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-16'), s.id, x.ord FROM (VALUES
  ('rent.n.payment',0),('landlord.n.owner',1),('mortgage.n.loan',2),('furniture.n.items',3),('neighborhood.n.area',4),('suburb.n.outer',5),('spacious.adj.roomy',6),('cozy.adj.snug',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-16'), 'conversation', 0, 'A friend''s new flat', '友達の新居', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-16'), 'travel', 1, 'A holiday house', '貸別荘', 'house', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-16'), 'business', 2, 'Office relocation', 'オフィス移転', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 0, 'npc', 'You moved! How''s the new flat?', '引っ越したね！新しい部屋どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 1, 'user', 'Love it. The {rent} is really reasonable.', '気に入ってる。家賃がかなり手頃。', 'rent', (SELECT id FROM vocab_senses WHERE slug='rent.n.payment'), ARRAY['rent','landlord','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 2, 'npc', 'Nice area?', 'いい地域？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 3, 'user', 'Yeah, a friendly {neighborhood} where I know the shopkeepers.', 'うん、店の人とも顔なじみの温かい近所。', 'neighborhood', (SELECT id FROM vocab_senses WHERE slug='neighborhood.n.area'), ARRAY['neighborhood','mortgage','furniture','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 4, 'npc', 'Is it big?', '広い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 5, 'user', 'Surprisingly {spacious} for the price.', '値段の割に驚くほど広々してる。', 'spacious', (SELECT id FROM vocab_senses WHERE slug='spacious.adj.roomy'), ARRAY['spacious','cozy','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 6, 'npc', 'And warm?', '暖かい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 7, 'user', 'Very {cozy}; I added rugs and lamps.', 'すごく居心地いい。ラグとランプを足した。', 'cozy', (SELECT id FROM vocab_senses WHERE slug='cozy.adj.snug'), ARRAY['cozy','spacious','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 8, 'npc', 'Did it come furnished?', '家具付き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 9, 'user', 'Some {furniture} was included, like a sofa.', 'ソファとか、家具が少し付いてた。', 'furniture', (SELECT id FROM vocab_senses WHERE slug='furniture.n.items'), ARRAY['furniture','rent','mortgage','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 10, 'npc', 'Good landlord?', '大家さんはいい人？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 11, 'user', 'Yeah, my {landlord} fixes things quickly.', 'うん、大家さんは何でもすぐ直してくれる。', 'landlord', (SELECT id FROM vocab_senses WHERE slug='landlord.n.owner'), ARRAY['landlord','rent','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 12, 'npc', 'Sounds ideal.', '理想的だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 13, 'user', 'Come visit soon!', '近いうちに遊びに来て！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 14, 'npc', 'I will, {{user_name}}.', '行くよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 0, 'npc', 'Welcome! Here''s the holiday house.', 'ようこそ！こちらが貸別荘です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 1, 'user', 'Wow, it''s so {spacious} inside.', 'わあ、中がすごく広々してる。', 'spacious', (SELECT id FROM vocab_senses WHERE slug='spacious.adj.roomy'), ARRAY['spacious','cozy','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 2, 'npc', 'Plenty of room for the family.', '家族にも十分な広さです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 3, 'user', 'And really {cozy} with that fireplace.', 'それに暖炉があって居心地いい。', 'cozy', (SELECT id FROM vocab_senses WHERE slug='cozy.adj.snug'), ARRAY['cozy','spacious','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 4, 'npc', 'It''s in a calm part of town.', '静かな地区にあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 5, 'user', 'I like that it''s in a quiet {suburb}, away from the center.', '中心から離れた静かな郊外なのがいい。', 'suburb', (SELECT id FROM vocab_senses WHERE slug='suburb.n.outer'), ARRAY['suburb','neighborhood','furniture','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 6, 'npc', 'Yes, ten minutes from the beach.', 'はい、ビーチまで10分です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 7, 'user', 'The {furniture} looks brand new.', '家具が新品みたい。', 'furniture', (SELECT id FROM vocab_senses WHERE slug='furniture.n.items'), ARRAY['furniture','rent','mortgage','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 8, 'npc', 'We update it every year.', '毎年新しくしています。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 9, 'user', 'How much is the weekly {rent}?', '週の家賃はいくらですか？', 'rent', (SELECT id FROM vocab_senses WHERE slug='rent.n.payment'), ARRAY['rent','mortgage','landlord','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 10, 'npc', 'It''s on the listing, all inclusive.', '掲載価格で、全て込みです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 11, 'user', 'Do you live here, or is it a {mortgage} investment?', 'ここに住んでる？それとも住宅ローンの投資物件？', 'mortgage', (SELECT id FROM vocab_senses WHERE slug='mortgage.n.loan'), ARRAY['mortgage','rent','landlord','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 12, 'npc', 'An investment, actually.', '実は投資物件です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 13, 'user', 'It''s lovely. We''ll take it.', '素敵です。ここにします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 14, 'npc', 'Enjoy your stay!', '滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 0, 'npc', 'The team''s outgrowing this office.', 'チームがこのオフィスに手狭になってきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 1, 'user', 'Agreed. We need a more {spacious} space.', '賛成。もっと広い場所が必要。', 'spacious', (SELECT id FROM vocab_senses WHERE slug='spacious.adj.roomy'), ARRAY['spacious','cozy','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 2, 'npc', 'I saw one downtown.', '中心街に一つ見つけた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 3, 'user', 'What''s the monthly {rent}?', '月の家賃は？', 'rent', (SELECT id FROM vocab_senses WHERE slug='rent.n.payment'), ARRAY['rent','landlord','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 4, 'npc', 'A bit high for the center.', '中心地だから少し高い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 5, 'user', 'Maybe a {suburb} office would be cheaper.', '郊外のオフィスの方が安いかも。', 'suburb', (SELECT id FROM vocab_senses WHERE slug='suburb.n.outer'), ARRAY['suburb','neighborhood','furniture','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 6, 'npc', 'True, but harder to commute.', '確かに、でも通勤が大変。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 7, 'user', 'Is it a safe {neighborhood} at least?', 'せめて治安のいい地域？', 'neighborhood', (SELECT id FROM vocab_senses WHERE slug='neighborhood.n.area'), ARRAY['neighborhood','mortgage','furniture','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 8, 'npc', 'Very. Good cafes nearby too.', 'とても。近くにいいカフェもある。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 9, 'user', 'Would we need new {furniture}?', '新しい家具は必要？', 'furniture', (SELECT id FROM vocab_senses WHERE slug='furniture.n.items'), ARRAY['furniture','rent','mortgage','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 10, 'npc', 'Some desks come with it.', '机はいくつか付いてくる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 11, 'user', 'Let''s ask the {landlord} about a tour.', '大家さんに内見を頼もう。', 'landlord', (SELECT id FROM vocab_senses WHERE slug='landlord.n.owner'), ARRAY['landlord','rent','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 12, 'npc', 'I''ll email them today.', '今日メールするよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 13, 'user', 'Great, keep me posted.', 'いいね、また教えて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 14, 'npc', 'Will do, {{user_name}}.', '了解、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-17.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-17 - Around the house  (Unit 6)
-- Words: tidy up, throw away, put away, clear out, move in, settle in, plug in, hang up.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('around-the-house', 'Around the house', '家事', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('tidy up', 'tidy up', '/ˌtaɪdi ˈʌp/', '/ˌtaɪdi ˈʌp/', NULL, 3, FALSE, NULL),
  ('throw away', 'throw away', '/ˌθroʊ əˈweɪ/', '/ˌθrəʊ əˈweɪ/', NULL, 3, FALSE, NULL),
  ('put away', 'put away', '/ˌpʊt əˈweɪ/', '/ˌpʊt əˈweɪ/', NULL, 3, FALSE, NULL),
  ('clear out', 'clear out', '/ˌklɪr ˈaʊt/', '/ˌklɪər ˈaʊt/', NULL, 4, FALSE, NULL),
  ('move in', 'move in', '/ˌmuːv ˈɪn/', '/ˌmuːv ˈɪn/', NULL, 3, FALSE, NULL),
  ('settle in', 'settle in', '/ˌsetl ˈɪn/', '/ˌsetl ˈɪn/', NULL, 4, FALSE, NULL),
  ('plug in', 'plug in', '/ˌplʌɡ ˈɪn/', '/ˌplʌɡ ˈɪn/', NULL, 3, FALSE, NULL),
  ('hang up', 'hang up', '/ˌhæŋ ˈʌp/', '/ˌhæŋ ˈʌp/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='tidy up'), 'tidy-up.phrv.neaten', 1, TRUE, 'phrasal verb', '片付ける', 'to make a place neat and in order', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='throw away'), 'throw-away.phrv.discard', 1, TRUE, 'phrasal verb', '捨てる', 'to get rid of something you do not want', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put away'), 'put-away.phrv.store', 1, TRUE, 'phrasal verb', 'しまう', 'to put something in the place where it is kept', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='clear out'), 'clear-out.phrv.empty', 1, TRUE, 'phrasal verb', '（不要な物を）片付ける', 'to remove things you no longer need from a space', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='move in'), 'move-in.phrv.occupy', 1, TRUE, 'phrasal verb', '引っ越してくる', 'to start living in a new home', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='settle in'), 'settle-in.phrv.adjust', 1, TRUE, 'phrasal verb', '慣れる', 'to get used to a new home or job', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plug in'), 'plug-in.phrv.connect', 1, TRUE, 'phrasal verb', 'プラグを差す', 'to connect a machine to electricity', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hang up'), 'hang-up.phrv.hang', 1, TRUE, 'phrasal verb', '掛ける', 'to put clothes on a hook or hanger', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('tidy up', 'throw away', 'put away', 'clear out', 'move in', 'settle in', 'plug in', 'hang up')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='around-the-house'
WHERE s.slug IN ('tidy-up.phrv.neaten', 'throw-away.phrv.discard', 'put-away.phrv.store', 'clear-out.phrv.empty', 'move-in.phrv.occupy', 'settle-in.phrv.adjust', 'plug-in.phrv.connect', 'hang-up.phrv.hang')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-17', 6, 1, (SELECT id FROM vocab_categories WHERE slug='around-the-house'), 'Around the house', '家のことをする', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-17'), s.id, x.ord FROM (VALUES
  ('tidy-up.phrv.neaten',0),('throw-away.phrv.discard',1),('put-away.phrv.store',2),('clear-out.phrv.empty',3),('move-in.phrv.occupy',4),('settle-in.phrv.adjust',5),('plug-in.phrv.connect',6),('hang-up.phrv.hang',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-17'), 'conversation', 0, 'Cleaning day', '掃除の日', 'home', 'roommate'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-17'), 'travel', 1, 'Moving into a homestay', 'ホームステイに入る', 'house', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-17'), 'business', 2, 'Setting up an office', 'オフィスの準備', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 0, 'npc', 'This place is a mess. Cleaning day?', '散らかってるね。掃除する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 1, 'user', 'Yes, let''s {tidy up} the living room first.', 'うん、まずリビングを片付けよう。', 'tidy up', (SELECT id FROM vocab_senses WHERE slug='tidy-up.phrv.neaten'), ARRAY['tidy up','throw away','put away','clear out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 2, 'npc', 'There''s so much junk.', 'ガラクタが多い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 3, 'user', 'We can {throw away} these old magazines.', 'この古い雑誌は捨てられる。', 'throw away', (SELECT id FROM vocab_senses WHERE slug='throw-away.phrv.discard'), ARRAY['throw away','put away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 4, 'npc', 'What about the clean clothes?', 'きれいな服は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 5, 'user', 'I''ll {put away} the laundry in the drawers.', '洗濯物は引き出しにしまうよ。', 'put away', (SELECT id FROM vocab_senses WHERE slug='put-away.phrv.store'), ARRAY['put away','throw away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 6, 'npc', 'The closet is packed.', 'クローゼットがぱんぱん。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 7, 'user', 'Let''s {clear out} clothes we never wear.', '着ない服を整理しよう。', 'clear out', (SELECT id FROM vocab_senses WHERE slug='clear-out.phrv.empty'), ARRAY['clear out','plug in','hang up','throw away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 8, 'npc', 'Good idea. Where''s the vacuum?', 'いいね。掃除機どこ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 9, 'user', 'I''ll {plug in} the vacuum over here.', 'こっちで掃除機をつなぐね。', 'plug in', (SELECT id FROM vocab_senses WHERE slug='plug-in.phrv.connect'), ARRAY['plug in','hang up','put away','throw away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 10, 'npc', 'And these coats on the floor?', '床のコートは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 11, 'user', 'I''ll {hang up} the coats by the door.', 'コートはドアのそばに掛ける。', 'hang up', (SELECT id FROM vocab_senses WHERE slug='hang-up.phrv.hang'), ARRAY['hang up','plug in','throw away','put away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 12, 'npc', 'We make a good team.', 'いいチームだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 13, 'user', 'Almost done!', 'もう少し！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='conversation'), 14, 'npc', 'Pizza after, {{user_name}}?', 'あとでピザ食べる、{{user_name}}？', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 0, 'npc', 'Welcome! Your room is ready.', 'ようこそ！部屋の準備はできてます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 1, 'user', 'Thank you! When can I {move in}?', 'ありがとう！いつ入れますか？', 'move in', (SELECT id FROM vocab_senses WHERE slug='move-in.phrv.occupy'), ARRAY['move in','settle in','tidy up','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 2, 'npc', 'Right now, if you like.', 'よければ今すぐでも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 3, 'user', 'Great. It''ll take a day to {settle in}.', 'いいですね。慣れるのに一日かかりそう。', 'settle in', (SELECT id FROM vocab_senses WHERE slug='settle-in.phrv.adjust'), ARRAY['settle in','move in','plug in','throw away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 4, 'npc', 'Take your time. Here''s the closet.', 'ごゆっくり。ここがクローゼット。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 5, 'user', 'I''ll {hang up} my shirts here.', 'シャツはここに掛けます。', 'hang up', (SELECT id FROM vocab_senses WHERE slug='hang-up.phrv.hang'), ARRAY['hang up','plug in','put away','throw away']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 6, 'npc', 'And drawers below for the rest.', '残りは下の引き出しに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 7, 'user', 'Perfect, I''ll {put away} my socks there.', '完璧、靴下はそこにしまいます。', 'put away', (SELECT id FROM vocab_senses WHERE slug='put-away.phrv.store'), ARRAY['put away','plug in','hang up','move in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 8, 'npc', 'There''s a desk for studying.', '勉強用の机もあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 9, 'user', 'Can I {plug in} my laptop by the desk?', '机のそばでノートPCをつないでいい？', 'plug in', (SELECT id FROM vocab_senses WHERE slug='plug-in.phrv.connect'), ARRAY['plug in','hang up','settle in','move in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 10, 'npc', 'Of course. Outlet''s on the wall.', 'もちろん。コンセントは壁に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 11, 'user', 'I''ll keep it neat and {tidy up} daily.', 'きれいに保って、毎日片付けます。', 'tidy up', (SELECT id FROM vocab_senses WHERE slug='tidy-up.phrv.neaten'), ARRAY['tidy up','move in','settle in','plug in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 12, 'npc', 'That''s very considerate.', 'とても気遣いがありますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 13, 'user', 'Thanks for having me.', 'お世話になります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='travel'), 14, 'npc', 'Make yourself at home!', 'くつろいでね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 0, 'npc', 'Let''s get the new office ready.', '新しいオフィスを整えよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 1, 'user', 'First, let''s {clear out} the old boxes.', 'まず古い箱を片付けよう。', 'clear out', (SELECT id FROM vocab_senses WHERE slug='clear-out.phrv.empty'), ARRAY['clear out','plug in','hang up','settle in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 2, 'npc', 'Half of them are trash.', '半分はゴミだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 3, 'user', 'Right, we can {throw away} the broken chairs.', 'うん、壊れた椅子は捨てられる。', 'throw away', (SELECT id FROM vocab_senses WHERE slug='throw-away.phrv.discard'), ARRAY['throw away','put away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 4, 'npc', 'The files should stay, though.', 'でも書類は残そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 5, 'user', 'I''ll {put away} the files in the cabinet.', '書類はキャビネットにしまうよ。', 'put away', (SELECT id FROM vocab_senses WHERE slug='put-away.phrv.store'), ARRAY['put away','throw away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 6, 'npc', 'Good. Now the tech setup.', 'いいね。次は機器の設置。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 7, 'user', 'I''ll {plug in} the monitors and printer.', 'モニターとプリンターをつなぐ。', 'plug in', (SELECT id FROM vocab_senses WHERE slug='plug-in.phrv.connect'), ARRAY['plug in','hang up','throw away','clear out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 8, 'npc', 'The team arrives Monday.', 'チームは月曜に来る。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 9, 'user', 'They''ll need a day to {settle in}.', '慣れるのに一日いるね。', 'settle in', (SELECT id FROM vocab_senses WHERE slug='settle-in.phrv.adjust'), ARRAY['settle in','throw away','plug in','clear out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 10, 'npc', 'Let''s make it welcoming.', '居心地よくしよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 11, 'user', 'I''ll {tidy up} the desks before they come.', '来る前に机を片付けておく。', 'tidy up', (SELECT id FROM vocab_senses WHERE slug='tidy-up.phrv.neaten'), ARRAY['tidy up','throw away','plug in','clear out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 12, 'npc', 'Great teamwork.', 'いい連携だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 13, 'user', 'Almost ready.', 'もうすぐ完成。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-17') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-18.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-18 - Household problems  (Unit 6)
-- Words: leak, blocked, repair, plumber, electricity, damage, flood, spare.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('household-problems', 'Household problems', '家のトラブル', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('leak', 'leak', '/liːk/', '/liːk/', NULL, 4, FALSE, NULL),
  ('blocked', 'blocked', '/blɑːkt/', '/blɒkt/', NULL, 4, FALSE, NULL),
  ('repair', 'repair', '/rɪˈper/', '/rɪˈpeə/', NULL, 3, FALSE, NULL),
  ('plumber', 'plumber', '/ˈplʌmər/', '/ˈplʌmə/', NULL, 4, TRUE, 'b は発音しない。/ˈplʌmər/。'),
  ('electricity', 'electricity', '/ɪˌlekˈtrɪsəti/', '/ɪˌlekˈtrɪsəti/', NULL, 3, FALSE, NULL),
  ('damage', 'damage', '/ˈdæmɪdʒ/', '/ˈdæmɪdʒ/', NULL, 3, FALSE, NULL),
  ('flood', 'flood', '/flʌd/', '/flʌd/', NULL, 4, FALSE, NULL),
  ('spare', 'spare', '/sper/', '/speə/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='leak'), 'leak.n.drip', 1, TRUE, 'noun', '漏れ', 'a hole or crack that lets liquid or gas escape', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='blocked'), 'blocked.adj.clogged', 1, TRUE, 'adjective', '詰まった', 'unable to let water or air pass through', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='repair'), 'repair.v.fix', 1, TRUE, 'verb', '修理する', 'to fix something that is broken', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plumber'), 'plumber.n.worker', 1, TRUE, 'noun', '配管工', 'a person who fixes water pipes', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='electricity'), 'electricity.n.power', 1, TRUE, 'noun', '電気', 'the power that runs lights and machines', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='damage'), 'damage.n.harm', 1, TRUE, 'noun', '損傷', 'harm that makes something less good or useful', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='flood'), 'flood.n.water', 1, TRUE, 'noun', '洪水', 'a large amount of water covering a place', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spare'), 'spare.adj.extra', 1, TRUE, 'adjective', '予備の', 'kept in case you need it later; extra', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('leak', 'blocked', 'repair', 'plumber', 'electricity', 'damage', 'flood', 'spare')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='household-problems'
WHERE s.slug IN ('leak.n.drip', 'blocked.adj.clogged', 'repair.v.fix', 'plumber.n.worker', 'electricity.n.power', 'damage.n.harm', 'flood.n.water', 'spare.adj.extra')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-18', 6, 2, (SELECT id FROM vocab_categories WHERE slug='household-problems'), 'Household problems', '家のトラブル', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-18'), s.id, x.ord FROM (VALUES
  ('leak.n.drip',0),('blocked.adj.clogged',1),('repair.v.fix',2),('plumber.n.worker',3),('electricity.n.power',4),('damage.n.harm',5),('flood.n.water',6),('spare.adj.extra',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-18'), 'conversation', 0, 'Something broke at home', '家の不具合', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-18'), 'travel', 1, 'A problem at the rental', '貸家のトラブル', 'house', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-18'), 'business', 2, 'Facilities issues', '設備トラブル', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 0, 'npc', 'You sound stressed. What''s up?', 'ストレスたまってそう。どうしたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 1, 'user', 'There''s a water {leak} under my kitchen sink.', 'キッチンのシンクの下で水漏れしてる。', 'leak', (SELECT id FROM vocab_senses WHERE slug='leak.n.drip'), ARRAY['leak','damage','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 2, 'npc', 'Oh no. Is it bad?', 'うわ。ひどい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 3, 'user', 'I called a {plumber} to come today.', '今日、配管工を呼んだ。', 'plumber', (SELECT id FROM vocab_senses WHERE slug='plumber.n.worker'), ARRAY['plumber','damage','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 4, 'npc', 'Good. Anything else wrong?', 'よかった。他に問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 5, 'user', 'Yeah, the bathroom drain is {blocked} too.', 'うん、風呂の排水も詰まってる。', 'blocked', (SELECT id FROM vocab_senses WHERE slug='blocked.adj.clogged'), ARRAY['blocked','spare','damage','flood']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 6, 'npc', 'When it rains, it pours!', '不運は重なるね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 7, 'user', 'And the {electricity} keeps cutting out.', 'それに電気がしょっちゅう切れる。', 'electricity', (SELECT id FROM vocab_senses WHERE slug='electricity.n.power'), ARRAY['electricity','leak','damage','flood']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 8, 'npc', 'That''s a lot at once.', '一度に大変だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 9, 'user', 'The landlord will {repair} everything tomorrow.', '大家さんが明日全部直してくれる。', 'repair', (SELECT id FROM vocab_senses WHERE slug='repair.v.fix'), ARRAY['repair','leak','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 10, 'npc', 'Do you have a backup for tonight?', '今夜の備えはある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 11, 'user', 'Luckily I have a {spare} flashlight.', '運よく予備の懐中電灯がある。', 'spare', (SELECT id FROM vocab_senses WHERE slug='spare.adj.extra'), ARRAY['spare','blocked','leak','flood']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 12, 'npc', 'Stay at mine if you need to.', '必要ならうちに泊まって。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 13, 'user', 'Thanks, I might!', 'ありがとう、そうするかも！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 0, 'npc', 'Is everything okay with the cottage?', 'コテージはどうですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 1, 'user', 'Not quite. Heavy rain caused a small {flood} in the hall.', '少し問題が。大雨で玄関がちょっと浸水しました。', 'flood', (SELECT id FROM vocab_senses WHERE slug='flood.n.water'), ARRAY['flood','leak','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 2, 'npc', 'I''m so sorry! Any harm to your things?', '申し訳ない！持ち物に被害は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 3, 'user', 'A little {damage} to my suitcase, nothing major.', 'スーツケースに少し損傷が、大したことはないです。', 'damage', (SELECT id FROM vocab_senses WHERE slug='damage.n.harm'), ARRAY['damage','flood','leak','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 4, 'npc', 'I''ll cover that, of course.', 'もちろん弁償します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 5, 'user', 'Thanks. There''s also a {leak} in the roof.', 'ありがとう。屋根にも雨漏りがあります。', 'leak', (SELECT id FROM vocab_senses WHERE slug='leak.n.drip'), ARRAY['leak','blocked','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 6, 'npc', 'The roof? I''ll send someone.', '屋根が？人をよこします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 7, 'user', 'Could they {repair} it before the weekend?', '週末までに直せますか？', 'repair', (SELECT id FROM vocab_senses WHERE slug='repair.v.fix'), ARRAY['repair','flood','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 8, 'npc', 'Yes, tomorrow morning.', 'はい、明日の朝に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 9, 'user', 'Also, the shower drain is {blocked}.', 'あと、シャワーの排水が詰まってます。', 'blocked', (SELECT id FROM vocab_senses WHERE slug='blocked.adj.clogged'), ARRAY['blocked','flood','leak','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 10, 'npc', 'Noted. Anything electrical?', '了解。電気の問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 11, 'user', 'The {electricity} in the kitchen is off.', 'キッチンの電気が止まってます。', 'electricity', (SELECT id FROM vocab_senses WHERE slug='electricity.n.power'), ARRAY['electricity','flood','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 12, 'npc', 'I''ll have it all fixed fast.', 'すぐ全部直させます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 13, 'user', 'Thank you so much.', '本当にありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 14, 'npc', 'Enjoy the rest of your stay!', '残りの滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 0, 'npc', 'Facilities said the office has issues.', '施設担当がオフィスに問題ありと。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 1, 'user', 'Yes, the {electricity} tripped on the third floor.', 'はい、3階で電気が落ちました。', 'electricity', (SELECT id FROM vocab_senses WHERE slug='electricity.n.power'), ARRAY['electricity','leak','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 2, 'npc', 'Anyone stuck in the lift?', 'エレベーターに閉じ込められた人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 3, 'user', 'No, but we need a {repair} team fast.', 'いいえ、でも早く修理チームが必要。', 'repair', (SELECT id FROM vocab_senses WHERE slug='repair.v.fix'), ARRAY['repair','leak','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 4, 'npc', 'What else?', '他には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 5, 'user', 'The men''s room sink is {blocked}.', '男子トイレの流しが詰まってます。', 'blocked', (SELECT id FROM vocab_senses WHERE slug='blocked.adj.clogged'), ARRAY['blocked','spare','damage','flood']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 6, 'npc', 'Ugh. Get a plumber.', 'うわ。配管工を呼んで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 7, 'user', 'Already did. There''s a {leak} in the ceiling too.', 'もう呼びました。天井にも水漏れが。', 'leak', (SELECT id FROM vocab_senses WHERE slug='leak.n.drip'), ARRAY['leak','blocked','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 8, 'npc', 'Any damage to equipment?', '機器への被害は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 9, 'user', 'Some {damage} to a printer from the water.', '水でプリンターが少し損傷しました。', 'damage', (SELECT id FROM vocab_senses WHERE slug='damage.n.harm'), ARRAY['damage','blocked','leak','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 10, 'npc', 'Do we have backups?', '予備はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 11, 'user', 'Yes, a {spare} printer in storage.', 'はい、倉庫に予備のプリンターが。', 'spare', (SELECT id FROM vocab_senses WHERE slug='spare.adj.extra'), ARRAY['spare','blocked','leak','damage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 12, 'npc', 'Good. Handle it today.', 'よし。今日中に対応して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 13, 'user', 'On it.', '了解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-19.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-19 - Wellbeing  (Unit 7)
-- Words: exercise, diet, healthy, energy, stress, relax, habit, lifestyle.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('wellbeing', 'Wellbeing', '健康と生活', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('exercise', 'exercise', '/ˈeksərsaɪz/', '/ˈeksəsaɪz/', NULL, 3, FALSE, NULL),
  ('diet', 'diet', '/ˈdaɪət/', '/ˈdaɪət/', NULL, 3, FALSE, NULL),
  ('healthy', 'healthy', '/ˈhelθi/', '/ˈhelθi/', NULL, 3, FALSE, NULL),
  ('energy', 'energy', '/ˈenərdʒi/', '/ˈenədʒi/', NULL, 3, FALSE, NULL),
  ('stress', 'stress', '/stres/', '/stres/', NULL, 3, FALSE, NULL),
  ('relax', 'relax', '/rɪˈlæks/', '/rɪˈlæks/', NULL, 3, FALSE, NULL),
  ('habit', 'habit', '/ˈhæbɪt/', '/ˈhæbɪt/', NULL, 3, FALSE, NULL),
  ('lifestyle', 'lifestyle', '/ˈlaɪfstaɪl/', '/ˈlaɪfstaɪl/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='exercise'), 'exercise.n.activity', 1, TRUE, 'noun', '運動', 'physical activity you do to stay fit', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='diet'), 'diet.n.food', 1, TRUE, 'noun', '食生活', 'the food that you usually eat', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='healthy'), 'healthy.adj.well', 1, TRUE, 'adjective', '健康的な', 'good for your health; not ill', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='energy'), 'energy.n.vigor', 1, TRUE, 'noun', '活力', 'the strength you need to be active', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stress'), 'stress.n.pressure', 1, TRUE, 'noun', 'ストレス', 'worry caused by a difficult situation', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='relax'), 'relax.v.rest', 1, TRUE, 'verb', 'くつろぐ', 'to rest and become calm', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='habit'), 'habit.n.routine', 1, TRUE, 'noun', '習慣', 'something you do regularly, often without thinking', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lifestyle'), 'lifestyle.n.way', 1, TRUE, 'noun', '生活習慣', 'the way in which you live', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('exercise', 'diet', 'healthy', 'energy', 'stress', 'relax', 'habit', 'lifestyle')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='wellbeing'
WHERE s.slug IN ('exercise.n.activity', 'diet.n.food', 'healthy.adj.well', 'energy.n.vigor', 'stress.n.pressure', 'relax.v.rest', 'habit.n.routine', 'lifestyle.n.way')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-19', 7, 0, (SELECT id FROM vocab_categories WHERE slug='wellbeing'), 'Wellbeing', '心と体の健康', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-19'), s.id, x.ord FROM (VALUES
  ('exercise.n.activity',0),('diet.n.food',1),('healthy.adj.well',2),('energy.n.vigor',3),('stress.n.pressure',4),('relax.v.rest',5),('habit.n.routine',6),('lifestyle.n.way',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-19'), 'conversation', 0, 'Getting healthier', '健康的になる', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-19'), 'travel', 1, 'A wellness retreat', 'ウェルネス施設', 'retreat', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-19'), 'business', 2, 'Workplace wellbeing', '職場の健康づくり', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 0, 'npc', 'You look great lately. What changed?', '最近元気そう。何が変わったの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 1, 'user', 'I added regular {exercise} to my week.', '毎週の習慣に運動を取り入れた。', 'exercise', (SELECT id FROM vocab_senses WHERE slug='exercise.n.activity'), ARRAY['exercise','diet','energy','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 2, 'npc', 'Nice. Eating differently too?', 'いいね。食事も変えた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 3, 'user', 'Yeah, my {diet} has way more vegetables now.', 'うん、食生活に野菜がずっと増えた。', 'diet', (SELECT id FROM vocab_senses WHERE slug='diet.n.food'), ARRAY['diet','energy','stress','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 4, 'npc', 'Do you feel different?', '体調は違う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 5, 'user', 'Definitely. I have so much more {energy}.', '全然違う。活力がずっと増えた。', 'energy', (SELECT id FROM vocab_senses WHERE slug='energy.n.vigor'), ARRAY['energy','stress','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 6, 'npc', 'Sleeping better?', 'よく眠れてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 7, 'user', 'Yes, and way less {stress} at work.', 'うん、仕事のストレスもかなり減った。', 'stress', (SELECT id FROM vocab_senses WHERE slug='stress.n.pressure'), ARRAY['stress','energy','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 8, 'npc', 'How did you start?', 'どうやって始めたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 9, 'user', 'I built one small {habit} at a time.', '小さな習慣を一つずつ作った。', 'habit', (SELECT id FROM vocab_senses WHERE slug='habit.n.routine'), ARRAY['habit','energy','diet','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 10, 'npc', 'That''s the secret.', 'それが秘訣だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 11, 'user', 'Now this {healthy} routine feels normal.', '今はこの健康的な習慣が普通に感じる。', 'healthy', (SELECT id FROM vocab_senses WHERE slug='healthy.adj.well'), ARRAY['healthy','energy','stress','diet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 12, 'npc', 'So inspiring!', '刺激になる！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 13, 'user', 'You can do it too.', '君にもできるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 14, 'npc', 'Teach me, {{user_name}}!', '教えて、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 0, 'npc', 'Welcome to the wellness retreat!', 'ウェルネス施設へようこそ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 1, 'user', 'Thank you. I really need to {relax}.', 'ありがとう。本当にくつろぎたいです。', 'relax', (SELECT id FROM vocab_senses WHERE slug='relax.v.rest'), ARRAY['relax','exercise','stress','energy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 2, 'npc', 'You''ve come to the right place.', '来て正解ですよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 3, 'user', 'Work has given me so much {stress}.', '仕事でストレスがすごく溜まってて。', 'stress', (SELECT id FROM vocab_senses WHERE slug='stress.n.pressure'), ARRAY['stress','energy','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 4, 'npc', 'We''ll help you unwind.', 'リラックスのお手伝いをします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 5, 'user', 'I want a calmer {lifestyle} overall.', '全体的に落ち着いた生活習慣にしたい。', 'lifestyle', (SELECT id FROM vocab_senses WHERE slug='lifestyle.n.way'), ARRAY['lifestyle','energy','diet','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 6, 'npc', 'We offer yoga and hikes.', 'ヨガやハイキングがあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 7, 'user', 'Great, I love gentle {exercise}.', 'いいですね、穏やかな運動が好きです。', 'exercise', (SELECT id FROM vocab_senses WHERE slug='exercise.n.activity'), ARRAY['exercise','energy','stress','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 8, 'npc', 'It boosts your mood.', '気分が上向きますよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 9, 'user', 'I hope to leave with more {energy}.', 'もっと活力を持って帰れたら。', 'energy', (SELECT id FROM vocab_senses WHERE slug='energy.n.vigor'), ARRAY['energy','stress','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 10, 'npc', 'And healthier eating too.', '食事も健康的に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 11, 'user', 'Yes, I want more {healthy} meals.', 'はい、健康的な食事を増やしたいです。', 'healthy', (SELECT id FROM vocab_senses WHERE slug='healthy.adj.well'), ARRAY['healthy','energy','stress','diet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 12, 'npc', 'Our chef will spoil you.', 'シェフが腕をふるいますよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 13, 'user', 'I can''t wait.', '楽しみです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 14, 'npc', 'Relax and enjoy!', 'くつろいで楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 0, 'npc', 'HR wants ideas to reduce burnout.', '人事が燃え尽き対策のアイデアを求めてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 1, 'user', 'Good. People here have too much {stress}.', 'いいね。ここの人はストレスが多すぎる。', 'stress', (SELECT id FROM vocab_senses WHERE slug='stress.n.pressure'), ARRAY['stress','energy','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 2, 'npc', 'What would help?', '何が効く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 3, 'user', 'A quiet room where staff can {relax}.', 'スタッフがくつろげる静かな部屋。', 'relax', (SELECT id FROM vocab_senses WHERE slug='relax.v.rest'), ARRAY['relax','exercise','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 4, 'npc', 'I like that. Anything active?', 'いいね。体を動かすものは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 5, 'user', 'Maybe lunchtime {exercise} classes.', '昼休みの運動クラスとか。', 'exercise', (SELECT id FROM vocab_senses WHERE slug='exercise.n.activity'), ARRAY['exercise','energy','stress','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 6, 'npc', 'That could boost focus.', '集中力が上がりそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 7, 'user', 'Exactly, more {energy} in the afternoon.', 'そう、午後の活力が増す。', 'energy', (SELECT id FROM vocab_senses WHERE slug='energy.n.vigor'), ARRAY['energy','stress','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 8, 'npc', 'Small changes, big effect.', '小さな変化で大きな効果。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 9, 'user', 'We can encourage one good {habit} a month.', '月に一つ良い習慣を勧められる。', 'habit', (SELECT id FROM vocab_senses WHERE slug='habit.n.routine'), ARRAY['habit','energy','diet','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 10, 'npc', 'Like a step challenge?', '歩数チャレンジみたいな？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 11, 'user', 'Yes, to build a {healthy} team culture.', 'うん、健康的なチーム文化を作るために。', 'healthy', (SELECT id FROM vocab_senses WHERE slug='healthy.adj.well'), ARRAY['healthy','energy','stress','diet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 12, 'npc', 'Let''s pitch it to management.', '経営陣に提案しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 13, 'user', 'I''ll make slides.', 'スライドを作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-20.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-20 - Staying healthy  (Unit 7)
-- Words: work out, give up, cut down, warm up, put on, slow down, take up, ease off.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('staying-healthy', 'Staying healthy', '健康を保つ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('work out', 'work out', '/ˌwɜːrk ˈaʊt/', '/ˌwɜːk ˈaʊt/', NULL, 3, FALSE, NULL),
  ('give up', 'give up', '/ˌɡɪv ˈʌp/', '/ˌɡɪv ˈʌp/', NULL, 3, FALSE, NULL),
  ('cut down', 'cut down', '/ˌkʌt ˈdaʊn/', '/ˌkʌt ˈdaʊn/', NULL, 4, FALSE, NULL),
  ('warm up', 'warm up', '/ˌwɔːrm ˈʌp/', '/ˌwɔːm ˈʌp/', NULL, 3, FALSE, NULL),
  ('put on', 'put on', '/ˌpʊt ˈɑːn/', '/ˌpʊt ˈɒn/', NULL, 4, FALSE, NULL),
  ('slow down', 'slow down', '/ˌsloʊ ˈdaʊn/', '/ˌsləʊ ˈdaʊn/', NULL, 3, FALSE, NULL),
  ('take up', 'take up', '/ˌteɪk ˈʌp/', '/ˌteɪk ˈʌp/', NULL, 4, FALSE, NULL),
  ('ease off', 'ease off', '/ˌiːz ˈɔːf/', '/ˌiːz ˈɒf/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='work out'), 'work-out.phrv.exercise', 1, TRUE, 'phrasal verb', '運動する', 'to do physical exercise to get fit', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='give up'), 'give-up.phrv.quit', 1, TRUE, 'phrasal verb', 'やめる', 'to stop doing something, especially a habit', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cut down'), 'cut-down.phrv.reduce', 1, TRUE, 'phrasal verb', '（量を）減らす', 'to consume or do less of something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='warm up'), 'warm-up.phrv.prepare', 1, TRUE, 'phrasal verb', '準備運動をする', 'to prepare your body gently before exercise', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put on'), 'put-on.phrv.gain', 1, TRUE, 'phrasal verb', '（体重が）増える', 'to gain weight', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='slow down'), 'slow-down.phrv.decelerate', 1, TRUE, 'phrasal verb', 'ペースを落とす', 'to become less busy or move less fast; to rest more', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take up'), 'take-up.phrv.start', 1, TRUE, 'phrasal verb', '（趣味などを）始める', 'to start a new activity or hobby', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ease off'), 'ease-off.phrv.reduce', 1, TRUE, 'phrasal verb', '控える', 'to gradually do something with less effort or force', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('work out', 'give up', 'cut down', 'warm up', 'put on', 'slow down', 'take up', 'ease off')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='staying-healthy'
WHERE s.slug IN ('work-out.phrv.exercise', 'give-up.phrv.quit', 'cut-down.phrv.reduce', 'warm-up.phrv.prepare', 'put-on.phrv.gain', 'slow-down.phrv.decelerate', 'take-up.phrv.start', 'ease-off.phrv.reduce')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-20', 7, 1, (SELECT id FROM vocab_categories WHERE slug='staying-healthy'), 'Staying healthy', '健康を保つ', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-20'), s.id, x.ord FROM (VALUES
  ('work-out.phrv.exercise',0),('give-up.phrv.quit',1),('cut-down.phrv.reduce',2),('warm-up.phrv.prepare',3),('put-on.phrv.gain',4),('slow-down.phrv.decelerate',5),('take-up.phrv.start',6),('ease-off.phrv.reduce',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-20'), 'conversation', 0, 'New Year resolutions', '新年の抱負', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-20'), 'travel', 1, 'At the hotel gym', 'ホテルのジムで', 'gym', 'trainer'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-20'), 'business', 2, 'Avoiding burnout', '燃え尽きを防ぐ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 0, 'npc', 'Any resolutions this year?', '今年の抱負はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 1, 'user', 'Yes, I want to {work out} three times a week.', 'うん、週3回運動したい。', 'work out', (SELECT id FROM vocab_senses WHERE slug='work-out.phrv.exercise'), ARRAY['work out','give up','cut down','warm up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 2, 'npc', 'Good goal. Diet changes?', 'いい目標。食事は変える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 3, 'user', 'I''ll {cut down} on sugar and soda.', '砂糖と炭酸を減らす。', 'cut down', (SELECT id FROM vocab_senses WHERE slug='cut-down.phrv.reduce'), ARRAY['cut down','take up','warm up','slow down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 4, 'npc', 'Smart. Quitting anything?', '賢い。何かやめる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 5, 'user', 'Yeah, I''m trying to {give up} smoking.', 'うん、たばこをやめようとしてる。', 'give up', (SELECT id FROM vocab_senses WHERE slug='give-up.phrv.quit'), ARRAY['give up','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 6, 'npc', 'That''s a big one. Good luck!', 'それは大きいね。頑張って！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 7, 'user', 'I don''t want to {put on} more weight either.', 'これ以上体重を増やしたくもない。', 'put on', (SELECT id FROM vocab_senses WHERE slug='put-on.phrv.gain'), ARRAY['put on','warm up','slow down','take up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 8, 'npc', 'Exercise helps with that.', '運動が効くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 9, 'user', 'I might also {take up} swimming.', '水泳も始めるかも。', 'take up', (SELECT id FROM vocab_senses WHERE slug='take-up.phrv.start'), ARRAY['take up','warm up','put on','cut down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 10, 'npc', 'Nice variety.', 'いいバランス。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 11, 'user', 'And in general, I want to {slow down} and rest more.', 'それに全体的にペースを落として休みたい。', 'slow down', (SELECT id FROM vocab_senses WHERE slug='slow-down.phrv.decelerate'), ARRAY['slow down','warm up','put on','cut down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 12, 'npc', 'Balance is everything.', 'バランスが大事。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 13, 'user', 'This year''s the year!', '今年こそ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='conversation'), 14, 'npc', 'You''ve got this, {{user_name}}.', 'できるよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 0, 'npc', 'First time using the hotel gym?', 'ホテルのジムは初めて？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 1, 'user', 'Yes, I like to {work out} while traveling.', 'はい、旅行中も運動したくて。', 'work out', (SELECT id FROM vocab_senses WHERE slug='work-out.phrv.exercise'), ARRAY['work out','give up','cut down','warm up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 2, 'npc', 'Great. Do you stretch first?', 'いいね。先にストレッチする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 3, 'user', 'Always. I {warm up} before I run.', '必ず。走る前に準備運動します。', 'warm up', (SELECT id FROM vocab_senses WHERE slug='warm-up.phrv.prepare'), ARRAY['warm up','give up','put on','take up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 4, 'npc', 'Good habit. Any injuries?', 'いい習慣。けがは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 5, 'user', 'My knee is sore, so I''ll {ease off} today.', '膝が痛いので、今日は控えめにします。', 'ease off', (SELECT id FROM vocab_senses WHERE slug='ease-off.phrv.reduce'), ARRAY['ease off','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 6, 'npc', 'Wise. Don''t push too hard.', '賢明。無理しないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 7, 'user', 'Right, I''ll {slow down} on the treadmill.', 'はい、ランニングマシンではペースを落とします。', 'slow down', (SELECT id FROM vocab_senses WHERE slug='slow-down.phrv.decelerate'), ARRAY['slow down','warm up','put on','take up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 8, 'npc', 'There''s a hike tomorrow too.', '明日はハイキングもあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 9, 'user', 'Nice! I''ve wanted to {take up} hiking.', 'いいですね！ハイキングを始めたかった。', 'take up', (SELECT id FROM vocab_senses WHERE slug='take-up.phrv.start'), ARRAY['take up','warm up','put on','ease off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 10, 'npc', 'It''s a beautiful trail.', 'きれいなコースですよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 11, 'user', 'Just don''t let me {put on} weight from the buffet!', 'ビュッフェで太らないようにしないと！', 'put on', (SELECT id FROM vocab_senses WHERE slug='put-on.phrv.gain'), ARRAY['put on','warm up','ease off','slow down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 12, 'npc', 'Ha, hike it off!', 'はは、歩いて消費しましょう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 13, 'user', 'Deal!', '了解！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='travel'), 14, 'npc', 'Enjoy your workout!', '運動を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 0, 'npc', 'You''ve been working nonstop lately.', '最近ずっと働きづめだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 1, 'user', 'I know. I need to {slow down} a bit.', 'わかってる。少しペースを落とさないと。', 'slow down', (SELECT id FROM vocab_senses WHERE slug='slow-down.phrv.decelerate'), ARRAY['slow down','warm up','put on','take up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 2, 'npc', 'Take a real lunch break.', 'ちゃんと昼休みを取りなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 3, 'user', 'Yeah, I should {cut down} on late nights.', 'うん、夜更かしを減らすべきだね。', 'cut down', (SELECT id FROM vocab_senses WHERE slug='cut-down.phrv.reduce'), ARRAY['cut down','take up','warm up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 4, 'npc', 'Are you sleeping enough?', '睡眠は足りてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 5, 'user', 'No. I might {give up} checking email at night.', '足りない。夜のメールチェックをやめようかな。', 'give up', (SELECT id FROM vocab_senses WHERE slug='give-up.phrv.quit'), ARRAY['give up','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 6, 'npc', 'That would help a lot.', 'それはかなり効くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 7, 'user', 'I''ll {ease off} the overtime this month.', '今月は残業を控えるよ。', 'ease off', (SELECT id FROM vocab_senses WHERE slug='ease-off.phrv.reduce'), ARRAY['ease off','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 8, 'npc', 'Do you exercise at all?', '運動はしてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 9, 'user', 'I try to {work out} on weekends.', '週末に運動しようとしてる。', 'work out', (SELECT id FROM vocab_senses WHERE slug='work-out.phrv.exercise'), ARRAY['work out','give up','cut down','warm up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 10, 'npc', 'Even a short walk helps.', '短い散歩でも効くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 11, 'user', 'True. I''ll {warm up} with a morning stretch.', '確かに。朝のストレッチから始める。', 'warm up', (SELECT id FROM vocab_senses WHERE slug='warm-up.phrv.prepare'), ARRAY['warm up','give up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 12, 'npc', 'Look after yourself.', '体を大事にね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 13, 'user', 'Thanks for the nudge.', '背中を押してくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-20') AND goal='business'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-21.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-21 - At the clinic  (Unit 7)
-- Words: symptom, prescription, treatment, injury, recover, painkiller, allergy, dizzy.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('at-the-clinic', 'At the clinic', '診療所で', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('symptom', 'symptom', '/ˈsɪmptəm/', '/ˈsɪmptəm/', NULL, 4, FALSE, NULL),
  ('prescription', 'prescription', '/prɪˈskrɪpʃn/', '/prɪˈskrɪpʃn/', NULL, 4, FALSE, NULL),
  ('treatment', 'treatment', '/ˈtriːtmənt/', '/ˈtriːtmənt/', NULL, 3, FALSE, NULL),
  ('injury', 'injury', '/ˈɪndʒəri/', '/ˈɪndʒəri/', NULL, 3, FALSE, NULL),
  ('recover', 'recover', '/rɪˈkʌvər/', '/rɪˈkʌvə/', NULL, 3, FALSE, NULL),
  ('painkiller', 'painkiller', '/ˈpeɪnkɪlər/', '/ˈpeɪnkɪlə/', NULL, 4, FALSE, NULL),
  ('allergy', 'allergy', '/ˈælərdʒi/', '/ˈælədʒi/', NULL, 4, FALSE, NULL),
  ('dizzy', 'dizzy', '/ˈdɪzi/', '/ˈdɪzi/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='symptom'), 'symptom.n.sign', 1, TRUE, 'noun', '症状', 'a sign that shows you have an illness', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='prescription'), 'prescription.n.paper', 1, TRUE, 'noun', '処方箋', 'a doctor''s written order for medicine', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='treatment'), 'treatment.n.care', 1, TRUE, 'noun', '治療', 'medical care given for an illness or injury', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='injury'), 'injury.n.harm', 1, TRUE, 'noun', 'けが', 'physical harm to your body', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='recover'), 'recover.v.heal', 1, TRUE, 'verb', '回復する', 'to become well again after illness or injury', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='painkiller'), 'painkiller.n.medicine', 1, TRUE, 'noun', '鎮痛剤', 'medicine that reduces pain', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='allergy'), 'allergy.n.reaction', 1, TRUE, 'noun', 'アレルギー', 'a bad reaction of the body to certain things', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dizzy'), 'dizzy.adj.faint', 1, TRUE, 'adjective', 'めまいがする', 'feeling that things are turning around you', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('symptom', 'prescription', 'treatment', 'injury', 'recover', 'painkiller', 'allergy', 'dizzy')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='at-the-clinic'
WHERE s.slug IN ('symptom.n.sign', 'prescription.n.paper', 'treatment.n.care', 'injury.n.harm', 'recover.v.heal', 'painkiller.n.medicine', 'allergy.n.reaction', 'dizzy.adj.faint')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-21', 7, 2, (SELECT id FROM vocab_categories WHERE slug='at-the-clinic'), 'At the clinic', '診療所で', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-21'), s.id, x.ord FROM (VALUES
  ('symptom.n.sign',0),('prescription.n.paper',1),('treatment.n.care',2),('injury.n.harm',3),('recover.v.heal',4),('painkiller.n.medicine',5),('allergy.n.reaction',6),('dizzy.adj.faint',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-21'), 'conversation', 0, 'A friend is unwell', '友達の不調', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-21'), 'travel', 1, 'At a clinic abroad', '海外の診療所で', 'clinic', 'doctor'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-21'), 'business', 2, 'A colleague''s sick leave', '同僚の病欠', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 0, 'npc', 'You don''t look well. What''s wrong?', '具合悪そう。どうしたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 1, 'user', 'I feel {dizzy} and a bit weak.', 'めまいがして、少し力が入らない。', 'dizzy', (SELECT id FROM vocab_senses WHERE slug='dizzy.adj.faint'), ARRAY['dizzy','recover','symptom','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 2, 'npc', 'How long has this gone on?', 'いつから？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 3, 'user', 'The main {symptom} started two days ago.', '主な症状は2日前から。', 'symptom', (SELECT id FROM vocab_senses WHERE slug='symptom.n.sign'), ARRAY['symptom','treatment','painkiller','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 4, 'npc', 'Did you see a doctor?', '医者に行った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 5, 'user', 'Yes, she gave me a {treatment} plan.', 'うん、治療の計画をもらった。', 'treatment', (SELECT id FROM vocab_senses WHERE slug='treatment.n.care'), ARRAY['treatment','symptom','allergy','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 6, 'npc', 'Any medicine?', '薬は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 7, 'user', 'A {painkiller} for the headache.', '頭痛用に鎮痛剤を。', 'painkiller', (SELECT id FROM vocab_senses WHERE slug='painkiller.n.medicine'), ARRAY['painkiller','symptom','allergy','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 8, 'npc', 'Could it be something you ate?', '食べ物のせいかも？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 9, 'user', 'Maybe an {allergy}; I had nuts yesterday.', 'アレルギーかも、昨日ナッツを食べた。', 'allergy', (SELECT id FROM vocab_senses WHERE slug='allergy.n.reaction'), ARRAY['allergy','symptom','treatment','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 10, 'npc', 'Ah, that could be it.', 'ああ、それかもね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 11, 'user', 'I should {recover} in a few days.', '数日で回復するはず。', 'recover', (SELECT id FROM vocab_senses WHERE slug='recover.v.heal'), ARRAY['recover','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 12, 'npc', 'Rest lots, okay?', 'たくさん休んでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 13, 'user', 'I will.', 'そうする。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 14, 'npc', 'Feel better, {{user_name}}.', 'お大事に、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 0, 'npc', 'Hello. What brings you in today?', 'こんにちは。今日はどうされました？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 1, 'user', 'I have an {injury}; I hurt my ankle hiking.', 'けがをしました。ハイキングで足首を痛めて。', 'injury', (SELECT id FROM vocab_senses WHERE slug='injury.n.harm'), ARRAY['injury','symptom','allergy','prescription']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 2, 'npc', 'Let me take a look. Any other issues?', '診てみましょう。他に問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 3, 'user', 'The main {symptom} is swelling and pain.', '主な症状は腫れと痛みです。', 'symptom', (SELECT id FROM vocab_senses WHERE slug='symptom.n.sign'), ARRAY['symptom','treatment','prescription','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 4, 'npc', 'It''s a mild sprain, not broken.', '軽い捻挫で、骨折ではありません。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 5, 'user', 'What {treatment} do I need?', 'どんな治療が必要ですか？', 'treatment', (SELECT id FROM vocab_senses WHERE slug='treatment.n.care'), ARRAY['treatment','symptom','prescription','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 6, 'npc', 'Rest, ice, and support.', '安静、冷却、固定です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 7, 'user', 'Can I take a {painkiller} for the pain?', '痛みに鎮痛剤を飲んでもいい？', 'painkiller', (SELECT id FROM vocab_senses WHERE slug='painkiller.n.medicine'), ARRAY['painkiller','symptom','allergy','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 8, 'npc', 'Yes. I''ll write it down for the pharmacy.', 'はい。薬局用に書きますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 9, 'user', 'Great, I''ll get the {prescription} filled.', 'では処方箋を出してもらいます。', 'prescription', (SELECT id FROM vocab_senses WHERE slug='prescription.n.paper'), ARRAY['prescription','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 10, 'npc', 'Stay off it for a week.', '1週間は使わないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 11, 'user', 'How long until I fully {recover}?', '完全に回復するまでどのくらい？', 'recover', (SELECT id FROM vocab_senses WHERE slug='recover.v.heal'), ARRAY['recover','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 12, 'npc', 'About two weeks.', '2週間ほどです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 13, 'user', 'Thank you, doctor.', 'ありがとう、先生。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 14, 'npc', 'Take care!', 'お大事に！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 0, 'npc', 'Did you hear Ken is off sick?', 'ケンが病欠って聞いた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 1, 'user', 'Yes, he had a bad {symptom} all week.', 'うん、一週間ずっとつらい症状が出てた。', 'symptom', (SELECT id FROM vocab_senses WHERE slug='symptom.n.sign'), ARRAY['symptom','treatment','prescription','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 2, 'npc', 'Poor guy. What happened?', '気の毒に。何があったの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 3, 'user', 'Actually a back {injury} from moving boxes.', '実は箱運びで腰をけがして。', 'injury', (SELECT id FROM vocab_senses WHERE slug='injury.n.harm'), ARRAY['injury','symptom','allergy','prescription']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 4, 'npc', 'Ouch. Is he getting care?', '痛そう。治療は受けてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 5, 'user', 'Yes, he started physical {treatment}.', 'うん、理学治療を始めた。', 'treatment', (SELECT id FROM vocab_senses WHERE slug='treatment.n.care'), ARRAY['treatment','symptom','prescription','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 6, 'npc', 'Good. Does he need anything?', 'よかった。何か必要？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 7, 'user', 'Just to pick up his {prescription}.', '処方箋を受け取るだけ。', 'prescription', (SELECT id FROM vocab_senses WHERE slug='prescription.n.paper'), ARRAY['prescription','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 8, 'npc', 'I can do that after work.', '仕事のあとやれるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 9, 'user', 'Thanks. He should {recover} in a week or two.', 'ありがとう。1、2週間で回復するはず。', 'recover', (SELECT id FROM vocab_senses WHERE slug='recover.v.heal'), ARRAY['recover','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 10, 'npc', 'We''ll cover his tasks.', '彼の仕事はカバーするよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 11, 'user', 'Also, remind the team about his nut {allergy} at lunch.', 'あと、昼食で彼のナッツアレルギーをチームに注意して。', 'allergy', (SELECT id FROM vocab_senses WHERE slug='allergy.n.reaction'), ARRAY['allergy','symptom','treatment','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 12, 'npc', 'Good call. I''ll note it.', '了解。メモしておく。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 13, 'user', 'Thanks for helping out.', '手伝ってくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 14, 'npc', 'Of course, {{user_name}}.', 'もちろん、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-22.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-22 - Planning a trip  (Unit 8)
-- Words: destination, itinerary, accommodation, reserve, abroad, journey, luggage, insurance.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('planning-a-trip', 'Planning a trip', '旅行の計画', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('destination', 'destination', '/ˌdestɪˈneɪʃn/', '/ˌdestɪˈneɪʃn/', NULL, 4, FALSE, NULL),
  ('itinerary', 'itinerary', '/aɪˈtɪnəreri/', '/aɪˈtɪnərəri/', NULL, 4, FALSE, NULL),
  ('accommodation', 'accommodation', '/əˌkɑːməˈdeɪʃn/', '/əˌkɒməˈdeɪʃn/', NULL, 4, FALSE, NULL),
  ('reserve', 'reserve', '/rɪˈzɜːrv/', '/rɪˈzɜːv/', NULL, 3, FALSE, NULL),
  ('abroad', 'abroad', '/əˈbrɔːd/', '/əˈbrɔːd/', NULL, 3, FALSE, NULL),
  ('journey', 'journey', '/ˈdʒɜːrni/', '/ˈdʒɜːni/', NULL, 3, FALSE, NULL),
  ('luggage', 'luggage', '/ˈlʌɡɪdʒ/', '/ˈlʌɡɪdʒ/', NULL, 3, FALSE, NULL),
  ('insurance', 'insurance', '/ɪnˈʃʊrəns/', '/ɪnˈʃʊərəns/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='destination'), 'destination.n.place', 1, TRUE, 'noun', '目的地', 'the place you are traveling to', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='itinerary'), 'itinerary.n.plan', 1, TRUE, 'noun', '旅程', 'a plan of the places and times for a trip', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='accommodation'), 'accommodation.n.lodging', 1, TRUE, 'noun', '宿泊施設', 'a place to stay, such as a hotel', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reserve'), 'reserve.v.book', 1, TRUE, 'verb', '予約する', 'to arrange to have a room or seat kept for you', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='abroad'), 'abroad.adv.overseas', 1, TRUE, 'adverb', '海外へ', 'in or to a foreign country', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='journey'), 'journey.n.trip', 1, TRUE, 'noun', '旅', 'the act of traveling from one place to another', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='luggage'), 'luggage.n.bags', 1, TRUE, 'noun', '荷物', 'the bags and cases you take when you travel', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='insurance'), 'insurance.n.cover', 1, TRUE, 'noun', '保険', 'protection that pays you if something goes wrong', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('destination', 'itinerary', 'accommodation', 'reserve', 'abroad', 'journey', 'luggage', 'insurance')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='planning-a-trip'
WHERE s.slug IN ('destination.n.place', 'itinerary.n.plan', 'accommodation.n.lodging', 'reserve.v.book', 'abroad.adv.overseas', 'journey.n.trip', 'luggage.n.bags', 'insurance.n.cover')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-22', 8, 0, (SELECT id FROM vocab_categories WHERE slug='planning-a-trip'), 'Planning a trip', '旅行の計画', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-22'), s.id, x.ord FROM (VALUES
  ('destination.n.place',0),('itinerary.n.plan',1),('accommodation.n.lodging',2),('reserve.v.book',3),('abroad.adv.overseas',4),('journey.n.trip',5),('luggage.n.bags',6),('insurance.n.cover',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-22'), 'conversation', 0, 'Planning a holiday', '休暇の計画', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-22'), 'travel', 1, 'At a travel agency', '旅行代理店で', 'agency', 'agent'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-22'), 'business', 2, 'A work trip', '出張', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 0, 'npc', 'Have you booked your summer trip?', '夏の旅行はもう予約した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 1, 'user', 'Almost. My {destination} is Portugal.', 'もう少し。目的地はポルトガル。', 'destination', (SELECT id FROM vocab_senses WHERE slug='destination.n.place'), ARRAY['destination','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 2, 'npc', 'Lovely! Where will you stay?', 'いいね！どこに泊まる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 3, 'user', 'I found nice {accommodation} near the beach.', 'ビーチの近くにいい宿を見つけた。', 'accommodation', (SELECT id FROM vocab_senses WHERE slug='accommodation.n.lodging'), ARRAY['accommodation','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 4, 'npc', 'Did you book it?', '予約した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 5, 'user', 'Yes, I''ll {reserve} the room tonight.', 'うん、今夜部屋を予約する。', 'reserve', (SELECT id FROM vocab_senses WHERE slug='reserve.v.book'), ARRAY['reserve','abroad','journey','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 6, 'npc', 'Smart. Packing light?', '賢い。荷物は軽め？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 7, 'user', 'I hate heavy {luggage}, so just a carry-on.', '重い荷物は嫌だから、機内持ち込みだけ。', 'luggage', (SELECT id FROM vocab_senses WHERE slug='luggage.n.bags'), ARRAY['luggage','journey','destination','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 8, 'npc', 'Good idea. Travel safe.', 'いいね。気をつけて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 9, 'user', 'I bought travel {insurance} just in case.', '念のため旅行保険に入った。', 'insurance', (SELECT id FROM vocab_senses WHERE slug='insurance.n.cover'), ARRAY['insurance','journey','luggage','destination']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 10, 'npc', 'Very sensible. Long flight?', 'しっかりしてる。フライトは長い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 11, 'user', 'The whole {journey} is about six hours.', '移動は全部で6時間くらい。', 'journey', (SELECT id FROM vocab_senses WHERE slug='journey.n.trip'), ARRAY['journey','destination','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 12, 'npc', 'Not bad at all.', '悪くないね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 13, 'user', 'I can''t wait!', '楽しみ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 14, 'npc', 'Send photos, {{user_name}}!', '写真送ってね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 0, 'npc', 'How can I help plan your trip?', '旅行の計画、お手伝いしましょうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 1, 'user', 'I want to travel {abroad} for the first time.', '初めて海外に行きたいんです。', 'abroad', (SELECT id FROM vocab_senses WHERE slug='abroad.adv.overseas'), ARRAY['abroad','reserve','destination','journey']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 2, 'npc', 'Exciting! Any place in mind?', 'いいですね！行き先は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 3, 'user', 'My dream {destination} is Japan.', '憧れの目的地は日本です。', 'destination', (SELECT id FROM vocab_senses WHERE slug='destination.n.place'), ARRAY['destination','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 4, 'npc', 'Great choice. I''ll plan your days.', 'いい選択。日程を組みますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 5, 'user', 'Yes, please make a full {itinerary}.', 'はい、詳しい旅程を作ってください。', 'itinerary', (SELECT id FROM vocab_senses WHERE slug='itinerary.n.plan'), ARRAY['itinerary','luggage','insurance','journey']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 6, 'npc', 'Where would you like to sleep?', '宿泊はどうしますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 7, 'user', 'Mid-range {accommodation}, clean and central.', '中級の宿で、清潔で中心地がいいです。', 'accommodation', (SELECT id FROM vocab_senses WHERE slug='accommodation.n.lodging'), ARRAY['accommodation','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 8, 'npc', 'I can book that today.', '本日予約できます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 9, 'user', 'Please {reserve} the hotels for me.', 'ホテルの予約をお願いします。', 'reserve', (SELECT id FROM vocab_senses WHERE slug='reserve.v.book'), ARRAY['reserve','abroad','journey','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 10, 'npc', 'Done. Do you have cover?', '完了です。保険は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 11, 'user', 'Not yet. Add travel {insurance} too.', 'まだです。旅行保険も付けてください。', 'insurance', (SELECT id FROM vocab_senses WHERE slug='insurance.n.cover'), ARRAY['insurance','journey','luggage','destination']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 12, 'npc', 'All set. Have a wonderful trip.', '準備完了。よい旅を。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 13, 'user', 'Thank you so much!', '本当にありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 14, 'npc', 'Safe travels!', '気をつけて！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 0, 'npc', 'You''re going to the Berlin conference?', 'ベルリンの会議に行くの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 1, 'user', 'Yes, my first work trip {abroad}.', 'うん、初めての海外出張。', 'abroad', (SELECT id FROM vocab_senses WHERE slug='abroad.adv.overseas'), ARRAY['abroad','reserve','destination','journey']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 2, 'npc', 'Do you have a plan?', '予定はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 3, 'user', 'HR sent me the full {itinerary}.', '人事が詳しい旅程を送ってくれた。', 'itinerary', (SELECT id FROM vocab_senses WHERE slug='itinerary.n.plan'), ARRAY['itinerary','luggage','insurance','journey']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 4, 'npc', 'Where are you staying?', 'どこに泊まる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 5, 'user', 'The company booked {accommodation} near the venue.', '会社が会場近くの宿を予約してくれた。', 'accommodation', (SELECT id FROM vocab_senses WHERE slug='accommodation.n.lodging'), ARRAY['accommodation','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 6, 'npc', 'Did they confirm it?', '確定してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 7, 'user', 'Yes, they {reserve}d two nights.', 'うん、2泊予約済み。', 'reserve', (SELECT id FROM vocab_senses WHERE slug='reserve.v.book'), ARRAY['reserve','abroad','journey','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 8, 'npc', 'Traveling light?', '荷物は軽め？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 9, 'user', 'Just one bag of {luggage} for three days.', '3日で荷物はバッグ一つ。', 'luggage', (SELECT id FROM vocab_senses WHERE slug='luggage.n.bags'), ARRAY['luggage','journey','destination','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 10, 'npc', 'How long''s the flight?', 'フライトは何時間？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 11, 'user', 'The {journey} is under two hours.', '移動は2時間未満。', 'journey', (SELECT id FROM vocab_senses WHERE slug='journey.n.trip'), ARRAY['journey','destination','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 12, 'npc', 'Easy trip. Good luck!', '楽な出張だね。頑張って！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 13, 'user', 'Thanks, I''ll represent us well.', 'ありがとう、しっかり務めるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 14, 'npc', 'I know you will, {{user_name}}.', '君ならね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-23.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-23 - On the move  (Unit 8)
-- Words: set off, get around, drop off, pick up, hurry up, take off, get on, hold up.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('on-the-move', 'On the move', '移動する', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('set off', 'set off', '/ˌset ˈɔːf/', '/ˌset ˈɒf/', NULL, 4, FALSE, NULL),
  ('get around', 'get around', '/ˌɡet əˈraʊnd/', '/ˌɡet əˈraʊnd/', NULL, 4, FALSE, NULL),
  ('drop off', 'drop off', '/ˌdrɑːp ˈɔːf/', '/ˌdrɒp ˈɒf/', NULL, 3, FALSE, NULL),
  ('pick up', 'pick up', '/ˌpɪk ˈʌp/', '/ˌpɪk ˈʌp/', NULL, 3, FALSE, NULL),
  ('hurry up', 'hurry up', '/ˌhɜːri ˈʌp/', '/ˌhʌri ˈʌp/', NULL, 3, FALSE, NULL),
  ('take off', 'take off', '/ˌteɪk ˈɔːf/', '/ˌteɪk ˈɒf/', NULL, 3, FALSE, NULL),
  ('get on', 'get on', '/ˌɡet ˈɑːn/', '/ˌɡet ˈɒn/', NULL, 3, FALSE, NULL),
  ('hold up', 'hold up', '/ˌhoʊld ˈʌp/', '/ˌhəʊld ˈʌp/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='set off'), 'set-off.phrv.depart', 1, TRUE, 'phrasal verb', '出発する', 'to start a journey', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get around'), 'get-around.phrv.travel', 1, TRUE, 'phrasal verb', '（あちこち）移動する', 'to travel from place to place in an area', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='drop off'), 'drop-off.phrv.deliver', 1, TRUE, 'phrasal verb', '（人・物を）送り届ける', 'to take someone or something to a place and leave it', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pick up'), 'pick-up.phrv.collect', 1, TRUE, 'phrasal verb', '迎えに行く', 'to collect someone or something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hurry up'), 'hurry-up.phrv.hasten', 1, TRUE, 'phrasal verb', '急ぐ', 'to do something more quickly', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take off'), 'take-off.phrv.depart', 1, TRUE, 'phrasal verb', '離陸する', 'to leave the ground and begin to fly', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get on'), 'get-on.phrv.board', 1, TRUE, 'phrasal verb', '（乗り物に）乗る', 'to enter a bus, train, or plane', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hold up'), 'hold-up.phrv.delay', 1, TRUE, 'phrasal verb', '遅らせる', 'to make someone or something late', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('set off', 'get around', 'drop off', 'pick up', 'hurry up', 'take off', 'get on', 'hold up')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='on-the-move'
WHERE s.slug IN ('set-off.phrv.depart', 'get-around.phrv.travel', 'drop-off.phrv.deliver', 'pick-up.phrv.collect', 'hurry-up.phrv.hasten', 'take-off.phrv.depart', 'get-on.phrv.board', 'hold-up.phrv.delay')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-23', 8, 1, (SELECT id FROM vocab_categories WHERE slug='on-the-move'), 'On the move', '移動する', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-23'), s.id, x.ord FROM (VALUES
  ('set-off.phrv.depart',0),('get-around.phrv.travel',1),('drop-off.phrv.deliver',2),('pick-up.phrv.collect',3),('hurry-up.phrv.hasten',4),('take-off.phrv.depart',5),('get-on.phrv.board',6),('hold-up.phrv.delay',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-23'), 'conversation', 0, 'Planning a day out', 'お出かけの計画', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-23'), 'travel', 1, 'At the airport', '空港で', 'airport', 'companion'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-23'), 'business', 2, 'A tight schedule', 'タイトな日程', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 0, 'npc', 'What time should we leave tomorrow?', '明日は何時に出る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 1, 'user', 'Let''s {set off} early, around seven.', '早めに、7時ごろ出発しよう。', 'set off', (SELECT id FROM vocab_senses WHERE slug='set-off.phrv.depart'), ARRAY['set off','get around','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 2, 'npc', 'How will we travel there?', 'どうやって行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 3, 'user', 'We can {get around} the city by bike.', '街は自転車で移動できるよ。', 'get around', (SELECT id FROM vocab_senses WHERE slug='get-around.phrv.travel'), ARRAY['get around','set off','drop off','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 4, 'npc', 'Do you need a ride to mine?', 'うちまで送ろうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 5, 'user', 'Yes, could you {pick up} me at the station?', 'うん、駅で拾ってくれる？', 'pick up', (SELECT id FROM vocab_senses WHERE slug='pick-up.phrv.collect'), ARRAY['pick up','drop off','hurry up','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 6, 'npc', 'Sure. And after?', 'いいよ。そのあとは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 7, 'user', 'You can {drop off} me at home later.', 'あとで家に送ってくれればいい。', 'drop off', (SELECT id FROM vocab_senses WHERE slug='drop-off.phrv.deliver'), ARRAY['drop off','pick up','set off','get around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 8, 'npc', 'Great. Don''t be late!', 'いいね。遅れないでね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 9, 'user', 'I''ll {hurry up} in the morning, promise.', '朝は急ぐよ、約束する。', 'hurry up', (SELECT id FROM vocab_senses WHERE slug='hurry-up.phrv.hasten'), ARRAY['hurry up','hold up','set off','get around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 10, 'npc', 'Traffic can be bad.', '渋滞するかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 11, 'user', 'True, roadworks might {hold up} the buses.', '確かに、工事でバスが遅れるかも。', 'hold up', (SELECT id FROM vocab_senses WHERE slug='hold-up.phrv.delay'), ARRAY['hold up','hurry up','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 12, 'npc', 'Bikes it is, then.', 'じゃあ自転車で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 13, 'user', 'Perfect plan!', '完璧な計画！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='conversation'), 14, 'npc', 'See you at seven, {{user_name}}.', '7時にね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 0, 'npc', 'Our gate just opened.', 'ゲートが開いたよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 1, 'user', 'Great, let''s {get on} the plane early.', 'いいね、早めに飛行機に乗ろう。', 'get on', (SELECT id FROM vocab_senses WHERE slug='get-on.phrv.board'), ARRAY['get on','take off','set off','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 2, 'npc', 'What time do we leave?', '出発は何時？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 3, 'user', 'We {take off} at ten sharp.', '10時ちょうどに離陸する。', 'take off', (SELECT id FROM vocab_senses WHERE slug='take-off.phrv.depart'), ARRAY['take off','get on','pick up','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 4, 'npc', 'We''re a little slow.', 'ちょっと遅れ気味。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 5, 'user', 'Let''s {hurry up}, boarding ends soon.', '急ごう、搭乗がもうすぐ締め切り。', 'hurry up', (SELECT id FROM vocab_senses WHERE slug='hurry-up.phrv.hasten'), ARRAY['hurry up','hold up','set off','get on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 6, 'npc', 'Did we leave the hotel on time?', 'ホテルは時間通りに出た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 7, 'user', 'Yes, we {set off} with plenty of time.', 'うん、余裕を持って出発した。', 'set off', (SELECT id FROM vocab_senses WHERE slug='set-off.phrv.depart'), ARRAY['set off','get on','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 8, 'npc', 'Good, no stress.', 'よかった、焦らずに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 9, 'user', 'The security line did {hold up} us a bit.', '保安検査で少し足止めされたけどね。', 'hold up', (SELECT id FROM vocab_senses WHERE slug='hold-up.phrv.delay'), ARRAY['hold up','hurry up','get on','take off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 10, 'npc', 'Who''s meeting us on arrival?', '着いたら誰が迎えに来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 11, 'user', 'My cousin will {pick up} us at the airport.', 'いとこが空港で迎えに来てくれる。', 'pick up', (SELECT id FROM vocab_senses WHERE slug='pick-up.phrv.collect'), ARRAY['pick up','drop off','get on','take off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 12, 'npc', 'Perfect. Let''s board.', '完璧。乗ろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 13, 'user', 'After you!', 'お先にどうぞ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='travel'), 14, 'npc', 'Here we go!', '行こう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 0, 'npc', 'The client meeting is across town at two.', 'クライアント会議は2時に街の反対側。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 1, 'user', 'We should {set off} by noon to be safe.', '安全のため正午には出発すべき。', 'set off', (SELECT id FROM vocab_senses WHERE slug='set-off.phrv.depart'), ARRAY['set off','get on','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 2, 'npc', 'How do we get there?', 'どうやって行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 3, 'user', 'It''s easiest to {get around} by taxi today.', '今日はタクシーで移動するのが楽。', 'get around', (SELECT id FROM vocab_senses WHERE slug='get-around.phrv.travel'), ARRAY['get around','set off','drop off','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 4, 'npc', 'Traffic might be heavy.', '渋滞するかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 5, 'user', 'Yeah, an accident could {hold up} us.', 'うん、事故で足止めされるかも。', 'hold up', (SELECT id FROM vocab_senses WHERE slug='hold-up.phrv.delay'), ARRAY['hold up','hurry up','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 6, 'npc', 'Let''s leave earlier then.', 'じゃあ早めに出よう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 7, 'user', 'Agreed. I''ll {hurry up} and finish this email.', '賛成。急いでこのメールを片付ける。', 'hurry up', (SELECT id FROM vocab_senses WHERE slug='hurry-up.phrv.hasten'), ARRAY['hurry up','hold up','set off','get around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 8, 'npc', 'Should we grab the samples?', 'サンプルも持っていく？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 9, 'user', 'Yes, and {drop off} them at reception first.', 'うん、先に受付に届けよう。', 'drop off', (SELECT id FROM vocab_senses WHERE slug='drop-off.phrv.deliver'), ARRAY['drop off','pick up','set off','get around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 10, 'npc', 'Our flight home is tonight, right?', '帰りの便は今夜だよね？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 11, 'user', 'Yes, we {take off} at nine, so no delays.', 'うん、9時に離陸だから遅れは禁物。', 'take off', (SELECT id FROM vocab_senses WHERE slug='take-off.phrv.depart'), ARRAY['take off','get on','pick up','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 12, 'npc', 'Busy day ahead.', '忙しい一日だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 13, 'user', 'Let''s do this.', 'やろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-23') AND goal='business'), 14, 'npc', 'Right behind you, {{user_name}}.', 'すぐ後ろにいるよ、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-24.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-24 - Problems abroad  (Unit 8)
-- Words: currency, exchange, customs, visa, jetlag, crowded, stranded, departure.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('problems-abroad', 'Problems abroad', '海外でのトラブル', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('currency', 'currency', '/ˈkɜːrənsi/', '/ˈkʌrənsi/', NULL, 4, FALSE, NULL),
  ('exchange', 'exchange', '/ɪksˈtʃeɪndʒ/', '/ɪksˈtʃeɪndʒ/', NULL, 3, FALSE, NULL),
  ('customs', 'customs', '/ˈkʌstəmz/', '/ˈkʌstəmz/', NULL, 4, FALSE, NULL),
  ('visa', 'visa', '/ˈviːzə/', '/ˈviːzə/', NULL, 3, FALSE, NULL),
  ('jetlag', 'jetlag', '/ˈdʒetlæɡ/', '/ˈdʒetlæɡ/', NULL, 4, FALSE, NULL),
  ('crowded', 'crowded', '/ˈkraʊdɪd/', '/ˈkraʊdɪd/', NULL, 3, FALSE, NULL),
  ('stranded', 'stranded', '/ˈstrændɪd/', '/ˈstrændɪd/', NULL, 4, FALSE, NULL),
  ('departure', 'departure', '/dɪˈpɑːrtʃər/', '/dɪˈpɑːtʃə/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='currency'), 'currency.n.money', 1, TRUE, 'noun', '通貨', 'the money used in a particular country', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='exchange'), 'exchange.v.swap', 1, TRUE, 'verb', '両替する', 'to change money of one country for another', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='customs'), 'customs.n.border', 1, TRUE, 'noun', '税関', 'the place where officials check what you bring into a country', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='visa'), 'visa.n.permit', 1, TRUE, 'noun', 'ビザ', 'an official mark allowing you to enter a country', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='jetlag'), 'jetlag.n.tiredness', 1, TRUE, 'noun', '時差ぼけ', 'tiredness after a long flight across time zones', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='crowded'), 'crowded.adj.busy', 1, TRUE, 'adjective', '混雑した', 'full of people', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stranded'), 'stranded.adj.stuck', 1, TRUE, 'adjective', '立ち往生した', 'stuck somewhere and unable to leave', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='departure'), 'departure.n.leaving', 1, TRUE, 'noun', '出発', 'the act of leaving on a trip', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('currency', 'exchange', 'customs', 'visa', 'jetlag', 'crowded', 'stranded', 'departure')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='problems-abroad'
WHERE s.slug IN ('currency.n.money', 'exchange.v.swap', 'customs.n.border', 'visa.n.permit', 'jetlag.n.tiredness', 'crowded.adj.busy', 'stranded.adj.stuck', 'departure.n.leaving')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-24', 8, 2, (SELECT id FROM vocab_categories WHERE slug='problems-abroad'), 'Problems abroad', '海外でのトラブル', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-24'), s.id, x.ord FROM (VALUES
  ('currency.n.money',0),('exchange.v.swap',1),('customs.n.border',2),('visa.n.permit',3),('jetlag.n.tiredness',4),('crowded.adj.busy',5),('stranded.adj.stuck',6),('departure.n.leaving',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-24'), 'conversation', 0, 'Back from a trip', '旅行から帰って', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-24'), 'travel', 1, 'At departures', '出発ロビーで', 'airport', 'official'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-24'), 'business', 2, 'A travel mishap', '出張のトラブル', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 0, 'npc', 'Welcome back! How was the trip?', 'おかえり！旅行どうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 1, 'user', 'Amazing, but the {jetlag} is killing me.', '最高、でも時差ぼけがつらい。', 'jetlag', (SELECT id FROM vocab_senses WHERE slug='jetlag.n.tiredness'), ARRAY['jetlag','currency','customs','visa']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 2, 'npc', 'Ha, get some sleep. Smooth flights?', 'はは、寝なよ。フライトは順調？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 3, 'user', 'Not quite. We got {stranded} overnight by a storm.', 'そうでもない。嵐で一晩足止めされた。', 'stranded', (SELECT id FROM vocab_senses WHERE slug='stranded.adj.stuck'), ARRAY['stranded','crowded','jetlag','customs']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 4, 'npc', 'Oh no! Crowded airport?', 'うわ！空港は混んでた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 5, 'user', 'So {crowded}; people slept on the floor.', 'すごく混んでて、床で寝る人もいた。', 'crowded', (SELECT id FROM vocab_senses WHERE slug='crowded.adj.busy'), ARRAY['crowded','stranded','jetlag','customs']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 6, 'npc', 'Rough. Money go okay?', '大変。お金は大丈夫だった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 7, 'user', 'Yeah, though their {currency} was confusing.', 'うん、でも現地の通貨がややこしかった。', 'currency', (SELECT id FROM vocab_senses WHERE slug='currency.n.money'), ARRAY['currency','customs','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 8, 'npc', 'Did you change cash there?', '現地で両替した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 9, 'user', 'I had to {exchange} money at the airport.', '空港でお金を両替しなきゃいけなかった。', 'exchange', (SELECT id FROM vocab_senses WHERE slug='exchange.v.swap'), ARRAY['exchange','jetlag','crowded','stranded']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 10, 'npc', 'Any trouble at the border?', '国境で問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 11, 'user', 'No, {customs} was quick this time.', 'ううん、今回は税関が早かった。', 'customs', (SELECT id FROM vocab_senses WHERE slug='customs.n.border'), ARRAY['customs','currency','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 12, 'npc', 'Glad you''re home safe.', '無事に帰れてよかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 13, 'user', 'Me too, honestly.', '本当にね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 14, 'npc', 'Rest up, {{user_name}}.', 'ゆっくり休んで、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 0, 'npc', 'Passport and papers, please.', 'パスポートと書類をお願いします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 1, 'user', 'Here. My {visa} is valid for thirty days.', 'どうぞ。ビザは30日間有効です。', 'visa', (SELECT id FROM vocab_senses WHERE slug='visa.n.permit'), ARRAY['visa','currency','jetlag','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 2, 'npc', 'Thank you. Anything to declare?', 'ありがとう。申告するものは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 3, 'user', 'No, I already passed through {customs}.', 'いいえ、もう税関を通りました。', 'customs', (SELECT id FROM vocab_senses WHERE slug='customs.n.border'), ARRAY['customs','currency','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 4, 'npc', 'Good. Your flight is on time.', '結構です。便は定刻です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 5, 'user', 'Great, which gate is my {departure}?', 'よかった、出発はどのゲートですか？', 'departure', (SELECT id FROM vocab_senses WHERE slug='departure.n.leaving'), ARRAY['departure','currency','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 6, 'npc', 'Gate twelve, quite busy today.', '12番ゲート、今日は結構混んでます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 7, 'user', 'I noticed; it''s really {crowded}.', '気づきました、本当に混んでますね。', 'crowded', (SELECT id FROM vocab_senses WHERE slug='crowded.adj.busy'), ARRAY['crowded','stranded','jetlag','visa']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 8, 'npc', 'Do you need local money?', '現地のお金は必要ですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 9, 'user', 'Yes, where can I get some {currency}?', 'はい、通貨はどこで手に入りますか？', 'currency', (SELECT id FROM vocab_senses WHERE slug='currency.n.money'), ARRAY['currency','customs','visa','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 10, 'npc', 'There''s a counter past security.', '保安検査の先にカウンターがあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 11, 'user', 'Perfect, I''ll {exchange} some there.', '完璧、そこで両替します。', 'exchange', (SELECT id FROM vocab_senses WHERE slug='exchange.v.swap'), ARRAY['exchange','jetlag','crowded','stranded']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 12, 'npc', 'Safe travels!', 'よい旅を！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 13, 'user', 'Thank you!', 'ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 14, 'npc', 'Enjoy your trip!', '旅行を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 0, 'npc', 'How did the overseas trip go?', '海外出張はどうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 1, 'user', 'Rough. I got {stranded} when my flight was canceled.', '大変。便が欠航して立ち往生した。', 'stranded', (SELECT id FROM vocab_senses WHERE slug='stranded.adj.stuck'), ARRAY['stranded','crowded','jetlag','customs']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 2, 'npc', 'That''s awful. Big delay?', 'ひどいね。大幅な遅れ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 3, 'user', 'Yes, my {departure} was pushed to the next day.', 'うん、出発が翌日にずれ込んだ。', 'departure', (SELECT id FROM vocab_senses WHERE slug='departure.n.leaving'), ARRAY['departure','currency','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 4, 'npc', 'Was the airport chaos?', '空港は混乱してた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 5, 'user', 'Totally {crowded}; no hotel rooms left.', 'めちゃくちゃ混んでて、ホテルも満室。', 'crowded', (SELECT id FROM vocab_senses WHERE slug='crowded.adj.busy'), ARRAY['crowded','stranded','jetlag','customs']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 6, 'npc', 'Any issues entering the country?', '入国で問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 7, 'user', 'No, my business {visa} was fine.', 'いや、商用ビザは問題なかった。', 'visa', (SELECT id FROM vocab_senses WHERE slug='visa.n.permit'), ARRAY['visa','currency','jetlag','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 8, 'npc', 'And the border check?', '国境の検査は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 9, 'user', '{customs} took an hour with all the crowds.', '混雑で税関に1時間かかった。', 'customs', (SELECT id FROM vocab_senses WHERE slug='customs.n.border'), ARRAY['customs','currency','visa','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 10, 'npc', 'You must be exhausted.', '疲れきってるでしょ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 11, 'user', 'Terrible {jetlag}, but I made the meeting.', 'ひどい時差ぼけ、でも会議には間に合った。', 'jetlag', (SELECT id FROM vocab_senses WHERE slug='jetlag.n.tiredness'), ARRAY['jetlag','currency','customs','visa']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 12, 'npc', 'Well done for pushing through.', 'よく乗り切ったね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 13, 'user', 'Thanks, next time I''ll fly direct.', 'ありがとう、次は直行便にする。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 14, 'npc', 'Good idea, {{user_name}}.', 'いい考え、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-25.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-25 - Devices & online  (Unit 9)
-- Words: device, gadget, update, download, upload, wifi, charger, storage.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('devices-online', 'Devices & online', '機器とネット', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('device', 'device', '/dɪˈvaɪs/', '/dɪˈvaɪs/', NULL, 3, FALSE, NULL),
  ('gadget', 'gadget', '/ˈɡædʒɪt/', '/ˈɡædʒɪt/', NULL, 4, FALSE, NULL),
  ('update', 'update', '/ˈʌpdeɪt/', '/ˈʌpdeɪt/', NULL, 3, FALSE, NULL),
  ('download', 'download', '/ˈdaʊnloʊd/', '/ˈdaʊnləʊd/', NULL, 3, FALSE, NULL),
  ('upload', 'upload', '/ˈʌploʊd/', '/ˈʌpləʊd/', NULL, 3, FALSE, NULL),
  ('wifi', 'wifi', '/ˈwaɪfaɪ/', '/ˈwaɪfaɪ/', NULL, 3, FALSE, NULL),
  ('charger', 'charger', '/ˈtʃɑːrdʒər/', '/ˈtʃɑːdʒə/', NULL, 3, FALSE, NULL),
  ('storage', 'storage', '/ˈstɔːrɪdʒ/', '/ˈstɔːrɪdʒ/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='device'), 'device.n.machine', 1, TRUE, 'noun', '機器', 'a piece of electronic equipment made for a purpose', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gadget'), 'gadget.n.tool', 1, TRUE, 'noun', '小型電子機器', 'a small, clever electronic tool', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='update'), 'update.n.version', 1, TRUE, 'noun', 'アップデート', 'a newer version of software', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='download'), 'download.v.get', 1, TRUE, 'verb', 'ダウンロードする', 'to copy files from the internet to your device', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='upload'), 'upload.v.send', 1, TRUE, 'verb', 'アップロードする', 'to send files from your device to the internet', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wifi'), 'wifi.n.internet', 1, TRUE, 'noun', 'Wi-Fi', 'a wireless connection to the internet', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='charger'), 'charger.n.cable', 1, TRUE, 'noun', '充電器', 'a device used to add power to a battery', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='storage'), 'storage.n.space', 1, TRUE, 'noun', '保存容量', 'space to keep files on a device', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('device', 'gadget', 'update', 'download', 'upload', 'wifi', 'charger', 'storage')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='devices-online'
WHERE s.slug IN ('device.n.machine', 'gadget.n.tool', 'update.n.version', 'download.v.get', 'upload.v.send', 'wifi.n.internet', 'charger.n.cable', 'storage.n.space')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-25', 9, 0, (SELECT id FROM vocab_categories WHERE slug='devices-online'), 'Devices & online', '機器とインターネット', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-25'), s.id, x.ord FROM (VALUES
  ('device.n.machine',0),('gadget.n.tool',1),('update.n.version',2),('download.v.get',3),('upload.v.send',4),('wifi.n.internet',5),('charger.n.cable',6),('storage.n.space',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-25'), 'conversation', 0, 'A new phone', '新しいスマホ', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-25'), 'travel', 1, 'Staying connected abroad', '海外でつながる', 'hostel', 'worker'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-25'), 'business', 2, 'IT setup', 'ITの初期設定', 'office', 'IT staff');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 0, 'npc', 'Is that a new phone?', 'それ新しいスマホ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 1, 'user', 'Yeah, my old {device} finally died.', 'うん、前の端末がついに壊れた。', 'device', (SELECT id FROM vocab_senses WHERE slug='device.n.machine'), ARRAY['device','gadget','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 2, 'npc', 'Nice upgrade. Lots of features?', 'いい買い替え。機能は多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 3, 'user', 'It''s a clever little {gadget}, does everything.', '賢い小型機器で、何でもできる。', 'gadget', (SELECT id FROM vocab_senses WHERE slug='gadget.n.tool'), ARRAY['gadget','wifi','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 4, 'npc', 'Enough space for photos?', '写真の容量は足りる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 5, 'user', 'Tons of {storage}, way more than before.', '保存容量がたっぷりで、前よりずっと多い。', 'storage', (SELECT id FROM vocab_senses WHERE slug='storage.n.space'), ARRAY['storage','wifi','charger','update']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 6, 'npc', 'Battery good?', 'バッテリーはいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 7, 'user', 'Great, and it came with a fast {charger}.', 'いいよ、急速充電器も付いてた。', 'charger', (SELECT id FROM vocab_senses WHERE slug='charger.n.cable'), ARRAY['charger','wifi','storage','update']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 8, 'npc', 'Did you connect it to the internet?', 'ネットにつないだ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 9, 'user', 'Yes, the {wifi} set up automatically.', 'うん、Wi-Fiが自動でつながった。', 'wifi', (SELECT id FROM vocab_senses WHERE slug='wifi.n.internet'), ARRAY['wifi','storage','charger','update']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 10, 'npc', 'Software all current?', 'ソフトは最新？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 11, 'user', 'I installed the latest {update} last night.', '昨夜、最新のアップデートを入れた。', 'update', (SELECT id FROM vocab_senses WHERE slug='update.n.version'), ARRAY['update','wifi','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 12, 'npc', 'You''re all set!', '準備万端だね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 13, 'user', 'Loving it so far.', '今のところ気に入ってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='conversation'), 14, 'npc', 'Show me later, {{user_name}}.', 'あとで見せて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 0, 'npc', 'Need the wifi password?', 'Wi-Fiのパスワード要る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 1, 'user', 'Yes please, is the {wifi} fast here?', 'はい、ここのWi-Fiは速い？', 'wifi', (SELECT id FROM vocab_senses WHERE slug='wifi.n.internet'), ARRAY['wifi','storage','charger','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 2, 'npc', 'Fast enough for video.', '動画には十分速いよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 3, 'user', 'Great, I want to {download} some maps offline.', 'いいね、オフライン用に地図をダウンロードしたい。', 'download', (SELECT id FROM vocab_senses WHERE slug='download.v.get'), ARRAY['download','upload','wifi','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 4, 'npc', 'Good idea for hiking.', 'ハイキングにいいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 5, 'user', 'And {upload} my photos to the cloud.', 'それと写真をクラウドにアップロードする。', 'upload', (SELECT id FROM vocab_senses WHERE slug='upload.v.send'), ARRAY['upload','download','wifi','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 6, 'npc', 'The cloud saves space.', 'クラウドは容量の節約になるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 7, 'user', 'True, my phone {storage} is almost full.', '確かに、スマホの容量がもう一杯。', 'storage', (SELECT id FROM vocab_senses WHERE slug='storage.n.space'), ARRAY['storage','wifi','charger','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 8, 'npc', 'Do you have a charger?', '充電器は持ってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 9, 'user', 'I forgot my {charger}! Can I buy one?', '充電器を忘れた！どこかで買える？', 'charger', (SELECT id FROM vocab_senses WHERE slug='charger.n.cable'), ARRAY['charger','wifi','storage','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 10, 'npc', 'The shop next door sells them.', '隣の店で売ってるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 11, 'user', 'Perfect. This {device} dies so fast.', '助かる。この端末、電池の減りが速くて。', 'device', (SELECT id FROM vocab_senses WHERE slug='device.n.machine'), ARRAY['device','wifi','storage','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 12, 'npc', 'Batteries, right?', 'バッテリーね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 13, 'user', 'Always the battery.', 'いつもバッテリー。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='travel'), 14, 'npc', 'Enjoy your stay!', '滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 0, 'npc', 'Let''s get your work laptop ready.', '仕事用ノートPCを準備しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 1, 'user', 'Thanks. Is this {device} already registered?', 'ありがとう。この端末はもう登録済み？', 'device', (SELECT id FROM vocab_senses WHERE slug='device.n.machine'), ARRAY['device','gadget','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 2, 'npc', 'Yes. First, run the software.', 'うん。まずソフトを起動して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 3, 'user', 'Should I install the security {update} now?', 'セキュリティのアップデートを今入れる？', 'update', (SELECT id FROM vocab_senses WHERE slug='update.n.version'), ARRAY['update','wifi','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 4, 'npc', 'Please do. Then the apps.', 'お願い。次にアプリを。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 5, 'user', 'I''ll {download} the team tools.', 'チームのツールをダウンロードするよ。', 'download', (SELECT id FROM vocab_senses WHERE slug='download.v.get'), ARRAY['download','upload','wifi','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 6, 'npc', 'Save files to the server, not local.', 'ファイルはローカルじゃなくサーバーに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 7, 'user', 'Got it, I''ll {upload} everything to the shared drive.', '了解、全部共有ドライブにアップロードする。', 'upload', (SELECT id FROM vocab_senses WHERE slug='upload.v.send'), ARRAY['upload','download','wifi','charger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 8, 'npc', 'That keeps your disk free.', 'ディスクが空くね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 9, 'user', 'Good, local {storage} fills up fast.', 'うん、ローカル容量はすぐ一杯になる。', 'storage', (SELECT id FROM vocab_senses WHERE slug='storage.n.space'), ARRAY['storage','wifi','charger','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 10, 'npc', 'Connect to the office network too.', '社内ネットワークにもつないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 11, 'user', 'Done, I''m on the company {wifi}.', '完了、会社のWi-Fiにつながった。', 'wifi', (SELECT id FROM vocab_senses WHERE slug='wifi.n.internet'), ARRAY['wifi','storage','charger','device']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 12, 'npc', 'You''re ready to go.', 'これで準備完了。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 13, 'user', 'Thanks for the help.', '手伝ってくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-25') AND goal='business'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-26.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-26 - Using tech  (Unit 9)
-- Words: log in, log out, set up, back up, switch on, switch off, scroll, zoom in.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('using-tech', 'Using tech', '機器の操作', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('log in', 'log in', '/ˌlɔːɡ ˈɪn/', '/ˌlɒɡ ˈɪn/', NULL, 3, FALSE, NULL),
  ('log out', 'log out', '/ˌlɔːɡ ˈaʊt/', '/ˌlɒɡ ˈaʊt/', NULL, 3, FALSE, NULL),
  ('set up', 'set up', '/ˌset ˈʌp/', '/ˌset ˈʌp/', NULL, 3, FALSE, NULL),
  ('back up', 'back up', '/ˌbæk ˈʌp/', '/ˌbæk ˈʌp/', NULL, 4, FALSE, NULL),
  ('switch on', 'switch on', '/ˌswɪtʃ ˈɑːn/', '/ˌswɪtʃ ˈɒn/', NULL, 3, FALSE, NULL),
  ('switch off', 'switch off', '/ˌswɪtʃ ˈɔːf/', '/ˌswɪtʃ ˈɒf/', NULL, 3, FALSE, NULL),
  ('scroll', 'scroll', '/skroʊl/', '/skrəʊl/', NULL, 3, FALSE, NULL),
  ('zoom in', 'zoom in', '/ˌzuːm ˈɪn/', '/ˌzuːm ˈɪn/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='log in'), 'log-in.phrv.access', 1, TRUE, 'phrasal verb', 'ログインする', 'to enter a username and password to access an account', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='log out'), 'log-out.phrv.exit', 1, TRUE, 'phrasal verb', 'ログアウトする', 'to end your session in an account', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='set up'), 'set-up.phrv.configure', 1, TRUE, 'phrasal verb', '設定する', 'to prepare something so it is ready to use', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='back up'), 'back-up.phrv.copy', 1, TRUE, 'phrasal verb', 'バックアップする', 'to make a copy of files in case you lose them', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='switch on'), 'switch-on.phrv.start', 1, TRUE, 'phrasal verb', '電源を入れる', 'to make a machine start by pressing a button', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='switch off'), 'switch-off.phrv.stop', 1, TRUE, 'phrasal verb', '電源を切る', 'to make a machine stop by pressing a button', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='scroll'), 'scroll.v.move', 1, TRUE, 'verb', 'スクロールする', 'to move text or images up or down on a screen', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='zoom in'), 'zoom-in.phrv.enlarge', 1, TRUE, 'phrasal verb', '拡大する', 'to make something on a screen look bigger', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('log in', 'log out', 'set up', 'back up', 'switch on', 'switch off', 'scroll', 'zoom in')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='using-tech'
WHERE s.slug IN ('log-in.phrv.access', 'log-out.phrv.exit', 'set-up.phrv.configure', 'back-up.phrv.copy', 'switch-on.phrv.start', 'switch-off.phrv.stop', 'scroll.v.move', 'zoom-in.phrv.enlarge')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-26', 9, 1, (SELECT id FROM vocab_categories WHERE slug='using-tech'), 'Using tech', '機器の使い方', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-26'), s.id, x.ord FROM (VALUES
  ('log-in.phrv.access',0),('log-out.phrv.exit',1),('set-up.phrv.configure',2),('back-up.phrv.copy',3),('switch-on.phrv.start',4),('switch-off.phrv.stop',5),('scroll.v.move',6),('zoom-in.phrv.enlarge',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-26'), 'conversation', 0, 'Setting up a laptop', 'ノートPCの設定', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-26'), 'travel', 1, 'A shared computer', '共用パソコン', 'hostel', 'worker'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-26'), 'business', 2, 'Onboarding an app', 'アプリの導入', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 0, 'npc', 'I got a laptop but I''m lost.', 'ノートPC買ったけど、さっぱり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 1, 'user', 'Let''s start. {switch on} the power button.', '始めよう。電源ボタンを入れて。', 'switch on', (SELECT id FROM vocab_senses WHERE slug='switch-on.phrv.start'), ARRAY['switch on','switch off','log in','log out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 2, 'npc', 'Okay, it''s booting.', 'うん、起動してる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 3, 'user', 'Now we {set up} your account.', '次にアカウントを設定するよ。', 'set up', (SELECT id FROM vocab_senses WHERE slug='set-up.phrv.configure'), ARRAY['set up','back up','log out','zoom in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 4, 'npc', 'It''s asking for a password.', 'パスワードを聞かれてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 5, 'user', 'Type it to {log in} for the first time.', '入力して初めてログインして。', 'log in', (SELECT id FROM vocab_senses WHERE slug='log-in.phrv.access'), ARRAY['log in','log out','switch off','back up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 6, 'npc', 'I''m in! What next?', '入れた！次は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 7, 'user', 'Let''s {back up} your files to the cloud.', 'ファイルをクラウドにバックアップしよう。', 'back up', (SELECT id FROM vocab_senses WHERE slug='back-up.phrv.copy'), ARRAY['back up','log out','switch off','zoom in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 8, 'npc', 'The text is a bit small.', '文字が少し小さい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 9, 'user', 'You can {zoom in} to make it bigger.', '拡大すれば大きくできるよ。', 'zoom in', (SELECT id FROM vocab_senses WHERE slug='zoom-in.phrv.enlarge'), ARRAY['zoom in','log out','switch off','back up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 10, 'npc', 'Better! How do I finish safely?', '見やすい！安全に終わるには？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 11, 'user', 'Always {log out} when you''re done.', '終わったら必ずログアウトして。', 'log out', (SELECT id FROM vocab_senses WHERE slug='log-out.phrv.exit'), ARRAY['log out','log in','switch on','zoom in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 12, 'npc', 'Got it. Thanks so much!', '了解。本当にありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 13, 'user', 'You''ll be a pro soon.', 'すぐ慣れるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='conversation'), 14, 'npc', 'Thanks to you, {{user_name}}.', '君のおかげ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 0, 'npc', 'You can use this shared computer.', 'この共用パソコンを使っていいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 1, 'user', 'Thanks. Do I need to {switch on} the screen?', 'ありがとう。画面はつける必要ある？', 'switch on', (SELECT id FROM vocab_senses WHERE slug='switch-on.phrv.start'), ARRAY['switch on','switch off','log in','log out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 2, 'npc', 'It''s on. Use the guest account.', 'ついてるよ。ゲスト用アカウントを使って。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 3, 'user', 'How do I {log in} as a guest?', 'ゲストでログインするには？', 'log in', (SELECT id FROM vocab_senses WHERE slug='log-in.phrv.access'), ARRAY['log in','log out','back up','zoom in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 4, 'npc', 'No password, just click enter.', 'パスワードなし、エンターを押すだけ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 5, 'user', 'The font is tiny; can I {zoom in}?', '文字が小さい、拡大していい？', 'zoom in', (SELECT id FROM vocab_senses WHERE slug='zoom-in.phrv.enlarge'), ARRAY['zoom in','log out','switch off','back up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 6, 'npc', 'Sure, use the plus key.', 'どうぞ、プラスキーで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 7, 'user', 'Can I {set up} my email quickly?', 'メールをちょっと設定していい？', 'set up', (SELECT id FROM vocab_senses WHERE slug='set-up.phrv.configure'), ARRAY['set up','log out','switch off','back up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 8, 'npc', 'Of course, but don''t save passwords.', 'もちろん、でもパスワードは保存しないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 9, 'user', 'Right, I''ll {log out} after.', '了解、あとでログアウトする。', 'log out', (SELECT id FROM vocab_senses WHERE slug='log-out.phrv.exit'), ARRAY['log out','log in','switch on','zoom in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 10, 'npc', 'And when you finish for the night?', '夜、終わったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 11, 'user', 'I''ll {switch off} the computer completely.', 'パソコンを完全に切るよ。', 'switch off', (SELECT id FROM vocab_senses WHERE slug='switch-off.phrv.stop'), ARRAY['switch off','switch on','log in','zoom in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 12, 'npc', 'Perfect. Thank you.', '完璧。ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 13, 'user', 'No problem at all.', '全然平気。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='travel'), 14, 'npc', 'Enjoy!', '楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 0, 'npc', 'Have you tried the new company app?', '新しい社内アプリ使った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 1, 'user', 'Not yet, how do I {log in}?', 'まだ、どうやってログインする？', 'log in', (SELECT id FROM vocab_senses WHERE slug='log-in.phrv.access'), ARRAY['log in','log out','switch off','back up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 2, 'npc', 'Use your work email.', '仕事のメールでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 3, 'user', 'Okay, now I {set up} my profile.', '了解、プロフィールを設定するね。', 'set up', (SELECT id FROM vocab_senses WHERE slug='set-up.phrv.configure'), ARRAY['set up','back up','log out','scroll']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 4, 'npc', 'Add a photo too.', '写真も追加して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 5, 'user', 'Where? I''ll {scroll} down to find settings.', 'どこ？下にスクロールして設定を探す。', 'scroll', (SELECT id FROM vocab_senses WHERE slug='scroll.v.move'), ARRAY['scroll','log out','switch off','back up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 6, 'npc', 'There it is, under account.', 'あった、アカウントの下。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 7, 'user', 'Should I {back up} my contacts to it?', '連絡先をここにバックアップすべき？', 'back up', (SELECT id FROM vocab_senses WHERE slug='back-up.phrv.copy'), ARRAY['back up','log out','switch off','scroll']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 8, 'npc', 'Yes, it syncs automatically.', 'うん、自動で同期するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 9, 'user', 'Nice. I''ll {switch on} notifications.', 'いいね。通知をオンにする。', 'switch on', (SELECT id FROM vocab_senses WHERE slug='switch-on.phrv.start'), ARRAY['switch on','switch off','log in','scroll']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 10, 'npc', 'Maybe just for urgent ones.', '急ぎのだけにしたら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 11, 'user', 'Good point, I''ll {switch off} the noisy ones.', '確かに、うるさいのは切るよ。', 'switch off', (SELECT id FROM vocab_senses WHERE slug='switch-off.phrv.stop'), ARRAY['switch off','switch on','log in','scroll']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 12, 'npc', 'Now you''re set.', 'これで準備完了。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 13, 'user', 'This is handy.', 'これ便利だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-26') AND goal='business'), 14, 'npc', 'Glad it helps, {{user_name}}.', '役に立ってよかった、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-27.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-27 - Social media & news  (Unit 9)
-- Words: post, share, follow, comment, viral, headline, subscribe, notification.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('social-media-news', 'Social media & news', 'SNSとニュース', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('post', 'post', '/poʊst/', '/pəʊst/', NULL, 3, FALSE, NULL),
  ('share', 'share', '/ʃer/', '/ʃeə/', NULL, 3, FALSE, NULL),
  ('follow', 'follow', '/ˈfɑːloʊ/', '/ˈfɒləʊ/', NULL, 3, FALSE, NULL),
  ('comment', 'comment', '/ˈkɑːment/', '/ˈkɒment/', NULL, 3, FALSE, NULL),
  ('viral', 'viral', '/ˈvaɪrəl/', '/ˈvaɪrəl/', NULL, 4, FALSE, NULL),
  ('headline', 'headline', '/ˈhedlaɪn/', '/ˈhedlaɪn/', NULL, 4, FALSE, NULL),
  ('subscribe', 'subscribe', '/səbˈskraɪb/', '/səbˈskraɪb/', NULL, 4, FALSE, NULL),
  ('notification', 'notification', '/ˌnoʊtɪfɪˈkeɪʃn/', '/ˌnəʊtɪfɪˈkeɪʃn/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='post'), 'post.v.publish', 1, TRUE, 'verb', '投稿する', 'to put a message or picture online', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='share'), 'share.v.spread', 1, TRUE, 'verb', '共有する', 'to send something online for others to see', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='follow'), 'follow.v.subscribe', 1, TRUE, 'verb', 'フォローする', 'to sign up to see someone''s posts online', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='comment'), 'comment.n.remark', 1, TRUE, 'noun', 'コメント', 'a written reaction posted below content', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='viral'), 'viral.adj.spreading', 1, TRUE, 'adjective', 'バズった', 'shared very quickly by many people online', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='headline'), 'headline.n.title', 1, TRUE, 'noun', '見出し', 'the title of a news story', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='subscribe'), 'subscribe.v.join', 1, TRUE, 'verb', '登録する', 'to sign up to regularly receive content', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='notification'), 'notification.n.alert', 1, TRUE, 'noun', '通知', 'a message that tells you about new activity', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('post', 'share', 'follow', 'comment', 'viral', 'headline', 'subscribe', 'notification')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='social-media-news'
WHERE s.slug IN ('post.v.publish', 'share.v.spread', 'follow.v.subscribe', 'comment.n.remark', 'viral.adj.spreading', 'headline.n.title', 'subscribe.v.join', 'notification.n.alert')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-27', 9, 2, (SELECT id FROM vocab_categories WHERE slug='social-media-news'), 'Social media & news', 'SNSとニュース', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-27'), s.id, x.ord FROM (VALUES
  ('post.v.publish',0),('share.v.spread',1),('follow.v.subscribe',2),('comment.n.remark',3),('viral.adj.spreading',4),('headline.n.title',5),('subscribe.v.join',6),('notification.n.alert',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-27'), 'conversation', 0, 'Going viral', 'バズる', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-27'), 'travel', 1, 'Following travel content', '旅行の情報を追う', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-27'), 'business', 2, 'Company social media', '会社のSNS', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 0, 'npc', 'Your video is everywhere!', 'あなたの動画、どこでも見るよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 1, 'user', 'I know! I only made one {post} last night.', 'でしょ！昨夜1回投稿しただけなのに。', 'post', (SELECT id FROM vocab_senses WHERE slug='post.v.publish'), ARRAY['post','comment','headline','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 2, 'npc', 'And now?', 'それで今は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 3, 'user', 'It went totally {viral} by morning.', '朝には完全にバズってた。', 'viral', (SELECT id FROM vocab_senses WHERE slug='viral.adj.spreading'), ARRAY['viral','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 4, 'npc', 'How many views?', '再生回数は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 5, 'user', 'Thousands. People {share} it a lot.', '何千も。みんながよくシェアしてる。', 'share', (SELECT id FROM vocab_senses WHERE slug='share.v.spread'), ARRAY['share','follow','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 6, 'npc', 'Any nice reactions?', 'いい反応はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 7, 'user', 'So many. My favorite {comment} made me cry.', 'たくさん。お気に入りのコメントで泣いた。', 'comment', (SELECT id FROM vocab_senses WHERE slug='comment.n.remark'), ARRAY['comment','post','headline','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 8, 'npc', 'New fans too?', '新しいファンも？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 9, 'user', 'Yeah, hundreds started to {follow} me.', 'うん、何百人もフォローし始めた。', 'follow', (SELECT id FROM vocab_senses WHERE slug='follow.v.subscribe'), ARRAY['follow','share','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 10, 'npc', 'Your phone must be busy.', 'スマホが忙しそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 11, 'user', 'Every {notification} is buzzing nonstop.', '通知がひっきりなしに鳴ってる。', 'notification', (SELECT id FROM vocab_senses WHERE slug='notification.n.alert'), ARRAY['notification','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 12, 'npc', 'Enjoy the moment!', 'この瞬間を楽しんで！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 13, 'user', 'It''s wild, honestly.', '正直すごいことになってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 14, 'npc', 'Famous friend, {{user_name}}!', '有名人だね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 0, 'npc', 'How do you find good travel tips?', 'いい旅行情報ってどう探すの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 1, 'user', 'I {follow} a few great travel accounts.', 'いい旅行アカウントをいくつかフォローしてる。', 'follow', (SELECT id FROM vocab_senses WHERE slug='follow.v.subscribe'), ARRAY['follow','share','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 2, 'npc', 'Any channels worth watching?', '見る価値のあるチャンネルは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 3, 'user', 'Yes, {subscribe} to this one; the videos are amazing.', 'うん、これに登録して、動画がすごくいい。', 'subscribe', (SELECT id FROM vocab_senses WHERE slug='subscribe.v.join'), ARRAY['subscribe','follow','post','comment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 4, 'npc', 'I saw a shocking travel story today.', '今日、衝撃的な旅行ニュースを見た。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 5, 'user', 'The {headline} about the airport strike?', '空港ストの見出しのこと？', 'headline', (SELECT id FROM vocab_senses WHERE slug='headline.n.title'), ARRAY['headline','post','comment','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 6, 'npc', 'That''s the one. Scary.', 'それそれ。怖いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 7, 'user', 'A creator made a helpful {post} about it.', 'あるクリエイターが役立つ投稿をしてたよ。', 'post', (SELECT id FROM vocab_senses WHERE slug='post.v.publish'), ARRAY['post','follow','share','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 8, 'npc', 'Can you send it to me?', '送ってくれる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 9, 'user', 'Sure, I''ll {share} the link now.', 'いいよ、今リンクをシェアする。', 'share', (SELECT id FROM vocab_senses WHERE slug='share.v.spread'), ARRAY['share','follow','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 10, 'npc', 'Thanks. Is it popular?', 'ありがとう。人気なの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 11, 'user', 'Very, it''s going {viral} among travelers.', 'すごく、旅行者の間でバズってる。', 'viral', (SELECT id FROM vocab_senses WHERE slug='viral.adj.spreading'), ARRAY['viral','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 12, 'npc', 'Good info spreads fast.', 'いい情報は広まるのが早い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 13, 'user', 'Exactly.', 'その通り。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 14, 'npc', 'Safe trip planning, {{user_name}}!', 'いい計画を、{{user_name}}！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 0, 'npc', 'Let''s grow our brand online.', 'オンラインでブランドを伸ばそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 1, 'user', 'I''ll {post} once a day on our channels.', 'うちのチャンネルに1日1回投稿するよ。', 'post', (SELECT id FROM vocab_senses WHERE slug='post.v.publish'), ARRAY['post','comment','headline','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 2, 'npc', 'What kind of content?', 'どんな内容？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 3, 'user', 'Short tips with a catchy {headline}.', 'キャッチーな見出し付きの短いコツ。', 'headline', (SELECT id FROM vocab_senses WHERE slug='headline.n.title'), ARRAY['headline','post','comment','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 4, 'npc', 'Should we encourage engagement?', '反応を促す？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 5, 'user', 'Yes, we reply to every {comment}.', 'うん、すべてのコメントに返信する。', 'comment', (SELECT id FROM vocab_senses WHERE slug='comment.n.remark'), ARRAY['comment','post','headline','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 6, 'npc', 'And spread our best pieces?', '一番いい投稿は広める？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 7, 'user', 'We ask followers to {share} them.', 'フォロワーにシェアをお願いする。', 'share', (SELECT id FROM vocab_senses WHERE slug='share.v.spread'), ARRAY['share','follow','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 8, 'npc', 'How do we keep people coming back?', 'どうやってリピートしてもらう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 9, 'user', 'Invite them to {subscribe} to our newsletter.', 'ニュースレターに登録してもらう。', 'subscribe', (SELECT id FROM vocab_senses WHERE slug='subscribe.v.join'), ARRAY['subscribe','follow','post','comment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 10, 'npc', 'Will they know about new posts?', '新しい投稿に気づく？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 11, 'user', 'Yes, they get a {notification} each time.', 'うん、毎回通知が届く。', 'notification', (SELECT id FROM vocab_senses WHERE slug='notification.n.alert'), ARRAY['notification','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 12, 'npc', 'Solid plan.', 'いい計画。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 13, 'user', 'I''ll draft the calendar.', 'カレンダーを作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-28.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-28 - Eating out  (Unit 10)
-- Words: reservation, starter, dessert, tip, waiter, cuisine, vegetarian, menu.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('eating-out', 'Eating out', '外食', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('reservation', 'reservation', '/ˌrezərˈveɪʃn/', '/ˌrezəˈveɪʃn/', NULL, 3, FALSE, NULL),
  ('starter', 'starter', '/ˈstɑːrtər/', '/ˈstɑːtə/', NULL, 4, FALSE, NULL),
  ('dessert', 'dessert', '/dɪˈzɜːrt/', '/dɪˈzɜːt/', NULL, 3, FALSE, NULL),
  ('tip', 'tip', '/tɪp/', '/tɪp/', NULL, 3, FALSE, NULL),
  ('waiter', 'waiter', '/ˈweɪtər/', '/ˈweɪtə/', NULL, 3, FALSE, NULL),
  ('cuisine', 'cuisine', '/kwɪˈziːn/', '/kwɪˈziːn/', NULL, 4, FALSE, NULL),
  ('vegetarian', 'vegetarian', '/ˌvedʒəˈteriən/', '/ˌvedʒəˈteəriən/', NULL, 3, FALSE, NULL),
  ('menu', 'menu', '/ˈmenjuː/', '/ˈmenjuː/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='reservation'), 'reservation.n.booking', 1, TRUE, 'noun', '予約', 'an arrangement to keep a table for you', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='starter'), 'starter.n.appetizer', 1, TRUE, 'noun', '前菜', 'a small first dish before the main meal', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dessert'), 'dessert.n.sweet', 1, TRUE, 'noun', 'デザート', 'sweet food eaten at the end of a meal', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tip'), 'tip.n.gratuity', 1, TRUE, 'noun', 'チップ', 'extra money given to thank a server', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='waiter'), 'waiter.n.server', 1, TRUE, 'noun', 'ウェイター', 'a person who serves food in a restaurant', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cuisine'), 'cuisine.n.cooking', 1, TRUE, 'noun', '料理（の種類）', 'a style of cooking from a place', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='vegetarian'), 'vegetarian.n.diet', 1, TRUE, 'noun', 'ベジタリアン', 'a person who does not eat meat', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='menu'), 'menu.n.list', 1, TRUE, 'noun', 'メニュー', 'a list of the food a restaurant offers', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('reservation', 'starter', 'dessert', 'tip', 'waiter', 'cuisine', 'vegetarian', 'menu')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='eating-out'
WHERE s.slug IN ('reservation.n.booking', 'starter.n.appetizer', 'dessert.n.sweet', 'tip.n.gratuity', 'waiter.n.server', 'cuisine.n.cooking', 'vegetarian.n.diet', 'menu.n.list')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-28', 10, 0, (SELECT id FROM vocab_categories WHERE slug='eating-out'), 'Eating out', '外食する', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-28'), s.id, x.ord FROM (VALUES
  ('reservation.n.booking',0),('starter.n.appetizer',1),('dessert.n.sweet',2),('tip.n.gratuity',3),('waiter.n.server',4),('cuisine.n.cooking',5),('vegetarian.n.diet',6),('menu.n.list',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-28'), 'conversation', 0, 'Choosing where to eat', '店を選ぶ', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-28'), 'travel', 1, 'A restaurant abroad', '海外のレストラン', 'restaurant', 'waiter'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-28'), 'business', 2, 'A client dinner', '接待ディナー', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 0, 'npc', 'Shall we try that new restaurant?', 'あの新しいレストラン行ってみる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 1, 'user', 'Yes! Should I make a {reservation}?', 'うん！予約しようか？', 'reservation', (SELECT id FROM vocab_senses WHERE slug='reservation.n.booking'), ARRAY['reservation','starter','dessert','tip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 2, 'npc', 'Good idea, it gets busy.', 'いいね、混むから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 3, 'user', 'What {cuisine} do they serve?', 'どんな料理を出すの？', 'cuisine', (SELECT id FROM vocab_senses WHERE slug='cuisine.n.cooking'), ARRAY['cuisine','menu','tip','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 4, 'npc', 'Italian, I think.', 'イタリアンだと思う。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 5, 'user', 'Perfect. Their {menu} looks amazing online.', '完璧。ネットで見たメニューがすごくよさそう。', 'menu', (SELECT id FROM vocab_senses WHERE slug='menu.n.list'), ARRAY['menu','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 6, 'npc', 'I''m starving already.', 'もうお腹ぺこぺこ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 7, 'user', 'Let''s get a {starter} to share first.', 'まず前菜をシェアしよう。', 'starter', (SELECT id FROM vocab_senses WHERE slug='starter.n.appetizer'), ARRAY['starter','tip','dessert','waiter']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 8, 'npc', 'And save room for something sweet.', '甘いものの分も残しておこう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 9, 'user', 'Definitely a {dessert} at the end.', '最後は絶対デザート。', 'dessert', (SELECT id FROM vocab_senses WHERE slug='dessert.n.sweet'), ARRAY['dessert','tip','starter','menu']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 10, 'npc', 'Do we tip there?', 'あそこチップいる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 11, 'user', 'Yes, if the {waiter} is helpful.', 'うん、ウェイターが親切ならね。', 'waiter', (SELECT id FROM vocab_senses WHERE slug='waiter.n.server'), ARRAY['waiter','menu','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 12, 'npc', 'Let''s go tonight!', '今夜行こう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 13, 'user', 'I''ll book a table.', 'テーブルを予約するね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='conversation'), 14, 'npc', 'Can''t wait, {{user_name}}.', '楽しみ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 0, 'npc', 'Good evening. Here''s your table.', 'こんばんは。こちらのお席です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 1, 'user', 'Thank you. Could I see the {menu}?', 'ありがとう。メニューを見せてもらえますか？', 'menu', (SELECT id FROM vocab_senses WHERE slug='menu.n.list'), ARRAY['menu','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 2, 'npc', 'Of course. Any dietary needs?', 'もちろん。食事制限はありますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 3, 'user', 'Yes, I''m {vegetarian}; no meat please.', 'はい、ベジタリアンなので肉抜きで。', 'vegetarian', (SELECT id FROM vocab_senses WHERE slug='vegetarian.n.diet'), ARRAY['vegetarian','starter','dessert','tip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 4, 'npc', 'We have great veggie dishes.', '野菜料理が充実してます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 5, 'user', 'Wonderful, I love local {cuisine}.', '素敵、地元の料理が大好きです。', 'cuisine', (SELECT id FROM vocab_senses WHERE slug='cuisine.n.cooking'), ARRAY['cuisine','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 6, 'npc', 'Would you like to begin with something?', '何か前菜はいかがですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 7, 'user', 'A soup {starter}, please.', 'スープの前菜をお願いします。', 'starter', (SELECT id FROM vocab_senses WHERE slug='starter.n.appetizer'), ARRAY['starter','tip','dessert','menu']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 8, 'npc', 'Excellent. And after?', 'かしこまりました。そのあとは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 9, 'user', 'I''ll decide on {dessert} later.', 'デザートは後で決めます。', 'dessert', (SELECT id FROM vocab_senses WHERE slug='dessert.n.sweet'), ARRAY['dessert','tip','starter','menu']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 10, 'npc', 'Take your time.', 'ごゆっくり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 11, 'user', 'By the way, is a {tip} included in the bill?', 'ところで、チップは会計に含まれますか？', 'tip', (SELECT id FROM vocab_senses WHERE slug='tip.n.gratuity'), ARRAY['tip','starter','dessert','menu']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 12, 'npc', 'It''s optional here.', 'こちらでは任意です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 13, 'user', 'Good to know, thank you.', '分かりました、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='travel'), 14, 'npc', 'Enjoy your meal!', 'お食事を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 0, 'npc', 'Where should we take the client?', 'クライアントをどこに連れて行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 1, 'user', 'I''ll make a {reservation} somewhere nice.', 'どこかいい店を予約するよ。', 'reservation', (SELECT id FROM vocab_senses WHERE slug='reservation.n.booking'), ARRAY['reservation','starter','dessert','tip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 2, 'npc', 'They like fine food.', '彼らは上質な料理が好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 3, 'user', 'Then French {cuisine} would impress them.', 'ならフランス料理で印象づけられる。', 'cuisine', (SELECT id FROM vocab_senses WHERE slug='cuisine.n.cooking'), ARRAY['cuisine','menu','tip','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 4, 'npc', 'Good call. Big group?', 'いいね。大人数？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 5, 'user', 'Six of us. I''ll check the {menu} for options.', '6人。メニューで選択肢を確認する。', 'menu', (SELECT id FROM vocab_senses WHERE slug='menu.n.list'), ARRAY['menu','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 6, 'npc', 'Order some things to share.', 'シェアできるものを頼もう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 7, 'user', 'Yes, a few {starter}s for the table.', 'うん、テーブルに前菜をいくつか。', 'starter', (SELECT id FROM vocab_senses WHERE slug='starter.n.appetizer'), ARRAY['starter','tip','dessert','waiter']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 8, 'npc', 'Make sure service is smooth.', 'サービスがスムーズなように。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 9, 'user', 'I''ll ask for an experienced {waiter}.', '経験豊富なウェイターをお願いする。', 'waiter', (SELECT id FROM vocab_senses WHERE slug='waiter.n.server'), ARRAY['waiter','menu','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 10, 'npc', 'And the bill?', '会計は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 11, 'user', 'The company covers it, plus a generous {tip}.', '会社持ちで、チップも多めに。', 'tip', (SELECT id FROM vocab_senses WHERE slug='tip.n.gratuity'), ARRAY['tip','menu','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 12, 'npc', 'Perfect. Let''s impress them.', '完璧。印象づけよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 13, 'user', 'I''ll confirm the table.', '席を確定するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-28') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-29.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-29 - Cooking & recipes  (Unit 10)
-- Words: ingredient, chop, stir, bake, roast, spicy, flavor, leftovers.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('cooking-recipes', 'Cooking & recipes', '料理とレシピ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('ingredient', 'ingredient', '/ɪnˈɡriːdiənt/', '/ɪnˈɡriːdiənt/', NULL, 3, FALSE, NULL),
  ('chop', 'chop', '/tʃɑːp/', '/tʃɒp/', NULL, 3, FALSE, NULL),
  ('stir', 'stir', '/stɜːr/', '/stɜː/', NULL, 3, FALSE, NULL),
  ('bake', 'bake', '/beɪk/', '/beɪk/', NULL, 3, FALSE, NULL),
  ('roast', 'roast', '/roʊst/', '/rəʊst/', NULL, 4, FALSE, NULL),
  ('spicy', 'spicy', '/ˈspaɪsi/', '/ˈspaɪsi/', NULL, 3, FALSE, NULL),
  ('flavor', 'flavor', '/ˈfleɪvər/', '/ˈfleɪvə/', NULL, 3, FALSE, NULL),
  ('leftovers', 'leftovers', '/ˈleftoʊvərz/', '/ˈleftəʊvəz/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='ingredient'), 'ingredient.n.item', 1, TRUE, 'noun', '材料', 'one of the foods used to make a dish', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='chop'), 'chop.v.cut', 1, TRUE, 'verb', '刻む', 'to cut food into pieces with a knife', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stir'), 'stir.v.mix', 1, TRUE, 'verb', 'かき混ぜる', 'to move food around with a spoon', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bake'), 'bake.v.oven', 1, TRUE, 'verb', '（オーブンで）焼く', 'to cook bread or cakes in an oven', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='roast'), 'roast.v.oven2', 1, TRUE, 'verb', 'ローストする', 'to cook meat or vegetables in an oven with oil', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spicy'), 'spicy.adj.hot', 1, TRUE, 'adjective', '辛い', 'having a strong, hot taste from spices', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='flavor'), 'flavor.n.taste', 1, TRUE, 'noun', '風味', 'the taste of a particular food', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='leftovers'), 'leftovers.n.remains', 1, TRUE, 'noun', '残り物', 'food that is not eaten and kept for later', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('ingredient', 'chop', 'stir', 'bake', 'roast', 'spicy', 'flavor', 'leftovers')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='cooking-recipes'
WHERE s.slug IN ('ingredient.n.item', 'chop.v.cut', 'stir.v.mix', 'bake.v.oven', 'roast.v.oven2', 'spicy.adj.hot', 'flavor.n.taste', 'leftovers.n.remains')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-29', 10, 1, (SELECT id FROM vocab_categories WHERE slug='cooking-recipes'), 'Cooking & recipes', '料理とレシピ', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-29'), s.id, x.ord FROM (VALUES
  ('ingredient.n.item',0),('chop.v.cut',1),('stir.v.mix',2),('bake.v.oven',3),('roast.v.oven2',4),('spicy.adj.hot',5),('flavor.n.taste',6),('leftovers.n.remains',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-29'), 'conversation', 0, 'Cooking together', '一緒に料理', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-29'), 'travel', 1, 'A cooking class', '料理教室', 'kitchen', 'chef'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-29'), 'business', 2, 'Catering an event', 'イベントのケータリング', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 0, 'npc', 'What are we making tonight?', '今夜は何を作る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 1, 'user', 'A curry. Do we have every {ingredient}?', 'カレー。材料は全部ある？', 'ingredient', (SELECT id FROM vocab_senses WHERE slug='ingredient.n.item'), ARRAY['ingredient','flavor','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 2, 'npc', 'I think so. What first?', 'たぶん。まず何する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 3, 'user', 'Can you {chop} the onions?', '玉ねぎを刻んでくれる？', 'chop', (SELECT id FROM vocab_senses WHERE slug='chop.v.cut'), ARRAY['chop','stir','bake','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 4, 'npc', 'Sure. Then?', 'いいよ。次は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 5, 'user', 'I''ll {stir} the sauce so it doesn''t burn.', '焦げないようにソースをかき混ぜる。', 'stir', (SELECT id FROM vocab_senses WHERE slug='stir.v.mix'), ARRAY['stir','chop','bake','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 6, 'npc', 'Smells great. Is it hot?', 'いい匂い。辛い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 7, 'user', 'A little {spicy}, but not too much.', '少し辛いけど、そんなに強くない。', 'spicy', (SELECT id FROM vocab_senses WHERE slug='spicy.adj.hot'), ARRAY['spicy','flavor','leftovers','ingredient']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 8, 'npc', 'Needs more taste maybe?', 'もう少し味がほしいかも？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 9, 'user', 'Add salt for more {flavor}.', '塩を足して風味を出そう。', 'flavor', (SELECT id FROM vocab_senses WHERE slug='flavor.n.taste'), ARRAY['flavor','ingredient','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 10, 'npc', 'This makes a lot.', 'たくさんできるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 11, 'user', 'Good, {leftovers} for lunch tomorrow.', 'いいね、残りは明日のランチに。', 'leftovers', (SELECT id FROM vocab_senses WHERE slug='leftovers.n.remains'), ARRAY['leftovers','ingredient','flavor','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 12, 'npc', 'Perfect meal prep.', '完璧な作り置き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 13, 'user', 'Let''s eat!', '食べよう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='conversation'), 14, 'npc', 'Smells amazing, {{user_name}}.', 'いい匂い、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 0, 'npc', 'Today we make a traditional dish.', '今日は伝統料理を作ります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 1, 'user', 'Great. What''s the key {ingredient}?', 'いいですね。重要な材料は？', 'ingredient', (SELECT id FROM vocab_senses WHERE slug='ingredient.n.item'), ARRAY['ingredient','flavor','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 2, 'npc', 'Fresh herbs. First, prep the vegetables.', '新鮮なハーブです。まず野菜の下ごしらえ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 3, 'user', 'Should I {chop} them finely?', '細かく刻みますか？', 'chop', (SELECT id FROM vocab_senses WHERE slug='chop.v.cut'), ARRAY['chop','stir','bake','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 4, 'npc', 'Yes, small pieces. Now the sauce.', 'はい、小さく。次はソース。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 5, 'user', 'I''ll {stir} it slowly over low heat.', '弱火でゆっくりかき混ぜます。', 'stir', (SELECT id FROM vocab_senses WHERE slug='stir.v.mix'), ARRAY['stir','chop','bake','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 6, 'npc', 'For the bread, use the oven.', 'パンはオーブンで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 7, 'user', 'How long do I {bake} the bread?', 'パンはどれくらい焼きますか？', 'bake', (SELECT id FROM vocab_senses WHERE slug='bake.v.oven'), ARRAY['bake','chop','stir','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 8, 'npc', 'Twenty minutes. And the chicken?', '20分です。鶏肉は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 9, 'user', 'I''ll {roast} the chicken with vegetables.', '鶏肉を野菜と一緒にローストします。', 'roast', (SELECT id FROM vocab_senses WHERE slug='roast.v.oven2'), ARRAY['roast','chop','stir','bake']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 10, 'npc', 'Add chili if you like heat.', '辛いのが好きならチリを。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 11, 'user', 'Yes, I love it {spicy}.', 'はい、辛いのが大好きです。', 'spicy', (SELECT id FROM vocab_senses WHERE slug='spicy.adj.hot'), ARRAY['spicy','flavor','ingredient','leftovers']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 12, 'npc', 'You''re a natural!', '筋がいいですね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 13, 'user', 'This is so fun.', 'すごく楽しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='travel'), 14, 'npc', 'Enjoy your dish!', '料理を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 0, 'npc', 'Let''s plan the office lunch menu.', 'オフィスランチの献立を決めよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 1, 'user', 'First, list every {ingredient} we need.', 'まず必要な材料を全部書き出そう。', 'ingredient', (SELECT id FROM vocab_senses WHERE slug='ingredient.n.item'), ARRAY['ingredient','flavor','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 2, 'npc', 'Some staff love bold tastes.', '濃い味が好きな人もいる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 3, 'user', 'We''ll offer dishes with rich {flavor}.', 'しっかりした風味の料理を用意する。', 'flavor', (SELECT id FROM vocab_senses WHERE slug='flavor.n.taste'), ARRAY['flavor','ingredient','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 4, 'npc', 'But not everyone likes heat.', 'でも全員が辛いの好きじゃない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 5, 'user', 'Right, one mild and one {spicy} option.', 'そうだね、マイルドと辛いのを一つずつ。', 'spicy', (SELECT id FROM vocab_senses WHERE slug='spicy.adj.hot'), ARRAY['spicy','flavor','ingredient','leftovers']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 6, 'npc', 'Main dish ideas?', 'メインの案は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 7, 'user', 'A big {roast} of vegetables and chicken.', '野菜と鶏肉の大きなローストを。', 'roast', (SELECT id FROM vocab_senses WHERE slug='roast.v.oven2'), ARRAY['roast','chop','stir','bake']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 8, 'npc', 'And something baked?', '焼き物は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 9, 'user', 'Yes, I''ll {bake} fresh bread rolls.', 'うん、焼きたてのロールパンを焼く。', 'bake', (SELECT id FROM vocab_senses WHERE slug='bake.v.oven'), ARRAY['bake','chop','stir','roast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 10, 'npc', 'What about extra food?', '余った料理は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 11, 'user', 'Any {leftovers} go to the break room.', '残り物は休憩室へ。', 'leftovers', (SELECT id FROM vocab_senses WHERE slug='leftovers.n.remains'), ARRAY['leftovers','ingredient','flavor','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 12, 'npc', 'Everyone will love that.', 'みんな喜ぶよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 13, 'user', 'I''ll send the order.', '注文を出すね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-29') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-30.sql =====
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

-- ===== seed-vocab-102-31.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-31 - In the city  (Unit 11)
-- Words: traffic, pedestrian, crossing, pavement, commute, parking, junction, roadworks.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('in-the-city', 'In the city', '街なか', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('traffic', 'traffic', '/ˈtræfɪk/', '/ˈtræfɪk/', NULL, 3, FALSE, NULL),
  ('pedestrian', 'pedestrian', '/pəˈdestriən/', '/pəˈdestriən/', NULL, 4, FALSE, NULL),
  ('crossing', 'crossing', '/ˈkrɔːsɪŋ/', '/ˈkrɒsɪŋ/', NULL, 3, FALSE, NULL),
  ('pavement', 'pavement', '/ˈpeɪvmənt/', '/ˈpeɪvmənt/', NULL, 4, FALSE, NULL),
  ('commute', 'commute', '/kəˈmjuːt/', '/kəˈmjuːt/', NULL, 4, FALSE, NULL),
  ('parking', 'parking', '/ˈpɑːrkɪŋ/', '/ˈpɑːkɪŋ/', NULL, 3, FALSE, NULL),
  ('junction', 'junction', '/ˈdʒʌŋkʃn/', '/ˈdʒʌŋkʃn/', NULL, 4, FALSE, NULL),
  ('roadworks', 'roadworks', '/ˈroʊdwɜːrks/', '/ˈrəʊdwɜːks/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='traffic'), 'traffic.n.cars', 1, TRUE, 'noun', '交通（量）', 'the cars and vehicles moving on the roads', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pedestrian'), 'pedestrian.n.walker', 1, TRUE, 'noun', '歩行者', 'a person walking, not in a vehicle', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='crossing'), 'crossing.n.place', 1, TRUE, 'noun', '横断歩道', 'a marked place to walk across a road', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pavement'), 'pavement.n.walkway', 1, TRUE, 'noun', '歩道', 'the path beside a road for people to walk on', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='commute'), 'commute.v.travel', 1, TRUE, 'verb', '通勤する', 'to travel regularly between home and work', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='parking'), 'parking.n.space', 1, TRUE, 'noun', '駐車（場）', 'space where you can leave a car', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='junction'), 'junction.n.crossing', 1, TRUE, 'noun', '交差点', 'a place where roads meet', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='roadworks'), 'roadworks.n.repair', 1, TRUE, 'noun', '道路工事', 'repairs being done on a road', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('traffic', 'pedestrian', 'crossing', 'pavement', 'commute', 'parking', 'junction', 'roadworks')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='in-the-city'
WHERE s.slug IN ('traffic.n.cars', 'pedestrian.n.walker', 'crossing.n.place', 'pavement.n.walkway', 'commute.v.travel', 'parking.n.space', 'junction.n.crossing', 'roadworks.n.repair')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-31', 11, 0, (SELECT id FROM vocab_categories WHERE slug='in-the-city'), 'In the city', '街なかで', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-31'), s.id, x.ord FROM (VALUES
  ('traffic.n.cars',0),('pedestrian.n.walker',1),('crossing.n.place',2),('pavement.n.walkway',3),('commute.v.travel',4),('parking.n.space',5),('junction.n.crossing',6),('roadworks.n.repair',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-31'), 'conversation', 0, 'City living', '都会暮らし', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-31'), 'travel', 1, 'Getting directions', '道を尋ねる', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-31'), 'business', 2, 'An office relocation', '移転の検討', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 0, 'npc', 'How''s living in the city?', '都会暮らしはどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 1, 'user', 'Busy! The {traffic} is heavy every morning.', '忙しい！毎朝渋滞がひどい。', 'traffic', (SELECT id FROM vocab_senses WHERE slug='traffic.n.cars'), ARRAY['traffic','parking','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 2, 'npc', 'Long trip to work?', '通勤は長い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 3, 'user', 'I {commute} an hour each way.', '片道1時間通勤してる。', 'commute', (SELECT id FROM vocab_senses WHERE slug='commute.v.travel'), ARRAY['commute','crossing','parking','roadworks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 4, 'npc', 'Do you drive?', '運転する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 5, 'user', 'Sometimes, but {parking} is expensive.', 'たまに、でも駐車が高い。', 'parking', (SELECT id FROM vocab_senses WHERE slug='parking.n.space'), ARRAY['parking','traffic','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 6, 'npc', 'I usually walk.', '私はたいてい歩く。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 7, 'user', 'Me too, the {pavement} is wide here.', '私も、ここは歩道が広い。', 'pavement', (SELECT id FROM vocab_senses WHERE slug='pavement.n.walkway'), ARRAY['pavement','traffic','parking','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 8, 'npc', 'Easy to cross the roads?', '道は渡りやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 9, 'user', 'Yes, there''s a {crossing} on every corner.', 'うん、どの角にも横断歩道がある。', 'crossing', (SELECT id FROM vocab_senses WHERE slug='crossing.n.place'), ARRAY['crossing','traffic','parking','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 10, 'npc', 'Any construction lately?', '最近工事は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 11, 'user', 'Ugh, {roadworks} are slowing everything down.', 'うわ、道路工事で全部が遅い。', 'roadworks', (SELECT id FROM vocab_senses WHERE slug='roadworks.n.repair'), ARRAY['roadworks','traffic','parking','crossing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 12, 'npc', 'City life, right?', '都会だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 13, 'user', 'I still love it.', 'それでも好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 14, 'npc', 'Me too, {{user_name}}.', '私も、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 0, 'npc', 'You look lost. Need help?', '迷ってる？手伝おうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 1, 'user', 'Yes, do I turn at the next {junction}?', 'はい、次の交差点で曲がりますか？', 'junction', (SELECT id FROM vocab_senses WHERE slug='junction.n.crossing'), ARRAY['junction','crossing','parking','traffic']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 2, 'npc', 'Yes, left at the big intersection.', 'はい、大きな交差点を左に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 3, 'user', 'Is there a {pedestrian} path along the river?', '川沿いに歩行者用の道はありますか？', 'pedestrian', (SELECT id FROM vocab_senses WHERE slug='pedestrian.n.walker'), ARRAY['pedestrian','parking','traffic','roadworks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 4, 'npc', 'There is, very scenic.', 'ありますよ、景色がいいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 5, 'user', 'Where can I cross? Is there a {crossing}?', 'どこで渡れますか？横断歩道は？', 'crossing', (SELECT id FROM vocab_senses WHERE slug='crossing.n.place'), ARRAY['crossing','parking','traffic','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 6, 'npc', 'Fifty meters ahead, by the lights.', '50メートル先、信号のところ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 7, 'user', 'Thanks. Is the {traffic} bad around here?', 'ありがとう。この辺は渋滞しますか？', 'traffic', (SELECT id FROM vocab_senses WHERE slug='traffic.n.cars'), ARRAY['traffic','parking','pedestrian','pavement']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 8, 'npc', 'Only at rush hour.', 'ラッシュ時だけです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 9, 'user', 'Good. I''ll stay on the {pavement}.', 'よかった。歩道を歩きます。', 'pavement', (SELECT id FROM vocab_senses WHERE slug='pavement.n.walkway'), ARRAY['pavement','traffic','parking','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 10, 'npc', 'Driving or walking today?', '今日は運転？徒歩？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 11, 'user', 'Walking; {parking} is impossible downtown.', '徒歩、中心街は駐車が無理なので。', 'parking', (SELECT id FROM vocab_senses WHERE slug='parking.n.space'), ARRAY['parking','traffic','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 12, 'npc', 'Wise choice. Enjoy the walk!', '賢明ですね。散歩を楽しんで！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 13, 'user', 'Thank you so much.', '本当にありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 14, 'npc', 'Safe travels!', '気をつけて！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 0, 'npc', 'Staff worry about the new location.', '新しい立地をみんな心配してる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 1, 'user', 'Some would {commute} over an hour.', '1時間以上通勤する人もいる。', 'commute', (SELECT id FROM vocab_senses WHERE slug='commute.v.travel'), ARRAY['commute','crossing','parking','roadworks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 2, 'npc', 'Is the area busy?', 'そのエリアは混む？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 3, 'user', 'The {traffic} there is lighter, actually.', '実はあそこは交通量が少ない。', 'traffic', (SELECT id FROM vocab_senses WHERE slug='traffic.n.cars'), ARRAY['traffic','parking','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 4, 'npc', 'Good. Room for cars?', 'いいね。駐車スペースは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 5, 'user', 'Plenty of {parking} for staff.', 'スタッフ用の駐車が十分ある。', 'parking', (SELECT id FROM vocab_senses WHERE slug='parking.n.space'), ARRAY['parking','traffic','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 6, 'npc', 'Easy to reach by road?', '車で行きやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 7, 'user', 'Yes, right off a major {junction}.', 'うん、主要な交差点のすぐそば。', 'junction', (SELECT id FROM vocab_senses WHERE slug='junction.n.crossing'), ARRAY['junction','crossing','parking','traffic']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 8, 'npc', 'Any construction nearby?', '近くに工事は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 9, 'user', 'Some {roadworks}, but done by next month.', '道路工事が少し、でも来月には終わる。', 'roadworks', (SELECT id FROM vocab_senses WHERE slug='roadworks.n.repair'), ARRAY['roadworks','traffic','parking','crossing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 10, 'npc', 'And for those who walk?', '歩く人には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 11, 'user', 'There''s a safe {pedestrian} route from the station.', '駅から安全な歩行者ルートがある。', 'pedestrian', (SELECT id FROM vocab_senses WHERE slug='pedestrian.n.walker'), ARRAY['pedestrian','parking','traffic','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 12, 'npc', 'Sounds workable.', 'なんとかなりそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 13, 'user', 'I''ll present it Friday.', '金曜に提案するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-32.sql =====
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

-- ===== seed-vocab-102-33.sql =====
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

-- ===== seed-vocab-102-34.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-34 - Hobbies & interests  (Unit 12)
-- Words: get into, carry on, take part, join in, come along, work on, show off, try out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('hobbies-interests', 'Hobbies & interests', '趣味と関心', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('get into', 'get into', '/ˌɡet ˈɪntuː/', '/ˌɡet ˈɪntuː/', NULL, 4, FALSE, NULL),
  ('carry on', 'carry on', '/ˌkæri ˈɑːn/', '/ˌkæri ˈɒn/', NULL, 4, FALSE, NULL),
  ('take part', 'take part', '/ˌteɪk ˈpɑːrt/', '/ˌteɪk ˈpɑːt/', NULL, 3, FALSE, NULL),
  ('join in', 'join in', '/ˌdʒɔɪn ˈɪn/', '/ˌdʒɔɪn ˈɪn/', NULL, 3, FALSE, NULL),
  ('come along', 'come along', '/ˌkʌm əˈlɔːŋ/', '/ˌkʌm əˈlɒŋ/', NULL, 4, FALSE, NULL),
  ('work on', 'work on', '/ˌwɜːrk ˈɑːn/', '/ˌwɜːk ˈɒn/', NULL, 3, FALSE, NULL),
  ('show off', 'show off', '/ˌʃoʊ ˈɔːf/', '/ˌʃəʊ ˈɒf/', NULL, 4, FALSE, NULL),
  ('try out', 'try out', '/ˌtraɪ ˈaʊt/', '/ˌtraɪ ˈaʊt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='get into'), 'get-into.phrv.enjoy', 1, TRUE, 'phrasal verb', 'ハマる', 'to become interested in an activity', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='carry on'), 'carry-on.phrv.continue', 1, TRUE, 'phrasal verb', '続ける', 'to continue doing something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take part'), 'take-part.phrv.participate', 1, TRUE, 'phrasal verb', '参加する', 'to be one of the people doing an activity', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='join in'), 'join-in.phrv.participate2', 1, TRUE, 'phrasal verb', '（みんなに）加わる', 'to do an activity together with others', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='come along'), 'come-along.phrv.accompany', 1, TRUE, 'phrasal verb', '一緒に来る', 'to go somewhere with someone', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='work on'), 'work-on.phrv.improve', 1, TRUE, 'phrasal verb', '取り組む', 'to spend time improving or making something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='show off'), 'show-off.phrv.display', 1, TRUE, 'phrasal verb', '見せびらかす', 'to show your skills so others admire you', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='try out'), 'try-out.phrv.test', 1, TRUE, 'phrasal verb', '試してみる', 'to use something to see if it is good', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('get into', 'carry on', 'take part', 'join in', 'come along', 'work on', 'show off', 'try out')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='hobbies-interests'
WHERE s.slug IN ('get-into.phrv.enjoy', 'carry-on.phrv.continue', 'take-part.phrv.participate', 'join-in.phrv.participate2', 'come-along.phrv.accompany', 'work-on.phrv.improve', 'show-off.phrv.display', 'try-out.phrv.test')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-34', 12, 0, (SELECT id FROM vocab_categories WHERE slug='hobbies-interests'), 'Hobbies & interests', '趣味と関心', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-34'), s.id, x.ord FROM (VALUES
  ('get-into.phrv.enjoy',0),('carry-on.phrv.continue',1),('take-part.phrv.participate',2),('join-in.phrv.participate2',3),('come-along.phrv.accompany',4),('work-on.phrv.improve',5),('show-off.phrv.display',6),('try-out.phrv.test',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-34'), 'conversation', 0, 'A new hobby', '新しい趣味', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-34'), 'travel', 1, 'A local festival', '地元の祭り', 'festival', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-34'), 'business', 2, 'A team volunteer day', 'チームのボランティア', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 0, 'npc', 'You''ve been playing guitar a lot.', '最近ギターよく弾いてるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 1, 'user', 'Yeah, I really {get into} music these days.', 'うん、最近すっかり音楽にハマってる。', 'get into', (SELECT id FROM vocab_senses WHERE slug='get-into.phrv.enjoy'), ARRAY['get into','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 2, 'npc', 'Are you improving?', '上達してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 3, 'user', 'I {work on} a new song every week.', '毎週新しい曲に取り組んでる。', 'work on', (SELECT id FROM vocab_senses WHERE slug='work-on.phrv.improve'), ARRAY['work on','join in','show off','come along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 4, 'npc', 'Will you perform?', '披露する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 5, 'user', 'Maybe, but I don''t like to {show off}.', 'たぶん、でも見せびらかすのは好きじゃない。', 'show off', (SELECT id FROM vocab_senses WHERE slug='show-off.phrv.display'), ARRAY['show off','carry on','get into','try out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 6, 'npc', 'Don''t give up, though.', 'でもやめないでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 7, 'user', 'I won''t; I''ll {carry on} practicing daily.', 'やめないよ、毎日練習を続ける。', 'carry on', (SELECT id FROM vocab_senses WHERE slug='carry-on.phrv.continue'), ARRAY['carry on','join in','show off','come along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 8, 'npc', 'There''s an open mic Friday.', '金曜にオープンマイクがあるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 9, 'user', 'Ooh, I could {try out} my new song there.', 'おお、新曲をそこで試せるね。', 'try out', (SELECT id FROM vocab_senses WHERE slug='try-out.phrv.test'), ARRAY['try out','carry on','show off','join in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 10, 'npc', 'Want company?', '付き添おうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 11, 'user', 'Yes! Please {come along} and cheer.', 'うん！一緒に来て応援して。', 'come along', (SELECT id FROM vocab_senses WHERE slug='come-along.phrv.accompany'), ARRAY['come along','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 12, 'npc', 'Wouldn''t miss it.', '絶対行くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 13, 'user', 'Thanks for the support.', '応援ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 14, 'npc', 'Break a leg, {{user_name}}!', '頑張って、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 0, 'npc', 'The village festival starts tonight!', '村の祭りが今夜始まるよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 1, 'user', 'Can visitors {take part} in the parade?', '観光客もパレードに参加できますか？', 'take part', (SELECT id FROM vocab_senses WHERE slug='take-part.phrv.participate'), ARRAY['take part','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 2, 'npc', 'Of course! Everyone''s welcome.', 'もちろん！誰でも大歓迎。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 3, 'user', 'Great, I''d love to {join in} the dancing.', 'いいですね、踊りに加わりたいです。', 'join in', (SELECT id FROM vocab_senses WHERE slug='join-in.phrv.participate2'), ARRAY['join in','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 4, 'npc', 'There''s food and music too.', '食べ物や音楽もあるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 5, 'user', 'I want to {try out} the local sweets.', '地元のお菓子を試してみたい。', 'try out', (SELECT id FROM vocab_senses WHERE slug='try-out.phrv.test'), ARRAY['try out','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 6, 'npc', 'You must! They''re famous.', 'ぜひ！有名なんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 7, 'user', 'It''s easy to {get into} the festive mood here.', 'ここは祭りの雰囲気にすぐ入り込める。', 'get into', (SELECT id FROM vocab_senses WHERE slug='get-into.phrv.enjoy'), ARRAY['get into','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 8, 'npc', 'Bring your friends along.', '友達も連れておいで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 9, 'user', 'They''ll {come along} tomorrow night.', '明日の夜、一緒に来ます。', 'come along', (SELECT id FROM vocab_senses WHERE slug='come-along.phrv.accompany'), ARRAY['come along','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 10, 'npc', 'Perfect. It runs all week.', '完璧。一週間ずっとやってるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 11, 'user', 'Does the party {carry on} past midnight?', 'パーティーは深夜過ぎまで続きますか？', 'carry on', (SELECT id FROM vocab_senses WHERE slug='carry-on.phrv.continue'), ARRAY['carry on','show off','work on','try out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 12, 'npc', 'Until dawn, usually!', 'たいてい夜明けまで！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 13, 'user', 'Amazing. Let''s go!', 'すごい。行こう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 14, 'npc', 'Follow the music!', '音楽についておいで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 0, 'npc', 'We''re organizing a charity run.', 'チャリティーランを企画してる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 1, 'user', 'I''d like to {take part} in it.', '参加したいです。', 'take part', (SELECT id FROM vocab_senses WHERE slug='take-part.phrv.participate'), ARRAY['take part','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 2, 'npc', 'Great! Can you help plan too?', 'いいね！計画も手伝える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 3, 'user', 'Sure, I''ll {work on} the route map.', 'もちろん、コースの地図に取り組むよ。', 'work on', (SELECT id FROM vocab_senses WHERE slug='work-on.phrv.improve'), ARRAY['work on','join in','show off','come along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 4, 'npc', 'Will others help?', '他の人も手伝う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 5, 'user', 'Yes, most of the team will {join in}.', 'うん、チームのほとんどが加わる。', 'join in', (SELECT id FROM vocab_senses WHERE slug='join-in.phrv.participate2'), ARRAY['join in','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 6, 'npc', 'Even the new hires?', '新人も？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 7, 'user', 'I''ll invite them to {come along}.', '一緒に来るよう誘うよ。', 'come along', (SELECT id FROM vocab_senses WHERE slug='come-along.phrv.accompany'), ARRAY['come along','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 8, 'npc', 'Should we make it annual?', '毎年やる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 9, 'user', 'Definitely, let''s {carry on} the tradition.', 'ぜひ、この伝統を続けよう。', 'carry on', (SELECT id FROM vocab_senses WHERE slug='carry-on.phrv.continue'), ARRAY['carry on','join in','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 10, 'npc', 'And show the community we care.', '地域に思いを示そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 11, 'user', 'Not to {show off}, just to give back.', '見せびらかすためじゃなく、恩返しのため。', 'show off', (SELECT id FROM vocab_senses WHERE slug='show-off.phrv.display'), ARRAY['show off','join in','work on','come along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 12, 'npc', 'Well said.', 'いい言葉だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 13, 'user', 'I''ll draft the plan.', '計画を作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-35.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-35 - Arts & entertainment  (Unit 12)
-- Words: exhibition, gallery, novel, author, director, plot, audience, review.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('arts-entertainment', 'Arts & entertainment', '芸術と娯楽', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('exhibition', 'exhibition', '/ˌeksɪˈbɪʃn/', '/ˌeksɪˈbɪʃn/', NULL, 4, FALSE, NULL),
  ('gallery', 'gallery', '/ˈɡæləri/', '/ˈɡæləri/', NULL, 3, FALSE, NULL),
  ('novel', 'novel', '/ˈnɑːvl/', '/ˈnɒvl/', NULL, 3, FALSE, NULL),
  ('author', 'author', '/ˈɔːθər/', '/ˈɔːθə/', NULL, 3, FALSE, NULL),
  ('director', 'director', '/dəˈrektər/', '/dəˈrektə/', NULL, 3, FALSE, NULL),
  ('plot', 'plot', '/plɑːt/', '/plɒt/', NULL, 4, FALSE, NULL),
  ('audience', 'audience', '/ˈɔːdiəns/', '/ˈɔːdiəns/', NULL, 3, FALSE, NULL),
  ('review', 'review', '/rɪˈvjuː/', '/rɪˈvjuː/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='exhibition'), 'exhibition.n.show', 1, TRUE, 'noun', '展覧会', 'a public show of art or other objects', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gallery'), 'gallery.n.place', 1, TRUE, 'noun', '美術館', 'a place where art is shown', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='novel'), 'novel.n.book', 1, TRUE, 'noun', '小説', 'a long written story', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='author'), 'author.n.writer', 1, TRUE, 'noun', '著者', 'the writer of a book', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='director'), 'director.n.filmmaker', 1, TRUE, 'noun', '監督', 'the person who directs a film or play', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plot'), 'plot.n.story', 1, TRUE, 'noun', '筋', 'the events that make up a story', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='audience'), 'audience.n.viewers', 1, TRUE, 'noun', '観客', 'the people who watch a show or read a work', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='review'), 'review.n.critique', 1, TRUE, 'noun', 'レビュー', 'a written opinion about a book, film, or show', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('exhibition', 'gallery', 'novel', 'author', 'director', 'plot', 'audience', 'review')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='arts-entertainment'
WHERE s.slug IN ('exhibition.n.show', 'gallery.n.place', 'novel.n.book', 'author.n.writer', 'director.n.filmmaker', 'plot.n.story', 'audience.n.viewers', 'review.n.critique')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-35', 12, 1, (SELECT id FROM vocab_categories WHERE slug='arts-entertainment'), 'Arts & entertainment', '芸術と娯楽', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-35'), s.id, x.ord FROM (VALUES
  ('exhibition.n.show',0),('gallery.n.place',1),('novel.n.book',2),('author.n.writer',3),('director.n.filmmaker',4),('plot.n.story',5),('audience.n.viewers',6),('review.n.critique',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-35'), 'conversation', 0, 'A good book', 'いい本', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-35'), 'travel', 1, 'An art museum', '美術館で', 'museum', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-35'), 'business', 2, 'Marketing a show', '展示の宣伝', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 0, 'npc', 'What are you reading?', '何読んでるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 1, 'user', 'A mystery {novel}, I can''t put it down.', 'ミステリー小説、手が止まらない。', 'novel', (SELECT id FROM vocab_senses WHERE slug='novel.n.book'), ARRAY['novel','author','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 2, 'npc', 'Who wrote it?', '誰が書いたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 3, 'user', 'A Japanese {author}, very famous.', '日本の著者で、とても有名。', 'author', (SELECT id FROM vocab_senses WHERE slug='author.n.writer'), ARRAY['author','plot','review','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 4, 'npc', 'Is the story good?', '話は面白い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 5, 'user', 'The {plot} has so many twists.', '筋に驚きの展開がいっぱい。', 'plot', (SELECT id FROM vocab_senses WHERE slug='plot.n.story'), ARRAY['plot','author','review','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 6, 'npc', 'Did you check ratings?', '評価は見た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 7, 'user', 'Yes, every {review} online is glowing.', 'うん、ネットのレビューは絶賛ばかり。', 'review', (SELECT id FROM vocab_senses WHERE slug='review.n.critique'), ARRAY['review','author','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 8, 'npc', 'They''re making a film, I heard.', '映画化するらしいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 9, 'user', 'A famous {director} is making it.', '有名な監督が作ってる。', 'director', (SELECT id FROM vocab_senses WHERE slug='director.n.filmmaker'), ARRAY['director','author','plot','audience']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 10, 'npc', 'Will it be popular?', '人気出るかな？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 11, 'user', 'The {audience} will love it, I think.', '観客はきっと気に入ると思う。', 'audience', (SELECT id FROM vocab_senses WHERE slug='audience.n.viewers'), ARRAY['audience','author','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 12, 'npc', 'Let''s watch it together.', '一緒に観よう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 13, 'user', 'Deal!', '決まり！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 14, 'npc', 'Book first, though, {{user_name}}.', 'でもまず本ね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 0, 'npc', 'Welcome to the city art museum.', '市立美術館へようこそ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 1, 'user', 'It''s huge. Which {gallery} should I see first?', '広いですね。どの展示室を先に見るべき？', 'gallery', (SELECT id FROM vocab_senses WHERE slug='gallery.n.place'), ARRAY['gallery','novel','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 2, 'npc', 'Start with the modern wing.', 'モダン館から始めて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 3, 'user', 'Is the new {exhibition} still open?', '新しい展覧会はまだやってますか？', 'exhibition', (SELECT id FROM vocab_senses WHERE slug='exhibition.n.show'), ARRAY['exhibition','novel','plot','author']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 4, 'npc', 'Yes, until Sunday.', 'はい、日曜まで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 5, 'user', 'I read a great {review} of it.', '素晴らしいレビューを読みました。', 'review', (SELECT id FROM vocab_senses WHERE slug='review.n.critique'), ARRAY['review','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 6, 'npc', 'It''s very popular.', 'とても人気です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 7, 'user', 'I can see; there''s a big {audience} today.', '分かります、今日は観客が多い。', 'audience', (SELECT id FROM vocab_senses WHERE slug='audience.n.viewers'), ARRAY['audience','novel','plot','author']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 8, 'npc', 'There''s a film screening too.', '映画の上映もあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 9, 'user', 'Oh, by which {director}?', 'へえ、どの監督の？', 'director', (SELECT id FROM vocab_senses WHERE slug='director.n.filmmaker'), ARRAY['director','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 10, 'npc', 'A local documentary maker.', '地元のドキュメンタリー作家です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 11, 'user', 'And is there a talk by the book''s {author}?', '本の著者のトークもありますか？', 'author', (SELECT id FROM vocab_senses WHERE slug='author.n.writer'), ARRAY['author','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 12, 'npc', 'At three, in the hall.', '3時に、ホールで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 13, 'user', 'Perfect, I''ll stay for it.', '完璧、それまでいます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 14, 'npc', 'Enjoy the art!', 'アートを楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 0, 'npc', 'How do we promote the new exhibition?', '新しい展覧会をどう宣伝する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 1, 'user', 'First, define our target {audience}.', 'まず、ターゲットの観客を決めよう。', 'audience', (SELECT id FROM vocab_senses WHERE slug='audience.n.viewers'), ARRAY['audience','novel','plot','author']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 2, 'npc', 'Young art fans, mostly.', '主に若いアートファンだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 3, 'user', 'Then the {exhibition} needs bold posters.', 'なら展覧会には目を引くポスターが要る。', 'exhibition', (SELECT id FROM vocab_senses WHERE slug='exhibition.n.show'), ARRAY['exhibition','novel','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 4, 'npc', 'Any press coverage?', '報道は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 5, 'user', 'A magazine will publish a {review}.', '雑誌がレビューを載せてくれる。', 'review', (SELECT id FROM vocab_senses WHERE slug='review.n.critique'), ARRAY['review','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 6, 'npc', 'Who''s the star artist?', '目玉のアーティストは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 7, 'user', 'The museum {director} curated it herself.', '美術館の館長が自ら企画した。', 'director', (SELECT id FROM vocab_senses WHERE slug='director.n.filmmaker'), ARRAY['director','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 8, 'npc', 'Is there a film tie-in?', '映画とのタイアップは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 9, 'user', 'Yes, a short film; the {plot} links to the art.', 'うん、短編映画で、筋がアートとつながってる。', 'plot', (SELECT id FROM vocab_senses WHERE slug='plot.n.story'), ARRAY['plot','novel','review','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 10, 'npc', 'Where do we show it?', 'どこで上映する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 11, 'user', 'In the main {gallery}, on a big screen.', 'メインの展示室で、大きなスクリーンで。', 'gallery', (SELECT id FROM vocab_senses WHERE slug='gallery.n.place'), ARRAY['gallery','novel','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 12, 'npc', 'Great concept.', 'いいコンセプト。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 13, 'user', 'I''ll book the space.', 'スペースを押さえるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 14, 'npc', 'Nice work, {{user_name}}.', 'いい仕事だね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-36.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-36 - Going out  (Unit 12)
-- Words: venue, crowd, queue, festival, gig, encore, backstage, lineup.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('going-out', 'Going out', 'お出かけ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('venue', 'venue', '/ˈvenjuː/', '/ˈvenjuː/', NULL, 4, FALSE, NULL),
  ('crowd', 'crowd', '/kraʊd/', '/kraʊd/', NULL, 3, FALSE, NULL),
  ('queue', 'queue', '/kjuː/', '/kjuː/', NULL, 3, TRUE, '/kjuː/。「キュー」。ue は読まない。'),
  ('festival', 'festival', '/ˈfestɪvl/', '/ˈfestɪvl/', NULL, 3, FALSE, NULL),
  ('gig', 'gig', '/ɡɪɡ/', '/ɡɪɡ/', NULL, 4, FALSE, NULL),
  ('encore', 'encore', '/ˈɑːŋkɔːr/', '/ˈɒŋkɔː/', NULL, 4, FALSE, NULL),
  ('backstage', 'backstage', '/ˌbækˈsteɪdʒ/', '/ˌbækˈsteɪdʒ/', NULL, 4, FALSE, NULL),
  ('lineup', 'lineup', '/ˈlaɪnʌp/', '/ˈlaɪnʌp/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='venue'), 'venue.n.place', 1, TRUE, 'noun', '会場', 'a place where an event is held', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='crowd'), 'crowd.n.people', 1, TRUE, 'noun', '群衆', 'a large group of people together', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='queue'), 'queue.n.line', 1, TRUE, 'noun', '列', 'a line of people waiting for something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='festival'), 'festival.n.event', 1, TRUE, 'noun', '祭り', 'a series of events, often music, over some days', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gig'), 'gig.n.concert', 1, TRUE, 'noun', 'ライブ', 'a live performance by musicians', 'B2', 'くだけた言い方。'),
  ((SELECT id FROM vocab_words WHERE normalized='encore'), 'encore.n.extra', 1, TRUE, 'noun', 'アンコール', 'an extra performance after the audience cheers', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='backstage'), 'backstage.adv.behind', 1, TRUE, 'adverb', '舞台裏で', 'in or to the area behind a stage', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lineup'), 'lineup.n.acts', 1, TRUE, 'noun', '出演者一覧', 'the list of performers at an event', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('venue', 'crowd', 'queue', 'festival', 'gig', 'encore', 'backstage', 'lineup')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='going-out'
WHERE s.slug IN ('venue.n.place', 'crowd.n.people', 'queue.n.line', 'festival.n.event', 'gig.n.concert', 'encore.n.extra', 'backstage.adv.behind', 'lineup.n.acts')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-36', 12, 2, (SELECT id FROM vocab_categories WHERE slug='going-out'), 'Going out', '夜のお出かけ', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-36'), s.id, x.ord FROM (VALUES
  ('venue.n.place',0),('crowd.n.people',1),('queue.n.line',2),('festival.n.event',3),('gig.n.concert',4),('encore.n.extra',5),('backstage.adv.behind',6),('lineup.n.acts',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-36'), 'conversation', 0, 'A concert tonight', '今夜のコンサート', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-36'), 'travel', 1, 'A music festival', '音楽フェス', 'festival', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-36'), 'business', 2, 'A launch event', '発表イベント', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 0, 'npc', 'Excited for the concert tonight?', '今夜のコンサート楽しみ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 1, 'user', 'So excited! It''s my favorite band''s {gig}.', 'すごく！大好きなバンドのライブ。', 'gig', (SELECT id FROM vocab_senses WHERE slug='gig.n.concert'), ARRAY['gig','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 2, 'npc', 'Where is it?', 'どこで？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 3, 'user', 'At a small {venue} downtown.', '中心街の小さな会場で。', 'venue', (SELECT id FROM vocab_senses WHERE slug='venue.n.place'), ARRAY['venue','crowd','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 4, 'npc', 'Will it be packed?', '満員になる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 5, 'user', 'Yeah, a huge {crowd} is expected.', 'うん、大勢の観客が予想されてる。', 'crowd', (SELECT id FROM vocab_senses WHERE slug='crowd.n.people'), ARRAY['crowd','venue','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 6, 'npc', 'Get there early?', '早めに行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 7, 'user', 'Definitely, the {queue} will be long.', '絶対、列が長くなるから。', 'queue', (SELECT id FROM vocab_senses WHERE slug='queue.n.line'), ARRAY['queue','venue','crowd','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 8, 'npc', 'Who else is playing?', '他は誰が出るの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 9, 'user', 'The whole {lineup} is amazing this year.', '今年の出演陣は全部すごい。', 'lineup', (SELECT id FROM vocab_senses WHERE slug='lineup.n.acts'), ARRAY['lineup','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 10, 'npc', 'Hope they play your favorite.', '好きな曲やってくれるといいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 11, 'user', 'If we cheer, they''ll do an {encore}!', '盛り上がればアンコールしてくれる！', 'encore', (SELECT id FROM vocab_senses WHERE slug='encore.n.extra'), ARRAY['encore','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 12, 'npc', 'Let''s sing loud!', '大声で歌おう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 13, 'user', 'It''ll be epic.', '最高になるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='conversation'), 14, 'npc', 'See you there, {{user_name}}!', '現地でね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 0, 'npc', 'The summer festival is this weekend!', '夏フェスは今週末！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 1, 'user', 'I''ve never been to a music {festival} abroad.', '海外の音楽フェスは初めて。', 'festival', (SELECT id FROM vocab_senses WHERE slug='festival.n.event'), ARRAY['festival','crowd','queue','venue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 2, 'npc', 'It''s massive, three stages.', '巨大だよ、ステージ3つ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 3, 'user', 'The {lineup} looks incredible.', '出演陣がすごそう。', 'lineup', (SELECT id FROM vocab_senses WHERE slug='lineup.n.acts'), ARRAY['lineup','crowd','queue','venue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 4, 'npc', 'Some acts are secret.', '一部の出演は当日発表。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 5, 'user', 'The {crowd} will go wild for those.', 'それにはみんな大盛り上がりだね。', 'crowd', (SELECT id FROM vocab_senses WHERE slug='crowd.n.people'), ARRAY['crowd','festival','queue','venue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 6, 'npc', 'Bring water; it''s hot.', '水を持ってきて、暑いから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 7, 'user', 'And the {queue} for drinks is huge.', 'それに飲み物の列がすごく長い。', 'queue', (SELECT id FROM vocab_senses WHERE slug='queue.n.line'), ARRAY['queue','festival','crowd','venue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 8, 'npc', 'A friend gave us special passes.', '友達が特別パスをくれたんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 9, 'user', 'No way, can we go {backstage}?', 'まさか、舞台裏に行けるの？', 'backstage', (SELECT id FROM vocab_senses WHERE slug='backstage.adv.behind'), ARRAY['backstage','festival','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 10, 'npc', 'Yes, to meet a band!', 'うん、バンドに会えるよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 11, 'user', 'Amazing. Is the {venue} easy to reach?', 'すごい。会場は行きやすい？', 'venue', (SELECT id FROM vocab_senses WHERE slug='venue.n.place'), ARRAY['venue','festival','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 12, 'npc', 'Shuttle buses run all day.', 'シャトルバスが一日中出てる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 13, 'user', 'This will be unforgettable.', '忘れられない体験になる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='travel'), 14, 'npc', 'Let''s go early!', '早めに行こう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 0, 'npc', 'Let''s plan the product launch party.', '製品発表パーティーを計画しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 1, 'user', 'We need a stylish {venue} for two hundred.', '200人向けのおしゃれな会場が要る。', 'venue', (SELECT id FROM vocab_senses WHERE slug='venue.n.place'), ARRAY['venue','crowd','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 2, 'npc', 'Expecting a big turnout?', '大勢来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 3, 'user', 'Yes, a big {crowd} of press and clients.', 'うん、報道とクライアントで大勢。', 'crowd', (SELECT id FROM vocab_senses WHERE slug='crowd.n.people'), ARRAY['crowd','venue','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 4, 'npc', 'How do we manage entry?', '入場はどう管理する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 5, 'user', 'A guest list to avoid a long {queue}.', '長い列を避けるためゲストリストで。', 'queue', (SELECT id FROM vocab_senses WHERE slug='queue.n.line'), ARRAY['queue','venue','crowd','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 6, 'npc', 'Any entertainment?', '余興は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 7, 'user', 'A {lineup} of speakers and a live band.', 'スピーカー陣とライブバンドの出演。', 'lineup', (SELECT id FROM vocab_senses WHERE slug='lineup.n.acts'), ARRAY['lineup','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 8, 'npc', 'Where do performers wait?', '出演者はどこで待つ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 9, 'user', 'We''ll set up a {backstage} area for them.', '彼ら用に舞台裏エリアを用意する。', 'backstage', (SELECT id FROM vocab_senses WHERE slug='backstage.adv.behind'), ARRAY['backstage','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 10, 'npc', 'Could we tie it to the city festival?', '街のフェスに合わせられる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 11, 'user', 'Good idea, during the {festival} week for buzz.', 'いいね、話題づくりにフェスの週に。', 'festival', (SELECT id FROM vocab_senses WHERE slug='festival.n.event'), ARRAY['festival','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 12, 'npc', 'Let''s lock the date.', '日程を確定しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 13, 'user', 'I''ll contact venues today.', '今日会場に連絡するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-36') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-37.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-37 - Complaints & service  (Unit 13)
-- Words: deal with, get back, follow up, chase up, take back, own up, bring up, point out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('complaints-service', 'Complaints & service', '苦情と対応', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('deal with', 'deal with', '/ˌdiːl ˈwɪð/', '/ˌdiːl ˈwɪð/', NULL, 3, FALSE, NULL),
  ('get back', 'get back', '/ˌɡet ˈbæk/', '/ˌɡet ˈbæk/', NULL, 3, FALSE, NULL),
  ('follow up', 'follow up', '/ˌfɑːloʊ ˈʌp/', '/ˌfɒləʊ ˈʌp/', NULL, 4, FALSE, NULL),
  ('chase up', 'chase up', '/ˌtʃeɪs ˈʌp/', '/ˌtʃeɪs ˈʌp/', NULL, 4, FALSE, NULL),
  ('take back', 'take back', '/ˌteɪk ˈbæk/', '/ˌteɪk ˈbæk/', NULL, 3, FALSE, NULL),
  ('own up', 'own up', '/ˌoʊn ˈʌp/', '/ˌəʊn ˈʌp/', NULL, 4, FALSE, NULL),
  ('bring up', 'bring up', '/ˌbrɪŋ ˈʌp/', '/ˌbrɪŋ ˈʌp/', NULL, 4, FALSE, NULL),
  ('point out', 'point out', '/ˌpɔɪnt ˈaʊt/', '/ˌpɔɪnt ˈaʊt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='deal with'), 'deal-with.phrv.handle', 1, TRUE, 'phrasal verb', '対処する', 'to take action to solve a problem', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get back'), 'get-back.phrv.reply', 1, TRUE, 'phrasal verb', '折り返し連絡する', 'to reply to someone later', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='follow up'), 'follow-up.phrv.check', 1, TRUE, 'phrasal verb', '追って確認する', 'to check again on something after a first action', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='chase up'), 'chase-up.phrv.pursue', 1, TRUE, 'phrasal verb', '催促する', 'to remind someone to do something they are late with', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take back'), 'take-back.phrv.return', 1, TRUE, 'phrasal verb', '返品する', 'to return a product to the shop', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='own up'), 'own-up.phrv.admit', 1, TRUE, 'phrasal verb', '白状する', 'to admit that you did something wrong', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bring up'), 'bring-up.phrv.mention', 1, TRUE, 'phrasal verb', '話題に出す', 'to start talking about a subject', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='point out'), 'point-out.phrv.indicate', 1, TRUE, 'phrasal verb', '指摘する', 'to tell someone about a fact or mistake', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('deal with', 'get back', 'follow up', 'chase up', 'take back', 'own up', 'bring up', 'point out')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='complaints-service'
WHERE s.slug IN ('deal-with.phrv.handle', 'get-back.phrv.reply', 'follow-up.phrv.check', 'chase-up.phrv.pursue', 'take-back.phrv.return', 'own-up.phrv.admit', 'bring-up.phrv.mention', 'point-out.phrv.indicate')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-37', 13, 0, (SELECT id FROM vocab_categories WHERE slug='complaints-service'), 'Complaints & service', '苦情と対応', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-37'), s.id, x.ord FROM (VALUES
  ('deal-with.phrv.handle',0),('get-back.phrv.reply',1),('follow-up.phrv.check',2),('chase-up.phrv.pursue',3),('take-back.phrv.return',4),('own-up.phrv.admit',5),('bring-up.phrv.mention',6),('point-out.phrv.indicate',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-37'), 'conversation', 0, 'A customer service problem', 'カスタマーサービスの問題', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-37'), 'travel', 1, 'A hotel complaint', 'ホテルへの苦情', 'hotel', 'manager'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-37'), 'business', 2, 'Chasing a supplier', '仕入先への催促', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 0, 'npc', 'Did you sort out that broken blender?', 'あの壊れたミキサー、解決した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 1, 'user', 'Trying to. It''s hard to {deal with} the store.', '対応中。店とのやり取りが大変。', 'deal with', (SELECT id FROM vocab_senses WHERE slug='deal-with.phrv.handle'), ARRAY['deal with','get back','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 2, 'npc', 'Did you return it?', '返品した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 3, 'user', 'I''ll {take back} the blender tomorrow.', '明日ミキサーを返品する。', 'take back', (SELECT id FROM vocab_senses WHERE slug='take-back.phrv.return'), ARRAY['take back','follow up','own up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 4, 'npc', 'Did they reply to your email?', 'メールの返事は来た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 5, 'user', 'Not yet; they said they''d {get back} to me.', 'まだ、折り返し連絡するって言ってた。', 'get back', (SELECT id FROM vocab_senses WHERE slug='get-back.phrv.reply'), ARRAY['get back','take back','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 6, 'npc', 'Push them if they don''t.', '来なかったら催促しなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 7, 'user', 'I will. I''ll {chase up} the refund on Monday.', 'するよ。月曜に返金を催促する。', 'chase up', (SELECT id FROM vocab_senses WHERE slug='chase-up.phrv.pursue'), ARRAY['chase up','take back','own up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 8, 'npc', 'Was it your fault at all?', '少しは自分のせい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 9, 'user', 'No, but I''ll {own up} if I broke it.', 'いや、でも壊したなら白状するよ。', 'own up', (SELECT id FROM vocab_senses WHERE slug='own-up.phrv.admit'), ARRAY['own up','take back','follow up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 10, 'npc', 'Fair. Explain the issue clearly.', 'なるほど。問題をはっきり説明して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 11, 'user', 'I''ll {point out} the crack in the box.', '箱のひびを指摘する。', 'point out', (SELECT id FROM vocab_senses WHERE slug='point-out.phrv.indicate'), ARRAY['point out','take back','own up','chase up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 12, 'npc', 'Good luck with them.', 'うまくいくといいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 13, 'user', 'Thanks, I''ll need it.', 'ありがとう、頑張る。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 14, 'npc', 'Let me know, {{user_name}}.', '結果教えて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 0, 'npc', 'How can I help you today?', '本日はどうされましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 1, 'user', 'I need to {bring up} a problem with my room.', '部屋の問題について話したいです。', 'bring up', (SELECT id FROM vocab_senses WHERE slug='bring-up.phrv.mention'), ARRAY['bring up','follow up','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 2, 'npc', 'I''m sorry. Please tell me.', '申し訳ありません。お聞かせください。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 3, 'user', 'I''ll {point out} that the heater is broken.', '暖房が壊れていると指摘します。', 'point out', (SELECT id FROM vocab_senses WHERE slug='point-out.phrv.indicate'), ARRAY['point out','follow up','own up','take back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 4, 'npc', 'I''ll send someone right away.', 'すぐ人をよこします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 5, 'user', 'Thank you for helping {deal with} it fast.', '早く対処してくれてありがとう。', 'deal with', (SELECT id FROM vocab_senses WHERE slug='deal-with.phrv.handle'), ARRAY['deal with','get back','own up','take back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 6, 'npc', 'Anything else?', '他には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 7, 'user', 'Could you {follow up} about my late checkout?', 'レイトチェックアウトの件を追って確認してもらえますか？', 'follow up', (SELECT id FROM vocab_senses WHERE slug='follow-up.phrv.check'), ARRAY['follow up','own up','take back','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 8, 'npc', 'Of course, I''ll confirm by phone.', 'もちろん、電話で確認します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 9, 'user', 'Great, please {get back} to me by noon.', 'では、正午までに折り返し連絡してください。', 'get back', (SELECT id FROM vocab_senses WHERE slug='get-back.phrv.reply'), ARRAY['get back','own up','take back','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 10, 'npc', 'You have my word.', 'お約束します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 11, 'user', 'Also, can I {take back} the minibar snacks I didn''t use?', 'あと、使わなかったミニバーのお菓子を返せますか？', 'take back', (SELECT id FROM vocab_senses WHERE slug='take-back.phrv.return'), ARRAY['take back','own up','follow up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 12, 'npc', 'Yes, we''ll remove them from the bill.', 'はい、会計から外します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 13, 'user', 'Thank you so much.', '本当にありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 14, 'npc', 'Enjoy the rest of your stay!', '残りの滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 0, 'npc', 'The supplier is late again.', '仕入先がまた遅れてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 1, 'user', 'I''ll {chase up} the delivery this morning.', '今朝、配送を催促するよ。', 'chase up', (SELECT id FROM vocab_senses WHERE slug='chase-up.phrv.pursue'), ARRAY['chase up','take back','own up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 2, 'npc', 'This keeps happening.', 'これが続いてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 3, 'user', 'Let''s {bring up} the delays in the review meeting.', 'レビュー会議で遅延を話題に出そう。', 'bring up', (SELECT id FROM vocab_senses WHERE slug='bring-up.phrv.mention'), ARRAY['bring up','follow up','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 4, 'npc', 'Good. Be specific.', 'いいね。具体的に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 5, 'user', 'I''ll {point out} the three missed deadlines.', '3回の締め切り遅れを指摘する。', 'point out', (SELECT id FROM vocab_senses WHERE slug='point-out.phrv.indicate'), ARRAY['point out','follow up','own up','take back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 6, 'npc', 'Did we cause any of it?', 'こっちに原因はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 7, 'user', 'We should {own up} to the late order form.', '注文書が遅れた件は白状すべき。', 'own up', (SELECT id FROM vocab_senses WHERE slug='own-up.phrv.admit'), ARRAY['own up','chase up','follow up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 8, 'npc', 'Fair. Then push for a fix.', 'なるほど。それから改善を求めよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 9, 'user', 'I''ll {deal with} their manager directly.', '先方のマネージャーと直接対処するよ。', 'deal with', (SELECT id FROM vocab_senses WHERE slug='deal-with.phrv.handle'), ARRAY['deal with','get back','take back','own up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 10, 'npc', 'And keep records.', '記録も残して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 11, 'user', 'Yes, I''ll {follow up} every email in writing.', 'うん、すべてのメールを文書で追って確認する。', 'follow up', (SELECT id FROM vocab_senses WHERE slug='follow-up.phrv.check'), ARRAY['follow up','own up','take back','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 12, 'npc', 'Solid approach.', 'しっかりした進め方。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 13, 'user', 'I''ll update you after the call.', '電話のあと報告するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-38.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-38 - Getting things fixed  (Unit 13)
-- Words: fault, guarantee, warranty, faulty, complaint, defective, compensation, dodgy.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('getting-things-fixed', 'Getting things fixed', '修理と対応', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('fault', 'fault', '/fɔːlt/', '/fɔːlt/', NULL, 3, FALSE, NULL),
  ('guarantee', 'guarantee', '/ˌɡærənˈtiː/', '/ˌɡærənˈtiː/', NULL, 4, FALSE, NULL),
  ('warranty', 'warranty', '/ˈwɔːrənti/', '/ˈwɒrənti/', NULL, 4, FALSE, NULL),
  ('faulty', 'faulty', '/ˈfɔːlti/', '/ˈfɔːlti/', NULL, 4, FALSE, NULL),
  ('complaint', 'complaint', '/kəmˈpleɪnt/', '/kəmˈpleɪnt/', NULL, 3, FALSE, NULL),
  ('defective', 'defective', '/dɪˈfektɪv/', '/dɪˈfektɪv/', NULL, 4, FALSE, NULL),
  ('compensation', 'compensation', '/ˌkɑːmpenˈseɪʃn/', '/ˌkɒmpenˈseɪʃn/', NULL, 4, FALSE, NULL),
  ('dodgy', 'dodgy', '/ˈdɑːdʒi/', '/ˈdɒdʒi/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='fault'), 'fault.n.defect', 1, TRUE, 'noun', '欠陥', 'a problem, or responsibility for a mistake', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='guarantee'), 'guarantee.n.promise', 1, TRUE, 'noun', '保証', 'a promise to repair or replace a product', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='warranty'), 'warranty.n.cover', 1, TRUE, 'noun', '保証（書）', 'a written promise to fix a product for a period', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='faulty'), 'faulty.adj.broken', 1, TRUE, 'adjective', '欠陥のある', 'not working correctly', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='complaint'), 'complaint.n.grievance', 1, TRUE, 'noun', '苦情', 'a statement that you are not satisfied', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='defective'), 'defective.adj.flawed', 1, TRUE, 'adjective', '欠陥品の', 'made wrongly and not working', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='compensation'), 'compensation.n.payment', 1, TRUE, 'noun', '補償', 'money paid to make up for a problem', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dodgy'), 'dodgy.adj.suspect', 1, TRUE, 'adjective', '怪しい', 'seeming dishonest or not safe (informal)', 'B2', 'くだけた言い方。イギリス英語でよく使う。')
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('fault', 'guarantee', 'warranty', 'faulty', 'complaint', 'defective', 'compensation', 'dodgy')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='getting-things-fixed'
WHERE s.slug IN ('fault.n.defect', 'guarantee.n.promise', 'warranty.n.cover', 'faulty.adj.broken', 'complaint.n.grievance', 'defective.adj.flawed', 'compensation.n.payment', 'dodgy.adj.suspect')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-38', 13, 1, (SELECT id FROM vocab_categories WHERE slug='getting-things-fixed'), 'Getting things fixed', '修理と保証', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-38'), s.id, x.ord FROM (VALUES
  ('fault.n.defect',0),('guarantee.n.promise',1),('warranty.n.cover',2),('faulty.adj.broken',3),('complaint.n.grievance',4),('defective.adj.flawed',5),('compensation.n.payment',6),('dodgy.adj.suspect',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-38'), 'conversation', 0, 'A faulty product', '不良品', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-38'), 'travel', 1, 'Returning a rental car', 'レンタカーの返却', 'agency', 'agent'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-38'), 'business', 2, 'A product recall', '製品のリコール', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 0, 'npc', 'Your new headphones already broke?', '新しいヘッドホン、もう壊れたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 1, 'user', 'Yeah, they were {faulty} out of the box.', 'うん、箱を開けた時点で不良だった。', 'faulty', (SELECT id FROM vocab_senses WHERE slug='faulty.adj.broken'), ARRAY['faulty','dodgy','complaint','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 2, 'npc', 'Are they under warranty?', '保証はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 3, 'user', 'Yes, the {warranty} lasts two years.', 'うん、保証は2年間。', 'warranty', (SELECT id FROM vocab_senses WHERE slug='warranty.n.cover'), ARRAY['warranty','complaint','compensation','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 4, 'npc', 'Good. Did you tell the shop?', 'よかった。店に言った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 5, 'user', 'I filed a {complaint} online.', 'オンラインで苦情を出した。', 'complaint', (SELECT id FROM vocab_senses WHERE slug='complaint.n.grievance'), ARRAY['complaint','warranty','compensation','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 6, 'npc', 'Do they promise a fix?', '修理の約束は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 7, 'user', 'There''s a money-back {guarantee}.', '返金保証がある。', 'guarantee', (SELECT id FROM vocab_senses WHERE slug='guarantee.n.promise'), ARRAY['guarantee','complaint','compensation','warranty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 8, 'npc', 'Will you get anything for the trouble?', '手間の分、何かもらえる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 9, 'user', 'They offered {compensation} for the delay.', '遅延の補償を提示してくれた。', 'compensation', (SELECT id FROM vocab_senses WHERE slug='compensation.n.payment'), ARRAY['compensation','warranty','complaint','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 10, 'npc', 'That shop seemed a bit shady.', 'あの店、ちょっと怪しかったね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 11, 'user', 'Yeah, their website looks {dodgy}.', 'うん、サイトが怪しく見える。', 'dodgy', (SELECT id FROM vocab_senses WHERE slug='dodgy.adj.suspect'), ARRAY['dodgy','faulty','complaint','warranty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 12, 'npc', 'Be careful next time.', '次は気をつけて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 13, 'user', 'I will, lesson learned.', 'うん、いい教訓。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 14, 'npc', 'Hope it works out, {{user_name}}.', 'うまくいくといいね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 0, 'npc', 'How was the rental car?', 'レンタカーはどうでした？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 1, 'user', 'There was a problem, but not my {fault}.', '問題がありましたが、私のせいではないです。', 'fault', (SELECT id FROM vocab_senses WHERE slug='fault.n.defect'), ARRAY['fault','complaint','warranty','compensation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 2, 'npc', 'What happened?', '何がありました？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 3, 'user', 'The brakes felt {defective}.', 'ブレーキが欠陥品のようでした。', 'defective', (SELECT id FROM vocab_senses WHERE slug='defective.adj.flawed'), ARRAY['defective','complaint','warranty','dodgy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 4, 'npc', 'That''s serious. I''m sorry.', 'それは重大です。申し訳ありません。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 5, 'user', 'I''d like to make a formal {complaint}.', '正式な苦情を申し立てたいです。', 'complaint', (SELECT id FROM vocab_senses WHERE slug='complaint.n.grievance'), ARRAY['complaint','warranty','compensation','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 6, 'npc', 'Understood. Was it covered?', '承知しました。保証対象でしたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 7, 'user', 'The car''s {warranty} should cover repairs.', '車の保証で修理は対象のはずです。', 'warranty', (SELECT id FROM vocab_senses WHERE slug='warranty.n.cover'), ARRAY['warranty','complaint','compensation','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 8, 'npc', 'It will. Anything for you?', '対象です。お客様には何か？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 9, 'user', 'Some {compensation} for the ruined day trip?', '台無しになった日帰り旅行の補償を？', 'compensation', (SELECT id FROM vocab_senses WHERE slug='compensation.n.payment'), ARRAY['compensation','warranty','complaint','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 10, 'npc', 'We can refund one day.', '1日分を返金できます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 11, 'user', 'Thank you. Please check for other {faulty} parts.', 'ありがとう。他の欠陥部品も確認してください。', 'faulty', (SELECT id FROM vocab_senses WHERE slug='faulty.adj.broken'), ARRAY['faulty','complaint','warranty','compensation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 12, 'npc', 'We''ll inspect it fully.', 'しっかり点検します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 13, 'user', 'I appreciate it.', '助かります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 14, 'npc', 'Safe travels home!', '気をつけてお帰りを！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 0, 'npc', 'We got several reports about the toaster.', 'トースターについて複数の報告が来た。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 1, 'user', 'Yes, one {complaint} says it overheats.', 'うん、過熱するという苦情が一件。', 'complaint', (SELECT id FROM vocab_senses WHERE slug='complaint.n.grievance'), ARRAY['complaint','warranty','compensation','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 2, 'npc', 'Is it a real problem?', '本当に問題？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 3, 'user', 'A batch seems {defective}.', 'あるロットが欠陥品みたい。', 'defective', (SELECT id FROM vocab_senses WHERE slug='defective.adj.flawed'), ARRAY['defective','complaint','warranty','dodgy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 4, 'npc', 'How many units?', '何台？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 5, 'user', 'About two hundred {faulty} ones shipped.', '不良品が約200台出荷された。', 'faulty', (SELECT id FROM vocab_senses WHERE slug='faulty.adj.broken'), ARRAY['faulty','complaint','warranty','compensation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 6, 'npc', 'We must honor the promise.', '約束は守らないと。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 7, 'user', 'Yes, our {guarantee} covers full refunds.', 'うん、うちの保証は全額返金対象。', 'guarantee', (SELECT id FROM vocab_senses WHERE slug='guarantee.n.promise'), ARRAY['guarantee','complaint','compensation','warranty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 8, 'npc', 'And for upset customers?', '怒っている客には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 9, 'user', 'We''ll offer {compensation} vouchers.', '補償のクーポンを出す。', 'compensation', (SELECT id FROM vocab_senses WHERE slug='compensation.n.payment'), ARRAY['compensation','complaint','warranty','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 10, 'npc', 'The supplier looked unreliable.', '仕入先が頼りなさそうだった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 11, 'user', 'Agreed, their parts seemed {dodgy}.', '同感、部品が怪しかった。', 'dodgy', (SELECT id FROM vocab_senses WHERE slug='dodgy.adj.suspect'), ARRAY['dodgy','complaint','warranty','compensation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 12, 'npc', 'Let''s switch suppliers.', '仕入先を変えよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 13, 'user', 'I''ll start the recall.', 'リコールを始めるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 14, 'npc', 'Good, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-39.sql =====
-- ============================================================================
-- Vocab 102: vocab-102-39 - Admin & bureaucracy  (Unit 13)
-- Words: application, document, certificate, approve, reject, submit, procedure, requirement.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('admin-bureaucracy', 'Admin & bureaucracy', '手続き', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('application', 'application', '/ˌæplɪˈkeɪʃn/', '/ˌæplɪˈkeɪʃn/', NULL, 3, FALSE, NULL),
  ('document', 'document', '/ˈdɑːkjumənt/', '/ˈdɒkjumənt/', NULL, 3, FALSE, NULL),
  ('certificate', 'certificate', '/sərˈtɪfɪkət/', '/səˈtɪfɪkət/', NULL, 4, FALSE, NULL),
  ('approve', 'approve', '/əˈpruːv/', '/əˈpruːv/', NULL, 4, FALSE, NULL),
  ('reject', 'reject', '/rɪˈdʒekt/', '/rɪˈdʒekt/', NULL, 4, FALSE, NULL),
  ('submit', 'submit', '/səbˈmɪt/', '/səbˈmɪt/', NULL, 4, FALSE, NULL),
  ('procedure', 'procedure', '/prəˈsiːdʒər/', '/prəˈsiːdʒə/', NULL, 4, FALSE, NULL),
  ('requirement', 'requirement', '/rɪˈkwaɪərmənt/', '/rɪˈkwaɪəmənt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='application'), 'application.n.form', 1, TRUE, 'noun', '申請（書）', 'a formal request, often written on a form', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='document'), 'document.n.paper', 1, TRUE, 'noun', '書類', 'an official paper with information', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='certificate'), 'certificate.n.proof', 1, TRUE, 'noun', '証明書', 'an official paper that proves a fact', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='approve'), 'approve.v.accept', 1, TRUE, 'verb', '承認する', 'to officially agree to something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reject'), 'reject.v.refuse', 1, TRUE, 'verb', '却下する', 'to refuse to accept something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='submit'), 'submit.v.hand', 1, TRUE, 'verb', '提出する', 'to formally send something for a decision', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='procedure'), 'procedure.n.steps', 1, TRUE, 'noun', '手順', 'the set steps for doing something officially', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='requirement'), 'requirement.n.need', 1, TRUE, 'noun', '要件', 'something that is officially needed', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('application', 'document', 'certificate', 'approve', 'reject', 'submit', 'procedure', 'requirement')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), (SELECT id FROM vocab_senses WHERE slug='reject.v.refuse'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='reject.v.refuse'), (SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='admin-bureaucracy'
WHERE s.slug IN ('application.n.form', 'document.n.paper', 'certificate.n.proof', 'approve.v.accept', 'reject.v.refuse', 'submit.v.hand', 'procedure.n.steps', 'requirement.n.need')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-39', 13, 2, (SELECT id FROM vocab_categories WHERE slug='admin-bureaucracy'), 'Admin & bureaucracy', '申請と手続き', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-39'), s.id, x.ord FROM (VALUES
  ('application.n.form',0),('document.n.paper',1),('certificate.n.proof',2),('approve.v.accept',3),('reject.v.refuse',4),('submit.v.hand',5),('procedure.n.steps',6),('requirement.n.need',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-39'), 'conversation', 0, 'A visa application', 'ビザの申請', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-39'), 'travel', 1, 'At a government office', '役所で', 'office', 'official'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-39'), 'business', 2, 'Approving expenses', '経費の承認', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 0, 'npc', 'How''s your visa going?', 'ビザはどう進んでる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 1, 'user', 'I finally started the {application}.', 'やっと申請を始めた。', 'application', (SELECT id FROM vocab_senses WHERE slug='application.n.form'), ARRAY['application','document','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 2, 'npc', 'Lots of paperwork?', '書類は多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 3, 'user', 'So many; each {document} must be perfect.', 'すごく多い、どの書類も完璧にしないと。', 'document', (SELECT id FROM vocab_senses WHERE slug='document.n.paper'), ARRAY['document','application','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 4, 'npc', 'When do you send it?', 'いつ送るの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 5, 'user', 'I''ll {submit} everything online tomorrow.', '明日オンラインで全部提出する。', 'submit', (SELECT id FROM vocab_senses WHERE slug='submit.v.hand'), ARRAY['submit','approve','reject','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 6, 'npc', 'Any tricky rules?', 'ややこしいルールは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 7, 'user', 'Yes, one {requirement} is a bank statement.', 'うん、要件の一つが残高証明。', 'requirement', (SELECT id FROM vocab_senses WHERE slug='requirement.n.need'), ARRAY['requirement','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 8, 'npc', 'What if something''s missing?', '何か足りなかったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 9, 'user', 'They might {reject} it and I reapply.', '却下されて再申請かも。', 'reject', (SELECT id FROM vocab_senses WHERE slug='reject.v.refuse'), ARRAY['reject','approve','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 10, 'npc', 'Fingers crossed they say yes.', '承認されるといいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 11, 'user', 'If they {approve} it, I fly in June.', '承認されたら6月に飛ぶ。', 'approve', (SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), ARRAY['approve','reject','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 12, 'npc', 'You''ve got this.', '大丈夫だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 13, 'user', 'I hope so!', 'そうだといいな！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 14, 'npc', 'Good luck, {{user_name}}.', '頑張って、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 0, 'npc', 'Good morning. What do you need?', 'おはようございます。ご用件は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 1, 'user', 'I need a birth {certificate} copy.', '出生証明書の写しが必要です。', 'certificate', (SELECT id FROM vocab_senses WHERE slug='certificate.n.proof'), ARRAY['certificate','application','document','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 2, 'npc', 'Sure. Have you done this before?', 'はい。以前にされたことは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 3, 'user', 'No, what''s the {procedure}?', 'いいえ、手順はどうなりますか？', 'procedure', (SELECT id FROM vocab_senses WHERE slug='procedure.n.steps'), ARRAY['procedure','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 4, 'npc', 'First, fill this in.', 'まずこれに記入を。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 5, 'user', 'Okay, I''ll complete the {application} form.', 'はい、申請書に記入します。', 'application', (SELECT id FROM vocab_senses WHERE slug='application.n.form'), ARRAY['application','document','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 6, 'npc', 'Then attach your ID.', '次に身分証を添付して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 7, 'user', 'Which {document} counts as ID here?', 'ここでは何の書類が身分証になりますか？', 'document', (SELECT id FROM vocab_senses WHERE slug='document.n.paper'), ARRAY['document','application','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 8, 'npc', 'A passport is fine.', 'パスポートで大丈夫です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 9, 'user', 'Great. Where do I {submit} it?', 'では、どこに提出しますか？', 'submit', (SELECT id FROM vocab_senses WHERE slug='submit.v.hand'), ARRAY['submit','approve','reject','requirement']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 10, 'npc', 'Window two, with the fee.', '2番窓口で、手数料と一緒に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 11, 'user', 'Is a photo also a {requirement}?', '写真も要件ですか？', 'requirement', (SELECT id FROM vocab_senses WHERE slug='requirement.n.need'), ARRAY['requirement','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 12, 'npc', 'Yes, one recent photo.', 'はい、最近の写真を1枚。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 13, 'user', 'Thank you for explaining.', '説明ありがとうございます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 14, 'npc', 'You''re welcome!', 'どういたしまして！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 0, 'npc', 'Can you review these expense claims?', 'この経費申請を確認できる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 1, 'user', 'Sure. Did everyone {submit} receipts?', 'いいよ。みんな領収書を提出した？', 'submit', (SELECT id FROM vocab_senses WHERE slug='submit.v.hand'), ARRAY['submit','approve','reject','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 2, 'npc', 'Most did.', 'ほとんどはね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 3, 'user', 'Each claim needs a {document} as proof.', '各申請には証明の書類が要る。', 'document', (SELECT id FROM vocab_senses WHERE slug='document.n.paper'), ARRAY['document','application','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 4, 'npc', 'This one has none.', 'これはそれがない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 5, 'user', 'Then we {reject} it until they provide one.', 'なら提出まで却下しよう。', 'reject', (SELECT id FROM vocab_senses WHERE slug='reject.v.refuse'), ARRAY['reject','approve','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 6, 'npc', 'And the complete ones?', 'そろってるものは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 7, 'user', 'I''ll {approve} those today.', 'それは今日承認する。', 'approve', (SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), ARRAY['approve','reject','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 8, 'npc', 'Is our process clear to staff?', '手続きはみんなに分かってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 9, 'user', 'I''ll email the {procedure} again to everyone.', '手順をもう一度みんなにメールする。', 'procedure', (SELECT id FROM vocab_senses WHERE slug='procedure.n.steps'), ARRAY['procedure','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 10, 'npc', 'Good. Any rule people miss?', 'いいね。見落としがちなルールは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 11, 'user', 'The main {requirement} is a manager''s signature.', '主な要件はマネージャーの署名。', 'requirement', (SELECT id FROM vocab_senses WHERE slug='requirement.n.need'), ARRAY['requirement','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 12, 'npc', 'Let''s remind them.', '注意喚起しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 13, 'user', 'I''ll send a note.', '一報入れておくよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-102-reviews.sql =====
-- Vocab 102 - unit REVIEW capstones (standalone; only -review lessons).

-- Unit 1 review: A reunion
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u1-review', 1, 90, (SELECT id FROM vocab_categories WHERE slug='personality-traits'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review'), s.id, x.ord FROM (VALUES
  ('confident.adj.sure',0),('shy.adj.timid',1),('honest.adj.truthful',2),('lazy.adj.idle',3),('generous.adj.giving',4),('patient.adj.calm',5),('selfish.adj.egotist',6),('reliable.adj.dependable',7),('get-along.phrv.relate',8),('fall-out.phrv.quarrel',9),('make-up.phrv.reconcile',10),('look-up-to.phrv.admire',11),('put-up-with.phrv.tolerate',12),('hang-out.phrv.socialize',13),('tell-off.phrv.scold',14),('split-up.phrv.separate',15),('grow-up.phrv.mature',16),('childhood.n.youth',17),('hometown.n.origin',18),('generation.n.cohort',19),('retire.v.stopwork',20),('ambition.n.goal',21),('achieve.v.succeed',22),('elderly.adj.old',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review'), 'conversation', 0, 'A reunion', '同窓会', 'cafe', 'old friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 0, 'npc', 'It''s been years! You look great.', '久しぶり！元気そうだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 1, 'user', 'Thanks! I''m more {confident} now than in school.', 'ありがとう！学生の頃より自信がついた。', 'confident', (SELECT id FROM vocab_senses WHERE slug='confident.adj.sure'), ARRAY['confident','shy','lazy','generous']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 2, 'npc', 'You always had it in you. Remember our class?', 'もともと素質あったよ。あのクラス覚えてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 3, 'user', 'Of course. We all had to {grow up} fast after graduation.', 'もちろん。卒業後、みんな早く大人にならなきゃだった。', 'grow up', (SELECT id FROM vocab_senses WHERE slug='grow-up.phrv.mature'), ARRAY['grow up','retire','hang out','achieve']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 4, 'npc', 'So true. Have you seen Mei?', '本当に。メイには会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 5, 'user', 'Not lately. She always had huge {ambition}, though.', '最近は会ってない。でも昔から大きな野心があった。', 'ambition', (SELECT id FROM vocab_senses WHERE slug='ambition.n.goal'), ARRAY['ambition','childhood','hometown','generation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 6, 'npc', 'She runs a startup now. And Ken?', '今はスタートアップを経営してる。ケンは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 7, 'user', 'Ken''s still so {generous}; he paid for all our coffees today.', 'ケンは相変わらず気前がいい。今日みんなのコーヒーをおごってくれた。', 'generous', (SELECT id FROM vocab_senses WHERE slug='generous.adj.giving'), ARRAY['generous','selfish','shy','lazy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 8, 'npc', 'Ha, classic Ken. He set up this reunion, you know.', 'はは、ケンらしい。この同窓会も彼が仕切ったんだよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 9, 'user', 'Really {reliable} as ever; he never drops a plan.', '相変わらず頼りになる。約束を絶対すっぽかさない。', 'reliable', (SELECT id FROM vocab_senses WHERE slug='reliable.adj.dependable'), ARRAY['reliable','shy','lazy','selfish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 10, 'npc', 'We''re lucky to have him. Do you still see the group?', '彼がいて助かる。みんなとはまだ会う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 11, 'user', 'I want to. Do you all still {hang out} often?', '会いたい。みんな今もよくつるんでる？', 'hang out', (SELECT id FROM vocab_senses WHERE slug='hang-out.phrv.socialize'), ARRAY['hang out','tell off','fall out','split up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 12, 'npc', 'Every month! You should come.', '毎月ね！来なよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 13, 'user', 'I''d love that. Honestly, I still {look up to} you all.', 'ぜひ。正直、今もみんなを尊敬してる。', 'look up to', (SELECT id FROM vocab_senses WHERE slug='look-up-to.phrv.admire'), ARRAY['look up to','put up with','tell off','split up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u1-review') AND goal='conversation'), 14, 'npc', 'Aw. Then it''s settled, {{user_name}}, see you next month!', 'うれしい。じゃあ決まり、{{user_name}}、来月ね！', NULL, NULL, NULL);

-- Unit 2 review: After a hard week
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u2-review', 2, 90, (SELECT id FROM vocab_categories WHERE slug='emotions'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review'), s.id, x.ord FROM (VALUES
  ('nervous.adj.tense',0),('relieved.adj.eased',1),('embarrassed.adj.ashamed',2),('jealous.adj.envious',3),('proud.adj.pleased',4),('frustrated.adj.annoyed',5),('anxious.adj.worried',6),('grateful.adj.thankful',7),('opinion.n.view',8),('agree.v.concur',9),('disagree.v.differ',10),('suggest.v.propose',11),('prefer.v.rather',12),('admit.v.confess',13),('doubt.v.question',14),('reckon.v.think',15),('cheer-up.phrv.gladden',16),('calm-down.phrv.settle',17),('get-over.phrv.recover',18),('look-forward-to.phrv.anticipate',19),('freak-out.phrv.panic',20),('chill-out.phrv.relax',21),('fed-up.phr.annoyed',22),('feel-like.phrv.want',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review'), 'conversation', 0, 'After a hard week', '大変な一週間のあと', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 0, 'npc', 'You look brighter than last week!', '先週より元気そうだね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 1, 'user', 'I feel {relieved}; my exams are finally done.', 'ほっとしてる。やっと試験が終わった。', 'relieved', (SELECT id FROM vocab_senses WHERE slug='relieved.adj.eased'), ARRAY['relieved','nervous','jealous','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 2, 'npc', 'Congrats! Were they hard?', 'おめでとう！難しかった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 3, 'user', 'So hard. I was {nervous} the whole week.', 'すごく。一週間ずっと緊張してた。', 'nervous', (SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), ARRAY['nervous','proud','grateful','relieved']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 4, 'npc', 'But you got through it.', 'でも乗り切ったね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 5, 'user', 'I did. I''m actually {proud} of my results.', 'うん。実は結果を誇りに思ってる。', 'proud', (SELECT id FROM vocab_senses WHERE slug='proud.adj.pleased'), ARRAY['proud','embarrassed','jealous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 6, 'npc', 'You should be! Celebrate this weekend?', '当然だよ！週末お祝いする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 7, 'user', 'Yes! I really {look forward to} some rest.', 'うん！休むのを本当に楽しみにしてる。', 'look forward to', (SELECT id FROM vocab_senses WHERE slug='look-forward-to.phrv.anticipate'), ARRAY['look forward to','get over','freak out','fed up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 8, 'npc', 'Let''s plan something calm.', 'ゆったりした計画にしよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 9, 'user', 'Perfect. I need to {calm down} after all that stress.', 'いいね。あのストレスのあと、落ち着きたい。', 'calm down', (SELECT id FROM vocab_senses WHERE slug='calm-down.phrv.settle'), ARRAY['calm down','freak out','cheer up','chill out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 10, 'npc', 'How about a picnic? Or a movie?', 'ピクニックは？それとも映画？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 11, 'user', 'In my {opinion}, a picnic sounds lovely.', '私の意見では、ピクニックが素敵。', 'opinion', (SELECT id FROM vocab_senses WHERE slug='opinion.n.view'), ARRAY['opinion','doubt','agree','suggest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 12, 'npc', 'Then a picnic it is.', 'じゃあピクニックで決まり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 13, 'user', 'I {agree}, that''s settled!', '賛成、決まりね！', 'agree', (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), ARRAY['agree','disagree','admit','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u2-review') AND goal='conversation'), 14, 'npc', 'Can''t wait, {{user_name}}!', '楽しみ、{{user_name}}！', NULL, NULL, NULL);

-- Unit 3 review: Starting a new job
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u3-review', 3, 90, (SELECT id FROM vocab_categories WHERE slug='workplace'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review'), s.id, x.ord FROM (VALUES
  ('salary.n.pay',0),('promotion.n.advance',1),('overtime.n.extrahours',2),('staff.n.employees',3),('manager.n.boss',4),('department.n.section',5),('shift.n.workperiod',6),('contract.n.agreement',7),('apply-for.phrv.request',8),('take-on.phrv.accept',9),('hand-in.phrv.submit',10),('fill-in.phrv.complete',11),('turn-down.phrv.refuse',12),('carry-out.phrv.perform',13),('look-into.phrv.investigate',14),('sort-out.phrv.resolve',15),('schedule.n.timetable',16),('arrange.v.organize',17),('cancel.v.calloff',18),('postpone.v.delay',19),('attend.v.gotomeeting',20),('agenda.n.itemlist',21),('presentation.n.talk',22),('workload.n.amount',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review'), 'conversation', 0, 'Starting a new job', '新しい仕事の始まり', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 0, 'npc', 'You start your new job Monday, right?', '月曜から新しい仕事だよね？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 1, 'user', 'Yes! So glad I decided to {apply for} it.', 'うん！応募して本当によかった。', 'apply for', (SELECT id FROM vocab_senses WHERE slug='apply-for.phrv.request'), ARRAY['apply for','hand in','turn down','sort out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 2, 'npc', 'Do you know your manager yet?', '上司はもう分かった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 3, 'user', 'Yeah, my {manager} seems really kind.', 'うん、上司はすごく優しそう。', 'manager', (SELECT id FROM vocab_senses WHERE slug='manager.n.boss'), ARRAY['manager','salary','staff','shift']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 4, 'npc', 'Nice. Good pay?', 'いいね。給料は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 5, 'user', 'The {salary} is a solid step up.', '給料はしっかり上がった。', 'salary', (SELECT id FROM vocab_senses WHERE slug='salary.n.pay'), ARRAY['salary','agenda','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 6, 'npc', 'Any events your first week?', '初週に予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 7, 'user', 'I {attend} a team meeting on day one.', '初日にチーム会議に出席する。', 'attend', (SELECT id FROM vocab_senses WHERE slug='attend.v.gotomeeting'), ARRAY['attend','cancel','arrange','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 8, 'npc', 'Do you know what it''s about?', '内容は分かる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 9, 'user', 'The {agenda} is planning the new quarter.', '議題は新しい四半期の計画。', 'agenda', (SELECT id FROM vocab_senses WHERE slug='agenda.n.itemlist'), ARRAY['agenda','workload','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 10, 'npc', 'Exciting! Nervous at all?', 'わくわくだね！緊張してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 11, 'user', 'A little, but I''ll {sort out} any problems as they come.', '少し、でも問題が出たら片付けるよ。', 'sort out', (SELECT id FROM vocab_senses WHERE slug='sort-out.phrv.resolve'), ARRAY['sort out','apply for','turn down','hand in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 12, 'npc', 'That''s the spirit.', 'その意気だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 13, 'user', 'I''ve already got my week''s {schedule} planned.', 'もう一週間の予定を立ててある。', 'schedule', (SELECT id FROM vocab_senses WHERE slug='schedule.n.timetable'), ARRAY['schedule','agenda','workload','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u3-review') AND goal='conversation'), 14, 'npc', 'So organized! You''ll do great, {{user_name}}.', 'しっかりしてる！うまくいくよ、{{user_name}}。', NULL, NULL, NULL);

-- Unit 4 review: After graduation
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u4-review', 4, 90, (SELECT id FROM vocab_categories WHERE slug='university-life'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review'), s.id, x.ord FROM (VALUES
  ('degree.n.qualification',0),('lecture.n.talk',1),('seminar.n.class',2),('assignment.n.task',3),('tutor.n.teacher',4),('campus.n.grounds',5),('graduate.v.finish',6),('scholarship.n.grant',7),('catch-up.phrv.reach',8),('fall-behind.phrv.lag',9),('keep-up.phrv.maintain',10),('go-over.phrv.review',11),('note-down.phrv.record',12),('take-in.phrv.absorb',13),('sign-up.phrv.enroll',14),('look-up.phrv.find',15),('skill.n.ability',16),('ability.n.capacity',17),('talent.n.gift',18),('knowledge.n.info',19),('experience.n.practice',20),('qualification.n.credential',21),('expert.n.specialist',22),('beginner.n.novice',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review'), 'conversation', 0, 'After graduation', '卒業のあと', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 0, 'npc', 'You finally finished your studies!', 'ついに勉強を終えたね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 1, 'user', 'Yes! I {graduate} officially next week.', 'うん！来週正式に卒業する。', 'graduate', (SELECT id FROM vocab_senses WHERE slug='graduate.v.finish'), ARRAY['graduate','sign up','catch up','keep up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 2, 'npc', 'Amazing. What was your subject?', 'すごい。専攻は何だった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 3, 'user', 'My {degree} is in marketing.', 'マーケティングの学位だよ。', 'degree', (SELECT id FROM vocab_senses WHERE slug='degree.n.qualification'), ARRAY['degree','lecture','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 4, 'npc', 'Was the final year hard?', '最終学年は大変だった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 5, 'user', 'Very. It was tough to {keep up} at times.', 'すごく。ときどきついていくのが大変だった。', 'keep up', (SELECT id FROM vocab_senses WHERE slug='keep-up.phrv.maintain'), ARRAY['keep up','sign up','look up','note down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 6, 'npc', 'But you managed.', 'でも乗り切ったね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 7, 'user', 'I did. I had to {catch up} after being sick once.', 'うん。一度体調を崩して追いつく必要があった。', 'catch up', (SELECT id FROM vocab_senses WHERE slug='catch-up.phrv.reach'), ARRAY['catch up','sign up','look up','go over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 8, 'npc', 'So, job hunting now?', 'じゃあ今は就活？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 9, 'user', 'Yes. Writing is my strongest {skill}.', 'うん。文章を書くのが一番のスキル。', 'skill', (SELECT id FROM vocab_senses WHERE slug='skill.n.ability'), ARRAY['skill','beginner','expert','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 10, 'npc', 'That''s valuable everywhere.', 'どこでも役立つね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 11, 'user', 'I also got some {experience} from an internship.', 'インターンで少し経験も積んだ。', 'experience', (SELECT id FROM vocab_senses WHERE slug='experience.n.practice'), ARRAY['experience','beginner','talent','expert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 12, 'npc', 'You''ll stand out.', '目立つよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 13, 'user', 'One day I''d love to be an {expert} in branding.', 'いつかブランディングの専門家になりたい。', 'expert', (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), ARRAY['expert','beginner','talent','skill']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u4-review') AND goal='conversation'), 14, 'npc', 'You''ll get there, {{user_name}}.', 'きっとなれるよ、{{user_name}}。', NULL, NULL, NULL);

-- Unit 5 review: Money well managed
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u5-review', 5, 90, (SELECT id FROM vocab_categories WHERE slug='managing-money'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review'), s.id, x.ord FROM (VALUES
  ('budget.n.plan',0),('save-up.phrv.store',1),('afford.v.manage',2),('borrow.v.take',3),('lend.v.give',4),('owe.v.debt',5),('debt.n.money',6),('spend.v.pay',7),('pay-off.phrv.clear',8),('cut-back.phrv.reduce',9),('pay-back.phrv.repay',10),('run-out.phrv.deplete',11),('top-up.phrv.refill',12),('take-out.phrv.withdraw',13),('get-by.phrv.manage',14),('splash-out.phrv.spend',15),('bargain.n.deal',16),('discount.n.reduction',17),('sale.n.event',18),('voucher.n.coupon',19),('brand.n.make',20),('quality.n.standard',21),('secondhand.adj.used',22),('luxury.n.expensive',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review'), 'conversation', 0, 'Money well managed', '上手なやりくり', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 0, 'npc', 'You seem more relaxed about money lately.', '最近お金に余裕がありそうだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 1, 'user', 'I finally stick to a {budget} now.', 'やっと予算を守れるようになった。', 'budget', (SELECT id FROM vocab_senses WHERE slug='budget.n.plan'), ARRAY['budget','debt','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 2, 'npc', 'That''s great. Any big goals?', 'いいね。大きな目標は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 3, 'user', 'I''m trying to {save up} for a car.', '車のために貯金してる。', 'save up', (SELECT id FROM vocab_senses WHERE slug='save-up.phrv.store'), ARRAY['save up','spend','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 4, 'npc', 'Nice. Debt-free yet?', 'いいね。借金はもうない？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 5, 'user', 'Almost! I just need to {pay off} one loan.', 'もう少し！あとローン一つ完済すれば。', 'pay off', (SELECT id FROM vocab_senses WHERE slug='pay-off.phrv.clear'), ARRAY['pay off','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 6, 'npc', 'How did you manage it?', 'どうやりくりしたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 7, 'user', 'I had to {cut back} on little luxuries.', 'ちょっとした贅沢を切り詰めた。', 'cut back', (SELECT id FROM vocab_senses WHERE slug='cut-back.phrv.reduce'), ARRAY['cut back','splash out','top up','run out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 8, 'npc', 'Worth it. Did you buy anything nice?', 'えらい。何かいいもの買った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 9, 'user', 'Just one thing, and it was a {bargain}.', '一つだけ、しかもお買い得だった。', 'bargain', (SELECT id FROM vocab_senses WHERE slug='bargain.n.deal'), ARRAY['bargain','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 10, 'npc', 'Ooh, what was the deal?', 'へえ、どんなお得？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 11, 'user', 'A winter coat with a huge {discount}.', '冬用のコートが大幅割引で。', 'discount', (SELECT id FROM vocab_senses WHERE slug='discount.n.reduction'), ARRAY['discount','brand','quality','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 12, 'npc', 'Smart. Good coat?', '賢い。いいコート？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 13, 'user', 'Yes, great {quality} for the price.', 'うん、値段の割に品質がいい。', 'quality', (SELECT id FROM vocab_senses WHERE slug='quality.n.standard'), ARRAY['quality','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u5-review') AND goal='conversation'), 14, 'npc', 'You''ve really got this, {{user_name}}.', '本当にしっかりしてるね、{{user_name}}。', NULL, NULL, NULL);

-- Unit 6 review: Visiting the new place
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u6-review', 6, 90, (SELECT id FROM vocab_categories WHERE slug='housing'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review'), s.id, x.ord FROM (VALUES
  ('rent.n.payment',0),('landlord.n.owner',1),('mortgage.n.loan',2),('furniture.n.items',3),('neighborhood.n.area',4),('suburb.n.outer',5),('spacious.adj.roomy',6),('cozy.adj.snug',7),('tidy-up.phrv.neaten',8),('throw-away.phrv.discard',9),('put-away.phrv.store',10),('clear-out.phrv.empty',11),('move-in.phrv.occupy',12),('settle-in.phrv.adjust',13),('plug-in.phrv.connect',14),('hang-up.phrv.hang',15),('leak.n.drip',16),('blocked.adj.clogged',17),('repair.v.fix',18),('plumber.n.worker',19),('electricity.n.power',20),('damage.n.harm',21),('flood.n.water',22),('spare.adj.extra',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review'), 'conversation', 0, 'Visiting the new place', '新居に遊びに行く', 'home', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 0, 'npc', 'So this is your new place! Nice vibe.', 'ここが新居か！いい雰囲気。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 1, 'user', 'Thanks! The {rent} is great for the size.', 'ありがとう！広さの割に家賃が安い。', 'rent', (SELECT id FROM vocab_senses WHERE slug='rent.n.payment'), ARRAY['rent','landlord','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 2, 'npc', 'It feels really warm.', 'すごく暖かい感じ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 3, 'user', 'Yeah, I made it {cozy} with lots of plants.', 'うん、植物をたくさん置いて居心地よくした。', 'cozy', (SELECT id FROM vocab_senses WHERE slug='cozy.adj.snug'), ARRAY['cozy','spacious','blocked','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 4, 'npc', 'It''s spotless too.', 'ピカピカだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 5, 'user', 'I {tidy up} a bit every morning.', '毎朝少しずつ片付けてる。', 'tidy up', (SELECT id FROM vocab_senses WHERE slug='tidy-up.phrv.neaten'), ARRAY['tidy up','throw away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 6, 'npc', 'Wish I could do that.', '私も見習いたい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 7, 'user', 'Start by learning to {throw away} old stuff.', 'まず古い物を捨てることから。', 'throw away', (SELECT id FROM vocab_senses WHERE slug='throw-away.phrv.discard'), ARRAY['throw away','put away','plug in','hang up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 8, 'npc', 'Ha, true. Any problems with the flat?', 'はは、確かに。部屋の問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 9, 'user', 'One small {leak} under the sink.', 'シンクの下で小さな水漏れが一つ。', 'leak', (SELECT id FROM vocab_senses WHERE slug='leak.n.drip'), ARRAY['leak','damage','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 10, 'npc', 'Did you fix it?', '直した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 11, 'user', 'A {plumber} came and sorted it.', '配管工が来て直してくれた。', 'plumber', (SELECT id FROM vocab_senses WHERE slug='plumber.n.worker'), ARRAY['plumber','landlord','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 12, 'npc', 'So it''s all good now?', 'じゃあもう大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 13, 'user', 'Yes, one quick {repair} and it''s perfect.', 'うん、ちょっと修理したら完璧。', 'repair', (SELECT id FROM vocab_senses WHERE slug='repair.v.fix'), ARRAY['repair','leak','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u6-review') AND goal='conversation'), 14, 'npc', 'Love what you''ve done, {{user_name}}.', '素敵にしたね、{{user_name}}。', NULL, NULL, NULL);

-- Unit 7 review: Getting back on your feet
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u7-review', 7, 90, (SELECT id FROM vocab_categories WHERE slug='wellbeing'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review'), s.id, x.ord FROM (VALUES
  ('exercise.n.activity',0),('diet.n.food',1),('healthy.adj.well',2),('energy.n.vigor',3),('stress.n.pressure',4),('relax.v.rest',5),('habit.n.routine',6),('lifestyle.n.way',7),('work-out.phrv.exercise',8),('give-up.phrv.quit',9),('cut-down.phrv.reduce',10),('warm-up.phrv.prepare',11),('put-on.phrv.gain',12),('slow-down.phrv.decelerate',13),('take-up.phrv.start',14),('ease-off.phrv.reduce',15),('symptom.n.sign',16),('prescription.n.paper',17),('treatment.n.care',18),('injury.n.harm',19),('recover.v.heal',20),('painkiller.n.medicine',21),('allergy.n.reaction',22),('dizzy.adj.faint',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review'), 'conversation', 0, 'Getting back on your feet', '元気を取り戻す', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 0, 'npc', 'How are you feeling after the flu?', 'インフルのあと、体調どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 1, 'user', 'Much better, I''m starting to {recover}.', 'だいぶいい、回復してきてる。', 'recover', (SELECT id FROM vocab_senses WHERE slug='recover.v.heal'), ARRAY['recover','symptom','treatment','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 2, 'npc', 'Good. Was it rough?', 'よかった。つらかった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 3, 'user', 'Yeah, the worst {symptom} was the fever.', 'うん、一番つらい症状は熱だった。', 'symptom', (SELECT id FROM vocab_senses WHERE slug='symptom.n.sign'), ARRAY['symptom','treatment','painkiller','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 4, 'npc', 'Did the doctor help?', '医者は役に立った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 5, 'user', 'Yes, a simple {treatment} and lots of rest.', 'うん、簡単な治療とたっぷりの休養。', 'treatment', (SELECT id FROM vocab_senses WHERE slug='treatment.n.care'), ARRAY['treatment','symptom','allergy','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 6, 'npc', 'Are you back to normal now?', 'もう元通り？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 7, 'user', 'Almost. I''m easing back into {exercise}.', 'ほぼ。少しずつ運動を再開してる。', 'exercise', (SELECT id FROM vocab_senses WHERE slug='exercise.n.activity'), ARRAY['exercise','diet','energy','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 8, 'npc', 'Don''t overdo it.', '無理しないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 9, 'user', 'I only {work out} lightly for now.', '今は軽く運動するだけ。', 'work out', (SELECT id FROM vocab_senses WHERE slug='work-out.phrv.exercise'), ARRAY['work out','give up','cut down','warm up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 10, 'npc', 'Wise. Anything else changing?', '賢明。他に変えたことは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 11, 'user', 'I decided to {give up} junk food.', 'ジャンクフードをやめることにした。', 'give up', (SELECT id FROM vocab_senses WHERE slug='give-up.phrv.quit'), ARRAY['give up','warm up','take up','put on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 12, 'npc', 'That''ll help your recovery.', '回復に効くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 13, 'user', 'And less {stress} means better sleep.', 'それにストレスが減れば睡眠もよくなる。', 'stress', (SELECT id FROM vocab_senses WHERE slug='stress.n.pressure'), ARRAY['stress','energy','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u7-review') AND goal='conversation'), 14, 'npc', 'Take care of yourself, {{user_name}}.', '体を大事にね、{{user_name}}。', NULL, NULL, NULL);

-- Unit 8 review: Off again soon
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u8-review', 8, 90, (SELECT id FROM vocab_categories WHERE slug='planning-a-trip'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review'), s.id, x.ord FROM (VALUES
  ('destination.n.place',0),('itinerary.n.plan',1),('accommodation.n.lodging',2),('reserve.v.book',3),('abroad.adv.overseas',4),('journey.n.trip',5),('luggage.n.bags',6),('insurance.n.cover',7),('set-off.phrv.depart',8),('get-around.phrv.travel',9),('drop-off.phrv.deliver',10),('pick-up.phrv.collect',11),('hurry-up.phrv.hasten',12),('take-off.phrv.depart',13),('get-on.phrv.board',14),('hold-up.phrv.delay',15),('currency.n.money',16),('exchange.v.swap',17),('customs.n.border',18),('visa.n.permit',19),('jetlag.n.tiredness',20),('crowded.adj.busy',21),('stranded.adj.stuck',22),('departure.n.leaving',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review'), 'conversation', 0, 'Off again soon', 'また旅立つ', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 0, 'npc', 'So, where are you off to next?', '次はどこへ行くの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 1, 'user', 'My next {destination} is Thailand.', '次の目的地はタイ。', 'destination', (SELECT id FROM vocab_senses WHERE slug='destination.n.place'), ARRAY['destination','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 2, 'npc', 'Nice! All booked?', 'いいね！予約済み？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 3, 'user', 'Yes, just packing my {luggage} now.', 'うん、今荷物を詰めてる。', 'luggage', (SELECT id FROM vocab_senses WHERE slug='luggage.n.bags'), ARRAY['luggage','journey','destination','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 4, 'npc', 'What time do you leave?', '何時に出発？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 5, 'user', 'I {set off} at dawn tomorrow.', '明日の夜明けに出発する。', 'set off', (SELECT id FROM vocab_senses WHERE slug='set-off.phrv.depart'), ARRAY['set off','get around','pick up','drop off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 6, 'npc', 'Need a lift to the airport?', '空港まで送ろうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 7, 'user', 'Could you {pick up} me at six?', '6時に拾ってくれる？', 'pick up', (SELECT id FROM vocab_senses WHERE slug='pick-up.phrv.collect'), ARRAY['pick up','drop off','hurry up','hold up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 8, 'npc', 'Of course. Last trip go okay?', 'もちろん。前回の旅行は大丈夫だった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 9, 'user', 'Yeah, though the {jetlag} was brutal.', 'うん、でも時差ぼけがひどかった。', 'jetlag', (SELECT id FROM vocab_senses WHERE slug='jetlag.n.tiredness'), ARRAY['jetlag','currency','customs','visa']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 10, 'npc', 'Border stuff smooth?', '入国はスムーズ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 11, 'user', 'Mostly. {customs} was slow but fine.', 'だいたい。税関は遅いけど問題なし。', 'customs', (SELECT id FROM vocab_senses WHERE slug='customs.n.border'), ARRAY['customs','currency','visa','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 12, 'npc', 'Got local money sorted?', '現地のお金は用意した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 13, 'user', 'I''ll get the {currency} at the airport again.', 'また空港で通貨を手に入れる。', 'currency', (SELECT id FROM vocab_senses WHERE slug='currency.n.money'), ARRAY['currency','customs','visa','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u8-review') AND goal='conversation'), 14, 'npc', 'Have an amazing trip, {{user_name}}!', '素敵な旅を、{{user_name}}！', NULL, NULL, NULL);

-- Unit 9 review: Getting online
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u9-review', 9, 90, (SELECT id FROM vocab_categories WHERE slug='devices-online'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review'), s.id, x.ord FROM (VALUES
  ('device.n.machine',0),('gadget.n.tool',1),('update.n.version',2),('download.v.get',3),('upload.v.send',4),('wifi.n.internet',5),('charger.n.cable',6),('storage.n.space',7),('log-in.phrv.access',8),('log-out.phrv.exit',9),('set-up.phrv.configure',10),('back-up.phrv.copy',11),('switch-on.phrv.start',12),('switch-off.phrv.stop',13),('scroll.v.move',14),('zoom-in.phrv.enlarge',15),('post.v.publish',16),('share.v.spread',17),('follow.v.subscribe',18),('comment.n.remark',19),('viral.adj.spreading',20),('headline.n.title',21),('subscribe.v.join',22),('notification.n.alert',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review'), 'conversation', 0, 'Getting online', 'ネットを始める', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 0, 'npc', 'Finally joined social media?', 'ついにSNS始めた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 1, 'user', 'Yeah, once I got this new {device}.', 'うん、この新しい端末を買ってから。', 'device', (SELECT id FROM vocab_senses WHERE slug='device.n.machine'), ARRAY['device','gadget','charger','storage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 2, 'npc', 'Connected okay?', 'ちゃんとつながった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 3, 'user', 'Yes, the home {wifi} works great.', 'うん、家のWi-Fiが快調。', 'wifi', (SELECT id FROM vocab_senses WHERE slug='wifi.n.internet'), ARRAY['wifi','storage','charger','update']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 4, 'npc', 'Did you make an account?', 'アカウント作った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 5, 'user', 'I can {log in} with my email now.', 'メールでログインできるようになった。', 'log in', (SELECT id FROM vocab_senses WHERE slug='log-in.phrv.access'), ARRAY['log in','log out','switch off','back up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 6, 'npc', 'Smart to protect your data.', 'データを守るのは賢い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 7, 'user', 'I {back up} my photos to the cloud too.', '写真もクラウドにバックアップしてる。', 'back up', (SELECT id FROM vocab_senses WHERE slug='back-up.phrv.copy'), ARRAY['back up','log out','switch off','zoom in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 8, 'npc', 'So, posting yet?', 'で、もう投稿した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 9, 'user', 'I made my first {post} yesterday!', '昨日、初投稿した！', 'post', (SELECT id FROM vocab_senses WHERE slug='post.v.publish'), ARRAY['post','comment','headline','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 10, 'npc', 'How did it do?', '反応どうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 11, 'user', 'Surprisingly, it nearly went {viral}.', '意外にも、ほぼバズった。', 'viral', (SELECT id FROM vocab_senses WHERE slug='viral.adj.spreading'), ARRAY['viral','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 12, 'npc', 'Wow! Gaining fans?', 'わあ！ファン増えてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 13, 'user', 'A few people started to {follow} me.', '何人かフォローし始めてくれた。', 'follow', (SELECT id FROM vocab_senses WHERE slug='follow.v.subscribe'), ARRAY['follow','share','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u9-review') AND goal='conversation'), 14, 'npc', 'Look at you go, {{user_name}}!', 'やるね、{{user_name}}！', NULL, NULL, NULL);

-- Unit 10 review: Dinner decisions
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u10-review', 10, 90, (SELECT id FROM vocab_categories WHERE slug='eating-out'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review'), s.id, x.ord FROM (VALUES
  ('reservation.n.booking',0),('starter.n.appetizer',1),('dessert.n.sweet',2),('tip.n.gratuity',3),('waiter.n.server',4),('cuisine.n.cooking',5),('vegetarian.n.diet',6),('menu.n.list',7),('ingredient.n.item',8),('chop.v.cut',9),('stir.v.mix',10),('bake.v.oven',11),('roast.v.oven2',12),('spicy.adj.hot',13),('flavor.n.taste',14),('leftovers.n.remains',15),('eat-out.phrv.dine',16),('heat-up.phrv.warm',17),('cut-up.phrv.slice',18),('wash-up.phrv.clean',19),('snack.n.food',20),('craving.n.desire',21),('starving.adj.hungry',22),('tasty.adj.delicious',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review'), 'conversation', 0, 'Dinner decisions', '夕飯どうする', 'home', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 0, 'npc', 'I''m hungry. Dinner plan?', 'お腹すいた。夕飯どうする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 1, 'user', 'Same, I''m {starving}.', '私も、腹ぺこ。', 'starving', (SELECT id FROM vocab_senses WHERE slug='starving.adj.hungry'), ARRAY['starving','tasty','snack','craving']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 2, 'npc', 'Cook or go out?', '作る？外食？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 3, 'user', 'Let''s {eat out} tonight.', '今夜は外食しよう。', 'eat out', (SELECT id FROM vocab_senses WHERE slug='eat-out.phrv.dine'), ARRAY['eat out','heat up','cut up','wash up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 4, 'npc', 'Where to?', 'どこに？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 5, 'user', 'That Thai place; I''ll make a {reservation}.', 'あのタイ料理店、予約するね。', 'reservation', (SELECT id FROM vocab_senses WHERE slug='reservation.n.booking'), ARRAY['reservation','starter','dessert','tip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 6, 'npc', 'Do they have veggie options?', 'ベジタリアン向けある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 7, 'user', 'Yes, their {menu} has lots.', 'うん、メニューに色々ある。', 'menu', (SELECT id FROM vocab_senses WHERE slug='menu.n.list'), ARRAY['menu','tip','starter','dessert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 8, 'npc', 'Is the food good?', '味はいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 9, 'user', 'So {tasty}, you''ll love it.', 'すごくおいしい、絶対気に入る。', 'tasty', (SELECT id FROM vocab_senses WHERE slug='tasty.adj.delicious'), ARRAY['tasty','snack','starving','craving']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 10, 'npc', 'Is it very hot?', 'かなり辛い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 11, 'user', 'You can ask for less {spicy}.', '辛さ控えめにお願いできるよ。', 'spicy', (SELECT id FROM vocab_senses WHERE slug='spicy.adj.hot'), ARRAY['spicy','flavor','ingredient','leftovers']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 12, 'npc', 'Great. What''s their specialty?', 'いいね。名物は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 13, 'user', 'Fresh lemongrass is the key {ingredient}.', '新鮮なレモングラスが決め手の材料。', 'ingredient', (SELECT id FROM vocab_senses WHERE slug='ingredient.n.item'), ARRAY['ingredient','flavor','leftovers','chop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u10-review') AND goal='conversation'), 14, 'npc', 'Let''s go, {{user_name}}!', '行こう、{{user_name}}！', NULL, NULL, NULL);

-- Unit 11 review: The new neighborhood
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u11-review', 11, 90, (SELECT id FROM vocab_categories WHERE slug='in-the-city'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review'), s.id, x.ord FROM (VALUES
  ('traffic.n.cars',0),('pedestrian.n.walker',1),('crossing.n.place',2),('pavement.n.walkway',3),('commute.v.travel',4),('parking.n.space',5),('junction.n.crossing',6),('roadworks.n.repair',7),('forecast.n.prediction',8),('humid.adj.damp',9),('freezing.adj.cold',10),('storm.n.weather',11),('thunder.n.sound',12),('breeze.n.wind',13),('foggy.adj.misty',14),('mild.adj.gentle',15),('pollution.n.dirt',16),('recycle.v.reuse',17),('waste.n.rubbish',18),('litter.n.trash',19),('climate.n.weather',20),('sustainable.adj.green',21),('protect.v.guard',22),('clean-up.phrv.tidy',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review'), 'conversation', 0, 'The new neighborhood', '新しい街で', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 0, 'npc', 'How''s the new neighborhood?', '新しい街はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 1, 'user', 'Good, though the {traffic} is noisy.', 'いいけど、交通の音がうるさい。', 'traffic', (SELECT id FROM vocab_senses WHERE slug='traffic.n.cars'), ARRAY['traffic','parking','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 2, 'npc', 'Long way to work?', '通勤は長い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 3, 'user', 'I {commute} thirty minutes by train.', '電車で30分通勤してる。', 'commute', (SELECT id FROM vocab_senses WHERE slug='commute.v.travel'), ARRAY['commute','crossing','parking','roadworks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 4, 'npc', 'Not bad. Weather okay today?', '悪くないね。今日の天気は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 5, 'user', 'The {forecast} says sunny later.', '予報だと後で晴れ。', 'forecast', (SELECT id FROM vocab_senses WHERE slug='forecast.n.prediction'), ARRAY['forecast','breeze','thunder','storm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 6, 'npc', 'No rain this week?', '今週は雨なし？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 7, 'user', 'One {storm} on Thursday, they say.', '木曜に嵐が一回だって。', 'storm', (SELECT id FROM vocab_senses WHERE slug='storm.n.weather'), ARRAY['storm','breeze','forecast','thunder']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 8, 'npc', 'By the way, is your area clean?', 'ところで、その辺はきれい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 9, 'user', 'Mostly, but there''s some {litter} in the park.', 'だいたい、でも公園に少しごみがある。', 'litter', (SELECT id FROM vocab_senses WHERE slug='litter.n.trash'), ARRAY['litter','waste','pollution','climate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 10, 'npc', 'Do people help?', 'みんな協力してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 11, 'user', 'Yes, everyone tries to {recycle} here.', 'うん、みんなリサイクルを心がけてる。', 'recycle', (SELECT id FROM vocab_senses WHERE slug='recycle.v.reuse'), ARRAY['recycle','protect','clean up','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 12, 'npc', 'That''s a good community.', 'いいコミュニティだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 13, 'user', 'We all want to {protect} the area.', 'みんなこの地域を守りたいんだ。', 'protect', (SELECT id FROM vocab_senses WHERE slug='protect.v.guard'), ARRAY['protect','recycle','clean up','waste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u11-review') AND goal='conversation'), 14, 'npc', 'Lucky you, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);

-- Unit 12 review: So many interests
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u12-review', 12, 90, (SELECT id FROM vocab_categories WHERE slug='hobbies-interests'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review'), s.id, x.ord FROM (VALUES
  ('get-into.phrv.enjoy',0),('carry-on.phrv.continue',1),('take-part.phrv.participate',2),('join-in.phrv.participate2',3),('come-along.phrv.accompany',4),('work-on.phrv.improve',5),('show-off.phrv.display',6),('try-out.phrv.test',7),('exhibition.n.show',8),('gallery.n.place',9),('novel.n.book',10),('author.n.writer',11),('director.n.filmmaker',12),('plot.n.story',13),('audience.n.viewers',14),('review.n.critique',15),('venue.n.place',16),('crowd.n.people',17),('queue.n.line',18),('festival.n.event',19),('gig.n.concert',20),('encore.n.extra',21),('backstage.adv.behind',22),('lineup.n.acts',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review'), 'conversation', 0, 'So many interests', '興味いろいろ', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 0, 'npc', 'You seem to have lots of hobbies now.', '最近趣味が多いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 1, 'user', 'Yeah, I really {get into} new things lately.', 'うん、最近いろいろハマってる。', 'get into', (SELECT id FROM vocab_senses WHERE slug='get-into.phrv.enjoy'), ARRAY['get into','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 2, 'npc', 'Like what?', '例えば？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 3, 'user', 'I love to {try out} different activities.', 'いろんな活動を試すのが好き。', 'try out', (SELECT id FROM vocab_senses WHERE slug='try-out.phrv.test'), ARRAY['try out','carry on','show off','join in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 4, 'npc', 'Reading too?', '読書も？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 5, 'user', 'Yes, I just finished a great {novel}.', 'うん、いい小説を読み終えたばかり。', 'novel', (SELECT id FROM vocab_senses WHERE slug='novel.n.book'), ARRAY['novel','author','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 6, 'npc', 'Who''s it by?', '誰の作品？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 7, 'user', 'A new {author} everyone''s talking about.', 'みんなが話題にしてる新しい著者。', 'author', (SELECT id FROM vocab_senses WHERE slug='author.n.writer'), ARRAY['author','plot','review','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 8, 'npc', 'Worth reading?', '読む価値ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 9, 'user', 'Every {review} says yes.', 'どのレビューも高評価。', 'review', (SELECT id FROM vocab_senses WHERE slug='review.n.critique'), ARRAY['review','author','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 10, 'npc', 'Doing anything fun this weekend?', '週末は何か楽しいこと？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 11, 'user', 'A {gig} by my favorite band!', '大好きなバンドのライブ！', 'gig', (SELECT id FROM vocab_senses WHERE slug='gig.n.concert'), ARRAY['gig','venue','crowd','queue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 12, 'npc', 'Big show?', '大きなショー？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 13, 'user', 'A massive {crowd} is coming.', '大勢の観客が来る。', 'crowd', (SELECT id FROM vocab_senses WHERE slug='crowd.n.people'), ARRAY['crowd','venue','queue','encore']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u12-review') AND goal='conversation'), 14, 'npc', 'Have fun, {{user_name}}!', '楽しんで、{{user_name}}！', NULL, NULL, NULL);

-- Unit 13 review: Sorting out a mess
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-u13-review', 13, 90, (SELECT id FROM vocab_categories WHERE slug='complaints-service'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review'), s.id, x.ord FROM (VALUES
  ('deal-with.phrv.handle',0),('get-back.phrv.reply',1),('follow-up.phrv.check',2),('chase-up.phrv.pursue',3),('take-back.phrv.return',4),('own-up.phrv.admit',5),('bring-up.phrv.mention',6),('point-out.phrv.indicate',7),('fault.n.defect',8),('guarantee.n.promise',9),('warranty.n.cover',10),('faulty.adj.broken',11),('complaint.n.grievance',12),('defective.adj.flawed',13),('compensation.n.payment',14),('dodgy.adj.suspect',15),('application.n.form',16),('document.n.paper',17),('certificate.n.proof',18),('approve.v.accept',19),('reject.v.refuse',20),('submit.v.hand',21),('procedure.n.steps',22),('requirement.n.need',23)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review'), 'conversation', 0, 'Sorting out a mess', 'トラブルの後始末', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 0, 'npc', 'Did you sort out the broken laptop?', '壊れたノートPC、解決した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 1, 'user', 'Almost. It took ages to {deal with} the store.', 'もう少し。店との対応にすごく時間がかかった。', 'deal with', (SELECT id FROM vocab_senses WHERE slug='deal-with.phrv.handle'), ARRAY['deal with','get back','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 2, 'npc', 'Was it broken from the start?', '最初から壊れてた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 3, 'user', 'Yeah, it was {faulty} on day one.', 'うん、初日から不良だった。', 'faulty', (SELECT id FROM vocab_senses WHERE slug='faulty.adj.broken'), ARRAY['faulty','complaint','warranty','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 4, 'npc', 'Did you complain?', '苦情は言った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 5, 'user', 'I filed a {complaint} right away.', 'すぐに苦情を出した。', 'complaint', (SELECT id FROM vocab_senses WHERE slug='complaint.n.grievance'), ARRAY['complaint','warranty','compensation','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 6, 'npc', 'Did they respond?', '返事あった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 7, 'user', 'I had to {follow up} twice to get a reply.', '返事をもらうのに2回追って確認した。', 'follow up', (SELECT id FROM vocab_senses WHERE slug='follow-up.phrv.check'), ARRAY['follow up','own up','take back','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 8, 'npc', 'Refund needs forms, right?', '返金には書類が要るよね？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 9, 'user', 'Yes, I sent a {document} with the receipt.', 'うん、領収書と一緒に書類を送った。', 'document', (SELECT id FROM vocab_senses WHERE slug='document.n.paper'), ARRAY['document','application','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 10, 'npc', 'Did you send it off?', 'もう提出した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 11, 'user', 'I''ll {submit} the claim online tonight.', '今夜オンラインで申請を提出する。', 'submit', (SELECT id FROM vocab_senses WHERE slug='submit.v.hand'), ARRAY['submit','approve','reject','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 12, 'npc', 'Hope they say yes fast.', '早く承認されるといいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 13, 'user', 'If they {approve} it, I get my money back.', '承認されればお金が戻る。', 'approve', (SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), ARRAY['approve','reject','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-u13-review') AND goal='conversation'), 14, 'npc', 'Fingers crossed, {{user_name}}!', 'うまくいきますように、{{user_name}}！', NULL, NULL, NULL);

COMMIT;
