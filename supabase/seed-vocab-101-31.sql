-- ============================================================================
-- Vocab 101: Lesson 31 (A2): "At the doctor"  (Unit 10, Health and body)
-- ----------------------------------------------------------------------------
-- Words (all new): pain, feel, cough, worse, nurse, appointment, temperature, checkup.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('at-doctor', 'At the doctor', '診察', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pain', 'pain', NULL, NULL, NULL, 2, FALSE, NULL),
  ('feel', 'feel', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cough', 'cough', NULL, NULL, NULL, 2, FALSE, NULL),
  ('worse', 'worse', NULL, NULL, NULL, 2, FALSE, NULL),
  ('nurse', 'nurse', NULL, NULL, NULL, 2, FALSE, NULL),
  ('appointment', 'appointment', NULL, NULL, NULL, 2, FALSE, NULL),
  ('temperature', 'temperature', NULL, NULL, NULL, 2, FALSE, NULL),
  ('checkup', 'checkup', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pain'), 'pain.n.hurt', 1, TRUE, 'noun', '痛み', 'a feeling of hurt in your body', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='feel'), 'feel.v.sense', 1, TRUE, 'verb', '感じる', 'to experience something in your body or mind', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cough'), 'cough.v.throat', 1, TRUE, 'verb', '咳をする', 'to push air out of your throat with a sharp sound', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='worse'), 'worse.adj.bad', 1, TRUE, 'adjective', 'もっと悪い', 'more bad than before', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='nurse'), 'nurse.n.medic', 1, TRUE, 'noun', '看護師', 'a person who cares for sick people', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='appointment'), 'appointment.n.time', 1, TRUE, 'noun', '予約', 'an arranged time to meet or be seen', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='temperature'), 'temperature.n.heat', 1, TRUE, 'noun', '体温', 'how hot or cold something is', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='checkup'), 'checkup.n.exam', 1, TRUE, 'noun', '健康診断', 'a medical examination to check your health', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pain','feel','cough','worse','nurse','appointment','temperature','checkup')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='worse.adj.bad'), (SELECT id FROM vocab_senses WHERE slug='better.adj.improved'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='at-doctor'
WHERE s.slug IN ('pain.n.hurt','feel.v.sense','cough.v.throat','worse.adj.bad','nurse.n.medic','appointment.n.time','temperature.n.heat','checkup.n.exam')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-31', 10, 2, (SELECT id FROM vocab_categories WHERE slug='at-doctor'), 'At the doctor', '医者にかかる', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-31'), s.id, x.ord
FROM (VALUES
  ('pain.n.hurt',0),('feel.v.sense',1),('cough.v.throat',2),('worse.adj.bad',3),('nurse.n.medic',4),('appointment.n.time',5),('temperature.n.heat',6),('checkup.n.exam',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-31'), 'conversation', 0, 'See a doctor', '医者に行きなよ', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-31'), 'travel', 1, 'Making an appointment', '予約を取る', 'clinic', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-31'), 'business', 2, 'Time off for a checkup', '健診で休む', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 0, 'npc', 'You''ve been coughing a lot.', 'よく咳してるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 1, 'user', 'Yeah, I {feel} awful today.', 'うん、今日はひどい気分。', 'feel', (SELECT id FROM vocab_senses WHERE slug='feel.v.sense'), ARRAY['drive','clean','cook','feel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 2, 'npc', 'Any {pain} anywhere?', 'どこか痛い？', 'pain', (SELECT id FROM vocab_senses WHERE slug='pain.n.hurt'), ARRAY['help','pain','rest','fever']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 3, 'user', 'My chest hurts, and I {cough} a lot at night.', '胸が痛くて、夜はよく咳き込む。', 'cough', (SELECT id FROM vocab_senses WHERE slug='cough.v.throat'), ARRAY['sleep','laugh','cough','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 4, 'npc', 'That sounds {worse}, more painful than yesterday.', '昨日より痛そうで、悪化してるね。', 'worse', (SELECT id FROM vocab_senses WHERE slug='worse.adj.bad'), ARRAY['free','better','worse','easy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 5, 'user', 'It is. I should see someone.', 'うん。診てもらうべきだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 6, 'npc', 'Definitely.', '絶対に。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 0, 'npc', 'Hello, do you have an {appointment}?', 'こんにちは、ご予約はありますか？', 'appointment', (SELECT id FROM vocab_senses WHERE slug='appointment.n.time'), ARRAY['seat','ticket','receipt','appointment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 1, 'user', 'No. Can I see a {nurse} today?', 'いいえ。今日、看護師さんに診てもらえますか？', 'nurse', (SELECT id FROM vocab_senses WHERE slug='nurse.n.medic'), ARRAY['clerk','teacher','driver','nurse']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 2, 'npc', 'Yes. First, a quick {checkup}.', 'はい。まず簡単な健康チェックを。', 'checkup', (SELECT id FROM vocab_senses WHERE slug='checkup.n.exam'), ARRAY['ticket','checkup','tour','class']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 3, 'user', 'Sure. Will you take my {temperature}?', 'はい。体温を測りますか？', 'temperature', (SELECT id FROM vocab_senses WHERE slug='temperature.n.heat'), ARRAY['receipt','fever','pain','temperature']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 4, 'npc', 'Yes, please sit here.', 'はい、こちらにおかけください。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 5, 'user', 'Thank you.', 'ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 6, 'npc', 'The nurse will call you soon.', '看護師がすぐお呼びします。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 0, 'npc', 'You look a bit pale. Everything okay?', '少し顔色悪いね。大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 1, 'user', 'I have a doctor''s {appointment} tomorrow.', '明日、医者の予約があるんだ。', 'appointment', (SELECT id FROM vocab_senses WHERE slug='appointment.n.time'), ARRAY['appointment','ticket','seat','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 2, 'npc', 'A {checkup}?', '健康診断？', 'checkup', (SELECT id FROM vocab_senses WHERE slug='checkup.n.exam'), ARRAY['ticket','class','tour','checkup']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 3, 'user', 'Yes. I {feel} tired lately.', 'うん。最近だるくて。', 'feel', (SELECT id FROM vocab_senses WHERE slug='feel.v.sense'), ARRAY['feel','cook','drive','clean']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 4, 'npc', 'Rest up. Don''t let it get {worse}.', '休んでね。悪化させないで。', 'worse', (SELECT id FROM vocab_senses WHERE slug='worse.adj.bad'), ARRAY['better','free','easy','worse']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 5, 'user', 'Thanks. I''ll take the morning off.', 'ありがとう。午前は休むよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 6, 'npc', 'Of course.', 'もちろん。', NULL, NULL, NULL);
