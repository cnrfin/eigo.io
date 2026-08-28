-- ============================================================================
-- Vocab 102: vocab-102-37 - Complaints & service  (Unit 13)
-- Words: deal with, get back, follow up, chase up, take back, own up, bring up, point out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('complaints-service', 'Complaints & service', '苦情と対応', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('deal with', 'deal with', '/ˌdiːl ˈwɪð/', '/ˌdiːl ˈwɪð/', NULL, 3, FALSE, NULL),
  ('get back', 'get back', '/ˌɡet ˈbæk/', '/ˌɡet ˈbæk/', NULL, 3, FALSE, NULL),
  ('follow up', 'follow up', '/ˌfɑːloʊ ˈʌp/', '/ˌfɒləʊ ˈʌp/', NULL, 4, FALSE, NULL),
  ('chase up', 'chase up', '/ˌtʃeɪs ˈʌp/', '/ˌtʃeɪs ˈʌp/', NULL, 4, FALSE, NULL),
  ('take back', 'take back', '/ˌteɪk ˈbæk/', '/ˌteɪk ˈbæk/', NULL, 3, FALSE, NULL),
  ('own up', 'own up', '/ˌoʊn ˈʌp/', '/ˌəʊn ˈʌp/', NULL, 4, FALSE, NULL),
  ('bring up', 'bring up', '/ˌbrɪŋ ˈʌp/', '/ˌbrɪŋ ˈʌp/', NULL, 4, FALSE, NULL),
  ('point out', 'point out', '/ˌpɔɪnt ˈaʊt/', '/ˌpɔɪnt ˈaʊt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='deal with'), 'deal-with.phrv.handle', 1, TRUE, 'phrasal verb', '対処する', 'to take action to solve a problem', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get back'), 'get-back.phrv.reply', 1, TRUE, 'phrasal verb', '折り返し連絡する', 'to reply to someone later', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='follow up'), 'follow-up.phrv.check', 1, TRUE, 'phrasal verb', '追って確認する', 'to check again on something after a first action', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='chase up'), 'chase-up.phrv.pursue', 1, TRUE, 'phrasal verb', '催促する', 'to remind someone to do something they are late with', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take back'), 'take-back.phrv.return', 1, TRUE, 'phrasal verb', '返品する', 'to return a product to the shop', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='own up'), 'own-up.phrv.admit', 1, TRUE, 'phrasal verb', '白状する', 'to admit that you did something wrong', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bring up'), 'bring-up.phrv.mention', 1, TRUE, 'phrasal verb', '話題に出す', 'to start talking about a subject', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='point out'), 'point-out.phrv.indicate', 1, TRUE, 'phrasal verb', '指摘する', 'to tell someone about a fact or mistake', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('deal with', 'get back', 'follow up', 'chase up', 'take back', 'own up', 'bring up', 'point out')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='complaints-service'
