-- ============================================================================
-- Vocab 101: Lesson 26 (A2): "Phone & tech"  (Unit 7, Work and study)
-- ----------------------------------------------------------------------------
-- Words (all new): call, text, app, screen, click, online, password, message.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('phone-tech', 'Phone and tech', '電話とテック', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('call', 'call', NULL, NULL, NULL, 2, FALSE, NULL),
  ('text', 'text', NULL, NULL, NULL, 2, FALSE, NULL),
  ('app', 'app', NULL, NULL, NULL, 2, FALSE, NULL),
  ('screen', 'screen', NULL, NULL, NULL, 2, FALSE, NULL),
  ('click', 'click', NULL, NULL, NULL, 2, FALSE, NULL),
  ('online', 'online', NULL, NULL, NULL, 2, FALSE, NULL),
  ('password', 'password', NULL, NULL, NULL, 2, FALSE, NULL),
  ('message', 'message', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='call'), 'call.v.phone', 1, TRUE, 'verb', '電話する', 'to speak to someone by phone', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='text'), 'text.v.msg', 1, TRUE, 'verb', 'メッセージを送る', 'to send a written phone message', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='app'), 'app.n.tech', 1, TRUE, 'noun', 'アプリ', 'a program on a phone or computer', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='screen'), 'screen.n.tech', 1, TRUE, 'noun', '画面', 'the flat surface that shows images', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='click'), 'click.v.tap', 1, TRUE, 'verb', 'クリックする', 'to press a button on a screen or mouse', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='online'), 'online.adv.net', 1, TRUE, 'adverb', 'オンラインで', 'connected to the internet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='password'), 'password.n.tech', 1, TRUE, 'noun', 'パスワード', 'a secret word that lets you log in', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='message'), 'message.n.msg', 1, TRUE, 'noun', 'メッセージ', 'a piece of information you send someone', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('call','text','app','screen','click','online','password','message')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='phone-tech'
WHERE s.slug IN ('call.v.phone','text.v.msg','app.n.tech','screen.n.tech','click.v.tap','online.adv.net','password.n.tech','message.n.msg')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-26', 7, 3, (SELECT id FROM vocab_categories WHERE slug='phone-tech'), 'Phone & tech', '電話とデジタル', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-26'), s.id, x.ord
FROM (VALUES
  ('call.v.phone',0),('text.v.msg',1),('app.n.tech',2),('screen.n.tech',3),('click.v.tap',4),('online.adv.net',5),('password.n.tech',6),('message.n.msg',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-26'), 'conversation', 0, 'A new app', '新しいアプリ', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-26'), 'travel', 1, 'Wifi and login', 'Wi-Fiとログイン', 'hotel', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-26'), 'business', 2, 'Reach me', '連絡方法', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 0, 'npc', 'Have you tried this new {app}?', 'この新しいアプリ試した？', 'app', (SELECT id FROM vocab_senses WHERE slug='app.n.tech'), ARRAY['app','screen','book','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 1, 'user', 'Not yet. Is it easy?', 'まだ。簡単？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 2, 'npc', 'Super easy. Just {click} here.', 'すごく簡単。ここをクリックするだけ。', 'click', (SELECT id FROM vocab_senses WHERE slug='click.v.tap'), ARRAY['click','cook','call','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 3, 'user', 'Oh, nice {screen} - the display looks sharp.', 'お、画面いいね、表示がくっきり。', 'screen', (SELECT id FROM vocab_senses WHERE slug='screen.n.tech'), ARRAY['window','page','screen','app']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 4, 'npc', 'Right? Send me a chat {message} on it.', 'でしょ？これでチャットメッセージ送って。', 'message', (SELECT id FROM vocab_senses WHERE slug='message.n.msg'), ARRAY['email','call','message','app']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 5, 'user', 'Sure, downloading now.', 'うん、今ダウンロードしてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 6, 'npc', 'You''ll love it.', '気に入るよ。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 0, 'npc', 'Would you like the wifi details?', 'Wi-Fiの情報要りますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 1, 'user', 'Yes please. How do I get {online}, onto the internet?', 'はい。どうやってネットにつなぐ？', 'online', (SELECT id FROM vocab_senses WHERE slug='online.adv.net'), ARRAY['inside','outside','online','offline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 2, 'npc', 'Open the {screen} and tap the display to select our network.', '画面を開いて、表示をタップしてネットワークを選んで。', 'screen', (SELECT id FROM vocab_senses WHERE slug='screen.n.tech'), ARRAY['screen','app','window','page']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 3, 'user', 'Okay. Do I need a {password}?', '了解。パスワードは要る？', 'password', (SELECT id FROM vocab_senses WHERE slug='password.n.tech'), ARRAY['receipt','ticket','key','password']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 4, 'npc', 'Yes. Then {click} ''connect''.', 'はい。それから『接続』をクリック。', 'click', (SELECT id FROM vocab_senses WHERE slug='click.v.tap'), ARRAY['cut','click','cook','call']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 5, 'user', 'It works. Thank you!', 'つながった。ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 6, 'npc', 'Enjoy your stay!', 'ごゆっくり！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 0, 'npc', 'How should I reach you today?', '今日はどうやって連絡すればいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 1, 'user', 'You can {call} me anytime.', 'いつでも電話していいよ。', 'call', (SELECT id FROM vocab_senses WHERE slug='call.v.phone'), ARRAY['click','cut','call','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 2, 'npc', 'Or should I {text} you a written note instead?', 'それとも文字でメッセージ送ろうか？', 'text', (SELECT id FROM vocab_senses WHERE slug='text.v.msg'), ARRAY['taste','talk','text','turn']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 3, 'user', 'Sure, send a quick written {message}.', 'うん、短い文字メッセージで。', 'message', (SELECT id FROM vocab_senses WHERE slug='message.n.msg'), ARRAY['email','message','call','app']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 4, 'npc', 'Got it. I''m {online}, connected to the internet, until six.', '了解。6時までネットにつないでるよ。', 'online', (SELECT id FROM vocab_senses WHERE slug='online.adv.net'), ARRAY['offline','inside','online','outside']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 5, 'user', 'Perfect, talk soon.', '完璧、また後で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 6, 'npc', 'Later!', 'じゃあね！', NULL, NULL, NULL);
