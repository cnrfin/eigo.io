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
