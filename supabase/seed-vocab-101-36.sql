-- ============================================================================
-- Vocab 101: Lesson 36 (A2): "Emergencies"  (Unit 12, Services and problems)
-- ----------------------------------------------------------------------------
-- Words (all new): police, lost, hospital, careful, accident, fire, ambulance, danger.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('emergencies', 'Emergencies', '緊急事態', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('police', 'police', NULL, NULL, NULL, 2, FALSE, NULL),
  ('lost', 'lost', NULL, NULL, NULL, 2, FALSE, NULL),
  ('hospital', 'hospital', NULL, NULL, NULL, 2, FALSE, NULL),
  ('careful', 'careful', NULL, NULL, NULL, 2, FALSE, NULL),
  ('accident', 'accident', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fire', 'fire', NULL, NULL, NULL, 2, FALSE, NULL),
  ('ambulance', 'ambulance', NULL, NULL, NULL, 2, FALSE, NULL),
  ('danger', 'danger', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='police'), 'police.n.safety', 1, TRUE, 'noun', '警察', 'people whose job is to keep order and safety', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lost'), 'lost.adj.astray', 1, TRUE, 'adjective', '道に迷った', 'not knowing where you are', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hospital'), 'hospital.n.medic', 1, TRUE, 'noun', '病院', 'a place where sick people are treated', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='careful'), 'careful.adj.cautious', 1, TRUE, 'adjective', '気をつけて', 'giving attention to avoid harm', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='accident'), 'accident.n.event', 1, TRUE, 'noun', '事故', 'a sudden event that causes harm', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fire'), 'fire.n.flame', 1, TRUE, 'noun', '火事', 'flames that burn and can be dangerous', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ambulance'), 'ambulance.n.medic', 1, TRUE, 'noun', '救急車', 'a vehicle that takes sick people to hospital', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='danger'), 'danger.n.risk', 1, TRUE, 'noun', '危険', 'the chance that something bad will happen', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('police','lost','hospital','careful','accident','fire','ambulance','danger')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='emergencies'
WHERE s.slug IN ('police.n.safety','lost.adj.astray','hospital.n.medic','careful.adj.cautious','accident.n.event','fire.n.flame','ambulance.n.medic','danger.n.risk')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-36', 12, 3, (SELECT id FROM vocab_categories WHERE slug='emergencies'), 'Emergencies', '緊急事態', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-36'), s.id, x.ord
FROM (VALUES
  ('police.n.safety',0),('lost.adj.astray',1),('hospital.n.medic',2),('careful.adj.cautious',3),('accident.n.event',4),('fire.n.flame',5),('ambulance.n.medic',6),('danger.n.risk',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-36'), 'conversation', 0, 'A small accident', 'ちょっとした事故', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-36'), 'travel', 1, 'Lost and asking help', '迷って助けを求める', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-36'), 'business', 2, 'Emergency drill', '避難訓練', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 0, 'npc', 'Are you okay? I saw you fall!', '大丈夫？転んだの見た！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 1, 'user', 'A small {accident}, but I''m fine.', 'ちょっとした事故、でも平気。', 'accident', (SELECT id FROM vocab_senses WHERE slug='accident.n.event'), ARRAY['party','accident','meeting','tour']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 2, 'npc', 'Please be {careful}!', '気をつけてね！', 'careful', (SELECT id FROM vocab_senses WHERE slug='careful.adj.cautious'), ARRAY['busy','careful','late','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 3, 'user', 'I will. Do I need a {hospital}?', 'うん。病院、要るかな？', 'hospital', (SELECT id FROM vocab_senses WHERE slug='hospital.n.medic'), ARRAY['hospital','museum','library','market']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 4, 'npc', 'Maybe a checkup. Are you {lost} too?', '健診はしたら。道にも迷ってる？', 'lost', (SELECT id FROM vocab_senses WHERE slug='lost.adj.astray'), ARRAY['ready','found','lost','tired']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 5, 'user', 'No, I know the way. Thanks.', 'ううん、道は分かる。ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 6, 'npc', 'Take care!', '気をつけて！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 0, 'npc', 'You look worried. Everything okay?', '不安そう。大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 1, 'user', 'I''m {lost} and my bag is gone.', '道に迷って、かばんもなくした。', 'lost', (SELECT id FROM vocab_senses WHERE slug='lost.adj.astray'), ARRAY['lost','late','ready','found']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 2, 'npc', 'My bag was stolen. Let''s call the {police}.', 'かばんを盗まれた。警察を呼ぼう。', 'police', (SELECT id FROM vocab_senses WHERE slug='police.n.safety'), ARRAY['guide','police','driver','doctor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 3, 'user', 'Thank you. Is this area a {danger}?', 'ありがとう。この辺は危険？', 'danger', (SELECT id FROM vocab_senses WHERE slug='danger.n.risk'), ARRAY['danger','museum','party','market']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 4, 'npc', 'No, but always be {careful}.', 'いや、でも常に気をつけて。', 'careful', (SELECT id FROM vocab_senses WHERE slug='careful.adj.cautious'), ARRAY['quiet','late','busy','careful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 5, 'user', 'I appreciate your help.', '助かります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 6, 'npc', 'Of course.', 'もちろん。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 0, 'npc', 'Today we practice the emergency drill.', '今日は避難訓練をします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 1, 'user', 'Where do we go if there''s a {fire}?', '火事のときはどこへ？', 'fire', (SELECT id FROM vocab_senses WHERE slug='fire.n.flame'), ARRAY['meeting','rain','fire','party']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 2, 'npc', 'Outside, then call an {ambulance} to the hospital if hurt.', '外へ、けが人が出たら病院へ救急車を呼ぶ。', 'ambulance', (SELECT id FROM vocab_senses WHERE slug='ambulance.n.medic'), ARRAY['taxi','train','bus','ambulance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 3, 'user', 'Understood. Any other {danger}s?', '了解。他に危険は？', 'danger', (SELECT id FROM vocab_senses WHERE slug='danger.n.risk'), ARRAY['market','museum','party','danger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 4, 'npc', 'Gas leaks. Always be {careful}.', 'ガス漏れ。常に気をつけて。', 'careful', (SELECT id FROM vocab_senses WHERE slug='careful.adj.cautious'), ARRAY['quiet','late','careful','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 5, 'user', 'Got it. Safety first.', '了解。安全第一。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 6, 'npc', 'Exactly.', 'その通り。', NULL, NULL, NULL);
