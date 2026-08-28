-- ============================================================================
-- Vocab 103: vocab-103-8 - Financial decisions  (Unit 4)
-- Words: weigh up, bank on, fall through, make ends meet, break even, in the red, nest egg, live within your means.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('financial-decisions', 'Financial decisions', 'お金の判断', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('weigh up', 'weigh up', '/ˌweɪ ˈʌp/', '/ˌweɪ ˈʌp/', NULL, 5, FALSE, NULL),
  ('bank on', 'bank on', '/ˈbæŋk ɑːn/', '/ˈbæŋk ɒn/', NULL, 5, FALSE, NULL),
  ('fall through', 'fall through', '/ˌfɔːl ˈθruː/', '/ˌfɔːl ˈθruː/', NULL, 5, FALSE, NULL),
  ('make ends meet', 'make ends meet', '/ˌmeɪk endz ˈmiːt/', '/ˌmeɪk endz ˈmiːt/', NULL, 5, FALSE, NULL),
  ('break even', 'break even', '/ˌbreɪk ˈiːvn/', '/ˌbreɪk ˈiːvn/', NULL, 5, FALSE, NULL),
  ('in the red', 'in the red', '/ˌɪn ðə ˈred/', '/ˌɪn ðə ˈred/', NULL, 5, FALSE, NULL),
  ('nest egg', 'nest egg', '/ˈnest eɡ/', '/ˈnest eɡ/', NULL, 5, FALSE, NULL),
  ('live within your means', 'live within your means', '/ˌlɪv wɪðɪn jər ˈmiːnz/', '/ˌlɪv wɪðɪn jə ˈmiːnz/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='weigh up'), 'weigh-up.phrv.assess', 1, TRUE, 'phrasal verb', 'よく検討する', 'to consider something carefully before deciding', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bank on'), 'bank-on.phrv.rely', 1, TRUE, 'phrasal verb', '当てにする', 'to rely on something happening', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fall through'), 'fall-through.phrv.fail', 1, TRUE, 'phrasal verb', '（計画が）流れる', 'to fail to happen after being planned', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='make ends meet'), 'make-ends-meet.idiom.manage', 1, TRUE, 'idiom', '収支を合わせる', 'to have just enough money to live on', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='break even'), 'break-even.idiom.balance', 1, TRUE, 'idiom', '収支トントンになる', 'to make neither a profit nor a loss', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='in the red'), 'in-the-red.idiom.debt', 1, TRUE, 'idiom', '赤字で', 'owing money to the bank; in debt', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='nest egg'), 'nest-egg.idiom.savings', 1, TRUE, 'idiom', '蓄え', 'an amount of money saved for the future', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='live within your means'), 'live-within-means.idiom.budget', 1, TRUE, 'idiom', '分相応に暮らす', 'to spend only as much as you can afford', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('weigh up', 'bank on', 'fall through', 'make ends meet', 'break even', 'in the red', 'nest egg', 'live within your means')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='break-even.idiom.balance'), (SELECT id FROM vocab_senses WHERE slug='in-the-red.idiom.debt'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='financial-decisions'
WHERE s.slug IN ('weigh-up.phrv.assess', 'bank-on.phrv.rely', 'fall-through.phrv.fail', 'make-ends-meet.idiom.manage', 'break-even.idiom.balance', 'in-the-red.idiom.debt', 'nest-egg.idiom.savings', 'live-within-means.idiom.budget')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-8', 4, 1, (SELECT id FROM vocab_categories WHERE slug='financial-decisions'), 'Financial decisions', 'お金の判断', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-8'), s.id, x.ord FROM (VALUES
  ('weigh-up.phrv.assess',0),('bank-on.phrv.rely',1),('fall-through.phrv.fail',2),('make-ends-meet.idiom.manage',3),('break-even.idiom.balance',4),('in-the-red.idiom.debt',5),('nest-egg.idiom.savings',6),('live-within-means.idiom.budget',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-8'), 'conversation', 0, 'A money decision', 'お金の決断', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-8'), 'travel', 1, 'Funding a big trip', '長期旅行の資金', 'home', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-8'), 'business', 2, 'Reviewing finances', '財務の見直し', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 0, 'npc', 'Are you buying that flat?', 'あのアパート買うの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 1, 'user', 'I still need to {weigh up} the pros and cons.', 'まだメリットとデメリットをよく検討しないと。', 'weigh up', (SELECT id FROM vocab_senses WHERE slug='weigh-up.phrv.assess'), ARRAY['weigh up','bank on','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 2, 'npc', 'Big commitment.', '大きな決断だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 3, 'user', 'Yeah, I can''t {bank on} a pay rise to cover it.', 'うん、昇給を当てにはできない。', 'bank on', (SELECT id FROM vocab_senses WHERE slug='bank-on.phrv.rely'), ARRAY['bank on','weigh up','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 4, 'npc', 'Do you have savings?', '貯金はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 5, 'user', 'A small {nest egg}, but not huge.', '少し蓄えはあるけど、大きくはない。', 'nest egg', (SELECT id FROM vocab_senses WHERE slug='nest-egg.idiom.savings'), ARRAY['nest egg','break even','in the red','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 6, 'npc', 'Could the mortgage strain you?', 'ローンで苦しくなる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 7, 'user', 'Maybe; it''d be hard to {make ends meet}.', 'かも、収支を合わせるのが大変になる。', 'make ends meet', (SELECT id FROM vocab_senses WHERE slug='make-ends-meet.idiom.manage'), ARRAY['make ends meet','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 8, 'npc', 'Better to be careful.', '慎重な方がいい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 9, 'user', 'Right, I try to {live within your means}.', 'うん、分相応に暮らすようにしてる。', 'live within your means', (SELECT id FROM vocab_senses WHERE slug='live-within-means.idiom.budget'), ARRAY['live within your means','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 10, 'npc', 'What if the sale collapses?', '売買が流れたら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 11, 'user', 'If the deal {fall through}, I''ll keep renting.', '話が流れたら、賃貸を続けるよ。', 'fall through', (SELECT id FROM vocab_senses WHERE slug='fall-through.phrv.fail'), ARRAY['fall through','weigh up','bank on','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 12, 'npc', 'Sensible either way.', 'どっちにしても賢明。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 13, 'user', 'Thanks for the advice.', 'アドバイスありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='conversation'), 14, 'npc', 'Anytime, {{user_name}}.', 'いつでも、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 0, 'npc', 'How are you funding this year-long trip?', 'この1年の旅、どうやって資金を？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 1, 'user', 'I saved a {nest egg} over three years.', '3年かけて蓄えを作った。', 'nest egg', (SELECT id FROM vocab_senses WHERE slug='nest-egg.idiom.savings'), ARRAY['nest egg','break even','in the red','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 2, 'npc', 'Impressive discipline.', 'すごい自制心。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 3, 'user', 'I had to {weigh up} travel versus saving.', '旅行と貯金を天秤にかけて検討した。', 'weigh up', (SELECT id FROM vocab_senses WHERE slug='weigh-up.phrv.assess'), ARRAY['weigh up','bank on','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 4, 'npc', 'Any sponsorship?', 'スポンサーは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 5, 'user', 'No, I won''t {bank on} outside money.', 'いや、外部の資金は当てにしない。', 'bank on', (SELECT id FROM vocab_senses WHERE slug='bank-on.phrv.rely'), ARRAY['bank on','weigh up','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 6, 'npc', 'What if a booking dies?', '予約がダメになったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 7, 'user', 'If plans {fall through}, I adapt.', '計画が流れたら、臨機応変にやる。', 'fall through', (SELECT id FROM vocab_senses WHERE slug='fall-through.phrv.fail'), ARRAY['fall through','weigh up','bank on','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 8, 'npc', 'Will you work abroad?', '現地で働く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 9, 'user', 'Some odd jobs to {make ends meet}.', '収支を合わせるために単発の仕事を。', 'make ends meet', (SELECT id FROM vocab_senses WHERE slug='make-ends-meet.idiom.manage'), ARRAY['make ends meet','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 10, 'npc', 'Just don''t overspend.', '使いすぎないでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 11, 'user', 'True, I never want to end up {in the red}.', 'うん、赤字にはなりたくない。', 'in the red', (SELECT id FROM vocab_senses WHERE slug='in-the-red.idiom.debt'), ARRAY['in the red','break even','make ends meet','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 12, 'npc', 'Wise traveler.', '賢い旅人だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 13, 'user', 'Learned the hard way!', '痛い目で学んだ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='travel'), 14, 'npc', 'Safe travels!', '気をつけて！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 0, 'npc', 'How did the quarter go financially?', '今期の財務はどうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 1, 'user', 'We managed to {break even}, just.', '何とか収支トントンになった、ぎりぎり。', 'break even', (SELECT id FROM vocab_senses WHERE slug='break-even.idiom.balance'), ARRAY['break even','in the red','nest egg','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 2, 'npc', 'Better than last year.', '去年より良い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 3, 'user', 'Yes, last year we were {in the red}.', 'うん、去年は赤字だった。', 'in the red', (SELECT id FROM vocab_senses WHERE slug='in-the-red.idiom.debt'), ARRAY['in the red','break even','nest egg','make ends meet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 4, 'npc', 'Should we expand now?', '今、拡大すべき？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 5, 'user', 'Let''s {weigh up} the risks first.', 'まずリスクをよく検討しよう。', 'weigh up', (SELECT id FROM vocab_senses WHERE slug='weigh-up.phrv.assess'), ARRAY['weigh up','bank on','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 6, 'npc', 'Can we count on the new client?', '新しいクライアントを当てにできる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 7, 'user', 'We shouldn''t {bank on} them signing yet.', 'まだ契約を当てにすべきじゃない。', 'bank on', (SELECT id FROM vocab_senses WHERE slug='bank-on.phrv.rely'), ARRAY['bank on','weigh up','fall through','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 8, 'npc', 'What if the deal dies?', '契約がダメになったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 9, 'user', 'If it {fall through}, we hold steady.', '流れたら、現状維持でいく。', 'fall through', (SELECT id FROM vocab_senses WHERE slug='fall-through.phrv.fail'), ARRAY['fall through','weigh up','bank on','break even']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 10, 'npc', 'And cash flow for staff?', '人件費のキャッシュフローは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 11, 'user', 'Tight, but we can {make ends meet}.', '厳しいけど、収支は合わせられる。', 'make ends meet', (SELECT id FROM vocab_senses WHERE slug='make-ends-meet.idiom.manage'), ARRAY['make ends meet','break even','in the red','nest egg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 12, 'npc', 'Careful and steady, then.', 'じゃあ慎重に着実に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 13, 'user', 'Exactly.', 'その通り。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-8') AND goal='business'), 14, 'npc', 'Good sense, {{user_name}}.', 'いい判断、{{user_name}}。', NULL, NULL, NULL);
