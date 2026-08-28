-- ============================================================================
-- Vocab 102: vocab-102-24 - Problems abroad  (Unit 8)
-- Words: currency, exchange, customs, visa, jetlag, crowded, stranded, departure.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('problems-abroad', 'Problems abroad', '海外でのトラブル', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('currency', 'currency', '/ˈkɜːrənsi/', '/ˈkʌrənsi/', NULL, 4, FALSE, NULL),
  ('exchange', 'exchange', '/ɪksˈtʃeɪndʒ/', '/ɪksˈtʃeɪndʒ/', NULL, 3, FALSE, NULL),
  ('customs', 'customs', '/ˈkʌstəmz/', '/ˈkʌstəmz/', NULL, 4, FALSE, NULL),
  ('visa', 'visa', '/ˈviːzə/', '/ˈviːzə/', NULL, 3, FALSE, NULL),
  ('jetlag', 'jetlag', '/ˈdʒetlæɡ/', '/ˈdʒetlæɡ/', NULL, 4, FALSE, NULL),
  ('crowded', 'crowded', '/ˈkraʊdɪd/', '/ˈkraʊdɪd/', NULL, 3, FALSE, NULL),
  ('stranded', 'stranded', '/ˈstrændɪd/', '/ˈstrændɪd/', NULL, 4, FALSE, NULL),
  ('departure', 'departure', '/dɪˈpɑːrtʃər/', '/dɪˈpɑːtʃə/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='currency'), 'currency.n.money', 1, TRUE, 'noun', '通貨', 'the money used in a particular country', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='exchange'), 'exchange.v.swap', 1, TRUE, 'verb', '両替する', 'to change money of one country for another', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='customs'), 'customs.n.border', 1, TRUE, 'noun', '税関', 'the place where officials check what you bring into a country', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='visa'), 'visa.n.permit', 1, TRUE, 'noun', 'ビザ', 'an official mark allowing you to enter a country', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='jetlag'), 'jetlag.n.tiredness', 1, TRUE, 'noun', '時差ぼけ', 'tiredness after a long flight across time zones', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='crowded'), 'crowded.adj.busy', 1, TRUE, 'adjective', '混雑した', 'full of people', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stranded'), 'stranded.adj.stuck', 1, TRUE, 'adjective', '立ち往生した', 'stuck somewhere and unable to leave', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='departure'), 'departure.n.leaving', 1, TRUE, 'noun', '出発', 'the act of leaving on a trip', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('currency', 'exchange', 'customs', 'visa', 'jetlag', 'crowded', 'stranded', 'departure')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='problems-abroad'
