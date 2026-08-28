-- ============================================================================
-- Vocab 103: vocab-103-11 - Handling feelings  (Unit 6)
-- Words: well up, choke up, simmer down, lash out, open up, bottle up, snap at, perk up.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('handling-feelings-c1', 'Handling feelings', '感情との付き合い方', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('well up', 'well up', '/ˌwel ˈʌp/', '/ˌwel ˈʌp/', NULL, 5, FALSE, NULL),
  ('choke up', 'choke up', '/ˌtʃoʊk ˈʌp/', '/ˌtʃəʊk ˈʌp/', NULL, 5, FALSE, NULL),
  ('simmer down', 'simmer down', '/ˌsɪmər ˈdaʊn/', '/ˌsɪmə ˈdaʊn/', NULL, 5, FALSE, NULL),
  ('lash out', 'lash out', '/ˌlæʃ ˈaʊt/', '/ˌlæʃ ˈaʊt/', NULL, 5, FALSE, NULL),
  ('open up', 'open up', '/ˌoʊpən ˈʌp/', '/ˌəʊpən ˈʌp/', NULL, 5, FALSE, NULL),
  ('bottle up', 'bottle up', '/ˌbɑːtl ˈʌp/', '/ˌbɒtl ˈʌp/', NULL, 5, FALSE, NULL),
  ('snap at', 'snap at', '/ˈsnæp æt/', '/ˈsnæp æt/', NULL, 5, FALSE, NULL),
  ('perk up', 'perk up', '/ˌpɜːrk ˈʌp/', '/ˌpɜːk ˈʌp/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='well up'), 'well-up.phrv.tears', 1, TRUE, 'phrasal verb', '（涙が）込み上げる', 'when tears begin to appear in your eyes', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='choke up'), 'choke-up.phrv.emotional', 1, TRUE, 'phrasal verb', '感極まって言葉に詰まる', 'to become too emotional to speak', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='simmer down'), 'simmer-down.phrv.calm', 1, TRUE, 'phrasal verb', '（怒りが）落ち着く', 'to become calm after being angry or excited', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lash out'), 'lash-out.phrv.attack', 1, TRUE, 'phrasal verb', '（言葉で）激しく非難する', 'to suddenly attack someone angrily with words', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='open up'), 'open-up.phrv.confide', 1, TRUE, 'phrasal verb', '心を開いて話す', 'to talk freely about your feelings', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bottle up'), 'bottle-up.phrv.suppress', 1, TRUE, 'phrasal verb', '感情を抑え込む', 'to hide strong feelings inside instead of showing them', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='snap at'), 'snap-at.phrv.snap', 1, TRUE, 'phrasal verb', '突っかかる', 'to speak sharply and angrily to someone', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='perk up'), 'perk-up.phrv.cheer', 1, TRUE, 'phrasal verb', '元気になる', 'to become more cheerful or lively', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('well up', 'choke up', 'simmer down', 'lash out', 'open up', 'bottle up', 'snap at', 'perk up')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='open-up.phrv.confide'), (SELECT id FROM vocab_senses WHERE slug='bottle-up.phrv.suppress'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='handling-feelings-c1'
