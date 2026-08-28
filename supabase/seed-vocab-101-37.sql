-- ============================================================================
-- Vocab 101: Lesson 37 (A2): "Describing & comparing"  (Unit 13, The wider world)
-- ----------------------------------------------------------------------------
-- Words (all new): strong, weak, useful, same, different, important, real, true.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('comparing', 'Describing and comparing', '描写と比較', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('strong', 'strong', NULL, NULL, NULL, 2, FALSE, NULL),
  ('weak', 'weak', NULL, NULL, NULL, 2, FALSE, NULL),
  ('useful', 'useful', NULL, NULL, NULL, 2, FALSE, NULL),
  ('same', 'same', NULL, NULL, NULL, 2, FALSE, NULL),
  ('different', 'different', NULL, NULL, NULL, 2, FALSE, NULL),
  ('important', 'important', NULL, NULL, NULL, 2, FALSE, NULL),
  ('real', 'real', NULL, NULL, NULL, 2, FALSE, NULL),
  ('true', 'true', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='strong'), 'strong.adj.power', 1, TRUE, 'adjective', '強い', 'having a lot of power or force', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='weak'), 'weak.adj.power', 1, TRUE, 'adjective', '弱い', 'not having much power or force', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='useful'), 'useful.adj.help', 1, TRUE, 'adjective', '役に立つ', 'helpful for a purpose', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='same'), 'same.adj.identical', 1, TRUE, 'adjective', '同じ', 'not different; alike', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='different'), 'different.adj.unlike', 1, TRUE, 'adjective', '違う', 'not the same', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='important'), 'important.adj.key', 1, TRUE, 'adjective', '重要な', 'having a big effect; mattering a lot', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='real'), 'real.adj.genuine', 1, TRUE, 'adjective', '本物の', 'true and not fake', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='true'), 'true.adj.correct', 1, TRUE, 'adjective', '本当の', 'agreeing with the facts', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('strong','weak','useful','same','different','important','real','true')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), (SELECT id FROM vocab_senses WHERE slug='weak.adj.power'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='weak.adj.power'), (SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='same.adj.identical'), (SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), (SELECT id FROM vocab_senses WHERE slug='same.adj.identical'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='comparing'
WHERE s.slug IN ('strong.adj.power','weak.adj.power','useful.adj.help','same.adj.identical','different.adj.unlike','important.adj.key','real.adj.genuine','true.adj.correct')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-37', 13, 1, (SELECT id FROM vocab_categories WHERE slug='comparing'), 'Describing & comparing', '描写と比較', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-37'), s.id, x.ord
FROM (VALUES
  ('strong.adj.power',0),('weak.adj.power',1),('useful.adj.help',2),('same.adj.identical',3),('different.adj.unlike',4),('important.adj.key',5),('real.adj.genuine',6),('true.adj.correct',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-37'), 'conversation', 0, 'Comparing two options', '二つを比べる', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-37'), 'travel', 1, 'Which one to buy', 'どっちを買う', 'shop', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-37'), 'business', 2, 'Which idea matters', 'どの案が大事', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 0, 'npc', 'These two phones look alike.', 'この二つ、似てるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 1, 'user', 'They look identical. Are they the {same}?', 'そっくりだね。同じもの？', 'same', (SELECT id FROM vocab_senses WHERE slug='same.adj.identical'), ARRAY['different','new','cheap','same']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 2, 'npc', 'No, totally {different} inside.', 'いや、中身は全く違う。', 'different', (SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), ARRAY['quiet','free','different','same']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 3, 'user', 'Which has a {strong}, long-lasting battery?', 'どっちが強くて長持ちするバッテリー？', 'strong', (SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), ARRAY['short','strong','tall','weak']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 4, 'npc', 'This one. Very {useful} for travel; it does everything.', 'こっち。旅行にすごく役立つ、何でもできる。', 'useful', (SELECT id FROM vocab_senses WHERE slug='useful.adj.help'), ARRAY['useless','quiet','useful','funny']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 5, 'user', 'Then I''ll pick that.', 'じゃあそれにする。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 6, 'npc', 'Good choice.', 'いい選択。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 0, 'npc', 'Looking for a bag?', 'かばんをお探し？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 1, 'user', 'Yes. Is this one {strong} enough to carry books?', 'はい。これ、本を運べるくらい丈夫？', 'strong', (SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), ARRAY['weak','short','strong','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 2, 'npc', 'Very. The other is a bit {weak}; it might tear.', 'とても。もう一方は少し弱くて、破れるかも。', 'weak', (SELECT id FROM vocab_senses WHERE slug='weak.adj.power'), ARRAY['strong','tall','short','weak']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 3, 'user', 'Is a big one more {useful} for long trips?', '大きい方が長旅に役立つ？', 'useful', (SELECT id FROM vocab_senses WHERE slug='useful.adj.help'), ARRAY['quiet','useless','useful','funny']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 4, 'npc', 'For trips, yes. It''s quite {different} from the small one.', '旅行にはね。小さいのとはかなり違う。', 'different', (SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), ARRAY['quiet','same','free','different']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 5, 'user', 'I''ll take the strong one.', '丈夫な方にします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 6, 'npc', 'Great pick.', 'いい選択。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 0, 'npc', 'We have two proposals.', '提案が二つある。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 1, 'user', 'Which is more {important} to finish first?', 'どっちを先に終わらせるのが大事？', 'important', (SELECT id FROM vocab_senses WHERE slug='important.adj.key'), ARRAY['quiet','useless','cheap','important']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 2, 'npc', 'The second. The numbers are {real}; I checked them myself.', '二つ目。数字は本物、自分で確認した。', 'real', (SELECT id FROM vocab_senses WHERE slug='real.adj.genuine'), ARRAY['fake','free','same','real']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 3, 'user', 'And the claims are {true}, all verified?', '主張は本当？全部確認済み？', 'true', (SELECT id FROM vocab_senses WHERE slug='true.adj.correct'), ARRAY['true','same','false','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 4, 'npc', 'Yes, though the goals are the {same}, word for word.', 'うん、目標は同じ、一字一句。', 'same', (SELECT id FROM vocab_senses WHERE slug='same.adj.identical'), ARRAY['cheap','new','different','same']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 5, 'user', 'Then let''s combine them.', 'じゃあ合わせよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 6, 'npc', 'Smart.', '賢い。', NULL, NULL, NULL);
