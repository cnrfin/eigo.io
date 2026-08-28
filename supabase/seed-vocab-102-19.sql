-- ============================================================================
-- Vocab 102: vocab-102-19 - Wellbeing  (Unit 7)
-- Words: exercise, diet, healthy, energy, stress, relax, habit, lifestyle.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('wellbeing', 'Wellbeing', '健康と生活', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('exercise', 'exercise', '/ˈeksərsaɪz/', '/ˈeksəsaɪz/', NULL, 3, FALSE, NULL),
  ('diet', 'diet', '/ˈdaɪət/', '/ˈdaɪət/', NULL, 3, FALSE, NULL),
  ('healthy', 'healthy', '/ˈhelθi/', '/ˈhelθi/', NULL, 3, FALSE, NULL),
  ('energy', 'energy', '/ˈenərdʒi/', '/ˈenədʒi/', NULL, 3, FALSE, NULL),
  ('stress', 'stress', '/stres/', '/stres/', NULL, 3, FALSE, NULL),
  ('relax', 'relax', '/rɪˈlæks/', '/rɪˈlæks/', NULL, 3, FALSE, NULL),
  ('habit', 'habit', '/ˈhæbɪt/', '/ˈhæbɪt/', NULL, 3, FALSE, NULL),
  ('lifestyle', 'lifestyle', '/ˈlaɪfstaɪl/', '/ˈlaɪfstaɪl/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='exercise'), 'exercise.n.activity', 1, TRUE, 'noun', '運動', 'physical activity you do to stay fit', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='diet'), 'diet.n.food', 1, TRUE, 'noun', '食生活', 'the food that you usually eat', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='healthy'), 'healthy.adj.well', 1, TRUE, 'adjective', '健康的な', 'good for your health; not ill', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='energy'), 'energy.n.vigor', 1, TRUE, 'noun', '活力', 'the strength you need to be active', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stress'), 'stress.n.pressure', 1, TRUE, 'noun', 'ストレス', 'worry caused by a difficult situation', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='relax'), 'relax.v.rest', 1, TRUE, 'verb', 'くつろぐ', 'to rest and become calm', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='habit'), 'habit.n.routine', 1, TRUE, 'noun', '習慣', 'something you do regularly, often without thinking', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lifestyle'), 'lifestyle.n.way', 1, TRUE, 'noun', '生活習慣', 'the way in which you live', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('exercise', 'diet', 'healthy', 'energy', 'stress', 'relax', 'habit', 'lifestyle')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='wellbeing'
