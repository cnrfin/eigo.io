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
