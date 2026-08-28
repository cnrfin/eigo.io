-- ============================================================================
-- Vocab 101 — Lesson 3, re-cut scene-first: "Shopping"
-- ----------------------------------------------------------------------------
-- Replaces the retired family lesson. Words: want, buy, money, big, small,
-- color, cheap, size. Situational + cloze-friendly (mixed POS).
-- Word senses + relations + lesson remap + 3 goal scenes. American spelling.
--
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- The old family senses are left orphaned (not in any lesson) — harmless.
-- ============================================================================

-- ── Theme ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('shopping', 'Shopping', '買い物', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('want',  'want',  '/wɑːnt/',  '/wɒnt/',   150, 1, FALSE, NULL),
  ('buy',   'buy',   '/baɪ/',    '/baɪ/',    200, 1, FALSE, NULL),
  ('money', 'money', '/ˈmʌni/',  '/ˈmʌni/',  180, 1, FALSE, NULL),
  ('big',   'big',   '/bɪɡ/',    '/bɪɡ/',    120, 1, FALSE, NULL),
  ('small', 'small', '/smɔːl/',  '/smɔːl/',  160, 1, FALSE, 'スモール。/smɔːl/。'),
  ('color', 'color', '/ˈkʌlər/', '/ˈkʌlə/',  260, 1, FALSE, 'カラー。英語は /ˈkʌlər/。英式は colour。'),
  ('cheap', 'cheap', '/tʃiːp/',  '/tʃiːp/',  420, 1, FALSE, NULL),
  ('size',  'size',  '/saɪz/',   '/saɪz/',   300, 1, FALSE, 'サイズ。/saɪz/。')
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='want'),  'want.v.desire',   1, TRUE, 'verb',      '欲しい', 'to wish to have or do something', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='buy'),   'buy.v.purchase',  1, TRUE, 'verb',      '買う',           'to get something by paying money', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='money'), 'money.n.currency',1, TRUE, 'noun',      'お金',           'coins and notes used to pay for things', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='big'),   'big.adj.size',    1, TRUE, 'adjective', '大きい',         'large in size or amount', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='small'), 'small.adj.size',  1, TRUE, 'adjective', '小さい',         'little in size or amount', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='color'), 'color.n.hue',     1, TRUE, 'noun',      '色',             'red, blue, green and so on', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cheap'), 'cheap.adj.price', 1, TRUE, 'adjective', '安い',           'costing little money', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='size'),  'size.n.measure',  1, TRUE, 'noun',      'サイズ', 'how big or small something is', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent) ─────────────────────────
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('want','buy','money','big','small','color','cheap','size')));

-- ── Relations ───────────────────────────────────────────────────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='big.adj.size'),   (SELECT id FROM vocab_senses WHERE slug='small.adj.size'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='small.adj.size'), (SELECT id FROM vocab_senses WHERE slug='big.adj.size'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='big.adj.size'),   NULL, 'large',      'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'),NULL, 'expensive',  'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), NULL, 'sell',       'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), NULL, 'purchase',   'near_synonym', 'かたい語は purchase。'),
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'),  NULL, 'would like', 'near_synonym', 'ていねいな言い方は would like。'),
  ((SELECT id FROM vocab_senses WHERE slug='money.n.currency'),NULL,'cash',       'near_synonym', '現金は cash。');

-- ── Category membership ─────────────────────────────────────────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='shopping'
WHERE s.slug IN ('want.v.desire','buy.v.purchase','money.n.currency','big.adj.size','small.adj.size','color.n.hue','cheap.adj.price','size.n.measure')
ON CONFLICT DO NOTHING;

-- ── Remap the lesson (was family) → Shopping ───────────────────────────────
UPDATE vocab_lessons SET
  title_en='Shopping', title_ja='買い物',
  theme_id=(SELECT id FROM vocab_categories WHERE slug='shopping'),
  level_index=1, order_index=3, published=TRUE, free=TRUE
