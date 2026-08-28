-- ============================================================================
-- Vocab 101: Lesson 19 (A2): "Transport"  (Unit 3, Home and town)
-- ----------------------------------------------------------------------------
-- Words (all new): bus, train, ticket, stop, catch, ride, platform, seat.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('transport', 'Transport', '交通', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('bus', 'bus', NULL, NULL, NULL, 2, FALSE, NULL),
  ('train', 'train', NULL, NULL, NULL, 2, FALSE, NULL),
  ('ticket', 'ticket', NULL, NULL, NULL, 2, FALSE, NULL),
  ('stop', 'stop', NULL, NULL, NULL, 2, FALSE, NULL),
  ('catch', 'catch', NULL, NULL, NULL, 2, FALSE, NULL),
  ('ride', 'ride', NULL, NULL, NULL, 2, FALSE, NULL),
  ('platform', 'platform', NULL, NULL, NULL, 2, FALSE, NULL),
  ('seat', 'seat', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='bus'), 'bus.n.vehicle', 1, TRUE, 'noun', 'バス', 'a large road vehicle that carries many people', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='train'), 'train.n.rail', 1, TRUE, 'noun', '電車', 'a line of vehicles that runs on rails', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ticket'), 'ticket.n.pass', 1, TRUE, 'noun', '切符', 'a paper that lets you travel or enter', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stop'), 'stop.n.place', 1, TRUE, 'noun', '停留所', 'a place where a bus or train stops', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='catch'), 'catch.v.board', 1, TRUE, 'verb', '間に合う', 'to get on a bus or train in time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ride'), 'ride.n.trip', 1, TRUE, 'noun', '乗ること', 'a trip in a vehicle', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='platform'), 'platform.n.rail', 1, TRUE, 'noun', 'ホーム', 'the place where you get on a train', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='seat'), 'seat.n.place', 1, TRUE, 'noun', '席', 'a place to sit', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('bus','train','ticket','stop','catch','ride','platform','seat')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='transport'
WHERE s.slug IN ('bus.n.vehicle','train.n.rail','ticket.n.pass','stop.n.place','catch.v.board','ride.n.trip','platform.n.rail','seat.n.place')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-19', 3, 5, (SELECT id FROM vocab_categories WHERE slug='transport'), 'Transport', '交通', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-19'), s.id, x.ord
FROM (VALUES
  ('bus.n.vehicle',0),('train.n.rail',1),('ticket.n.pass',2),('stop.n.place',3),('catch.v.board',4),('ride.n.trip',5),('platform.n.rail',6),('seat.n.place',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-19'), 'travel', 0, 'Buying a ticket', '切符を買う', 'station', 'staff'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-19'), 'conversation', 1, 'Almost missed it', '危なかった', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-19'), 'business', 2, 'Commuting', '通勤', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 0, 'npc', 'Hello! Where are you traveling today?', 'こんにちは！今日はどちらまで？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 1, 'user', 'To the coast. One {ticket}, please.', '海岸まで。切符を一枚ください。', 'ticket', (SELECT id FROM vocab_senses WHERE slug='ticket.n.pass'), ARRAY['ticket','key','map','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 2, 'npc', 'Sure. The {train} leaves at ten.', 'かしこまりました。電車は10時発です。', 'train', (SELECT id FROM vocab_senses WHERE slug='train.n.rail'), ARRAY['ride','bus','stop','train']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 3, 'user', 'Which {platform} is it?', '何番ホームですか？', 'platform', (SELECT id FROM vocab_senses WHERE slug='platform.n.rail'), ARRAY['platform','corner','gate','street']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 4, 'npc', 'Platform three. Window {seat} okay?', '3番ホームです。窓側の席でいい？', 'seat', (SELECT id FROM vocab_senses WHERE slug='seat.n.place'), ARRAY['ticket','seat','room','floor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 5, 'user', 'Perfect, thank you!', '完璧、ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 6, 'npc', 'Safe travels!', 'よい旅を！', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 0, 'npc', 'You made it! I thought you''d be late.', '間に合ったね！遅れるかと思った。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 1, 'user', 'I almost missed the {bus}!', 'もう少しでバスに乗り遅れるとこだった！', 'bus', (SELECT id FROM vocab_senses WHERE slug='bus.n.vehicle'), ARRAY['train','bus','seat','ticket']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 2, 'npc', 'Oh no. Did you run for it?', 'えっ。走ったの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 3, 'user', 'Yes, I just managed to {catch} it.', 'うん、なんとか乗れた。', 'catch', (SELECT id FROM vocab_senses WHERE slug='catch.v.board'), ARRAY['ride','miss','catch','stop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 4, 'npc', 'Where''s your {stop}?', 'どの停留所？', 'stop', (SELECT id FROM vocab_senses WHERE slug='stop.n.place'), ARRAY['seat','gate','corner','stop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 5, 'user', 'Right here. Short {ride} today.', 'ここだよ。今日は短い移動。', 'ride', (SELECT id FROM vocab_senses WHERE slug='ride.n.trip'), ARRAY['trip','ride','seat','walk']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 6, 'npc', 'Lucky you!', '運がいいね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 0, 'npc', 'How''s your commute?', '通勤はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 1, 'user', 'Long. I take the {train} every day.', '長い。毎日電車。', 'train', (SELECT id FROM vocab_senses WHERE slug='train.n.rail'), ARRAY['train','bus','seat','ride']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 2, 'npc', 'Do you get a seat?', '座れる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 3, 'user', 'Only if I {catch} the early one.', '早いのに乗れたときだけ。', 'catch', (SELECT id FROM vocab_senses WHERE slug='catch.v.board'), ARRAY['ride','miss','stop','catch']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 4, 'npc', 'Ah, the {seat} race!', 'ああ、席取り合戦ね！', 'seat', (SELECT id FROM vocab_senses WHERE slug='seat.n.place'), ARRAY['seat','ticket','room','stop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 5, 'user', 'Exactly. A long {ride} standing is rough.', 'そう。立ちっぱなしの長い移動はきつい。', 'ride', (SELECT id FROM vocab_senses WHERE slug='ride.n.trip'), ARRAY['ride','trip','seat','walk']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 6, 'npc', 'Work from home Fridays?', '金曜は在宅にすれば？', NULL, NULL, NULL);
