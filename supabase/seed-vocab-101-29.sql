-- ============================================================================
-- Vocab 101: Lesson 29 (A2): "Airport & station"  (Unit 9, Travel and holidays)
-- ----------------------------------------------------------------------------
-- Words (all new): flight, gate, passport, board, wait, suitcase, delay, arrive.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('airport', 'Airport and station', '空港と駅', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('flight', 'flight', NULL, NULL, NULL, 2, FALSE, NULL),
  ('gate', 'gate', NULL, NULL, NULL, 2, FALSE, NULL),
  ('passport', 'passport', NULL, NULL, NULL, 2, FALSE, NULL),
  ('board', 'board', NULL, NULL, NULL, 2, FALSE, NULL),
  ('wait', 'wait', NULL, NULL, NULL, 2, FALSE, NULL),
  ('suitcase', 'suitcase', NULL, NULL, NULL, 2, FALSE, NULL),
  ('delay', 'delay', NULL, NULL, NULL, 2, FALSE, NULL),
  ('arrive', 'arrive', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='flight'), 'flight.n.plane', 1, TRUE, 'noun', 'フライト', 'a journey by plane', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gate'), 'gate.n.airport', 1, TRUE, 'noun', '搭乗口', 'the door where you board a plane', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='passport'), 'passport.n.doc', 1, TRUE, 'noun', 'パスポート', 'an official document for foreign travel', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='board'), 'board.v.geton', 1, TRUE, 'verb', '搭乗する', 'to get on a plane, train, or ship', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wait'), 'wait.v.stay', 1, TRUE, 'verb', '待つ', 'to stay until something happens', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='suitcase'), 'suitcase.n.bag', 1, TRUE, 'noun', 'スーツケース', 'a large case for clothes when traveling', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='delay'), 'delay.n.late', 1, TRUE, 'noun', '遅れ', 'a time when something is later than planned', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='arrive'), 'arrive.v.reach', 1, TRUE, 'verb', '到着する', 'to reach a place', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('flight','gate','passport','board','wait','suitcase','delay','arrive')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='arrive.v.reach'), NULL, 'reach', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='airport'
WHERE s.slug IN ('flight.n.plane','gate.n.airport','passport.n.doc','board.v.geton','wait.v.stay','suitcase.n.bag','delay.n.late','arrive.v.reach')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-29', 9, 2, (SELECT id FROM vocab_categories WHERE slug='airport'), 'Airport & station', '空港と駅', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-29'), s.id, x.ord
FROM (VALUES
  ('flight.n.plane',0),('gate.n.airport',1),('passport.n.doc',2),('board.v.geton',3),('wait.v.stay',4),('suitcase.n.bag',5),('delay.n.late',6),('arrive.v.reach',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-29'), 'travel', 0, 'Checking in', '搭乗手続き', 'airport', 'staff'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-29'), 'conversation', 1, 'Landing soon', 'もうすぐ到着', 'phone', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-29'), 'business', 2, 'A business trip', '出張', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 0, 'npc', 'Good morning! May I see your {passport} and boarding pass?', 'おはようございます！パスポートと搭乗券を拝見できますか？', 'passport', (SELECT id FROM vocab_senses WHERE slug='passport.n.doc'), ARRAY['card','ticket','passport','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 1, 'user', 'Here you go. My {flight} departs at noon.', 'どうぞ。フライトは正午発です。', 'flight', (SELECT id FROM vocab_senses WHERE slug='flight.n.plane'), ARRAY['flight','gate','bus','train']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 2, 'npc', 'Great. Your boarding {gate} is B12.', 'はい。搭乗ゲートはB12です。', 'gate', (SELECT id FROM vocab_senses WHERE slug='gate.n.airport'), ARRAY['gate','platform','door','corner']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 3, 'user', 'When do we {board}?', 'いつ搭乗ですか？', 'board', (SELECT id FROM vocab_senses WHERE slug='board.v.geton'), ARRAY['arrive','wait','board','land']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 4, 'npc', 'In one hour. Enjoy your trip!', '1時間後です。よい旅を！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 5, 'user', 'Thank you!', 'ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 6, 'npc', 'Safe travels.', 'お気をつけて。', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 0, 'npc', 'Hey! What time do you {arrive} and land?', 'やあ！何時に到着（着陸）する？', 'arrive', (SELECT id FROM vocab_senses WHERE slug='arrive.v.reach'), ARRAY['arrive','leave','wait','board']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 1, 'user', 'Around three, if there''s no {delay}.', '遅れがなければ3時ごろ。', 'delay', (SELECT id FROM vocab_senses WHERE slug='delay.n.late'), ARRAY['gate','ride','delay','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 2, 'npc', 'Okay. Should I {wait} at the station?', '了解。駅で待ってようか？', 'wait', (SELECT id FROM vocab_senses WHERE slug='wait.v.stay'), ARRAY['leave','wait','drive','run']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 3, 'user', 'Yes please. My {flight} took off on time.', 'お願い。フライトは定刻に離陸した。', 'flight', (SELECT id FROM vocab_senses WHERE slug='flight.n.plane'), ARRAY['gate','flight','bus','train']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 4, 'npc', 'Great. I''ll be there.', 'よかった。行くね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 5, 'user', 'See you soon!', 'またすぐ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 6, 'npc', 'Text me when you land.', '着いたらメッセージして。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 0, 'npc', 'All set for the trip?', '出張の準備できた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 1, 'user', 'Almost. My {flight} to Tokyo leaves early.', 'もう少し。東京行きのフライトが早い。', 'flight', (SELECT id FROM vocab_senses WHERE slug='flight.n.plane'), ARRAY['flight','train','bus','gate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 2, 'npc', 'Just one {suitcase} to check in?', '預けるスーツケースは一つ？', 'suitcase', (SELECT id FROM vocab_senses WHERE slug='suitcase.n.bag'), ARRAY['seat','bag','suitcase','box']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 3, 'user', 'Yes, packing light.', 'うん、身軽にね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 4, 'npc', 'Any {delay} expected?', '遅れはありそう？', 'delay', (SELECT id FROM vocab_senses WHERE slug='delay.n.late'), ARRAY['seat','gate','delay','ride']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 5, 'user', 'No. I should {arrive} and land by evening.', 'いえ。夕方には到着して着陸するはず。', 'arrive', (SELECT id FROM vocab_senses WHERE slug='arrive.v.reach'), ARRAY['arrive','board','leave','wait']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 6, 'npc', 'Safe trip!', '気をつけて！', NULL, NULL, NULL);
