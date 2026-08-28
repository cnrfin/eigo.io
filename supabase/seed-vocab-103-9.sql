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
