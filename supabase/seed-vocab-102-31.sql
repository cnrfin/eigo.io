-- ============================================================================
-- Vocab 102: vocab-102-31 - In the city  (Unit 11)
-- Words: traffic, pedestrian, crossing, pavement, commute, parking, junction, roadworks.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('in-the-city', 'In the city', '街なか', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('traffic', 'traffic', '/ˈtræfɪk/', '/ˈtræfɪk/', NULL, 3, FALSE, NULL),
  ('pedestrian', 'pedestrian', '/pəˈdestriən/', '/pəˈdestriən/', NULL, 4, FALSE, NULL),
  ('crossing', 'crossing', '/ˈkrɔːsɪŋ/', '/ˈkrɒsɪŋ/', NULL, 3, FALSE, NULL),
  ('pavement', 'pavement', '/ˈpeɪvmənt/', '/ˈpeɪvmənt/', NULL, 4, FALSE, NULL),
  ('commute', 'commute', '/kəˈmjuːt/', '/kəˈmjuːt/', NULL, 4, FALSE, NULL),
  ('parking', 'parking', '/ˈpɑːrkɪŋ/', '/ˈpɑːkɪŋ/', NULL, 3, FALSE, NULL),
  ('junction', 'junction', '/ˈdʒʌŋkʃn/', '/ˈdʒʌŋkʃn/', NULL, 4, FALSE, NULL),
  ('roadworks', 'roadworks', '/ˈroʊdwɜːrks/', '/ˈrəʊdwɜːks/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='traffic'), 'traffic.n.cars', 1, TRUE, 'noun', '交通（量）', 'the cars and vehicles moving on the roads', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pedestrian'), 'pedestrian.n.walker', 1, TRUE, 'noun', '歩行者', 'a person walking, not in a vehicle', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='crossing'), 'crossing.n.place', 1, TRUE, 'noun', '横断歩道', 'a marked place to walk across a road', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pavement'), 'pavement.n.walkway', 1, TRUE, 'noun', '歩道', 'the path beside a road for people to walk on', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='commute'), 'commute.v.travel', 1, TRUE, 'verb', '通勤する', 'to travel regularly between home and work', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='parking'), 'parking.n.space', 1, TRUE, 'noun', '駐車（場）', 'space where you can leave a car', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='junction'), 'junction.n.crossing', 1, TRUE, 'noun', '交差点', 'a place where roads meet', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='roadworks'), 'roadworks.n.repair', 1, TRUE, 'noun', '道路工事', 'repairs being done on a road', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('traffic', 'pedestrian', 'crossing', 'pavement', 'commute', 'parking', 'junction', 'roadworks')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='in-the-city'
