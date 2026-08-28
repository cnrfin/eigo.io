-- ============================================================================
-- Vocab 101: Lesson 16 (A2): "Your life & routine"  (Unit 1, People and introductions)
-- ----------------------------------------------------------------------------
-- Words (all new): usually, always, sometimes, never, often, weekend, morning, evening.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('life-routine', 'Your life and routine', '生活と習慣', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('usually', 'usually', NULL, NULL, NULL, 2, FALSE, NULL),
  ('always', 'always', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sometimes', 'sometimes', NULL, NULL, NULL, 2, FALSE, NULL),
  ('never', 'never', NULL, NULL, NULL, 2, FALSE, NULL),
  ('often', 'often', NULL, NULL, NULL, 2, FALSE, NULL),
  ('weekend', 'weekend', NULL, NULL, NULL, 2, FALSE, NULL),
  ('morning', 'morning', NULL, NULL, NULL, 2, FALSE, NULL),
  ('evening', 'evening', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='usually'), 'usually.adv.freq', 1, TRUE, 'adverb', 'たいてい', 'most of the time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='always'), 'always.adv.freq', 1, TRUE, 'adverb', 'いつも', 'every time; all the time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sometimes'), 'sometimes.adv.freq', 1, TRUE, 'adverb', '時々', 'on some occasions but not often', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='never'), 'never.adv.freq', 1, TRUE, 'adverb', '決して…ない', 'not at any time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='often'), 'often.adv.freq', 1, TRUE, 'adverb', 'よく', 'many times; frequently', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='weekend'), 'weekend.n.time', 1, TRUE, 'noun', '週末', 'Saturday and Sunday', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='morning'), 'morning.n.time', 1, TRUE, 'noun', '朝', 'the early part of the day', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='evening'), 'evening.n.time', 1, TRUE, 'noun', '夕方', 'the end of the day, before night', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('usually','always','sometimes','never','often','weekend','morning','evening')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='always.adv.freq'), (SELECT id FROM vocab_senses WHERE slug='never.adv.freq'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='never.adv.freq'), (SELECT id FROM vocab_senses WHERE slug='always.adv.freq'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='life-routine'
WHERE s.slug IN ('usually.adv.freq','always.adv.freq','sometimes.adv.freq','never.adv.freq','often.adv.freq','weekend.n.time','morning.n.time','evening.n.time')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-16', 1, 5, (SELECT id FROM vocab_categories WHERE slug='life-routine'), 'Your life & routine', '生活と習慣', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-16'), s.id, x.ord
FROM (VALUES
  ('usually.adv.freq',0),('always.adv.freq',1),('sometimes.adv.freq',2),('never.adv.freq',3),('often.adv.freq',4),('weekend.n.time',5),('morning.n.time',6),('evening.n.time',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-16'), 'conversation', 0, 'What do you do?', '何してるの？', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-16'), 'travel', 1, 'Your daily plans', '一日の予定', 'guesthouse', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-16'), 'business', 2, 'Work habits', '仕事の習慣', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 0, 'npc', 'What do you do in your free time?', '暇なときは何してるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 1, 'user', 'I {usually} read or walk, most evenings.', 'たいてい、ほとんどの晩は本を読むか散歩する。', 'usually', (SELECT id FROM vocab_senses WHERE slug='usually.adv.freq'), ARRAY['soon','late','never','usually']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 2, 'npc', 'Nice. Do you exercise?', 'いいね。運動する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 3, 'user', 'I {always} run on Mondays, without fail.', '月曜は必ず走る。', 'always', (SELECT id FROM vocab_senses WHERE slug='always.adv.freq'), ARRAY['never','soon','late','always']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 4, 'npc', 'Wow. And on the weekend?', 'すごい。週末は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 5, 'user', 'On the {weekend} I relax at home.', '週末は家でのんびりする。', 'weekend', (SELECT id FROM vocab_senses WHERE slug='weekend.n.time'), ARRAY['night','morning','weekend','evening']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 6, 'npc', 'That sounds lovely.', 'いいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 7, 'user', 'Yeah, and I {sometimes} cook a big meal, maybe once a week.', 'うん、時々、週1回くらいごちそうを作る。', 'sometimes', (SELECT id FROM vocab_senses WHERE slug='sometimes.adv.freq'), ARRAY['never','always','early','sometimes']);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 0, 'npc', 'What are your plans while you stay here?', '滞在中の予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 1, 'user', 'In the {morning}, right after breakfast, I''d like to explore.', '朝、朝食のあとに散策したいです。', 'morning', (SELECT id FROM vocab_senses WHERE slug='morning.n.time'), ARRAY['weekend','evening','morning','night']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 2, 'npc', 'Good idea. And later?', 'いいですね。その後は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 3, 'user', 'In the {evening}, before bed, I usually rest.', '夕方、寝る前にたいてい休みます。', 'evening', (SELECT id FROM vocab_senses WHERE slug='evening.n.time'), ARRAY['morning','evening','noon','night']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 4, 'npc', 'Do you go out much?', 'よく出かけますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 5, 'user', 'I {often} try local food, almost every day.', 'よく、ほぼ毎日地元の料理を試します。', 'often', (SELECT id FROM vocab_senses WHERE slug='often.adv.freq'), ARRAY['never','often','late','soon']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 6, 'npc', 'You''ll love it here then.', 'ならここが気に入りますよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 7, 'user', 'I {usually} do, most of the time! Thank you.', 'たいていはそうです！ありがとう。', 'usually', (SELECT id FROM vocab_senses WHERE slug='usually.adv.freq'), ARRAY['soon','usually','late','never']);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 0, 'npc', 'You''re so organized!', '本当にきちんとしてるね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 1, 'user', 'Thanks. I {always} plan my week, every single Sunday.', 'ありがとう。毎週日曜、必ず一週間を計画するの。', 'always', (SELECT id FROM vocab_senses WHERE slug='always.adv.freq'), ARRAY['never','late','rarely','always']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 2, 'npc', 'Do you ever work weekends?', '週末に働くことある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 3, 'user', 'No, I {never} work on Sundays.', 'いや、日曜は絶対働かない。', 'never', (SELECT id FROM vocab_senses WHERE slug='never.adv.freq'), ARRAY['soon','never','always','often']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 4, 'npc', 'Smart. Meetings?', '賢いね。会議は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 5, 'user', 'I {often} have them in the morning, several times a week.', 'よく、週に何度か午前中にあるよ。', 'often', (SELECT id FROM vocab_senses WHERE slug='often.adv.freq'), ARRAY['soon','never','often','rarely']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 6, 'npc', 'And you still relax on the {weekend}?', 'それでも週末は休むの？', 'weekend', (SELECT id FROM vocab_senses WHERE slug='weekend.n.time'), ARRAY['evening','weekend','morning','night']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 7, 'user', 'Always! Balance matters.', 'いつもね！バランスが大事。', NULL, NULL, NULL);
