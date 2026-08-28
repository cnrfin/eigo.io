-- ============================================================================
-- Vocab 101 — Lesson 7 (new): "Daily routine"  (Unit 4)
-- ----------------------------------------------------------------------------
-- Words: wake, sleep, work (reused from L2), start, finish, early, late, shower.
-- American spelling, no em-dashes. Options answer-first (player/editor shuffle).
--
-- Re-runnable. Run AFTER add-vocab-101.sql, add-vocab-scenes.sql, and
-- seed-vocab-101-2.sql (work.v.job reused here).
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('routine', 'Daily routine', '毎日の習慣', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('wake',   'wake',   '/weɪk/',    '/weɪk/',    500, 1, FALSE, NULL),
  ('sleep',  'sleep',  '/sliːp/',   '/sliːp/',   400, 1, FALSE, NULL),
  ('start',  'start',  '/stɑːrt/',  '/stɑːt/',   150, 1, FALSE, 'スタート。/stɑːrt/。'),
  ('finish', 'finish', '/ˈfɪnɪʃ/',  '/ˈfɪnɪʃ/',  350, 1, FALSE, NULL),
  ('early',  'early',  '/ˈɜːrli/',  '/ˈɜːli/',   300, 1, FALSE, NULL),
  ('late',   'late',   '/leɪt/',    '/leɪt/',    250, 1, FALSE, NULL),
  ('shower', 'shower', '/ˈʃaʊər/',  '/ˈʃaʊə/',   700, 2, FALSE, 'シャワー。/ˈʃaʊər/。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='wake'),   'wake.v.rise',    1, TRUE, 'verb',      '起きる',           'to stop sleeping', 'A1', 'ふつう wake up の形で使う。'),
  ((SELECT id FROM vocab_words WHERE normalized='sleep'),  'sleep.v.rest',   1, TRUE, 'verb',      '寝る',       'to rest with your eyes closed, not awake', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='start'),  'start.v.begin',  1, TRUE, 'verb',      '始める',   'to begin doing something', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='finish'), 'finish.v.end',   1, TRUE, 'verb',      '終える',   'to complete something and stop', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='early'),  'early.adv.time', 1, TRUE, 'adverb',    '早く',             'before the usual or expected time', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='late'),   'late.adv.time',  1, TRUE, 'adverb',    '遅く',             'after the usual or expected time', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shower'), 'shower.v.wash',  1, TRUE, 'verb',      'シャワーを浴びる', 'to wash your body under a shower', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('wake','sleep','start','finish','early','late','shower')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='start.v.begin'),  (SELECT id FROM vocab_senses WHERE slug='finish.v.end'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='finish.v.end'),   (SELECT id FROM vocab_senses WHERE slug='start.v.begin'),  NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='early.adv.time'), (SELECT id FROM vocab_senses WHERE slug='late.adv.time'),  NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='late.adv.time'),  (SELECT id FROM vocab_senses WHERE slug='early.adv.time'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='wake.v.rise'),    (SELECT id FROM vocab_senses WHERE slug='sleep.v.rest'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='start.v.begin'),  NULL, 'begin', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='routine'
