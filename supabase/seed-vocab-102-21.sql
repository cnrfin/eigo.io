-- ============================================================================
-- Vocab 102: vocab-102-21 - At the clinic  (Unit 7)
-- Words: symptom, prescription, treatment, injury, recover, painkiller, allergy, dizzy.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('at-the-clinic', 'At the clinic', '診療所で', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('symptom', 'symptom', '/ˈsɪmptəm/', '/ˈsɪmptəm/', NULL, 4, FALSE, NULL),
  ('prescription', 'prescription', '/prɪˈskrɪpʃn/', '/prɪˈskrɪpʃn/', NULL, 4, FALSE, NULL),
  ('treatment', 'treatment', '/ˈtriːtmənt/', '/ˈtriːtmənt/', NULL, 3, FALSE, NULL),
  ('injury', 'injury', '/ˈɪndʒəri/', '/ˈɪndʒəri/', NULL, 3, FALSE, NULL),
  ('recover', 'recover', '/rɪˈkʌvər/', '/rɪˈkʌvə/', NULL, 3, FALSE, NULL),
  ('painkiller', 'painkiller', '/ˈpeɪnkɪlər/', '/ˈpeɪnkɪlə/', NULL, 4, FALSE, NULL),
  ('allergy', 'allergy', '/ˈælərdʒi/', '/ˈælədʒi/', NULL, 4, FALSE, NULL),
  ('dizzy', 'dizzy', '/ˈdɪzi/', '/ˈdɪzi/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='symptom'), 'symptom.n.sign', 1, TRUE, 'noun', '症状', 'a sign that shows you have an illness', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='prescription'), 'prescription.n.paper', 1, TRUE, 'noun', '処方箋', 'a doctor''s written order for medicine', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='treatment'), 'treatment.n.care', 1, TRUE, 'noun', '治療', 'medical care given for an illness or injury', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='injury'), 'injury.n.harm', 1, TRUE, 'noun', 'けが', 'physical harm to your body', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='recover'), 'recover.v.heal', 1, TRUE, 'verb', '回復する', 'to become well again after illness or injury', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='painkiller'), 'painkiller.n.medicine', 1, TRUE, 'noun', '鎮痛剤', 'medicine that reduces pain', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='allergy'), 'allergy.n.reaction', 1, TRUE, 'noun', 'アレルギー', 'a bad reaction of the body to certain things', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dizzy'), 'dizzy.adj.faint', 1, TRUE, 'adjective', 'めまいがする', 'feeling that things are turning around you', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('symptom', 'prescription', 'treatment', 'injury', 'recover', 'painkiller', 'allergy', 'dizzy')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='at-the-clinic'
WHERE s.slug IN ('symptom.n.sign', 'prescription.n.paper', 'treatment.n.care', 'injury.n.harm', 'recover.v.heal', 'painkiller.n.medicine', 'allergy.n.reaction', 'dizzy.adj.faint')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-21', 7, 2, (SELECT id FROM vocab_categories WHERE slug='at-the-clinic'), 'At the clinic', '診療所で', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-21'), s.id, x.ord FROM (VALUES
  ('symptom.n.sign',0),('prescription.n.paper',1),('treatment.n.care',2),('injury.n.harm',3),('recover.v.heal',4),('painkiller.n.medicine',5),('allergy.n.reaction',6),('dizzy.adj.faint',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-21'), 'conversation', 0, 'A friend is unwell', '友達の不調', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-21'), 'travel', 1, 'At a clinic abroad', '海外の診療所で', 'clinic', 'doctor'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-21'), 'business', 2, 'A colleague''s sick leave', '同僚の病欠', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 0, 'npc', 'You don''t look well. What''s wrong?', '具合悪そう。どうしたの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 1, 'user', 'I feel {dizzy} and a bit weak.', 'めまいがして、少し力が入らない。', 'dizzy', (SELECT id FROM vocab_senses WHERE slug='dizzy.adj.faint'), ARRAY['dizzy','recover','symptom','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 2, 'npc', 'How long has this gone on?', 'いつから？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 3, 'user', 'The main {symptom} started two days ago.', '主な症状は2日前から。', 'symptom', (SELECT id FROM vocab_senses WHERE slug='symptom.n.sign'), ARRAY['symptom','treatment','painkiller','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 4, 'npc', 'Did you see a doctor?', '医者に行った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 5, 'user', 'Yes, she gave me a {treatment} plan.', 'うん、治療の計画をもらった。', 'treatment', (SELECT id FROM vocab_senses WHERE slug='treatment.n.care'), ARRAY['treatment','symptom','allergy','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 6, 'npc', 'Any medicine?', '薬は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 7, 'user', 'A {painkiller} for the headache.', '頭痛用に鎮痛剤を。', 'painkiller', (SELECT id FROM vocab_senses WHERE slug='painkiller.n.medicine'), ARRAY['painkiller','symptom','allergy','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 8, 'npc', 'Could it be something you ate?', '食べ物のせいかも？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 9, 'user', 'Maybe an {allergy}; I had nuts yesterday.', 'アレルギーかも、昨日ナッツを食べた。', 'allergy', (SELECT id FROM vocab_senses WHERE slug='allergy.n.reaction'), ARRAY['allergy','symptom','treatment','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 10, 'npc', 'Ah, that could be it.', 'ああ、それかもね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 11, 'user', 'I should {recover} in a few days.', '数日で回復するはず。', 'recover', (SELECT id FROM vocab_senses WHERE slug='recover.v.heal'), ARRAY['recover','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 12, 'npc', 'Rest lots, okay?', 'たくさん休んでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 13, 'user', 'I will.', 'そうする。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='conversation'), 14, 'npc', 'Feel better, {{user_name}}.', 'お大事に、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 0, 'npc', 'Hello. What brings you in today?', 'こんにちは。今日はどうされました？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 1, 'user', 'I have an {injury}; I hurt my ankle hiking.', 'けがをしました。ハイキングで足首を痛めて。', 'injury', (SELECT id FROM vocab_senses WHERE slug='injury.n.harm'), ARRAY['injury','symptom','allergy','prescription']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 2, 'npc', 'Let me take a look. Any other issues?', '診てみましょう。他に問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 3, 'user', 'The main {symptom} is swelling and pain.', '主な症状は腫れと痛みです。', 'symptom', (SELECT id FROM vocab_senses WHERE slug='symptom.n.sign'), ARRAY['symptom','treatment','prescription','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 4, 'npc', 'It''s a mild sprain, not broken.', '軽い捻挫で、骨折ではありません。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 5, 'user', 'What {treatment} do I need?', 'どんな治療が必要ですか？', 'treatment', (SELECT id FROM vocab_senses WHERE slug='treatment.n.care'), ARRAY['treatment','symptom','prescription','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 6, 'npc', 'Rest, ice, and support.', '安静、冷却、固定です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 7, 'user', 'Can I take a {painkiller} for the pain?', '痛みに鎮痛剤を飲んでもいい？', 'painkiller', (SELECT id FROM vocab_senses WHERE slug='painkiller.n.medicine'), ARRAY['painkiller','symptom','allergy','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 8, 'npc', 'Yes. I''ll write it down for the pharmacy.', 'はい。薬局用に書きますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 9, 'user', 'Great, I''ll get the {prescription} filled.', 'では処方箋を出してもらいます。', 'prescription', (SELECT id FROM vocab_senses WHERE slug='prescription.n.paper'), ARRAY['prescription','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 10, 'npc', 'Stay off it for a week.', '1週間は使わないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 11, 'user', 'How long until I fully {recover}?', '完全に回復するまでどのくらい？', 'recover', (SELECT id FROM vocab_senses WHERE slug='recover.v.heal'), ARRAY['recover','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 12, 'npc', 'About two weeks.', '2週間ほどです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 13, 'user', 'Thank you, doctor.', 'ありがとう、先生。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='travel'), 14, 'npc', 'Take care!', 'お大事に！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 0, 'npc', 'Did you hear Ken is off sick?', 'ケンが病欠って聞いた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 1, 'user', 'Yes, he had a bad {symptom} all week.', 'うん、一週間ずっとつらい症状が出てた。', 'symptom', (SELECT id FROM vocab_senses WHERE slug='symptom.n.sign'), ARRAY['symptom','treatment','prescription','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 2, 'npc', 'Poor guy. What happened?', '気の毒に。何があったの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 3, 'user', 'Actually a back {injury} from moving boxes.', '実は箱運びで腰をけがして。', 'injury', (SELECT id FROM vocab_senses WHERE slug='injury.n.harm'), ARRAY['injury','symptom','allergy','prescription']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 4, 'npc', 'Ouch. Is he getting care?', '痛そう。治療は受けてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 5, 'user', 'Yes, he started physical {treatment}.', 'うん、理学治療を始めた。', 'treatment', (SELECT id FROM vocab_senses WHERE slug='treatment.n.care'), ARRAY['treatment','symptom','prescription','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 6, 'npc', 'Good. Does he need anything?', 'よかった。何か必要？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 7, 'user', 'Just to pick up his {prescription}.', '処方箋を受け取るだけ。', 'prescription', (SELECT id FROM vocab_senses WHERE slug='prescription.n.paper'), ARRAY['prescription','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 8, 'npc', 'I can do that after work.', '仕事のあとやれるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 9, 'user', 'Thanks. He should {recover} in a week or two.', 'ありがとう。1、2週間で回復するはず。', 'recover', (SELECT id FROM vocab_senses WHERE slug='recover.v.heal'), ARRAY['recover','symptom','treatment','allergy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 10, 'npc', 'We''ll cover his tasks.', '彼の仕事はカバーするよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 11, 'user', 'Also, remind the team about his nut {allergy} at lunch.', 'あと、昼食で彼のナッツアレルギーをチームに注意して。', 'allergy', (SELECT id FROM vocab_senses WHERE slug='allergy.n.reaction'), ARRAY['allergy','symptom','treatment','injury']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 12, 'npc', 'Good call. I''ll note it.', '了解。メモしておく。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 13, 'user', 'Thanks for helping out.', '手伝ってくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-21') AND goal='business'), 14, 'npc', 'Of course, {{user_name}}.', 'もちろん、{{user_name}}。', NULL, NULL, NULL);
