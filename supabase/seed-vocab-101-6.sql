-- ============================================================================
-- Vocab 101 — Lesson 6 (new): "Making plans"  (Unit 4)
-- ----------------------------------------------------------------------------
-- Words: when, time, free, busy, plan, meet (reused from L2), + tomorrow,
-- tonight (played — day/time adverbs are a paradigm, taught embedded).
-- Blanks: when, time, free, busy, plan, meet. American spelling, no em-dashes.
-- Options stored answer-first; player + editor shuffle them.
--
-- Re-runnable. Run AFTER add-vocab-101.sql, add-vocab-scenes.sql, and
-- seed-vocab-101-2.sql (which created meet.v.encounter, reused here).
-- ============================================================================

-- ── Theme ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('plans', 'Making plans', '予定を立てる', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('when',     'when',     '/wɛn/',        '/wen/',         50, 1, FALSE, NULL),
  ('time',     'time',     '/taɪm/',       '/taɪm/',        70, 1, FALSE, 'タイム。/taɪm/。'),
  ('free',     'free',     '/friː/',       '/friː/',       300, 1, FALSE, 'フリー。ここは「暇な・空いている」。'),
  ('busy',     'busy',     '/ˈbɪzi/',      '/ˈbɪzi/',      500, 1, FALSE, 'ビジー。/ˈbɪzi/。'),
  ('plan',     'plan',     '/plæn/',       '/plæn/',       350, 1, FALSE, 'プラン。動詞は「計画する」。'),
  ('tomorrow', 'tomorrow', '/təˈmɑːroʊ/',  '/təˈmɒrəʊ/',   600, 1, FALSE, NULL),
  ('tonight',  'tonight',  '/təˈnaɪt/',    '/təˈnaɪt/',    700, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='when'),     'when.adv.time',      1, TRUE, 'adverb',    'いつ',           'at what time', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='time'),     'time.n.clock',       1, TRUE, 'noun',      '時間',     'the hour of the day, shown on a clock', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='free'),     'free.adj.available', 1, TRUE, 'adjective', '暇な','not busy; able to do something', 'A1', '「無料」の意味もあるが、ここは「暇・空いている」。'),
  ((SELECT id FROM vocab_words WHERE normalized='busy'),     'busy.adj.occupied',  1, TRUE, 'adjective', '忙しい',         'having a lot to do', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plan'),     'plan.v.arrange',     1, TRUE, 'verb',      '計画する', 'to decide and arrange what you are going to do', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tomorrow'), 'tomorrow.adv.nextday',1, TRUE,'adverb',    '明日',           'on the day after today', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tonight'),  'tonight.adv.evening', 1, TRUE,'adverb',    '今夜',           'on the evening or night of today', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent) ─────────────────────────
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('when','time','free','busy','plan','tomorrow','tonight')));

-- ── Relations ───────────────────────────────────────────────────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='free.adj.available'), (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'),    NULL, 'arrange',      'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='tomorrow.adv.nextday'), NULL, 'today',     'confusable', 'today=今日、tomorrow=明日。'),
  ((SELECT id FROM vocab_senses WHERE slug='tonight.adv.evening'),  NULL, 'this evening','near_synonym', NULL);

-- ── Category membership (meet reused from L2) ──────────────────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='plans'
WHERE s.slug IN ('when.adv.time','time.n.clock','free.adj.available','busy.adj.occupied','plan.v.arrange','tomorrow.adv.nextday','tonight.adv.evening','meet.v.encounter')
ON CONFLICT DO NOTHING;

