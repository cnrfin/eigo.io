-- ============================================================================
-- Vocab 102: vocab-102-22 - Planning a trip  (Unit 8)
-- Words: destination, itinerary, accommodation, reserve, abroad, journey, luggage, insurance.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('planning-a-trip', 'Planning a trip', '旅行の計画', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('destination', 'destination', '/ˌdestɪˈneɪʃn/', '/ˌdestɪˈneɪʃn/', NULL, 4, FALSE, NULL),
  ('itinerary', 'itinerary', '/aɪˈtɪnəreri/', '/aɪˈtɪnərəri/', NULL, 4, FALSE, NULL),
  ('accommodation', 'accommodation', '/əˌkɑːməˈdeɪʃn/', '/əˌkɒməˈdeɪʃn/', NULL, 4, FALSE, NULL),
  ('reserve', 'reserve', '/rɪˈzɜːrv/', '/rɪˈzɜːv/', NULL, 3, FALSE, NULL),
  ('abroad', 'abroad', '/əˈbrɔːd/', '/əˈbrɔːd/', NULL, 3, FALSE, NULL),
  ('journey', 'journey', '/ˈdʒɜːrni/', '/ˈdʒɜːni/', NULL, 3, FALSE, NULL),
  ('luggage', 'luggage', '/ˈlʌɡɪdʒ/', '/ˈlʌɡɪdʒ/', NULL, 3, FALSE, NULL),
  ('insurance', 'insurance', '/ɪnˈʃʊrəns/', '/ɪnˈʃʊərəns/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='destination'), 'destination.n.place', 1, TRUE, 'noun', '目的地', 'the place you are traveling to', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='itinerary'), 'itinerary.n.plan', 1, TRUE, 'noun', '旅程', 'a plan of the places and times for a trip', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='accommodation'), 'accommodation.n.lodging', 1, TRUE, 'noun', '宿泊施設', 'a place to stay, such as a hotel', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reserve'), 'reserve.v.book', 1, TRUE, 'verb', '予約する', 'to arrange to have a room or seat kept for you', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='abroad'), 'abroad.adv.overseas', 1, TRUE, 'adverb', '海外へ', 'in or to a foreign country', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='journey'), 'journey.n.trip', 1, TRUE, 'noun', '旅', 'the act of traveling from one place to another', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='luggage'), 'luggage.n.bags', 1, TRUE, 'noun', '荷物', 'the bags and cases you take when you travel', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='insurance'), 'insurance.n.cover', 1, TRUE, 'noun', '保険', 'protection that pays you if something goes wrong', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('destination', 'itinerary', 'accommodation', 'reserve', 'abroad', 'journey', 'luggage', 'insurance')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='planning-a-trip'
