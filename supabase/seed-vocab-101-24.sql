-- ============================================================================
-- Vocab 101: Lesson 24 (A2): "Paying"  (Unit 6, Shopping and money)
-- ----------------------------------------------------------------------------
-- Words (all new): pay, cost, change, card, cash, receipt, price, expensive.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('paying', 'Paying', '支払い', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pay', 'pay', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cost', 'cost', NULL, NULL, NULL, 2, FALSE, NULL),
  ('change', 'change', NULL, NULL, NULL, 2, FALSE, NULL),
  ('card', 'card', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cash', 'cash', NULL, NULL, NULL, 2, FALSE, NULL),
  ('receipt', 'receipt', NULL, NULL, NULL, 2, FALSE, NULL),
  ('price', 'price', NULL, NULL, NULL, 2, FALSE, NULL),
  ('expensive', 'expensive', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pay'), 'pay.v.money', 1, TRUE, 'verb', '支払う', 'to give money for something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cost'), 'cost.v.price', 1, TRUE, 'verb', '（費用が）かかる', 'to have a certain price', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='change'), 'change.n.money', 1, TRUE, 'noun', 'お釣り', 'money returned when you pay too much', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='card'), 'card.n.pay', 1, TRUE, 'noun', 'カード', 'a plastic card used to pay', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cash'), 'cash.n.money', 1, TRUE, 'noun', '現金', 'money in coins and notes', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='receipt'), 'receipt.n.proof', 1, TRUE, 'noun', 'レシート', 'a paper showing what you paid', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='price'), 'price.n.cost', 1, TRUE, 'noun', '値段', 'the amount of money something costs', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='expensive'), 'expensive.adj.price', 1, TRUE, 'adjective', '高い', 'costing a lot of money', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pay','cost','change','card','cash','receipt','price','expensive')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='expensive.adj.price'), (SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='paying'
WHERE s.slug IN ('pay.v.money','cost.v.price','change.n.money','card.n.pay','cash.n.money','receipt.n.proof','price.n.cost','expensive.adj.price')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-24', 6, 3, (SELECT id FROM vocab_categories WHERE slug='paying'), 'Paying', '支払い', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-24'), s.id, x.ord
FROM (VALUES
  ('pay.v.money',0),('cost.v.price',1),('change.n.money',2),('card.n.pay',3),('cash.n.money',4),('receipt.n.proof',5),('price.n.cost',6),('expensive.adj.price',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-24'), 'travel', 0, 'At the register', 'レジで', 'shop', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-24'), 'conversation', 1, 'Splitting the bill', '割り勘', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-24'), 'business', 2, 'Expense report', '経費精算', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 0, 'npc', 'That''s twelve dollars.', '12ドルになります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 1, 'user', 'Can I {pay} by card?', 'カードで払える？', 'pay', (SELECT id FROM vocab_senses WHERE slug='pay.v.money'), ARRAY['cost','buy','change','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 2, 'npc', 'Of course. Insert your {card} here.', 'もちろん。ここにカードを。', 'card', (SELECT id FROM vocab_senses WHERE slug='card.n.pay'), ARRAY['card','cash','ticket','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 3, 'user', 'Done. Do I get {change}?', 'できた。お釣りある？', 'change', (SELECT id FROM vocab_senses WHERE slug='change.n.money'), ARRAY['price','cash','change','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 4, 'npc', 'No, it was exact. Here''s your {receipt}.', 'いえ、ちょうどです。レシートです。', 'receipt', (SELECT id FROM vocab_senses WHERE slug='receipt.n.proof'), ARRAY['ticket','cash','card','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 5, 'user', 'Thanks a lot!', 'どうもありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 6, 'npc', 'Have a nice day!', 'よい一日を！', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 0, 'npc', 'How much did lunch {cost}?', 'ランチいくらかかった？', 'cost', (SELECT id FROM vocab_senses WHERE slug='cost.v.price'), ARRAY['buy','change','pay','cost']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 1, 'user', 'About twenty. A bit {expensive} for lunch.', '20くらい。ランチにしてはちょっと高い。', 'expensive', (SELECT id FROM vocab_senses WHERE slug='expensive.adj.price'), ARRAY['cheap','expensive','heavy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 2, 'npc', 'Yeah. Do you have {cash}, some coins or notes?', 'だね。現金ある？小銭かお札。', 'cash', (SELECT id FROM vocab_senses WHERE slug='cash.n.money'), ARRAY['change','card','cash','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 3, 'user', 'Only a little. Can you {pay} and I''ll send it?', '少しだけ。払っといて、後で送る?', 'pay', (SELECT id FROM vocab_senses WHERE slug='pay.v.money'), ARRAY['pay','change','cost','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 4, 'npc', 'Sure, no worries.', 'いいよ、気にしないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 5, 'user', 'Thanks! I''ll get the next one.', 'ありがとう！次は私が。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 6, 'npc', 'Deal.', '決まり。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 0, 'npc', 'Did you keep the {receipt}?', 'レシート取ってある？', 'receipt', (SELECT id FROM vocab_senses WHERE slug='receipt.n.proof'), ARRAY['ticket','receipt','card','cash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 1, 'user', 'Yes. The {price} was on it.', 'うん。値段も載ってる。', 'price', (SELECT id FROM vocab_senses WHERE slug='price.n.cost'), ARRAY['card','cash','change','price']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 2, 'npc', 'Good. How much did the software {cost}?', 'いいね。ソフトはいくらした？', 'cost', (SELECT id FROM vocab_senses WHERE slug='cost.v.price'), ARRAY['cost','change','buy','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 3, 'user', 'A lot. It''s quite {expensive}, way over budget.', 'かなり。予算をかなりオーバーしてる。', 'expensive', (SELECT id FROM vocab_senses WHERE slug='expensive.adj.price'), ARRAY['light','cheap','expensive','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 4, 'npc', 'I''ll add it to the report.', 'レポートに追加するね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 5, 'user', 'Thanks for handling it.', '対応ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 6, 'npc', 'No problem.', 'どういたしまして。', NULL, NULL, NULL);
