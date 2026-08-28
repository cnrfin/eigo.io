-- ============================================================================
-- Vocab 102: vocab-102-16 - Housing  (Unit 6)
-- Words: rent, landlord, mortgage, furniture, neighborhood, suburb, spacious, cozy.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('housing', 'Housing', '住まい', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('rent', 'rent', '/rent/', '/rent/', NULL, 3, FALSE, NULL),
  ('landlord', 'landlord', '/ˈlændlɔːrd/', '/ˈlændlɔːd/', NULL, 4, FALSE, NULL),
  ('mortgage', 'mortgage', '/ˈmɔːrɡɪdʒ/', '/ˈmɔːɡɪdʒ/', NULL, 4, TRUE, 't は発音しない。/ˈmɔːrɡɪdʒ/。'),
  ('furniture', 'furniture', '/ˈfɜːrnɪtʃər/', '/ˈfɜːnɪtʃə/', NULL, 3, FALSE, NULL),
  ('neighborhood', 'neighborhood', '/ˈneɪbərhʊd/', '/ˈneɪbəhʊd/', NULL, 3, FALSE, NULL),
  ('suburb', 'suburb', '/ˈsʌbɜːrb/', '/ˈsʌbɜːb/', NULL, 4, FALSE, NULL),
  ('spacious', 'spacious', '/ˈspeɪʃəs/', '/ˈspeɪʃəs/', NULL, 4, FALSE, NULL),
  ('cozy', 'cozy', '/ˈkoʊzi/', '/ˈkəʊzi/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='rent'), 'rent.n.payment', 1, TRUE, 'noun', '家賃', 'the money you pay to live in a place you do not own', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='landlord'), 'landlord.n.owner', 1, TRUE, 'noun', '家主', 'a person who owns a place and rents it to others', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mortgage'), 'mortgage.n.loan', 1, TRUE, 'noun', '住宅ローン', 'a loan used to buy a house', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='furniture'), 'furniture.n.items', 1, TRUE, 'noun', '家具', 'things like tables, chairs and beds in a room', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='neighborhood'), 'neighborhood.n.area', 1, TRUE, 'noun', '近所', 'the local area around your home and its community', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='suburb'), 'suburb.n.outer', 1, TRUE, 'noun', '郊外', 'an area on the edge of a city, away from the center', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spacious'), 'spacious.adj.roomy', 1, TRUE, 'adjective', '広々とした', 'having plenty of room inside', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cozy'), 'cozy.adj.snug', 1, TRUE, 'adjective', '居心地のいい', 'small, warm and comfortable', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('rent', 'landlord', 'mortgage', 'furniture', 'neighborhood', 'suburb', 'spacious', 'cozy')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='housing'