WHERE s.slug IN ('traffic.n.cars', 'pedestrian.n.walker', 'crossing.n.place', 'pavement.n.walkway', 'commute.v.travel', 'parking.n.space', 'junction.n.crossing', 'roadworks.n.repair')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-31', 11, 0, (SELECT id FROM vocab_categories WHERE slug='in-the-city'), 'In the city', '街なかで', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-31'), s.id, x.ord FROM (VALUES
  ('traffic.n.cars',0),('pedestrian.n.walker',1),('crossing.n.place',2),('pavement.n.walkway',3),('commute.v.travel',4),('parking.n.space',5),('junction.n.crossing',6),('roadworks.n.repair',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-31'), 'conversation', 0, 'City living', '都会暮らし', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-31'), 'travel', 1, 'Getting directions', '道を尋ねる', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-31'), 'business', 2, 'An office relocation', '移転の検討', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 0, 'npc', 'How''s living in the city?', '都会暮らしはどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 1, 'user', 'Busy! The {traffic} is heavy every morning.', '忙しい！毎朝渋滞がひどい。', 'traffic', (SELECT id FROM vocab_senses WHERE slug='traffic.n.cars'), ARRAY['traffic','parking','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 2, 'npc', 'Long trip to work?', '通勤は長い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 3, 'user', 'I {commute} an hour each way.', '片道1時間通勤してる。', 'commute', (SELECT id FROM vocab_senses WHERE slug='commute.v.travel'), ARRAY['commute','crossing','parking','roadworks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 4, 'npc', 'Do you drive?', '運転する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 5, 'user', 'Sometimes, but {parking} is expensive.', 'たまに、でも駐車が高い。', 'parking', (SELECT id FROM vocab_senses WHERE slug='parking.n.space'), ARRAY['parking','traffic','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 6, 'npc', 'I usually walk.', '私はたいてい歩く。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 7, 'user', 'Me too, the {pavement} is wide here.', '私も、ここは歩道が広い。', 'pavement', (SELECT id FROM vocab_senses WHERE slug='pavement.n.walkway'), ARRAY['pavement','traffic','parking','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 8, 'npc', 'Easy to cross the roads?', '道は渡りやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 9, 'user', 'Yes, there''s a {crossing} on every corner.', 'うん、どの角にも横断歩道がある。', 'crossing', (SELECT id FROM vocab_senses WHERE slug='crossing.n.place'), ARRAY['crossing','traffic','parking','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 10, 'npc', 'Any construction lately?', '最近工事は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 11, 'user', 'Ugh, {roadworks} are slowing everything down.', 'うわ、道路工事で全部が遅い。', 'roadworks', (SELECT id FROM vocab_senses WHERE slug='roadworks.n.repair'), ARRAY['roadworks','traffic','parking','crossing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 12, 'npc', 'City life, right?', '都会だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 13, 'user', 'I still love it.', 'それでも好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='conversation'), 14, 'npc', 'Me too, {{user_name}}.', '私も、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 0, 'npc', 'You look lost. Need help?', '迷ってる？手伝おうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 1, 'user', 'Yes, do I turn at the next {junction}?', 'はい、次の交差点で曲がりますか？', 'junction', (SELECT id FROM vocab_senses WHERE slug='junction.n.crossing'), ARRAY['junction','crossing','parking','traffic']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 2, 'npc', 'Yes, left at the big intersection.', 'はい、大きな交差点を左に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 3, 'user', 'Is there a {pedestrian} path along the river?', '川沿いに歩行者用の道はありますか？', 'pedestrian', (SELECT id FROM vocab_senses WHERE slug='pedestrian.n.walker'), ARRAY['pedestrian','parking','traffic','roadworks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 4, 'npc', 'There is, very scenic.', 'ありますよ、景色がいいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 5, 'user', 'Where can I cross? Is there a {crossing}?', 'どこで渡れますか？横断歩道は？', 'crossing', (SELECT id FROM vocab_senses WHERE slug='crossing.n.place'), ARRAY['crossing','parking','traffic','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 6, 'npc', 'Fifty meters ahead, by the lights.', '50メートル先、信号のところ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 7, 'user', 'Thanks. Is the {traffic} bad around here?', 'ありがとう。この辺は渋滞しますか？', 'traffic', (SELECT id FROM vocab_senses WHERE slug='traffic.n.cars'), ARRAY['traffic','parking','pedestrian','pavement']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 8, 'npc', 'Only at rush hour.', 'ラッシュ時だけです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 9, 'user', 'Good. I''ll stay on the {pavement}.', 'よかった。歩道を歩きます。', 'pavement', (SELECT id FROM vocab_senses WHERE slug='pavement.n.walkway'), ARRAY['pavement','traffic','parking','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 10, 'npc', 'Driving or walking today?', '今日は運転？徒歩？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 11, 'user', 'Walking; {parking} is impossible downtown.', '徒歩、中心街は駐車が無理なので。', 'parking', (SELECT id FROM vocab_senses WHERE slug='parking.n.space'), ARRAY['parking','traffic','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 12, 'npc', 'Wise choice. Enjoy the walk!', '賢明ですね。散歩を楽しんで！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 13, 'user', 'Thank you so much.', '本当にありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='travel'), 14, 'npc', 'Safe travels!', '気をつけて！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 0, 'npc', 'Staff worry about the new location.', '新しい立地をみんな心配してる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 1, 'user', 'Some would {commute} over an hour.', '1時間以上通勤する人もいる。', 'commute', (SELECT id FROM vocab_senses WHERE slug='commute.v.travel'), ARRAY['commute','crossing','parking','roadworks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 2, 'npc', 'Is the area busy?', 'そのエリアは混む？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 3, 'user', 'The {traffic} there is lighter, actually.', '実はあそこは交通量が少ない。', 'traffic', (SELECT id FROM vocab_senses WHERE slug='traffic.n.cars'), ARRAY['traffic','parking','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 4, 'npc', 'Good. Room for cars?', 'いいね。駐車スペースは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 5, 'user', 'Plenty of {parking} for staff.', 'スタッフ用の駐車が十分ある。', 'parking', (SELECT id FROM vocab_senses WHERE slug='parking.n.space'), ARRAY['parking','traffic','crossing','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 6, 'npc', 'Easy to reach by road?', '車で行きやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 7, 'user', 'Yes, right off a major {junction}.', 'うん、主要な交差点のすぐそば。', 'junction', (SELECT id FROM vocab_senses WHERE slug='junction.n.crossing'), ARRAY['junction','crossing','parking','traffic']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 8, 'npc', 'Any construction nearby?', '近くに工事は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 9, 'user', 'Some {roadworks}, but done by next month.', '道路工事が少し、でも来月には終わる。', 'roadworks', (SELECT id FROM vocab_senses WHERE slug='roadworks.n.repair'), ARRAY['roadworks','traffic','parking','crossing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 10, 'npc', 'And for those who walk?', '歩く人には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 11, 'user', 'There''s a safe {pedestrian} route from the station.', '駅から安全な歩行者ルートがある。', 'pedestrian', (SELECT id FROM vocab_senses WHERE slug='pedestrian.n.walker'), ARRAY['pedestrian','parking','traffic','junction']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 12, 'npc', 'Sounds workable.', 'なんとかなりそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 13, 'user', 'I''ll present it Friday.', '金曜に提案するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-31') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
