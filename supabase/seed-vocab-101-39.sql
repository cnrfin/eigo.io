-- ============================================================================
-- Vocab 101: Lesson 39 (A2): "Countries & languages"  (Unit 13, The wider world)
-- ----------------------------------------------------------------------------
-- Words (all new): country, language, speak, world, travel, foreign, culture, capital.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('countries', 'Countries and languages', '国と言語', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('country', 'country', NULL, NULL, NULL, 2, FALSE, NULL),
  ('language', 'language', NULL, NULL, NULL, 2, FALSE, NULL),
  ('speak', 'speak', NULL, NULL, NULL, 2, FALSE, NULL),
  ('world', 'world', NULL, NULL, NULL, 2, FALSE, NULL),
  ('travel', 'travel', NULL, NULL, NULL, 2, FALSE, NULL),
  ('foreign', 'foreign', NULL, NULL, NULL, 2, FALSE, NULL),
  ('culture', 'culture', NULL, NULL, NULL, 2, FALSE, NULL),
  ('capital', 'capital', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='country'), 'country.n.nation', 1, TRUE, 'noun', '国', 'an area of land with its own government', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='language'), 'language.n.speech', 1, TRUE, 'noun', '言語', 'the words people use to speak and write', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='speak'), 'speak.v.talk', 1, TRUE, 'verb', '話す', 'to say words with your voice', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='world'), 'world.n.earth', 1, TRUE, 'noun', '世界', 'the earth and all the people on it', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='travel'), 'travel.v.journey', 1, TRUE, 'verb', '旅行する', 'to go from one place to another, often far', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='foreign'), 'foreign.adj.abroad', 1, TRUE, 'adjective', '外国の', 'from or in another country', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='culture'), 'culture.n.society', 1, TRUE, 'noun', '文化', 'the way of life and customs of a people', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='capital'), 'capital.n.city', 1, TRUE, 'noun', '首都', 'a country''s main city, where its government is', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('country','language','speak','world','travel','foreign','culture','capital')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='countries'
WHERE s.slug IN ('country.n.nation','language.n.speech','speak.v.talk','world.n.earth','travel.v.journey','foreign.adj.abroad','culture.n.society','capital.n.city')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-39', 13, 3, (SELECT id FROM vocab_categories WHERE slug='countries'), 'Countries & languages', '国と言語', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-39'), s.id, x.ord
FROM (VALUES
  ('country.n.nation',0),('language.n.speech',1),('speak.v.talk',2),('world.n.earth',3),('travel.v.journey',4),('foreign.adj.abroad',5),('culture.n.society',6),('capital.n.city',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-39'), 'conversation', 0, 'Travel dreams', '旅の夢', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-39'), 'travel', 1, 'Where are you from?', 'どこの国？', 'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-39'), 'business', 2, 'A foreign client', '外国のお客様', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 0, 'npc', 'If you could go anywhere, where?', 'どこでも行けるなら、どこ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 1, 'user', 'So many! Which {country} first, France or Italy?', 'たくさん！どの国が先？フランス、それともイタリア？', 'country', (SELECT id FROM vocab_senses WHERE slug='country.n.nation'), ARRAY['country','world','street','city']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 2, 'npc', 'You love to {travel} to far places, don''t you?', '遠くへ旅行するのが好きだよね？', 'travel', (SELECT id FROM vocab_senses WHERE slug='travel.v.journey'), ARRAY['travel','clean','cook','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 3, 'user', 'I want to see the whole {world}, every country.', '世界中、すべての国を見たい。', 'world', (SELECT id FROM vocab_senses WHERE slug='world.n.earth'), ARRAY['street','room','city','world']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 4, 'npc', 'Would you learn the {language}?', '言語も学ぶ？', 'language', (SELECT id FROM vocab_senses WHERE slug='language.n.speech'), ARRAY['language','music','map','culture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 5, 'user', 'Definitely, at least a little.', 'もちろん、少しは。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 6, 'npc', 'That''s the spirit.', 'その意気。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 0, 'npc', 'So, which {country} are you from, which nation?', 'で、どこの国の出身？', 'country', (SELECT id FROM vocab_senses WHERE slug='country.n.nation'), ARRAY['street','city','country','world']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 1, 'user', 'Japan. Do you {speak} Japanese?', '日本。日本語話せる？', 'speak', (SELECT id FROM vocab_senses WHERE slug='speak.v.talk'), ARRAY['cook','drive','swim','speak']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 2, 'npc', 'A little! What {language}s do you know?', '少し！何語できる？', 'language', (SELECT id FROM vocab_senses WHERE slug='language.n.speech'), ARRAY['culture','map','music','language']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 3, 'user', 'Two. Is Paris the {capital} of France?', '二つ。パリはフランスの首都？', 'capital', (SELECT id FROM vocab_senses WHERE slug='capital.n.city'), ARRAY['city','map','capital','country']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 4, 'npc', 'It is! You know your geography.', 'そう！地理に詳しいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 5, 'user', 'I love learning about places.', '場所を知るのが好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 6, 'npc', 'Me too!', '私も！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 0, 'npc', 'We have a {foreign} client visiting from overseas.', '海外からの外国のお客様が来社します。', 'foreign', (SELECT id FROM vocab_senses WHERE slug='foreign.adj.abroad'), ARRAY['local','foreign','cheap','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 1, 'user', 'Nice. Should I learn about their {culture}?', 'いいね。文化を学んだ方がいい？', 'culture', (SELECT id FROM vocab_senses WHERE slug='culture.n.society'), ARRAY['culture','music','weather','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 2, 'npc', 'Yes, it helps. Do you {speak} their language?', 'うん、役立つ。彼らの言語話せる？', 'speak', (SELECT id FROM vocab_senses WHERE slug='speak.v.talk'), ARRAY['swim','drive','cook','speak']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 3, 'user', 'A bit. I''ll practice a few phrases.', '少し。いくつか練習する。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 4, 'npc', 'Great. Which {language} is it?', 'いいね。何語？', 'language', (SELECT id FROM vocab_senses WHERE slug='language.n.speech'), ARRAY['music','map','language','culture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 5, 'user', 'Spanish. I''ll be ready.', 'スペイン語。準備するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 6, 'npc', 'Perfect.', '完璧。', NULL, NULL, NULL);
