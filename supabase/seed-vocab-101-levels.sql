-- ============================================================================
-- Vocab 101: split the flat course into thematic LEVELS (= units) and add the
-- first unit-review capstone.
-- ----------------------------------------------------------------------------
-- Until now every lesson sat at level_index = 1 (one big "A1" level). This
-- assigns each built lesson to its unit (level_index 1-13, see VOCAB-SCENES.md)
-- and adds a Unit 1 review lesson whose scene recombines all of Unit 1's words.
--
-- Review lessons use the `-review` slug convention (same as the exam course);
-- the app renders them as the level's capstone station.
--
-- Re-runnable. RUN AFTER the per-lesson seeds (seed-vocab-101-a1.sql, 2..10),
-- since those re-assert level_index/order_index on conflict, so this file must be
-- the last word on lesson placement.
-- ============================================================================

-- ── Reassign built lessons to their units ─────────────────────────────────
-- Unit 1 · People & introductions
UPDATE vocab_lessons SET level_index=1, order_index=1 WHERE slug='vocab-101-1';  -- Hello & goodbye
UPDATE vocab_lessons SET level_index=1, order_index=2 WHERE slug='vocab-101-2';  -- Getting to know you
-- Unit 2 · Feelings & relationships
UPDATE vocab_lessons SET level_index=2, order_index=1 WHERE slug='vocab-101-9';  -- Feelings
-- Unit 3 · Home & town
UPDATE vocab_lessons SET level_index=3, order_index=1 WHERE slug='vocab-101-10'; -- Home
UPDATE vocab_lessons SET level_index=3, order_index=2 WHERE slug='vocab-101-5';  -- Finding your way
-- Unit 4 · Daily life
UPDATE vocab_lessons SET level_index=4, order_index=1 WHERE slug='vocab-101-7';  -- Daily routine
UPDATE vocab_lessons SET level_index=4, order_index=2 WHERE slug='vocab-101-6';  -- Making plans
-- Unit 5 · Food & eating
UPDATE vocab_lessons SET level_index=5, order_index=1 WHERE slug='vocab-101-4';  -- Food & drink
-- Unit 6 · Shopping & money
UPDATE vocab_lessons SET level_index=6, order_index=1 WHERE slug='vocab-101-3';  -- Shopping
-- Unit 8 · Free time
UPDATE vocab_lessons SET level_index=8, order_index=1 WHERE slug='vocab-101-8';  -- Free time & hobbies

-- ── Visibility gate ───────────────────────────────────────────────────────
-- A unit only goes live once it is complete (its lessons + review). Units 1
-- (People), 3 (Home & town) and 4 (Daily life) each have two lessons + a review
-- below, so they publish. The single-lesson themes stay hidden as head-start
-- backlog until we finish them (they only need a second lesson + a review).
UPDATE vocab_lessons SET published=true  WHERE slug IN ('vocab-101-1','vocab-101-2','vocab-101-10','vocab-101-5','vocab-101-7','vocab-101-6');
UPDATE vocab_lessons SET published=false WHERE slug IN ('vocab-101-9','vocab-101-4','vocab-101-3','vocab-101-8'); -- Feelings, Food, Shopping, Hobbies

