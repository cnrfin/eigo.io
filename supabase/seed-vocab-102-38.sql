-- ============================================================================
-- Vocab 102: vocab-102-38 - Getting things fixed  (Unit 13)
-- Words: fault, guarantee, warranty, faulty, complaint, defective, compensation, dodgy.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('getting-things-fixed', 'Getting things fixed', '修理と対応', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('fault', 'fault', '/fɔːlt/', '/fɔːlt/', NULL, 3, FALSE, NULL),
  ('guarantee', 'guarantee', '/ˌɡærənˈtiː/', '/ˌɡærənˈtiː/', NULL, 4, FALSE, NULL),
  ('warranty', 'warranty', '/ˈwɔːrənti/', '/ˈwɒrənti/', NULL, 4, FALSE, NULL),
  ('faulty', 'faulty', '/ˈfɔːlti/', '/ˈfɔːlti/', NULL, 4, FALSE, NULL),
  ('complaint', 'complaint', '/kəmˈpleɪnt/', '/kəmˈpleɪnt/', NULL, 3, FALSE, NULL),
  ('defective', 'defective', '/dɪˈfektɪv/', '/dɪˈfektɪv/', NULL, 4, FALSE, NULL),
  ('compensation', 'compensation', '/ˌkɑːmpenˈseɪʃn/', '/ˌkɒmpenˈseɪʃn/', NULL, 4, FALSE, NULL),
  ('dodgy', 'dodgy', '/ˈdɑːdʒi/', '/ˈdɒdʒi/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='fault'), 'fault.n.defect', 1, TRUE, 'noun', '欠陥', 'a problem, or responsibility for a mistake', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='guarantee'), 'guarantee.n.promise', 1, TRUE, 'noun', '保証', 'a promise to repair or replace a product', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='warranty'), 'warranty.n.cover', 1, TRUE, 'noun', '保証（書）', 'a written promise to fix a product for a period', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='faulty'), 'faulty.adj.broken', 1, TRUE, 'adjective', '欠陥のある', 'not working correctly', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='complaint'), 'complaint.n.grievance', 1, TRUE, 'noun', '苦情', 'a statement that you are not satisfied', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='defective'), 'defective.adj.flawed', 1, TRUE, 'adjective', '欠陥品の', 'made wrongly and not working', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='compensation'), 'compensation.n.payment', 1, TRUE, 'noun', '補償', 'money paid to make up for a problem', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dodgy'), 'dodgy.adj.suspect', 1, TRUE, 'adjective', '怪しい', 'seeming dishonest or not safe (informal)', 'B2', 'くだけた言い方。イギリス英語でよく使う。')
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('fault', 'guarantee', 'warranty', 'faulty', 'complaint', 'defective', 'compensation', 'dodgy')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='getting-things-fixed'
WHERE s.slug IN ('fault.n.defect', 'guarantee.n.promise', 'warranty.n.cover', 'faulty.adj.broken', 'complaint.n.grievance', 'defective.adj.flawed', 'compensation.n.payment', 'dodgy.adj.suspect')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-38', 13, 1, (SELECT id FROM vocab_categories WHERE slug='getting-things-fixed'), 'Getting things fixed', '修理と保証', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-38'), s.id, x.ord FROM (VALUES
  ('fault.n.defect',0),('guarantee.n.promise',1),('warranty.n.cover',2),('faulty.adj.broken',3),('complaint.n.grievance',4),('defective.adj.flawed',5),('compensation.n.payment',6),('dodgy.adj.suspect',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-38'), 'conversation', 0, 'A faulty product', '不良品', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-38'), 'travel', 1, 'Returning a rental car', 'レンタカーの返却', 'agency', 'agent'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-38'), 'business', 2, 'A product recall', '製品のリコール', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 0, 'npc', 'Your new headphones already broke?', '新しいヘッドホン、もう壊れたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 1, 'user', 'Yeah, they were {faulty} out of the box.', 'うん、箱を開けた時点で不良だった。', 'faulty', (SELECT id FROM vocab_senses WHERE slug='faulty.adj.broken'), ARRAY['faulty','dodgy','complaint','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 2, 'npc', 'Are they under warranty?', '保証はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 3, 'user', 'Yes, the {warranty} lasts two years.', 'うん、保証は2年間。', 'warranty', (SELECT id FROM vocab_senses WHERE slug='warranty.n.cover'), ARRAY['warranty','complaint','compensation','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 4, 'npc', 'Good. Did you tell the shop?', 'よかった。店に言った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 5, 'user', 'I filed a {complaint} online.', 'オンラインで苦情を出した。', 'complaint', (SELECT id FROM vocab_senses WHERE slug='complaint.n.grievance'), ARRAY['complaint','warranty','compensation','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 6, 'npc', 'Do they promise a fix?', '修理の約束は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 7, 'user', 'There''s a money-back {guarantee}.', '返金保証がある。', 'guarantee', (SELECT id FROM vocab_senses WHERE slug='guarantee.n.promise'), ARRAY['guarantee','complaint','compensation','warranty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 8, 'npc', 'Will you get anything for the trouble?', '手間の分、何かもらえる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 9, 'user', 'They offered {compensation} for the delay.', '遅延の補償を提示してくれた。', 'compensation', (SELECT id FROM vocab_senses WHERE slug='compensation.n.payment'), ARRAY['compensation','warranty','complaint','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 10, 'npc', 'That shop seemed a bit shady.', 'あの店、ちょっと怪しかったね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 11, 'user', 'Yeah, their website looks {dodgy}.', 'うん、サイトが怪しく見える。', 'dodgy', (SELECT id FROM vocab_senses WHERE slug='dodgy.adj.suspect'), ARRAY['dodgy','faulty','complaint','warranty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 12, 'npc', 'Be careful next time.', '次は気をつけて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 13, 'user', 'I will, lesson learned.', 'うん、いい教訓。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='conversation'), 14, 'npc', 'Hope it works out, {{user_name}}.', 'うまくいくといいね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 0, 'npc', 'How was the rental car?', 'レンタカーはどうでした？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 1, 'user', 'There was a problem, but not my {fault}.', '問題がありましたが、私のせいではないです。', 'fault', (SELECT id FROM vocab_senses WHERE slug='fault.n.defect'), ARRAY['fault','complaint','warranty','compensation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 2, 'npc', 'What happened?', '何がありました？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 3, 'user', 'The brakes felt {defective}.', 'ブレーキが欠陥品のようでした。', 'defective', (SELECT id FROM vocab_senses WHERE slug='defective.adj.flawed'), ARRAY['defective','complaint','warranty','dodgy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 4, 'npc', 'That''s serious. I''m sorry.', 'それは重大です。申し訳ありません。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 5, 'user', 'I''d like to make a formal {complaint}.', '正式な苦情を申し立てたいです。', 'complaint', (SELECT id FROM vocab_senses WHERE slug='complaint.n.grievance'), ARRAY['complaint','warranty','compensation','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 6, 'npc', 'Understood. Was it covered?', '承知しました。保証対象でしたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 7, 'user', 'The car''s {warranty} should cover repairs.', '車の保証で修理は対象のはずです。', 'warranty', (SELECT id FROM vocab_senses WHERE slug='warranty.n.cover'), ARRAY['warranty','complaint','compensation','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 8, 'npc', 'It will. Anything for you?', '対象です。お客様には何か？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 9, 'user', 'Some {compensation} for the ruined day trip?', '台無しになった日帰り旅行の補償を？', 'compensation', (SELECT id FROM vocab_senses WHERE slug='compensation.n.payment'), ARRAY['compensation','warranty','complaint','fault']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 10, 'npc', 'We can refund one day.', '1日分を返金できます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 11, 'user', 'Thank you. Please check for other {faulty} parts.', 'ありがとう。他の欠陥部品も確認してください。', 'faulty', (SELECT id FROM vocab_senses WHERE slug='faulty.adj.broken'), ARRAY['faulty','complaint','warranty','compensation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 12, 'npc', 'We''ll inspect it fully.', 'しっかり点検します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 13, 'user', 'I appreciate it.', '助かります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='travel'), 14, 'npc', 'Safe travels home!', '気をつけてお帰りを！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 0, 'npc', 'We got several reports about the toaster.', 'トースターについて複数の報告が来た。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 1, 'user', 'Yes, one {complaint} says it overheats.', 'うん、過熱するという苦情が一件。', 'complaint', (SELECT id FROM vocab_senses WHERE slug='complaint.n.grievance'), ARRAY['complaint','warranty','compensation','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 2, 'npc', 'Is it a real problem?', '本当に問題？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 3, 'user', 'A batch seems {defective}.', 'あるロットが欠陥品みたい。', 'defective', (SELECT id FROM vocab_senses WHERE slug='defective.adj.flawed'), ARRAY['defective','complaint','warranty','dodgy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 4, 'npc', 'How many units?', '何台？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 5, 'user', 'About two hundred {faulty} ones shipped.', '不良品が約200台出荷された。', 'faulty', (SELECT id FROM vocab_senses WHERE slug='faulty.adj.broken'), ARRAY['faulty','complaint','warranty','compensation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 6, 'npc', 'We must honor the promise.', '約束は守らないと。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 7, 'user', 'Yes, our {guarantee} covers full refunds.', 'うん、うちの保証は全額返金対象。', 'guarantee', (SELECT id FROM vocab_senses WHERE slug='guarantee.n.promise'), ARRAY['guarantee','complaint','compensation','warranty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 8, 'npc', 'And for upset customers?', '怒っている客には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 9, 'user', 'We''ll offer {compensation} vouchers.', '補償のクーポンを出す。', 'compensation', (SELECT id FROM vocab_senses WHERE slug='compensation.n.payment'), ARRAY['compensation','complaint','warranty','guarantee']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 10, 'npc', 'The supplier looked unreliable.', '仕入先が頼りなさそうだった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 11, 'user', 'Agreed, their parts seemed {dodgy}.', '同感、部品が怪しかった。', 'dodgy', (SELECT id FROM vocab_senses WHERE slug='dodgy.adj.suspect'), ARRAY['dodgy','complaint','warranty','compensation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 12, 'npc', 'Let''s switch suppliers.', '仕入先を変えよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 13, 'user', 'I''ll start the recall.', 'リコールを始めるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-38') AND goal='business'), 14, 'npc', 'Good, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);
