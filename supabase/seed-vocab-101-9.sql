-- ============================================================================
-- Vocab 101 — Lesson 9 (new): "Feelings"  (Unit 2)
-- ----------------------------------------------------------------------------
-- Words: happy, sad, tired, angry, worried, excited, bored, scared. Each blank
-- is pinned by its cause. American spelling, no em-dashes. Options answer-first.
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('feelings', 'Feelings', '気持ち', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('happy',   'happy',   '/ˈhæpi/',    '/ˈhæpi/',    140, 1, FALSE, NULL),
  ('sad',     'sad',     '/sæd/',      '/sæd/',      450, 1, FALSE, NULL),
  ('tired',   'tired',   '/ˈtaɪərd/',  '/ˈtaɪəd/',   400, 1, FALSE, NULL),
  ('angry',   'angry',   '/ˈæŋɡri/',   '/ˈæŋɡri/',   500, 1, FALSE, NULL),
  ('worried', 'worried', '/ˈwɜːrid/',  '/ˈwʌrid/',   600, 2, FALSE, NULL),
  ('excited', 'excited', '/ɪkˈsaɪtɪd/','/ɪkˈsaɪtɪd/',550, 2, FALSE, 'エキサイト。/ɪkˈsaɪtɪd/。'),
  ('bored',   'bored',   '/bɔːrd/',    '/bɔːd/',     650, 2, FALSE, 'bored=退屈している。boring=退屈させる。'),
  ('scared',  'scared',  '/skɛrd/',    '/skeəd/',    700, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='happy'),   'happy.adj.glad',      1, TRUE, 'adjective', 'うれしい', 'feeling pleased and good', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sad'),     'sad.adj.unhappy',     1, TRUE, 'adjective', '悲しい',           'feeling unhappy', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tired'),   'tired.adj.sleepy',    1, TRUE, 'adjective', '疲れた',     'needing rest or sleep', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='angry'),   'angry.adj.mad',       1, TRUE, 'adjective', '怒った',           'feeling strong displeasure', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='worried'), 'worried.adj.anxious', 1, TRUE, 'adjective', '心配した',         'thinking something bad may happen', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='excited'), 'excited.adj.eager',   1, TRUE, 'adjective', 'わくわくした',     'very happy and eager about something', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bored'),   'bored.adj.dull',      1, TRUE, 'adjective', '退屈した',         'not interested; having nothing to do', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='scared'),  'scared.adj.afraid',   1, TRUE, 'adjective', '怖がった',         'feeling afraid', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('happy','sad','tired','angry','worried','excited','bored','scared')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'),    (SELECT id FROM vocab_senses WHERE slug='sad.adj.unhappy'),  NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='sad.adj.unhappy'),   (SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='excited.adj.eager'), (SELECT id FROM vocab_senses WHERE slug='bored.adj.dull'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'),    NULL, 'glad',    'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'),NULL,'nervous', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='scared.adj.afraid'), NULL, 'afraid',  'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='feelings'
WHERE s.slug IN ('happy.adj.glad','sad.adj.unhappy','tired.adj.sleepy','angry.adj.mad','worried.adj.anxious','excited.adj.eager','bored.adj.dull','scared.adj.afraid')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-9', 1, 9, (SELECT id FROM vocab_categories WHERE slug='feelings'), 'Feelings', '気持ち', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-9'), s.id, x.ord
FROM (VALUES
  ('happy.adj.glad',0),('sad.adj.unhappy',1),('tired.adj.sleepy',2),('angry.adj.mad',3),
  ('worried.adj.anxious',4),('excited.adj.eager',5),('bored.adj.dull',6),('scared.adj.afraid',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-9'), 'conversation', 0, 'Checking on a friend',   '友達を気づかう',   'home',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-9'), 'travel',       1, 'A long travel day',      '長い移動の一日',   'airport','companion'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-9'), 'business',     2, 'A stressful day at work','忙しい仕事の日',   'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 0, 'npc', 'Hey, you seem quiet today.', 'ねえ、今日は静かだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 1, 'user', 'Yeah, I''m a bit {sad}. My dog is sick.', 'うん、ちょっと悲しくて。犬が病気なんだ。', 'sad', (SELECT id FROM vocab_senses WHERE slug='sad.adj.unhappy'), ARRAY['happy','hungry','sad','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 2, 'npc', 'Oh no, I''m sorry. Is it serious?', 'えっ、大丈夫？ひどいの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 3, 'user', 'The vet isn''t sure. I''m {scared}.', '獣医さんも分からなくて。怖いよ。', 'scared', (SELECT id FROM vocab_senses WHERE slug='scared.adj.afraid'), ARRAY['full','bored','scared','excited']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 4, 'npc', 'That''s really hard. He''ll be okay.', 'それはつらいね。きっと大丈夫だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 5, 'user', 'Thanks. I''m just {worried} about him.', 'ありがとう。ただ心配で。', 'worried', (SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'), ARRAY['happy','sleepy','worried','hungry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 6, 'npc', 'Do you want to talk, or get some food?', '話す？それとも何か食べに行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 7, 'user', 'Maybe food. I''m {tired} of worrying.', '食べようかな。心配し疲れたよ。', 'tired', (SELECT id FROM vocab_senses WHERE slug='tired.adj.sleepy'), ARRAY['excited','tired','cold','angry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 8, 'npc', 'Let''s go. My treat.', '行こう。おごるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 9, 'user', 'Aw, that makes me {happy}. Thanks.', 'うれしい、ありがとう。', 'happy', (SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'), ARRAY['sad','angry','happy','scared']);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 0, 'npc', 'Ugh, that flight was delayed for hours.', 'あー、フライトが何時間も遅れたね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 1, 'user', 'I know, I''m so {tired}.', 'ほんと、すごく疲れた。', 'tired', (SELECT id FROM vocab_senses WHERE slug='tired.adj.sleepy'), ARRAY['cold','tired','hungry','happy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 2, 'npc', 'Me too. That wait was endless.', '私も。待ち時間が長すぎた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 3, 'user', 'Right? I got so {bored} sitting there.', 'だよね。座ってて超退屈だった。', 'bored', (SELECT id FROM vocab_senses WHERE slug='bored.adj.dull'), ARRAY['scared','excited','bored','angry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 4, 'npc', 'At least we''re here now. Look at that view!', 'でも着いたよ。あの景色見て！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 5, 'user', 'Wow, now I''m {excited} again!', 'わあ、またわくわくしてきた！', 'excited', (SELECT id FROM vocab_senses WHERE slug='excited.adj.eager'), ARRAY['sad','excited','worried','tired']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 6, 'npc', 'Let''s find the hotel before dark.', '暗くなる前にホテルを探そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 7, 'user', 'Okay. I''m a bit {worried} we''ll get lost.', 'うん。道に迷わないか少し心配。', 'worried', (SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'), ARRAY['worried','happy','hungry','full']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 8, 'npc', 'Don''t worry, I have a map.', '大丈夫、地図があるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 9, 'user', 'Phew. Okay, now I''m {happy}!', 'ほっ。よし、これで嬉しい！', 'happy', (SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'), ARRAY['sad','angry','happy','scared']);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 0, 'npc', 'You seem stressed. Everything okay?', '大変そうですね。大丈夫ですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 1, 'user', 'A little {worried}. The client is unhappy.', '少し心配で。クライアントが不満なんです。', 'worried', (SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'), ARRAY['bored','worried','excited','hungry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 2, 'npc', 'Ah. What happened?', 'そうですか。何があったんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 3, 'user', 'They were {angry} about the delay.', '遅れに怒っていました。', 'angry', (SELECT id FROM vocab_senses WHERE slug='angry.adj.mad'), ARRAY['angry','happy','hungry','tired']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 4, 'npc', 'That''s tough. Did you fix it?', 'それは大変。解決しました？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 5, 'user', 'Yes! So now I''m {happy} and relieved.', 'はい！だから今はうれしくてほっとしています。', 'happy', (SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'), ARRAY['happy','scared','sad','bored']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 6, 'npc', 'Great work. You must be exhausted.', 'お疲れさま。くたくたでしょう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 7, 'user', 'Honestly, I''m really {tired}.', '正直、本当に疲れました。', 'tired', (SELECT id FROM vocab_senses WHERE slug='tired.adj.sleepy'), ARRAY['excited','angry','tired','hungry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 8, 'npc', 'Go home and rest.', '家に帰って休んで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 9, 'user', 'I will. Actually, I''m {excited} for the weekend now!', 'そうします。実は今から週末が楽しみです！', 'excited', (SELECT id FROM vocab_senses WHERE slug='excited.adj.eager'), ARRAY['angry','excited','sad','worried']);