WHERE s.slug IN ('exercise.n.activity', 'diet.n.food', 'healthy.adj.well', 'energy.n.vigor', 'stress.n.pressure', 'relax.v.rest', 'habit.n.routine', 'lifestyle.n.way')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-19', 7, 0, (SELECT id FROM vocab_categories WHERE slug='wellbeing'), 'Wellbeing', '心と体の健康', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-19'), s.id, x.ord FROM (VALUES
  ('exercise.n.activity',0),('diet.n.food',1),('healthy.adj.well',2),('energy.n.vigor',3),('stress.n.pressure',4),('relax.v.rest',5),('habit.n.routine',6),('lifestyle.n.way',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-19'), 'conversation', 0, 'Getting healthier', '健康的になる', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-19'), 'travel', 1, 'A wellness retreat', 'ウェルネス施設', 'retreat', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-19'), 'business', 2, 'Workplace wellbeing', '職場の健康づくり', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 0, 'npc', 'You look great lately. What changed?', '最近元気そう。何が変わったの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 1, 'user', 'I added regular {exercise} to my week.', '毎週の習慣に運動を取り入れた。', 'exercise', (SELECT id FROM vocab_senses WHERE slug='exercise.n.activity'), ARRAY['exercise','diet','energy','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 2, 'npc', 'Nice. Eating differently too?', 'いいね。食事も変えた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 3, 'user', 'Yeah, my {diet} has way more vegetables now.', 'うん、食生活に野菜がずっと増えた。', 'diet', (SELECT id FROM vocab_senses WHERE slug='diet.n.food'), ARRAY['diet','energy','stress','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 4, 'npc', 'Do you feel different?', '体調は違う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 5, 'user', 'Definitely. I have so much more {energy}.', '全然違う。活力がずっと増えた。', 'energy', (SELECT id FROM vocab_senses WHERE slug='energy.n.vigor'), ARRAY['energy','stress','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 6, 'npc', 'Sleeping better?', 'よく眠れてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 7, 'user', 'Yes, and way less {stress} at work.', 'うん、仕事のストレスもかなり減った。', 'stress', (SELECT id FROM vocab_senses WHERE slug='stress.n.pressure'), ARRAY['stress','energy','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 8, 'npc', 'How did you start?', 'どうやって始めたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 9, 'user', 'I built one small {habit} at a time.', '小さな習慣を一つずつ作った。', 'habit', (SELECT id FROM vocab_senses WHERE slug='habit.n.routine'), ARRAY['habit','energy','diet','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 10, 'npc', 'That''s the secret.', 'それが秘訣だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 11, 'user', 'Now this {healthy} routine feels normal.', '今はこの健康的な習慣が普通に感じる。', 'healthy', (SELECT id FROM vocab_senses WHERE slug='healthy.adj.well'), ARRAY['healthy','energy','stress','diet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 12, 'npc', 'So inspiring!', '刺激になる！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 13, 'user', 'You can do it too.', '君にもできるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='conversation'), 14, 'npc', 'Teach me, {{user_name}}!', '教えて、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 0, 'npc', 'Welcome to the wellness retreat!', 'ウェルネス施設へようこそ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 1, 'user', 'Thank you. I really need to {relax}.', 'ありがとう。本当にくつろぎたいです。', 'relax', (SELECT id FROM vocab_senses WHERE slug='relax.v.rest'), ARRAY['relax','exercise','stress','energy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 2, 'npc', 'You''ve come to the right place.', '来て正解ですよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 3, 'user', 'Work has given me so much {stress}.', '仕事でストレスがすごく溜まってて。', 'stress', (SELECT id FROM vocab_senses WHERE slug='stress.n.pressure'), ARRAY['stress','energy','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 4, 'npc', 'We''ll help you unwind.', 'リラックスのお手伝いをします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 5, 'user', 'I want a calmer {lifestyle} overall.', '全体的に落ち着いた生活習慣にしたい。', 'lifestyle', (SELECT id FROM vocab_senses WHERE slug='lifestyle.n.way'), ARRAY['lifestyle','energy','diet','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 6, 'npc', 'We offer yoga and hikes.', 'ヨガやハイキングがあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 7, 'user', 'Great, I love gentle {exercise}.', 'いいですね、穏やかな運動が好きです。', 'exercise', (SELECT id FROM vocab_senses WHERE slug='exercise.n.activity'), ARRAY['exercise','energy','stress','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 8, 'npc', 'It boosts your mood.', '気分が上向きますよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 9, 'user', 'I hope to leave with more {energy}.', 'もっと活力を持って帰れたら。', 'energy', (SELECT id FROM vocab_senses WHERE slug='energy.n.vigor'), ARRAY['energy','stress','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 10, 'npc', 'And healthier eating too.', '食事も健康的に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 11, 'user', 'Yes, I want more {healthy} meals.', 'はい、健康的な食事を増やしたいです。', 'healthy', (SELECT id FROM vocab_senses WHERE slug='healthy.adj.well'), ARRAY['healthy','energy','stress','diet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 12, 'npc', 'Our chef will spoil you.', 'シェフが腕をふるいますよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 13, 'user', 'I can''t wait.', '楽しみです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='travel'), 14, 'npc', 'Relax and enjoy!', 'くつろいで楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 0, 'npc', 'HR wants ideas to reduce burnout.', '人事が燃え尽き対策のアイデアを求めてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 1, 'user', 'Good. People here have too much {stress}.', 'いいね。ここの人はストレスが多すぎる。', 'stress', (SELECT id FROM vocab_senses WHERE slug='stress.n.pressure'), ARRAY['stress','energy','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 2, 'npc', 'What would help?', '何が効く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 3, 'user', 'A quiet room where staff can {relax}.', 'スタッフがくつろげる静かな部屋。', 'relax', (SELECT id FROM vocab_senses WHERE slug='relax.v.rest'), ARRAY['relax','exercise','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 4, 'npc', 'I like that. Anything active?', 'いいね。体を動かすものは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 5, 'user', 'Maybe lunchtime {exercise} classes.', '昼休みの運動クラスとか。', 'exercise', (SELECT id FROM vocab_senses WHERE slug='exercise.n.activity'), ARRAY['exercise','energy','stress','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 6, 'npc', 'That could boost focus.', '集中力が上がりそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 7, 'user', 'Exactly, more {energy} in the afternoon.', 'そう、午後の活力が増す。', 'energy', (SELECT id FROM vocab_senses WHERE slug='energy.n.vigor'), ARRAY['energy','stress','diet','habit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 8, 'npc', 'Small changes, big effect.', '小さな変化で大きな効果。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 9, 'user', 'We can encourage one good {habit} a month.', '月に一つ良い習慣を勧められる。', 'habit', (SELECT id FROM vocab_senses WHERE slug='habit.n.routine'), ARRAY['habit','energy','diet','stress']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 10, 'npc', 'Like a step challenge?', '歩数チャレンジみたいな？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 11, 'user', 'Yes, to build a {healthy} team culture.', 'うん、健康的なチーム文化を作るために。', 'healthy', (SELECT id FROM vocab_senses WHERE slug='healthy.adj.well'), ARRAY['healthy','energy','stress','diet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 12, 'npc', 'Let''s pitch it to management.', '経営陣に提案しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 13, 'user', 'I''ll make slides.', 'スライドを作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-19') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);
