-- ============================================================================
-- Vocab 102: vocab-102-35 - Arts & entertainment  (Unit 12)
-- Words: exhibition, gallery, novel, author, director, plot, audience, review.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('arts-entertainment', 'Arts & entertainment', '芸術と娯楽', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('exhibition', 'exhibition', '/ˌeksɪˈbɪʃn/', '/ˌeksɪˈbɪʃn/', NULL, 4, FALSE, NULL),
  ('gallery', 'gallery', '/ˈɡæləri/', '/ˈɡæləri/', NULL, 3, FALSE, NULL),
  ('novel', 'novel', '/ˈnɑːvl/', '/ˈnɒvl/', NULL, 3, FALSE, NULL),
  ('author', 'author', '/ˈɔːθər/', '/ˈɔːθə/', NULL, 3, FALSE, NULL),
  ('director', 'director', '/dəˈrektər/', '/dəˈrektə/', NULL, 3, FALSE, NULL),
  ('plot', 'plot', '/plɑːt/', '/plɒt/', NULL, 4, FALSE, NULL),
  ('audience', 'audience', '/ˈɔːdiəns/', '/ˈɔːdiəns/', NULL, 3, FALSE, NULL),
  ('review', 'review', '/rɪˈvjuː/', '/rɪˈvjuː/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='exhibition'), 'exhibition.n.show', 1, TRUE, 'noun', '展覧会', 'a public show of art or other objects', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gallery'), 'gallery.n.place', 1, TRUE, 'noun', '美術館', 'a place where art is shown', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='novel'), 'novel.n.book', 1, TRUE, 'noun', '小説', 'a long written story', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='author'), 'author.n.writer', 1, TRUE, 'noun', '著者', 'the writer of a book', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='director'), 'director.n.filmmaker', 1, TRUE, 'noun', '監督', 'the person who directs a film or play', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plot'), 'plot.n.story', 1, TRUE, 'noun', '筋', 'the events that make up a story', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='audience'), 'audience.n.viewers', 1, TRUE, 'noun', '観客', 'the people who watch a show or read a work', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='review'), 'review.n.critique', 1, TRUE, 'noun', 'レビュー', 'a written opinion about a book, film, or show', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('exhibition', 'gallery', 'novel', 'author', 'director', 'plot', 'audience', 'review')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='arts-entertainment'
