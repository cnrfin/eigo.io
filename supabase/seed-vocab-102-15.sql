-- ============================================================================
-- Vocab 102: vocab-102-15 - Bargains  (Unit 5)
-- Words: bargain, discount, sale, voucher, brand, quality, secondhand, luxury.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('bargains', 'Bargains', 'お得な買い物', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('bargain', 'bargain', '/ˈbɑːrɡɪn/', '/ˈbɑːɡɪn/', NULL, 4, FALSE, NULL),
  ('discount', 'discount', '/ˈdɪskaʊnt/', '/ˈdɪskaʊnt/', NULL, 3, FALSE, NULL),
  ('sale', 'sale', '/seɪl/', '/seɪl/', NULL, 3, FALSE, NULL),
  ('voucher', 'voucher', '/ˈvaʊtʃər/', '/ˈvaʊtʃə/', NULL, 4, FALSE, NULL),
  ('brand', 'brand', '/brænd/', '/brænd/', NULL, 3, FALSE, NULL),
  ('quality', 'quality', '/ˈkwɑːləti/', '/ˈkwɒləti/', NULL, 3, FALSE, NULL),
  ('secondhand', 'secondhand', '/ˌsekəndˈhænd/', '/ˌsekəndˈhænd/', NULL, 4, FALSE, NULL),
  ('luxury', 'luxury', '/ˈlʌkʃəri/', '/ˈlʌkʃəri/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='bargain'), 'bargain.n.deal', 1, TRUE, 'noun', 'お買い得', 'something you buy for less than its usual price', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='discount'), 'discount.n.reduction', 1, TRUE, 'noun', '割引', 'an amount taken off the normal price', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sale'), 'sale.n.event', 1, TRUE, 'noun', 'セール', 'a time when a shop sells things at lower prices', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='voucher'), 'voucher.n.coupon', 1, TRUE, 'noun', 'クーポン券', 'a ticket you can use instead of money', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='brand'), 'brand.n.make', 1, TRUE, 'noun', 'ブランド', 'a product made by a particular company', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='quality'), 'quality.n.standard', 1, TRUE, 'noun', '品質', 'how good or bad something is', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='secondhand'), 'secondhand.adj.used', 1, TRUE, 'adjective', '中古の', 'not new; owned by someone before', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='luxury'), 'luxury.n.expensive', 1, TRUE, 'noun', '高級品', 'something expensive that is nice but not necessary', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('bargain', 'discount', 'sale', 'voucher', 'brand', 'quality', 'secondhand', 'luxury')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='bargains'
