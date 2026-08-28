-- ============================================================================
-- Vocab 101: Lesson 11 (new): "School"  (Unit 7, Work and study)
-- ----------------------------------------------------------------------------
-- Words: study, class, book, test, easy, hard, question, answer. All new.
-- American spelling, no em-dashes. Parked (published=FALSE) until Unit 7 gets
-- its second lesson + review. Reuses (played only): teacher, student, friend.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('school', 'School', '学校', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('study',    'study',    '/ˈstʌdi/',      '/ˈstʌdi/',     300, 1, FALSE, NULL),
  ('class',    'class',    '/klæs/',        '/klɑːs/',      250, 1, FALSE, 'クラス。/klæs/。'),
  ('book',     'book',     '/bʊk/',         '/bʊk/',        200, 1, FALSE, 'ブック。/bʊk/。'),
  ('test',     'test',     '/test/',        '/test/',       350, 1, FALSE, 'テスト。/test/。'),
  ('easy',     'easy',     '/ˈiːzi/',       '/ˈiːzi/',      400, 1, FALSE, NULL),
  ('hard',     'hard',     '/hɑːrd/',       '/hɑːd/',       300, 1, FALSE, NULL),
  ('question', 'question', '/ˈkwestʃən/',   '/ˈkwestʃən/',  350, 1, FALSE, NULL),
  ('answer',   'answer',   '/ˈænsər/',      '/ˈɑːnsə/',     400, 1, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='study'),    'study.v.learn',   1, TRUE, 'verb',      '勉強する',   'to spend time learning about a subject', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='class'),    'class.n.lesson',  1, TRUE, 'noun',      '授業', 'a time when students learn together; a group of students', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='book'),     'book.n.reading',  1, TRUE, 'noun',      '本',         'sheets of paper with words, held together to read', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='test'),     'test.n.exam',     1, TRUE, 'noun',      'テスト', 'a set of questions to check what you know', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='easy'),     'easy.adj.simple', 1, TRUE, 'adjective', '簡単な',     'not difficult to do or understand', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hard'),     'hard.adj.difficult',1,TRUE,'adjective', '難しい',     'difficult to do or understand', 'A1', 'この意味では difficult とほぼ同じ。'),
  ((SELECT id FROM vocab_words WHERE normalized='question'), 'question.n.query',1, TRUE, 'noun',      '質問',       'something you ask to get information', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='answer'),   'answer.n.reply',  1, TRUE, 'noun',      '答え',       'what you say or write in reply to a question', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('study','class','book','test','easy','hard','question','answer')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='easy.adj.simple'),   (SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'),(SELECT id FROM vocab_senses WHERE slug='easy.adj.simple'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='question.n.query'),  (SELECT id FROM vocab_senses WHERE slug='answer.n.reply'),     NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='answer.n.reply'),    (SELECT id FROM vocab_senses WHERE slug='question.n.query'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'),NULL, 'difficult', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='school'
