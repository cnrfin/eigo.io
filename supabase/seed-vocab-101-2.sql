-- ============================================================================
-- Vocab 101 — Lesson 2, re-cut scene-first: "Getting to know you"
-- ----------------------------------------------------------------------------
-- Replaces the retired pronoun lesson. Words: meet, live, work, student,
-- teacher, friend (reused), city, nice. Situational + cloze-friendly.
-- Includes word senses, a few relations, the lesson remap, and 3 goal scenes.
--
-- Re-runnable. Run AFTER add-vocab-101.sql, add-vocab-scenes.sql, and
-- seed-vocab-101-a1.sql (which created friend.n.person, reused here).
-- The old pronoun senses are left orphaned (not in any lesson) — harmless.
-- ============================================================================

-- ── Theme ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('introductions', 'Getting to know you', '自己紹介', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('meet',    'meet',    '/miːt/',       '/miːt/',        300, 1, FALSE, NULL),
  ('live',    'live',    '/lɪv/',        '/lɪv/',         250, 1, FALSE, '動詞は /lɪv/「住む」。形容詞「ライブ」は /laɪv/ で別物。'),
  ('work',    'work',    '/wɜːrk/',      '/wɜːk/',         80, 1, FALSE, NULL),
  ('student', 'student', '/ˈstuːdənt/',  '/ˈstjuːdənt/',  400, 1, FALSE, NULL),
  ('teacher', 'teacher', '/ˈtiːtʃər/',   '/ˈtiːtʃə/',     500, 1, FALSE, NULL),
  ('city',    'city',    '/ˈsɪti/',      '/ˈsɪti/',       350, 1, FALSE, NULL),
  ('nice',    'nice',    '/naɪs/',       '/naɪs/',        450, 1, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='meet'),    'meet.v.encounter',   1, TRUE, 'verb',      '会う',   'to see and talk to someone, especially for the first time', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='live'),    'live.v.reside',      1, TRUE, 'verb',      '住む',             'to have your home in a place',                              'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='work'),    'work.v.job',         1, TRUE, 'verb',      '働く',             'to have a job; to do a job',                                'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='student'), 'student.n.learner',  1, TRUE, 'noun',      '学生',             'a person who studies at a school or university',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='teacher'), 'teacher.n.educator', 1, TRUE, 'noun',      '先生',             'a person whose job is to teach',                            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='city'),    'city.n.place',       1, TRUE, 'noun',      '都市',   'a large town',                                              'A1', '「都市」。小さいのは town（町）。'),
  ((SELECT id FROM vocab_words WHERE normalized='nice'),    'nice.adj.pleasant',  1, TRUE, 'adjective', 'すてきな', 'pleasant, kind, or friendly',                               'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent) ─────────────────────────
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('meet','live','work','student','teacher','city','nice')));