WHERE s.slug IN ('destination.n.place', 'itinerary.n.plan', 'accommodation.n.lodging', 'reserve.v.book', 'abroad.adv.overseas', 'journey.n.trip', 'luggage.n.bags', 'insurance.n.cover')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-22', 8, 0, (SELECT id FROM vocab_categories WHERE slug='planning-a-trip'), 'Planning a trip', '旅行の計画', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-22'), s.id, x.ord FROM (VALUES
  ('destination.n.place',0),('itinerary.n.plan',1),('accommodation.n.lodging',2),('reserve.v.book',3),('abroad.adv.overseas',4),('journey.n.trip',5),('luggage.n.bags',6),('insurance.n.cover',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-22'), 'conversation', 0, 'Planning a holiday', '休暇の計画', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-22'), 'travel', 1, 'At a travel agency', '旅行代理店で', 'agency', 'agent'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-22'), 'business', 2, 'A work trip', '出張', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 0, 'npc', 'Have you booked your summer trip?', '夏の旅行はもう予約した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 1, 'user', 'Almost. My {destination} is Portugal.', 'もう少し。目的地はポルトガル。', 'destination', (SELECT id FROM vocab_senses WHERE slug='destination.n.place'), ARRAY['destination','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 2, 'npc', 'Lovely! Where will you stay?', 'いいね！どこに泊まる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 3, 'user', 'I found nice {accommodation} near the beach.', 'ビーチの近くにいい宿を見つけた。', 'accommodation', (SELECT id FROM vocab_senses WHERE slug='accommodation.n.lodging'), ARRAY['accommodation','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 4, 'npc', 'Did you book it?', '予約した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 5, 'user', 'Yes, I''ll {reserve} the room tonight.', 'うん、今夜部屋を予約する。', 'reserve', (SELECT id FROM vocab_senses WHERE slug='reserve.v.book'), ARRAY['reserve','abroad','journey','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 6, 'npc', 'Smart. Packing light?', '賢い。荷物は軽め？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 7, 'user', 'I hate heavy {luggage}, so just a carry-on.', '重い荷物は嫌だから、機内持ち込みだけ。', 'luggage', (SELECT id FROM vocab_senses WHERE slug='luggage.n.bags'), ARRAY['luggage','journey','destination','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 8, 'npc', 'Good idea. Travel safe.', 'いいね。気をつけて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 9, 'user', 'I bought travel {insurance} just in case.', '念のため旅行保険に入った。', 'insurance', (SELECT id FROM vocab_senses WHERE slug='insurance.n.cover'), ARRAY['insurance','journey','luggage','destination']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 10, 'npc', 'Very sensible. Long flight?', 'しっかりしてる。フライトは長い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 11, 'user', 'The whole {journey} is about six hours.', '移動は全部で6時間くらい。', 'journey', (SELECT id FROM vocab_senses WHERE slug='journey.n.trip'), ARRAY['journey','destination','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 12, 'npc', 'Not bad at all.', '悪くないね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 13, 'user', 'I can''t wait!', '楽しみ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='conversation'), 14, 'npc', 'Send photos, {{user_name}}!', '写真送ってね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 0, 'npc', 'How can I help plan your trip?', '旅行の計画、お手伝いしましょうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 1, 'user', 'I want to travel {abroad} for the first time.', '初めて海外に行きたいんです。', 'abroad', (SELECT id FROM vocab_senses WHERE slug='abroad.adv.overseas'), ARRAY['abroad','reserve','destination','journey']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 2, 'npc', 'Exciting! Any place in mind?', 'いいですね！行き先は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 3, 'user', 'My dream {destination} is Japan.', '憧れの目的地は日本です。', 'destination', (SELECT id FROM vocab_senses WHERE slug='destination.n.place'), ARRAY['destination','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 4, 'npc', 'Great choice. I''ll plan your days.', 'いい選択。日程を組みますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 5, 'user', 'Yes, please make a full {itinerary}.', 'はい、詳しい旅程を作ってください。', 'itinerary', (SELECT id FROM vocab_senses WHERE slug='itinerary.n.plan'), ARRAY['itinerary','luggage','insurance','journey']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 6, 'npc', 'Where would you like to sleep?', '宿泊はどうしますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 7, 'user', 'Mid-range {accommodation}, clean and central.', '中級の宿で、清潔で中心地がいいです。', 'accommodation', (SELECT id FROM vocab_senses WHERE slug='accommodation.n.lodging'), ARRAY['accommodation','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 8, 'npc', 'I can book that today.', '本日予約できます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 9, 'user', 'Please {reserve} the hotels for me.', 'ホテルの予約をお願いします。', 'reserve', (SELECT id FROM vocab_senses WHERE slug='reserve.v.book'), ARRAY['reserve','abroad','journey','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 10, 'npc', 'Done. Do you have cover?', '完了です。保険は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 11, 'user', 'Not yet. Add travel {insurance} too.', 'まだです。旅行保険も付けてください。', 'insurance', (SELECT id FROM vocab_senses WHERE slug='insurance.n.cover'), ARRAY['insurance','journey','luggage','destination']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 12, 'npc', 'All set. Have a wonderful trip.', '準備完了。よい旅を。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 13, 'user', 'Thank you so much!', '本当にありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='travel'), 14, 'npc', 'Safe travels!', '気をつけて！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 0, 'npc', 'You''re going to the Berlin conference?', 'ベルリンの会議に行くの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 1, 'user', 'Yes, my first work trip {abroad}.', 'うん、初めての海外出張。', 'abroad', (SELECT id FROM vocab_senses WHERE slug='abroad.adv.overseas'), ARRAY['abroad','reserve','destination','journey']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 2, 'npc', 'Do you have a plan?', '予定はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 3, 'user', 'HR sent me the full {itinerary}.', '人事が詳しい旅程を送ってくれた。', 'itinerary', (SELECT id FROM vocab_senses WHERE slug='itinerary.n.plan'), ARRAY['itinerary','luggage','insurance','journey']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 4, 'npc', 'Where are you staying?', 'どこに泊まる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 5, 'user', 'The company booked {accommodation} near the venue.', '会社が会場近くの宿を予約してくれた。', 'accommodation', (SELECT id FROM vocab_senses WHERE slug='accommodation.n.lodging'), ARRAY['accommodation','journey','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 6, 'npc', 'Did they confirm it?', '確定してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 7, 'user', 'Yes, they {reserve}d two nights.', 'うん、2泊予約済み。', 'reserve', (SELECT id FROM vocab_senses WHERE slug='reserve.v.book'), ARRAY['reserve','abroad','journey','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 8, 'npc', 'Traveling light?', '荷物は軽め？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 9, 'user', 'Just one bag of {luggage} for three days.', '3日で荷物はバッグ一つ。', 'luggage', (SELECT id FROM vocab_senses WHERE slug='luggage.n.bags'), ARRAY['luggage','journey','destination','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 10, 'npc', 'How long''s the flight?', 'フライトは何時間？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 11, 'user', 'The {journey} is under two hours.', '移動は2時間未満。', 'journey', (SELECT id FROM vocab_senses WHERE slug='journey.n.trip'), ARRAY['journey','destination','luggage','insurance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 12, 'npc', 'Easy trip. Good luck!', '楽な出張だね。頑張って！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 13, 'user', 'Thanks, I''ll represent us well.', 'ありがとう、しっかり務めるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-22') AND goal='business'), 14, 'npc', 'I know you will, {{user_name}}.', '君ならね、{{user_name}}。', NULL, NULL, NULL);
