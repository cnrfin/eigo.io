-- ============================================================================
-- Vocab 101: Lesson 13 (new): "Not feeling well"  (Unit 10, Health and body)
-- ----------------------------------------------------------------------------
-- Words: sick, hurt, doctor, rest, better, help, medicine, fever. All new.
-- American spelling, no em-dashes. Parked (published=FALSE) until Unit 10 fills
-- out. Reuses (played only): tired, water, please, thanks, sorry.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('health', 'Not feeling well', '体調', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('sick',     'sick',     '/sɪk/',        '/sɪk/',        450, 1, FALSE, NULL),
  ('hurt',     'hurt',     '/hɜːrt/',      '/hɜːt/',       500, 1, FALSE, NULL),
  ('doctor',   'doctor',   '/ˈdɑːktər/',   '/ˈdɒktə/',     300, 1, FALSE, 'ドクター。/ˈdɑːktər/。'),
  ('rest',     'rest',     '/rest/',       '/rest/',       400, 1, FALSE, NULL),
  ('better',   'better',   '/ˈbetər/',     '/ˈbetə/',      200, 1, FALSE, NULL),
  ('help',     'help',     '/help/',       '/help/',       150, 1, FALSE, NULL),
  ('medicine', 'medicine', '/ˈmedɪsɪn/',   '/ˈmedsɪn/',    650, 2, FALSE, NULL),
  ('fever',    'fever',    '/ˈfiːvər/',    '/ˈfiːvə/',     800, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='sick'),     'sick.adj.ill',      1, TRUE, 'adjective', '具合が悪い', 'not well; ill', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hurt'),     'hurt.v.pain',       1, TRUE, 'verb',      '痛む',       'to feel pain in part of your body', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='doctor'),   'doctor.n.medic',    1, TRUE, 'noun',      '医者',       'a person whose job is to treat sick people', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='rest'),     'rest.v.relax',      1, TRUE, 'verb',      '休む',       'to stop activity so your body can recover', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='better'),   'better.adj.improved',1,TRUE, 'adjective', 'よくなった', 'less sick than before; improved', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='help'),     'help.v.assist',     1, TRUE, 'verb',      '助ける', 'to do something useful for someone', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='medicine'), 'medicine.n.drug',   1, TRUE, 'noun',      '薬',         'something you take to get better when sick', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fever'),    'fever.n.high',      1, TRUE, 'noun',      '熱',         'a high body temperature when you are ill', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('sick','hurt','doctor','rest','better','help','medicine','fever')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='sick.adj.ill'),  NULL, 'ill',    'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='help.v.assist'), NULL, 'assist', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='health'