-- ── Unit 1 review capstone ────────────────────────────────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free)
VALUES ('vocab-101-u1-review', 1, 3,
        (SELECT id FROM vocab_categories WHERE slug='greetings'),
        'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index,
  theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja,
  published=EXCLUDED.published, free=EXCLUDED.free;

-- Items = every Unit 1 word, so the capstone reviews the whole unit (and any
-- blanked word resolves to an item on the lesson).
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review'), s.id, x.ord
FROM (VALUES
  ('hello.excl.greeting', 0), ('goodbye.excl.parting', 1), ('yes.excl.affirm', 2),
  ('no.excl.refuse', 3), ('please.adv.polite', 4), ('thanks.excl.thank', 5),
  ('sorry.excl.apolog', 6), ('name.n.identity', 7), ('meet.v.encounter', 8),
  ('live.v.reside', 9), ('work.v.job', 10), ('student.n.learner', 11),
  ('teacher.n.educator', 12), ('friend.n.person', 13), ('city.n.place', 14),
  ('nice.adj.pleasant', 15)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug;

-- Boss scene: a single conversation that recombines Unit 1's words. Only the
-- target-word lines are blanked; the rest play. (Reviews blank more than a
-- normal lesson; this is the payoff for finishing the unit.)
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review');

INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review'), 'conversation', 0, 'A new class', '新しいクラス', 'classroom', 'classmate');

INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 0, 'npc',  'Hello! Are you new here?',                       'こんにちは！新しく来た方ですか？',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 1, 'user', 'Yes, hi! It''s nice to {meet} you.',             'はい、こんにちは！はじめまして。',       'meet', (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['call','meet','see','help']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 2, 'npc',  'Nice to meet you too. What''s your {name}?',     'こちらこそ。お名前は？',                 'name', (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['work','age','city','name']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 3, 'user', 'I''m {{user_name}}. I''m a {student} here.',     '{{user_name}}です。ここの生徒です。',    'student', (SELECT id FROM vocab_senses WHERE slug='student.n.learner'), ARRAY['student','friend','doctor','teacher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 4, 'npc',  'Welcome! I''m the {teacher}. Please sit down.',  'ようこそ！私が先生です。どうぞ座って。', 'teacher', (SELECT id FROM vocab_senses WHERE slug='teacher.n.educator'), ARRAY['friend','teacher','waiter','student']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 5, 'user', 'Thanks! Where do you {live}?',                   'ありがとう！どこに住んでいますか？',     'live', (SELECT id FROM vocab_senses WHERE slug='live.v.reside'), ARRAY['live','eat','go','work']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 6, 'npc',  'I live in this {city}, near the station.',       'この街の、駅の近くに住んでいます。',     'city', (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['shop','bus','room','city']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 7, 'user', 'Nice. Do you {work} near here?',                 'いいですね。この近くで働いていますか？', 'work', (SELECT id FROM vocab_senses WHERE slug='work.v.job'), ARRAY['work','live','cook','play']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 8, 'npc',  'Yes. My {friend} teaches here too.',             'はい。友達もここで教えています。',       'friend', (SELECT id FROM vocab_senses WHERE slug='friend.n.person'), ARRAY['student','friend','sister','teacher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 9, 'user', 'That''s {nice}. Goodbye, see you in class!',     'それはいいですね。では、クラスで！',     'nice', (SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'), ARRAY['sorry','cold','nice','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 10, 'npc', 'Goodbye! Have a good day.',                      'さようなら！よい一日を。',               NULL, NULL, NULL);

-- ── Unit 3 review capstone (Home & town) ──────────────────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free)
VALUES ('vocab-101-u3-review', 3, 3,
        (SELECT id FROM vocab_categories WHERE slug='directions'),
        'Review', '復習', true, false)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index,
  theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja,
  published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review'), s.id, x.ord
FROM (VALUES
  ('house.n.building', 0), ('room.n.space', 1), ('kitchen.n.cook', 2), ('door.n.entry', 3),
  ('window.n.glass', 4), ('garden.n.yard', 5), ('bed.n.sleep', 6), ('bathroom.n.wash', 7),
  ('where.adv.place', 8), ('turn.v.direction', 9), ('straight.adv.direct', 10), ('near.adj.close', 11),
  ('station.n.transit', 12), ('street.n.road', 13), ('left.adv.direction', 14), ('right.adv.direction', 15)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review'), 'conversation', 0, 'A friend visits', '友達が訪ねてくる', 'home', 'friend');

INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 0, 'npc',  'Hi! I''m near the {station}. Which way now?', 'やあ！駅の近くにいるよ。どっち？',       'station', (SELECT id FROM vocab_senses WHERE slug='station.n.transit'), ARRAY['window','street','station','garden']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 1, 'user', 'Go {straight} down this road.',              'この道をまっすぐ行って。',               'straight', (SELECT id FROM vocab_senses WHERE slug='straight.adv.direct'), ARRAY['back','right','straight','left']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 2, 'user', 'At the shop, {turn} left.',                  'お店の所で左に曲がって。',               'turn', (SELECT id FROM vocab_senses WHERE slug='turn.v.direction'), ARRAY['look','turn','stop','wait']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 3, 'npc',  'Turn left, got it. Is your {street} long?',  '左ね、了解。通りは長い？',               'street', (SELECT id FROM vocab_senses WHERE slug='street.n.road'), ARRAY['door','street','room','garden']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 4, 'user', 'No, it''s {near} now.',                      'ううん、もうすぐだよ。',                 'near', (SELECT id FROM vocab_senses WHERE slug='near.adj.close'), ARRAY['free','late','busy','near']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 5, 'user', 'It''s the white {house} on the right.',      '右側の白い家だよ。',                     'house', (SELECT id FROM vocab_senses WHERE slug='house.n.building'), ARRAY['street','station','house','room']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 6, 'npc',  'Found it! Is this the {kitchen}?',           '着いた！ここが台所？',                   'kitchen', (SELECT id FROM vocab_senses WHERE slug='kitchen.n.cook'), ARRAY['street','station','garden','kitchen']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 7, 'user', 'Yes. And there''s a small {garden} out back.','うん。裏に小さな庭もあるよ。',           'garden', (SELECT id FROM vocab_senses WHERE slug='garden.n.yard'), ARRAY['room','window','garden','door']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 8, 'npc',  'I love this {room}. So bright!',              'この部屋いいね。明るい！',               'room', (SELECT id FROM vocab_senses WHERE slug='room.n.space'), ARRAY['room','garden','kitchen','house']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 9, 'user', 'Thanks! Sit down, make yourself at home.',    'ありがとう！座って、くつろいでね。',     NULL, NULL, NULL);

-- ── Unit 4 review capstone (Daily life) ───────────────────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free)
VALUES ('vocab-101-u4-review', 4, 3,
        (SELECT id FROM vocab_categories WHERE slug='plans'),
        'Review', '復習', true, false)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index,
  theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja,
  published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review'), s.id, x.ord
FROM (VALUES
  ('wake.v.rise', 0), ('shower.v.wash', 1), ('start.v.begin', 2), ('work.v.job', 3),
  ('finish.v.end', 4), ('sleep.v.rest', 5), ('early.adv.time', 6), ('late.adv.time', 7),
  ('time.n.clock', 8), ('free.adj.available', 9), ('busy.adj.occupied', 10), ('meet.v.encounter', 11),
  ('plan.v.arrange', 12), ('when.adv.time', 13), ('today.adv.now', 14), ('tomorrow.adv.nextday', 15),
  ('tonight.adv.evening', 16)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review'), 'conversation', 0, 'Finding a time', '時間を見つける', 'cafe', 'friend');

INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 0, 'npc',  'Are you free tonight?',                      '今夜は空いてる？',                       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 1, 'user', 'Sorry, tonight I''m {busy}.',                'ごめん、今夜は忙しいんだ。',             'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['early','free','late','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 2, 'npc',  '{When} are you free, then?',                 'じゃあ、いつなら空いてる？',             'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['What','Who','Where','When']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 3, 'user', 'I {finish} work at six.',                    '仕事は6時に終わるよ。',                 'finish', (SELECT id FROM vocab_senses WHERE slug='finish.v.end'), ARRAY['finish','wake','sleep','start']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 4, 'npc',  'And what {time} do you start?',              '始まりは何時？',                         'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['room','plan','day','time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 5, 'user', 'I {start} at nine.',                         '9時に始まるよ。',                       'start', (SELECT id FROM vocab_senses WHERE slug='start.v.begin'), ARRAY['start','sleep','meet','finish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 6, 'npc',  'Do you {wake} up early?',                    '早く起きるの？',                         'wake', (SELECT id FROM vocab_senses WHERE slug='wake.v.rise'), ARRAY['start','wake','work','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 7, 'user', 'Yes! I shower and leave by seven, but I {sleep} late on weekends.', 'うん！シャワーして7時には出るよ。でも週末は遅くまで寝る。', 'sleep', (SELECT id FROM vocab_senses WHERE slug='sleep.v.rest'), ARRAY['wake','finish','sleep','start']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 8, 'npc',  'Same here. Let''s {plan} something.',        '同じだね。何か計画しよう。',             'plan', (SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'), ARRAY['work','plan','meet','shower']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 9, 'user', 'Let''s {meet} tomorrow at noon.',            '明日の昼に会おう。',                     'meet', (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['meet','wake','plan','finish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 10, 'npc', 'Perfect. See you {tomorrow}!',               '完璧。じゃあ明日！',                     'tomorrow', (SELECT id FROM vocab_senses WHERE slug='tomorrow.adv.nextday'), ARRAY['today','when','tonight','tomorrow']);
