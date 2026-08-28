-- ============================================================================
-- Vocab 102: vocab-102-39 - Admin & bureaucracy  (Unit 13)
-- Words: application, document, certificate, approve, reject, submit, procedure, requirement.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('admin-bureaucracy', 'Admin & bureaucracy', '手続き', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('application', 'application', '/ˌæplɪˈkeɪʃn/', '/ˌæplɪˈkeɪʃn/', NULL, 3, FALSE, NULL),
  ('document', 'document', '/ˈdɑːkjumənt/', '/ˈdɒkjumənt/', NULL, 3, FALSE, NULL),
  ('certificate', 'certificate', '/sərˈtɪfɪkət/', '/səˈtɪfɪkət/', NULL, 4, FALSE, NULL),
  ('approve', 'approve', '/əˈpruːv/', '/əˈpruːv/', NULL, 4, FALSE, NULL),
  ('reject', 'reject', '/rɪˈdʒekt/', '/rɪˈdʒekt/', NULL, 4, FALSE, NULL),
  ('submit', 'submit', '/səbˈmɪt/', '/səbˈmɪt/', NULL, 4, FALSE, NULL),
  ('procedure', 'procedure', '/prəˈsiːdʒər/', '/prəˈsiːdʒə/', NULL, 4, FALSE, NULL),
  ('requirement', 'requirement', '/rɪˈkwaɪərmənt/', '/rɪˈkwaɪəmənt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='application'), 'application.n.form', 1, TRUE, 'noun', '申請（書）', 'a formal request, often written on a form', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='document'), 'document.n.paper', 1, TRUE, 'noun', '書類', 'an official paper with information', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='certificate'), 'certificate.n.proof', 1, TRUE, 'noun', '証明書', 'an official paper that proves a fact', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='approve'), 'approve.v.accept', 1, TRUE, 'verb', '承認する', 'to officially agree to something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reject'), 'reject.v.refuse', 1, TRUE, 'verb', '却下する', 'to refuse to accept something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='submit'), 'submit.v.hand', 1, TRUE, 'verb', '提出する', 'to formally send something for a decision', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='procedure'), 'procedure.n.steps', 1, TRUE, 'noun', '手順', 'the set steps for doing something officially', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='requirement'), 'requirement.n.need', 1, TRUE, 'noun', '要件', 'something that is officially needed', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('application', 'document', 'certificate', 'approve', 'reject', 'submit', 'procedure', 'requirement')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), (SELECT id FROM vocab_senses WHERE slug='reject.v.refuse'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='reject.v.refuse'), (SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='admin-bureaucracy'
WHERE s.slug IN ('application.n.form', 'document.n.paper', 'certificate.n.proof', 'approve.v.accept', 'reject.v.refuse', 'submit.v.hand', 'procedure.n.steps', 'requirement.n.need')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-39', 13, 2, (SELECT id FROM vocab_categories WHERE slug='admin-bureaucracy'), 'Admin & bureaucracy', '申請と手続き', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-39'), s.id, x.ord FROM (VALUES
  ('application.n.form',0),('document.n.paper',1),('certificate.n.proof',2),('approve.v.accept',3),('reject.v.refuse',4),('submit.v.hand',5),('procedure.n.steps',6),('requirement.n.need',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-39'), 'conversation', 0, 'A visa application', 'ビザの申請', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-39'), 'travel', 1, 'At a government office', '役所で', 'office', 'official'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-39'), 'business', 2, 'Approving expenses', '経費の承認', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 0, 'npc', 'How''s your visa going?', 'ビザはどう進んでる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 1, 'user', 'I finally started the {application}.', 'やっと申請を始めた。', 'application', (SELECT id FROM vocab_senses WHERE slug='application.n.form'), ARRAY['application','document','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 2, 'npc', 'Lots of paperwork?', '書類は多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 3, 'user', 'So many; each {document} must be perfect.', 'すごく多い、どの書類も完璧にしないと。', 'document', (SELECT id FROM vocab_senses WHERE slug='document.n.paper'), ARRAY['document','application','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 4, 'npc', 'When do you send it?', 'いつ送るの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 5, 'user', 'I''ll {submit} everything online tomorrow.', '明日オンラインで全部提出する。', 'submit', (SELECT id FROM vocab_senses WHERE slug='submit.v.hand'), ARRAY['submit','approve','reject','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 6, 'npc', 'Any tricky rules?', 'ややこしいルールは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 7, 'user', 'Yes, one {requirement} is a bank statement.', 'うん、要件の一つが残高証明。', 'requirement', (SELECT id FROM vocab_senses WHERE slug='requirement.n.need'), ARRAY['requirement','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 8, 'npc', 'What if something''s missing?', '何か足りなかったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 9, 'user', 'They might {reject} it and I reapply.', '却下されて再申請かも。', 'reject', (SELECT id FROM vocab_senses WHERE slug='reject.v.refuse'), ARRAY['reject','approve','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 10, 'npc', 'Fingers crossed they say yes.', '承認されるといいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 11, 'user', 'If they {approve} it, I fly in June.', '承認されたら6月に飛ぶ。', 'approve', (SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), ARRAY['approve','reject','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 12, 'npc', 'You''ve got this.', '大丈夫だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 13, 'user', 'I hope so!', 'そうだといいな！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='conversation'), 14, 'npc', 'Good luck, {{user_name}}.', '頑張って、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 0, 'npc', 'Good morning. What do you need?', 'おはようございます。ご用件は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 1, 'user', 'I need a birth {certificate} copy.', '出生証明書の写しが必要です。', 'certificate', (SELECT id FROM vocab_senses WHERE slug='certificate.n.proof'), ARRAY['certificate','application','document','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 2, 'npc', 'Sure. Have you done this before?', 'はい。以前にされたことは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 3, 'user', 'No, what''s the {procedure}?', 'いいえ、手順はどうなりますか？', 'procedure', (SELECT id FROM vocab_senses WHERE slug='procedure.n.steps'), ARRAY['procedure','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 4, 'npc', 'First, fill this in.', 'まずこれに記入を。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 5, 'user', 'Okay, I''ll complete the {application} form.', 'はい、申請書に記入します。', 'application', (SELECT id FROM vocab_senses WHERE slug='application.n.form'), ARRAY['application','document','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 6, 'npc', 'Then attach your ID.', '次に身分証を添付して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 7, 'user', 'Which {document} counts as ID here?', 'ここでは何の書類が身分証になりますか？', 'document', (SELECT id FROM vocab_senses WHERE slug='document.n.paper'), ARRAY['document','application','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 8, 'npc', 'A passport is fine.', 'パスポートで大丈夫です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 9, 'user', 'Great. Where do I {submit} it?', 'では、どこに提出しますか？', 'submit', (SELECT id FROM vocab_senses WHERE slug='submit.v.hand'), ARRAY['submit','approve','reject','requirement']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 10, 'npc', 'Window two, with the fee.', '2番窓口で、手数料と一緒に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 11, 'user', 'Is a photo also a {requirement}?', '写真も要件ですか？', 'requirement', (SELECT id FROM vocab_senses WHERE slug='requirement.n.need'), ARRAY['requirement','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 12, 'npc', 'Yes, one recent photo.', 'はい、最近の写真を1枚。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 13, 'user', 'Thank you for explaining.', '説明ありがとうございます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='travel'), 14, 'npc', 'You''re welcome!', 'どういたしまして！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 0, 'npc', 'Can you review these expense claims?', 'この経費申請を確認できる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 1, 'user', 'Sure. Did everyone {submit} receipts?', 'いいよ。みんな領収書を提出した？', 'submit', (SELECT id FROM vocab_senses WHERE slug='submit.v.hand'), ARRAY['submit','approve','reject','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 2, 'npc', 'Most did.', 'ほとんどはね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 3, 'user', 'Each claim needs a {document} as proof.', '各申請には証明の書類が要る。', 'document', (SELECT id FROM vocab_senses WHERE slug='document.n.paper'), ARRAY['document','application','certificate','procedure']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 4, 'npc', 'This one has none.', 'これはそれがない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 5, 'user', 'Then we {reject} it until they provide one.', 'なら提出まで却下しよう。', 'reject', (SELECT id FROM vocab_senses WHERE slug='reject.v.refuse'), ARRAY['reject','approve','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 6, 'npc', 'And the complete ones?', 'そろってるものは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 7, 'user', 'I''ll {approve} those today.', 'それは今日承認する。', 'approve', (SELECT id FROM vocab_senses WHERE slug='approve.v.accept'), ARRAY['approve','reject','submit','document']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 8, 'npc', 'Is our process clear to staff?', '手続きはみんなに分かってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 9, 'user', 'I''ll email the {procedure} again to everyone.', '手順をもう一度みんなにメールする。', 'procedure', (SELECT id FROM vocab_senses WHERE slug='procedure.n.steps'), ARRAY['procedure','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 10, 'npc', 'Good. Any rule people miss?', 'いいね。見落としがちなルールは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 11, 'user', 'The main {requirement} is a manager''s signature.', '主な要件はマネージャーの署名。', 'requirement', (SELECT id FROM vocab_senses WHERE slug='requirement.n.need'), ARRAY['requirement','application','document','certificate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 12, 'npc', 'Let''s remind them.', '注意喚起しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 13, 'user', 'I''ll send a note.', '一報入れておくよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-39') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
