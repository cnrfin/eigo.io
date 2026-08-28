-- ============================================================================
-- Vocab 101: Lesson 17 (A2): "Friends & relationships"  (Unit 2, Feelings and relationships)
-- ----------------------------------------------------------------------------
-- Words (all new): know, remember, forget, together, argue, laugh, cry, trust.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('relationships', 'Friends and relationships', '友達と人間関係', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('know', 'know', NULL, NULL, NULL, 2, FALSE, NULL),
  ('remember', 'remember', NULL, NULL, NULL, 2, FALSE, NULL),
  ('forget', 'forget', NULL, NULL, NULL, 2, FALSE, NULL),
  ('together', 'together', NULL, NULL, NULL, 2, FALSE, NULL),
  ('argue', 'argue', NULL, NULL, NULL, 2, FALSE, NULL),
  ('laugh', 'laugh', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cry', 'cry', NULL, NULL, NULL, 2, FALSE, NULL),
  ('trust', 'trust', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='know'), 'know.v.aware', 1, TRUE, 'verb', '知っている', 'to have information about something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='remember'), 'remember.v.recall', 1, TRUE, 'verb', '覚えている', 'to keep something in your mind', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='forget'), 'forget.v.lose', 1, TRUE, 'verb', '忘れる', 'to fail to remember', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='together'), 'together.adv.joint', 1, TRUE, 'adverb', '一緒に', 'with each other', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='argue'), 'argue.v.fight', 1, TRUE, 'verb', '口論する', 'to disagree in an angry way', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='laugh'), 'laugh.v.joy', 1, TRUE, 'verb', '笑う', 'to make sounds because something is funny', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cry'), 'cry.v.tears', 1, TRUE, 'verb', '泣く', 'to have tears fall from your eyes', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='trust'), 'trust.v.faith', 1, TRUE, 'verb', '信頼する', 'to believe someone is honest and good', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('know','remember','forget','together','argue','laugh','cry','trust')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), (SELECT id FROM vocab_senses WHERE slug='forget.v.lose'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='forget.v.lose'), (SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='laugh.v.joy'), (SELECT id FROM vocab_senses WHERE slug='cry.v.tears'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='cry.v.tears'), (SELECT id FROM vocab_senses WHERE slug='laugh.v.joy'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='relationships'
WHERE s.slug IN ('know.v.aware','remember.v.recall','forget.v.lose','together.adv.joint','argue.v.fight','laugh.v.joy','cry.v.tears','trust.v.faith')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-17', 2, 2, (SELECT id FROM vocab_categories WHERE slug='relationships'), 'Friends & relationships', '友達と人間関係', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-17'), s.id, x.ord
FROM (VALUES
  ('know.v.aware',0),('remember.v.recall',1),('forget.v.lose',2),('together.adv.joint',3),('argue.v.fight',4),('laugh.v.joy',5),('cry.v.tears',6),('trust.v.faith',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-17'), 'conversation', 0, 'Old friends', '昔からの友達', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-17'), 'travel', 1, 'Making friends', '旅先で友達を作る', 'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-17'), 'business', 2, 'Clearing the air', 'わだかまりを解く', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 0, 'npc', 'How long have you and Mia been friends?', 'ミアとはどのくらいの付き合い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 1, 'user', 'Years! We {know} everything about each other.', '何年も！お互い何でも知ってる。', 'know', (SELECT id FROM vocab_senses WHERE slug='know.v.aware'), ARRAY['leave','forget','meet','know']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 2, 'npc', 'Do you {remember} how you met?', 'どうやって出会ったか覚えてる？', 'remember', (SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), ARRAY['forget','trust','remember','argue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 3, 'user', 'Of course. We {laugh} about it now.', 'もちろん。今では笑い話。', 'laugh', (SELECT id FROM vocab_senses WHERE slug='laugh.v.joy'), ARRAY['leave','cry','laugh','argue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 4, 'npc', 'Aw. Best friends are the best.', 'いいね。親友は最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 5, 'user', 'Yeah. She once made me {cry} happy tears.', 'うん。嬉し泣きさせられたこともある。', 'cry', (SELECT id FROM vocab_senses WHERE slug='cry.v.tears'), ARRAY['cry','sleep','shout','laugh']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 6, 'npc', 'That''s a real friend.', 'それが本当の友達だね。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 0, 'npc', 'First time staying in a hostel?', 'ホステルは初めて？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 1, 'user', 'Yes! Everyone seems friendly.', 'うん！みんなフレンドリーだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 2, 'npc', 'People {trust} each other here. It''s nice.', 'ここではみんな信頼し合ってる。いいよね。', 'trust', (SELECT id FROM vocab_senses WHERE slug='trust.v.faith'), ARRAY['argue','trust','forget','leave']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 3, 'user', 'Do you travel {together} with friends?', '友達と一緒に旅してるの？', 'together', (SELECT id FROM vocab_senses WHERE slug='together.adv.joint'), ARRAY['alone','apart','late','together']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 4, 'npc', 'Sometimes. Do you {know} anyone in town?', '時々。この町に知り合いいる？', 'know', (SELECT id FROM vocab_senses WHERE slug='know.v.aware'), ARRAY['meet','call','forget','know']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 5, 'npc', 'Do you ever {forget} people''s names?', '人の名前を忘れることある？', 'forget', (SELECT id FROM vocab_senses WHERE slug='forget.v.lose'), ARRAY['remember','know','forget','trust']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 6, 'user', 'Ha, always! But let''s get dinner together.', 'はは、いつも！でも一緒に夕飯行こう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 0, 'npc', 'Can we talk about yesterday?', '昨日のこと話せる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 1, 'user', 'Sure. I didn''t mean to {argue}.', 'もちろん。言い争うつもりはなかった。', 'argue', (SELECT id FROM vocab_senses WHERE slug='argue.v.fight'), ARRAY['forget','argue','agree','laugh']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 2, 'npc', 'It''s okay. I still {trust} you.', '大丈夫。まだ信頼してるよ。', 'trust', (SELECT id FROM vocab_senses WHERE slug='trust.v.faith'), ARRAY['argue','leave','trust','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 3, 'user', 'Thanks. I value working {together}.', 'ありがとう。一緒に働けるのが嬉しい。', 'together', (SELECT id FROM vocab_senses WHERE slug='together.adv.joint'), ARRAY['away','apart','alone','together']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 4, 'npc', 'Me too. Do you {remember} Friday''s plan?', '私も。金曜の予定覚えてる？', 'remember', (SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), ARRAY['know','argue','remember','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 5, 'user', 'Yes, it''s all set.', 'うん、準備万端。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 6, 'npc', 'Great. No hard feelings.', 'よかった。しこりなしで。', NULL, NULL, NULL);
