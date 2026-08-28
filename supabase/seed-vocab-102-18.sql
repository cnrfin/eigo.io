-- ============================================================================
-- Vocab 102: vocab-102-18 - Household problems  (Unit 6)
-- Words: leak, blocked, repair, plumber, electricity, damage, flood, spare.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('household-problems', 'Household problems', '家のトラブル', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('leak', 'leak', '/liːk/', '/liːk/', NULL, 4, FALSE, NULL),
  ('blocked', 'blocked', '/blɑːkt/', '/blɒkt/', NULL, 4, FALSE, NULL),
  ('repair', 'repair', '/rɪˈper/', '/rɪˈpeə/', NULL, 3, FALSE, NULL),
  ('plumber', 'plumber', '/ˈplʌmər/', '/ˈplʌmə/', NULL, 4, TRUE, 'b は発音しない。/ˈplʌmər/。'),
  ('electricity', 'electricity', '/ɪˌlekˈtrɪsəti/', '/ɪˌlekˈtrɪsəti/', NULL, 3, FALSE, NULL),
  ('damage', 'damage', '/ˈdæmɪdʒ/', '/ˈdæmɪdʒ/', NULL, 3, FALSE, NULL),
  ('flood', 'flood', '/flʌd/', '/flʌd/', NULL, 4, FALSE, NULL),
  ('spare', 'spare', '/sper/', '/speə/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='leak'), 'leak.n.drip', 1, TRUE, 'noun', '漏れ', 'a hole or crack that lets liquid or gas escape', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='blocked'), 'blocked.adj.clogged', 1, TRUE, 'adjective', '詰まった', 'unable to let water or air pass through', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='repair'), 'repair.v.fix', 1, TRUE, 'verb', '修理する', 'to fix something that is broken', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plumber'), 'plumber.n.worker', 1, TRUE, 'noun', '配管工', 'a person who fixes water pipes', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='electricity'), 'electricity.n.power', 1, TRUE, 'noun', '電気', 'the power that runs lights and machines', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='damage'), 'damage.n.harm', 1, TRUE, 'noun', '損傷', 'harm that makes something less good or useful', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='flood'), 'flood.n.water', 1, TRUE, 'noun', '洪水', 'a large amount of water covering a place', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spare'), 'spare.adj.extra', 1, TRUE, 'adjective', '予備の', 'kept in case you need it later; extra', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('leak', 'blocked', 'repair', 'plumber', 'electricity', 'damage', 'flood', 'spare')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='household-problems'