WHERE s.slug IN ('exhibition.n.show', 'gallery.n.place', 'novel.n.book', 'author.n.writer', 'director.n.filmmaker', 'plot.n.story', 'audience.n.viewers', 'review.n.critique')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-35', 12, 1, (SELECT id FROM vocab_categories WHERE slug='arts-entertainment'), 'Arts & entertainment', '芸術と娯楽', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-35'), s.id, x.ord FROM (VALUES
  ('exhibition.n.show',0),('gallery.n.place',1),('novel.n.book',2),('author.n.writer',3),('director.n.filmmaker',4),('plot.n.story',5),('audience.n.viewers',6),('review.n.critique',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-35'), 'conversation', 0, 'A good book', 'いい本', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-35'), 'travel', 1, 'An art museum', '美術館で', 'museum', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-35'), 'business', 2, 'Marketing a show', '展示の宣伝', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 0, 'npc', 'What are you reading?', '何読んでるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 1, 'user', 'A mystery {novel}, I can''t put it down.', 'ミステリー小説、手が止まらない。', 'novel', (SELECT id FROM vocab_senses WHERE slug='novel.n.book'), ARRAY['novel','author','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 2, 'npc', 'Who wrote it?', '誰が書いたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 3, 'user', 'A Japanese {author}, very famous.', '日本の著者で、とても有名。', 'author', (SELECT id FROM vocab_senses WHERE slug='author.n.writer'), ARRAY['author','plot','review','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 4, 'npc', 'Is the story good?', '話は面白い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 5, 'user', 'The {plot} has so many twists.', '筋に驚きの展開がいっぱい。', 'plot', (SELECT id FROM vocab_senses WHERE slug='plot.n.story'), ARRAY['plot','author','review','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 6, 'npc', 'Did you check ratings?', '評価は見た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 7, 'user', 'Yes, every {review} online is glowing.', 'うん、ネットのレビューは絶賛ばかり。', 'review', (SELECT id FROM vocab_senses WHERE slug='review.n.critique'), ARRAY['review','author','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 8, 'npc', 'They''re making a film, I heard.', '映画化するらしいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 9, 'user', 'A famous {director} is making it.', '有名な監督が作ってる。', 'director', (SELECT id FROM vocab_senses WHERE slug='director.n.filmmaker'), ARRAY['director','author','plot','audience']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 10, 'npc', 'Will it be popular?', '人気出るかな？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 11, 'user', 'The {audience} will love it, I think.', '観客はきっと気に入ると思う。', 'audience', (SELECT id FROM vocab_senses WHERE slug='audience.n.viewers'), ARRAY['audience','author','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 12, 'npc', 'Let''s watch it together.', '一緒に観よう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 13, 'user', 'Deal!', '決まり！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='conversation'), 14, 'npc', 'Book first, though, {{user_name}}.', 'でもまず本ね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 0, 'npc', 'Welcome to the city art museum.', '市立美術館へようこそ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 1, 'user', 'It''s huge. Which {gallery} should I see first?', '広いですね。どの展示室を先に見るべき？', 'gallery', (SELECT id FROM vocab_senses WHERE slug='gallery.n.place'), ARRAY['gallery','novel','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 2, 'npc', 'Start with the modern wing.', 'モダン館から始めて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 3, 'user', 'Is the new {exhibition} still open?', '新しい展覧会はまだやってますか？', 'exhibition', (SELECT id FROM vocab_senses WHERE slug='exhibition.n.show'), ARRAY['exhibition','novel','plot','author']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 4, 'npc', 'Yes, until Sunday.', 'はい、日曜まで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 5, 'user', 'I read a great {review} of it.', '素晴らしいレビューを読みました。', 'review', (SELECT id FROM vocab_senses WHERE slug='review.n.critique'), ARRAY['review','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 6, 'npc', 'It''s very popular.', 'とても人気です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 7, 'user', 'I can see; there''s a big {audience} today.', '分かります、今日は観客が多い。', 'audience', (SELECT id FROM vocab_senses WHERE slug='audience.n.viewers'), ARRAY['audience','novel','plot','author']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 8, 'npc', 'There''s a film screening too.', '映画の上映もあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 9, 'user', 'Oh, by which {director}?', 'へえ、どの監督の？', 'director', (SELECT id FROM vocab_senses WHERE slug='director.n.filmmaker'), ARRAY['director','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 10, 'npc', 'A local documentary maker.', '地元のドキュメンタリー作家です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 11, 'user', 'And is there a talk by the book''s {author}?', '本の著者のトークもありますか？', 'author', (SELECT id FROM vocab_senses WHERE slug='author.n.writer'), ARRAY['author','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 12, 'npc', 'At three, in the hall.', '3時に、ホールで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 13, 'user', 'Perfect, I''ll stay for it.', '完璧、それまでいます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='travel'), 14, 'npc', 'Enjoy the art!', 'アートを楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 0, 'npc', 'How do we promote the new exhibition?', '新しい展覧会をどう宣伝する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 1, 'user', 'First, define our target {audience}.', 'まず、ターゲットの観客を決めよう。', 'audience', (SELECT id FROM vocab_senses WHERE slug='audience.n.viewers'), ARRAY['audience','novel','plot','author']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 2, 'npc', 'Young art fans, mostly.', '主に若いアートファンだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 3, 'user', 'Then the {exhibition} needs bold posters.', 'なら展覧会には目を引くポスターが要る。', 'exhibition', (SELECT id FROM vocab_senses WHERE slug='exhibition.n.show'), ARRAY['exhibition','novel','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 4, 'npc', 'Any press coverage?', '報道は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 5, 'user', 'A magazine will publish a {review}.', '雑誌がレビューを載せてくれる。', 'review', (SELECT id FROM vocab_senses WHERE slug='review.n.critique'), ARRAY['review','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 6, 'npc', 'Who''s the star artist?', '目玉のアーティストは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 7, 'user', 'The museum {director} curated it herself.', '美術館の館長が自ら企画した。', 'director', (SELECT id FROM vocab_senses WHERE slug='director.n.filmmaker'), ARRAY['director','novel','plot','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 8, 'npc', 'Is there a film tie-in?', '映画とのタイアップは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 9, 'user', 'Yes, a short film; the {plot} links to the art.', 'うん、短編映画で、筋がアートとつながってる。', 'plot', (SELECT id FROM vocab_senses WHERE slug='plot.n.story'), ARRAY['plot','novel','review','gallery']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 10, 'npc', 'Where do we show it?', 'どこで上映する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 11, 'user', 'In the main {gallery}, on a big screen.', 'メインの展示室で、大きなスクリーンで。', 'gallery', (SELECT id FROM vocab_senses WHERE slug='gallery.n.place'), ARRAY['gallery','novel','plot','review']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 12, 'npc', 'Great concept.', 'いいコンセプト。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 13, 'user', 'I''ll book the space.', 'スペースを押さえるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-35') AND goal='business'), 14, 'npc', 'Nice work, {{user_name}}.', 'いい仕事だね、{{user_name}}。', NULL, NULL, NULL);