WHERE s.slug IN ('rent.n.payment', 'landlord.n.owner', 'mortgage.n.loan', 'furniture.n.items', 'neighborhood.n.area', 'suburb.n.outer', 'spacious.adj.roomy', 'cozy.adj.snug')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-16', 6, 0, (SELECT id FROM vocab_categories WHERE slug='housing'), 'Housing', '住まい探し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-16'), s.id, x.ord FROM (VALUES
  ('rent.n.payment',0),('landlord.n.owner',1),('mortgage.n.loan',2),('furniture.n.items',3),('neighborhood.n.area',4),('suburb.n.outer',5),('spacious.adj.roomy',6),('cozy.adj.snug',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-16'), 'conversation', 0, 'A friend''s new flat', '友達の新居', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-16'), 'travel', 1, 'A holiday house', '貸別荘', 'house', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-16'), 'business', 2, 'Office relocation', 'オフィス移転', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 0, 'npc', 'You moved! How''s the new flat?', '引っ越したね！新しい部屋どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 1, 'user', 'Love it. The {rent} is really reasonable.', '気に入ってる。家賃がかなり手頃。', 'rent', (SELECT id FROM vocab_senses WHERE slug='rent.n.payment'), ARRAY['rent','landlord','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 2, 'npc', 'Nice area?', 'いい地域？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 3, 'user', 'Yeah, a friendly {neighborhood} where I know the shopkeepers.', 'うん、店の人とも顔なじみの温かい近所。', 'neighborhood', (SELECT id FROM vocab_senses WHERE slug='neighborhood.n.area'), ARRAY['neighborhood','mortgage','furniture','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 4, 'npc', 'Is it big?', '広い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 5, 'user', 'Surprisingly {spacious} for the price.', '値段の割に驚くほど広々してる。', 'spacious', (SELECT id FROM vocab_senses WHERE slug='spacious.adj.roomy'), ARRAY['spacious','cozy','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 6, 'npc', 'And warm?', '暖かい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 7, 'user', 'Very {cozy}; I added rugs and lamps.', 'すごく居心地いい。ラグとランプを足した。', 'cozy', (SELECT id FROM vocab_senses WHERE slug='cozy.adj.snug'), ARRAY['cozy','spacious','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 8, 'npc', 'Did it come furnished?', '家具付き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 9, 'user', 'Some {furniture} was included, like a sofa.', 'ソファとか、家具が少し付いてた。', 'furniture', (SELECT id FROM vocab_senses WHERE slug='furniture.n.items'), ARRAY['furniture','rent','mortgage','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 10, 'npc', 'Good landlord?', '大家さんはいい人？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 11, 'user', 'Yeah, my {landlord} fixes things quickly.', 'うん、大家さんは何でもすぐ直してくれる。', 'landlord', (SELECT id FROM vocab_senses WHERE slug='landlord.n.owner'), ARRAY['landlord','rent','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 12, 'npc', 'Sounds ideal.', '理想的だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 13, 'user', 'Come visit soon!', '近いうちに遊びに来て！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='conversation'), 14, 'npc', 'I will, {{user_name}}.', '行くよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 0, 'npc', 'Welcome! Here''s the holiday house.', 'ようこそ！こちらが貸別荘です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 1, 'user', 'Wow, it''s so {spacious} inside.', 'わあ、中がすごく広々してる。', 'spacious', (SELECT id FROM vocab_senses WHERE slug='spacious.adj.roomy'), ARRAY['spacious','cozy','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 2, 'npc', 'Plenty of room for the family.', '家族にも十分な広さです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 3, 'user', 'And really {cozy} with that fireplace.', 'それに暖炉があって居心地いい。', 'cozy', (SELECT id FROM vocab_senses WHERE slug='cozy.adj.snug'), ARRAY['cozy','spacious','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 4, 'npc', 'It''s in a calm part of town.', '静かな地区にあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 5, 'user', 'I like that it''s in a quiet {suburb}, away from the center.', '中心から離れた静かな郊外なのがいい。', 'suburb', (SELECT id FROM vocab_senses WHERE slug='suburb.n.outer'), ARRAY['suburb','neighborhood','furniture','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 6, 'npc', 'Yes, ten minutes from the beach.', 'はい、ビーチまで10分です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 7, 'user', 'The {furniture} looks brand new.', '家具が新品みたい。', 'furniture', (SELECT id FROM vocab_senses WHERE slug='furniture.n.items'), ARRAY['furniture','rent','mortgage','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 8, 'npc', 'We update it every year.', '毎年新しくしています。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 9, 'user', 'How much is the weekly {rent}?', '週の家賃はいくらですか？', 'rent', (SELECT id FROM vocab_senses WHERE slug='rent.n.payment'), ARRAY['rent','mortgage','landlord','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 10, 'npc', 'It''s on the listing, all inclusive.', '掲載価格で、全て込みです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 11, 'user', 'Do you live here, or is it a {mortgage} investment?', 'ここに住んでる？それとも住宅ローンの投資物件？', 'mortgage', (SELECT id FROM vocab_senses WHERE slug='mortgage.n.loan'), ARRAY['mortgage','rent','landlord','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 12, 'npc', 'An investment, actually.', '実は投資物件です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 13, 'user', 'It''s lovely. We''ll take it.', '素敵です。ここにします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='travel'), 14, 'npc', 'Enjoy your stay!', '滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 0, 'npc', 'The team''s outgrowing this office.', 'チームがこのオフィスに手狭になってきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 1, 'user', 'Agreed. We need a more {spacious} space.', '賛成。もっと広い場所が必要。', 'spacious', (SELECT id FROM vocab_senses WHERE slug='spacious.adj.roomy'), ARRAY['spacious','cozy','landlord','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 2, 'npc', 'I saw one downtown.', '中心街に一つ見つけた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 3, 'user', 'What''s the monthly {rent}?', '月の家賃は？', 'rent', (SELECT id FROM vocab_senses WHERE slug='rent.n.payment'), ARRAY['rent','landlord','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 4, 'npc', 'A bit high for the center.', '中心地だから少し高い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 5, 'user', 'Maybe a {suburb} office would be cheaper.', '郊外のオフィスの方が安いかも。', 'suburb', (SELECT id FROM vocab_senses WHERE slug='suburb.n.outer'), ARRAY['suburb','neighborhood','furniture','mortgage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 6, 'npc', 'True, but harder to commute.', '確かに、でも通勤が大変。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 7, 'user', 'Is it a safe {neighborhood} at least?', 'せめて治安のいい地域？', 'neighborhood', (SELECT id FROM vocab_senses WHERE slug='neighborhood.n.area'), ARRAY['neighborhood','mortgage','furniture','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 8, 'npc', 'Very. Good cafes nearby too.', 'とても。近くにいいカフェもある。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 9, 'user', 'Would we need new {furniture}?', '新しい家具は必要？', 'furniture', (SELECT id FROM vocab_senses WHERE slug='furniture.n.items'), ARRAY['furniture','rent','mortgage','landlord']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 10, 'npc', 'Some desks come with it.', '机はいくつか付いてくる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 11, 'user', 'Let''s ask the {landlord} about a tour.', '大家さんに内見を頼もう。', 'landlord', (SELECT id FROM vocab_senses WHERE slug='landlord.n.owner'), ARRAY['landlord','rent','mortgage','furniture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 12, 'npc', 'I''ll email them today.', '今日メールするよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 13, 'user', 'Great, keep me posted.', 'いいね、また教えて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-16') AND goal='business'), 14, 'npc', 'Will do, {{user_name}}.', '了解、{{user_name}}。', NULL, NULL, NULL);
