-- ============================================================================
-- Vocab 103 - apply ALL (C1): 16 lessons + 8 review capstones, published.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql (same tables).
-- Idempotent; wrapped in a transaction. Safe to re-run.
-- ============================================================================
BEGIN;

-- ===== seed-vocab-103-1.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-1 - Getting on & falling out  (Unit 1)
-- Words: drift apart, patch up, hit it off, warm to, take to, fall for, grow on, look down on.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('getting-on-c1', 'Getting on & falling out', '人付き合いの機微', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('drift apart', 'drift apart', '/drɪft əˈpɑːrt/', '/drɪft əˈpɑːt/', NULL, 5, FALSE, NULL),
  ('patch up', 'patch up', '/ˌpætʃ ˈʌp/', '/ˌpætʃ ˈʌp/', NULL, 5, FALSE, NULL),
  ('hit it off', 'hit it off', '/ˌhɪt ɪt ˈɔːf/', '/ˌhɪt ɪt ˈɒf/', NULL, 5, FALSE, NULL),
  ('warm to', 'warm to', '/ˈwɔːrm tuː/', '/ˈwɔːm tuː/', NULL, 5, FALSE, NULL),
  ('take to', 'take to', '/ˈteɪk tuː/', '/ˈteɪk tuː/', NULL, 5, FALSE, NULL),
  ('fall for', 'fall for', '/ˈfɔːl fɔːr/', '/ˈfɔːl fɔː/', NULL, 5, FALSE, NULL),
  ('grow on', 'grow on', '/ˈɡroʊ ɑːn/', '/ˈɡrəʊ ɒn/', NULL, 5, FALSE, NULL),
  ('look down on', 'look down on', '/ˌlʊk ˈdaʊn ɑːn/', '/ˌlʊk ˈdaʊn ɒn/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='drift apart'), 'drift-apart.phrv.distance', 1, TRUE, 'phrasal verb', '疎遠になる', 'to slowly become less close to someone', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='patch up'), 'patch-up.phrv.mend', 1, TRUE, 'phrasal verb', '（関係を）修復する', 'to repair a relationship after a quarrel', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hit it off'), 'hit-it-off.idiom.click', 1, TRUE, 'idiom', '意気投合する', 'to like each other as soon as you meet', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='warm to'), 'warm-to.phrv.like', 1, TRUE, 'phrasal verb', 'だんだん好きになる', 'to gradually start to like someone or an idea', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take to'), 'take-to.phrv.like2', 1, TRUE, 'phrasal verb', 'すぐに好きになる', 'to start to like someone quickly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fall for'), 'fall-for.phrv.love', 1, TRUE, 'phrasal verb', '惚れ込む', 'to fall in love with someone', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='grow on'), 'grow-on.phrv.appeal', 1, TRUE, 'phrasal verb', 'だんだん良く思えてくる', 'to become more likeable to you over time', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='look down on'), 'look-down-on.phrv.despise', 1, TRUE, 'phrasal verb', '見下す', 'to think you are better than someone', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('drift apart', 'patch up', 'hit it off', 'warm to', 'take to', 'fall for', 'grow on', 'look down on')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='warm-to.phrv.like'), (SELECT id FROM vocab_senses WHERE slug='take-to.phrv.like2'), NULL, 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='patch-up.phrv.mend'), (SELECT id FROM vocab_senses WHERE slug='drift-apart.phrv.distance'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='getting-on-c1'
