-- ============================================================================
-- Vocab 102: vocab-102-27 - Social media & news  (Unit 9)
-- Words: post, share, follow, comment, viral, headline, subscribe, notification.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('social-media-news', 'Social media & news', 'SNSとニュース', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('post', 'post', '/poʊst/', '/pəʊst/', NULL, 3, FALSE, NULL),
  ('share', 'share', '/ʃer/', '/ʃeə/', NULL, 3, FALSE, NULL),
  ('follow', 'follow', '/ˈfɑːloʊ/', '/ˈfɒləʊ/', NULL, 3, FALSE, NULL),
  ('comment', 'comment', '/ˈkɑːment/', '/ˈkɒment/', NULL, 3, FALSE, NULL),
  ('viral', 'viral', '/ˈvaɪrəl/', '/ˈvaɪrəl/', NULL, 4, FALSE, NULL),
  ('headline', 'headline', '/ˈhedlaɪn/', '/ˈhedlaɪn/', NULL, 4, FALSE, NULL),
  ('subscribe', 'subscribe', '/səbˈskraɪb/', '/səbˈskraɪb/', NULL, 4, FALSE, NULL),
  ('notification', 'notification', '/ˌnoʊtɪfɪˈkeɪʃn/', '/ˌnəʊtɪfɪˈkeɪʃn/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='post'), 'post.v.publish', 1, TRUE, 'verb', '投稿する', 'to put a message or picture online', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='share'), 'share.v.spread', 1, TRUE, 'verb', '共有する', 'to send something online for others to see', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='follow'), 'follow.v.subscribe', 1, TRUE, 'verb', 'フォローする', 'to sign up to see someone''s posts online', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='comment'), 'comment.n.remark', 1, TRUE, 'noun', 'コメント', 'a written reaction posted below content', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='viral'), 'viral.adj.spreading', 1, TRUE, 'adjective', 'バズった', 'shared very quickly by many people online', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='headline'), 'headline.n.title', 1, TRUE, 'noun', '見出し', 'the title of a news story', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='subscribe'), 'subscribe.v.join', 1, TRUE, 'verb', '登録する', 'to sign up to regularly receive content', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='notification'), 'notification.n.alert', 1, TRUE, 'noun', '通知', 'a message that tells you about new activity', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('post', 'share', 'follow', 'comment', 'viral', 'headline', 'subscribe', 'notification')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='social-media-news'
WHERE s.slug IN ('post.v.publish', 'share.v.spread', 'follow.v.subscribe', 'comment.n.remark', 'viral.adj.spreading', 'headline.n.title', 'subscribe.v.join', 'notification.n.alert')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-27', 9, 2, (SELECT id FROM vocab_categories WHERE slug='social-media-news'), 'Social media & news', 'SNSとニュース', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-27'), s.id, x.ord FROM (VALUES
  ('post.v.publish',0),('share.v.spread',1),('follow.v.subscribe',2),('comment.n.remark',3),('viral.adj.spreading',4),('headline.n.title',5),('subscribe.v.join',6),('notification.n.alert',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-27'), 'conversation', 0, 'Going viral', 'バズる', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-27'), 'travel', 1, 'Following travel content', '旅行の情報を追う', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-27'), 'business', 2, 'Company social media', '会社のSNS', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 0, 'npc', 'Your video is everywhere!', 'あなたの動画、どこでも見るよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 1, 'user', 'I know! I only made one {post} last night.', 'でしょ！昨夜1回投稿しただけなのに。', 'post', (SELECT id FROM vocab_senses WHERE slug='post.v.publish'), ARRAY['post','comment','headline','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 2, 'npc', 'And now?', 'それで今は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 3, 'user', 'It went totally {viral} by morning.', '朝には完全にバズってた。', 'viral', (SELECT id FROM vocab_senses WHERE slug='viral.adj.spreading'), ARRAY['viral','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 4, 'npc', 'How many views?', '再生回数は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 5, 'user', 'Thousands. People {share} it a lot.', '何千も。みんながよくシェアしてる。', 'share', (SELECT id FROM vocab_senses WHERE slug='share.v.spread'), ARRAY['share','follow','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 6, 'npc', 'Any nice reactions?', 'いい反応はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 7, 'user', 'So many. My favorite {comment} made me cry.', 'たくさん。お気に入りのコメントで泣いた。', 'comment', (SELECT id FROM vocab_senses WHERE slug='comment.n.remark'), ARRAY['comment','post','headline','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 8, 'npc', 'New fans too?', '新しいファンも？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 9, 'user', 'Yeah, hundreds started to {follow} me.', 'うん、何百人もフォローし始めた。', 'follow', (SELECT id FROM vocab_senses WHERE slug='follow.v.subscribe'), ARRAY['follow','share','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 10, 'npc', 'Your phone must be busy.', 'スマホが忙しそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 11, 'user', 'Every {notification} is buzzing nonstop.', '通知がひっきりなしに鳴ってる。', 'notification', (SELECT id FROM vocab_senses WHERE slug='notification.n.alert'), ARRAY['notification','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 12, 'npc', 'Enjoy the moment!', 'この瞬間を楽しんで！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 13, 'user', 'It''s wild, honestly.', '正直すごいことになってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='conversation'), 14, 'npc', 'Famous friend, {{user_name}}!', '有名人だね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 0, 'npc', 'How do you find good travel tips?', 'いい旅行情報ってどう探すの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 1, 'user', 'I {follow} a few great travel accounts.', 'いい旅行アカウントをいくつかフォローしてる。', 'follow', (SELECT id FROM vocab_senses WHERE slug='follow.v.subscribe'), ARRAY['follow','share','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 2, 'npc', 'Any channels worth watching?', '見る価値のあるチャンネルは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 3, 'user', 'Yes, {subscribe} to this one; the videos are amazing.', 'うん、これに登録して、動画がすごくいい。', 'subscribe', (SELECT id FROM vocab_senses WHERE slug='subscribe.v.join'), ARRAY['subscribe','follow','post','comment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 4, 'npc', 'I saw a shocking travel story today.', '今日、衝撃的な旅行ニュースを見た。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 5, 'user', 'The {headline} about the airport strike?', '空港ストの見出しのこと？', 'headline', (SELECT id FROM vocab_senses WHERE slug='headline.n.title'), ARRAY['headline','post','comment','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 6, 'npc', 'That''s the one. Scary.', 'それそれ。怖いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 7, 'user', 'A creator made a helpful {post} about it.', 'あるクリエイターが役立つ投稿をしてたよ。', 'post', (SELECT id FROM vocab_senses WHERE slug='post.v.publish'), ARRAY['post','follow','share','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 8, 'npc', 'Can you send it to me?', '送ってくれる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 9, 'user', 'Sure, I''ll {share} the link now.', 'いいよ、今リンクをシェアする。', 'share', (SELECT id FROM vocab_senses WHERE slug='share.v.spread'), ARRAY['share','follow','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 10, 'npc', 'Thanks. Is it popular?', 'ありがとう。人気なの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 11, 'user', 'Very, it''s going {viral} among travelers.', 'すごく、旅行者の間でバズってる。', 'viral', (SELECT id FROM vocab_senses WHERE slug='viral.adj.spreading'), ARRAY['viral','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 12, 'npc', 'Good info spreads fast.', 'いい情報は広まるのが早い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 13, 'user', 'Exactly.', 'その通り。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='travel'), 14, 'npc', 'Safe trip planning, {{user_name}}!', 'いい計画を、{{user_name}}！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 0, 'npc', 'Let''s grow our brand online.', 'オンラインでブランドを伸ばそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 1, 'user', 'I''ll {post} once a day on our channels.', 'うちのチャンネルに1日1回投稿するよ。', 'post', (SELECT id FROM vocab_senses WHERE slug='post.v.publish'), ARRAY['post','comment','headline','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 2, 'npc', 'What kind of content?', 'どんな内容？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 3, 'user', 'Short tips with a catchy {headline}.', 'キャッチーな見出し付きの短いコツ。', 'headline', (SELECT id FROM vocab_senses WHERE slug='headline.n.title'), ARRAY['headline','post','comment','notification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 4, 'npc', 'Should we encourage engagement?', '反応を促す？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 5, 'user', 'Yes, we reply to every {comment}.', 'うん、すべてのコメントに返信する。', 'comment', (SELECT id FROM vocab_senses WHERE slug='comment.n.remark'), ARRAY['comment','post','headline','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 6, 'npc', 'And spread our best pieces?', '一番いい投稿は広める？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 7, 'user', 'We ask followers to {share} them.', 'フォロワーにシェアをお願いする。', 'share', (SELECT id FROM vocab_senses WHERE slug='share.v.spread'), ARRAY['share','follow','post','subscribe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 8, 'npc', 'How do we keep people coming back?', 'どうやってリピートしてもらう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 9, 'user', 'Invite them to {subscribe} to our newsletter.', 'ニュースレターに登録してもらう。', 'subscribe', (SELECT id FROM vocab_senses WHERE slug='subscribe.v.join'), ARRAY['subscribe','follow','post','comment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 10, 'npc', 'Will they know about new posts?', '新しい投稿に気づく？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 11, 'user', 'Yes, they get a {notification} each time.', 'うん、毎回通知が届く。', 'notification', (SELECT id FROM vocab_senses WHERE slug='notification.n.alert'), ARRAY['notification','post','comment','headline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 12, 'npc', 'Solid plan.', 'いい計画。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 13, 'user', 'I''ll draft the calendar.', 'カレンダーを作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-27') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);