-- ── Lesson + items (meet.v.encounter reused → spiral) ──────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-6', 1, 6, (SELECT id FROM vocab_categories WHERE slug='plans'), 'Making plans', '予定を立てる', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-6'), s.id, x.ord
FROM (VALUES
  ('when.adv.time',0),('time.n.clock',1),('free.adj.available',2),('busy.adj.occupied',3),
  ('plan.v.arrange',4),('tomorrow.adv.nextday',6),('tonight.adv.evening',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

-- ── Scenes ──────────────────────────────────────────────────────────────────
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-6'), 'conversation', 0, 'Weekend plans with a friend', '友達と週末の予定', 'phone',  'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-6'), 'travel',       1, 'Planning a day trip',         '日帰り旅行の計画',  'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-6'), 'business',     2, 'Scheduling a meeting',        '打ち合わせの日程',  'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 0, 'npc', 'Hey, do you have plans this weekend?', 'ねえ、今週末って予定ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 1, 'user', 'Not really, I''m {free} all day. Why?', 'ううん、一日中暇。どうしたの？', 'free', (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), ARRAY['sick','tired','busy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 2, 'npc', 'Want to do something tomorrow?', '明日、何かしない？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 3, 'user', 'Sure! Let''s {plan} something fun.', 'いいね！何か楽しいこと計画しよう。', 'plan', (SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'), ARRAY['plan','cook','buy','clean']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 4, 'npc', 'Great. {When} works for you?', 'いいね。いつが都合いい？', 'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['Why','Where','When','Who']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 5, 'user', 'Afternoon? What {time}, like two o''clock, is good?', '午後？何時がいい？2時とか？', 'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['place','price','day','time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 6, 'npc', 'Two o''clock?', '2時は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 7, 'user', 'Perfect. Where should we meet?', '完璧。どこで会う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 8, 'npc', 'Let''s meet at the park entrance.', '公園の入り口で会おう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 9, 'user', 'Sounds good. I''m never too {busy} for you!', 'いいね。君のためならいつでも空けるよ！', 'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['busy','free','hungry','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 10, 'npc', 'Aw! See you tomorrow then.', 'うれしい！じゃあ明日ね。', NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 0, 'npc', 'Today was fun! Are you free tonight?', '今日は楽しかった！今夜は空いてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 1, 'user', 'Ah, I''m a bit {busy} tonight. Tomorrow?', 'あー、今夜はちょっと忙しくて。明日は？', 'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['lost','full','free','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 2, 'npc', 'Tomorrow works! What do you want to do?', '明日いいよ！何したい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 3, 'user', 'Let''s {plan} and organize a day trip somewhere.', '日帰り旅行を計画して段取りしよう。', 'plan', (SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'), ARRAY['plan','pack','book','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 4, 'npc', 'Nice! {When} should we start?', 'いいね！いつ出発する？', 'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['How','Who','Where','When']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 5, 'user', 'Early? What {time} is the first bus?', '早めに？始発バスは何時？', 'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['name','size','time','price']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 6, 'npc', 'Around eight, I think.', '8時くらいかな。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 7, 'user', 'Let''s meet at the hostel lobby.', 'ホステルのロビーで会おう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 8, 'npc', 'Perfect. Are you {free}, with nothing planned, the day after too?', '完璧。翌日も予定なく空いてる？', 'free', (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), ARRAY['wet','sad','free','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 9, 'user', 'Yeah, I''m free all week!', 'うん、今週はずっと空いてるよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 10, 'npc', 'Amazing. See you tomorrow morning!', '最高。じゃあ明日の朝ね！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 0, 'npc', 'Could we schedule a quick call this week?', '今週、短い打ち合わせを設定できますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 1, 'user', 'Sure. I''m {free}, with no meetings, tomorrow afternoon.', 'はい。明日の午後は会議もなく空いてます。', 'free', (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), ARRAY['free','late','out','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 2, 'npc', 'Ah, I''m {busy} then. How about Friday?', 'あー、その時は忙しくて。金曜はどうですか？', 'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['early','ready','busy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 3, 'user', 'Friday works.', '金曜で大丈夫です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 4, 'npc', 'Great. {When} suits you, morning or afternoon?', 'では、いつがいいですか、午前か午後？', 'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['Who','When','Why','Where']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 5, 'user', 'Morning. Is ten a good {time}?', '午前で。10時でいいですか？', 'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['size','time','price','place']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 6, 'npc', 'Ten is perfect.', '10時で完璧です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 7, 'user', 'Shall we meet in room B?', 'B会議室で会いましょうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 8, 'npc', 'Yes. I''ll {plan} the agenda and send it over.', 'はい。議題を計画して送りますね。', 'plan', (SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'), ARRAY['drive','cook','paint','plan']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 9, 'user', 'Thanks, see you Friday.', 'ありがとうございます、金曜に。', NULL, NULL, NULL);