WHERE s.slug IN ('bargain.n.deal', 'discount.n.reduction', 'sale.n.event', 'voucher.n.coupon', 'brand.n.make', 'quality.n.standard', 'secondhand.adj.used', 'luxury.n.expensive')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-15', 5, 2, (SELECT id FROM vocab_categories WHERE slug='bargains'), 'Bargains', 'お得に買う', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-15'), s.id, x.ord FROM (VALUES
  ('bargain.n.deal',0),('discount.n.reduction',1),('sale.n.event',2),('voucher.n.coupon',3),('brand.n.make',4),('quality.n.standard',5),('secondhand.adj.used',6),('luxury.n.expensive',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-15'), 'conversation', 0, 'Shopping smart', '賢い買い物', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-15'), 'travel', 1, 'Souvenir shopping', 'お土産の買い物', 'market', 'vendor'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-15'), 'business', 2, 'Choosing a supplier', '仕入先を選ぶ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 0, 'npc', 'Nice jacket! Was it expensive?', 'いいジャケット！高かった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 1, 'user', 'No, it was a total {bargain}!', 'ううん、超お買い得だった！', 'bargain', (SELECT id FROM vocab_senses WHERE slug='bargain.n.deal'), ARRAY['bargain','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 2, 'npc', 'Really? Where from?', '本当？どこで？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 3, 'user', 'There''s a big {sale} at the mall right now.', '今モールで大きなセールをやってる。', 'sale', (SELECT id FROM vocab_senses WHERE slug='sale.n.event'), ARRAY['sale','brand','quality','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 4, 'npc', 'How much off?', 'どれくらい安い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 5, 'user', 'I got a fifty percent {discount}.', '50パーセント引きだった。', 'discount', (SELECT id FROM vocab_senses WHERE slug='discount.n.reduction'), ARRAY['discount','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 6, 'npc', 'Wow. Is it a known label?', 'わあ。有名ブランド？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 7, 'user', 'Yeah, it''s a popular {brand} too.', 'うん、人気のブランドでもある。', 'brand', (SELECT id FROM vocab_senses WHERE slug='brand.n.make'), ARRAY['brand','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 8, 'npc', 'And it feels well made.', '作りもよさそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 9, 'user', 'The {quality} is surprisingly good.', '品質が思ったよりいい。', 'quality', (SELECT id FROM vocab_senses WHERE slug='quality.n.standard'), ARRAY['quality','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 10, 'npc', 'Do you ever buy used?', '中古も買う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 11, 'user', 'Sometimes. I love {secondhand} shops for jeans.', 'たまに。ジーンズは中古店が好き。', 'secondhand', (SELECT id FROM vocab_senses WHERE slug='secondhand.adj.used'), ARRAY['secondhand','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 12, 'npc', 'Smart shopper!', '買い物上手！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 13, 'user', 'I hate paying full price.', '定価で買うのが嫌なの。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='conversation'), 14, 'npc', 'Take me next time, {{user_name}}!', '次は連れてって、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 0, 'npc', 'See anything you like?', '気に入ったものある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 1, 'user', 'This scarf looks like a {bargain}.', 'このスカーフ、お買い得そう。', 'bargain', (SELECT id FROM vocab_senses WHERE slug='bargain.n.deal'), ARRAY['bargain','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 2, 'npc', 'Good eye! Handmade, too.', 'お目が高い！手作りだよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 3, 'user', 'Any {discount} if I buy two?', '2枚買ったら割引ある？', 'discount', (SELECT id FROM vocab_senses WHERE slug='discount.n.reduction'), ARRAY['discount','brand','quality','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 4, 'npc', 'For you, ten percent off.', 'あなたには10パーセント引き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 5, 'user', 'Deal. The {quality} feels lovely.', '決まり。品質がすごくいい。', 'quality', (SELECT id FROM vocab_senses WHERE slug='quality.n.standard'), ARRAY['quality','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 6, 'npc', 'Pure silk. Here''s a little extra.', '純シルクだよ。これはおまけ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 7, 'user', 'A {voucher} for the cafe next door? Thanks!', '隣のカフェのクーポン？ありがとう！', 'voucher', (SELECT id FROM vocab_senses WHERE slug='voucher.n.coupon'), ARRAY['voucher','brand','quality','sale']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 8, 'npc', 'Enjoy. Looking for anything special?', 'どうぞ。特別なものを探してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 9, 'user', 'Maybe one {luxury} gift for my mother.', '母に高級な贈り物を一つ、かな。', 'luxury', (SELECT id FROM vocab_senses WHERE slug='luxury.n.expensive'), ARRAY['luxury','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 10, 'npc', 'This jewelry box is our finest.', 'この宝石箱が一番の品です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 11, 'user', 'Is it a local {brand}?', '地元のブランド？', 'brand', (SELECT id FROM vocab_senses WHERE slug='brand.n.make'), ARRAY['brand','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 12, 'npc', 'Made by a family here for generations.', '代々続く地元の家族の作です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 13, 'user', 'Then I''ll take it.', 'じゃあ、それをもらいます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='travel'), 14, 'npc', 'She''ll love it!', 'お母様、喜ぶよ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 0, 'npc', 'Which supplier should we choose?', 'どの仕入先にする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 1, 'user', 'The first one has better {quality}.', '1社目の方が品質がいい。', 'quality', (SELECT id FROM vocab_senses WHERE slug='quality.n.standard'), ARRAY['quality','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 2, 'npc', 'But the second is cheaper.', 'でも2社目の方が安い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 3, 'user', 'True, their price is a real {bargain}.', '確かに、あそこの価格はかなりお得。', 'bargain', (SELECT id FROM vocab_senses WHERE slug='bargain.n.deal'), ARRAY['bargain','brand','sale','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 4, 'npc', 'Do they offer bulk deals?', 'まとめ買いの割引はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 5, 'user', 'Yes, a {discount} for large orders.', 'うん、大口注文には割引がある。', 'discount', (SELECT id FROM vocab_senses WHERE slug='discount.n.reduction'), ARRAY['discount','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 6, 'npc', 'Are they a trusted name?', '信頼できる会社？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 7, 'user', 'It''s a well-known {brand} in the industry.', '業界では有名なブランドだよ。', 'brand', (SELECT id FROM vocab_senses WHERE slug='brand.n.make'), ARRAY['brand','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 8, 'npc', 'Our clients like premium goods.', 'うちの客は高級品を好む。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 9, 'user', 'Then maybe we need a {luxury} option too.', 'なら高級な選択肢も必要かも。', 'luxury', (SELECT id FROM vocab_senses WHERE slug='luxury.n.expensive'), ARRAY['luxury','sale','discount','voucher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 10, 'npc', 'Good point. Two tiers?', 'なるほど。2段階にする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 11, 'user', 'Yes, and a {sale} price for the basic line.', 'うん、基本ラインはセール価格で。', 'sale', (SELECT id FROM vocab_senses WHERE slug='sale.n.event'), ARRAY['sale','brand','quality','luxury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 12, 'npc', 'Let''s draft the proposal.', '提案書を作ろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 13, 'user', 'I''ll compare both quotes.', '両方の見積もりを比べるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-15') AND goal='business'), 14, 'npc', 'Great work, {{user_name}}.', 'いい仕事だね、{{user_name}}。', NULL, NULL, NULL);
