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
