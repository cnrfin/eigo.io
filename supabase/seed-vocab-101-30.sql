-- ============================================================================
-- Vocab 101: Lesson 30 (A2): "Sightseeing"  (Unit 9, Travel and holidays)
-- ----------------------------------------------------------------------------
-- Words (all new): visit, map, photo, tour, famous, view, souvenir, castle.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('sightseeing', 'Sightseeing', '観光', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('visit', 'visit', NULL, NULL, NULL, 2, FALSE, NULL),
  ('map', 'map', NULL, NULL, NULL, 2, FALSE, NULL),
  ('photo', 'photo', NULL, NULL, NULL, 2, FALSE, NULL),
  ('tour', 'tour', NULL, NULL, NULL, 2, FALSE, NULL),
  ('famous', 'famous', NULL, NULL, NULL, 2, FALSE, NULL),
  ('view', 'view', NULL, NULL, NULL, 2, FALSE, NULL),
  ('souvenir', 'souvenir', NULL, NULL, NULL, 2, FALSE, NULL),
  ('castle', 'castle', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='visit'), 'visit.v.go', 1, TRUE, 'verb', '訪れる', 'to go to see a place or person', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='map'), 'map.n.guide', 1, TRUE, 'noun', '地図', 'a drawing of an area that shows roads', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='photo'), 'photo.n.pic', 1, TRUE, 'noun', '写真', 'a picture made with a camera', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tour'), 'tour.n.trip', 1, TRUE, 'noun', 'ツアー', 'a trip to see the interesting parts of a place', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='famous'), 'famous.adj.known', 1, TRUE, 'adjective', '有名な', 'known by many people', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='view'), 'view.n.scene', 1, TRUE, 'noun', '景色', 'what you can see from a place', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='souvenir'), 'souvenir.n.gift', 1, TRUE, 'noun', 'お土産', 'something you buy to remember a trip', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='castle'), 'castle.n.building', 1, TRUE, 'noun', '城', 'a large old building built for defense', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('visit','map','photo','tour','famous','view','souvenir','castle')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='sightseeing'
WHERE s.slug IN ('visit.v.go','map.n.guide','photo.n.pic','tour.n.trip','famous.adj.known','view.n.scene','souvenir.n.gift','castle.n.building')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-30', 9, 3, (SELECT id FROM vocab_categories WHERE slug='sightseeing'), 'Sightseeing', '観光', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-30'), s.id, x.ord
FROM (VALUES
  ('visit.v.go',0),('map.n.guide',1),('photo.n.pic',2),('tour.n.trip',3),('famous.adj.known',4),('view.n.scene',5),('souvenir.n.gift',6),('castle.n.building',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-30'), 'travel', 0, 'A guided tour', 'ガイドツアー', 'street', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-30'), 'conversation', 1, 'Trip photos', '旅行の写真', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-30'), 'business', 2, 'A free afternoon', '自由な午後', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 0, 'npc', 'Welcome to today''s {tour}!', '本日のツアーへようこそ！', 'tour', (SELECT id FROM vocab_senses WHERE slug='tour.n.trip'), ARRAY['tour','view','shop','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 1, 'user', 'Thank you! Is that the old {castle} where kings lived?', 'ありがとう！あれが王の住んだ古いお城？', 'castle', (SELECT id FROM vocab_senses WHERE slug='castle.n.building'), ARRAY['castle','park','museum','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 2, 'npc', 'Yes, it''s very {famous}; everyone knows it.', 'はい、とても有名で、誰もが知ってる。', 'famous', (SELECT id FROM vocab_senses WHERE slug='famous.adj.known'), ARRAY['cheap','quiet','famous','near']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 3, 'user', 'Wow, what a {view}!', 'わあ、いい景色！', 'view', (SELECT id FROM vocab_senses WHERE slug='view.n.scene'), ARRAY['photo','view','seat','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 4, 'npc', 'Best spot in the city. Take your time.', '街で一番の場所です。ごゆっくり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 5, 'user', 'Amazing. Thank you.', '素晴らしい。ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 6, 'npc', 'Let''s continue.', '続けましょう。', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 0, 'npc', 'How was your trip?', '旅行どうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 1, 'user', 'Amazing! We got to {visit} so many places.', '最高！たくさんの場所を訪れたよ。', 'visit', (SELECT id FROM vocab_senses WHERE slug='visit.v.go'), ARRAY['miss','forget','visit','leave']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 2, 'npc', 'Show me a {photo}!', '写真見せて！', 'photo', (SELECT id FROM vocab_senses WHERE slug='photo.n.pic'), ARRAY['photo','ticket','map','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 3, 'user', 'Here. We used this {map} every day.', 'はい。毎日この地図を使った。', 'map', (SELECT id FROM vocab_senses WHERE slug='map.n.guide'), ARRAY['menu','list','photo','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 4, 'npc', 'Did you bring a {souvenir}?', 'お土産買った？', 'souvenir', (SELECT id FROM vocab_senses WHERE slug='souvenir.n.gift'), ARRAY['receipt','ticket','souvenir','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 5, 'user', 'Yes, for you!', 'うん、あなたに！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 6, 'npc', 'Aw, thank you!', 'わあ、ありがとう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 0, 'npc', 'You have a free afternoon on the trip, right?', '出張で午後は自由なんだよね？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 1, 'user', 'Yes! I want to {visit} the old town.', 'うん！旧市街を訪れたい。', 'visit', (SELECT id FROM vocab_senses WHERE slug='visit.v.go'), ARRAY['visit','miss','leave','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 2, 'npc', 'Nice. The {view} from the hill is great.', 'いいね。丘からの景色が最高。', 'view', (SELECT id FROM vocab_senses WHERE slug='view.n.scene'), ARRAY['view','photo','map','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 3, 'user', 'Is the cathedral {famous}, known worldwide?', '大聖堂は有名？世界的に知られてる？', 'famous', (SELECT id FROM vocab_senses WHERE slug='famous.adj.known'), ARRAY['near','famous','cheap','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 4, 'npc', 'Very. Grab a {souvenir} while you''re there.', 'とても。ついでにお土産も。', 'souvenir', (SELECT id FROM vocab_senses WHERE slug='souvenir.n.gift'), ARRAY['receipt','ticket','souvenir','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 5, 'user', 'Good idea. Thanks!', 'いいね。ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 6, 'npc', 'Have fun!', '楽しんで！', NULL, NULL, NULL);
