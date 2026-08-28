-- ============================================================================
-- Vocab 101: Lesson 27 (A2): "Going out"  (Unit 8, Free time)
-- ----------------------------------------------------------------------------
-- Words (all new): film, party, dance, fun, concert, invite, join, enjoy.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('going-out', 'Going out', 'お出かけ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('film', 'film', NULL, NULL, NULL, 2, FALSE, NULL),
  ('party', 'party', NULL, NULL, NULL, 2, FALSE, NULL),
  ('dance', 'dance', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fun', 'fun', NULL, NULL, NULL, 2, FALSE, NULL),
  ('concert', 'concert', NULL, NULL, NULL, 2, FALSE, NULL),
  ('invite', 'invite', NULL, NULL, NULL, 2, FALSE, NULL),
  ('join', 'join', NULL, NULL, NULL, 2, FALSE, NULL),
  ('enjoy', 'enjoy', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='film'), 'film.n.movie', 1, TRUE, 'noun', '映画', 'a story shown in moving pictures', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='party'), 'party.n.event', 1, TRUE, 'noun', 'パーティー', 'a social event with food and fun', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dance'), 'dance.v.move', 1, TRUE, 'verb', '踊る', 'to move your body to music', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fun'), 'fun.n.enjoy', 1, TRUE, 'noun', '楽しみ', 'enjoyment or a good time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='concert'), 'concert.n.music', 1, TRUE, 'noun', 'コンサート', 'a live music performance', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='invite'), 'invite.v.ask', 1, TRUE, 'verb', '招待する', 'to ask someone to come to an event', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='join'), 'join.v.take', 1, TRUE, 'verb', '参加する', 'to take part in something with others', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='enjoy'), 'enjoy.v.like', 1, TRUE, 'verb', '楽しむ', 'to get pleasure from something', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('film','party','dance','fun','concert','invite','join','enjoy')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='going-out'
WHERE s.slug IN ('film.n.movie','party.n.event','dance.v.move','fun.n.enjoy','concert.n.music','invite.v.ask','join.v.take','enjoy.v.like')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-27', 8, 2, (SELECT id FROM vocab_categories WHERE slug='going-out'), 'Going out', '遊びに出かける', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-27'), s.id, x.ord
FROM (VALUES
  ('film.n.movie',0),('party.n.event',1),('dance.v.move',2),('fun.n.enjoy',3),('concert.n.music',4),('invite.v.ask',5),('join.v.take',6),('enjoy.v.like',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-27'), 'conversation', 0, 'Weekend plans', '週末の予定', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-27'), 'travel', 1, 'A night out', '夜遊び', 'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-27'), 'business', 2, 'Team social', 'チームの親睦会', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 0, 'npc', 'Any plans this weekend?', '今週末、予定ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 1, 'user', 'Maybe a {film} at the cinema on Friday.', '金曜に映画館で映画かな。', 'film', (SELECT id FROM vocab_senses WHERE slug='film.n.movie'), ARRAY['film','book','party','concert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 2, 'npc', 'Nice. There''s also a birthday {party} Saturday.', 'いいね。土曜に誕生日パーティーもあるよ。', 'party', (SELECT id FROM vocab_senses WHERE slug='party.n.event'), ARRAY['concert','party','film','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 3, 'user', 'Oh? Can you {invite} me?', 'え？私も誘ってくれる？', 'invite', (SELECT id FROM vocab_senses WHERE slug='invite.v.ask'), ARRAY['forget','leave','join','invite']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 4, 'npc', 'Of course! It''ll be so much {fun}, we''ll laugh all night.', 'もちろん！すごく楽しくて、一晩中笑うよ。', 'fun', (SELECT id FROM vocab_senses WHERE slug='fun.n.enjoy'), ARRAY['rest','work','noise','fun']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 5, 'user', 'Can''t wait!', '楽しみ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 6, 'npc', 'Me neither.', '私も。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 0, 'npc', 'We''re going out tonight. Interested?', '今夜出かけるんだ。興味ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 1, 'user', 'Yes! Is there a {concert} with a live band?', 'うん！生バンドのコンサートある？', 'concert', (SELECT id FROM vocab_senses WHERE slug='concert.n.music'), ARRAY['party','film','concert','museum']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 2, 'npc', 'There is. And a place to {dance} to the music after.', 'あるよ。そのあと音楽に合わせて踊れる場所も。', 'dance', (SELECT id FROM vocab_senses WHERE slug='dance.v.move'), ARRAY['cook','drive','dance','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 3, 'user', 'Perfect. Can I {join} you?', '完璧。一緒に行っていい？', 'join', (SELECT id FROM vocab_senses WHERE slug='join.v.take'), ARRAY['leave','forget','argue','join']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 4, 'npc', 'Please do! You''ll {enjoy} it.', 'ぜひ！楽しめるよ。', 'enjoy', (SELECT id FROM vocab_senses WHERE slug='enjoy.v.like'), ARRAY['hate','enjoy','miss','lose']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 5, 'user', 'Let me grab my jacket.', 'ジャケット取ってくる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 6, 'npc', 'Hurry, it starts soon!', '急いで、もうすぐ始まる！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 0, 'npc', 'We''re planning a team night out.', 'チームで飲み会を計画してるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 1, 'user', 'Fun! Who did you {invite}?', '楽しそう！誰を誘ったの？', 'invite', (SELECT id FROM vocab_senses WHERE slug='invite.v.ask'), ARRAY['invite','leave','join','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 2, 'npc', 'Everyone. Will you {join}?', '全員。参加する？', 'join', (SELECT id FROM vocab_senses WHERE slug='join.v.take'), ARRAY['join','leave','argue','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 3, 'user', 'Definitely. Is it a {party} with music and food?', 'もちろん。音楽と食べ物のあるパーティー？', 'party', (SELECT id FROM vocab_senses WHERE slug='party.n.event'), ARRAY['film','party','meeting','concert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 4, 'npc', 'Yes! I hope you {enjoy} it.', 'うん！楽しんでね。', 'enjoy', (SELECT id FROM vocab_senses WHERE slug='enjoy.v.like'), ARRAY['hate','miss','lose','enjoy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 5, 'user', 'I''m sure I will.', 'きっと楽しむよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 6, 'npc', 'Great, see you there.', 'じゃあ、現地で。', NULL, NULL, NULL);