WHERE s.slug IN ('well-up.phrv.tears', 'choke-up.phrv.emotional', 'simmer-down.phrv.calm', 'lash-out.phrv.attack', 'open-up.phrv.confide', 'bottle-up.phrv.suppress', 'snap-at.phrv.snap', 'perk-up.phrv.cheer')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-11', 6, 0, (SELECT id FROM vocab_categories WHERE slug='handling-feelings-c1'), 'Handling feelings', '感情との付き合い方', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-11'), s.id, x.ord FROM (VALUES
  ('well-up.phrv.tears',0),('choke-up.phrv.emotional',1),('simmer-down.phrv.calm',2),('lash-out.phrv.attack',3),('open-up.phrv.confide',4),('bottle-up.phrv.suppress',5),('snap-at.phrv.snap',6),('perk-up.phrv.cheer',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-11'), 'conversation', 0, 'A friend opens up', '友達が打ち明ける', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-11'), 'travel', 1, 'A nervous flyer', '飛行機が怖い', 'airport', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-11'), 'business', 2, 'A tense moment', '張り詰めた瞬間', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 0, 'npc', 'You''ve been quiet. Everything okay?', '静かだね。大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 1, 'user', 'Not really. It''s hard to {open up}, but I''ll try.', 'あんまり。心を開くのは難しいけど、話してみる。', 'open up', (SELECT id FROM vocab_senses WHERE slug='open-up.phrv.confide'), ARRAY['open up','bottle up','snap at','perk up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 2, 'npc', 'Take your time.', 'ゆっくりでいいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 3, 'user', 'I tend to {bottle up} my stress.', '私、ストレスを抑え込みがちで。', 'bottle up', (SELECT id FROM vocab_senses WHERE slug='bottle-up.phrv.suppress'), ARRAY['bottle up','open up','perk up','well up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 4, 'npc', 'That''s tough on you.', 'つらいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 5, 'user', 'Yeah. My eyes {well up} just talking about it.', 'うん。話すだけで涙が込み上げる。', 'well up', (SELECT id FROM vocab_senses WHERE slug='well-up.phrv.tears'), ARRAY['well up','perk up','snap at','simmer down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 6, 'npc', 'It''s okay to cry.', '泣いていいんだよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 7, 'user', 'Thanks. I always {choke up} at this part.', 'ありがとう。いつもここで言葉に詰まる。', 'choke up', (SELECT id FROM vocab_senses WHERE slug='choke-up.phrv.emotional'), ARRAY['choke up','perk up','snap at','simmer down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 8, 'npc', 'Have you been short with people?', '人にきつく当たってた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 9, 'user', 'Sadly, I {snap at} my family lately.', '残念だけど、最近家族に突っかかる。', 'snap at', (SELECT id FROM vocab_senses WHERE slug='snap-at.phrv.snap'), ARRAY['snap at','open up','perk up','well up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 10, 'npc', 'They''ll understand.', '分かってくれるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 11, 'user', 'Talking to you makes me {perk up}, honestly.', '正直、君と話すと元気が出る。', 'perk up', (SELECT id FROM vocab_senses WHERE slug='perk-up.phrv.cheer'), ARRAY['perk up','bottle up','snap at','well up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 12, 'npc', 'Anytime you need me.', 'いつでも頼って。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 13, 'user', 'That means a lot.', '本当に助かる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='conversation'), 14, 'npc', 'Always, {{user_name}}.', 'いつでもね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 0, 'npc', 'You''re gripping the seat tightly.', '座席を強く握ってるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 1, 'user', 'Give me a sec to {simmer down}; turbulence scares me.', '少し落ち着かせて、乱気流が怖くて。', 'simmer down', (SELECT id FROM vocab_senses WHERE slug='simmer-down.phrv.calm'), ARRAY['simmer down','lash out','perk up','open up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 2, 'npc', 'Deep breaths help.', '深呼吸すると楽だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 3, 'user', 'Sorry if I {lash out}; I get snappy when scared.', '当たったらごめん、怖いと刺々しくなる。', 'lash out', (SELECT id FROM vocab_senses WHERE slug='lash-out.phrv.attack'), ARRAY['lash out','perk up','open up','well up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 4, 'npc', 'No worries at all.', '全然気にしないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 5, 'user', 'Thanks for letting me {open up} about it.', '打ち明けさせてくれてありがとう。', 'open up', (SELECT id FROM vocab_senses WHERE slug='open-up.phrv.confide'), ARRAY['open up','perk up','well up','simmer down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 6, 'npc', 'We land soon, look outside.', 'もうすぐ着く、外を見て。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 7, 'user', 'Oh, the view makes me {perk up}!', 'わあ、景色で元気が出る！', 'perk up', (SELECT id FROM vocab_senses WHERE slug='perk-up.phrv.cheer'), ARRAY['perk up','lash out','well up','simmer down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 8, 'npc', 'Beautiful, right?', 'きれいでしょ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 9, 'user', 'So pretty my eyes {well up} a little.', 'きれいすぎて少し涙が込み上げる。', 'well up', (SELECT id FROM vocab_senses WHERE slug='well-up.phrv.tears'), ARRAY['well up','lash out','perk up','simmer down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 10, 'npc', 'Happy tears are the best.', 'うれし涙は最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 11, 'user', 'Ha, I always {choke up} at landings.', 'はは、着陸でいつも言葉に詰まる。', 'choke up', (SELECT id FROM vocab_senses WHERE slug='choke-up.phrv.emotional'), ARRAY['choke up','lash out','perk up','simmer down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 12, 'npc', 'You did great.', 'よく頑張った。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 13, 'user', 'Thanks for the patience.', '付き合ってくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='travel'), 14, 'npc', 'Welcome to solid ground!', '地上へようこそ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 0, 'npc', 'That meeting got heated.', 'あの会議、白熱したね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 1, 'user', 'Yeah, I nearly {lash out} at the client.', 'うん、クライアントに感情をぶつけそうになった。', 'lash out', (SELECT id FROM vocab_senses WHERE slug='lash-out.phrv.attack'), ARRAY['lash out','simmer down','perk up','open up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 2, 'npc', 'But you stayed calm.', 'でも冷静を保った。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 3, 'user', 'I had to {simmer down} before replying.', '返す前に落ち着かないといけなかった。', 'simmer down', (SELECT id FROM vocab_senses WHERE slug='simmer-down.phrv.calm'), ARRAY['simmer down','lash out','perk up','open up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 4, 'npc', 'Good control. Were you short with the team after?', 'いい自制。その後チームにきつく当たった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 5, 'user', 'A little; I {snap at} an intern, I feel bad.', '少し、インターンに突っかかった、反省してる。', 'snap at', (SELECT id FROM vocab_senses WHERE slug='snap-at.phrv.snap'), ARRAY['snap at','simmer down','perk up','open up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 6, 'npc', 'Apologize; they''ll get it.', '謝れば分かってくれるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 7, 'user', 'I shouldn''t {bottle up} the pressure like this.', 'こんなふうにプレッシャーを抑え込むべきじゃない。', 'bottle up', (SELECT id FROM vocab_senses WHERE slug='bottle-up.phrv.suppress'), ARRAY['bottle up','simmer down','perk up','well up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 8, 'npc', 'Talk to me anytime.', 'いつでも話して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 9, 'user', 'Thanks, it helps to {open up} at work.', 'ありがとう、職場で心を開けると助かる。', 'open up', (SELECT id FROM vocab_senses WHERE slug='open-up.phrv.confide'), ARRAY['open up','lash out','perk up','well up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 10, 'npc', 'Coffee? On me.', 'コーヒー？おごるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 11, 'user', 'That would really {perk up} my afternoon.', 'それで午後がかなり元気になる。', 'perk up', (SELECT id FROM vocab_senses WHERE slug='perk-up.phrv.cheer'), ARRAY['perk up','lash out','snap at','bottle up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 12, 'npc', 'Let''s go.', '行こう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 13, 'user', 'Appreciate it.', 'ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-11') AND goal='business'), 14, 'npc', 'We''ve got your back, {{user_name}}.', '支えてるよ、{{user_name}}。', NULL, NULL, NULL);