WHERE s.slug IN ('study.v.learn','class.n.lesson','book.n.reading','test.n.exam','easy.adj.simple','hard.adj.difficult','question.n.query','answer.n.reply')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-11', 7, 1, (SELECT id FROM vocab_categories WHERE slug='school'), 'School', '学校', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-11'), s.id, x.ord
FROM (VALUES
  ('study.v.learn',0),('class.n.lesson',1),('book.n.reading',2),('test.n.exam',3),
  ('easy.adj.simple',4),('hard.adj.difficult',5),('question.n.query',6),('answer.n.reply',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-11'), 'conversation', 0, 'After the test',        'テストのあとで',   'school', 'classmate'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-11'), 'travel',       1, 'Joining a class abroad','海外で授業に参加', 'school', 'staff'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-11'), 'business',     2, 'A training day',        '研修の日',         'office', 'trainer');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 0, 'npc',  'Hey! How did the test go?',              'やあ！テストどうだった？',           NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 1, 'user', 'Honestly, it was really {hard}; I couldn''t finish.',        '正直、すごく難しくて、終わらなかった。',           'hard', (SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'), ARRAY['easy','near','hard','late']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 2, 'npc',  'Really? I thought it was {easy}, simple even.',       '本当？簡単だと思ったよ、むしろ楽勝。',       'easy', (SELECT id FROM vocab_senses WHERE slug='easy.adj.simple'), ARRAY['hard','busy','easy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 3, 'user', 'The last {question} was so tricky.',     '最後の質問が難しくて。',             'question', (SELECT id FROM vocab_senses WHERE slug='question.n.query'), ARRAY['answer','book','class','question']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 4, 'npc',  'Oh, I wasn''t sure of my {answer} either.','ああ、私も答えに自信なかった。',     'answer', (SELECT id FROM vocab_senses WHERE slug='answer.n.reply'), ARRAY['question','answer','test','word']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 5, 'user', 'Did you {study} a lot for it?',          'たくさん勉強した？',                 'study', (SELECT id FROM vocab_senses WHERE slug='study.v.learn'), ARRAY['study','cook','sleep','play']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 6, 'npc',  'Not enough! I need a better {book}.',    '足りなかった！もっといい本が要るな。','book', (SELECT id FROM vocab_senses WHERE slug='book.n.reading'), ARRAY['test','book','room','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 7, 'user', 'Same. Let''s take the next {test}, the exam next month, together.','だね。次のテスト、来月の試験を一緒に受けよう。','test', (SELECT id FROM vocab_senses WHERE slug='test.n.exam'), ARRAY['bus','class','trip','test']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 8, 'npc',  'Deal. We''ve got this!',                 '決まり。やれるよ！',                 NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 0, 'npc',  'Welcome! Would you like to join a {class}?','ようこそ！クラスに参加しますか？',   'class', (SELECT id FROM vocab_senses WHERE slug='class.n.lesson'), ARRAY['room','test','class','trip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 1, 'user', 'Yes! I want to {study} English here.',      'はい！ここで英語を勉強したいです。', 'study', (SELECT id FROM vocab_senses WHERE slug='study.v.learn'), ARRAY['work','sleep','study','travel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 2, 'npc',  'Wonderful. Do you have a {book} already?',  '素敵。もう本は持っていますか？',     'book', (SELECT id FROM vocab_senses WHERE slug='book.n.reading'), ARRAY['map','bag','key','book']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 3, 'user', 'Not yet. Is it {easy} enough for beginners?',      'まだです。初心者にも簡単ですか？',     'easy', (SELECT id FROM vocab_senses WHERE slug='easy.adj.simple'), ARRAY['far','easy','busy','hard']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 4, 'npc',  'Very gentle, don''t worry. Here''s your schedule.','とても優しいので大丈夫。これが予定表です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 5, 'user', 'Thank you so much!',                        'どうもありがとうございます！',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 6, 'npc',  'See you in class tomorrow!',                '明日クラスで会いましょう！',         NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 0, 'npc',  'Today''s training ends with a short test.', '今日の研修は最後に小テストがあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 1, 'user', 'A test? Is it {hard}, tricky to pass?',                     'テスト？難しくて受かりにくい？',             'hard', (SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'), ARRAY['easy','hard','late','long']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 2, 'npc',  'Not too bad if you {study} the notes.',     'メモを勉強すれば大丈夫ですよ。',     'study', (SELECT id FROM vocab_senses WHERE slug='study.v.learn'), ARRAY['sleep','study','rush','skip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 3, 'user', 'Okay. Can I ask a {question}?',             'わかりました。質問してもいいですか？', 'question', (SELECT id FROM vocab_senses WHERE slug='question.n.query'), ARRAY['test','answer','break','question']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 4, 'npc',  'Of course, go ahead.',                      'もちろん、どうぞ。',                 NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 5, 'user', 'Will the {test} be online?',                'テストはオンラインですか？',         'test', (SELECT id FROM vocab_senses WHERE slug='test.n.exam'), ARRAY['class','call','test','trip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 6, 'npc',  'Yes, right after lunch.',                   'はい、昼食のすぐあとに。',           NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 7, 'user', 'Got it. I''ll review before then.',         '了解です。それまでに復習します。',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 8, 'npc',  'Great attitude!',                           'いい姿勢ですね！',                   NULL, NULL, NULL);
