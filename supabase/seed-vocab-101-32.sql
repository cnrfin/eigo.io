-- ============================================================================
-- Vocab 101: Lesson 32 (A2): "The body"  (Unit 10, Health and body)
-- ----------------------------------------------------------------------------
-- Words (all new): head, stomach, back, throat, sore, arm, leg, hand.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('body', 'The body', '体', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('head', 'head', NULL, NULL, NULL, 2, FALSE, NULL),
  ('stomach', 'stomach', NULL, NULL, NULL, 2, FALSE, NULL),
  ('back', 'back', NULL, NULL, NULL, 2, FALSE, NULL),
  ('throat', 'throat', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sore', 'sore', NULL, NULL, NULL, 2, FALSE, NULL),
  ('arm', 'arm', NULL, NULL, NULL, 2, FALSE, NULL),
  ('leg', 'leg', NULL, NULL, NULL, 2, FALSE, NULL),
  ('hand', 'hand', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='head'), 'head.n.body', 1, TRUE, 'noun', '頭', 'the top part of your body, above your neck', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stomach'), 'stomach.n.body', 1, TRUE, 'noun', 'お腹', 'the part of your body where food goes', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='back'), 'back.n.body', 1, TRUE, 'noun', '背中', 'the rear part of your body', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='throat'), 'throat.n.body', 1, TRUE, 'noun', 'のど', 'the passage at the back of your mouth', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sore'), 'sore.adj.hurt', 1, TRUE, 'adjective', '痛い', 'painful, especially when touched', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='arm'), 'arm.n.body', 1, TRUE, 'noun', '腕', 'the long part of your body from shoulder to hand', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='leg'), 'leg.n.body', 1, TRUE, 'noun', '脚', 'the long part of your body you stand on', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hand'), 'hand.n.body', 1, TRUE, 'noun', '手', 'the part at the end of your arm with fingers', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('head','stomach','back','throat','sore','arm','leg','hand')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='body'
WHERE s.slug IN ('head.n.body','stomach.n.body','back.n.body','throat.n.body','sore.adj.hurt','arm.n.body','leg.n.body','hand.n.body')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-32', 10, 3, (SELECT id FROM vocab_categories WHERE slug='body'), 'The body', '体', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-32'), s.id, x.ord
FROM (VALUES
  ('head.n.body',0),('stomach.n.body',1),('back.n.body',2),('throat.n.body',3),('sore.adj.hurt',4),('arm.n.body',5),('leg.n.body',6),('hand.n.body',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-32'), 'conversation', 0, 'Aches and pains', 'あちこち痛い', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-32'), 'travel', 1, 'Where does it hurt?', 'どこが痛い？', 'clinic', 'doctor'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-32'), 'business', 2, 'Desk ergonomics', 'デスクの姿勢', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 0, 'npc', 'You don''t look well. What hurts?', '元気なさそう。どこが痛いの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 1, 'user', 'My {head} is pounding.', '頭がずきずきする。', 'head', (SELECT id FROM vocab_senses WHERE slug='head.n.body'), ARRAY['head','arm','leg','hand']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 2, 'npc', 'Did you eat? Maybe your {stomach}?', '食べた？お腹かも？', 'stomach', (SELECT id FROM vocab_senses WHERE slug='stomach.n.body'), ARRAY['head','stomach','back','throat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 3, 'user', 'No, it''s my {throat} too. It''s dry.', 'ううん、のども。乾いてる。', 'throat', (SELECT id FROM vocab_senses WHERE slug='throat.n.body'), ARRAY['stomach','back','throat','leg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 4, 'npc', 'Sounds like a cold. Everything {sore}?', '風邪っぽいね。全身痛い？', 'sore', (SELECT id FROM vocab_senses WHERE slug='sore.adj.hurt'), ARRAY['happy','fresh','sore','easy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 5, 'user', 'Pretty much. I''ll rest.', 'だいたいね。休むよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 6, 'npc', 'Feel better!', 'お大事に！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 0, 'npc', 'Where does it hurt?', 'どこが痛みますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 1, 'user', 'My lower {back}, mostly.', '主に腰（背中の下）です。', 'back', (SELECT id FROM vocab_senses WHERE slug='back.n.body'), ARRAY['hand','head','throat','back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 2, 'npc', 'Can you lift your {arm} above your head?', '腕を頭の上まで上げられますか？', 'arm', (SELECT id FROM vocab_senses WHERE slug='arm.n.body'), ARRAY['throat','head','leg','arm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 3, 'user', 'Yes, but my {leg} is stiff when I walk.', 'はい、でも歩くと脚がこわばって。', 'leg', (SELECT id FROM vocab_senses WHERE slug='leg.n.body'), ARRAY['head','leg','arm','hand']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 4, 'npc', 'I see. Is it very {sore}?', 'なるほど。とても痛いですか？', 'sore', (SELECT id FROM vocab_senses WHERE slug='sore.adj.hurt'), ARRAY['sore','easy','happy','fresh']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 5, 'user', 'A little, when I walk.', '歩くと少し。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 6, 'npc', 'Let''s take a look.', '診てみましょう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 0, 'npc', 'Long day at the desk, huh?', '一日中デスクワークだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 1, 'user', 'Yeah, my {back} aches from sitting all day.', '一日中座って背中が痛い。', 'back', (SELECT id FROM vocab_senses WHERE slug='back.n.body'), ARRAY['throat','leg','back','head']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 2, 'npc', 'Stretch your {hand}s too, from typing.', 'タイピングで手も疲れるよ、伸ばして。', 'hand', (SELECT id FROM vocab_senses WHERE slug='hand.n.body'), ARRAY['throat','leg','head','hand']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 3, 'user', 'Good point. My {arm} feels tight when I reach up.', '確かに。腕を上げると張る。', 'arm', (SELECT id FROM vocab_senses WHERE slug='arm.n.body'), ARRAY['head','arm','throat','leg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 4, 'npc', 'Take breaks so nothing gets {sore}.', '痛くならないよう休憩をね。', 'sore', (SELECT id FROM vocab_senses WHERE slug='sore.adj.hurt'), ARRAY['sore','happy','easy','fresh']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 5, 'user', 'I''ll set a timer.', 'タイマーをかけるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 6, 'npc', 'Smart.', '賢いね。', NULL, NULL, NULL);