WHERE s.slug IN ('deal-with.phrv.handle', 'get-back.phrv.reply', 'follow-up.phrv.check', 'chase-up.phrv.pursue', 'take-back.phrv.return', 'own-up.phrv.admit', 'bring-up.phrv.mention', 'point-out.phrv.indicate')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-37', 13, 0, (SELECT id FROM vocab_categories WHERE slug='complaints-service'), 'Complaints & service', '苦情と対応', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-37'), s.id, x.ord FROM (VALUES
  ('deal-with.phrv.handle',0),('get-back.phrv.reply',1),('follow-up.phrv.check',2),('chase-up.phrv.pursue',3),('take-back.phrv.return',4),('own-up.phrv.admit',5),('bring-up.phrv.mention',6),('point-out.phrv.indicate',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-37'), 'conversation', 0, 'A customer service problem', 'カスタマーサービスの問題', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-37'), 'travel', 1, 'A hotel complaint', 'ホテルへの苦情', 'hotel', 'manager'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-37'), 'business', 2, 'Chasing a supplier', '仕入先への催促', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 0, 'npc', 'Did you sort out that broken blender?', 'あの壊れたミキサー、解決した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 1, 'user', 'Trying to. It''s hard to {deal with} the store.', '対応中。店とのやり取りが大変。', 'deal with', (SELECT id FROM vocab_senses WHERE slug='deal-with.phrv.handle'), ARRAY['deal with','get back','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 2, 'npc', 'Did you return it?', '返品した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 3, 'user', 'I''ll {take back} the blender tomorrow.', '明日ミキサーを返品する。', 'take back', (SELECT id FROM vocab_senses WHERE slug='take-back.phrv.return'), ARRAY['take back','follow up','own up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 4, 'npc', 'Did they reply to your email?', 'メールの返事は来た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 5, 'user', 'Not yet; they said they''d {get back} to me.', 'まだ、折り返し連絡するって言ってた。', 'get back', (SELECT id FROM vocab_senses WHERE slug='get-back.phrv.reply'), ARRAY['get back','take back','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 6, 'npc', 'Push them if they don''t.', '来なかったら催促しなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 7, 'user', 'I will. I''ll {chase up} the refund on Monday.', 'するよ。月曜に返金を催促する。', 'chase up', (SELECT id FROM vocab_senses WHERE slug='chase-up.phrv.pursue'), ARRAY['chase up','take back','own up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 8, 'npc', 'Was it your fault at all?', '少しは自分のせい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 9, 'user', 'No, but I''ll {own up} if I broke it.', 'いや、でも壊したなら白状するよ。', 'own up', (SELECT id FROM vocab_senses WHERE slug='own-up.phrv.admit'), ARRAY['own up','take back','follow up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 10, 'npc', 'Fair. Explain the issue clearly.', 'なるほど。問題をはっきり説明して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 11, 'user', 'I''ll {point out} the crack in the box.', '箱のひびを指摘する。', 'point out', (SELECT id FROM vocab_senses WHERE slug='point-out.phrv.indicate'), ARRAY['point out','take back','own up','chase up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 12, 'npc', 'Good luck with them.', 'うまくいくといいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 13, 'user', 'Thanks, I''ll need it.', 'ありがとう、頑張る。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='conversation'), 14, 'npc', 'Let me know, {{user_name}}.', '結果教えて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 0, 'npc', 'How can I help you today?', '本日はどうされましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 1, 'user', 'I need to {bring up} a problem with my room.', '部屋の問題について話したいです。', 'bring up', (SELECT id FROM vocab_senses WHERE slug='bring-up.phrv.mention'), ARRAY['bring up','follow up','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 2, 'npc', 'I''m sorry. Please tell me.', '申し訳ありません。お聞かせください。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 3, 'user', 'I''ll {point out} that the heater is broken.', '暖房が壊れていると指摘します。', 'point out', (SELECT id FROM vocab_senses WHERE slug='point-out.phrv.indicate'), ARRAY['point out','follow up','own up','take back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 4, 'npc', 'I''ll send someone right away.', 'すぐ人をよこします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 5, 'user', 'Thank you for helping {deal with} it fast.', '早く対処してくれてありがとう。', 'deal with', (SELECT id FROM vocab_senses WHERE slug='deal-with.phrv.handle'), ARRAY['deal with','get back','own up','take back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 6, 'npc', 'Anything else?', '他には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 7, 'user', 'Could you {follow up} about my late checkout?', 'レイトチェックアウトの件を追って確認してもらえますか？', 'follow up', (SELECT id FROM vocab_senses WHERE slug='follow-up.phrv.check'), ARRAY['follow up','own up','take back','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 8, 'npc', 'Of course, I''ll confirm by phone.', 'もちろん、電話で確認します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 9, 'user', 'Great, please {get back} to me by noon.', 'では、正午までに折り返し連絡してください。', 'get back', (SELECT id FROM vocab_senses WHERE slug='get-back.phrv.reply'), ARRAY['get back','own up','take back','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 10, 'npc', 'You have my word.', 'お約束します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 11, 'user', 'Also, can I {take back} the minibar snacks I didn''t use?', 'あと、使わなかったミニバーのお菓子を返せますか？', 'take back', (SELECT id FROM vocab_senses WHERE slug='take-back.phrv.return'), ARRAY['take back','own up','follow up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 12, 'npc', 'Yes, we''ll remove them from the bill.', 'はい、会計から外します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 13, 'user', 'Thank you so much.', '本当にありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='travel'), 14, 'npc', 'Enjoy the rest of your stay!', '残りの滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 0, 'npc', 'The supplier is late again.', '仕入先がまた遅れてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 1, 'user', 'I''ll {chase up} the delivery this morning.', '今朝、配送を催促するよ。', 'chase up', (SELECT id FROM vocab_senses WHERE slug='chase-up.phrv.pursue'), ARRAY['chase up','take back','own up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 2, 'npc', 'This keeps happening.', 'これが続いてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 3, 'user', 'Let''s {bring up} the delays in the review meeting.', 'レビュー会議で遅延を話題に出そう。', 'bring up', (SELECT id FROM vocab_senses WHERE slug='bring-up.phrv.mention'), ARRAY['bring up','follow up','own up','point out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 4, 'npc', 'Good. Be specific.', 'いいね。具体的に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 5, 'user', 'I''ll {point out} the three missed deadlines.', '3回の締め切り遅れを指摘する。', 'point out', (SELECT id FROM vocab_senses WHERE slug='point-out.phrv.indicate'), ARRAY['point out','follow up','own up','take back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 6, 'npc', 'Did we cause any of it?', 'こっちに原因はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 7, 'user', 'We should {own up} to the late order form.', '注文書が遅れた件は白状すべき。', 'own up', (SELECT id FROM vocab_senses WHERE slug='own-up.phrv.admit'), ARRAY['own up','chase up','follow up','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 8, 'npc', 'Fair. Then push for a fix.', 'なるほど。それから改善を求めよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 9, 'user', 'I''ll {deal with} their manager directly.', '先方のマネージャーと直接対処するよ。', 'deal with', (SELECT id FROM vocab_senses WHERE slug='deal-with.phrv.handle'), ARRAY['deal with','get back','take back','own up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 10, 'npc', 'And keep records.', '記録も残して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 11, 'user', 'Yes, I''ll {follow up} every email in writing.', 'うん、すべてのメールを文書で追って確認する。', 'follow up', (SELECT id FROM vocab_senses WHERE slug='follow-up.phrv.check'), ARRAY['follow up','own up','take back','bring up']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 12, 'npc', 'Solid approach.', 'しっかりした進め方。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 13, 'user', 'I''ll update you after the call.', '電話のあと報告するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-37') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