-- ── Relations (for card display + recall-accept) ───────────────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'),   NULL, 'kind',     'synonym',      NULL),
  ((SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'),   NULL, 'friendly', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='student.n.learner'),   NULL, 'pupil',    'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'),    NULL, 'see',      'confusable',   'meet=（初めて）会う・知り合う、see=会う／見る。'),
  ((SELECT id FROM vocab_senses WHERE slug='city.n.place'),        NULL, 'town',     'confusable',   'city=大都市、town=町（小さめ）。');

-- ── Category membership ─────────────────────────────────────────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='introductions'
WHERE s.slug IN ('meet.v.encounter','live.v.reside','work.v.job','student.n.learner','teacher.n.educator','city.n.place','nice.adj.pleasant','friend.n.person')
ON CONFLICT DO NOTHING;

-- ── Remap the lesson (was pronouns) → Getting to know you ──────────────────
UPDATE vocab_lessons SET
  title_en='Getting to know you', title_ja='自己紹介',
  theme_id=(SELECT id FROM vocab_categories WHERE slug='introductions'),
  level_index=1, order_index=2, published=TRUE, free=TRUE
WHERE slug='vocab-101-2';

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-2'), s.id, x.ord
FROM (VALUES
  ('meet.v.encounter',0),('live.v.reside',1),('work.v.job',2),('student.n.learner',3),
  ('teacher.n.educator',4),('friend.n.person',5),('city.n.place',6),('nice.adj.pleasant',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

-- ── Scenes ──────────────────────────────────────────────────────────────────
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-2'), 'conversation', 0, 'Meeting a new neighbour', '新しいご近所さん',     'home',    'neighbour'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-2'), 'travel',       1, 'Chatting at a hostel',     '宿で世間話',           'hostel',  'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-2'), 'business',     2, 'A new colleague',          '新しい同僚',           'office',  'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 0, 'npc',  'Hi! Are you the new neighbour?', 'こんにちは！新しく越してきた方ですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 1, 'user', 'Yes, I just moved in. Nice to {meet} you.', 'はい、引っ越してきたばかりです。はじめまして。', 'meet', (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['sell','drive','meet','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 2, 'npc',  'Welcome! Where did you live before?', 'ようこそ！前はどこに住んでいましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 3, 'user', 'I used to {live} in a house in a smaller town.', '前は小さな町の家に住んでいました。', 'live', (SELECT id FROM vocab_senses WHERE slug='live.v.reside'), ARRAY['work','live','study','travel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 4, 'npc',  'Big change! So what do you do?', '大きな変化ですね！お仕事は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 5, 'user', 'I''m a {student}. I study nursing.', '学生です。看護を勉強しています。', 'student', (SELECT id FROM vocab_senses WHERE slug='student.n.learner'), ARRAY['driver','student','teacher','doctor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 6, 'npc',  'Nice. It''s a great {city}, full of universities, for students.', 'いいね。大学がたくさんある、学生にいい街だよ。', 'city', (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['shop','city','town','village']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 7, 'user', 'That''s good to hear.', 'それは嬉しいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 8, 'npc',  'Let me know if you need anything. Neighbours should be {nice} and helpful!', '何かあれば言ってね。ご近所さんは親切で助け合うべき！', 'nice', (SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'), ARRAY['nice','quiet','busy','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 9, 'user', 'Thanks! I''m {{user_name}}, by the way.', 'ありがとう！あ、{{user_name}}です。', NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 0, 'npc',  'Hi! Are you traveling too?',                  'やあ！君も旅行中？',                  NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 1, 'user', 'Yeah! First time here.',                      'うん！ここは初めて。',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 2, 'npc',  'Nice to {meet} you. Where are you from?',     'はじめまして。どこから来たの？',      'meet',    (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['meet','cook','buy','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 3, 'user', 'Japan. You?',                                 '日本だよ。君は？',                    NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 4, 'npc',  'Canada. So what do you do back home?',        'カナダ。地元では何してるの？',        NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 5, 'user', 'I {work} at a small company.',                '小さな会社で働いてるよ。',            'work',    (SELECT id FROM vocab_senses WHERE slug='work.v.job'), ARRAY['work','play','sleep','live']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 6, 'npc',  'Cool! I''m a {teacher}. I teach kids.',      'いいね！僕は先生、子どもたちに教えてるんだ。', 'teacher', (SELECT id FROM vocab_senses WHERE slug='teacher.n.educator'), ARRAY['nurse','teacher','waiter','student']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 7, 'user', 'That sounds fun.',                            '楽しそう。',                          NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 8, 'npc',  'Have you seen much of the {city} yet?',       'もう街はけっこう見て回った？',        'city',    (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['city','food','train','hotel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 9, 'user', 'A little, but it''s really {nice}, so clean and green.',             '少し、でもすごくいい、きれいで緑も多い。',          'nice',    (SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'), ARRAY['cold','far','loud','nice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 10, 'npc',  'You''ll love it. Let''s grab dinner sometime!', '気に入るよ。今度ごはん行こう！',    NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 0, 'npc',  'Hi, you must be the new hire. Welcome!',      'はじめまして、新しい方ですね。ようこそ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 1, 'user', 'Thank you! Nice to {meet} you.',              'ありがとうございます！はじめまして。', 'meet',    (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['drive','sell','meet','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 2, 'npc',  'You too. How are you finding the {city}?',    'こちらこそ。街の感じはどうですか？',  'city',    (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['weather','food','train','city']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 3, 'user', 'It''s great. I {live} in an apartment a short walk from here.', 'いいですよ。歩いてすぐのアパートに住んでます。', 'live', (SELECT id FROM vocab_senses WHERE slug='live.v.reside'), ARRAY['work','live','park','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 4, 'npc',  'Convenient! I''m in the design team. And you?', '便利ですね！私はデザインチームです。あなたは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 5, 'user', 'Marketing.',                                  'マーケティングです。',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 6, 'npc',  'Nice. My work {friend} Sam will show you around.', 'いいですね。同僚のサムが案内しますよ。', 'friend', (SELECT id FROM vocab_senses WHERE slug='friend.n.person'), ARRAY['client','friend','boss','manager']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 7, 'user', 'Great, thanks.',                              'ありがとうございます。',              NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 8, 'npc',  'He''s really {nice}; he helps everyone out.',  '彼は本当に親切で、みんなを助けてくれます。', 'nice', (SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'), ARRAY['nice','quiet','strict','new']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 9, 'user', 'Looking forward to it.',                      '楽しみです。',                        NULL, NULL, NULL);
