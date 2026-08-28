-- ============================================================================
-- Vocab 101 — Lesson 8 (new): "Free time & hobbies"  (Unit 8)
-- ----------------------------------------------------------------------------
-- Words: like, love, play, music, sport, read, watch, favorite. All content
-- words, pinned by their objects, so every one is cloze-able. American spelling,
-- no em-dashes. Options answer-first (player/editor shuffle).
--
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('hobbies', 'Free time & hobbies', '趣味・余暇', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('like',     'like',     '/laɪk/',      '/laɪk/',       40, 1, FALSE, NULL),
  ('love',     'love',     '/lʌv/',       '/lʌv/',       120, 1, FALSE, 'ラブ。/lʌv/。'),
  ('play',     'play',     '/pleɪ/',      '/pleɪ/',      130, 1, FALSE, NULL),
  ('music',    'music',    '/ˈmjuːzɪk/',  '/ˈmjuːzɪk/',  260, 1, FALSE, 'ミュージック。/ˈmjuːzɪk/。'),
  ('sport',    'sport',    '/spɔːrt/',    '/spɔːt/',     380, 1, FALSE, 'スポーツ。単数は sport、複数は sports。'),
  ('read',     'read',     '/riːd/',      '/riːd/',      170, 1, FALSE, NULL),
  ('watch',    'watch',    '/wɑːtʃ/',     '/wɒtʃ/',      230, 1, FALSE, NULL),
  ('favorite', 'favorite', '/ˈfeɪvərɪt/', '/ˈfeɪvərɪt/', 550, 2, FALSE, 'フェイバリット。英式は favourite。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='like'),     'like.v.enjoy',    1, TRUE, 'verb',      '好き',             'to enjoy something or think it is good', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='love'),     'love.v.adore',    1, TRUE, 'verb',      '大好き',   'to like something very much', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='play'),     'play.v.games',    1, TRUE, 'verb',      'する',   'to take part in a game or make music', 'A1', 'スポーツや楽器に使う：play tennis / play the guitar。'),
  ((SELECT id FROM vocab_words WHERE normalized='music'),    'music.n.sound',   1, TRUE, 'noun',      '音楽',             'sounds arranged to be nice to listen to', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sport'),    'sport.n.game',    1, TRUE, 'noun',      'スポーツ',         'a physical game or activity, like soccer or tennis', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='read'),     'read.v.text',     1, TRUE, 'verb',      '読む',             'to look at and understand written words', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='watch'),    'watch.v.look',    1, TRUE, 'verb',      '見る',       'to look at something for a time, like TV', 'A1', 'watch=じっと観る（TV/映画）。see/look と混同注意。'),
  ((SELECT id FROM vocab_words WHERE normalized='favorite'), 'favorite.adj.best',1, TRUE,'adjective', 'お気に入りの',     'that you like the best', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('like','love','play','music','sport','read','watch','favorite')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), (SELECT id FROM vocab_senses WHERE slug='love.v.adore'), NULL, 'near_synonym', 'love は like より強い。'),
  ((SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), NULL, 'enjoy', 'synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), NULL, 'hate',  'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='love.v.adore'), NULL, 'hate',  'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='watch.v.look'), NULL, 'see',   'confusable', 'watch=（動くものを）じっと観る、see=見える／会う、look=（意識して）見る。'),
  ((SELECT id FROM vocab_senses WHERE slug='favorite.adj.best'), NULL, 'best', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='hobbies'
WHERE s.slug IN ('like.v.enjoy','love.v.adore','play.v.games','music.n.sound','sport.n.game','read.v.text','watch.v.look','favorite.adj.best')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-8', 1, 8, (SELECT id FROM vocab_categories WHERE slug='hobbies'), 'Free time & hobbies', '趣味・余暇', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-8'), s.id, x.ord
FROM (VALUES
  ('like.v.enjoy',0),('love.v.adore',1),('play.v.games',2),('music.n.sound',3),
  ('sport.n.game',4),('read.v.text',5),('watch.v.look',6),('favorite.adj.best',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-8'), 'conversation', 0, 'Talking about music', '音楽の話',       'home',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-8'), 'travel',       1, 'What do you do for fun?', '趣味は何？',  'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-8'), 'business',     2, 'Weekend hobbies',      '週末の趣味',     'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 0, 'npc', 'Do you like this song?', 'この曲好き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 1, 'user', 'Yeah, I really {love} this band!', 'うん、このバンド本当に大好き！', 'love', (SELECT id FROM vocab_senses WHERE slug='love.v.adore'), ARRAY['sell','own','love','hate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 2, 'npc', 'Me too! What kind of music do you like?', '私も！どんな音楽が好き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 3, 'user', 'Jazz is my {favorite}, the one I love most.', 'ジャズが一番好き、大好きなの。', 'favorite', (SELECT id FROM vocab_senses WHERE slug='favorite.adj.best'), ARRAY['second','favorite','worst','only']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 4, 'npc', 'Nice! Do you play anything?', 'いいね！何か演奏する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 5, 'user', 'Yeah, I {play} the piano.', 'うん、ピアノを弾くよ。', 'play', (SELECT id FROM vocab_senses WHERE slug='play.v.games'), ARRAY['play','buy','watch','read']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 6, 'npc', 'Cool! I cannot play any instruments.', 'すごい！私は楽器は何もできない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 7, 'user', 'That''s okay, you can still enjoy {music}, listening to songs.', '大丈夫、曲を聴いて音楽を楽しめるよ。', 'music', (SELECT id FROM vocab_senses WHERE slug='music.n.sound'), ARRAY['music','food','sport','news']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 8, 'npc', 'True! Let us go to a concert sometime.', 'たしかに！今度コンサート行こう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 9, 'user', 'I would really {like} that a lot!', 'それ、すごくいいね！', 'like', (SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), ARRAY['forget','hate','need','like']);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 0, 'npc', 'So what do you do for fun back home?', '地元では趣味は何？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 1, 'user', 'I {watch} a lot of movies.', '映画をよく観るよ。', 'watch', (SELECT id FROM vocab_senses WHERE slug='watch.v.look'), ARRAY['cook','drive','read','watch']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 2, 'npc', 'Nice! Do you read much too?', 'いいね！本もよく読む？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 3, 'user', 'Yeah, I {read} books on the train every day.', 'うん、毎日電車で本を読む。', 'read', (SELECT id FROM vocab_senses WHERE slug='read.v.text'), ARRAY['read','eat','sleep','run']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 4, 'npc', 'Same! What kind of books?', '同じだ！どんな本？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 5, 'user', 'Mystery novels, mostly.', 'だいたいミステリー小説。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 6, 'npc', 'Cool. Do you play a {sport}, like tennis, as well?', 'いいね。テニスみたいなスポーツもする？', 'sport', (SELECT id FROM vocab_senses WHERE slug='sport.n.game'), ARRAY['song','sport','book','game']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 7, 'user', 'I {play} tennis on weekends.', '週末にテニスをするよ。', 'play', (SELECT id FROM vocab_senses WHERE slug='play.v.games'), ARRAY['play','read','wash','watch']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 8, 'npc', 'Fun! Tennis is my {favorite}, the one I love most, too.', '楽しい！テニスが一番好き、私も大好き。', 'favorite', (SELECT id FROM vocab_senses WHERE slug='favorite.adj.best'), ARRAY['first','worst','favorite','last']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 9, 'user', 'We should play together sometime!', '今度一緒にやろう！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 0, 'npc', 'Any fun plans this weekend?', '今週末は何か楽しい予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 1, 'user', 'Just relaxing. I really {like} reading on Sundays.', 'のんびり。日曜に読書するのが本当に好き。', 'like', (SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), ARRAY['like','hate','sell','need']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 2, 'npc', 'Nice. What do you like to read?', 'いいですね。どんな本を読むんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 3, 'user', 'History, mostly. And I listen to {music} - songs and bands.', '歴史が多いかな。それに音楽を聴く、曲やバンドを。', 'music', (SELECT id FROM vocab_senses WHERE slug='music.n.sound'), ARRAY['sport','weather','music','news']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 4, 'npc', 'I love music too. Do you play?', '私も音楽大好きです。演奏します？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 5, 'user', 'A little. I {play} guitar for fun.', '少し。趣味でギターを弾きます。', 'play', (SELECT id FROM vocab_senses WHERE slug='play.v.games'), ARRAY['play','watch','cook','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 6, 'npc', 'Nice! I''m more into {sport}, like football, myself.', 'いいね！私はサッカーみたいなスポーツの方が好き。', 'sport', (SELECT id FROM vocab_senses WHERE slug='sport.n.game'), ARRAY['work','food','music','sport']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 7, 'user', 'Oh? Do you play, or just {watch}?', 'そうなんですね。やる方ですか、観る方ですか？', 'watch', (SELECT id FROM vocab_senses WHERE slug='watch.v.look'), ARRAY['cook','buy','watch','read']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 8, 'npc', 'I play soccer every Saturday!', '毎週土曜にサッカーをします！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 9, 'user', 'That is my favorite to watch!', 'それ、観るのが一番好きです！', NULL, NULL, NULL);
