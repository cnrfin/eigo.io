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
