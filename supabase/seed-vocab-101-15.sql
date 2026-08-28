-- ============================================================================
-- Vocab 101: Lesson 15 (A2): "Describing people"  (Unit 1, People and introductions)
-- ----------------------------------------------------------------------------
-- Words (all new): tall, short, kind, funny, quiet, hair, friendly, young.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('describe-people', 'Describing people', '人の描写', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('tall', 'tall', NULL, NULL, NULL, 2, FALSE, NULL),
  ('short', 'short', NULL, NULL, NULL, 2, FALSE, NULL),
  ('kind', 'kind', NULL, NULL, NULL, 2, FALSE, NULL),
  ('funny', 'funny', NULL, NULL, NULL, 2, FALSE, NULL),
  ('quiet', 'quiet', NULL, NULL, NULL, 2, FALSE, NULL),
  ('hair', 'hair', NULL, NULL, NULL, 2, FALSE, NULL),
  ('friendly', 'friendly', NULL, NULL, NULL, 2, FALSE, NULL),
  ('young', 'young', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='tall'), 'tall.adj.height', 1, TRUE, 'adjective', '背が高い', 'having more than average height', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='short'), 'short.adj.height', 1, TRUE, 'adjective', '背が低い', 'small in height or length', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='kind'), 'kind.adj.nice', 1, TRUE, 'adjective', '親切な', 'caring and gentle toward others', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='funny'), 'funny.adj.humor', 1, TRUE, 'adjective', '面白い', 'making you laugh', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='quiet'), 'quiet.adj.calm', 1, TRUE, 'adjective', '静かな', 'not talking or making much noise', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hair'), 'hair.n.head', 1, TRUE, 'noun', '髪', 'the threads that grow on your head', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='friendly'), 'friendly.adj.warm', 1, TRUE, 'adjective', 'フレンドリーな', 'behaving in a warm, kind way', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='young'), 'young.adj.age', 1, TRUE, 'adjective', '若い', 'not old; early in life', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('tall','short','kind','funny','quiet','hair','friendly','young')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), (SELECT id FROM vocab_senses WHERE slug='short.adj.height'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='short.adj.height'), (SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='describe-people'
WHERE s.slug IN ('tall.adj.height','short.adj.height','kind.adj.nice','funny.adj.humor','quiet.adj.calm','hair.n.head','friendly.adj.warm','young.adj.age')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-15', 1, 4, (SELECT id FROM vocab_categories WHERE slug='describe-people'), 'Describing people', '人を描写する', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-15'), s.id, x.ord
FROM (VALUES
  ('tall.adj.height',0),('short.adj.height',1),('kind.adj.nice',2),('funny.adj.humor',3),('quiet.adj.calm',4),('hair.n.head',5),('friendly.adj.warm',6),('young.adj.age',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-15'), 'conversation', 0, 'Describing a friend', '友達の描写', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-15'), 'travel', 1, 'Meeting the host family', 'ホストファミリーに会う', 'guesthouse', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-15'), 'business', 2, 'A new coworker', '新しい同僚', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 0, 'npc', 'Have you met my friend Sam?', '私の友達サムに会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 1, 'user', 'I think so. Is he really {tall}, over six feet?', 'たぶん。彼、本当に背が高い？180センチ超え？', 'tall', (SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), ARRAY['kind','young','tall','short']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 2, 'npc', 'Yes! And super {funny} too, always cracking jokes.', 'うん！しかもすごく面白くて、いつも冗談を言ってる。', 'funny', (SELECT id FROM vocab_senses WHERE slug='funny.adj.humor'), ARRAY['quiet','sick','funny','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 3, 'user', 'Oh right. He''s very {kind}, always helping people.', 'そうだ。彼ってとても親切で、いつも人を助けてる。', 'kind', (SELECT id FROM vocab_senses WHERE slug='kind.adj.nice'), ARRAY['tall','kind','loud','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 4, 'npc', 'So kind. A bit {quiet}, though; he rarely speaks up.', '本当に親切。でも少しおとなしくて、あまり自分から話さない。', 'quiet', (SELECT id FROM vocab_senses WHERE slug='quiet.adj.calm'), ARRAY['tall','young','funny','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 5, 'user', 'That''s okay. I like quiet people.', 'いいよ。静かな人は好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 6, 'npc', 'Me too. You''ll get along!', '私も。気が合うよ！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 0, 'npc', 'Welcome! Let me tell you about the family.', 'ようこそ！家族を紹介しますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 1, 'user', 'Thank you! Are they {friendly} and welcoming?', 'ありがとう！みんなフレンドリーで歓迎してくれる？', 'friendly', (SELECT id FROM vocab_senses WHERE slug='friendly.adj.warm'), ARRAY['busy','angry','friendly','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 2, 'npc', 'Very! My daughter is {young}, just six.', 'とても！娘は若くて、まだ6歳。', 'young', (SELECT id FROM vocab_senses WHERE slug='young.adj.age'), ARRAY['kind','young','short','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 3, 'user', 'How sweet. And your son?', '可愛いですね。息子さんは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 4, 'npc', 'Tall, with long {hair} down to his shoulders.', '背が高くて、肩まで届く長い髪だよ。', 'hair', (SELECT id FROM vocab_senses WHERE slug='hair.n.head'), ARRAY['coat','hair','bag','eyes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 5, 'user', 'Got it. Is he {tall} like you, over six feet?', '了解。あなたみたいに背が高い？180超え？', 'tall', (SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), ARRAY['quiet','young','short','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 6, 'npc', 'Even taller! Come in.', 'もっと高いよ！どうぞ。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 0, 'npc', 'Have you met the new hire yet?', '新しい人にもう会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 1, 'user', 'Not yet. What''s she like?', 'まだ。どんな人？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 2, 'npc', 'Really {kind}; she helps everyone in the team.', 'とても親切で、チームのみんなを助けてくれる。', 'kind', (SELECT id FROM vocab_senses WHERE slug='kind.adj.nice'), ARRAY['late','tall','kind','loud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 3, 'user', 'Nice. Is she {quiet} or outgoing?', 'いいね。おとなしい？それとも社交的？', 'quiet', (SELECT id FROM vocab_senses WHERE slug='quiet.adj.calm'), ARRAY['quiet','busy','young','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 4, 'npc', 'Pretty {friendly}, actually; she chats with everyone.', '実はかなりフレンドリーで、誰とでも話す。', 'friendly', (SELECT id FROM vocab_senses WHERE slug='friendly.adj.warm'), ARRAY['friendly','sick','angry','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 5, 'user', 'Great. Is she {short} or tall?', 'いいね。背は低い？高い？', 'short', (SELECT id FROM vocab_senses WHERE slug='short.adj.height'), ARRAY['young','short','tall','kind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 6, 'npc', 'Quite short, but full of energy!', '結構小柄だけど元気いっぱい！', NULL, NULL, NULL);
