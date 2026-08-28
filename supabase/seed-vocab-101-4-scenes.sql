-- ============================================================================
-- Vocab 101 — Lesson 4 (Food & drink) scenes: travel / business / conversation.
-- Distractors are authored (sensible related words), so each blank has one
-- defensible answer from the line's context. See VOCAB-SCENES.md.
--
-- Re-runnable: clears this lesson's scenes then re-inserts.
-- Run AFTER add-vocab-scenes.sql and seed-vocab-101-a1.sql.
-- ============================================================================

DELETE FROM vocab_scenes WHERE lesson_id = (SELECT id FROM vocab_lessons WHERE slug='vocab-101-4');

INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-4'), 'travel',       0, 'At a restaurant',       'レストランで',     'restaurant', 'waiter'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-4'), 'business',     1, 'Lunch with a colleague','同僚とランチ',     'restaurant', 'colleague'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-4'), 'conversation', 2, 'A friend cooks for you','友達が作ってくれる','home',       'friend');

-- ── Travel: "At a restaurant" ──────────────────────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 0, 'npc',  'Hi! Welcome. Sit anywhere.',                'いらっしゃいませ！お好きな席へどうぞ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 1, 'user', 'Thanks! I''m so {hungry}. I skipped lunch.', 'ありがとう！お昼を抜いたからお腹ぺこぺこ。', 'hungry', (SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), ARRAY['hungry','bored','tired','thirsty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 2, 'npc',  'Here''s the menu, then.',                    'ではメニューをどうぞ。',              NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 3, 'user', 'Could I get some {water}? I''m really thirsty.', 'お水をもらえますか？のどがすごく渇いて。', 'water', (SELECT id FROM vocab_senses WHERE slug='water.n.liquid'), ARRAY['rice','coffee','water','bread']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 4, 'npc',  'Of course. Anything to eat?',                'もちろん。お食事は？',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 5, 'user', 'I''m starving. What''s good to {eat} here?',      'お腹ぺこぺこ。ここで何を食べるのがいい？', 'eat', (SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), ARRAY['order','drink','eat','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 6, 'npc',  'The ramen''s our best. And fresh from the oven…', 'ラーメンが一番人気です。それに焼きたての…', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 7, 'npc',  '…we''ve got warm {bread} too.',              '…温かいパンもありますよ。',          'bread', (SELECT id FROM vocab_senses WHERE slug='bread.n.food'), ARRAY['fruit','bread','cheese','rice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 8, 'user', 'Ramen and the bread, please.',               'ラーメンとパンをお願いします。',      NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 9, 'npc',  'Great. Here you go.',                        'かしこまりました。どうぞ。',          NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 10, 'user', 'Mmm, this is {delicious}, absolutely amazing!',                 'んー、最高においしい！',                    'delicious', (SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), ARRAY['awful','cold','delicious','salty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 11, 'npc',  'Glad you like it! Enjoy.',                  'お気に召してよかったです。ごゆっくり。', NULL, NULL, NULL);

-- ── Business: "Lunch with a colleague" ─────────────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 0, 'npc',  'Shall we grab lunch? I''m starving.',       'お昼行きませんか？お腹ぺこぺこで。',  NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 1, 'user', 'Me too. I''m {hungry}; I haven''t eaten all day.',                    '私も。お腹すいた、一日中何も食べてない。',              'hungry', (SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), ARRAY['hungry','thirsty','late','tired']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 2, 'npc',  'What kind of {food} do you feel like eating?', 'どんな食べ物の気分ですか？',        'food', (SELECT id FROM vocab_senses WHERE slug='food.n.edible'), ARRAY['weather','food','drink','music']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 3, 'user', 'Italian sounds good.',                       'イタリアンがいいですね。',            NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 4, 'npc',  'Perfect. After you.',                        'いいですね。お先にどうぞ。',          NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 5, 'npc',  'Something to {drink}? Water or juice?',      '飲み物は？お水かジュース。',          'drink', (SELECT id FROM vocab_senses WHERE slug='drink.v.consume'), ARRAY['read','wear','drink','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 6, 'user', 'Just water, thanks.',                        'お水で、ありがとう。',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 7, 'npc',  'Here''s the pasta.',                         'パスタが来ましたよ。',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 8, 'user', 'Let''s {eat}. I''m so hungry.',             '食べましょう、お腹ぺこぺこで。',      'eat', (SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), ARRAY['cook','pay','wait','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 9, 'user', 'Wow, this is {delicious}, the best I''ve had!',                  'わあ、これ最高においしい！',                'delicious', (SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), ARRAY['awful','cold','plain','delicious']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 10, 'npc',  'Glad you like it. Good to catch up.',       'よかった。話せてよかったです。',      NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 11, 'user', 'Definitely. Let''s do this again.',          '本当に。またやりましょう。',          NULL, NULL, NULL);

-- ── Conversation: "A friend cooks for you" ─────────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 0, 'npc',  'Come in! I''m making dinner.',            '入って！今ごはん作ってるとこ。',      NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 1, 'user', 'Smells amazing! I''m {hungry}!',         'いい匂い！お腹すいた！',              'hungry', (SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), ARRAY['hungry','tired','thirsty','sleepy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 2, 'npc',  'I love to {cook}. I made it all myself.', '料理するの大好きなんだ。全部自分で作ったよ。', 'cook', (SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'), ARRAY['paint','clean','cook','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 3, 'user', 'Wow, thanks! Can I help?',                'わあ、ありがとう！手伝おうか？',      NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 4, 'npc',  'Just sit. Want something to drink?',      '座ってて。飲み物いる？',              NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 5, 'user', 'Water''s fine, thanks.',                  'お水でいいよ、ありがとう。',          NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 6, 'npc',  'Try some {bread}. It''s still warm from the oven.', 'パン食べてみて、まだ温かいよ。',   'bread', (SELECT id FROM vocab_senses WHERE slug='bread.n.food'), ARRAY['bread','rice','salad','soup']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 7, 'user', 'Thanks! Let''s {eat}, I''m starving.',    'ありがとう！食べよう、ぺこぺこだよ。', 'eat', (SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), ARRAY['cook','leave','wait','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 8, 'npc',  'Dig in!',                                 'どうぞ召し上がれ！',                  NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 9, 'user', 'Mmm, this is {delicious}, so tasty!',               'んー、おいしくて、すごく美味しい！',                'delicious', (SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), ARRAY['burnt','delicious','plain','awful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 10, 'npc',  'Aw, thanks! Have as much as you want.',  'ありがとう！好きなだけ食べてね。',    NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 11, 'user', 'I definitely will.',                      '絶対そうする。',                      NULL, NULL, NULL);
