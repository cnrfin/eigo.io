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
