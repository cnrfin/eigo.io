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