WHERE s.slug IN ('sick.adj.ill','hurt.v.pain','doctor.n.medic','rest.v.relax','better.adj.improved','help.v.assist','medicine.n.drug','fever.n.high')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-13', 10, 1, (SELECT id FROM vocab_categories WHERE slug='health'), 'Not feeling well', '体調が悪い', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-13'), s.id, x.ord
FROM (VALUES
  ('sick.adj.ill',0),('hurt.v.pain',1),('doctor.n.medic',2),('rest.v.relax',3),
  ('better.adj.improved',4),('help.v.assist',5),('medicine.n.drug',6),('fever.n.high',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-13'), 'conversation', 0, 'A friend checks on you', '友達が心配する',   'home',     'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-13'), 'travel',       1, 'At the pharmacy',        '薬局で',           'pharmacy', 'pharmacist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-13'), 'business',     2, 'Calling in sick',        '欠勤の連絡',       'phone',    'boss');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 0, 'npc',  'You don''t look great. Are you okay?',   '元気なさそう。大丈夫？',             NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 1, 'user', 'Not really. I feel {sick}, like I might throw up.',             'あんまり。気持ち悪くて、吐きそう。',         'sick', (SELECT id FROM vocab_senses WHERE slug='sick.adj.ill'), ARRAY['happy','busy','free','sick']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 2, 'npc',  'Oh no. Where does it {hurt}?',           'あらら。どこが痛いの？',             'hurt', (SELECT id FROM vocab_senses WHERE slug='hurt.v.pain'), ARRAY['cook','rest','hurt','help']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 3, 'user', 'My head and throat. I need to {rest}.',  '頭とのど。休まないと。',             'rest', (SELECT id FROM vocab_senses WHERE slug='rest.v.relax'), ARRAY['run','study','rest','work']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 4, 'npc',  'Definitely. Lie down for a bit.',        'そうだね。少し横になって。',         NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 5, 'user', 'Thanks. I hope I feel {better}, not worse, tomorrow.','ありがとう。明日はよくなるといいな、悪化じゃなくて。','better', (SELECT id FROM vocab_senses WHERE slug='better.adj.improved'), ARRAY['better','worse','late','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 6, 'npc',  'Drink some water. Call me if you need anything.','お水を飲んで。何かあったら呼んでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 7, 'user', 'You''re the best, thank you.',            '本当にありがとう。',                 NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 0, 'npc',  'Hello, how can I help you?',             'こんにちは、どうされましたか？',     NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 1, 'user', 'Hi. I think I have a {fever}; I feel very hot.',           'こんにちは。熱があるみたいで、体がすごく熱い。',     'fever', (SELECT id FROM vocab_senses WHERE slug='fever.n.high'), ARRAY['map','fever','key','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 2, 'npc',  'I see. Do you feel {sick}, like nausea, in the morning?','なるほど。朝、吐き気のような気持ち悪さは？',   'sick', (SELECT id FROM vocab_senses WHERE slug='sick.adj.ill'), ARRAY['glad','free','sick','late']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 3, 'user', 'Yes, a little. What {medicine} should I take?','はい、少し。どの薬を飲めば？',       'medicine', (SELECT id FROM vocab_senses WHERE slug='medicine.n.drug'), ARRAY['water','coffee','medicine','bread']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 4, 'npc',  'This one. Take it twice a day.',         'これです。1日2回飲んでください。',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 5, 'user', 'Thank you. Can you {help} me read the label?','ありがとう。ラベルを読むのを手伝ってもらえますか？', 'help', (SELECT id FROM vocab_senses WHERE slug='help.v.assist'), ARRAY['cook','pay','drive','help']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 6, 'npc',  'Of course. Rest well and drink water.',  'もちろん。よく休んで水分を。',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 7, 'user', 'I will. Thanks a lot!',                  'そうします。どうもありがとう！',     NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 0, 'npc',  'Morning! Are you coming in today?',      'おはよう！今日は出社する？',         NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 1, 'user', 'Sorry, I''m too {sick} to work today.',              'すみません、体調が悪くて今日は働けません。',   'sick', (SELECT id FROM vocab_senses WHERE slug='sick.adj.ill'), ARRAY['sick','late','busy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 2, 'npc',  'Oh no. Have you seen a {doctor}?',       'あらら。医者には行った？',           'doctor', (SELECT id FROM vocab_senses WHERE slug='doctor.n.medic'), ARRAY['teacher','doctor','driver','guest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 3, 'user', 'Not yet. I just need to {rest}.',        'まだです。とにかく休みたくて。',     'rest', (SELECT id FROM vocab_senses WHERE slug='rest.v.relax'), ARRAY['work','run','drive','rest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 4, 'npc',  'Of course. Take the day off.',           'もちろん。今日は休んで。',           NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 5, 'user', 'Thank you. I''ll rest and feel {better} soon.',   'ありがとうございます。休んですぐよくなります。', 'better', (SELECT id FROM vocab_senses WHERE slug='better.adj.improved'), ARRAY['worse','tired','better','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 6, 'npc',  'Get well! We''ll manage here.',          'お大事に！こっちは大丈夫。',         NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 7, 'user', 'I appreciate it.',                       '助かります。',                       NULL, NULL, NULL);