WHERE s.slug IN ('leak.n.drip', 'blocked.adj.clogged', 'repair.v.fix', 'plumber.n.worker', 'electricity.n.power', 'damage.n.harm', 'flood.n.water', 'spare.adj.extra')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-18', 6, 2, (SELECT id FROM vocab_categories WHERE slug='household-problems'), 'Household problems', '家のトラブル', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-18'), s.id, x.ord FROM (VALUES
  ('leak.n.drip',0),('blocked.adj.clogged',1),('repair.v.fix',2),('plumber.n.worker',3),('electricity.n.power',4),('damage.n.harm',5),('flood.n.water',6),('spare.adj.extra',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-18'), 'conversation', 0, 'Something broke at home', '家の不具合', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-18'), 'travel', 1, 'A problem at the rental', '貸家のトラブル', 'house', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-18'), 'business', 2, 'Facilities issues', '設備トラブル', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 0, 'npc', 'You sound stressed. What''s up?', 'ストレスたまってそう。どうしたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 1, 'user', 'There''s a water {leak} under my kitchen sink.', 'キッチンのシンクの下で水漏れしてる。', 'leak', (SELECT id FROM vocab_senses WHERE slug='leak.n.drip'), ARRAY['leak','damage','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 2, 'npc', 'Oh no. Is it bad?', 'うわ。ひどい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 3, 'user', 'I called a {plumber} to come today.', '今日、配管工を呼んだ。', 'plumber', (SELECT id FROM vocab_senses WHERE slug='plumber.n.worker'), ARRAY['plumber','damage','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 4, 'npc', 'Good. Anything else wrong?', 'よかった。他に問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 5, 'user', 'Yeah, the bathroom drain is {blocked} too.', 'うん、風呂の排水も詰まってる。', 'blocked', (SELECT id FROM vocab_senses WHERE slug='blocked.adj.clogged'), ARRAY['blocked','spare','damage','flood']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 6, 'npc', 'When it rains, it pours!', '不運は重なるね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 7, 'user', 'And the {electricity} keeps cutting out.', 'それに電気がしょっちゅう切れる。', 'electricity', (SELECT id FROM vocab_senses WHERE slug='electricity.n.power'), ARRAY['electricity','leak','damage','flood']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 8, 'npc', 'That''s a lot at once.', '一度に大変だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 9, 'user', 'The landlord will {repair} everything tomorrow.', '大家さんが明日全部直してくれる。', 'repair', (SELECT id FROM vocab_senses WHERE slug='repair.v.fix'), ARRAY['repair','leak','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 10, 'npc', 'Do you have a backup for tonight?', '今夜の備えはある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 11, 'user', 'Luckily I have a {spare} flashlight.', '運よく予備の懐中電灯がある。', 'spare', (SELECT id FROM vocab_senses WHERE slug='spare.adj.extra'), ARRAY['spare','blocked','leak','flood']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 12, 'npc', 'Stay at mine if you need to.', '必要ならうちに泊まって。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 13, 'user', 'Thanks, I might!', 'ありがとう、そうするかも！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='conversation'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 0, 'npc', 'Is everything okay with the cottage?', 'コテージはどうですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 1, 'user', 'Not quite. Heavy rain caused a small {flood} in the hall.', '少し問題が。大雨で玄関がちょっと浸水しました。', 'flood', (SELECT id FROM vocab_senses WHERE slug='flood.n.water'), ARRAY['flood','leak','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 2, 'npc', 'I''m so sorry! Any harm to your things?', '申し訳ない！持ち物に被害は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 3, 'user', 'A little {damage} to my suitcase, nothing major.', 'スーツケースに少し損傷が、大したことはないです。', 'damage', (SELECT id FROM vocab_senses WHERE slug='damage.n.harm'), ARRAY['damage','flood','leak','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 4, 'npc', 'I''ll cover that, of course.', 'もちろん弁償します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 5, 'user', 'Thanks. There''s also a {leak} in the roof.', 'ありがとう。屋根にも雨漏りがあります。', 'leak', (SELECT id FROM vocab_senses WHERE slug='leak.n.drip'), ARRAY['leak','blocked','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 6, 'npc', 'The roof? I''ll send someone.', '屋根が？人をよこします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 7, 'user', 'Could they {repair} it before the weekend?', '週末までに直せますか？', 'repair', (SELECT id FROM vocab_senses WHERE slug='repair.v.fix'), ARRAY['repair','flood','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 8, 'npc', 'Yes, tomorrow morning.', 'はい、明日の朝に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 9, 'user', 'Also, the shower drain is {blocked}.', 'あと、シャワーの排水が詰まってます。', 'blocked', (SELECT id FROM vocab_senses WHERE slug='blocked.adj.clogged'), ARRAY['blocked','flood','leak','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 10, 'npc', 'Noted. Anything electrical?', '了解。電気の問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 11, 'user', 'The {electricity} in the kitchen is off.', 'キッチンの電気が止まってます。', 'electricity', (SELECT id FROM vocab_senses WHERE slug='electricity.n.power'), ARRAY['electricity','flood','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 12, 'npc', 'I''ll have it all fixed fast.', 'すぐ全部直させます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 13, 'user', 'Thank you so much.', '本当にありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='travel'), 14, 'npc', 'Enjoy the rest of your stay!', '残りの滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 0, 'npc', 'Facilities said the office has issues.', '施設担当がオフィスに問題ありと。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 1, 'user', 'Yes, the {electricity} tripped on the third floor.', 'はい、3階で電気が落ちました。', 'electricity', (SELECT id FROM vocab_senses WHERE slug='electricity.n.power'), ARRAY['electricity','leak','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 2, 'npc', 'Anyone stuck in the lift?', 'エレベーターに閉じ込められた人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 3, 'user', 'No, but we need a {repair} team fast.', 'いいえ、でも早く修理チームが必要。', 'repair', (SELECT id FROM vocab_senses WHERE slug='repair.v.fix'), ARRAY['repair','leak','flood','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 4, 'npc', 'What else?', '他には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 5, 'user', 'The men''s room sink is {blocked}.', '男子トイレの流しが詰まってます。', 'blocked', (SELECT id FROM vocab_senses WHERE slug='blocked.adj.clogged'), ARRAY['blocked','spare','damage','flood']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 6, 'npc', 'Ugh. Get a plumber.', 'うわ。配管工を呼んで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 7, 'user', 'Already did. There''s a {leak} in the ceiling too.', 'もう呼びました。天井にも水漏れが。', 'leak', (SELECT id FROM vocab_senses WHERE slug='leak.n.drip'), ARRAY['leak','blocked','damage','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 8, 'npc', 'Any damage to equipment?', '機器への被害は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 9, 'user', 'Some {damage} to a printer from the water.', '水でプリンターが少し損傷しました。', 'damage', (SELECT id FROM vocab_senses WHERE slug='damage.n.harm'), ARRAY['damage','blocked','leak','spare']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 10, 'npc', 'Do we have backups?', '予備はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 11, 'user', 'Yes, a {spare} printer in storage.', 'はい、倉庫に予備のプリンターが。', 'spare', (SELECT id FROM vocab_senses WHERE slug='spare.adj.extra'), ARRAY['spare','blocked','leak','damage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 12, 'npc', 'Good. Handle it today.', 'よし。今日中に対応して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 13, 'user', 'On it.', '了解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-18') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
