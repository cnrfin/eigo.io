-- ============================================================================
-- Vocab 101: Lesson 28 (A2): "Sport & exercise"  (Unit 8, Free time)
-- ----------------------------------------------------------------------------
-- Words (all new): run, swim, team, win, lose, ball, gym, practice.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('sport', 'Sport and exercise', 'スポーツと運動', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('run', 'run', NULL, NULL, NULL, 2, FALSE, NULL),
  ('swim', 'swim', NULL, NULL, NULL, 2, FALSE, NULL),
  ('team', 'team', NULL, NULL, NULL, 2, FALSE, NULL),
  ('win', 'win', NULL, NULL, NULL, 2, FALSE, NULL),
  ('lose', 'lose', NULL, NULL, NULL, 2, FALSE, NULL),
  ('ball', 'ball', NULL, NULL, NULL, 2, FALSE, NULL),
  ('gym', 'gym', NULL, NULL, NULL, 2, FALSE, NULL),
  ('practice', 'practice', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='run'), 'run.v.move', 1, TRUE, 'verb', '走る', 'to move quickly on your feet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='swim'), 'swim.v.water', 1, TRUE, 'verb', '泳ぐ', 'to move through water with your body', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='team'), 'team.n.group', 1, TRUE, 'noun', 'チーム', 'a group who play or work together', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='win'), 'win.v.beat', 1, TRUE, 'verb', '勝つ', 'to come first in a game or contest', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lose'), 'lose.v.fail', 1, TRUE, 'verb', '負ける', 'to not win a game or contest', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ball'), 'ball.n.object', 1, TRUE, 'noun', 'ボール', 'a round object used in games', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gym'), 'gym.n.place', 1, TRUE, 'noun', 'ジム', 'a place with equipment for exercise', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='practice'), 'practice.v.train', 1, TRUE, 'verb', '練習する', 'to do something often to get better', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('run','swim','team','win','lose','ball','gym','practice')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='win.v.beat'), (SELECT id FROM vocab_senses WHERE slug='lose.v.fail'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='lose.v.fail'), (SELECT id FROM vocab_senses WHERE slug='win.v.beat'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='sport'
WHERE s.slug IN ('run.v.move','swim.v.water','team.n.group','win.v.beat','lose.v.fail','ball.n.object','gym.n.place','practice.v.train')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-28', 8, 3, (SELECT id FROM vocab_categories WHERE slug='sport'), 'Sport & exercise', 'スポーツと運動', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-28'), s.id, x.ord
FROM (VALUES
  ('run.v.move',0),('swim.v.water',1),('team.n.group',2),('win.v.beat',3),('lose.v.fail',4),('ball.n.object',5),('gym.n.place',6),('practice.v.train',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-28'), 'conversation', 0, 'The big game', '大事な試合', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-28'), 'travel', 1, 'Joining a gym', 'ジムに入る', 'gym', 'trainer'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-28'), 'business', 2, 'Company sports day', '社内スポーツ大会', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 0, 'npc', 'Did you watch the game last night?', '昨日の試合見た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 1, 'user', 'Yes! Our football {team} played so well.', 'うん！うちのサッカーチーム、すごくよかった。', 'team', (SELECT id FROM vocab_senses WHERE slug='team.n.group'), ARRAY['ball','team','group','gym']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 2, 'npc', 'Did they {win}? I saw them celebrating.', '勝った？喜んでるのを見たよ。', 'win', (SELECT id FROM vocab_senses WHERE slug='win.v.beat'), ARRAY['swim','run','win','lose']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 3, 'user', 'Almost. They {lose} by one point, so close to winning.', '惜しい。1点差で負けた、あと少しで勝てたのに。', 'lose', (SELECT id FROM vocab_senses WHERE slug='lose.v.fail'), ARRAY['win','run','swim','lose']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 4, 'npc', 'So close! Whose {ball} went out of play?', '惜しい！誰のボールが外に出た？', 'ball', (SELECT id FROM vocab_senses WHERE slug='ball.n.object'), ARRAY['ball','gym','team','net']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 5, 'user', 'Ours, at the end. Heartbreaking.', '最後はうちの。悔しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 6, 'npc', 'Next time!', '次があるさ！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 0, 'npc', 'Welcome! First time at this {gym}, with all the weights?', 'ようこそ！重りの揃ったこのジム、初めて？', 'gym', (SELECT id FROM vocab_senses WHERE slug='gym.n.place'), ARRAY['park','shop','gym','pool']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 1, 'user', 'Yes. I''d like to {swim} in the pool and lift weights.', 'はい。プールで泳いで、筋トレしたいです。', 'swim', (SELECT id FROM vocab_senses WHERE slug='swim.v.water'), ARRAY['swim','run','sleep','dance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 2, 'npc', 'Great. Do you like to {run} on the treadmill too?', 'いいね。ランニングマシンで走るのも好き？', 'run', (SELECT id FROM vocab_senses WHERE slug='run.v.move'), ARRAY['swim','sit','run','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 3, 'user', 'Sometimes. When can I {practice}?', '時々。いつ練習できますか？', 'practice', (SELECT id FROM vocab_senses WHERE slug='practice.v.train'), ARRAY['rest','practice','shop','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 4, 'npc', 'Anytime. Here''s your pass.', 'いつでも。パスをどうぞ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 5, 'user', 'Thank you so much.', 'ありがとうございます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 6, 'npc', 'See you around!', 'またね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 0, 'npc', 'Are you joining the company sports day?', '社内スポーツ大会に出る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 1, 'user', 'Sure! Which {team} am I on, red or blue?', 'うん！私はどのチーム？赤か青？', 'team', (SELECT id FROM vocab_senses WHERE slug='team.n.group'), ARRAY['ball','gym','team','group']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 2, 'npc', 'The blue one. Can you {run} fast, like a sprinter?', '青チーム。スプリンターみたいに速く走れる？', 'run', (SELECT id FROM vocab_senses WHERE slug='run.v.move'), ARRAY['sit','run','cook','swim']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 3, 'user', 'Fast enough to {win}, I hope!', '勝てるくらいには！', 'win', (SELECT id FROM vocab_senses WHERE slug='win.v.beat'), ARRAY['lose','run','swim','win']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 4, 'npc', 'Ha! Want to {practice} first?', 'はは！先に練習する？', 'practice', (SELECT id FROM vocab_senses WHERE slug='practice.v.train'), ARRAY['practice','rest','shop','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 5, 'user', 'Good idea. Saturday?', 'いいね。土曜？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 6, 'npc', 'Perfect.', '完璧。', NULL, NULL, NULL);