WHERE slug='vocab-101-3';

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-3'), s.id, x.ord
FROM (VALUES
  ('want.v.desire',0),('buy.v.purchase',1),('money.n.currency',2),('big.adj.size',3),
  ('small.adj.size',4),('color.n.hue',5),('cheap.adj.price',6),('size.n.measure',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

-- ── Scenes ──────────────────────────────────────────────────────────────────
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-3'), 'travel',       0, 'Buying a T-shirt',     'Tシャツを買う',   'shop',  'shopkeeper'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-3'), 'business',     1, 'A shirt for work',     '仕事用のシャツ',   'shop',  'assistant'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-3'), 'conversation', 2, 'Shopping with a friend','友達と買い物',    'shop',  'friend');

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 0, 'npc',  'Hi! Looking for anything special?', 'いらっしゃい！何かお探しですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 1, 'user', 'Yes, I {want} a T-shirt like this.', 'はい、こんな感じのTシャツが欲しいです。', 'want', (SELECT id FROM vocab_senses WHERE slug='want.v.desire'), ARRAY['sell','want','wash','make']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 2, 'npc',  'Sure! What size are you?', 'もちろん！サイズは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 3, 'user', 'Medium, I think. Do you have this in my {size}?', 'Mだと思う。このサイズ、ありますか？', 'size', (SELECT id FROM vocab_senses WHERE slug='size.n.measure'), ARRAY['size','price','shape','color']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 4, 'npc',  'Let me check. Here''s a medium.', '確認しますね。はい、Mサイズです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 5, 'user', 'Hmm, it''s a little {big}. Anything smaller?', 'うーん、少し大きいです。もっと小さいのは？', 'big', (SELECT id FROM vocab_senses WHERE slug='big.adj.size'), ARRAY['big','old','cheap','heavy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 6, 'npc',  'Here''s a smaller one.', '小さいのはこちらです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 7, 'user', 'Better! Do you have another {color}, maybe blue?', 'いいね！別の色、例えば青はある？', 'color', (SELECT id FROM vocab_senses WHERE slug='color.n.hue'), ARRAY['price','brand','size','color']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 8, 'npc',  'We have blue and green.', '青と緑があります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 9, 'user', 'Blue is great. I''ll {buy} this one.', '青がいいです。これを買います。', 'buy', (SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), ARRAY['buy','borrow','return','wash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 10, 'npc',  'Great! That''s 1500 yen.', 'ありがとうございます！1500円です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 11, 'user', 'I don''t have much {money} on me. Card okay?', 'あまり現金がないんです。カードでいいですか？', 'money', (SELECT id FROM vocab_senses WHERE slug='money.n.currency'), ARRAY['space','room','time','money']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 12, 'npc',  'Card is fine!', 'カードで大丈夫です！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 0, 'npc',  'Hi, can I help you find something?', 'いらっしゃいませ、何かお探しですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 1, 'user', 'Yes, I need a shirt for the office.', 'はい、仕事用のシャツを探しています。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 2, 'npc',  'Of course. What {size} - small, medium, or large?', 'もちろん。サイズは？S、M、L？', 'size', (SELECT id FROM vocab_senses WHERE slug='size.n.measure'), ARRAY['age','size','color','weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 3, 'user', 'Large, please.', 'Lでお願いします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 4, 'npc',  'Here are a few. This white one is popular.', 'こちらです。この白が人気ですよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 5, 'user', 'Nice. Do you have it in a darker {color}?', 'いいですね。もっと濃い色はありますか？', 'color', (SELECT id FROM vocab_senses WHERE slug='color.n.hue'), ARRAY['color','style','price','size']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 6, 'npc',  'We have navy and grey.', '紺とグレーがあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 7, 'user', 'Is this one {cheap}? I''m on a budget.', 'これは安いですか？予算があまりなくて。', 'cheap', (SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'), ARRAY['cheap','new','warm','soft']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 8, 'npc',  'It''s on sale, actually.', '実はセール中なんです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 9, 'user', 'Perfect. I''ll {buy} the navy one.', '完璧です。紺色を買います。', 'buy', (SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), ARRAY['iron','wash','fold','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 10, 'npc',  'Great. How would you like to pay?', 'かしこまりました。お支払いは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 11, 'user', 'Card, please. I didn''t bring much {money}.', 'カードで。あまり現金を持ってこなくて。', 'money', (SELECT id FROM vocab_senses WHERE slug='money.n.currency'), ARRAY['money','time','work','luggage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 12, 'npc',  'No problem at all.', 'まったく問題ありません。', NULL, NULL, NULL);

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 0, 'npc',  'Ooh, this shop is cute!', 'わあ、この店かわいい！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 1, 'user', 'Right? I {want} a new bag.', 'でしょ？新しいバッグが欲しいな。', 'want', (SELECT id FROM vocab_senses WHERE slug='want.v.desire'), ARRAY['sell','lose','want','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 2, 'npc',  'This one''s nice. Try it!', 'これいいね。持ってみなよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 3, 'user', 'It''s cute, but a bit {small} for my stuff.', 'かわいいけど、荷物には少し小さいな。', 'small', (SELECT id FROM vocab_senses WHERE slug='small.adj.size'), ARRAY['wet','small','heavy','cheap']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 4, 'npc',  'What about this one?', 'じゃあこれは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 5, 'user', 'Oh, that''s better. Not too {big}, not too small.', 'あ、いいね。大きすぎず、小さすぎず。', 'big', (SELECT id FROM vocab_senses WHERE slug='big.adj.size'), ARRAY['cheap','big','plain','dark']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 6, 'npc',  'How much is it?', 'いくら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 7, 'user', 'Only 2000 yen. Pretty {cheap}!', 'たった2000円。けっこう安い！', 'cheap', (SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'), ARRAY['heavy','old','cheap','loud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 8, 'npc',  'Bargain! You should get it.', 'お買い得！買っちゃいなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 9, 'user', 'Yeah, I''ll {buy} it.', 'うん、買う。', 'buy', (SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), ARRAY['read','watch','cook','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 10, 'npc',  'Good choice.', 'いい選択。', NULL, NULL, NULL);