WHERE s.slug IN ('drift-apart.phrv.distance', 'patch-up.phrv.mend', 'hit-it-off.idiom.click', 'warm-to.phrv.like', 'take-to.phrv.like2', 'fall-for.phrv.love', 'grow-on.phrv.appeal', 'look-down-on.phrv.despise')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-1', 1, 0, (SELECT id FROM vocab_categories WHERE slug='getting-on-c1'), 'Getting on & falling out', '仲良くなる・こじれる', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-1'), s.id, x.ord FROM (VALUES
  ('drift-apart.phrv.distance',0),('patch-up.phrv.mend',1),('hit-it-off.idiom.click',2),('warm-to.phrv.like',3),('take-to.phrv.like2',4),('fall-for.phrv.love',5),('grow-on.phrv.appeal',6),('look-down-on.phrv.despise',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-1'), 'conversation', 0, 'An old friendship', '昔の友情', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-1'), 'travel', 1, 'New faces at a hostel', 'ホステルの新しい仲間', 'hostel', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-1'), 'business', 2, 'A new manager', '新しいマネージャー', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 0, 'npc', 'Do you still talk to Mia?', 'まだミアと話す？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 1, 'user', 'Not much. We''ve started to {drift apart} lately.', 'あまり。最近疎遠になってきた。', 'drift apart', (SELECT id FROM vocab_senses WHERE slug='drift-apart.phrv.distance'), ARRAY['drift apart','patch up','grow on','look down on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 2, 'npc', 'That''s sad. What happened?', '寂しいね。何があったの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 3, 'user', 'A silly argument. I want to {patch up} things, though.', 'くだらない口論。でも修復したい。', 'patch up', (SELECT id FROM vocab_senses WHERE slug='patch-up.phrv.mend'), ARRAY['patch up','drift apart','look down on','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 4, 'npc', 'You two were so close.', 'あんなに仲良かったのに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 5, 'user', 'We did {hit it off} instantly back then.', '昔は一瞬で意気投合したんだ。', 'hit it off', (SELECT id FROM vocab_senses WHERE slug='hit-it-off.idiom.click'), ARRAY['hit it off','drift apart','look down on','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 6, 'npc', 'Is she still with that guy?', '彼女、まだあの人と？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 7, 'user', 'Yeah, she really did {fall for} him.', 'うん、本気で惚れ込んでた。', 'fall for', (SELECT id FROM vocab_senses WHERE slug='fall-for.phrv.love'), ARRAY['fall for','patch up','drift apart','look down on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 8, 'npc', 'He seemed a bit arrogant.', '彼、ちょっと横柄だったよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 9, 'user', 'True, he tends to {look down on} people.', '確かに、人を見下しがち。', 'look down on', (SELECT id FROM vocab_senses WHERE slug='look-down-on.phrv.despise'), ARRAY['look down on','patch up','drift apart','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 10, 'npc', 'Not a great match, then.', 'じゃあ、あまり合ってない？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 11, 'user', 'I don''t know; he might {grow on} you.', 'どうかな、付き合ううちに良く思えてくるかも。', 'grow on', (SELECT id FROM vocab_senses WHERE slug='grow-on.phrv.appeal'), ARRAY['grow on','patch up','drift apart','look down on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 12, 'npc', 'Maybe. Reach out to Mia.', 'かもね。ミアに連絡しなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 13, 'user', 'I will, tonight.', 'うん、今夜する。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='conversation'), 14, 'npc', 'Good. Let me know, {{user_name}}.', 'いいね。教えて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 0, 'npc', 'You''ve made friends fast here!', 'ここですぐ友達作ったね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 1, 'user', 'Yeah, we all {hit it off} on day one.', 'うん、初日にみんな意気投合した。', 'hit it off', (SELECT id FROM vocab_senses WHERE slug='hit-it-off.idiom.click'), ARRAY['hit it off','drift apart','look down on','warm to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 2, 'npc', 'The group is really mixed.', 'いろんな人がいるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 3, 'user', 'I instantly {take to} the couple from Brazil.', 'ブラジルのカップルはすぐ好きになった。', 'take to', (SELECT id FROM vocab_senses WHERE slug='take-to.phrv.like2'), ARRAY['take to','drift apart','look down on','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 4, 'npc', 'And the quiet guy?', 'あの無口な人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 5, 'user', 'I''m slowly starting to {warm to} him.', '少しずつ彼を好きになってきてる。', 'warm to', (SELECT id FROM vocab_senses WHERE slug='warm-to.phrv.like'), ARRAY['warm to','drift apart','look down on','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 6, 'npc', 'He grew on me too.', '私も彼を好きになってきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 7, 'user', 'Right? People like him {grow on} you.', 'でしょ？ああいう人はじわじわ良くなる。', 'grow on', (SELECT id FROM vocab_senses WHERE slug='grow-on.phrv.appeal'), ARRAY['grow on','drift apart','look down on','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 8, 'npc', 'Sad we all leave soon.', 'もうすぐみんな旅立つの寂しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 9, 'user', 'Yeah, travel friends often {drift apart} after.', 'うん、旅の友達ってその後疎遠になりがち。', 'drift apart', (SELECT id FROM vocab_senses WHERE slug='drift-apart.phrv.distance'), ARRAY['drift apart','take to','look down on','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 10, 'npc', 'Not if we keep in touch.', '連絡を取り合えば大丈夫。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 11, 'user', 'Agreed. Nobody here would {look down on} anyone.', '賛成。ここは誰も人を見下さない。', 'look down on', (SELECT id FROM vocab_senses WHERE slug='look-down-on.phrv.despise'), ARRAY['look down on','take to','drift apart','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 12, 'npc', 'That''s why it''s special.', 'だから特別なんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 13, 'user', 'Best trip ever.', '最高の旅。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='travel'), 14, 'npc', 'Cheers to that!', '乾杯！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 0, 'npc', 'How''s the new manager settling in?', '新しいマネージャー、馴染んでる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 1, 'user', 'Well. The team {hit it off} with her quickly.', 'いい感じ。チームはすぐ彼女と意気投合した。', 'hit it off', (SELECT id FROM vocab_senses WHERE slug='hit-it-off.idiom.click'), ARRAY['hit it off','drift apart','look down on','patch up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 2, 'npc', 'Good, first impressions matter.', 'いいね、第一印象は大事。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 3, 'user', 'Some were unsure, but they''re starting to {warm to} her.', '最初は半信半疑だったけど、だんだん好きになってきてる。', 'warm to', (SELECT id FROM vocab_senses WHERE slug='warm-to.phrv.like'), ARRAY['warm to','drift apart','look down on','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 4, 'npc', 'Any friction?', '摩擦はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 5, 'user', 'She never seems to {look down on} junior staff.', '彼女は若手を見下したりしない。', 'look down on', (SELECT id FROM vocab_senses WHERE slug='look-down-on.phrv.despise'), ARRAY['look down on','patch up','drift apart','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 6, 'npc', 'That earns respect.', 'それは尊敬されるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 7, 'user', 'She even helped {patch up} a conflict between two leads.', 'リーダー2人の対立の修復まで手伝った。', 'patch up', (SELECT id FROM vocab_senses WHERE slug='patch-up.phrv.mend'), ARRAY['patch up','drift apart','look down on','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 8, 'npc', 'Impressive. And her ideas?', '立派。アイデアは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 9, 'user', 'Bold at first, but they {grow on} you.', '最初は大胆だけど、だんだん良く思えてくる。', 'grow on', (SELECT id FROM vocab_senses WHERE slug='grow-on.phrv.appeal'), ARRAY['grow on','patch up','drift apart','look down on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 10, 'npc', 'Do clients like her?', 'クライアントは好き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 11, 'user', 'Yes, they {take to} her straight away.', 'うん、みんなすぐ彼女を気に入る。', 'take to', (SELECT id FROM vocab_senses WHERE slug='take-to.phrv.like2'), ARRAY['take to','patch up','drift apart','look down on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 12, 'npc', 'Sounds like a great hire.', 'いい採用だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 13, 'user', 'Best in years.', 'ここ数年で一番。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-1') AND goal='business'), 14, 'npc', 'Glad to hear it, {{user_name}}.', 'よかった、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-2.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-2 - Describing character  (Unit 1)
-- Words: come across, stand out, down-to-earth, easygoing, level-headed, strong-willed, self-conscious, laid-back.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('describing-character-c1', 'Describing character', '人柄を表す', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('come across', 'come across', '/ˌkʌm əˈkrɔːs/', '/ˌkʌm əˈkrɒs/', NULL, 5, FALSE, NULL),
  ('stand out', 'stand out', '/ˌstænd ˈaʊt/', '/ˌstænd ˈaʊt/', NULL, 5, FALSE, NULL),
  ('down-to-earth', 'down-to-earth', '/ˌdaʊn tu ˈɜːrθ/', '/ˌdaʊn tu ˈɜːθ/', NULL, 5, FALSE, NULL),
  ('easygoing', 'easygoing', '/ˌiːziˈɡoʊɪŋ/', '/ˌiːziˈɡəʊɪŋ/', NULL, 5, FALSE, NULL),
  ('level-headed', 'level-headed', '/ˌlevl ˈhedɪd/', '/ˌlevl ˈhedɪd/', NULL, 5, FALSE, NULL),
  ('strong-willed', 'strong-willed', '/ˌstrɔːŋ ˈwɪld/', '/ˌstrɒŋ ˈwɪld/', NULL, 5, FALSE, NULL),
  ('self-conscious', 'self-conscious', '/ˌself ˈkɑːnʃəs/', '/ˌself ˈkɒnʃəs/', NULL, 5, FALSE, NULL),
  ('laid-back', 'laid-back', '/ˌleɪd ˈbæk/', '/ˌleɪd ˈbæk/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='come across'), 'come-across.phrv.seem', 1, TRUE, 'phrasal verb', '（…という）印象を与える', 'to seem or appear a certain way to others', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stand out'), 'stand-out.phrv.notable', 1, TRUE, 'phrasal verb', '目立つ', 'to be noticeably better or different', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='down-to-earth'), 'down-to-earth.adj.practical', 1, TRUE, 'idiom', '現実的で気取らない', 'practical and honest; not proud', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='easygoing'), 'easygoing.adj.relaxed', 1, TRUE, 'adjective', 'おおらかな', 'relaxed and tolerant; not easily upset', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='level-headed'), 'level-headed.adj.calm', 1, TRUE, 'adjective', '冷静で分別のある', 'calm and sensible, even under pressure', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='strong-willed'), 'strong-willed.adj.determined', 1, TRUE, 'adjective', '意志が強い', 'determined; not easily persuaded', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='self-conscious'), 'self-conscious.adj.shy', 1, TRUE, 'adjective', '人目を気にする', 'worried about what others think of you', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='laid-back'), 'laid-back.adj.relaxed2', 1, TRUE, 'adjective', 'のんびりした', 'calm and not easily worried or stressed', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('come across', 'stand out', 'down-to-earth', 'easygoing', 'level-headed', 'strong-willed', 'self-conscious', 'laid-back')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='describing-character-c1'
WHERE s.slug IN ('come-across.phrv.seem', 'stand-out.phrv.notable', 'down-to-earth.adj.practical', 'easygoing.adj.relaxed', 'level-headed.adj.calm', 'strong-willed.adj.determined', 'self-conscious.adj.shy', 'laid-back.adj.relaxed2')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-2', 1, 1, (SELECT id FROM vocab_categories WHERE slug='describing-character-c1'), 'Describing character', '人柄を描写する', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-2'), s.id, x.ord FROM (VALUES
  ('come-across.phrv.seem',0),('stand-out.phrv.notable',1),('down-to-earth.adj.practical',2),('easygoing.adj.relaxed',3),('level-headed.adj.calm',4),('strong-willed.adj.determined',5),('self-conscious.adj.shy',6),('laid-back.adj.relaxed2',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-2'), 'conversation', 0, 'How the date went', 'デートの感想', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-2'), 'travel', 1, 'Travel companions', '旅の仲間', 'hostel', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-2'), 'business', 2, 'Assessing a candidate', '候補者の評価', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 0, 'npc', 'How was your date with Leo?', 'レオとのデートどうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 1, 'user', 'Good! He can {come across} as really genuine.', 'よかった！すごく誠実な印象を与える人。', 'come across', (SELECT id FROM vocab_senses WHERE slug='come-across.phrv.seem'), ARRAY['come across','stand out','take to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 2, 'npc', 'Nice. Confident guy?', 'いいね。自信ある感じ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 3, 'user', 'A bit {self-conscious}, actually; he kept fixing his hair.', '実はちょっと人目を気にしてた、ずっと髪を直してて。', 'self-conscious', (SELECT id FROM vocab_senses WHERE slug='self-conscious.adj.shy'), ARRAY['self-conscious','easygoing','down-to-earth','laid-back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 4, 'npc', 'Aw. Was he pretentious?', 'そう。気取ってた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 5, 'user', 'No, very {down-to-earth}; no showing off.', 'ううん、すごく気取らない、見栄も張らない。', 'down-to-earth', (SELECT id FROM vocab_senses WHERE slug='down-to-earth.adj.practical'), ARRAY['down-to-earth','strong-willed','self-conscious','level-headed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 6, 'npc', 'Does he know what he wants?', '彼、自分の意志ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 7, 'user', 'Definitely {strong-willed}; he''s very determined.', '間違いなく意志が強い、すごく芯がある。', 'strong-willed', (SELECT id FROM vocab_senses WHERE slug='strong-willed.adj.determined'), ARRAY['strong-willed','easygoing','self-conscious','laid-back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 8, 'npc', 'Did he seem special?', '特別な感じだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 9, 'user', 'Yeah, he really did {stand out} from other dates.', 'うん、他のデート相手より際立ってた。', 'stand out', (SELECT id FROM vocab_senses WHERE slug='stand-out.phrv.notable'), ARRAY['stand out','come across','take to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 10, 'npc', 'Easy to talk to?', '話しやすかった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 11, 'user', 'So {easygoing}; nothing bothered him.', 'すごくおおらか、何も気にしない。', 'easygoing', (SELECT id FROM vocab_senses WHERE slug='easygoing.adj.relaxed'), ARRAY['easygoing','strong-willed','self-conscious','down-to-earth']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 12, 'npc', 'Second date, then?', 'じゃあ2回目は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 13, 'user', 'For sure!', 'もちろん！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 14, 'npc', 'Yay! Tell me after, {{user_name}}.', 'やった！また教えて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 0, 'npc', 'How''s your travel group?', '旅のグループはどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 1, 'user', 'Really {laid-back}; no one stresses about plans.', 'すごくのんびり、誰も予定でピリピリしない。', 'laid-back', (SELECT id FROM vocab_senses WHERE slug='laid-back.adj.relaxed2'), ARRAY['laid-back','strong-willed','self-conscious','down-to-earth']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 2, 'npc', 'Nice. Anyone take charge?', 'いいね。仕切る人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 3, 'user', 'One guy is super {level-headed}; he stays calm in any crisis.', '一人すごく冷静で、どんな時も落ち着いてる。', 'level-headed', (SELECT id FROM vocab_senses WHERE slug='level-headed.adj.calm'), ARRAY['level-headed','self-conscious','strong-willed','easygoing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 4, 'npc', 'Handy on the road.', '旅では助かるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 5, 'user', 'And the others are {easygoing}; happy with anything.', '他のみんなはおおらかで、何でもOK。', 'easygoing', (SELECT id FROM vocab_senses WHERE slug='easygoing.adj.relaxed'), ARRAY['easygoing','strong-willed','self-conscious','level-headed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 6, 'npc', 'Anyone shy?', '恥ずかしがりな人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 7, 'user', 'One girl is a bit {self-conscious} in photos.', '一人、写真だと少し人目を気にする。', 'self-conscious', (SELECT id FROM vocab_senses WHERE slug='self-conscious.adj.shy'), ARRAY['self-conscious','laid-back','level-headed','strong-willed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 8, 'npc', 'How do you seem to them?', '君はどう見られてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 9, 'user', 'I hope I {come across} as friendly.', 'フレンドリーな印象だといいな。', 'come across', (SELECT id FROM vocab_senses WHERE slug='come-across.phrv.seem'), ARRAY['come across','stand out','warm to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 10, 'npc', 'You do! You''re memorable.', 'そうだよ！印象に残る。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 11, 'user', 'Thanks. I try to {stand out} in a good way.', 'ありがとう。いい意味で目立ちたい。', 'stand out', (SELECT id FROM vocab_senses WHERE slug='stand-out.phrv.notable'), ARRAY['stand out','come across','take to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 12, 'npc', 'You definitely do.', '間違いなくそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 13, 'user', 'Aw, thanks!', 'うれしい、ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 14, 'npc', 'Let''s plan tomorrow!', '明日の計画立てよう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 0, 'npc', 'What did you think of the candidate?', 'あの候補者どう思った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 1, 'user', 'She can {come across} as very professional.', 'とてもプロフェッショナルな印象を与える。', 'come across', (SELECT id FROM vocab_senses WHERE slug='come-across.phrv.seem'), ARRAY['come across','stand out','warm to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 2, 'npc', 'Calm under pressure?', 'プレッシャーに強い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 3, 'user', 'Very {level-headed}; she stayed calm in the tough questions.', 'とても冷静、難しい質問でも落ち着いてた。', 'level-headed', (SELECT id FROM vocab_senses WHERE slug='level-headed.adj.calm'), ARRAY['level-headed','self-conscious','laid-back','easygoing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 4, 'npc', 'Does she push back?', '意見を主張する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 5, 'user', 'Yes, {strong-willed}; she defends her ideas well.', 'うん、意志が強い、自分の考えをしっかり守る。', 'strong-willed', (SELECT id FROM vocab_senses WHERE slug='strong-willed.adj.determined'), ARRAY['strong-willed','self-conscious','laid-back','easygoing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 6, 'npc', 'Did she impress?', '印象に残った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 7, 'user', 'She really did {stand out} among the applicants.', '応募者の中で際立ってた。', 'stand out', (SELECT id FROM vocab_senses WHERE slug='stand-out.phrv.notable'), ARRAY['stand out','come across','warm to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 8, 'npc', 'Approachable?', '話しかけやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 9, 'user', 'Yes, very {down-to-earth}; no arrogance at all.', 'うん、すごく気取らない、傲慢さゼロ。', 'down-to-earth', (SELECT id FROM vocab_senses WHERE slug='down-to-earth.adj.practical'), ARRAY['down-to-earth','self-conscious','strong-willed','level-headed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 10, 'npc', 'Would she fit our relaxed culture?', 'うちのゆるい社風に合う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 11, 'user', 'I think so; she seemed fairly {laid-back} too.', '合うと思う、結構のんびりもしてた。', 'laid-back', (SELECT id FROM vocab_senses WHERE slug='laid-back.adj.relaxed2'), ARRAY['laid-back','strong-willed','self-conscious','down-to-earth']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 12, 'npc', 'Let''s make an offer.', 'オファーを出そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 13, 'user', 'Agreed.', '賛成。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 14, 'npc', 'Great call, {{user_name}}.', 'いい判断、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-3.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-3 - Making a point  (Unit 2)
-- Words: get at, play down, touch on, sum up, put across, gloss over, single out, harp on.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('making-a-point', 'Making a point', '主張を伝える', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('get at', 'get at', '/ˈɡet æt/', '/ˈɡet æt/', NULL, 5, FALSE, NULL),
  ('play down', 'play down', '/ˌpleɪ ˈdaʊn/', '/ˌpleɪ ˈdaʊn/', NULL, 5, FALSE, NULL),
  ('touch on', 'touch on', '/ˈtʌtʃ ɑːn/', '/ˈtʌtʃ ɒn/', NULL, 5, FALSE, NULL),
  ('sum up', 'sum up', '/ˌsʌm ˈʌp/', '/ˌsʌm ˈʌp/', NULL, 5, FALSE, NULL),
  ('put across', 'put across', '/ˌpʊt əˈkrɔːs/', '/ˌpʊt əˈkrɒs/', NULL, 5, FALSE, NULL),
  ('gloss over', 'gloss over', '/ˌɡlɑːs ˈoʊvər/', '/ˌɡlɒs ˈəʊvə/', NULL, 5, FALSE, NULL),
  ('single out', 'single out', '/ˌsɪŋɡl ˈaʊt/', '/ˌsɪŋɡl ˈaʊt/', NULL, 5, FALSE, NULL),
  ('harp on', 'harp on', '/ˈhɑːrp ɑːn/', '/ˈhɑːp ɒn/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='get at'), 'get-at.phrv.imply', 1, TRUE, 'phrasal verb', '言おうとする', 'to try to say or suggest something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='play down'), 'play-down.phrv.minimize', 1, TRUE, 'phrasal verb', '軽く扱う', 'to make something seem less important than it is', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='touch on'), 'touch-on.phrv.mention', 1, TRUE, 'phrasal verb', '軽く触れる', 'to mention something briefly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sum up'), 'sum-up.phrv.summarize', 1, TRUE, 'phrasal verb', '要約する', 'to state the main points briefly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put across'), 'put-across.phrv.convey', 1, TRUE, 'phrasal verb', '（考えを）伝える', 'to communicate an idea so people understand it', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gloss over'), 'gloss-over.phrv.evade', 1, TRUE, 'phrasal verb', 'ごまかす', 'to avoid discussing something fully', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='single out'), 'single-out.phrv.select', 1, TRUE, 'phrasal verb', '一つだけ取り上げる', 'to choose one person or thing from a group', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='harp on'), 'harp-on.phrv.dwell', 1, TRUE, 'phrasal verb', 'くどくど言う', 'to keep talking about something in an annoying way', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('get at', 'play down', 'touch on', 'sum up', 'put across', 'gloss over', 'single out', 'harp on')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='making-a-point'
WHERE s.slug IN ('get-at.phrv.imply', 'play-down.phrv.minimize', 'touch-on.phrv.mention', 'sum-up.phrv.summarize', 'put-across.phrv.convey', 'gloss-over.phrv.evade', 'single-out.phrv.select', 'harp-on.phrv.dwell')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-3', 2, 0, (SELECT id FROM vocab_categories WHERE slug='making-a-point'), 'Making a point', '言いたいことを伝える', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-3'), s.id, x.ord FROM (VALUES
  ('get-at.phrv.imply',0),('play-down.phrv.minimize',1),('touch-on.phrv.mention',2),('sum-up.phrv.summarize',3),('put-across.phrv.convey',4),('gloss-over.phrv.evade',5),('single-out.phrv.select',6),('harp-on.phrv.dwell',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-3'), 'conversation', 0, 'A disagreement', '意見の食い違い', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-3'), 'travel', 1, 'Tour plan questions', 'ツアー計画の疑問', 'agency', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-3'), 'business', 2, 'Prepping a presentation', 'プレゼンの準備', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 0, 'npc', 'You seem unsure about my idea.', '私の案に自信なさそうだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 1, 'user', 'I''m not sure what you {get at}, honestly.', '正直、何を言おうとしてるのか分からなくて。', 'get at', (SELECT id FROM vocab_senses WHERE slug='get-at.phrv.imply'), ARRAY['get at','play down','sum up','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 2, 'npc', 'Let me explain it better.', 'もっとちゃんと説明するね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 3, 'user', 'Please. You didn''t quite {put across} the main point.', 'お願い。要点がうまく伝わってなかった。', 'put across', (SELECT id FROM vocab_senses WHERE slug='put-across.phrv.convey'), ARRAY['put across','gloss over','single out','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 4, 'npc', 'Okay. The risk is small.', 'わかった。リスクは小さいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 5, 'user', 'I feel you {play down} the danger, though.', 'でも危険を軽く見てる気がする。', 'play down', (SELECT id FROM vocab_senses WHERE slug='play-down.phrv.minimize'), ARRAY['play down','sum up','touch on','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 6, 'npc', 'Maybe. What worries you most?', 'かもね。何が一番心配？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 7, 'user', 'You {gloss over} the budget completely.', '予算を完全にスルーしてる。', 'gloss over', (SELECT id FROM vocab_senses WHERE slug='gloss-over.phrv.evade'), ARRAY['gloss over','sum up','touch on','single out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 8, 'npc', 'Fair. Let''s be thorough.', 'なるほど。ちゃんとやろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 9, 'user', 'Can you {sum up} the whole plan first?', 'まず計画全体を要約してくれる？', 'sum up', (SELECT id FROM vocab_senses WHERE slug='sum-up.phrv.summarize'), ARRAY['sum up','harp on','single out','touch on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 10, 'npc', 'Sure, in three lines.', 'いいよ、3行で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 11, 'user', 'Thanks. I don''t want to {harp on}, but details matter.', 'ありがとう。くどくど言いたくないけど、細部は大事。', 'harp on', (SELECT id FROM vocab_senses WHERE slug='harp-on.phrv.dwell'), ARRAY['harp on','sum up','single out','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 12, 'npc', 'Understood. Details it is.', '了解。細部を詰めよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 13, 'user', 'Great, let''s dig in.', 'よし、取りかかろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 14, 'npc', 'Good talk, {{user_name}}.', 'いい話し合いだね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 0, 'npc', 'Any concerns about the tour plan?', 'ツアー計画で気になることは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 1, 'user', 'The guide only did {touch on} the safety rules.', 'ガイドは安全ルールに軽く触れただけで。', 'touch on', (SELECT id FROM vocab_senses WHERE slug='touch-on.phrv.mention'), ARRAY['touch on','single out','sum up','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 2, 'npc', 'You want more detail?', 'もっと詳しく？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 3, 'user', 'Yes, could you {sum up} the daily schedule?', 'はい、一日の予定を要約してもらえますか？', 'sum up', (SELECT id FROM vocab_senses WHERE slug='sum-up.phrv.summarize'), ARRAY['sum up','single out','harp on','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 4, 'npc', 'Morning hikes, afternoon free.', '午前はハイキング、午後は自由。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 5, 'user', 'Can you {single out} the optional paid activities?', '有料オプションだけ挙げてもらえますか？', 'single out', (SELECT id FROM vocab_senses WHERE slug='single-out.phrv.select'), ARRAY['single out','play down','sum up','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 6, 'npc', 'Sure: the boat trip and the spa.', 'はい、ボートとスパです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 7, 'user', 'The brochure seems to {play down} those fees.', 'パンフはその料金を軽く扱ってる気がします。', 'play down', (SELECT id FROM vocab_senses WHERE slug='play-down.phrv.minimize'), ARRAY['play down','sum up','touch on','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 8, 'npc', 'You''re right, they''re extra.', 'その通り、別料金です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 9, 'user', 'Just {put across} all costs upfront next time.', '次回は全費用を最初に明確に伝えてください。', 'put across', (SELECT id FROM vocab_senses WHERE slug='put-across.phrv.convey'), ARRAY['put across','sum up','touch on','single out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 10, 'npc', 'Noted. Transparency helps.', '了解。透明性は大事ですね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 11, 'user', 'Exactly. Don''t {gloss over} the extras.', 'そう。追加分をごまかさないで。', 'gloss over', (SELECT id FROM vocab_senses WHERE slug='gloss-over.phrv.evade'), ARRAY['gloss over','sum up','touch on','single out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 12, 'npc', 'Understood, all clear now.', '了解、すべて明確です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 13, 'user', 'Perfect, thanks.', '完璧、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 14, 'npc', 'Enjoy the tour!', 'ツアーを楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 0, 'npc', 'Ready for the board presentation?', '役員会のプレゼン、準備できてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 1, 'user', 'Almost. I''ll {sum up} the quarter in one slide.', 'もう少し。四半期を1枚に要約する。', 'sum up', (SELECT id FROM vocab_senses WHERE slug='sum-up.phrv.summarize'), ARRAY['sum up','harp on','single out','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 2, 'npc', 'Good. Keep it clear.', 'いいね。分かりやすく。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 3, 'user', 'I want to {put across} the growth story simply.', '成長のストーリーをシンプルに伝えたい。', 'put across', (SELECT id FROM vocab_senses WHERE slug='put-across.phrv.convey'), ARRAY['put across','gloss over','single out','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 4, 'npc', 'Any weak numbers?', '弱い数字は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 5, 'user', 'One dip; I won''t {play down} it, just explain it.', '一つ落ち込みが。軽く扱わず、ちゃんと説明する。', 'play down', (SELECT id FROM vocab_senses WHERE slug='play-down.phrv.minimize'), ARRAY['play down','sum up','touch on','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 6, 'npc', 'Honesty is better. Highlight a star?', '正直がいい。目玉は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 7, 'user', 'Yes, I''ll {single out} the top region.', 'うん、一番の地域だけ取り上げる。', 'single out', (SELECT id FROM vocab_senses WHERE slug='single-out.phrv.select'), ARRAY['single out','sum up','touch on','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 8, 'npc', 'And the new project?', '新プロジェクトは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 9, 'user', 'I''ll just {touch on} it briefly for now.', '今は軽く触れるだけにする。', 'touch on', (SELECT id FROM vocab_senses WHERE slug='touch-on.phrv.mention'), ARRAY['touch on','sum up','single out','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 10, 'npc', 'Don''t over-explain.', '説明しすぎないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 11, 'user', 'Right, I won''t {harp on} one topic.', 'うん、一つの話題をくどくど言わない。', 'harp on', (SELECT id FROM vocab_senses WHERE slug='harp-on.phrv.dwell'), ARRAY['harp on','sum up','single out','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 12, 'npc', 'You''ll nail it.', 'うまくいくよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 13, 'user', 'Fingers crossed.', 'うまくいきますように。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 14, 'npc', 'You''ve got this, {{user_name}}.', '大丈夫、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-4.sql =====
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

-- ===== seed-vocab-103-5.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-5 - Getting things done  (Unit 3)
-- Words: nail down, draw up, roll out, follow through, hammer out, flesh out, map out, iron out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('getting-things-done-c1', 'Getting things done', '物事を進める', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('nail down', 'nail down', '/ˌneɪl ˈdaʊn/', '/ˌneɪl ˈdaʊn/', NULL, 5, FALSE, NULL),
  ('draw up', 'draw up', '/ˌdrɔː ˈʌp/', '/ˌdrɔː ˈʌp/', NULL, 5, FALSE, NULL),
  ('roll out', 'roll out', '/ˌroʊl ˈaʊt/', '/ˌrəʊl ˈaʊt/', NULL, 5, FALSE, NULL),
  ('follow through', 'follow through', '/ˌfɑːloʊ ˈθruː/', '/ˌfɒləʊ ˈθruː/', NULL, 5, FALSE, NULL),
  ('hammer out', 'hammer out', '/ˌhæmər ˈaʊt/', '/ˌhæmə ˈaʊt/', NULL, 5, FALSE, NULL),
  ('flesh out', 'flesh out', '/ˌfleʃ ˈaʊt/', '/ˌfleʃ ˈaʊt/', NULL, 5, FALSE, NULL),
  ('map out', 'map out', '/ˌmæp ˈaʊt/', '/ˌmæp ˈaʊt/', NULL, 5, FALSE, NULL),
  ('iron out', 'iron out', '/ˌaɪərn ˈaʊt/', '/ˌaɪən ˈaʊt/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='nail down'), 'nail-down.phrv.finalize', 1, TRUE, 'phrasal verb', '（詳細を）確定する', 'to agree or decide something exactly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='draw up'), 'draw-up.phrv.prepare', 1, TRUE, 'phrasal verb', '（書類などを）作成する', 'to prepare a document, plan, or list', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='roll out'), 'roll-out.phrv.launch', 1, TRUE, 'phrasal verb', '展開する', 'to introduce a new product or plan', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='follow through'), 'follow-through.phrv.complete', 1, TRUE, 'phrasal verb', '最後までやり遂げる', 'to finish something you have started', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hammer out'), 'hammer-out.phrv.negotiate', 1, TRUE, 'phrasal verb', '話し合ってまとめる', 'to reach an agreement after long discussion', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='flesh out'), 'flesh-out.phrv.detail', 1, TRUE, 'phrasal verb', '肉付けする', 'to add more detail to a plan or idea', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='map out'), 'map-out.phrv.plan', 1, TRUE, 'phrasal verb', '綿密に計画する', 'to plan something carefully in advance', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='iron out'), 'iron-out.phrv.resolve', 1, TRUE, 'phrasal verb', '（問題を）解決する', 'to solve small problems or difficulties', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('nail down', 'draw up', 'roll out', 'follow through', 'hammer out', 'flesh out', 'map out', 'iron out')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='getting-things-done-c1'
WHERE s.slug IN ('nail-down.phrv.finalize', 'draw-up.phrv.prepare', 'roll-out.phrv.launch', 'follow-through.phrv.complete', 'hammer-out.phrv.negotiate', 'flesh-out.phrv.detail', 'map-out.phrv.plan', 'iron-out.phrv.resolve')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-5', 3, 0, (SELECT id FROM vocab_categories WHERE slug='getting-things-done-c1'), 'Getting things done', '仕事を前に進める', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-5'), s.id, x.ord FROM (VALUES
  ('nail-down.phrv.finalize',0),('draw-up.phrv.prepare',1),('roll-out.phrv.launch',2),('follow-through.phrv.complete',3),('hammer-out.phrv.negotiate',4),('flesh-out.phrv.detail',5),('map-out.phrv.plan',6),('iron-out.phrv.resolve',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-5'), 'conversation', 0, 'Planning a side project', 'サイドプロジェクトの計画', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-5'), 'travel', 1, 'Organizing a group trip', 'グループ旅行の準備', 'home', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-5'), 'business', 2, 'A product launch', '製品ローンチ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 0, 'npc', 'You''re starting a podcast?', 'ポッドキャスト始めるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 1, 'user', 'Yeah, I need to {map out} the first season.', 'うん、まず第1シーズンを綿密に計画しないと。', 'map out', (SELECT id FROM vocab_senses WHERE slug='map-out.phrv.plan'), ARRAY['map out','flesh out','nail down','iron out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 2, 'npc', 'How many episodes?', '何話にするの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 3, 'user', 'I still have to {nail down} the number.', 'まだ本数を確定してないんだ。', 'nail down', (SELECT id FROM vocab_senses WHERE slug='nail-down.phrv.finalize'), ARRAY['nail down','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 4, 'npc', 'Got a topic list?', 'トピック一覧はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 5, 'user', 'A rough one; I''ll {flesh out} each idea.', 'ざっくりね。各アイデアを肉付けするよ。', 'flesh out', (SELECT id FROM vocab_senses WHERE slug='flesh-out.phrv.detail'), ARRAY['flesh out','roll out','nail down','iron out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 6, 'npc', 'Any guests?', 'ゲストは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 7, 'user', 'Yes, I''ll {draw up} a guest wishlist.', 'うん、呼びたいゲストのリストを作る。', 'draw up', (SELECT id FROM vocab_senses WHERE slug='draw-up.phrv.prepare'), ARRAY['draw up','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 8, 'npc', 'Cool. When do you launch?', 'いいね。いつ公開？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 9, 'user', 'Soon, if I actually {follow through} this time!', '近いうち、今度こそやり遂げれば！', 'follow through', (SELECT id FROM vocab_senses WHERE slug='follow-through.phrv.complete'), ARRAY['follow through','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 10, 'npc', 'You will. Any tech issues?', 'できるよ。技術的な問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 11, 'user', 'A few; I''ll {iron out} the audio problems.', '少し。音声の問題を解決する。', 'iron out', (SELECT id FROM vocab_senses WHERE slug='iron-out.phrv.resolve'), ARRAY['iron out','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 12, 'npc', 'Can''t wait to listen!', '聴くの楽しみ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 13, 'user', 'I''ll send you episode one.', '第1話送るね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 14, 'npc', 'Please do, {{user_name}}!', 'ぜひ、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 0, 'npc', 'This group trip needs organizing.', 'このグループ旅行、整理が必要だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 1, 'user', 'I''ll {map out} the route for all five days.', '5日間のルートを綿密に計画するよ。', 'map out', (SELECT id FROM vocab_senses WHERE slug='map-out.phrv.plan'), ARRAY['map out','flesh out','nail down','iron out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 2, 'npc', 'People disagree on the budget.', '予算で意見が割れてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 3, 'user', 'We''ll {hammer out} a budget everyone accepts.', 'みんなが納得する予算を話し合ってまとめよう。', 'hammer out', (SELECT id FROM vocab_senses WHERE slug='hammer-out.phrv.negotiate'), ARRAY['hammer out','roll out','nail down','follow through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 4, 'npc', 'And the dates?', '日程は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 5, 'user', 'Let''s {nail down} the exact dates tonight.', '今夜、正確な日程を確定しよう。', 'nail down', (SELECT id FROM vocab_senses WHERE slug='nail-down.phrv.finalize'), ARRAY['nail down','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 6, 'npc', 'Some want a printed plan.', '印刷した計画がほしい人も。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 7, 'user', 'Sure, I''ll {draw up} an itinerary document.', '了解、旅程の書類を作るよ。', 'draw up', (SELECT id FROM vocab_senses WHERE slug='draw-up.phrv.prepare'), ARRAY['draw up','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 8, 'npc', 'There are a few booking clashes.', '予約が少しかぶってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 9, 'user', 'I''ll {iron out} the overlaps with the hotel.', 'ホテルと調整して重複を解決する。', 'iron out', (SELECT id FROM vocab_senses WHERE slug='iron-out.phrv.resolve'), ARRAY['iron out','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 10, 'npc', 'Then we tell everyone?', 'それからみんなに伝える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 11, 'user', 'Yes, we {roll out} the final plan to the group.', 'うん、最終案をグループに展開する。', 'roll out', (SELECT id FROM vocab_senses WHERE slug='roll-out.phrv.launch'), ARRAY['roll out','nail down','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 12, 'npc', 'Great teamwork!', 'いい連携！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 13, 'user', 'Almost sorted.', 'ほぼ片付いた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 14, 'npc', 'Amazing, thanks!', '最高、ありがとう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 0, 'npc', 'Are we ready to launch the app?', 'アプリをローンチする準備できてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 1, 'user', 'Almost. We {roll out} to beta users Friday.', 'もう少し。金曜にベータユーザーへ展開する。', 'roll out', (SELECT id FROM vocab_senses WHERE slug='roll-out.phrv.launch'), ARRAY['roll out','nail down','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 2, 'npc', 'Is the pricing set?', '価格は決まった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 3, 'user', 'Not fully; we must {nail down} the tiers.', '完全には。料金プランを確定しないと。', 'nail down', (SELECT id FROM vocab_senses WHERE slug='nail-down.phrv.finalize'), ARRAY['nail down','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 4, 'npc', 'The marketing plan is thin.', 'マーケ計画が薄いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 5, 'user', 'I''ll {flesh out} the campaign this week.', '今週キャンペーンを肉付けする。', 'flesh out', (SELECT id FROM vocab_senses WHERE slug='flesh-out.phrv.detail'), ARRAY['flesh out','roll out','nail down','iron out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 6, 'npc', 'Legal has concerns.', '法務が懸念してる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 7, 'user', 'We''ll {hammer out} the terms with them.', '彼らと条件を話し合ってまとめる。', 'hammer out', (SELECT id FROM vocab_senses WHERE slug='hammer-out.phrv.negotiate'), ARRAY['hammer out','roll out','nail down','follow through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 8, 'npc', 'Any bugs left?', 'バグは残ってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 9, 'user', 'Dev will {iron out} the last few today.', '開発が今日、残りを解決する。', 'iron out', (SELECT id FROM vocab_senses WHERE slug='iron-out.phrv.resolve'), ARRAY['iron out','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 10, 'npc', 'Good. Don''t drop the ball.', 'いいね。ミスしないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 11, 'user', 'I''ll {follow through} on every task.', '全タスクをやり遂げる。', 'follow through', (SELECT id FROM vocab_senses WHERE slug='follow-through.phrv.complete'), ARRAY['follow through','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 12, 'npc', 'That''s why you lead this.', 'だから君がリーダー。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 13, 'user', 'On it.', '任せて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-6.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-6 - Workplace idioms  (Unit 3)
-- Words: touch base, on the same page, in the loop, pull your weight, cut corners, step up, take the lead, hit the ground running.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('workplace-idioms', 'Workplace idioms', '職場の言い回し', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('touch base', 'touch base', '/ˌtʌtʃ ˈbeɪs/', '/ˌtʌtʃ ˈbeɪs/', NULL, 5, FALSE, NULL),
  ('on the same page', 'on the same page', '/ˌɑːn ðə seɪm ˈpeɪdʒ/', '/ˌɒn ðə seɪm ˈpeɪdʒ/', NULL, 5, FALSE, NULL),
  ('in the loop', 'in the loop', '/ˌɪn ðə ˈluːp/', '/ˌɪn ðə ˈluːp/', NULL, 5, FALSE, NULL),
  ('pull your weight', 'pull your weight', '/ˌpʊl jər ˈweɪt/', '/ˌpʊl jə ˈweɪt/', NULL, 5, FALSE, NULL),
  ('cut corners', 'cut corners', '/ˌkʌt ˈkɔːrnərz/', '/ˌkʌt ˈkɔːnəz/', NULL, 5, FALSE, NULL),
  ('step up', 'step up', '/ˌstep ˈʌp/', '/ˌstep ˈʌp/', NULL, 5, FALSE, NULL),
  ('take the lead', 'take the lead', '/ˌteɪk ðə ˈliːd/', '/ˌteɪk ðə ˈliːd/', NULL, 5, FALSE, NULL),
  ('hit the ground running', 'hit the ground running', '/ˌhɪt ðə ɡraʊnd ˈrʌnɪŋ/', '/ˌhɪt ðə ɡraʊnd ˈrʌnɪŋ/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='touch base'), 'touch-base.idiom.contact', 1, TRUE, 'idiom', '（短く）連絡を取る', 'to make brief contact to share news', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='on the same page'), 'on-the-same-page.idiom.aligned', 1, TRUE, 'idiom', '認識が一致している', 'in agreement and sharing the same understanding', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='in the loop'), 'in-the-loop.idiom.informed', 1, TRUE, 'idiom', '情報を共有されて', 'kept informed about something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pull your weight'), 'pull-your-weight.idiom.contribute', 1, TRUE, 'idiom', '自分の役割を果たす', 'to do your fair share of the work', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cut corners'), 'cut-corners.idiom.skimp', 1, TRUE, 'idiom', '手を抜く', 'to do something cheaply or quickly, lowering quality', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='step up'), 'step-up.phrv.rise', 1, TRUE, 'phrasal verb', '一肌脱ぐ', 'to take responsibility when it is needed', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take the lead'), 'take-the-lead.idiom.lead', 1, TRUE, 'idiom', '主導する', 'to take charge of something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hit the ground running'), 'hit-the-ground-running.idiom.start', 1, TRUE, 'idiom', '好スタートを切る', 'to start something and be effective immediately', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('touch base', 'on the same page', 'in the loop', 'pull your weight', 'cut corners', 'step up', 'take the lead', 'hit the ground running')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='workplace-idioms'
WHERE s.slug IN ('touch-base.idiom.contact', 'on-the-same-page.idiom.aligned', 'in-the-loop.idiom.informed', 'pull-your-weight.idiom.contribute', 'cut-corners.idiom.skimp', 'step-up.phrv.rise', 'take-the-lead.idiom.lead', 'hit-the-ground-running.idiom.start')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-6', 3, 1, (SELECT id FROM vocab_categories WHERE slug='workplace-idioms'), 'Workplace idioms', '職場の言い回し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-6'), s.id, x.ord FROM (VALUES
  ('touch-base.idiom.contact',0),('on-the-same-page.idiom.aligned',1),('in-the-loop.idiom.informed',2),('pull-your-weight.idiom.contribute',3),('cut-corners.idiom.skimp',4),('step-up.phrv.rise',5),('take-the-lead.idiom.lead',6),('hit-the-ground-running.idiom.start',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-6'), 'conversation', 0, 'A group project', 'グループ課題', 'library', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-6'), 'travel', 1, 'Coordinating a trip', '旅行の調整', 'home', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-6'), 'business', 2, 'Joining a project', 'プロジェクトに参加', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 0, 'npc', 'How''s the group project going?', 'グループ課題どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 1, 'user', 'Okay, but some people don''t {pull your weight}.', 'まあまあ、でも役割を果たさない人がいて。', 'pull your weight', (SELECT id FROM vocab_senses WHERE slug='pull-your-weight.idiom.contribute'), ARRAY['pull your weight','cut corners','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 2, 'npc', 'Ugh, that''s frustrating.', 'うわ、いらいらするね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 3, 'user', 'And one guy tends to {cut corners}.', 'それに一人、手を抜きがちで。', 'cut corners', (SELECT id FROM vocab_senses WHERE slug='cut-corners.idiom.skimp'), ARRAY['cut corners','step up','take the lead','pull your weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 4, 'npc', 'Someone needs to lead.', '誰かがまとめないと。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 5, 'user', 'I might {step up} and organize us.', '私が一肌脱いでまとめようかな。', 'step up', (SELECT id FROM vocab_senses WHERE slug='step-up.phrv.rise'), ARRAY['step up','cut corners','take the lead','pull your weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 6, 'npc', 'You''d be good at that.', '君は向いてるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 7, 'user', 'Thanks. I''ll {take the lead} on the research.', 'ありがとう。調査は私が主導する。', 'take the lead', (SELECT id FROM vocab_senses WHERE slug='take-the-lead.idiom.lead'), ARRAY['take the lead','cut corners','pull your weight','in the loop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 8, 'npc', 'Keep me posted, okay?', '進捗教えてね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 9, 'user', 'Of course, I''ll keep you {in the loop}.', 'もちろん、情報は共有する。', 'in the loop', (SELECT id FROM vocab_senses WHERE slug='in-the-loop.idiom.informed'), ARRAY['in the loop','cut corners','pull your weight','on the same page']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 10, 'npc', 'Does everyone know the plan?', 'みんな計画分かってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 11, 'user', 'Yes, we''re all {on the same page} now.', 'うん、今は全員認識が一致してる。', 'on the same page', (SELECT id FROM vocab_senses WHERE slug='on-the-same-page.idiom.aligned'), ARRAY['on the same page','cut corners','pull your weight','in the loop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 12, 'npc', 'Sounds under control.', 'ちゃんとしてるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 13, 'user', 'Getting there!', 'もう少し！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 14, 'npc', 'You''ve got this, {{user_name}}.', '大丈夫、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 0, 'npc', 'We''re all in different cities before the trip.', '旅行前、みんな別々の街にいるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 1, 'user', 'Let''s {touch base} on a call each week.', '毎週電話で連絡を取り合おう。', 'touch base', (SELECT id FROM vocab_senses WHERE slug='touch-base.idiom.contact'), ARRAY['touch base','cut corners','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 2, 'npc', 'Good idea. Who books what?', 'いいね。誰が何を予約する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 3, 'user', 'We should all {pull your weight} on bookings.', '予約はみんなで役割を分担しよう。', 'pull your weight', (SELECT id FROM vocab_senses WHERE slug='pull-your-weight.idiom.contribute'), ARRAY['pull your weight','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 4, 'npc', 'Don''t book the cheapest dodgy hostel.', '一番安い怪しいホステルは避けて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 5, 'user', 'Right, let''s not {cut corners} on safety.', 'うん、安全面で手を抜かないようにしよう。', 'cut corners', (SELECT id FROM vocab_senses WHERE slug='cut-corners.idiom.skimp'), ARRAY['cut corners','touch base','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 6, 'npc', 'Make sure we all know the plan.', 'みんな計画を把握できるように。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 7, 'user', 'Yes, keep everyone {on the same page}.', 'うん、全員の認識を合わせておこう。', 'on the same page', (SELECT id FROM vocab_senses WHERE slug='on-the-same-page.idiom.aligned'), ARRAY['on the same page','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 8, 'npc', 'And share updates fast.', '更新は早めに共有ね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 9, 'user', 'I''ll keep the group {in the loop}.', 'グループに情報を共有し続ける。', 'in the loop', (SELECT id FROM vocab_senses WHERE slug='in-the-loop.idiom.informed'), ARRAY['in the loop','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 10, 'npc', 'We land and go straight to the tour.', '着いたらすぐツアーへ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 11, 'user', 'Exactly, we {hit the ground running} on day one.', 'そう、初日から全開でいく。', 'hit the ground running', (SELECT id FROM vocab_senses WHERE slug='hit-the-ground-running.idiom.start'), ARRAY['hit the ground running','cut corners','touch base','pull your weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 12, 'npc', 'Efficient trip!', '効率的な旅！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 13, 'user', 'Best kind.', '最高のやつ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 14, 'npc', 'Let''s do it!', 'やろう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 0, 'npc', 'You''re joining the client project midway.', '途中からクライアント案件に入るんだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 1, 'user', 'Yes, I need to {hit the ground running}.', 'うん、すぐに戦力にならないと。', 'hit the ground running', (SELECT id FROM vocab_senses WHERE slug='hit-the-ground-running.idiom.start'), ARRAY['hit the ground running','cut corners','touch base','pull your weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 2, 'npc', 'I''ll brief you fully.', 'しっかり説明するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 3, 'user', 'Thanks, keep me {in the loop} on decisions.', 'ありがとう、決定事項は共有して。', 'in the loop', (SELECT id FROM vocab_senses WHERE slug='in-the-loop.idiom.informed'), ARRAY['in the loop','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 4, 'npc', 'We sync every morning.', '毎朝すり合わせしてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 5, 'user', 'Good, we can {touch base} daily then.', 'いいね、じゃあ毎日連絡を取り合える。', 'touch base', (SELECT id FROM vocab_senses WHERE slug='touch-base.idiom.contact'), ARRAY['touch base','cut corners','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 6, 'npc', 'The team''s direction shifted last week.', '先週チームの方向性が変わった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 7, 'user', 'Make sure I''m {on the same page} with them.', '彼らと認識を合わせておいて。', 'on the same page', (SELECT id FROM vocab_senses WHERE slug='on-the-same-page.idiom.aligned'), ARRAY['on the same page','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 8, 'npc', 'We need someone to own testing.', 'テストの担当者が必要。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 9, 'user', 'I''ll {step up} and handle that.', '私が一肌脱いで担当する。', 'step up', (SELECT id FROM vocab_senses WHERE slug='step-up.phrv.rise'), ARRAY['step up','cut corners','touch base','on the same page']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 10, 'npc', 'And the client calls?', 'クライアントとの電話は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 11, 'user', 'I can {take the lead} on those too.', 'それも私が主導できる。', 'take the lead', (SELECT id FROM vocab_senses WHERE slug='take-the-lead.idiom.lead'), ARRAY['take the lead','cut corners','touch base','in the loop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 12, 'npc', 'Perfect. Welcome aboard.', '完璧。ようこそ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 13, 'user', 'Glad to be here.', '参加できて嬉しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 14, 'npc', 'Great to have you, {{user_name}}.', '来てくれて助かる、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-7.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-7 - Spending & saving  (Unit 4)
-- Words: splurge, scrape by, rip off, chip in, dip into, fork out, shell out, tighten your belt.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('spending-saving-c1', 'Spending & saving', 'お金の使い方', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('splurge', 'splurge', '/splɜːrdʒ/', '/splɜːdʒ/', NULL, 5, FALSE, NULL),
  ('scrape by', 'scrape by', '/ˌskreɪp ˈbaɪ/', '/ˌskreɪp ˈbaɪ/', NULL, 5, FALSE, NULL),
  ('rip off', 'rip off', '/ˌrɪp ˈɔːf/', '/ˌrɪp ˈɒf/', NULL, 5, FALSE, NULL),
  ('chip in', 'chip in', '/ˌtʃɪp ˈɪn/', '/ˌtʃɪp ˈɪn/', NULL, 5, FALSE, NULL),
  ('dip into', 'dip into', '/ˌdɪp ˈɪntuː/', '/ˌdɪp ˈɪntuː/', NULL, 5, FALSE, NULL),
  ('fork out', 'fork out', '/ˌfɔːrk ˈaʊt/', '/ˌfɔːk ˈaʊt/', NULL, 5, FALSE, NULL),
  ('shell out', 'shell out', '/ˌʃel ˈaʊt/', '/ˌʃel ˈaʊt/', NULL, 5, FALSE, NULL),
  ('tighten your belt', 'tighten your belt', '/ˌtaɪtn jər ˈbelt/', '/ˌtaɪtn jə ˈbelt/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='splurge'), 'splurge.v.spend', 1, TRUE, 'verb', '奮発する', 'to spend a lot of money on a treat', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='scrape by'), 'scrape-by.phrv.survive', 1, TRUE, 'phrasal verb', '何とかやりくりする', 'to manage with barely enough money', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='rip off'), 'rip-off.phrv.overcharge', 1, TRUE, 'phrasal verb', 'ぼったくる', 'to charge someone far too much money', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='chip in'), 'chip-in.phrv.contribute', 1, TRUE, 'phrasal verb', 'お金を出し合う', 'to give some money as part of a group', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dip into'), 'dip-into.phrv.usesavings', 1, TRUE, 'phrasal verb', '（貯金に）手をつける', 'to use part of your savings', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fork out'), 'fork-out.phrv.pay', 1, TRUE, 'phrasal verb', '（渋々）大金を払う', 'to pay a lot of money, often unwillingly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shell out'), 'shell-out.phrv.pay2', 1, TRUE, 'phrasal verb', '大金を払う', 'to pay a large amount of money for something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tighten your belt'), 'tighten-your-belt.idiom.economize', 1, TRUE, 'idiom', '節約する', 'to spend less money because you have less', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('splurge', 'scrape by', 'rip off', 'chip in', 'dip into', 'fork out', 'shell out', 'tighten your belt')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='spending-saving-c1'
WHERE s.slug IN ('splurge.v.spend', 'scrape-by.phrv.survive', 'rip-off.phrv.overcharge', 'chip-in.phrv.contribute', 'dip-into.phrv.usesavings', 'fork-out.phrv.pay', 'shell-out.phrv.pay2', 'tighten-your-belt.idiom.economize')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-7', 4, 0, (SELECT id FROM vocab_categories WHERE slug='spending-saving-c1'), 'Spending & saving', 'お金を使う・貯める', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-7'), s.id, x.ord FROM (VALUES
  ('splurge.v.spend',0),('scrape-by.phrv.survive',1),('rip-off.phrv.overcharge',2),('chip-in.phrv.contribute',3),('dip-into.phrv.usesavings',4),('fork-out.phrv.pay',5),('shell-out.phrv.pay2',6),('tighten-your-belt.idiom.economize',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-7'), 'conversation', 0, 'Payday plans', '給料日の予定', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-7'), 'travel', 1, 'Trip costs', '旅の出費', 'street', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-7'), 'business', 2, 'Cost overruns', '予算超過', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 0, 'npc', 'Payday! Any plans?', '給料日！予定ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 1, 'user', 'I might {splurge} on concert tickets.', 'コンサートのチケットに奮発するかも。', 'splurge', (SELECT id FROM vocab_senses WHERE slug='splurge.v.spend'), ARRAY['splurge','scrape by','chip in','dip into']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 2, 'npc', 'Nice! Can you afford it?', 'いいね！余裕ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 3, 'user', 'Just about; I usually {scrape by} till payday.', 'ぎりぎり。いつも給料日まで何とかやりくりしてる。', 'scrape by', (SELECT id FROM vocab_senses WHERE slug='scrape-by.phrv.survive'), ARRAY['scrape by','splurge','chip in','dip into']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 4, 'npc', 'We''re planning a group gift for Ana.', 'アナへのグループプレゼントを計画中。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 5, 'user', 'Count me in; I''ll {chip in} twenty.', '入れて、20出すよ。', 'chip in', (SELECT id FROM vocab_senses WHERE slug='chip-in.phrv.contribute'), ARRAY['chip in','splurge','scrape by','dip into']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 6, 'npc', 'Thanks. Big month for you?', 'ありがとう。今月は出費多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 7, 'user', 'A bit; I had to {dip into} my savings for rent.', '少し。家賃で貯金に手をつけた。', 'dip into', (SELECT id FROM vocab_senses WHERE slug='dip-into.phrv.usesavings'), ARRAY['dip into','splurge','scrape by','chip in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 8, 'npc', 'Ouch. Cutting back?', '痛いね。節約する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 9, 'user', 'Yeah, time to {tighten your belt} a little.', 'うん、少し節約する時期だね。', 'tighten your belt', (SELECT id FROM vocab_senses WHERE slug='tighten-your-belt.idiom.economize'), ARRAY['tighten your belt','splurge','chip in','rip off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 10, 'npc', 'That gym you quit was pricey.', '辞めたジム、高かったよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 11, 'user', 'So expensive; it was a total {rip off}.', '高すぎ、完全にぼったくりだった。', 'rip off', (SELECT id FROM vocab_senses WHERE slug='rip-off.phrv.overcharge'), ARRAY['rip off','splurge','scrape by','chip in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 12, 'npc', 'Good you left.', '辞めて正解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 13, 'user', 'Saving now feels good.', '今は貯金が気持ちいい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='conversation'), 14, 'npc', 'Smart, {{user_name}}.', '賢いね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 0, 'npc', 'This trip is getting expensive.', 'この旅、高くついてきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 1, 'user', 'Yeah, we had to {fork out} for the flights.', 'うん、航空券に大金を払った。', 'fork out', (SELECT id FROM vocab_senses WHERE slug='fork-out.phrv.pay'), ARRAY['fork out','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 2, 'npc', 'And the hotel wasn''t cheap.', 'ホテルも安くなかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 3, 'user', 'No, we {shell out} a lot for the sea view.', 'うん、海の見える部屋に結構払った。', 'shell out', (SELECT id FROM vocab_senses WHERE slug='shell-out.phrv.pay2'), ARRAY['shell out','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 4, 'npc', 'That taxi overcharged us.', 'あのタクシー、ぼられたね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 5, 'user', 'Totally. He tried to {rip off} tourists.', '完全に。観光客をぼったくろうとした。', 'rip off', (SELECT id FROM vocab_senses WHERE slug='rip-off.phrv.overcharge'), ARRAY['rip off','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 6, 'npc', 'Let''s be careful now.', 'これから気をつけよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 7, 'user', 'Agreed; we can {scrape by} on street food.', '賛成、屋台で何とかやりくりできる。', 'scrape by', (SELECT id FROM vocab_senses WHERE slug='scrape-by.phrv.survive'), ARRAY['scrape by','splurge','chip in','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 8, 'npc', 'But one nice meal?', 'でも一度はいい食事を？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 9, 'user', 'Okay, let''s {splurge} once on the harbor place.', 'よし、一度は港の店で奮発しよう。', 'splurge', (SELECT id FROM vocab_senses WHERE slug='splurge.v.spend'), ARRAY['splurge','scrape by','chip in','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 10, 'npc', 'Deal. Split it?', '決まり。割り勘？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 11, 'user', 'Yes, everyone can {chip in} equally.', 'うん、みんなで均等に出し合おう。', 'chip in', (SELECT id FROM vocab_senses WHERE slug='chip-in.phrv.contribute'), ARRAY['chip in','splurge','scrape by','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 12, 'npc', 'Fair for all.', 'みんな公平。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 13, 'user', 'Perfect.', '完璧。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='travel'), 14, 'npc', 'Let''s enjoy it!', '楽しもう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 0, 'npc', 'The project went over budget.', 'プロジェクトが予算オーバーした。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 1, 'user', 'We had to {fork out} extra for materials.', '材料費に追加で大金を払った。', 'fork out', (SELECT id FROM vocab_senses WHERE slug='fork-out.phrv.pay'), ARRAY['fork out','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 2, 'npc', 'And the software licenses?', 'ソフトのライセンスは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 3, 'user', 'We {shell out} a lot for those too.', 'あれにも結構払った。', 'shell out', (SELECT id FROM vocab_senses WHERE slug='shell-out.phrv.pay2'), ARRAY['shell out','splurge','chip in','scrape by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 4, 'npc', 'Finance wants cuts.', '財務が削減を求めてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 5, 'user', 'Then we all {tighten your belt} next quarter.', 'なら来期はみんな節約だ。', 'tighten your belt', (SELECT id FROM vocab_senses WHERE slug='tighten-your-belt.idiom.economize'), ARRAY['tighten your belt','splurge','chip in','rip off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 6, 'npc', 'Any reserve funds?', '予備資金は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 7, 'user', 'We can {dip into} the contingency budget.', '予備予算に手をつけられる。', 'dip into', (SELECT id FROM vocab_senses WHERE slug='dip-into.phrv.usesavings'), ARRAY['dip into','splurge','scrape by','chip in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 8, 'npc', 'Barely enough, though.', 'でもぎりぎりだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 9, 'user', 'We''ll {scrape by} if we''re careful.', '慎重にやれば何とかなる。', 'scrape by', (SELECT id FROM vocab_senses WHERE slug='scrape-by.phrv.survive'), ARRAY['scrape by','splurge','chip in','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 10, 'npc', 'Could departments help?', '各部署が協力できる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 11, 'user', 'Maybe each team can {chip in} a little.', '各チームが少しずつ出し合えるかも。', 'chip in', (SELECT id FROM vocab_senses WHERE slug='chip-in.phrv.contribute'), ARRAY['chip in','splurge','scrape by','fork out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 12, 'npc', 'I''ll propose it.', '提案するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 13, 'user', 'Good plan.', 'いい案。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-7') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-8.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-8 - Financial decisions  (Unit 4)
-- Words: weigh up, bank on, fall through, make ends meet, break even, in the red, nest egg, live within your means.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('financial-decisions', 'Financial decisions', 'お金の判断', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('weigh up', 'weigh up', '/ˌweɪ ˈʌp/', '/ˌweɪ ˈʌp/', NULL, 5, FALSE, NULL),
  ('bank on', 'bank on', '/ˈbæŋk ɑːn/', '/ˈbæŋk ɒn/', NULL, 5, FALSE, NULL),
  ('fall through', 'fall through', '/ˌfɔːl ˈθruː/', '/ˌfɔːl ˈθruː/', NULL, 5, FALSE, NULL),
  ('make ends meet', 'make ends meet', '/ˌmeɪk endz ˈmiːt/', '/ˌmeɪk endz ˈmiːt/', NULL, 5, FALSE, NULL),
  ('break even', 'break even', '/ˌbreɪk ˈiːvn/', '/ˌbreɪk ˈiːvn/', NULL, 5, FALSE, NULL),
  ('in the red', 'in the red', '/ˌɪn ðə ˈred/', '/ˌɪn ðə ˈred/', NULL, 5, FALSE, NULL),
  ('nest egg', 'nest egg', '/ˈnest eɡ/', '/ˈnest eɡ/', NULL, 5, FALSE, NULL),
  ('live within your means', 'live within your means', '/ˌlɪv wɪðɪn jər ˈmiːnz/', '/ˌlɪv wɪðɪn jə ˈmiːnz/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='weigh up'), 'weigh-up.phrv.assess', 1, TRUE, 'phrasal verb', 'よく検討する', 'to consider something carefully before deciding', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bank on'), 'bank-on.phrv.rely', 1, TRUE, 'phrasal verb', '当てにする', 'to rely on something happening', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fall through'), 'fall-through.phrv.fail', 1, TRUE, 'phrasal verb', '（計画が）流れる', 'to fail to happen after being planned', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='make ends meet'), 'make-ends-meet.idiom.manage', 1, TRUE, 'idiom', '収支を合わせる', 'to have just enough money to live on', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='break even'), 'break-even.idiom.balance', 1, TRUE, 'idiom', '収支トントンになる', 'to make neither a profit nor a loss', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='in the red'), 'in-the-red.idiom.debt', 1, TRUE, 'idiom', '赤字で', 'owing money to the bank; in debt', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='nest egg'), 'nest-egg.idiom.savings', 1, TRUE, 'idiom', '蓄え', 'an amount of money saved for the future', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='live within your means'), 'live-within-means.idiom.budget', 1, TRUE, 'idiom', '分相応に暮らす', 'to spend only as much as you can afford', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('weigh up', 'bank on', 'fall through', 'make ends meet', 'break even', 'in the red', 'nest egg', 'live within your means')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='break-even.idiom.balance'), (SELECT id FROM vocab_senses WHERE slug='in-the-red.idiom.debt'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='financial-decisions'
WHERE s.slug IN ('weigh-up.phrv.assess', 'bank-on.phrv.rely', 'fall-through.phrv.fail', 'make-ends-meet.idiom.manage', 'break-even.idiom.balance', 'in-the-red.idiom.debt', 'nest-egg.idiom.savings', 'live-within-means.idiom.budget')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-8', 4, 1, (SELECT id FROM vocab_categories WHERE slug='financial-decisions'), 'Financial decisions', 'お金の判断', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-8'), s.id, x.ord FROM (VALUES
  ('weigh-up.phrv.assess',0),('bank-on.phrv.rely',1),('fall-through.phrv.fail',2),('make-ends-meet.idiom.manage',3),('break-even.idiom.balance',4),('in-the-red.idiom.debt',5),('nest-egg.idiom.savings',6),('live-within-means.idiom.budget',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-8'), 'conversation', 0, 'A money decision', 'お金の決断', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-8'), 'travel', 1, 'Funding a big trip', '長期旅行の資金', 'home', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-8'), 'business', 2, 'Reviewing finances', '財務の見直し', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 0, 'npc', 'Are you buying that flat?', 'あのアパート買うの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 1, 'user', 'I still need to {weigh up} the pros and cons.', 'まだメリットとデメリットをよく検討しないと。', 'weigh up', (SELECT id FROM vocab_senses WHERE slug='weigh-up.phrv.assess'), ARRAY['weigh up','bank on','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 2, 'npc', 'Big commitment.', '大きな決断だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 3, 'user', 'Yeah, I can''t {bank on} a pay rise to cover it.', 'うん、昇給を当てにはできない。', 'bank on', (SELECT id FROM vocab_senses WHERE slug='bank-on.phrv.rely'), ARRAY['bank on','weigh up','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 4, 'npc', 'Do you have savings?', '貯金はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 5, 'user', 'A small {nest egg}, but not huge.', '少し蓄えはあるけど、大きくはない。', 'nest egg', (SELECT id FROM vocab_senses WHERE slug='nest-egg.idiom.savings'), ARRAY['nest egg','break even','in the red','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 6, 'npc', 'Could the mortgage strain you?', 'ローンで苦しくなる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 7, 'user', 'Maybe; it''d be hard to {make ends meet}.', 'かも、収支を合わせるのが大変になる。', 'make ends meet', (SELECT id FROM vocab_senses WHERE slug='make-ends-meet.idiom.manage'), ARRAY['make ends meet','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 8, 'npc', 'Better to be careful.', '慎重な方がいい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 9, 'user', 'Right, I try to {live within your means}.', 'うん、分相応に暮らすようにしてる。', 'live within your means', (SELECT id FROM vocab_senses WHERE slug='live-within-means.idiom.budget'), ARRAY['live within your means','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 10, 'npc', 'What if the sale collapses?', '売買が流れたら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 11, 'user', 'If the deal {fall through}, I''ll keep renting.', '話が流れたら、賃貸を続けるよ。', 'fall through', (SELECT id FROM vocab_senses WHERE slug='fall-through.phrv.fail'), ARRAY['fall through','weigh up','bank on','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 12, 'npc', 'Sensible either way.', 'どっちにしても賢明。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 13, 'user', 'Thanks for the advice.', 'アドバイスありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 0, 'npc', 'How are you funding this year-long trip?', 'この1年の旅、どうやって資金を？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 1, 'user', 'I saved a {nest egg} over three years.', '3年かけて蓄えを作った。', 'nest egg', (SELECT id FROM vocab_senses WHERE slug='nest-egg.idiom.savings'), ARRAY['nest egg','break even','in the red','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 2, 'npc', 'Impressive discipline.', 'すごい自制心。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 3, 'user', 'I had to {weigh up} travel versus saving.', '旅行と貯金を天秤にかけて検討した。', 'weigh up', (SELECT id FROM vocab_senses WHERE slug='weigh-up.phrv.assess'), ARRAY['weigh up','bank on','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 4, 'npc', 'Any sponsorship?', 'スポンサーは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 5, 'user', 'No, I won''t {bank on} outside money.', 'いや、外部の資金は当てにしない。', 'bank on', (SELECT id FROM vocab_senses WHERE slug='bank-on.phrv.rely'), ARRAY['bank on','weigh up','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 6, 'npc', 'What if a booking dies?', '予約がダメになったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 7, 'user', 'If plans {fall through}, I adapt.', '計画が流れたら、臨機応変にやる。', 'fall through', (SELECT id FROM vocab_senses WHERE slug='fall-through.phrv.fail'), ARRAY['fall through','weigh up','bank on','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 8, 'npc', 'Will you work abroad?', '現地で働く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 9, 'user', 'Some odd jobs to {make ends meet}.', '収支を合わせるために単発の仕事を。', 'make ends meet', (SELECT id FROM vocab_senses WHERE slug='make-ends-meet.idiom.manage'), ARRAY['make ends meet','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 10, 'npc', 'Just don''t overspend.', '使いすぎないでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 11, 'user', 'True, I never want to end up {in the red}.', 'うん、赤字にはなりたくない。', 'in the red', (SELECT id FROM vocab_senses WHERE slug='in-the-red.idiom.debt'), ARRAY['in the red','break even','make ends meet','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 12, 'npc', 'Wise traveler.', '賢い旅人だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 13, 'user', 'Learned the hard way!', '痛い目で学んだ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 14, 'npc', 'Safe travels!', '気をつけて！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 0, 'npc', 'How did the quarter go financially?', '今期の財務はどうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 1, 'user', 'We managed to {break even}, just.', '何とか収支トントンになった、ぎりぎり。', 'break even', (SELECT id FROM vocab_senses WHERE slug='break-even.idiom.balance'), ARRAY['break even','in the red','nest egg','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 2, 'npc', 'Better than last year.', '去年より良い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 3, 'user', 'Yes, last year we were {in the red}.', 'うん、去年は赤字だった。', 'in the red', (SELECT id FROM vocab_senses WHERE slug='in-the-red.idiom.debt'), ARRAY['in the red','break even','nest egg','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 4, 'npc', 'Should we expand now?', '今、拡大すべき？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 5, 'user', 'Let''s {weigh up} the risks first.', 'まずリスクをよく検討しよう。', 'weigh up', (SELECT id FROM vocab_senses WHERE slug='weigh-up.phrv.assess'), ARRAY['weigh up','bank on','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 6, 'npc', 'Can we count on the new client?', '新しいクライアントを当てにできる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 7, 'user', 'We shouldn''t {bank on} them signing yet.', 'まだ契約を当てにすべきじゃない。', 'bank on', (SELECT id FROM vocab_senses WHERE slug='bank-on.phrv.rely'), ARRAY['bank on','weigh up','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 8, 'npc', 'What if the deal dies?', '契約がダメになったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 9, 'user', 'If it {fall through}, we hold steady.', '流れたら、現状維持でいく。', 'fall through', (SELECT id FROM vocab_senses WHERE slug='fall-through.phrv.fail'), ARRAY['fall through','weigh up','bank on','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 10, 'npc', 'And cash flow for staff?', '人件費のキャッシュフローは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 11, 'user', 'Tight, but we can {make ends meet}.', '厳しいけど、収支は合わせられる。', 'make ends meet', (SELECT id FROM vocab_senses WHERE slug='make-ends-meet.idiom.manage'), ARRAY['make ends meet','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 12, 'npc', 'Careful and steady, then.', 'じゃあ慎重に着実に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 13, 'user', 'Exactly.', 'その通り。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 14, 'npc', 'Good sense, {{user_name}}.', 'いい判断、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-9.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-9 - Troubleshooting  (Unit 5)
-- Words: work around, clear up, head off, stave off, root out, smooth over, tide over, sort through.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('troubleshooting-c1', 'Troubleshooting', '問題への対処', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('work around', 'work around', '/ˌwɜːrk əˈraʊnd/', '/ˌwɜːk əˈraʊnd/', NULL, 5, FALSE, NULL),
  ('clear up', 'clear up', '/ˌklɪr ˈʌp/', '/ˌklɪər ˈʌp/', NULL, 5, FALSE, NULL),
  ('head off', 'head off', '/ˌhed ˈɔːf/', '/ˌhed ˈɒf/', NULL, 5, FALSE, NULL),
  ('stave off', 'stave off', '/ˌsteɪv ˈɔːf/', '/ˌsteɪv ˈɒf/', NULL, 5, FALSE, NULL),
  ('root out', 'root out', '/ˌruːt ˈaʊt/', '/ˌruːt ˈaʊt/', NULL, 5, FALSE, NULL),
  ('smooth over', 'smooth over', '/ˌsmuːð ˈoʊvər/', '/ˌsmuːð ˈəʊvə/', NULL, 5, FALSE, NULL),
  ('tide over', 'tide over', '/ˌtaɪd ˈoʊvər/', '/ˌtaɪd ˈəʊvə/', NULL, 5, FALSE, NULL),
  ('sort through', 'sort through', '/ˌsɔːrt ˈθruː/', '/ˌsɔːt ˈθruː/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='work around'), 'work-around.phrv.bypass', 1, TRUE, 'phrasal verb', '回避策を見つける', 'to find a way to deal with a problem', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='clear up'), 'clear-up.phrv.resolve', 1, TRUE, 'phrasal verb', '解決する', 'to solve or explain a problem or confusion', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='head off'), 'head-off.phrv.prevent', 1, TRUE, 'phrasal verb', '未然に防ぐ', 'to stop something bad before it happens', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stave off'), 'stave-off.phrv.delay', 1, TRUE, 'phrasal verb', '一時的に食い止める', 'to keep something bad away for a while', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='root out'), 'root-out.phrv.eliminate', 1, TRUE, 'phrasal verb', '根絶する', 'to find and remove the cause of a problem', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='smooth over'), 'smooth-over.phrv.ease', 1, TRUE, 'phrasal verb', '丸く収める', 'to make a disagreement less serious', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tide over'), 'tide-over.phrv.help', 1, TRUE, 'phrasal verb', '急場をしのがせる', 'to help someone through a difficult time', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sort through'), 'sort-through.phrv.sift', 1, TRUE, 'phrasal verb', '整理して調べる', 'to look through things to organize or find them', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('work around', 'clear up', 'head off', 'stave off', 'root out', 'smooth over', 'tide over', 'sort through')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='troubleshooting-c1'
WHERE s.slug IN ('work-around.phrv.bypass', 'clear-up.phrv.resolve', 'head-off.phrv.prevent', 'stave-off.phrv.delay', 'root-out.phrv.eliminate', 'smooth-over.phrv.ease', 'tide-over.phrv.help', 'sort-through.phrv.sift')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-9', 5, 0, (SELECT id FROM vocab_categories WHERE slug='troubleshooting-c1'), 'Troubleshooting', '問題に対処する', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-9'), s.id, x.ord FROM (VALUES
  ('work-around.phrv.bypass',0),('clear-up.phrv.resolve',1),('head-off.phrv.prevent',2),('stave-off.phrv.delay',3),('root-out.phrv.eliminate',4),('smooth-over.phrv.ease',5),('tide-over.phrv.help',6),('sort-through.phrv.sift',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-9'), 'conversation', 0, 'A tech headache', 'PCの不調', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-9'), 'travel', 1, 'A travel hiccup', '旅のトラブル', 'station', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-9'), 'business', 2, 'A project problem', 'プロジェクトの問題', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 0, 'npc', 'Your laptop''s still glitching?', 'ノートPC、まだ調子悪いの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 1, 'user', 'Yeah, but I found a way to {work around} it.', 'うん、でも回避する方法を見つけた。', 'work around', (SELECT id FROM vocab_senses WHERE slug='work-around.phrv.bypass'), ARRAY['work around','clear up','head off','stave off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 2, 'npc', 'Did IT explain the cause?', 'ITは原因を説明してくれた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 3, 'user', 'They helped {clear up} the main error.', '主なエラーを解決してくれた。', 'clear up', (SELECT id FROM vocab_senses WHERE slug='clear-up.phrv.resolve'), ARRAY['clear up','head off','stave off','root out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 4, 'npc', 'Lots of junk files?', '不要ファイル多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 5, 'user', 'Tons; I need to {sort through} old folders.', '山ほど。古いフォルダを整理しないと。', 'sort through', (SELECT id FROM vocab_senses WHERE slug='sort-through.phrv.sift'), ARRAY['sort through','head off','stave off','smooth over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 6, 'npc', 'Maybe a virus?', 'ウイルスかも？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 7, 'user', 'Possibly; I''ll {root out} anything suspicious.', 'かも、怪しいものは根絶する。', 'root out', (SELECT id FROM vocab_senses WHERE slug='root-out.phrv.eliminate'), ARRAY['root out','clear up','smooth over','tide over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 8, 'npc', 'Your brother borrowed it, right? Any drama?', '弟が借りてたよね？もめた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 9, 'user', 'A little, but we did {smooth over} the argument.', '少し、でも口論は丸く収めた。', 'smooth over', (SELECT id FROM vocab_senses WHERE slug='smooth-over.phrv.ease'), ARRAY['smooth over','work around','head off','stave off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 10, 'npc', 'Good. Prevent future issues?', 'いいね。今後の問題は防げる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 11, 'user', 'Yeah, backups {head off} bigger problems.', 'うん、バックアップが大きな問題を未然に防ぐ。', 'head off', (SELECT id FROM vocab_senses WHERE slug='head-off.phrv.prevent'), ARRAY['head off','work around','sort through','smooth over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 12, 'npc', 'Smart move.', '賢い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 13, 'user', 'Lesson learned.', 'いい教訓。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='conversation'), 14, 'npc', 'Nicely handled, {{user_name}}.', 'うまく対処したね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 0, 'npc', 'Our train got canceled!', '電車が運休になった！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 1, 'user', 'Don''t worry, we can {work around} it with a bus.', '大丈夫、バスで回避できる。', 'work around', (SELECT id FROM vocab_senses WHERE slug='work-around.phrv.bypass'), ARRAY['work around','clear up','head off','stave off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 2, 'npc', 'But we''ll miss lunch.', 'でも昼食を逃す。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 3, 'user', 'Grab a snack to {stave off} hunger for now.', 'とりあえず軽食で空腹を食い止めよう。', 'stave off', (SELECT id FROM vocab_senses WHERE slug='stave-off.phrv.delay'), ARRAY['stave off','clear up','root out','smooth over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 4, 'npc', 'I''m low on cash too.', '現金も少ない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 5, 'user', 'I''ll lend you some to {tide over} until the ATM.', 'ATMまで急場をしのぐ分、貸すよ。', 'tide over', (SELECT id FROM vocab_senses WHERE slug='tide-over.phrv.help'), ARRAY['tide over','clear up','root out','work around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 6, 'npc', 'Thanks. Where are the tickets?', 'ありがとう。チケットどこ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 7, 'user', 'Let me {sort through} my bag to find them.', 'バッグを整理して探すね。', 'sort through', (SELECT id FROM vocab_senses WHERE slug='sort-through.phrv.sift'), ARRAY['sort through','head off','stave off','smooth over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 8, 'npc', 'The app shows an error.', 'アプリがエラー表示。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 9, 'user', 'The station staff can {clear up} the mix-up.', '駅員が手違いを解決してくれるよ。', 'clear up', (SELECT id FROM vocab_senses WHERE slug='clear-up.phrv.resolve'), ARRAY['clear up','head off','stave off','root out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 10, 'npc', 'Why does this keep happening?', 'なんで毎回こうなるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 11, 'user', 'Let''s {root out} the cause: our old booking app.', '原因を根絶しよう、古い予約アプリだ。', 'root out', (SELECT id FROM vocab_senses WHERE slug='root-out.phrv.eliminate'), ARRAY['root out','clear up','smooth over','tide over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 12, 'npc', 'New app it is.', '新しいアプリにしよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 13, 'user', 'Crisis averted.', '危機回避。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='travel'), 14, 'npc', 'You saved the day!', '助かったよ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 0, 'npc', 'A supplier delay is threatening the deadline.', '仕入先の遅延で締め切りが危ない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 1, 'user', 'We can {work around} it with a second supplier.', '第2の仕入先で回避できる。', 'work around', (SELECT id FROM vocab_senses WHERE slug='work-around.phrv.bypass'), ARRAY['work around','clear up','head off','stave off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 2, 'npc', 'The client is nervous.', 'クライアントが不安がってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 3, 'user', 'I''ll {smooth over} their concerns on a call.', '電話で懸念を丸く収めるよ。', 'smooth over', (SELECT id FROM vocab_senses WHERE slug='smooth-over.phrv.ease'), ARRAY['smooth over','work around','head off','stave off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 4, 'npc', 'Can we prevent this next time?', '次は防げる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 5, 'user', 'Yes, buffer stock will {head off} delays.', 'うん、在庫の余裕が遅延を未然に防ぐ。', 'head off', (SELECT id FROM vocab_senses WHERE slug='head-off.phrv.prevent'), ARRAY['head off','work around','sort through','smooth over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 6, 'npc', 'The invoices are a mess.', '請求書がぐちゃぐちゃ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 7, 'user', 'I''ll {sort through} them this afternoon.', '午後に整理するよ。', 'sort through', (SELECT id FROM vocab_senses WHERE slug='sort-through.phrv.sift'), ARRAY['sort through','head off','stave off','root out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 8, 'npc', 'And the billing dispute?', '請求のもめ事は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 9, 'user', 'Finance will {clear up} the error today.', '財務が今日エラーを解決する。', 'clear up', (SELECT id FROM vocab_senses WHERE slug='clear-up.phrv.resolve'), ARRAY['clear up','head off','stave off','root out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 10, 'npc', 'Cash is tight until payment.', '入金まで資金が厳しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 11, 'user', 'A short loan can {tide over} the team.', '短期の借入でチームの急場をしのげる。', 'tide over', (SELECT id FROM vocab_senses WHERE slug='tide-over.phrv.help'), ARRAY['tide over','clear up','root out','work around']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 12, 'npc', 'Good thinking all round.', '全体的にいい考え。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 13, 'user', 'We''ll manage.', '何とかなる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-9') AND goal='business'), 14, 'npc', 'Great work, {{user_name}}.', 'いい仕事、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-10.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-10 - Problem idioms  (Unit 5)
-- Words: the last straw, back to the drawing board, nip in the bud, at a loss, in a bind, throw a spanner in the works, buy time, damage control.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('problem-idioms', 'Problem idioms', 'トラブルの言い回し', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('the last straw', 'the last straw', '/ðə ˌlæst ˈstrɔː/', '/ðə ˌlɑːst ˈstrɔː/', NULL, 5, FALSE, NULL),
  ('back to the drawing board', 'back to the drawing board', '/ˌbæk tu ðə ˈdrɔːɪŋ bɔːrd/', '/ˌbæk tu ðə ˈdrɔːɪŋ bɔːd/', NULL, 5, FALSE, NULL),
  ('nip in the bud', 'nip in the bud', '/ˌnɪp ɪn ðə ˈbʌd/', '/ˌnɪp ɪn ðə ˈbʌd/', NULL, 5, FALSE, NULL),
  ('at a loss', 'at a loss', '/ˌæt ə ˈlɔːs/', '/ˌæt ə ˈlɒs/', NULL, 5, FALSE, NULL),
  ('in a bind', 'in a bind', '/ˌɪn ə ˈbaɪnd/', '/ˌɪn ə ˈbaɪnd/', NULL, 5, FALSE, NULL),
  ('throw a spanner in the works', 'throw a spanner in the works', '/ˌθroʊ ə ˈspænər ɪn ðə wɜːrks/', '/ˌθrəʊ ə ˈspænə ɪn ðə wɜːks/', NULL, 5, FALSE, NULL),
  ('buy time', 'buy time', '/ˌbaɪ ˈtaɪm/', '/ˌbaɪ ˈtaɪm/', NULL, 5, FALSE, NULL),
  ('damage control', 'damage control', '/ˈdæmɪdʒ kənˌtroʊl/', '/ˈdæmɪdʒ kənˌtrəʊl/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='the last straw'), 'the-last-straw.idiom.limit', 1, TRUE, 'idiom', '我慢の限界', 'the final problem that makes you give up', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='back to the drawing board'), 'back-to-drawing-board.idiom.restart', 1, TRUE, 'idiom', '一から練り直し', 'having to start planning again after a failure', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='nip in the bud'), 'nip-in-the-bud.idiom.stopearly', 1, TRUE, 'idiom', '早めに摘み取る', 'to stop a problem early, before it grows', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='at a loss'), 'at-a-loss.idiom.puzzled', 1, TRUE, 'idiom', '途方に暮れて', 'not knowing what to do or say', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='in a bind'), 'in-a-bind.idiom.stuck', 1, TRUE, 'idiom', '窮地に', 'in a difficult situation', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='throw a spanner in the works'), 'spanner-in-works.idiom.disrupt', 1, TRUE, 'idiom', '計画を台無しにする', 'to spoil a plan or stop it working', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='buy time'), 'buy-time.idiom.delay', 1, TRUE, 'idiom', '時間を稼ぐ', 'to delay something so you have more time', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='damage control'), 'damage-control.idiom.limit2', 1, TRUE, 'idiom', '事後対応', 'action taken to reduce harm after a problem', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('the last straw', 'back to the drawing board', 'nip in the bud', 'at a loss', 'in a bind', 'throw a spanner in the works', 'buy time', 'damage control')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='problem-idioms'
WHERE s.slug IN ('the-last-straw.idiom.limit', 'back-to-drawing-board.idiom.restart', 'nip-in-the-bud.idiom.stopearly', 'at-a-loss.idiom.puzzled', 'in-a-bind.idiom.stuck', 'spanner-in-works.idiom.disrupt', 'buy-time.idiom.delay', 'damage-control.idiom.limit2')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-10', 5, 1, (SELECT id FROM vocab_categories WHERE slug='problem-idioms'), 'Problem idioms', 'トラブルの言い回し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-10'), s.id, x.ord FROM (VALUES
  ('the-last-straw.idiom.limit',0),('back-to-drawing-board.idiom.restart',1),('nip-in-the-bud.idiom.stopearly',2),('at-a-loss.idiom.puzzled',3),('in-a-bind.idiom.stuck',4),('spanner-in-works.idiom.disrupt',5),('buy-time.idiom.delay',6),('damage-control.idiom.limit2',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-10'), 'conversation', 0, 'A frustrating week', '散々な一週間', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-10'), 'travel', 1, 'A trip goes wrong', '旅がうまくいかない', 'port', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-10'), 'business', 2, 'Handling a crisis', '危機対応', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 0, 'npc', 'You seem really stressed.', 'すごくストレス溜まってそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 1, 'user', 'My car broke down; that was {the last straw}.', '車が壊れて、もう限界だった。', 'the last straw', (SELECT id FROM vocab_senses WHERE slug='the-last-straw.idiom.limit'), ARRAY['the last straw','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 2, 'npc', 'Oh no. What now?', 'うわ。これからどうする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 3, 'user', 'Honestly, I''m {at a loss} what to do.', '正直、どうしたらいいか途方に暮れてる。', 'at a loss', (SELECT id FROM vocab_senses WHERE slug='at-a-loss.idiom.puzzled'), ARRAY['at a loss','in a bind','buy time','nip in the bud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 4, 'npc', 'Money trouble too?', 'お金も大変？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 5, 'user', 'Yeah, I''m really {in a bind} this month.', 'うん、今月は本当に窮地。', 'in a bind', (SELECT id FROM vocab_senses WHERE slug='in-a-bind.idiom.stuck'), ARRAY['in a bind','at a loss','buy time','the last straw']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 6, 'npc', 'Can you delay any bills?', '支払いを遅らせられる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 7, 'user', 'I asked for an extension to {buy time}.', '延長をお願いして時間を稼いだ。', 'buy time', (SELECT id FROM vocab_senses WHERE slug='buy-time.idiom.delay'), ARRAY['buy time','at a loss','in a bind','nip in the bud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 8, 'npc', 'Catch small issues early next time.', '次は小さい問題を早めに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 9, 'user', 'True, next time I''ll {nip in the bud} any problem early.', '確かに、次は問題を早めに摘み取る。', 'nip in the bud', (SELECT id FROM vocab_senses WHERE slug='nip-in-the-bud.idiom.stopearly'), ARRAY['nip in the bud','at a loss','buy time','in a bind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 10, 'npc', 'And the big plan that failed?', '失敗した大きな計画は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 11, 'user', 'Ugh, it''s {back to the drawing board}.', 'うう、一から練り直し。', 'back to the drawing board', (SELECT id FROM vocab_senses WHERE slug='back-to-drawing-board.idiom.restart'), ARRAY['back to the drawing board','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 12, 'npc', 'You''ll bounce back.', '立ち直れるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 13, 'user', 'Thanks, I needed that.', 'ありがとう、救われた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='conversation'), 14, 'npc', 'Always here, {{user_name}}.', 'いつでもいるよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 0, 'npc', 'The storm canceled our ferry.', '嵐でフェリーが欠航。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 1, 'user', 'The storm did {throw a spanner in the works}.', '嵐が計画を台無しにしたね。', 'throw a spanner in the works', (SELECT id FROM vocab_senses WHERE slug='spanner-in-works.idiom.disrupt'), ARRAY['throw a spanner in the works','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 2, 'npc', 'What do we do now?', 'これからどうする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 3, 'user', 'I''m a bit {at a loss}, honestly.', '正直、少し途方に暮れてる。', 'at a loss', (SELECT id FROM vocab_senses WHERE slug='at-a-loss.idiom.puzzled'), ARRAY['at a loss','in a bind','buy time','the last straw']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 4, 'npc', 'No rooms left either.', '部屋も残ってない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 5, 'user', 'We''re really {in a bind} tonight.', '今夜は本当に窮地だ。', 'in a bind', (SELECT id FROM vocab_senses WHERE slug='in-a-bind.idiom.stuck'), ARRAY['in a bind','at a loss','buy time','the last straw']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 6, 'npc', 'Can we wait it out?', '嵐が過ぎるのを待てる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 7, 'user', 'Let''s find a cafe to {buy time} until it clears.', '晴れるまでカフェで時間を稼ごう。', 'buy time', (SELECT id FROM vocab_senses WHERE slug='buy-time.idiom.delay'), ARRAY['buy time','at a loss','in a bind','nip in the bud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 8, 'npc', 'Our whole route is ruined.', 'ルートが全部台無し。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 9, 'user', 'Yeah, it''s {back to the drawing board} for the plan.', 'うん、計画は一から練り直し。', 'back to the drawing board', (SELECT id FROM vocab_senses WHERE slug='back-to-drawing-board.idiom.restart'), ARRAY['back to the drawing board','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 10, 'npc', 'And the lost luggage?', 'なくした荷物は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 11, 'user', 'Honestly, that was {the last straw} today.', '正直、今日はそれで限界だった。', 'the last straw', (SELECT id FROM vocab_senses WHERE slug='the-last-straw.idiom.limit'), ARRAY['the last straw','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 12, 'npc', 'Tomorrow will be better.', '明日は良くなるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 13, 'user', 'It has to be!', 'そうであってほしい！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='travel'), 14, 'npc', 'Chin up!', '元気出して！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 0, 'npc', 'A bug reached customers.', 'バグが顧客に届いてしまった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 1, 'user', 'Time for {damage control} before it spreads.', '広がる前に事後対応だ。', 'damage control', (SELECT id FROM vocab_senses WHERE slug='damage-control.idiom.limit2'), ARRAY['damage control','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 2, 'npc', 'How bad is it?', 'どれくらいひどい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 3, 'user', 'Support is a bit {at a loss} with the volume.', 'サポートが問い合わせの多さに少し困ってる。', 'at a loss', (SELECT id FROM vocab_senses WHERE slug='at-a-loss.idiom.puzzled'), ARRAY['at a loss','in a bind','buy time','nip in the bud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 4, 'npc', 'Can we slow the rollout?', '展開を遅らせられる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 5, 'user', 'Pausing updates will {buy time} for a fix.', '更新を止めれば修正の時間を稼げる。', 'buy time', (SELECT id FROM vocab_senses WHERE slug='buy-time.idiom.delay'), ARRAY['buy time','at a loss','in a bind','nip in the bud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 6, 'npc', 'Stop small complaints early.', '小さな苦情は早めに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 7, 'user', 'Agreed, we {nip in the bud} each report fast.', '賛成、各報告を素早く早めに摘み取る。', 'nip in the bud', (SELECT id FROM vocab_senses WHERE slug='nip-in-the-bud.idiom.stopearly'), ARRAY['nip in the bud','at a loss','buy time','in a bind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 8, 'npc', 'The launch date is now at risk.', 'ローンチ日が危うい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 9, 'user', 'This bug really did {throw a spanner in the works}.', 'このバグが本当に計画を台無しにした。', 'throw a spanner in the works', (SELECT id FROM vocab_senses WHERE slug='spanner-in-works.idiom.disrupt'), ARRAY['throw a spanner in the works','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 10, 'npc', 'Do we rethink the release?', 'リリースを見直す？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 11, 'user', 'Maybe partly {back to the drawing board} on testing.', 'テストは一部、一から練り直しかも。', 'back to the drawing board', (SELECT id FROM vocab_senses WHERE slug='back-to-drawing-board.idiom.restart'), ARRAY['back to the drawing board','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 12, 'npc', 'Let''s regroup at noon.', '正午に集まろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 13, 'user', 'I''ll prep the notes.', 'メモを用意する。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-10') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-11.sql =====
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

-- ===== seed-vocab-103-12.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-12 - Emotion idioms  (Unit 6)
-- Words: on edge, over the moon, down in the dumps, mixed feelings, at ease, on cloud nine, lose your cool, get cold feet.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('emotion-idioms', 'Emotion idioms', '感情の言い回し', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('on edge', 'on edge', '/ˌɑːn ˈedʒ/', '/ˌɒn ˈedʒ/', NULL, 5, FALSE, NULL),
  ('over the moon', 'over the moon', '/ˌoʊvər ðə ˈmuːn/', '/ˌəʊvə ðə ˈmuːn/', NULL, 5, FALSE, NULL),
  ('down in the dumps', 'down in the dumps', '/ˌdaʊn ɪn ðə ˈdʌmps/', '/ˌdaʊn ɪn ðə ˈdʌmps/', NULL, 5, FALSE, NULL),
  ('mixed feelings', 'mixed feelings', '/ˌmɪkst ˈfiːlɪŋz/', '/ˌmɪkst ˈfiːlɪŋz/', NULL, 5, FALSE, NULL),
  ('at ease', 'at ease', '/ˌæt ˈiːz/', '/ˌæt ˈiːz/', NULL, 5, FALSE, NULL),
  ('on cloud nine', 'on cloud nine', '/ˌɑːn klaʊd ˈnaɪn/', '/ˌɒn klaʊd ˈnaɪn/', NULL, 5, FALSE, NULL),
  ('lose your cool', 'lose your cool', '/ˌluːz jər ˈkuːl/', '/ˌluːz jə ˈkuːl/', NULL, 5, FALSE, NULL),
  ('get cold feet', 'get cold feet', '/ˌɡet koʊld ˈfiːt/', '/ˌɡet kəʊld ˈfiːt/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='on edge'), 'on-edge.idiom.tense', 1, TRUE, 'idiom', 'ピリピリして', 'nervous and easily upset', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='over the moon'), 'over-the-moon.idiom.thrilled', 1, TRUE, 'idiom', '大喜びで', 'extremely happy about something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='down in the dumps'), 'down-in-dumps.idiom.sad', 1, TRUE, 'idiom', '落ち込んで', 'sad and low in spirits', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mixed feelings'), 'mixed-feelings.idiom.ambivalent', 1, TRUE, 'idiom', '複雑な気持ち', 'both positive and negative feelings at once', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='at ease'), 'at-ease.idiom.relaxed', 1, TRUE, 'idiom', 'くつろいで', 'relaxed and comfortable', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='on cloud nine'), 'on-cloud-nine.idiom.euphoric', 1, TRUE, 'idiom', '有頂天で', 'extremely happy and excited', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lose your cool'), 'lose-your-cool.idiom.angry', 1, TRUE, 'idiom', '冷静さを失う', 'to become angry and lose self-control', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get cold feet'), 'get-cold-feet.idiom.nervous', 1, TRUE, 'idiom', '怖じ気づく', 'to become too nervous to do something planned', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('on edge', 'over the moon', 'down in the dumps', 'mixed feelings', 'at ease', 'on cloud nine', 'lose your cool', 'get cold feet')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='emotion-idioms'
WHERE s.slug IN ('on-edge.idiom.tense', 'over-the-moon.idiom.thrilled', 'down-in-dumps.idiom.sad', 'mixed-feelings.idiom.ambivalent', 'at-ease.idiom.relaxed', 'on-cloud-nine.idiom.euphoric', 'lose-your-cool.idiom.angry', 'get-cold-feet.idiom.nervous')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-12', 6, 1, (SELECT id FROM vocab_categories WHERE slug='emotion-idioms'), 'Emotion idioms', '感情の言い回し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-12'), s.id, x.ord FROM (VALUES
  ('on-edge.idiom.tense',0),('over-the-moon.idiom.thrilled',1),('down-in-dumps.idiom.sad',2),('mixed-feelings.idiom.ambivalent',3),('at-ease.idiom.relaxed',4),('on-cloud-nine.idiom.euphoric',5),('lose-your-cool.idiom.angry',6),('get-cold-feet.idiom.nervous',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-12'), 'conversation', 0, 'Big news', '大きな知らせ', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-12'), 'travel', 1, 'The night before', '旅立ちの前夜', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-12'), 'business', 2, 'Under pressure', 'プレッシャーの中で', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 0, 'npc', 'You got the job! How do you feel?', '仕事決まったね！どんな気分？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 1, 'user', 'I''m {over the moon}, I can''t stop smiling!', '大喜び、笑いが止まらない！', 'over the moon', (SELECT id FROM vocab_senses WHERE slug='over-the-moon.idiom.thrilled'), ARRAY['over the moon','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 2, 'npc', 'You deserve it! Any nerves?', '当然だよ！不安は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 3, 'user', 'A few {mixed feelings}; I''ll miss my old team.', '少し複雑な気持ち、前のチームが恋しくなる。', 'mixed feelings', (SELECT id FROM vocab_senses WHERE slug='mixed-feelings.idiom.ambivalent'), ARRAY['mixed feelings','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 4, 'npc', 'Understandable.', '分かるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 5, 'user', 'I''m a bit {on edge} about the first day.', '初日のことでちょっとピリピリしてる。', 'on edge', (SELECT id FROM vocab_senses WHERE slug='on-edge.idiom.tense'), ARRAY['on edge','over the moon','at ease','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 6, 'npc', 'You''ll settle fast.', 'すぐ慣れるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 7, 'user', 'I hope I don''t {get cold feet} before starting.', '始める前に怖じ気づかないといいけど。', 'get cold feet', (SELECT id FROM vocab_senses WHERE slug='get-cold-feet.idiom.nervous'), ARRAY['get cold feet','over the moon','at ease','mixed feelings']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 8, 'npc', 'You won''t. Remember last month?', '大丈夫。先月のこと覚えてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 9, 'user', 'Yeah, I was so {down in the dumps} then.', 'うん、あの時はすごく落ち込んでた。', 'down in the dumps', (SELECT id FROM vocab_senses WHERE slug='down-in-dumps.idiom.sad'), ARRAY['down in the dumps','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 10, 'npc', 'And now look at you!', 'それが今や！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 11, 'user', 'True, I feel more {at ease} now.', '確かに、今はもっと落ち着いてる。', 'at ease', (SELECT id FROM vocab_senses WHERE slug='at-ease.idiom.relaxed'), ARRAY['at ease','over the moon','on edge','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 12, 'npc', 'Let''s celebrate!', 'お祝いしよう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 13, 'user', 'Yes, please!', 'ぜひ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='conversation'), 14, 'npc', 'So proud of you, {{user_name}}.', '誇らしいよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 0, 'npc', 'Tomorrow''s the big trip!', '明日は待ちに待った旅！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 1, 'user', 'I''m {on cloud nine}, I''ve dreamed of this for years.', '有頂天、何年も夢見てたんだ。', 'on cloud nine', (SELECT id FROM vocab_senses WHERE slug='on-cloud-nine.idiom.euphoric'), ARRAY['on cloud nine','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 2, 'npc', 'Any last-minute doubts?', '直前の迷いは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 3, 'user', 'A little; I hope I don''t {get cold feet} at the airport.', '少し、空港で怖じ気づかないといいけど。', 'get cold feet', (SELECT id FROM vocab_senses WHERE slug='get-cold-feet.idiom.nervous'), ARRAY['get cold feet','over the moon','at ease','mixed feelings']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 4, 'npc', 'You''ll be fine once you board.', '乗ってしまえば大丈夫。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 5, 'user', 'I''m {on edge} about the long flight, though.', 'でも長いフライトでピリピリしてる。', 'on edge', (SELECT id FROM vocab_senses WHERE slug='on-edge.idiom.tense'), ARRAY['on edge','over the moon','at ease','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 6, 'npc', 'Watch a movie, relax.', '映画でも見てリラックス。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 7, 'user', 'Good idea; that''ll put me {at ease}.', 'いいね、それで落ち着ける。', 'at ease', (SELECT id FROM vocab_senses WHERE slug='at-ease.idiom.relaxed'), ARRAY['at ease','over the moon','on edge','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 8, 'npc', 'Excited to leave home?', '家を離れるの、わくわくする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 9, 'user', '{mixed feelings}; I''ll miss my dog.', '複雑、愛犬が恋しくなる。', 'mixed feelings', (SELECT id FROM vocab_senses WHERE slug='mixed-feelings.idiom.ambivalent'), ARRAY['mixed feelings','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 10, 'npc', 'He''ll be waiting when you''re back.', '帰ったら待ってるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 11, 'user', 'True. Overall I''m {over the moon}.', '確かに。全体的には大喜び。', 'over the moon', (SELECT id FROM vocab_senses WHERE slug='over-the-moon.idiom.thrilled'), ARRAY['over the moon','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 12, 'npc', 'Have the time of your life!', '最高の時間を！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 13, 'user', 'I will!', 'うん！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='travel'), 14, 'npc', 'Send postcards!', '絵葉書送ってね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 0, 'npc', 'The deadline is crushing everyone.', '締め切りでみんな押しつぶされそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 1, 'user', 'The whole team is {on edge} today.', '今日はチーム全体がピリピリしてる。', 'on edge', (SELECT id FROM vocab_senses WHERE slug='on-edge.idiom.tense'), ARRAY['on edge','over the moon','at ease','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 2, 'npc', 'Tempers are short.', 'みんな気が立ってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 3, 'user', 'I nearly did {lose your cool} in the standup.', '朝会で冷静さを失いそうだった。', 'lose your cool', (SELECT id FROM vocab_senses WHERE slug='lose-your-cool.idiom.angry'), ARRAY['lose your cool','at ease','over the moon','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 4, 'npc', 'Take a breather.', '一息ついて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 5, 'user', 'A short walk puts me {at ease}.', '短い散歩で落ち着く。', 'at ease', (SELECT id FROM vocab_senses WHERE slug='at-ease.idiom.relaxed'), ARRAY['at ease','over the moon','on edge','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 6, 'npc', 'Did we win the client, by the way?', 'ところでクライアント取れた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 7, 'user', 'Yes! I''m {over the moon} about it.', 'うん！それについては大喜び。', 'over the moon', (SELECT id FROM vocab_senses WHERE slug='over-the-moon.idiom.thrilled'), ARRAY['over the moon','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 8, 'npc', 'That lifts the mood!', '気分が上がるね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 9, 'user', 'For sure. People were {down in the dumps} last week.', '本当に。先週はみんな落ち込んでた。', 'down in the dumps', (SELECT id FROM vocab_senses WHERE slug='down-in-dumps.idiom.sad'), ARRAY['down in the dumps','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 10, 'npc', 'Feelings about the extra work, though?', 'でも追加業務については？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 11, 'user', 'Honestly, {mixed feelings}; proud but tired.', '正直、複雑、誇らしいけど疲れた。', 'mixed feelings', (SELECT id FROM vocab_senses WHERE slug='mixed-feelings.idiom.ambivalent'), ARRAY['mixed feelings','over the moon','at ease','on edge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 12, 'npc', 'Let''s celebrate briefly, then rest.', '少しお祝いして、休もう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 13, 'user', 'Sounds perfect.', '完璧。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-12') AND goal='business'), 14, 'npc', 'Well earned, {{user_name}}.', 'よく頑張った、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-13.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-13 - In conversation  (Unit 7)
-- Words: chime in, butt in, talk over, drown out, blurt out, ramble on, tune out, get through to.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('in-conversation-c1', 'In conversation', '会話の中で', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('chime in', 'chime in', '/ˌtʃaɪm ˈɪn/', '/ˌtʃaɪm ˈɪn/', NULL, 5, FALSE, NULL),
  ('butt in', 'butt in', '/ˌbʌt ˈɪn/', '/ˌbʌt ˈɪn/', NULL, 5, FALSE, NULL),
  ('talk over', 'talk over', '/ˌtɔːk ˈoʊvər/', '/ˌtɔːk ˈəʊvə/', NULL, 5, FALSE, NULL),
  ('drown out', 'drown out', '/ˌdraʊn ˈaʊt/', '/ˌdraʊn ˈaʊt/', NULL, 5, FALSE, NULL),
  ('blurt out', 'blurt out', '/ˌblɜːrt ˈaʊt/', '/ˌblɜːt ˈaʊt/', NULL, 5, FALSE, NULL),
  ('ramble on', 'ramble on', '/ˌræmbl ˈɑːn/', '/ˌræmbl ˈɒn/', NULL, 5, FALSE, NULL),
  ('tune out', 'tune out', '/ˌtuːn ˈaʊt/', '/ˌtjuːn ˈaʊt/', NULL, 5, FALSE, NULL),
  ('get through to', 'get through to', '/ˌɡet ˈθruː tuː/', '/ˌɡet ˈθruː tuː/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='chime in'), 'chime-in.phrv.join', 1, TRUE, 'phrasal verb', '口をはさむ（賛同的に）', 'to add your comment to a conversation', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='butt in'), 'butt-in.phrv.interrupt', 1, TRUE, 'phrasal verb', '（無礼に）割り込む', 'to interrupt rudely', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='talk over'), 'talk-over.phrv.interrupt2', 1, TRUE, 'phrasal verb', '話にかぶせる', 'to keep talking while another person is speaking', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='drown out'), 'drown-out.phrv.mask', 1, TRUE, 'phrasal verb', '（音を）かき消す', 'to be so loud that another sound cannot be heard', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='blurt out'), 'blurt-out.phrv.exclaim', 1, TRUE, 'phrasal verb', '思わず口走る', 'to say something suddenly without thinking', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ramble on'), 'ramble-on.phrv.digress', 1, TRUE, 'phrasal verb', 'だらだら話す', 'to talk for a long time in a boring way', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tune out'), 'tune-out.phrv.ignore', 1, TRUE, 'phrasal verb', '聞き流す', 'to stop paying attention', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get through to'), 'get-through-to.phrv.reach', 1, TRUE, 'phrasal verb', '分からせる', 'to make someone understand you', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('chime in', 'butt in', 'talk over', 'drown out', 'blurt out', 'ramble on', 'tune out', 'get through to')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), (SELECT id FROM vocab_senses WHERE slug='butt-in.phrv.interrupt'), NULL, 'confusable', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='in-conversation-c1'
WHERE s.slug IN ('chime-in.phrv.join', 'butt-in.phrv.interrupt', 'talk-over.phrv.interrupt2', 'drown-out.phrv.mask', 'blurt-out.phrv.exclaim', 'ramble-on.phrv.digress', 'tune-out.phrv.ignore', 'get-through-to.phrv.reach')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-13', 7, 0, (SELECT id FROM vocab_categories WHERE slug='in-conversation-c1'), 'In conversation', '会話の中で', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-13'), s.id, x.ord FROM (VALUES
  ('chime-in.phrv.join',0),('butt-in.phrv.interrupt',1),('talk-over.phrv.interrupt2',2),('drown-out.phrv.mask',3),('blurt-out.phrv.exclaim',4),('ramble-on.phrv.digress',5),('tune-out.phrv.ignore',6),('get-through-to.phrv.reach',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-13'), 'conversation', 0, 'Chaotic group chats', 'にぎやかな会話', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-13'), 'travel', 1, 'A noisy market', 'にぎやかな市場', 'market', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-13'), 'business', 2, 'A messy meeting', 'まとまらない会議', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 0, 'npc', 'Our group chats get chaotic.', 'うちのグループ会話、カオスになるよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 1, 'user', 'Yeah, people {talk over} each other constantly.', 'うん、みんな絶えずかぶせて話す。', 'talk over', (SELECT id FROM vocab_senses WHERE slug='talk-over.phrv.interrupt2'), ARRAY['talk over','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 2, 'npc', 'And some interrupt rudely.', '無礼に割り込む人もいる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 3, 'user', 'One guy loves to {butt in} mid-sentence.', '一人、話の途中で割り込むのが好きで。', 'butt in', (SELECT id FROM vocab_senses WHERE slug='butt-in.phrv.interrupt'), ARRAY['butt in','chime in','ramble on','tune out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 4, 'npc', 'Do you jump in much?', '君はよく入る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 5, 'user', 'Only to {chime in} with a quick agreement.', '短く同意で口をはさむくらい。', 'chime in', (SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), ARRAY['chime in','butt in','talk over','drown out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 6, 'npc', 'Anyone talk too long?', '長話する人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 7, 'user', 'My uncle can {ramble on} for an hour.', 'おじは1時間だらだら話せる。', 'ramble on', (SELECT id FROM vocab_senses WHERE slug='ramble-on.phrv.digress'), ARRAY['ramble on','chime in','tune out','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 8, 'npc', 'How do you cope?', 'どう耐える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 9, 'user', 'Honestly, I {tune out} sometimes.', '正直、たまに聞き流す。', 'tune out', (SELECT id FROM vocab_senses WHERE slug='tune-out.phrv.ignore'), ARRAY['tune out','chime in','butt in','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 10, 'npc', 'Ever say the wrong thing?', '失言したことある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 11, 'user', 'Ha, I once {blurt out} a secret by accident.', 'はは、一度うっかり秘密を口走った。', 'blurt out', (SELECT id FROM vocab_senses WHERE slug='blurt-out.phrv.exclaim'), ARRAY['blurt out','chime in','tune out','ramble on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 12, 'npc', 'Classic!', 'あるある！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 13, 'user', 'Never again!', 'もう二度と！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 14, 'npc', 'We''ve all done it, {{user_name}}.', 'みんなやるよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 0, 'npc', 'This market is so noisy!', 'この市場、すごくうるさい！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 1, 'user', 'The music totally {drown out} our voices.', '音楽が私たちの声を完全にかき消してる。', 'drown out', (SELECT id FROM vocab_senses WHERE slug='drown-out.phrv.mask'), ARRAY['drown out','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 2, 'npc', 'I can barely hear the vendor.', '店主の声がほとんど聞こえない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 3, 'user', 'It''s hard to {get through to} him over the noise.', 'この騒音じゃ、彼に通じさせるのが難しい。', 'get through to', (SELECT id FROM vocab_senses WHERE slug='get-through-to.phrv.reach'), ARRAY['get through to','chime in','blurt out','talk over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 4, 'npc', 'Try hand gestures.', '身ぶりで試して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 5, 'user', 'I just {blurt out} the price in bad local language!', '下手な現地語で値段を口走った！', 'blurt out', (SELECT id FROM vocab_senses WHERE slug='blurt-out.phrv.exclaim'), ARRAY['blurt out','chime in','tune out','talk over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 6, 'npc', 'Ha, brave.', 'はは、勇気ある。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 7, 'user', 'A kind stranger did {chime in} to translate.', '親切な人が通訳しに口をはさんでくれた。', 'chime in', (SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), ARRAY['chime in','butt in','drown out','tune out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 8, 'npc', 'Lucky! People here are chatty.', 'ラッキー！ここの人はおしゃべり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 9, 'user', 'Yeah, three of them {talk over} each other helping us.', 'うん、3人がかぶせ合いながら助けてくれた。', 'talk over', (SELECT id FROM vocab_senses WHERE slug='talk-over.phrv.interrupt2'), ARRAY['talk over','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 10, 'npc', 'One kept interrupting, though.', 'でも一人ずっと割り込んでた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 11, 'user', 'Right, he''d {butt in} every time I spoke.', 'そう、話すたびに割り込んできた。', 'butt in', (SELECT id FROM vocab_senses WHERE slug='butt-in.phrv.interrupt'), ARRAY['butt in','chime in','drown out','tune out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 12, 'npc', 'Still, we got the scarf!', 'それでもスカーフ買えた！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 13, 'user', 'Success!', '成功！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 14, 'npc', 'Great haggling!', '値切り上手！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 0, 'npc', 'That meeting was hard to follow.', 'あの会議、話が追いにくかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 1, 'user', 'Two people kept trying to {talk over} each other.', '2人がかぶせ合おうとしてた。', 'talk over', (SELECT id FROM vocab_senses WHERE slug='talk-over.phrv.interrupt2'), ARRAY['talk over','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 2, 'npc', 'Hard to make a point.', '主張しづらいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 3, 'user', 'I struggled to {get through to} the group.', 'グループに分からせるのに苦労した。', 'get through to', (SELECT id FROM vocab_senses WHERE slug='get-through-to.phrv.reach'), ARRAY['get through to','chime in','blurt out','talk over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 4, 'npc', 'The manager rambled.', 'マネージャーが長々話してた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 5, 'user', 'Yeah, he did {ramble on} about old projects.', 'うん、昔のプロジェクトをだらだら話してた。', 'ramble on', (SELECT id FROM vocab_senses WHERE slug='ramble-on.phrv.digress'), ARRAY['ramble on','chime in','tune out','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 6, 'npc', 'I zoned out.', '私は上の空だった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 7, 'user', 'Same, I started to {tune out} halfway.', '同じ、途中から聞き流し始めた。', 'tune out', (SELECT id FROM vocab_senses WHERE slug='tune-out.phrv.ignore'), ARRAY['tune out','chime in','butt in','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 8, 'npc', 'Did you add anything?', '何か発言した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 9, 'user', 'I only {chime in} at the end with the numbers.', '最後に数字だけ口をはさんだ。', 'chime in', (SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), ARRAY['chime in','butt in','talk over','drown out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 10, 'npc', 'And that intern kept interrupting.', 'それにあのインターンが割り込み続けた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 11, 'user', 'Yes, she''d {butt in} constantly.', 'そう、絶えず割り込んでた。', 'butt in', (SELECT id FROM vocab_senses WHERE slug='butt-in.phrv.interrupt'), ARRAY['butt in','chime in','drown out','tune out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 12, 'npc', 'Next time, an agenda.', '次回は議題を用意しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 13, 'user', 'Agreed.', '賛成。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 14, 'npc', 'Good idea, {{user_name}}.', 'いい考え、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-14.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-14 - Social phrases  (Unit 7)
-- Words: break the ice, small talk, on the same wavelength, keep in touch, out of the blue, strike up, read between the lines, put in a good word.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('social-phrases', 'Social phrases', '社交の言い回し', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('break the ice', 'break the ice', '/ˌbreɪk ðə ˈaɪs/', '/ˌbreɪk ðə ˈaɪs/', NULL, 5, FALSE, NULL),
  ('small talk', 'small talk', '/ˌsmɔːl ˈtɔːk/', '/ˌsmɔːl ˈtɔːk/', NULL, 5, FALSE, NULL),
  ('on the same wavelength', 'on the same wavelength', '/ˌɑːn ðə seɪm ˈweɪvleŋθ/', '/ˌɒn ðə seɪm ˈweɪvleŋθ/', NULL, 5, FALSE, NULL),
  ('keep in touch', 'keep in touch', '/ˌkiːp ɪn ˈtʌtʃ/', '/ˌkiːp ɪn ˈtʌtʃ/', NULL, 5, FALSE, NULL),
  ('out of the blue', 'out of the blue', '/ˌaʊt əv ðə ˈbluː/', '/ˌaʊt əv ðə ˈbluː/', NULL, 5, FALSE, NULL),
  ('strike up', 'strike up', '/ˌstraɪk ˈʌp/', '/ˌstraɪk ˈʌp/', NULL, 5, FALSE, NULL),
  ('read between the lines', 'read between the lines', '/ˌriːd bɪtwiːn ðə ˈlaɪnz/', '/ˌriːd bɪtwiːn ðə ˈlaɪnz/', NULL, 5, FALSE, NULL),
  ('put in a good word', 'put in a good word', '/ˌpʊt ɪn ə ɡʊd ˈwɜːrd/', '/ˌpʊt ɪn ə ɡʊd ˈwɜːd/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='break the ice'), 'break-the-ice.idiom.relax', 1, TRUE, 'idiom', '打ち解けるきっかけを作る', 'to make people feel relaxed when they first meet', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='small talk'), 'small-talk.idiom.chat', 1, TRUE, 'idiom', '世間話', 'polite conversation about unimportant things', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='on the same wavelength'), 'same-wavelength.idiom.attuned', 1, TRUE, 'idiom', '波長が合う', 'understanding each other well and easily', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='keep in touch'), 'keep-in-touch.idiom.contact', 1, TRUE, 'idiom', '連絡を取り合う', 'to stay in contact with someone', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='out of the blue'), 'out-of-the-blue.idiom.sudden', 1, TRUE, 'idiom', '出し抜けに', 'suddenly and unexpectedly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='strike up'), 'strike-up.phrv.begin', 1, TRUE, 'phrasal verb', '（会話を）始める', 'to start a conversation with someone', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='read between the lines'), 'read-between-lines.idiom.infer', 1, TRUE, 'idiom', '行間を読む', 'to understand a hidden or implied meaning', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put in a good word'), 'put-in-good-word.idiom.recommend', 1, TRUE, 'idiom', '口添えする', 'to say something good about someone to help them', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('break the ice', 'small talk', 'on the same wavelength', 'keep in touch', 'out of the blue', 'strike up', 'read between the lines', 'put in a good word')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='social-phrases'
WHERE s.slug IN ('break-the-ice.idiom.relax', 'small-talk.idiom.chat', 'same-wavelength.idiom.attuned', 'keep-in-touch.idiom.contact', 'out-of-the-blue.idiom.sudden', 'strike-up.phrv.begin', 'read-between-lines.idiom.infer', 'put-in-good-word.idiom.recommend')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-14', 7, 1, (SELECT id FROM vocab_categories WHERE slug='social-phrases'), 'Social phrases', '社交の言い回し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-14'), s.id, x.ord FROM (VALUES
  ('break-the-ice.idiom.relax',0),('small-talk.idiom.chat',1),('same-wavelength.idiom.attuned',2),('keep-in-touch.idiom.contact',3),('out-of-the-blue.idiom.sudden',4),('strike-up.phrv.begin',5),('read-between-lines.idiom.infer',6),('put-in-good-word.idiom.recommend',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-14'), 'conversation', 0, 'At a party', 'パーティーで', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-14'), 'travel', 1, 'Meeting travelers', '旅仲間との出会い', 'hostel', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-14'), 'business', 2, 'Networking', '人脈づくり', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 0, 'npc', 'How was the party?', 'パーティーどうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 1, 'user', 'Fun! A game helped {break the ice}.', '楽しかった！ゲームで打ち解けられた。', 'break the ice', (SELECT id FROM vocab_senses WHERE slug='break-the-ice.idiom.relax'), ARRAY['break the ice','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 2, 'npc', 'Meet anyone interesting?', '面白い人に会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 3, 'user', 'After some {small talk}, I met a cool designer.', '世間話のあと、いいデザイナーに会った。', 'small talk', (SELECT id FROM vocab_senses WHERE slug='small-talk.idiom.chat'), ARRAY['small talk','break the ice','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 4, 'npc', 'Did you click?', '気が合った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 5, 'user', 'Totally {on the same wavelength}; same humor.', '完全に波長が合った、笑いのツボも同じ。', 'on the same wavelength', (SELECT id FROM vocab_senses WHERE slug='same-wavelength.idiom.attuned'), ARRAY['on the same wavelength','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 6, 'npc', 'Will you see them again?', 'また会う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 7, 'user', 'Yes, we agreed to {keep in touch}.', 'うん、連絡を取り合うことにした。', 'keep in touch', (SELECT id FROM vocab_senses WHERE slug='keep-in-touch.idiom.contact'), ARRAY['keep in touch','small talk','break the ice','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 8, 'npc', 'Any surprises?', '驚くことは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 9, 'user', 'My ex showed up {out of the blue}!', '元カレが出し抜けに現れた！', 'out of the blue', (SELECT id FROM vocab_senses WHERE slug='out-of-the-blue.idiom.sudden'), ARRAY['out of the blue','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 10, 'npc', 'Awkward! Were they weird?', '気まずい！変な感じだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 11, 'user', 'A bit; I could {read between the lines} that they were nervous.', '少し、緊張してるのが行間から読み取れた。', 'read between the lines', (SELECT id FROM vocab_senses WHERE slug='read-between-lines.idiom.infer'), ARRAY['read between the lines','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 12, 'npc', 'Drama!', 'ドラマだね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 13, 'user', 'Just a little.', 'ちょっとだけね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='conversation'), 14, 'npc', 'Tell me everything, {{user_name}}.', '全部教えて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 0, 'npc', 'New hostel, new people!', '新しいホステル、新しい出会い！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 1, 'user', 'A shared dinner helped {break the ice}.', 'みんなで夕食を食べて打ち解けた。', 'break the ice', (SELECT id FROM vocab_senses WHERE slug='break-the-ice.idiom.relax'), ARRAY['break the ice','small talk','keep in touch','strike up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 2, 'npc', 'Easy to chat?', '話しやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 3, 'user', 'Yeah, after {small talk} about routes.', 'うん、ルートの世間話のあとね。', 'small talk', (SELECT id FROM vocab_senses WHERE slug='small-talk.idiom.chat'), ARRAY['small talk','break the ice','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 4, 'npc', 'Anyone you connected with?', '気の合った人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 5, 'user', 'One couple, totally {on the same wavelength}.', 'あるカップル、完全に波長が合った。', 'on the same wavelength', (SELECT id FROM vocab_senses WHERE slug='same-wavelength.idiom.attuned'), ARRAY['on the same wavelength','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 6, 'npc', 'Swapping contacts?', '連絡先交換する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 7, 'user', 'Yes, we''ll {keep in touch} after the trip.', 'うん、旅のあとも連絡を取り合う。', 'keep in touch', (SELECT id FROM vocab_senses WHERE slug='keep-in-touch.idiom.contact'), ARRAY['keep in touch','small talk','break the ice','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 8, 'npc', 'Any surprises?', '驚くことは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 9, 'user', 'A free tour offer came {out of the blue}.', '無料ツアーの誘いが出し抜けに来た。', 'out of the blue', (SELECT id FROM vocab_senses WHERE slug='out-of-the-blue.idiom.sudden'), ARRAY['out of the blue','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 10, 'npc', 'Nice! You''re social here.', 'いいね！ここでは社交的だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 11, 'user', 'I love how easy it is to {strike up} a chat here.', 'ここは会話を始めやすくて最高。', 'strike up', (SELECT id FROM vocab_senses WHERE slug='strike-up.phrv.begin'), ARRAY['strike up','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 12, 'npc', 'Travel brings people together.', '旅は人をつなぐね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 13, 'user', 'So true.', '本当に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='travel'), 14, 'npc', 'Onward!', '次へ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 0, 'npc', 'The conference is great for contacts.', 'この会議は人脈づくりに最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 1, 'user', 'Yeah, I did {strike up} chats with three founders.', 'うん、創業者3人と会話を始めた。', 'strike up', (SELECT id FROM vocab_senses WHERE slug='strike-up.phrv.begin'), ARRAY['strike up','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 2, 'npc', 'Good networking. Easy to start?', 'いい人脈づくり。始めやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 3, 'user', 'A joke helped {break the ice} each time.', '毎回ジョークで打ち解けられた。', 'break the ice', (SELECT id FROM vocab_senses WHERE slug='break-the-ice.idiom.relax'), ARRAY['break the ice','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 4, 'npc', 'Then business talk?', 'それからビジネスの話？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 5, 'user', 'After light {small talk}, yeah.', '軽い世間話のあとにね。', 'small talk', (SELECT id FROM vocab_senses WHERE slug='small-talk.idiom.chat'), ARRAY['small talk','break the ice','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 6, 'npc', 'Any strong connection?', '強いつながりは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 7, 'user', 'One investor was really {on the same wavelength}.', 'ある投資家と本当に波長が合った。', 'on the same wavelength', (SELECT id FROM vocab_senses WHERE slug='same-wavelength.idiom.attuned'), ARRAY['on the same wavelength','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 8, 'npc', 'Could you tell they were keen?', '乗り気だと分かった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 9, 'user', 'I could {read between the lines}; they seemed interested.', '行間を読めた、興味ありそうだった。', 'read between the lines', (SELECT id FROM vocab_senses WHERE slug='read-between-lines.idiom.infer'), ARRAY['read between the lines','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 10, 'npc', 'Want an intro to their partner?', '相手のパートナーに紹介する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 11, 'user', 'Please, could you {put in a good word} for me?', 'ぜひ、口添えしてもらえる？', 'put in a good word', (SELECT id FROM vocab_senses WHERE slug='put-in-good-word.idiom.recommend'), ARRAY['put in a good word','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 12, 'npc', 'Consider it done.', '任せて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 13, 'user', 'Thank you!', 'ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-14') AND goal='business'), 14, 'npc', 'Happy to help, {{user_name}}.', '喜んで、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-15.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-15 - Achievement  (Unit 8)
-- Words: pull off, live up to, carry off, sail through, bounce back, press on, forge ahead, come through.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('achievement-c1', 'Achievement', '成し遂げる', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pull off', 'pull off', '/ˌpʊl ˈɔːf/', '/ˌpʊl ˈɒf/', NULL, 5, FALSE, NULL),
  ('live up to', 'live up to', '/ˌlɪv ˈʌp tuː/', '/ˌlɪv ˈʌp tuː/', NULL, 5, FALSE, NULL),
  ('carry off', 'carry off', '/ˌkæri ˈɔːf/', '/ˌkæri ˈɒf/', NULL, 5, FALSE, NULL),
  ('sail through', 'sail through', '/ˌseɪl ˈθruː/', '/ˌseɪl ˈθruː/', NULL, 5, FALSE, NULL),
  ('bounce back', 'bounce back', '/ˌbaʊns ˈbæk/', '/ˌbaʊns ˈbæk/', NULL, 5, FALSE, NULL),
  ('press on', 'press on', '/ˌpres ˈɑːn/', '/ˌpres ˈɒn/', NULL, 5, FALSE, NULL),
  ('forge ahead', 'forge ahead', '/ˌfɔːrdʒ əˈhed/', '/ˌfɔːdʒ əˈhed/', NULL, 5, FALSE, NULL),
  ('come through', 'come through', '/ˌkʌm ˈθruː/', '/ˌkʌm ˈθruː/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pull off'), 'pull-off.phrv.achieve', 1, TRUE, 'phrasal verb', '（難しいことを）成し遂げる', 'to succeed in doing something difficult', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='live up to'), 'live-up-to.phrv.meet', 1, TRUE, 'phrasal verb', '期待に応える', 'to be as good as people expected', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='carry off'), 'carry-off.phrv.manage', 1, TRUE, 'phrasal verb', 'うまくやってのける', 'to do something difficult successfully', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sail through'), 'sail-through.phrv.pass', 1, TRUE, 'phrasal verb', '楽々と通過する', 'to succeed at something very easily', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bounce back'), 'bounce-back.phrv.recover', 1, TRUE, 'phrasal verb', '立ち直る', 'to recover quickly after a setback', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='press on'), 'press-on.phrv.persist', 1, TRUE, 'phrasal verb', '頑張って続ける', 'to continue doing something despite difficulty', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='forge ahead'), 'forge-ahead.phrv.advance', 1, TRUE, 'phrasal verb', '力強く前進する', 'to move forward with determination', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='come through'), 'come-through.phrv.deliver', 1, TRUE, 'phrasal verb', '期待に応えて助ける', 'to do what is needed in a difficult time', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pull off', 'live up to', 'carry off', 'sail through', 'bounce back', 'press on', 'forge ahead', 'come through')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='press-on.phrv.persist'), (SELECT id FROM vocab_senses WHERE slug='forge-ahead.phrv.advance'), NULL, 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='achievement-c1'
WHERE s.slug IN ('pull-off.phrv.achieve', 'live-up-to.phrv.meet', 'carry-off.phrv.manage', 'sail-through.phrv.pass', 'bounce-back.phrv.recover', 'press-on.phrv.persist', 'forge-ahead.phrv.advance', 'come-through.phrv.deliver')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-15', 8, 0, (SELECT id FROM vocab_categories WHERE slug='achievement-c1'), 'Achievement', 'やり遂げる', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-15'), s.id, x.ord FROM (VALUES
  ('pull-off.phrv.achieve',0),('live-up-to.phrv.meet',1),('carry-off.phrv.manage',2),('sail-through.phrv.pass',3),('bounce-back.phrv.recover',4),('press-on.phrv.persist',5),('forge-ahead.phrv.advance',6),('come-through.phrv.deliver',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-15'), 'conversation', 0, 'After the marathon', 'マラソンのあと', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-15'), 'travel', 1, 'A tough trek', '過酷なトレッキング', 'mountain', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-15'), 'business', 2, 'A launch delivered', 'ローンチ達成', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 0, 'npc', 'You finished the marathon!', 'マラソン完走したね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 1, 'user', 'I still can''t believe I did {pull off} the whole thing.', '全部やり遂げたなんて、まだ信じられない。', 'pull off', (SELECT id FROM vocab_senses WHERE slug='pull-off.phrv.achieve'), ARRAY['pull off','live up to','sail through','bounce back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 2, 'npc', 'Was training hard?', '練習はきつかった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 3, 'user', 'Brutal, but I had to {press on}.', '過酷、でも頑張って続けるしかなかった。', 'press on', (SELECT id FROM vocab_senses WHERE slug='press-on.phrv.persist'), ARRAY['press on','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 4, 'npc', 'Any setbacks?', 'つまずきは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 5, 'user', 'An injury, but I did {bounce back} quickly.', 'けがしたけど、すぐ立ち直った。', 'bounce back', (SELECT id FROM vocab_senses WHERE slug='bounce-back.phrv.recover'), ARRAY['bounce back','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 6, 'npc', 'Did the race meet the hype?', 'レースは評判通りだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 7, 'user', 'It totally did {live up to} my expectations.', '完全に期待に応えてくれた。', 'live up to', (SELECT id FROM vocab_senses WHERE slug='live-up-to.phrv.meet'), ARRAY['live up to','pull off','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 8, 'npc', 'Was the last mile okay?', '最後の1マイルは大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 9, 'user', 'Surprisingly, I did {sail through} the finish.', '意外にも、ゴールは楽々だった。', 'sail through', (SELECT id FROM vocab_senses WHERE slug='sail-through.phrv.pass'), ARRAY['sail through','pull off','press on','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 10, 'npc', 'Your friends cheered?', '友達は応援した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 11, 'user', 'Yeah, they did {come through} with signs and snacks.', 'うん、みんな応援ボードと軽食で駆けつけてくれた。', 'come through', (SELECT id FROM vocab_senses WHERE slug='come-through.phrv.deliver'), ARRAY['come through','pull off','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 12, 'npc', 'Amazing support.', 'すごい応援。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 13, 'user', 'Best day.', '最高の日。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 14, 'npc', 'So proud, {{user_name}}.', '誇らしいよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 0, 'npc', 'This trek is exhausting.', 'このトレッキング、へとへと。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 1, 'user', 'I know, but let''s {press on} to the summit.', 'わかる、でも頂上まで頑張って続けよう。', 'press on', (SELECT id FROM vocab_senses WHERE slug='press-on.phrv.persist'), ARRAY['press on','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 2, 'npc', 'The path is steep now.', '道が急になってきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 3, 'user', 'We''ll {forge ahead}; the view is worth it.', '力強く前進しよう、景色にその価値がある。', 'forge ahead', (SELECT id FROM vocab_senses WHERE slug='forge-ahead.phrv.advance'), ARRAY['forge ahead','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 4, 'npc', 'You slipped earlier, okay?', 'さっき滑ったけど大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 5, 'user', 'Fine now; I did {bounce back} fast.', 'もう平気、すぐ立ち直った。', 'bounce back', (SELECT id FROM vocab_senses WHERE slug='bounce-back.phrv.recover'), ARRAY['bounce back','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 6, 'npc', 'Think we can finish today?', '今日中に終わると思う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 7, 'user', 'If we push, we can {pull off} the full loop.', '頑張れば、周回を成し遂げられる。', 'pull off', (SELECT id FROM vocab_senses WHERE slug='pull-off.phrv.achieve'), ARRAY['pull off','live up to','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 8, 'npc', 'The guide made it look easy.', 'ガイドは簡単そうにやってたね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 9, 'user', 'Yeah, she did {carry off} the tricky parts smoothly.', 'うん、難所を軽々とやってのけた。', 'carry off', (SELECT id FROM vocab_senses WHERE slug='carry-off.phrv.manage'), ARRAY['carry off','live up to','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 10, 'npc', 'And the river crossing?', '川渡りは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 11, 'user', 'We did {sail through} it, no problem.', '楽々と渡れた、問題なし。', 'sail through', (SELECT id FROM vocab_senses WHERE slug='sail-through.phrv.pass'), ARRAY['sail through','pull off','press on','forge ahead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 12, 'npc', 'We''re doing great!', 'いい調子！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 13, 'user', 'Almost there!', 'もうすぐ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 14, 'npc', 'Keep going!', 'その調子！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 0, 'npc', 'We shipped the launch on time!', '予定通りローンチできた！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 1, 'user', 'I can''t believe we did {pull off} such a tight deadline.', 'こんなきつい締め切りを成し遂げたなんて。', 'pull off', (SELECT id FROM vocab_senses WHERE slug='pull-off.phrv.achieve'), ARRAY['pull off','live up to','sail through','bounce back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 2, 'npc', 'The team was incredible.', 'チームがすごかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 3, 'user', 'Everyone did {come through} in the final week.', '最終週、みんなが期待に応えてくれた。', 'come through', (SELECT id FROM vocab_senses WHERE slug='come-through.phrv.deliver'), ARRAY['come through','live up to','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 4, 'npc', 'Did it meet the client''s hopes?', 'クライアントの期待に応えた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 5, 'user', 'It really did {live up to} their expectations.', '本当に期待に応えた。', 'live up to', (SELECT id FROM vocab_senses WHERE slug='live-up-to.phrv.meet'), ARRAY['live up to','pull off','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 6, 'npc', 'There was that mid-project crisis.', '途中で危機があったよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 7, 'user', 'True, but we did {bounce back} strong.', '確かに、でも力強く立ち直った。', 'bounce back', (SELECT id FROM vocab_senses WHERE slug='bounce-back.phrv.recover'), ARRAY['bounce back','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 8, 'npc', 'Now the next phase?', '次のフェーズは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 9, 'user', 'Yes, let''s {forge ahead} with version two.', 'うん、バージョン2に力強く進もう。', 'forge ahead', (SELECT id FROM vocab_senses WHERE slug='forge-ahead.phrv.advance'), ARRAY['forge ahead','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 10, 'npc', 'The demo was flawless.', 'デモは完璧だった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 11, 'user', 'The presenter did {carry off} it beautifully.', '発表者が見事にやってのけた。', 'carry off', (SELECT id FROM vocab_senses WHERE slug='carry-off.phrv.manage'), ARRAY['carry off','live up to','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 12, 'npc', 'Great quarter.', 'いい四半期。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 13, 'user', 'Proud of us.', '誇らしい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 14, 'npc', 'Well done, {{user_name}}.', 'よくやった、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-16.sql =====
-- ============================================================================
-- Vocab 103: vocab-103-16 - Success & failure idioms  (Unit 8)
-- Words: against the odds, a steep learning curve, in the long run, cut it close, hang in there, go the extra mile, throw in the towel, pay dividends.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('success-failure-idioms', 'Success & failure idioms', '成功と失敗の言い回し', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('against the odds', 'against the odds', '/əˌɡenst ði ˈɑːdz/', '/əˌɡenst ði ˈɒdz/', NULL, 5, FALSE, NULL),
  ('a steep learning curve', 'a steep learning curve', '/ə ˌstiːp ˈlɜːrnɪŋ kɜːrv/', '/ə ˌstiːp ˈlɜːnɪŋ kɜːv/', NULL, 5, FALSE, NULL),
  ('in the long run', 'in the long run', '/ˌɪn ðə lɔːŋ ˈrʌn/', '/ˌɪn ðə lɒŋ ˈrʌn/', NULL, 5, FALSE, NULL),
  ('cut it close', 'cut it close', '/ˌkʌt ɪt ˈkloʊs/', '/ˌkʌt ɪt ˈkləʊs/', NULL, 5, FALSE, NULL),
  ('hang in there', 'hang in there', '/ˌhæŋ ɪn ˈðer/', '/ˌhæŋ ɪn ˈðeə/', NULL, 5, FALSE, NULL),
  ('go the extra mile', 'go the extra mile', '/ˌɡoʊ ði ekstrə ˈmaɪl/', '/ˌɡəʊ ði ekstrə ˈmaɪl/', NULL, 5, FALSE, NULL),
  ('throw in the towel', 'throw in the towel', '/ˌθroʊ ɪn ðə ˈtaʊəl/', '/ˌθrəʊ ɪn ðə ˈtaʊəl/', NULL, 5, FALSE, NULL),
  ('pay dividends', 'pay dividends', '/ˌpeɪ ˈdɪvɪdendz/', '/ˌpeɪ ˈdɪvɪdendz/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='against the odds'), 'against-the-odds.idiom.unlikely', 1, TRUE, 'idiom', '逆境をものともせず', 'succeeding despite being unlikely to', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='a steep learning curve'), 'steep-learning-curve.idiom.hard', 1, TRUE, 'idiom', '習得が難しい状況', 'a situation in which you must learn a lot quickly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='in the long run'), 'in-the-long-run.idiom.eventually', 1, TRUE, 'idiom', '長い目で見れば', 'over a long period of time in the future', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cut it close'), 'cut-it-close.idiom.narrow', 1, TRUE, 'idiom', 'ぎりぎりで間に合う', 'to leave very little time or margin', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hang in there'), 'hang-in-there.idiom.persevere', 1, TRUE, 'idiom', '踏ん張る', 'to keep trying during a difficult time', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='go the extra mile'), 'go-extra-mile.idiom.exceed', 1, TRUE, 'idiom', '一層の努力をする', 'to make more effort than is expected', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='throw in the towel'), 'throw-in-towel.idiom.quit', 1, TRUE, 'idiom', '降参する', 'to give up and admit defeat', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pay dividends'), 'pay-dividends.idiom.reward', 1, TRUE, 'idiom', '（後で）実を結ぶ', 'to bring benefits at a later time', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('against the odds', 'a steep learning curve', 'in the long run', 'cut it close', 'hang in there', 'go the extra mile', 'throw in the towel', 'pay dividends')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='hang-in-there.idiom.persevere'), (SELECT id FROM vocab_senses WHERE slug='throw-in-towel.idiom.quit'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='success-failure-idioms'
WHERE s.slug IN ('against-the-odds.idiom.unlikely', 'steep-learning-curve.idiom.hard', 'in-the-long-run.idiom.eventually', 'cut-it-close.idiom.narrow', 'hang-in-there.idiom.persevere', 'go-extra-mile.idiom.exceed', 'throw-in-towel.idiom.quit', 'pay-dividends.idiom.reward')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-16', 8, 1, (SELECT id FROM vocab_categories WHERE slug='success-failure-idioms'), 'Success & failure idioms', '成功と失敗の言い回し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-16'), s.id, x.ord FROM (VALUES
  ('against-the-odds.idiom.unlikely',0),('steep-learning-curve.idiom.hard',1),('in-the-long-run.idiom.eventually',2),('cut-it-close.idiom.narrow',3),('hang-in-there.idiom.persevere',4),('go-extra-mile.idiom.exceed',5),('throw-in-towel.idiom.quit',6),('pay-dividends.idiom.reward',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-16'), 'conversation', 0, 'Encouraging a friend', '友達を励ます', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-16'), 'travel', 1, 'A challenging trip', '困難な旅', 'station', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-16'), 'business', 2, 'Reviewing a hard year', '厳しい一年の振り返り', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 0, 'npc', 'I''m exhausted with this course.', 'この講座、もう疲れた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 1, 'user', 'Please {hang in there}; you''re so close.', '踏ん張って、もうすぐだよ。', 'hang in there', (SELECT id FROM vocab_senses WHERE slug='hang-in-there.idiom.persevere'), ARRAY['hang in there','throw in the towel','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 2, 'npc', 'Part of me wants to quit.', '半分やめたい気持ち。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 3, 'user', 'Don''t {throw in the towel} now.', '今降参しないで。', 'throw in the towel', (SELECT id FROM vocab_senses WHERE slug='throw-in-towel.idiom.quit'), ARRAY['throw in the towel','hang in there','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 4, 'npc', 'It''s just so hard.', '本当に大変で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 5, 'user', 'You''ve come this far {against the odds}.', '逆境の中、ここまで来たんだよ。', 'against the odds', (SELECT id FROM vocab_senses WHERE slug='against-the-odds.idiom.unlikely'), ARRAY['against the odds','in the long run','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 6, 'npc', 'Will it even be worth it?', 'そもそも報われる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 7, 'user', 'Definitely, {in the long run} it pays off.', '絶対、長い目で見れば報われる。', 'in the long run', (SELECT id FROM vocab_senses WHERE slug='in-the-long-run.idiom.eventually'), ARRAY['in the long run','against the odds','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 8, 'npc', 'My last essay was so late.', '前のレポート、ぎりぎりだった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 9, 'user', 'Ha, you always {cut it close}!', 'はは、いつもぎりぎりだね！', 'cut it close', (SELECT id FROM vocab_senses WHERE slug='cut-it-close.idiom.narrow'), ARRAY['cut it close','hang in there','in the long run','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 10, 'npc', 'How do top students do it?', '優秀な人はどうしてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 11, 'user', 'They just {go the extra mile} every time.', '毎回一層の努力をしてる。', 'go the extra mile', (SELECT id FROM vocab_senses WHERE slug='go-extra-mile.idiom.exceed'), ARRAY['go the extra mile','hang in there','cut it close','in the long run']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 12, 'npc', 'Okay, I''ll keep going.', 'よし、続ける。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 13, 'user', 'That''s the spirit!', 'その意気！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='conversation'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 0, 'npc', 'We nearly missed that connection.', '乗り換え、危うく逃すところだった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 1, 'user', 'We really did {cut it close} at the airport!', '空港で本当にぎりぎりだった！', 'cut it close', (SELECT id FROM vocab_senses WHERE slug='cut-it-close.idiom.narrow'), ARRAY['cut it close','hang in there','in the long run','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 2, 'npc', 'This whole trip has been tough.', 'この旅、ずっと大変。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 3, 'user', 'Let''s {hang in there}; it gets easier.', '踏ん張ろう、だんだん楽になる。', 'hang in there', (SELECT id FROM vocab_senses WHERE slug='hang-in-there.idiom.persevere'), ARRAY['hang in there','throw in the towel','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 4, 'npc', 'Learning the language is hard.', '言葉を覚えるのが大変。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 5, 'user', 'It''s {a steep learning curve}, for sure.', '確かに、習得は険しい。', 'a steep learning curve', (SELECT id FROM vocab_senses WHERE slug='steep-learning-curve.idiom.hard'), ARRAY['a steep learning curve','in the long run','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 6, 'npc', 'Some days I want to fly home.', 'たまに家に帰りたくなる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 7, 'user', 'Don''t {throw in the towel}; the best part''s ahead.', '降参しないで、一番いいのはこれから。', 'throw in the towel', (SELECT id FROM vocab_senses WHERE slug='throw-in-towel.idiom.quit'), ARRAY['throw in the towel','hang in there','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 8, 'npc', 'You think it''s worth it?', '報われると思う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 9, 'user', 'Yes, {in the long run} we''ll treasure this.', 'うん、長い目で見れば宝物になる。', 'in the long run', (SELECT id FROM vocab_senses WHERE slug='in-the-long-run.idiom.eventually'), ARRAY['in the long run','against the odds','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 10, 'npc', 'We booked this with no plan!', '無計画で予約したのに！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 11, 'user', 'And {against the odds}, it''s working out.', 'それでも逆境をものともせず、うまくいってる。', 'against the odds', (SELECT id FROM vocab_senses WHERE slug='against-the-odds.idiom.unlikely'), ARRAY['against the odds','in the long run','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 12, 'npc', 'We make a good team.', 'いいチームだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 13, 'user', 'The best.', '最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='travel'), 14, 'npc', 'Onward!', '前へ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 0, 'npc', 'Tough year, but we made it.', '厳しい年だったけど、乗り切った。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 1, 'user', 'Yeah, we survived {against the odds}.', 'うん、逆境をものともせず生き残った。', 'against the odds', (SELECT id FROM vocab_senses WHERE slug='against-the-odds.idiom.unlikely'), ARRAY['against the odds','in the long run','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 2, 'npc', 'The new system was hard to learn.', '新システムの習得が大変だった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 3, 'user', 'It was {a steep learning curve} for everyone.', 'みんなにとって習得が険しかった。', 'a steep learning curve', (SELECT id FROM vocab_senses WHERE slug='steep-learning-curve.idiom.hard'), ARRAY['a steep learning curve','in the long run','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 4, 'npc', 'The team kept pushing.', 'チームは頑張り続けた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 5, 'user', 'They always {go the extra mile}.', 'みんないつも一層の努力をする。', 'go the extra mile', (SELECT id FROM vocab_senses WHERE slug='go-extra-mile.idiom.exceed'), ARRAY['go the extra mile','hang in there','cut it close','in the long run']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 6, 'npc', 'Will the investment help?', 'あの投資は効く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 7, 'user', 'Yes, it will {pay dividends} next year.', 'うん、来年実を結ぶ。', 'pay dividends', (SELECT id FROM vocab_senses WHERE slug='pay-dividends.idiom.reward'), ARRAY['pay dividends','hang in there','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 8, 'npc', 'Some wanted to quit midyear.', '年の途中でやめたい人もいた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 9, 'user', 'Glad we told them to {hang in there}.', '踏ん張れと言っておいてよかった。', 'hang in there', (SELECT id FROM vocab_senses WHERE slug='hang-in-there.idiom.persevere'), ARRAY['hang in there','throw in the towel','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 10, 'npc', 'Was the strategy right?', '戦略は正しかった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 11, 'user', 'I believe {in the long run}, yes.', '長い目で見れば、そう思う。', 'in the long run', (SELECT id FROM vocab_senses WHERE slug='in-the-long-run.idiom.eventually'), ARRAY['in the long run','against the odds','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 12, 'npc', 'Here''s to next year.', '来年に乾杯。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 13, 'user', 'To a better one!', 'もっといい年に！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-16') AND goal='business'), 14, 'npc', 'Well earned, {{user_name}}.', 'よく頑張った、{{user_name}}。', NULL, NULL, NULL);

-- ===== seed-vocab-103-reviews.sql =====
-- Vocab 103 - unit REVIEW capstones (standalone; only -review lessons).

-- Unit 1 review: The new flatmate
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-u1-review', 1, 90, (SELECT id FROM vocab_categories WHERE slug='getting-on-c1'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review'), s.id, x.ord FROM (VALUES
  ('drift-apart.phrv.distance',0),('patch-up.phrv.mend',1),('hit-it-off.idiom.click',2),('warm-to.phrv.like',3),('take-to.phrv.like2',4),('fall-for.phrv.love',5),('grow-on.phrv.appeal',6),('look-down-on.phrv.despise',7),('come-across.phrv.seem',8),('stand-out.phrv.notable',9),('down-to-earth.adj.practical',10),('easygoing.adj.relaxed',11),('level-headed.adj.calm',12),('strong-willed.adj.determined',13),('self-conscious.adj.shy',14),('laid-back.adj.relaxed2',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review'), 'conversation', 0, 'The new flatmate', '新しいルームメイト', 'home', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 0, 'npc', 'You met your new flatmate?', '新しいルームメイトに会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 1, 'user', 'Yeah, we {hit it off} right away.', 'うん、すぐ意気投合した。', 'hit it off', (SELECT id FROM vocab_senses WHERE slug='hit-it-off.idiom.click'), ARRAY['hit it off','drift apart','look down on','patch up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 2, 'npc', 'Great. What''s she like?', 'いいね。どんな人？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 3, 'user', 'Really {down-to-earth}; no drama at all.', 'すごく気取らない、面倒がない。', 'down-to-earth', (SELECT id FROM vocab_senses WHERE slug='down-to-earth.adj.practical'), ARRAY['down-to-earth','self-conscious','strong-willed','level-headed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 4, 'npc', 'Calm person?', '落ち着いてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 5, 'user', 'Very {level-headed}; she handles stress well.', 'とても冷静、ストレスにも強い。', 'level-headed', (SELECT id FROM vocab_senses WHERE slug='level-headed.adj.calm'), ARRAY['level-headed','self-conscious','laid-back','easygoing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 6, 'npc', 'How does she seem to others?', '他の人にはどう見える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 7, 'user', 'She can {come across} as quiet, but she''s warm.', '静かな印象を与えるけど、温かい人。', 'come across', (SELECT id FROM vocab_senses WHERE slug='come-across.phrv.seem'), ARRAY['come across','stand out','warm to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 8, 'npc', 'Do you get along?', 'うまくやってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 9, 'user', 'Mostly. We had one row but quickly did {patch up} things.', 'だいたい。一度もめたけど、すぐ修復した。', 'patch up', (SELECT id FROM vocab_senses WHERE slug='patch-up.phrv.mend'), ARRAY['patch up','drift apart','look down on','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 10, 'npc', 'Good. Does she fit in?', 'いいね。馴染んでる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 11, 'user', 'She really does {stand out} at parties.', 'パーティーでは本当に際立つ。', 'stand out', (SELECT id FROM vocab_senses WHERE slug='stand-out.phrv.notable'), ARRAY['stand out','come across','warm to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 12, 'npc', 'Sounds like a keeper.', 'いい人だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 13, 'user', 'Definitely. She''s really starting to {grow on} me.', '本当に。どんどん好きになってきてる。', 'grow on', (SELECT id FROM vocab_senses WHERE slug='grow-on.phrv.appeal'), ARRAY['grow on','drift apart','look down on','hit it off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u1-review') AND goal='conversation'), 14, 'npc', 'Lucky you, {{user_name}}!', 'いいね、{{user_name}}！', NULL, NULL, NULL);

-- Unit 2 review: Reviewing a proposal
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-u2-review', 2, 90, (SELECT id FROM vocab_categories WHERE slug='making-a-point'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review'), s.id, x.ord FROM (VALUES
  ('get-at.phrv.imply',0),('play-down.phrv.minimize',1),('touch-on.phrv.mention',2),('sum-up.phrv.summarize',3),('put-across.phrv.convey',4),('gloss-over.phrv.evade',5),('single-out.phrv.select',6),('harp-on.phrv.dwell',7),('bear-in-mind.idiom.remember',8),('take-into-account.idiom.consider',9),('see-eye-to-eye.idiom.agree',10),('beg-to-differ.idiom.disagree',11),('on-the-fence.idiom.undecided',12),('food-for-thought.idiom.reflect',13),('common-ground.idiom.shared',14),('devils-advocate.idiom.contrarian',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review'), 'conversation', 0, 'Reviewing a proposal', '提案を検討する', 'office', 'colleague');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 0, 'npc', 'Did you read my proposal?', '私の提案書読んだ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 1, 'user', 'Yes. Can you {sum up} the main goal for me?', 'うん。主な目的を要約してくれる？', 'sum up', (SELECT id FROM vocab_senses WHERE slug='sum-up.phrv.summarize'), ARRAY['sum up','harp on','single out','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 2, 'npc', 'Cut costs, keep quality.', 'コスト削減、品質維持。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 3, 'user', 'You {put across} that well in the intro.', '冒頭でそれをうまく伝えてたね。', 'put across', (SELECT id FROM vocab_senses WHERE slug='put-across.phrv.convey'), ARRAY['put across','gloss over','single out','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 4, 'npc', 'Thanks. Any doubts?', 'ありがとう。疑問は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 5, 'user', 'I''m {on the fence} about the timeline.', 'スケジュールについては決めかねてる。', 'on the fence', (SELECT id FROM vocab_senses WHERE slug='on-the-fence.idiom.undecided'), ARRAY['on the fence','common ground','food for thought','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 6, 'npc', 'Too tight?', 'きつすぎる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 7, 'user', 'Just {bear in mind} the holiday season.', '繁忙期を心に留めておいて。', 'bear in mind', (SELECT id FROM vocab_senses WHERE slug='bear-in-mind.idiom.remember'), ARRAY['bear in mind','see eye to eye','beg to differ','on the fence']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 8, 'npc', 'Good catch. On the budget?', 'いい指摘。予算は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 9, 'user', 'There we {see eye to eye} completely.', 'そこは完全に意見一致。', 'see eye to eye', (SELECT id FROM vocab_senses WHERE slug='see-eye-to-eye.idiom.agree'), ARRAY['see eye to eye','beg to differ','bear in mind','take into account']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 10, 'npc', 'Great, common vision helps.', 'いいね、共通のビジョンは助かる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 11, 'user', 'Exactly, we have real {common ground}.', 'そう、本当に共通点がある。', 'common ground', (SELECT id FROM vocab_senses WHERE slug='common-ground.idiom.shared'), ARRAY['common ground','on the fence','food for thought','devil''s advocate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 12, 'npc', 'But don''t oversell it.', 'でも大げさにしないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 13, 'user', 'Agreed, I won''t {play down} the risks either.', '賛成、リスクも軽く扱わない。', 'play down', (SELECT id FROM vocab_senses WHERE slug='play-down.phrv.minimize'), ARRAY['play down','sum up','touch on','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u2-review') AND goal='conversation'), 14, 'npc', 'Nice work, {{user_name}}.', 'いい仕事、{{user_name}}。', NULL, NULL, NULL);

-- Unit 3 review: Kicking off a project
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-u3-review', 3, 90, (SELECT id FROM vocab_categories WHERE slug='getting-things-done-c1'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review'), s.id, x.ord FROM (VALUES
  ('nail-down.phrv.finalize',0),('draw-up.phrv.prepare',1),('roll-out.phrv.launch',2),('follow-through.phrv.complete',3),('hammer-out.phrv.negotiate',4),('flesh-out.phrv.detail',5),('map-out.phrv.plan',6),('iron-out.phrv.resolve',7),('touch-base.idiom.contact',8),('on-the-same-page.idiom.aligned',9),('in-the-loop.idiom.informed',10),('pull-your-weight.idiom.contribute',11),('cut-corners.idiom.skimp',12),('step-up.phrv.rise',13),('take-the-lead.idiom.lead',14),('hit-the-ground-running.idiom.start',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review'), 'conversation', 0, 'Kicking off a project', 'プロジェクト始動', 'office', 'colleague');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 0, 'npc', 'Excited to lead the new project?', '新プロジェクトを率いるの、楽しみ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 1, 'user', 'Yes! First I''ll {nail down} the goals.', 'うん！まず目標を確定する。', 'nail down', (SELECT id FROM vocab_senses WHERE slug='nail-down.phrv.finalize'), ARRAY['nail down','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 2, 'npc', 'How will you keep everyone aligned?', 'どうやってみんなの足並みを揃える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 3, 'user', 'Weekly syncs to stay {on the same page}.', '毎週すり合わせて認識を合わせる。', 'on the same page', (SELECT id FROM vocab_senses WHERE slug='on-the-same-page.idiom.aligned'), ARRAY['on the same page','cut corners','touch base','in the loop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 4, 'npc', 'And quick check-ins?', '短い確認は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 5, 'user', 'Yes, I''ll {touch base} with each lead.', 'うん、各リーダーと連絡を取り合う。', 'touch base', (SELECT id FROM vocab_senses WHERE slug='touch-base.idiom.contact'), ARRAY['touch base','cut corners','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 6, 'npc', 'What about slackers?', 'サボる人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 7, 'user', 'I expect everyone to {pull your weight}.', '全員に役割を果たしてほしい。', 'pull your weight', (SELECT id FROM vocab_senses WHERE slug='pull-your-weight.idiom.contribute'), ARRAY['pull your weight','cut corners','touch base','step up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 8, 'npc', 'Any early problems?', '初期の問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 9, 'user', 'A few I''ll {iron out} this week.', 'いくつか今週解決する。', 'iron out', (SELECT id FROM vocab_senses WHERE slug='iron-out.phrv.resolve'), ARRAY['iron out','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 10, 'npc', 'When does it go live?', 'いつ公開？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 11, 'user', 'We {roll out} to users next month.', '来月ユーザーに展開する。', 'roll out', (SELECT id FROM vocab_senses WHERE slug='roll-out.phrv.launch'), ARRAY['roll out','nail down','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 12, 'npc', 'Big responsibility.', '大きな責任だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 13, 'user', 'I''m ready to {step up}.', '一肌脱ぐ覚悟はできてる。', 'step up', (SELECT id FROM vocab_senses WHERE slug='step-up.phrv.rise'), ARRAY['step up','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u3-review') AND goal='conversation'), 14, 'npc', 'You''ll smash it, {{user_name}}.', '絶対うまくいくよ、{{user_name}}。', NULL, NULL, NULL);

-- Unit 4 review: Money talk
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-u4-review', 4, 90, (SELECT id FROM vocab_categories WHERE slug='spending-saving-c1'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review'), s.id, x.ord FROM (VALUES
  ('splurge.v.spend',0),('scrape-by.phrv.survive',1),('rip-off.phrv.overcharge',2),('chip-in.phrv.contribute',3),('dip-into.phrv.usesavings',4),('fork-out.phrv.pay',5),('shell-out.phrv.pay2',6),('tighten-your-belt.idiom.economize',7),('weigh-up.phrv.assess',8),('bank-on.phrv.rely',9),('fall-through.phrv.fail',10),('make-ends-meet.idiom.manage',11),('break-even.idiom.balance',12),('in-the-red.idiom.debt',13),('nest-egg.idiom.savings',14),('live-within-means.idiom.budget',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review'), 'conversation', 0, 'Money talk', 'お金の話', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 0, 'npc', 'Saving for anything big?', '何か大きなもののために貯金してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 1, 'user', 'Building a {nest egg} for a house.', '家のために蓄えを作ってる。', 'nest egg', (SELECT id FROM vocab_senses WHERE slug='nest-egg.idiom.savings'), ARRAY['nest egg','break even','in the red','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 2, 'npc', 'Nice. Easy to save?', 'いいね。貯めやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 3, 'user', 'It''s tight; I barely {make ends meet}.', '厳しい、ぎりぎり収支を合わせてる。', 'make ends meet', (SELECT id FROM vocab_senses WHERE slug='make-ends-meet.idiom.manage'), ARRAY['make ends meet','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 4, 'npc', 'Cutting back then?', 'じゃあ節約中？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 5, 'user', 'Yeah, I really {tighten your belt} these days.', 'うん、最近は本当に節約してる。', 'tighten your belt', (SELECT id FROM vocab_senses WHERE slug='tighten-your-belt.idiom.economize'), ARRAY['tighten your belt','splurge','chip in','rip off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 6, 'npc', 'No treats at all?', 'ご褒美は全然なし？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 7, 'user', 'Once a month I {splurge} on something small.', '月に一度、小さく奮発する。', 'splurge', (SELECT id FROM vocab_senses WHERE slug='splurge.v.spend'), ARRAY['splurge','scrape by','chip in','dip into']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 8, 'npc', 'Fair. We''re doing a group gift.', 'いいね。グループでプレゼントするんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 9, 'user', 'I''ll {chip in}, count me in.', '出し合うよ、入れて。', 'chip in', (SELECT id FROM vocab_senses WHERE slug='chip-in.phrv.contribute'), ARRAY['chip in','splurge','scrape by','dip into']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 10, 'npc', 'Thinking of investing too?', '投資も考えてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 11, 'user', 'I still need to {weigh up} my options.', 'まだ選択肢をよく検討しないと。', 'weigh up', (SELECT id FROM vocab_senses WHERE slug='weigh-up.phrv.assess'), ARRAY['weigh up','bank on','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 12, 'npc', 'Don''t rush it.', '焦らないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 13, 'user', 'Right, and if a plan {fall through}, no stress.', 'うん、計画が流れても気にしない。', 'fall through', (SELECT id FROM vocab_senses WHERE slug='fall-through.phrv.fail'), ARRAY['fall through','weigh up','bank on','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u4-review') AND goal='conversation'), 14, 'npc', 'Wise, {{user_name}}.', '賢いね、{{user_name}}。', NULL, NULL, NULL);

-- Unit 5 review: A hard week at work
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-u5-review', 5, 90, (SELECT id FROM vocab_categories WHERE slug='troubleshooting-c1'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review'), s.id, x.ord FROM (VALUES
  ('work-around.phrv.bypass',0),('clear-up.phrv.resolve',1),('head-off.phrv.prevent',2),('stave-off.phrv.delay',3),('root-out.phrv.eliminate',4),('smooth-over.phrv.ease',5),('tide-over.phrv.help',6),('sort-through.phrv.sift',7),('the-last-straw.idiom.limit',8),('back-to-drawing-board.idiom.restart',9),('nip-in-the-bud.idiom.stopearly',10),('at-a-loss.idiom.puzzled',11),('in-a-bind.idiom.stuck',12),('spanner-in-works.idiom.disrupt',13),('buy-time.idiom.delay',14),('damage-control.idiom.limit2',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review'), 'conversation', 0, 'A hard week at work', '仕事で大変な一週間', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 0, 'npc', 'Rough week at work?', '仕事、大変な週だった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 1, 'user', 'The server crash was {the last straw}.', 'サーバーダウンで限界だった。', 'the last straw', (SELECT id FROM vocab_senses WHERE slug='the-last-straw.idiom.limit'), ARRAY['the last straw','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 2, 'npc', 'Yikes. Big impact?', 'うわ。影響大きい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 3, 'user', 'We spent the day doing {damage control}.', '一日中、事後対応してた。', 'damage control', (SELECT id FROM vocab_senses WHERE slug='damage-control.idiom.limit2'), ARRAY['damage control','at a loss','in a bind','buy time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 4, 'npc', 'Did you fix the cause?', '原因は直した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 5, 'user', 'IT helped {clear up} the main issue.', 'ITが主な問題を解決してくれた。', 'clear up', (SELECT id FROM vocab_senses WHERE slug='clear-up.phrv.resolve'), ARRAY['clear up','head off','stave off','root out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 6, 'npc', 'Any quick fix meanwhile?', 'その間の応急策は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 7, 'user', 'We found a way to {work around} it.', '回避する方法を見つけた。', 'work around', (SELECT id FROM vocab_senses WHERE slug='work-around.phrv.bypass'), ARRAY['work around','clear up','head off','stave off']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 8, 'npc', 'Were you overwhelmed?', '参っちゃった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 9, 'user', 'At first I was {at a loss}, yeah.', '最初は途方に暮れてた。', 'at a loss', (SELECT id FROM vocab_senses WHERE slug='at-a-loss.idiom.puzzled'), ARRAY['at a loss','in a bind','buy time','nip in the bud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 10, 'npc', 'How did you cope?', 'どう乗り切った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 11, 'user', 'We paused releases to {buy time}.', 'リリースを止めて時間を稼いだ。', 'buy time', (SELECT id FROM vocab_senses WHERE slug='buy-time.idiom.delay'), ARRAY['buy time','at a loss','in a bind','nip in the bud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 12, 'npc', 'Preventing a repeat?', '再発は防げる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 13, 'user', 'Yes, new checks {head off} future crashes.', 'うん、新しいチェックが今後のダウンを未然に防ぐ。', 'head off', (SELECT id FROM vocab_senses WHERE slug='head-off.phrv.prevent'), ARRAY['head off','work around','sort through','smooth over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u5-review') AND goal='conversation'), 14, 'npc', 'You handled it well, {{user_name}}.', 'うまく対処したね、{{user_name}}。', NULL, NULL, NULL);

-- Unit 6 review: Before a big day
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-u6-review', 6, 90, (SELECT id FROM vocab_categories WHERE slug='handling-feelings-c1'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review'), s.id, x.ord FROM (VALUES
  ('well-up.phrv.tears',0),('choke-up.phrv.emotional',1),('simmer-down.phrv.calm',2),('lash-out.phrv.attack',3),('open-up.phrv.confide',4),('bottle-up.phrv.suppress',5),('snap-at.phrv.snap',6),('perk-up.phrv.cheer',7),('on-edge.idiom.tense',8),('over-the-moon.idiom.thrilled',9),('down-in-dumps.idiom.sad',10),('mixed-feelings.idiom.ambivalent',11),('at-ease.idiom.relaxed',12),('on-cloud-nine.idiom.euphoric',13),('lose-your-cool.idiom.angry',14),('get-cold-feet.idiom.nervous',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review'), 'conversation', 0, 'Before a big day', '大事な日の前に', 'home', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 0, 'npc', 'Big presentation tomorrow, right?', '明日は大事なプレゼンだよね？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 1, 'user', 'Yeah, I''m a bit {on edge} about it.', 'うん、ちょっとピリピリしてる。', 'on edge', (SELECT id FROM vocab_senses WHERE slug='on-edge.idiom.tense'), ARRAY['on edge','over the moon','at ease','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 2, 'npc', 'Nervous is normal.', '緊張は普通だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 3, 'user', 'I just hope I don''t {get cold feet} on stage.', '舞台で怖じ気づかないといいけど。', 'get cold feet', (SELECT id FROM vocab_senses WHERE slug='get-cold-feet.idiom.nervous'), ARRAY['get cold feet','over the moon','at ease','mixed feelings']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 4, 'npc', 'You''ve prepared well.', 'よく準備したよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 5, 'user', 'True. I''ll {simmer down} with some breathing.', '確かに。深呼吸で落ち着く。', 'simmer down', (SELECT id FROM vocab_senses WHERE slug='simmer-down.phrv.calm'), ARRAY['simmer down','lash out','perk up','open up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 6, 'npc', 'Talk it through with me.', '私に話してみて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 7, 'user', 'Thanks, it helps to {open up} beforehand.', 'ありがとう、前もって話すと楽になる。', 'open up', (SELECT id FROM vocab_senses WHERE slug='open-up.phrv.confide'), ARRAY['open up','bottle up','snap at','perk up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 8, 'npc', 'You''ll smash it.', '絶対うまくいく。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 9, 'user', 'Your support makes me {perk up}.', '君の応援で元気が出る。', 'perk up', (SELECT id FROM vocab_senses WHERE slug='perk-up.phrv.cheer'), ARRAY['perk up','bottle up','snap at','well up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 10, 'npc', 'And after, we celebrate.', '終わったらお祝いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 11, 'user', 'If it goes well, I''ll be {over the moon}.', 'うまくいったら大喜びだ。', 'over the moon', (SELECT id FROM vocab_senses WHERE slug='over-the-moon.idiom.thrilled'), ARRAY['over the moon','down in the dumps','on edge','at ease']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 12, 'npc', 'It will. Relax tonight.', '大丈夫。今夜はリラックスして。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 13, 'user', 'I feel more {at ease} already.', 'もう少し落ち着いてきた。', 'at ease', (SELECT id FROM vocab_senses WHERE slug='at-ease.idiom.relaxed'), ARRAY['at ease','over the moon','on edge','down in the dumps']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u6-review') AND goal='conversation'), 14, 'npc', 'Go get ''em, {{user_name}}!', 'やってやれ、{{user_name}}！', NULL, NULL, NULL);

-- Unit 7 review: After a meetup
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-u7-review', 7, 90, (SELECT id FROM vocab_categories WHERE slug='in-conversation-c1'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review'), s.id, x.ord FROM (VALUES
  ('chime-in.phrv.join',0),('butt-in.phrv.interrupt',1),('talk-over.phrv.interrupt2',2),('drown-out.phrv.mask',3),('blurt-out.phrv.exclaim',4),('ramble-on.phrv.digress',5),('tune-out.phrv.ignore',6),('get-through-to.phrv.reach',7),('break-the-ice.idiom.relax',8),('small-talk.idiom.chat',9),('same-wavelength.idiom.attuned',10),('keep-in-touch.idiom.contact',11),('out-of-the-blue.idiom.sudden',12),('strike-up.phrv.begin',13),('read-between-lines.idiom.infer',14),('put-in-good-word.idiom.recommend',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review'), 'conversation', 0, 'After a meetup', '交流会のあと', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 0, 'npc', 'How was the meetup?', '交流会どうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 1, 'user', 'Good! A quiz helped {break the ice}.', 'よかった！クイズで打ち解けた。', 'break the ice', (SELECT id FROM vocab_senses WHERE slug='break-the-ice.idiom.relax'), ARRAY['break the ice','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 2, 'npc', 'Chatty crowd?', 'おしゃべりな人たち？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 3, 'user', 'A bit; some people {talk over} each other.', '少し、かぶせて話す人もいた。', 'talk over', (SELECT id FROM vocab_senses WHERE slug='talk-over.phrv.interrupt2'), ARRAY['talk over','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 4, 'npc', 'Did you speak up?', '発言した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 5, 'user', 'I''d {chime in} when I had a point.', '言いたいことがある時は口をはさんだ。', 'chime in', (SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), ARRAY['chime in','butt in','talk over','drown out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 6, 'npc', 'Any boring bits?', '退屈な場面は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 7, 'user', 'One long speech, I did {tune out}.', '長いスピーチで、聞き流しちゃった。', 'tune out', (SELECT id FROM vocab_senses WHERE slug='tune-out.phrv.ignore'), ARRAY['tune out','chime in','butt in','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 8, 'npc', 'Meet anyone good?', 'いい人に会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 9, 'user', 'A writer, totally {on the same wavelength}.', 'ある作家と完全に波長が合った。', 'on the same wavelength', (SELECT id FROM vocab_senses WHERE slug='same-wavelength.idiom.attuned'), ARRAY['on the same wavelength','small talk','keep in touch','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 10, 'npc', 'Staying in contact?', '連絡取り合う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 11, 'user', 'Yes, we''ll {keep in touch}.', 'うん、連絡を取り合う。', 'keep in touch', (SELECT id FROM vocab_senses WHERE slug='keep-in-touch.idiom.contact'), ARRAY['keep in touch','small talk','break the ice','out of the blue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 12, 'npc', 'Could you tell they liked your work?', '君の作品を気に入ったと分かった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 13, 'user', 'I could {read between the lines}, yeah.', '行間を読めた、うん。', 'read between the lines', (SELECT id FROM vocab_senses WHERE slug='read-between-lines.idiom.infer'), ARRAY['read between the lines','small talk','keep in touch','break the ice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u7-review') AND goal='conversation'), 14, 'npc', 'Great networking, {{user_name}}.', 'いい人脈づくり、{{user_name}}。', NULL, NULL, NULL);

-- Unit 8 review: A year of growth
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-u8-review', 8, 90, (SELECT id FROM vocab_categories WHERE slug='achievement-c1'), 'Review', '復習', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review'), s.id, x.ord FROM (VALUES
  ('pull-off.phrv.achieve',0),('live-up-to.phrv.meet',1),('carry-off.phrv.manage',2),('sail-through.phrv.pass',3),('bounce-back.phrv.recover',4),('press-on.phrv.persist',5),('forge-ahead.phrv.advance',6),('come-through.phrv.deliver',7),('against-the-odds.idiom.unlikely',8),('steep-learning-curve.idiom.hard',9),('in-the-long-run.idiom.eventually',10),('cut-it-close.idiom.narrow',11),('hang-in-there.idiom.persevere',12),('go-extra-mile.idiom.exceed',13),('throw-in-towel.idiom.quit',14),('pay-dividends.idiom.reward',15)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review'), 'conversation', 0, 'A year of growth', '成長の一年', 'cafe', 'friend');
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 0, 'npc', 'You launched your business this year!', '今年、起業したね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 1, 'user', 'I did! Hard to believe I did {pull off} it.', 'うん！やり遂げたなんて信じられない。', 'pull off', (SELECT id FROM vocab_senses WHERE slug='pull-off.phrv.achieve'), ARRAY['pull off','live up to','sail through','bounce back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 2, 'npc', 'Against so much doubt.', 'あれだけ疑われたのに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 3, 'user', 'Yeah, it grew {against the odds}.', 'うん、逆境の中で成長した。', 'against the odds', (SELECT id FROM vocab_senses WHERE slug='against-the-odds.idiom.unlikely'), ARRAY['against the odds','in the long run','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 4, 'npc', 'Any low points?', 'どん底はあった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 5, 'user', 'A bad month, but I did {bounce back}.', 'ひどい月もあったけど、立ち直った。', 'bounce back', (SELECT id FROM vocab_senses WHERE slug='bounce-back.phrv.recover'), ARRAY['bounce back','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 6, 'npc', 'What kept you going?', '何が支えになった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 7, 'user', 'Friends told me to {hang in there}.', '友達が踏ん張れと言ってくれた。', 'hang in there', (SELECT id FROM vocab_senses WHERE slug='hang-in-there.idiom.persevere'), ARRAY['hang in there','throw in the towel','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 8, 'npc', 'Did it meet your dream?', '夢に応えた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 9, 'user', 'It really did {live up to} my hopes.', '本当に期待に応えてくれた。', 'live up to', (SELECT id FROM vocab_senses WHERE slug='live-up-to.phrv.meet'), ARRAY['live up to','pull off','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 10, 'npc', 'Your effort shows.', '努力が表れてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 11, 'user', 'I always try to {go the extra mile}.', 'いつも一層の努力をしようとしてる。', 'go the extra mile', (SELECT id FROM vocab_senses WHERE slug='go-extra-mile.idiom.exceed'), ARRAY['go the extra mile','hang in there','cut it close','in the long run']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 12, 'npc', 'It''ll reward you.', '報われるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 13, 'user', 'I hope it continues to {pay dividends}.', 'これからも実を結ぶといいな。', 'pay dividends', (SELECT id FROM vocab_senses WHERE slug='pay-dividends.idiom.reward'), ARRAY['pay dividends','hang in there','cut it close','go the extra mile']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-u8-review') AND goal='conversation'), 14, 'npc', 'You earned it, {{user_name}}.', '君の実力だよ、{{user_name}}。', NULL, NULL, NULL);

COMMIT;
