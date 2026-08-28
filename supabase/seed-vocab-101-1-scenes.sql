-- ============================================================================
-- Vocab 101 — Lesson 1 scenes: "Ordering a coffee" (travel) + "Arriving for a
-- meeting" (business). Same eight words, two situations. See VOCAB-SCENES.md.
--
-- Re-runnable: clears this lesson's scenes (cascades lines) then re-inserts.
-- Run AFTER add-vocab-scenes.sql and the A1 word seed (seed-vocab-101-a1.sql).
-- ============================================================================

DELETE FROM vocab_scenes WHERE lesson_id = (SELECT id FROM vocab_lessons WHERE slug='vocab-101-1');

INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-1'), 'travel',       0, 'Ordering a coffee',      'コーヒーを注文する', 'cafe',      'barista'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-1'), 'business',     1, 'Arriving for a meeting', '打ち合わせに到着',   'reception', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-1'), 'conversation', 2, 'Meeting someone new',    '初対面のあいさつ',   'party',     'new friend');

-- Helpers used below:
--   scene(goal)  = (SELECT id FROM vocab_scenes WHERE lesson_id=<L1> AND goal=<goal>)
--   sense(slug)  = (SELECT id FROM vocab_senses WHERE slug=<slug>)

-- ── Travel scene: "Ordering a coffee" ──────────────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 0, 'npc',  'Hi! Come on in.',                          'いらっしゃいませ！どうぞ。',        NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 1, 'user', '{Hello}, can I get a coffee?',             'こんにちは、コーヒーをもらえますか？', 'Hello',   (SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), ARRAY['Name','Goodbye','Thanks','Hello']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 2, 'npc',  'Of course. Can I get a {name} for the cup?', 'もちろん。カップにお名前をいただけますか？', 'name', (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['water','friend','name','drink']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 3, 'user', 'It''s {{user_name}}.',                     '{{user_name}}です。',               NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 4, 'npc',  'Thanks, {{user_name}}! Do you want milk?', 'ありがとう、{{user_name}}さん！ミルクは？', NULL,  NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 5, 'user', 'Yes, a little.',                           'はい、少しだけ。',                  NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 6, 'npc',  'Anything else?',                           '他にはいかがですか？',              NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 7, 'user', 'Some water too, {please}?',                'お水もお願いします。',              'please',  (SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), ARRAY['sorry','name','no','please']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 8, 'npc',  'That''ll be ¥480, {{user_name}}.',        '480円になります、{{user_name}}さん。', NULL,   NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 9, 'user', '{Sorry}, how much?',                       'すみません、おいくらですか？',      'Sorry',   (SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), ARRAY['Thanks','Hello','Sorry','Please']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 10, 'npc',  '¥480. Here''s your coffee.',              '480円です。コーヒーをどうぞ。',     NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 11, 'user', '{Thanks}!',                               'ありがとう！',                      'Thanks',  (SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), ARRAY['Sorry','Hello','Please','Thanks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 12, 'npc',  'Have a good day!',                        'よい一日を！',                      NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 13, 'user', 'You too. {Goodbye}!',                     'あなたも。さようなら！',            'Goodbye', (SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), ARRAY['Hello','Name','Please','Goodbye']);

-- ── Business scene: "Arriving for a meeting" ───────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 0, 'user', '{Hello}, I have a meeting with Ms. Tanaka.', 'こんにちは、田中さんとお約束があります。', 'Hello', (SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), ARRAY['Name','Goodbye','Hello','Thanks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 1, 'npc',  'Welcome. Can I have your {name}?',           'ようこそ。お名前をいただけますか？', 'name',  (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['friend','water','name','drink']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 2, 'user', 'It''s {{user_name}}.',                       '{{user_name}}です。',               NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 3, 'npc',  'Thanks, {{user_name}}. Do you have an appointment?', 'ありがとう、{{user_name}}さん。ご予約はありますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 4, 'user', 'Yes, at two.',                              'はい、2時に。',                     NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 5, 'npc',  'Would you like a coffee while you wait?',    'お待ちの間、コーヒーはいかがですか？', NULL,   NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 6, 'user', 'No, thank you.',                            'いいえ、けっこうです。',            NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 7, 'npc',  'She''ll be ready soon. {Please} take a seat.', 'もうすぐです。おかけください。',     'Please', (SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), ARRAY['Please','No','Sorry','Name']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 8, 'npc',  'Here''s your visitor pass.',                '訪問者パスです。',                  NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 9, 'user', '{Thanks}.',                                 'ありがとう。',                      'Thanks',  (SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), ARRAY['No','Goodbye','Thanks','Sorry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 10, 'user', '{Sorry}, which floor is it?',              'すみません、何階ですか？',          'Sorry',   (SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), ARRAY['Yes','Thanks','Hello','Sorry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 11, 'npc',  'Third floor.',                            '3階です。',                         NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 12, 'user', 'Great, {goodbye} for now.',              'では、失礼します。',                'goodbye', (SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), ARRAY['name','please','hello','goodbye']);

-- ── Conversation scene: "Meeting someone new" ─────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 0, 'npc',  'Hey! You must be one of Teri''s friends.', 'あ、ミカの友達だよね？',            NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 1, 'user', '{Hello}! Yeah, I am.',                     'こんにちは！うん、そうだよ。',      'Hello',   (SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), ARRAY['Thanks','Goodbye','Hello','Name']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 2, 'npc',  'Cool, I''m Sam. What''s your {name}?',     'いいね、サムだよ。名前は？',        'name',    (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['friend','water','drink','name']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 3, 'user', 'I''m {{user_name}}.',                      '{{user_name}}だよ。',               NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 4, 'npc',  'Nice one, {{user_name}}. Want a drink?',   'いいね、{{user_name}}さん。飲み物いる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 5, 'user', 'Yes, sure.',                               'うん、ぜひ。',                      NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 6, 'npc',  'Soda or juice?',                           'ソーダとジュース、どっち？',        NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 7, 'user', 'Juice, {please}.',                         'ジュースをお願い。',                'please',  (SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), ARRAY['please','sorry','name','no']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 8, 'npc',  'Here you go.',                             'はい、どうぞ。',                    NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 9, 'user', '{Thanks}!',                                'ありがとう！',                      'Thanks',  (SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), ARRAY['Please','Thanks','Hello','Sorry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 10, 'npc',  'So, how do you know Teri?',               'で、ミカとはどういう知り合い？',    NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 11, 'user', '{Sorry}, it''s loud. What was that?',             'ごめん、うるさくて…なんて？',       'Sorry',   (SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), ARRAY['Thanks','Hello','Yes','Sorry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 12, 'npc',  'How do you know Teri?',                   'ミカとはどういう知り合い？',        NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 13, 'user', 'Oh, from work.',                          'あぁ、仕事仲間だよ。',              NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 14, 'npc',  'Ah, cool. Hey, I''ll catch you later.',   'なるほどね。じゃ、またあとで。',    NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 15, 'user', 'Sure, {goodbye}!',                       'うん、じゃあね！',                  'goodbye', (SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), ARRAY['hello','name','goodbye','please']);
