-- ============================================================================
-- Vocab 102: vocab-102-13 - Managing money  (Unit 5)
-- Words: budget, save up, afford, borrow, lend, owe, debt, spend.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('managing-money', 'Managing money', 'お金の管理', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('budget', 'budget', '/ˈbʌdʒɪt/', '/ˈbʌdʒɪt/', NULL, 3, FALSE, NULL),
  ('save up', 'save up', '/ˌseɪv ˈʌp/', '/ˌseɪv ˈʌp/', NULL, 3, FALSE, NULL),
  ('afford', 'afford', '/əˈfɔːrd/', '/əˈfɔːd/', NULL, 3, FALSE, NULL),
  ('borrow', 'borrow', '/ˈbɑːroʊ/', '/ˈbɒrəʊ/', NULL, 3, FALSE, NULL),
  ('lend', 'lend', '/lend/', '/lend/', NULL, 3, FALSE, NULL),
  ('owe', 'owe', '/oʊ/', '/əʊ/', NULL, 4, TRUE, '/oʊ/。「オウ」。w は発音しない。'),
  ('debt', 'debt', '/det/', '/det/', NULL, 4, TRUE, 'b は発音しない。/det/。'),
  ('spend', 'spend', '/spend/', '/spend/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='budget'), 'budget.n.plan', 1, TRUE, 'noun', '予算', 'a plan of how much money you can spend', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='save up'), 'save-up.phrv.store', 1, TRUE, 'phrasal verb', '貯金する', 'to keep money so you can use it later', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='afford'), 'afford.v.manage', 1, TRUE, 'verb', '買う余裕がある', 'to have enough money for something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='borrow'), 'borrow.v.take', 1, TRUE, 'verb', '借りる', 'to take and use something you will give back', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lend'), 'lend.v.give', 1, TRUE, 'verb', '貸す', 'to give something to someone for a short time', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='owe'), 'owe.v.debt', 1, TRUE, 'verb', '借りがある', 'to need to pay money back to someone', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='debt'), 'debt.n.money', 1, TRUE, 'noun', '借金', 'money that you owe to someone', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spend'), 'spend.v.pay', 1, TRUE, 'verb', '（お金を）使う', 'to use money to buy things', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('budget', 'save up', 'afford', 'borrow', 'lend', 'owe', 'debt', 'spend')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='borrow.v.take'), (SELECT id FROM vocab_senses WHERE slug='lend.v.give'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='lend.v.give'), (SELECT id FROM vocab_senses WHERE slug='borrow.v.take'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='managing-money'
WHERE s.slug IN ('budget.n.plan', 'save-up.phrv.store', 'afford.v.manage', 'borrow.v.take', 'lend.v.give', 'owe.v.debt', 'debt.n.money', 'spend.v.pay')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-13', 5, 0, (SELECT id FROM vocab_categories WHERE slug='managing-money'), 'Managing money', 'お金の管理', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-13'), s.id, x.ord FROM (VALUES
  ('budget.n.plan',0),('save-up.phrv.store',1),('afford.v.manage',2),('borrow.v.take',3),('lend.v.give',4),('owe.v.debt',5),('debt.n.money',6),('spend.v.pay',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-13'), 'conversation', 0, 'Saving for a trip', '旅行のために貯金', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-13'), 'travel', 1, 'Splitting costs', '費用の分担', 'street', 'travel buddy'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-13'), 'business', 2, 'A budget meeting', '予算会議', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 0, 'npc', 'Are you coming on the ski trip?', 'スキー旅行来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 1, 'user', 'I want to, but I need to {save up} first.', '行きたいけど、まず貯金しないと。', 'save up', (SELECT id FROM vocab_senses WHERE slug='save-up.phrv.store'), ARRAY['save up','spend','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 2, 'npc', 'How much is it?', 'いくらなの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 3, 'user', 'A lot. I''m not sure I can {afford} it.', '結構する。買う余裕があるか分からない。', 'afford', (SELECT id FROM vocab_senses WHERE slug='afford.v.manage'), ARRAY['afford','borrow','lend','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 4, 'npc', 'Make a plan for it.', '計画を立てなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 5, 'user', 'Good idea. I''ll set a monthly {budget}.', 'いい考え。毎月の予算を決める。', 'budget', (SELECT id FROM vocab_senses WHERE slug='budget.n.plan'), ARRAY['budget','debt','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 6, 'npc', 'And cut out coffee shops!', 'カフェ通いをやめて！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 7, 'user', 'Ha, true. I {spend} too much on coffee.', 'はは、確かに。コーヒーに使いすぎ。', 'spend', (SELECT id FROM vocab_senses WHERE slug='spend.v.pay'), ARRAY['spend','save up','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 8, 'npc', 'You could ask your brother for help.', 'お兄さんに頼めば？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 9, 'user', 'I don''t like to {borrow} money from family.', '家族からお金を借りるのは好きじゃない。', 'borrow', (SELECT id FROM vocab_senses WHERE slug='borrow.v.take'), ARRAY['borrow','lend','spend','afford']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 10, 'npc', 'Fair. Independence feels good.', '分かる。自立はいいよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 11, 'user', 'Right. I hate to {owe} anyone.', 'うん。誰かに借りがあるのは嫌。', 'owe', (SELECT id FROM vocab_senses WHERE slug='owe.v.debt'), ARRAY['owe','spend','save up','budget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 12, 'npc', 'You''ll get there by winter.', '冬までには貯まるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 13, 'user', 'That''s the goal!', 'それが目標！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='conversation'), 14, 'npc', 'Save hard, {{user_name}}!', 'しっかり貯めてね、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 0, 'npc', 'The taxi was more than we thought.', 'タクシー、思ったより高かった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 1, 'user', 'No worries, I can {lend} you some cash.', '大丈夫、少し貸すよ。', 'lend', (SELECT id FROM vocab_senses WHERE slug='lend.v.give'), ARRAY['lend','borrow','owe','spend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 2, 'npc', 'Thanks! I''ll pay you back tonight.', 'ありがとう！今夜返すね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 3, 'user', 'No rush. You don''t {owe} me much.', '急がないで。そんなに借りはないよ。', 'owe', (SELECT id FROM vocab_senses WHERE slug='owe.v.debt'), ARRAY['owe','lend','spend','afford']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 4, 'npc', 'Still, I keep track.', 'でも記録はしてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 5, 'user', 'Same. I keep a travel {budget} on my phone.', '私も。スマホで旅行の予算をつけてる。', 'budget', (SELECT id FROM vocab_senses WHERE slug='budget.n.plan'), ARRAY['budget','debt','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 6, 'npc', 'Smart. Are we overspending?', '賢い。使いすぎてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 7, 'user', 'A little. We {spend} a lot on food.', '少し。食事にお金を使いすぎ。', 'spend', (SELECT id FROM vocab_senses WHERE slug='spend.v.pay'), ARRAY['spend','lend','borrow','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 8, 'npc', 'Let''s cook tomorrow to save.', '明日は自炊で節約しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 9, 'user', 'Good plan. Then we can {afford} the boat tour.', 'いいね。そうすればボートツアーに行ける。', 'afford', (SELECT id FROM vocab_senses WHERE slug='afford.v.manage'), ARRAY['afford','lend','borrow','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 10, 'npc', 'Yes! I really want to do that.', 'うん！それすごくやりたい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 11, 'user', 'If you''re short, you can {borrow} from me.', '足りなかったら私から借りていいよ。', 'borrow', (SELECT id FROM vocab_senses WHERE slug='borrow.v.take'), ARRAY['borrow','lend','spend','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 12, 'npc', 'You''re a lifesaver.', '助かるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 13, 'user', 'We look after each other.', 'お互い様だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='travel'), 14, 'npc', 'Best travel buddy, {{user_name}}.', '最高の旅仲間だね、{{user_name}}。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 0, 'npc', 'We need to review the team finances.', 'チームの財務を見直す必要がある。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 1, 'user', 'Sure. Our {budget} is tight this quarter.', '了解。今期は予算が厳しい。', 'budget', (SELECT id FROM vocab_senses WHERE slug='budget.n.plan'), ARRAY['budget','debt','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 2, 'npc', 'Where can we cut?', 'どこを削れる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 3, 'user', 'We {spend} too much on software licenses.', 'ソフトのライセンスに使いすぎてる。', 'spend', (SELECT id FROM vocab_senses WHERE slug='spend.v.pay'), ARRAY['spend','save up','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 4, 'npc', 'Can we drop a few tools?', 'ツールをいくつか減らせる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 5, 'user', 'Yes, we can''t {afford} all of them.', 'うん、全部は買う余裕がない。', 'afford', (SELECT id FROM vocab_senses WHERE slug='afford.v.manage'), ARRAY['afford','borrow','lend','owe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 6, 'npc', 'Any outstanding bills?', '未払いの請求は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 7, 'user', 'We still {owe} the printing company.', '印刷会社にまだ借りがある。', 'owe', (SELECT id FROM vocab_senses WHERE slug='owe.v.debt'), ARRAY['owe','spend','save up','budget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 8, 'npc', 'Let''s clear that first.', 'まずそれを片付けよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 9, 'user', 'Agreed. Carrying {debt} looks bad on reports.', '賛成。借金を抱えるのは報告書で印象が悪い。', 'debt', (SELECT id FROM vocab_senses WHERE slug='debt.n.money'), ARRAY['debt','budget','sale','discount']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 10, 'npc', 'Good thinking. Anything for savings?', 'いい考え。貯蓄の予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 11, 'user', 'We could {save up} for new laptops next year.', '来年の新しいノートPCのために貯められる。', 'save up', (SELECT id FROM vocab_senses WHERE slug='save-up.phrv.store'), ARRAY['save up','spend','borrow','lend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 12, 'npc', 'Let''s put that in the plan.', '計画に入れよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 13, 'user', 'I''ll write it up.', 'まとめておくね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-13') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