WHERE s.slug IN ('currency.n.money', 'exchange.v.swap', 'customs.n.border', 'visa.n.permit', 'jetlag.n.tiredness', 'crowded.adj.busy', 'stranded.adj.stuck', 'departure.n.leaving')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-24', 8, 2, (SELECT id FROM vocab_categories WHERE slug='problems-abroad'), 'Problems abroad', '海外でのトラブル', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-24'), s.id, x.ord FROM (VALUES
  ('currency.n.money',0),('exchange.v.swap',1),('customs.n.border',2),('visa.n.permit',3),('jetlag.n.tiredness',4),('crowded.adj.busy',5),('stranded.adj.stuck',6),('departure.n.leaving',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-24'), 'conversation', 0, 'Back from a trip', '旅行から帰って', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-24'), 'travel', 1, 'At departures', '出発ロビーで', 'airport', 'official'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-24'), 'business', 2, 'A travel mishap', '出張のトラブル', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 0, 'npc', 'Welcome back! How was the trip?', 'おかえり！旅行どうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 1, 'user', 'Amazing, but the {jetlag} is killing me.', '最高、でも時差ぼけがつらい。', 'jetlag', (SELECT id FROM vocab_senses WHERE slug='jetlag.n.tiredness'), ARRAY['jetlag','currency','customs','visa']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 2, 'npc', 'Ha, get some sleep. Smooth flights?', 'はは、寝なよ。フライトは順調？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 3, 'user', 'Not quite. We got {stranded} overnight by a storm.', 'そうでもない。嵐で一晩足止めされた。', 'stranded', (SELECT id FROM vocab_senses WHERE slug='stranded.adj.stuck'), ARRAY['stranded','crowded','jetlag','customs']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 4, 'npc', 'Oh no! Crowded airport?', 'うわ！空港は混んでた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 5, 'user', 'So {crowded}; people slept on the floor.', 'すごく混んでて、床で寝る人もいた。', 'crowded', (SELECT id FROM vocab_senses WHERE slug='crowded.adj.busy'), ARRAY['crowded','stranded','jetlag','customs']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 6, 'npc', 'Rough. Money go okay?', '大変。お金は大丈夫だった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 7, 'user', 'Yeah, though their {currency} was confusing.', 'うん、でも現地の通貨がややこしかった。', 'currency', (SELECT id FROM vocab_senses WHERE slug='currency.n.money'), ARRAY['currency','customs','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 8, 'npc', 'Did you change cash there?', '現地で両替した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 9, 'user', 'I had to {exchange} money at the airport.', '空港でお金を両替しなきゃいけなかった。', 'exchange', (SELECT id FROM vocab_senses WHERE slug='exchange.v.swap'), ARRAY['exchange','jetlag','crowded','stranded']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 10, 'npc', 'Any trouble at the border?', '国境で問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 11, 'user', 'No, {customs} was quick this time.', 'ううん、今回は税関が早かった。', 'customs', (SELECT id FROM vocab_senses WHERE slug='customs.n.border'), ARRAY['customs','currency','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 12, 'npc', 'Glad you''re home safe.', '無事に帰れてよかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 13, 'user', 'Me too, honestly.', '本当にね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='conversation'), 14, 'npc', 'Rest up, {{user_name}}.', 'ゆっくり休んで、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 0, 'npc', 'Passport and papers, please.', 'パスポートと書類をお願いします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 1, 'user', 'Here. My {visa} is valid for thirty days.', 'どうぞ。ビザは30日間有効です。', 'visa', (SELECT id FROM vocab_senses WHERE slug='visa.n.permit'), ARRAY['visa','currency','jetlag','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 2, 'npc', 'Thank you. Anything to declare?', 'ありがとう。申告するものは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 3, 'user', 'No, I already passed through {customs}.', 'いいえ、もう税関を通りました。', 'customs', (SELECT id FROM vocab_senses WHERE slug='customs.n.border'), ARRAY['customs','currency','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 4, 'npc', 'Good. Your flight is on time.', '結構です。便は定刻です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 5, 'user', 'Great, which gate is my {departure}?', 'よかった、出発はどのゲートですか？', 'departure', (SELECT id FROM vocab_senses WHERE slug='departure.n.leaving'), ARRAY['departure','currency','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 6, 'npc', 'Gate twelve, quite busy today.', '12番ゲート、今日は結構混んでます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 7, 'user', 'I noticed; it''s really {crowded}.', '気づきました、本当に混んでますね。', 'crowded', (SELECT id FROM vocab_senses WHERE slug='crowded.adj.busy'), ARRAY['crowded','stranded','jetlag','visa']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 8, 'npc', 'Do you need local money?', '現地のお金は必要ですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 9, 'user', 'Yes, where can I get some {currency}?', 'はい、通貨はどこで手に入りますか？', 'currency', (SELECT id FROM vocab_senses WHERE slug='currency.n.money'), ARRAY['currency','customs','visa','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 10, 'npc', 'There''s a counter past security.', '保安検査の先にカウンターがあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 11, 'user', 'Perfect, I''ll {exchange} some there.', '完璧、そこで両替します。', 'exchange', (SELECT id FROM vocab_senses WHERE slug='exchange.v.swap'), ARRAY['exchange','jetlag','crowded','stranded']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 12, 'npc', 'Safe travels!', 'よい旅を！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 13, 'user', 'Thank you!', 'ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='travel'), 14, 'npc', 'Enjoy your trip!', '旅行を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 0, 'npc', 'How did the overseas trip go?', '海外出張はどうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 1, 'user', 'Rough. I got {stranded} when my flight was canceled.', '大変。便が欠航して立ち往生した。', 'stranded', (SELECT id FROM vocab_senses WHERE slug='stranded.adj.stuck'), ARRAY['stranded','crowded','jetlag','customs']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 2, 'npc', 'That''s awful. Big delay?', 'ひどいね。大幅な遅れ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 3, 'user', 'Yes, my {departure} was pushed to the next day.', 'うん、出発が翌日にずれ込んだ。', 'departure', (SELECT id FROM vocab_senses WHERE slug='departure.n.leaving'), ARRAY['departure','currency','visa','jetlag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 4, 'npc', 'Was the airport chaos?', '空港は混乱してた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 5, 'user', 'Totally {crowded}; no hotel rooms left.', 'めちゃくちゃ混んでて、ホテルも満室。', 'crowded', (SELECT id FROM vocab_senses WHERE slug='crowded.adj.busy'), ARRAY['crowded','stranded','jetlag','customs']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 6, 'npc', 'Any issues entering the country?', '入国で問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 7, 'user', 'No, my business {visa} was fine.', 'いや、商用ビザは問題なかった。', 'visa', (SELECT id FROM vocab_senses WHERE slug='visa.n.permit'), ARRAY['visa','currency','jetlag','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 8, 'npc', 'And the border check?', '国境の検査は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 9, 'user', '{customs} took an hour with all the crowds.', '混雑で税関に1時間かかった。', 'customs', (SELECT id FROM vocab_senses WHERE slug='customs.n.border'), ARRAY['customs','currency','visa','departure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 10, 'npc', 'You must be exhausted.', '疲れきってるでしょ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 11, 'user', 'Terrible {jetlag}, but I made the meeting.', 'ひどい時差ぼけ、でも会議には間に合った。', 'jetlag', (SELECT id FROM vocab_senses WHERE slug='jetlag.n.tiredness'), ARRAY['jetlag','currency','customs','visa']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 12, 'npc', 'Well done for pushing through.', 'よく乗り切ったね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 13, 'user', 'Thanks, next time I''ll fly direct.', 'ありがとう、次は直行便にする。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-24') AND goal='business'), 14, 'npc', 'Good idea, {{user_name}}.', 'いい考え、{{user_name}}。', NULL, NULL, NULL);
