-- ============================================================================
-- Vocab 102: vocab-102-14 - Bills & spending  (Unit 5)
-- Words: pay off, cut back, pay back, run out, top up, take out, get by, splash out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('bills-spending', 'Bills & spending', '支払いと出費', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pay off', 'pay off', '/ˌpeɪ ˈɔːf/', '/ˌpeɪ ˈɒf/', NULL, 4, FALSE, NULL),
  ('cut back', 'cut back', '/ˌkʌt ˈbæk/', '/ˌkʌt ˈbæk/', NULL, 4, FALSE, NULL),
  ('pay back', 'pay back', '/ˌpeɪ ˈbæk/', '/ˌpeɪ ˈbæk/', NULL, 3, FALSE, NULL),
  ('run out', 'run out', '/ˌrʌn ˈaʊt/', '/ˌrʌn ˈaʊt/', NULL, 3, FALSE, NULL),
  ('top up', 'top up', '/ˌtɑːp ˈʌp/', '/ˌtɒp ˈʌp/', NULL, 4, FALSE, NULL),
  ('take out', 'take out', '/ˌteɪk ˈaʊt/', '/ˌteɪk ˈaʊt/', NULL, 4, FALSE, NULL),
  ('get by', 'get by', '/ˌɡet ˈbaɪ/', '/ˌɡet ˈbaɪ/', NULL, 4, FALSE, NULL),
  ('splash out', 'splash out', '/ˌsplæʃ ˈaʊt/', '/ˌsplæʃ ˈaʊt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pay off'), 'pay-off.phrv.clear', 1, TRUE, 'phrasal verb', '完済する', 'to finish paying money that you owe', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cut back'), 'cut-back.phrv.reduce', 1, TRUE, 'phrasal verb', '切り詰める', 'to spend or use less of something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pay back'), 'pay-back.phrv.repay', 1, TRUE, 'phrasal verb', '返済する', 'to return money you borrowed from someone', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='run out'), 'run-out.phrv.deplete', 1, TRUE, 'phrasal verb', '使い果たす', 'to have none of something left', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='top up'), 'top-up.phrv.refill', 1, TRUE, 'phrasal verb', 'チャージする', 'to add money or credit to something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take out'), 'take-out.phrv.withdraw', 1, TRUE, 'phrasal verb', '引き出す', 'to remove money from a bank, or get a loan', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get by'), 'get-by.phrv.manage', 1, TRUE, 'phrasal verb', '何とかやっていく', 'to manage with the money or things you have', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='splash out'), 'splash-out.phrv.spend', 1, TRUE, 'phrasal verb', '奮発する', 'to spend a lot of money on something special', 'B2', 'くだけた言い方。')
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pay off', 'cut back', 'pay back', 'run out', 'top up', 'take out', 'get by', 'splash out')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='bills-spending'
WHERE s.slug IN ('pay-off.phrv.clear', 'cut-back.phrv.reduce', 'pay-back.phrv.repay', 'run-out.phrv.deplete', 'top-up.phrv.refill', 'take-out.phrv.withdraw', 'get-by.phrv.manage', 'splash-out.phrv.spend')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-14', 5, 1, (SELECT id FROM vocab_categories WHERE slug='bills-spending'), 'Bills & spending', '支払いと出費', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-14'), s.id, x.ord FROM (VALUES
  ('pay-off.phrv.clear',0),('cut-back.phrv.reduce',1),('pay-back.phrv.repay',2),('run-out.phrv.deplete',3),('top-up.phrv.refill',4),('take-out.phrv.withdraw',5),('get-by.phrv.manage',6),('splash-out.phrv.spend',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-14'), 'conversation', 0, 'Getting finances in order', '家計の立て直し', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-14'), 'travel', 1, 'Money on the road', '旅先でのお金', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-14'), 'business', 2, 'Cutting company costs', '経費削減', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 0, 'npc', 'How''s the new budget going?', '新しい予算はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 1, 'user', 'Good. I had to {cut back} on eating out.', 'いい感じ。外食を切り詰めた。', 'cut back', (SELECT id FROM vocab_senses WHERE slug='cut-back.phrv.reduce'), ARRAY['cut back','splash out','top up','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 2, 'npc', 'That adds up fast.', 'それ、すぐ差が出るよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 3, 'user', 'It does. I''m trying to {pay off} my credit card.', 'そうなの。クレカを完済しようとしてる。', 'pay off', (SELECT id FROM vocab_senses WHERE slug='pay-off.phrv.clear'), ARRAY['pay off','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 4, 'npc', 'Nice goal. Almost done?', 'いい目標。もうすぐ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 5, 'user', 'Close, but I always {run out} of money by month-end.', 'もう少し、でも月末にはいつもお金が尽きる。', 'run out', (SELECT id FROM vocab_senses WHERE slug='run-out.phrv.deplete'), ARRAY['run out','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 6, 'npc', 'Tough. Do you manage okay?', '大変。何とかなってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 7, 'user', 'I {get by}, just barely.', 'ぎりぎり何とかやってる。', 'get by', (SELECT id FROM vocab_senses WHERE slug='get-by.phrv.manage'), ARRAY['get by','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 8, 'npc', 'Did you pay me for the concert yet?', 'コンサート代、もう払った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 9, 'user', 'Oh! Let me {pay back} that now.', 'あ！今返すね。', 'pay back', (SELECT id FROM vocab_senses WHERE slug='pay-back.phrv.repay'), ARRAY['pay back','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 10, 'npc', 'Thanks. Treat yourself sometimes, though.', 'ありがとう。でもたまには自分にご褒美を。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 11, 'user', 'Maybe. I might {splash out} on a nice dinner once.', 'かもね。一度いいディナーに奮発するかも。', 'splash out', (SELECT id FROM vocab_senses WHERE slug='splash-out.phrv.spend'), ARRAY['splash out','cut back','run out','get by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 12, 'npc', 'You deserve it.', 'その価値あるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 13, 'user', 'After the card''s paid, yeah.', 'カードを返してからね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='conversation'), 14, 'npc', 'Good discipline, {{user_name}}.', 'えらいね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 0, 'npc', 'Do you have cash for the market?', '市場用の現金ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 1, 'user', 'Not yet. I need to {take out} some from an ATM.', 'まだ。ATMで引き出さないと。', 'take out', (SELECT id FROM vocab_senses WHERE slug='take-out.phrv.withdraw'), ARRAY['take out','top up','pay off','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 2, 'npc', 'There''s one around the corner.', '角を曲がったところにあるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 3, 'user', 'Great. I''ll also {top up} my travel card.', 'いいね。交通カードもチャージする。', 'top up', (SELECT id FROM vocab_senses WHERE slug='top-up.phrv.refill'), ARRAY['top up','pay off','pay back','run out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 4, 'npc', 'Good, buses only take the card.', 'うん、バスはカードだけだから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 5, 'user', 'I don''t want to {run out} of credit mid-trip.', '旅の途中で残高がなくなるのは嫌。', 'run out', (SELECT id FROM vocab_senses WHERE slug='run-out.phrv.deplete'), ARRAY['run out','pay off','pay back','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 6, 'npc', 'Smart. Traveling on a budget?', '賢い。節約旅行？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 7, 'user', 'Yeah, but I {get by} fine on street food.', 'うん、でも屋台で十分やっていける。', 'get by', (SELECT id FROM vocab_senses WHERE slug='get-by.phrv.manage'), ARRAY['get by','top up','pay off','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 8, 'npc', 'It''s delicious and cheap here.', 'ここのは美味しくて安い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 9, 'user', 'Exactly. I {cut back} on fancy restaurants.', 'そう。高級店は控えてる。', 'cut back', (SELECT id FROM vocab_senses WHERE slug='cut-back.phrv.reduce'), ARRAY['cut back','top up','pay off','run out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 10, 'npc', 'But treat yourself once, right?', 'でも一度は贅沢するでしょ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 11, 'user', 'For sure. I''ll {splash out} on one special meal.', 'もちろん。一度は特別な食事に奮発する。', 'splash out', (SELECT id FROM vocab_senses WHERE slug='splash-out.phrv.spend'), ARRAY['splash out','cut back','run out','get by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 12, 'npc', 'The harbor restaurant is worth it.', '港のレストランは行く価値あるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 13, 'user', 'Let''s save that for the last night.', '最終夜のために取っておこう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='travel'), 14, 'npc', 'Perfect plan!', '完璧な計画！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 0, 'npc', 'Finance wants us to reduce costs.', '財務が経費削減を求めてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 1, 'user', 'Okay. We can {cut back} on travel expenses.', '了解。出張費を切り詰められる。', 'cut back', (SELECT id FROM vocab_senses WHERE slug='cut-back.phrv.reduce'), ARRAY['cut back','splash out','top up','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 2, 'npc', 'Good. Any loans to clear?', 'いいね。返すローンは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 3, 'user', 'Yes, we should {pay off} the equipment loan early.', 'うん、設備ローンは早めに完済すべき。', 'pay off', (SELECT id FROM vocab_senses WHERE slug='pay-off.phrv.clear'), ARRAY['pay off','top up','splash out','take out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 4, 'npc', 'Do we need new machines this year?', '今年、新しい機械は必要？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 5, 'user', 'If so, we''d have to {take out} another loan.', 'もし必要なら、別のローンを組むことになる。', 'take out', (SELECT id FROM vocab_senses WHERE slug='take-out.phrv.withdraw'), ARRAY['take out','top up','pay back','run out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 6, 'npc', 'Let''s avoid that.', 'それは避けよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 7, 'user', 'Agreed. We can {get by} with the current ones.', '賛成。今のもので何とかやっていける。', 'get by', (SELECT id FROM vocab_senses WHERE slug='get-by.phrv.manage'), ARRAY['get by','top up','pay back','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 8, 'npc', 'What about the supply budget?', '備品の予算は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 9, 'user', 'We nearly {run out} of materials last month.', '先月、資材がほぼ底をついた。', 'run out', (SELECT id FROM vocab_senses WHERE slug='run-out.phrv.deplete'), ARRAY['run out','top up','pay off','splash out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 10, 'npc', 'Let''s plan better this time.', '今回はもっと計画的に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 11, 'user', 'I''ll {top up} the stock before it''s critical.', '危なくなる前に在庫を補充する。', 'top up', (SELECT id FROM vocab_senses WHERE slug='top-up.phrv.refill'), ARRAY['top up','cut back','run out','get by']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 12, 'npc', 'Great. Send me the numbers.', 'いいね。数字を送って。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 13, 'user', 'On it.', '了解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-14') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