WHERE s.slug IN ('wake.v.rise','sleep.v.rest','work.v.job','start.v.begin','finish.v.end','early.adv.time','late.adv.time','shower.v.wash')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-7', 1, 7, (SELECT id FROM vocab_categories WHERE slug='routine'), 'Daily routine', '毎日の習慣', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-7'), s.id, x.ord
FROM (VALUES
  ('wake.v.rise',0),('sleep.v.rest',1),('start.v.begin',3),
  ('finish.v.end',4),('early.adv.time',5),('late.adv.time',6),('shower.v.wash',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-7'), 'conversation', 0, 'Talking about your morning', '朝のことを話す',   'cafe',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-7'), 'travel',       1, 'A homestay host asks',       'ホストの質問',     'home',   'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-7'), 'business',     2, 'Talking about work hours',   '勤務時間の話',     'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 0, 'npc', 'You look tired! Rough morning?', '疲れてるね！朝から大変だった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 1, 'user', 'Yeah, I {wake} up at five and can''t sleep again.', 'うん、5時に起きて、もう眠れないんだ。', 'wake', (SELECT id FROM vocab_senses WHERE slug='wake.v.rise'), ARRAY['wake','sleep','sit','stay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 2, 'npc', 'Five?! That is so early.', '5時？！めちゃ早いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 3, 'user', 'I know. I {shower} to wake up, then grab coffee.', 'だよね。目を覚ますためにシャワーを浴びて、それからコーヒー。', 'shower', (SELECT id FROM vocab_senses WHERE slug='shower.v.wash'), ARRAY['shower','sleep','drive','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 4, 'npc', 'When do you start work?', '仕事はいつ始まるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 5, 'user', 'I {start} at seven and finish late.', '7時に始めて、遅くまで。', 'start', (SELECT id FROM vocab_senses WHERE slug='start.v.begin'), ARRAY['leave','start','close','stop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 6, 'npc', 'Wow. What time do you {finish} and clock off?', 'わあ。何時に終わって退勤するの？', 'finish', (SELECT id FROM vocab_senses WHERE slug='finish.v.end'), ARRAY['finish','cook','wake','clean']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 7, 'user', 'Around eight. So I sleep in {late} on weekends!', '8時くらい。だから週末は遅くまで寝る！', 'late', (SELECT id FROM vocab_senses WHERE slug='late.adv.time'), ARRAY['early','late','loud','fast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 8, 'npc', 'Ha, you deserve it!', 'はは、その価値あるよ！', NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 0, 'npc', 'Welcome! What time do you usually wake up?', 'ようこそ！普段は何時に起きますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 1, 'user', 'I get up quite {early}, around six.', 'けっこう早く起きます、6時ごろ。', 'early', (SELECT id FROM vocab_senses WHERE slug='early.adv.time'), ARRAY['late','early','quiet','slow']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 2, 'npc', 'Great. Did you sleep okay?', 'いいですね。よく眠れましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 3, 'user', 'Yes! I {sleep} about seven hours each night.', 'はい！毎晩7時間くらい寝ます。', 'sleep', (SELECT id FROM vocab_senses WHERE slug='sleep.v.rest'), ARRAY['sleep','walk','work','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 4, 'npc', 'Good. What are your plans today?', 'よかった。今日の予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 5, 'user', 'A morning tour that''s supposed to {start} at nine.', '9時に始まる予定の朝のツアーです。', 'start', (SELECT id FROM vocab_senses WHERE slug='start.v.begin'), ARRAY['close','finish','end','start']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 6, 'npc', 'Nine? You should leave soon then.', '9時？じゃあそろそろ出た方がいいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 7, 'user', 'Right, I don''t want to be {late} and miss it.', 'ですね、遅れて乗り遅れたくないので。', 'late', (SELECT id FROM vocab_senses WHERE slug='late.adv.time'), ARRAY['early','sick','late','lost']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 8, 'npc', 'Do you need anything before you go?', '出かける前に何か要りますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 9, 'user', 'Just a quick {shower} to freshen up, then I''m off.', 'さっとシャワーを浴びてさっぱりしたら出ます。', 'shower', (SELECT id FROM vocab_senses WHERE slug='shower.v.wash'), ARRAY['meal','shower','nap','break']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 10, 'npc', 'Of course. Have a great day!', 'もちろん。良い一日を！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 0, 'npc', 'You are always here early. What time do you get in?', 'いつも早いですね。何時に来るんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 1, 'user', 'I usually {start} work around eight, and finish later.', 'たいてい8時ごろ仕事を始めて、あとで終わる。', 'start', (SELECT id FROM vocab_senses WHERE slug='start.v.begin'), ARRAY['finish','start','leave','close']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 2, 'npc', 'Eight? I do not get here until nine.', '8時？私は9時まで来ませんよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 3, 'user', 'I start early so I can {finish} and go home by five.', '早く始めれば5時までに終わって帰れる。', 'finish', (SELECT id FROM vocab_senses WHERE slug='finish.v.end'), ARRAY['finish','start','cook','wake']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 4, 'npc', 'Makes sense. Do you work late often?', 'なるほど。よく遅くまで働くんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 5, 'user', 'Only sometimes. I try not to stay {late} after the office closes.', 'たまにだけ。閉店後まで遅くまで残らないようにしてる。', 'late', (SELECT id FROM vocab_senses WHERE slug='late.adv.time'), ARRAY['home','out','late','early']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 6, 'npc', 'Good balance. Do you sleep enough?', 'いいバランスですね。睡眠は足りてます？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 7, 'user', 'Ha, I {sleep} maybe six hours a night.', 'はは、一晩に6時間くらいしか寝てない。', 'sleep', (SELECT id FROM vocab_senses WHERE slug='sleep.v.rest'), ARRAY['rest','eat','work','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 8, 'npc', 'You need more! Take it easy.', 'もっと必要ですよ！無理しないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 9, 'user', 'I hope to work less next month.', '来月はもっと働く時間を減らしたいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 10, 'npc', 'That is the spirit!', 'その意気です！', NULL, NULL, NULL);
