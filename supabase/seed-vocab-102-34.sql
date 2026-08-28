-- ============================================================================
-- Vocab 102: vocab-102-34 - Hobbies & interests  (Unit 12)
-- Words: get into, carry on, take part, join in, come along, work on, show off, try out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('hobbies-interests', 'Hobbies & interests', '趣味と関心', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('get into', 'get into', '/ˌɡet ˈɪntuː/', '/ˌɡet ˈɪntuː/', NULL, 4, FALSE, NULL),
  ('carry on', 'carry on', '/ˌkæri ˈɑːn/', '/ˌkæri ˈɒn/', NULL, 4, FALSE, NULL),
  ('take part', 'take part', '/ˌteɪk ˈpɑːrt/', '/ˌteɪk ˈpɑːt/', NULL, 3, FALSE, NULL),
  ('join in', 'join in', '/ˌdʒɔɪn ˈɪn/', '/ˌdʒɔɪn ˈɪn/', NULL, 3, FALSE, NULL),
  ('come along', 'come along', '/ˌkʌm əˈlɔːŋ/', '/ˌkʌm əˈlɒŋ/', NULL, 4, FALSE, NULL),
  ('work on', 'work on', '/ˌwɜːrk ˈɑːn/', '/ˌwɜːk ˈɒn/', NULL, 3, FALSE, NULL),
  ('show off', 'show off', '/ˌʃoʊ ˈɔːf/', '/ˌʃəʊ ˈɒf/', NULL, 4, FALSE, NULL),
  ('try out', 'try out', '/ˌtraɪ ˈaʊt/', '/ˌtraɪ ˈaʊt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='get into'), 'get-into.phrv.enjoy', 1, TRUE, 'phrasal verb', 'ハマる', 'to become interested in an activity', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='carry on'), 'carry-on.phrv.continue', 1, TRUE, 'phrasal verb', '続ける', 'to continue doing something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take part'), 'take-part.phrv.participate', 1, TRUE, 'phrasal verb', '参加する', 'to be one of the people doing an activity', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='join in'), 'join-in.phrv.participate2', 1, TRUE, 'phrasal verb', '（みんなに）加わる', 'to do an activity together with others', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='come along'), 'come-along.phrv.accompany', 1, TRUE, 'phrasal verb', '一緒に来る', 'to go somewhere with someone', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='work on'), 'work-on.phrv.improve', 1, TRUE, 'phrasal verb', '取り組む', 'to spend time improving or making something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='show off'), 'show-off.phrv.display', 1, TRUE, 'phrasal verb', '見せびらかす', 'to show your skills so others admire you', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='try out'), 'try-out.phrv.test', 1, TRUE, 'phrasal verb', '試してみる', 'to use something to see if it is good', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('get into', 'carry on', 'take part', 'join in', 'come along', 'work on', 'show off', 'try out')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='hobbies-interests'
WHERE s.slug IN ('get-into.phrv.enjoy', 'carry-on.phrv.continue', 'take-part.phrv.participate', 'join-in.phrv.participate2', 'come-along.phrv.accompany', 'work-on.phrv.improve', 'show-off.phrv.display', 'try-out.phrv.test')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-34', 12, 0, (SELECT id FROM vocab_categories WHERE slug='hobbies-interests'), 'Hobbies & interests', '趣味と関心', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-34'), s.id, x.ord FROM (VALUES
  ('get-into.phrv.enjoy',0),('carry-on.phrv.continue',1),('take-part.phrv.participate',2),('join-in.phrv.participate2',3),('come-along.phrv.accompany',4),('work-on.phrv.improve',5),('show-off.phrv.display',6),('try-out.phrv.test',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-34'), 'conversation', 0, 'A new hobby', '新しい趣味', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-34'), 'travel', 1, 'A local festival', '地元の祭り', 'festival', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-34'), 'business', 2, 'A team volunteer day', 'チームのボランティア', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 0, 'npc', 'You''ve been playing guitar a lot.', '最近ギターよく弾いてるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 1, 'user', 'Yeah, I really {get into} music these days.', 'うん、最近すっかり音楽にハマってる。', 'get into', (SELECT id FROM vocab_senses WHERE slug='get-into.phrv.enjoy'), ARRAY['get into','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 2, 'npc', 'Are you improving?', '上達してる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 3, 'user', 'I {work on} a new song every week.', '毎週新しい曲に取り組んでる。', 'work on', (SELECT id FROM vocab_senses WHERE slug='work-on.phrv.improve'), ARRAY['work on','join in','show off','come along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 4, 'npc', 'Will you perform?', '披露する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 5, 'user', 'Maybe, but I don''t like to {show off}.', 'たぶん、でも見せびらかすのは好きじゃない。', 'show off', (SELECT id FROM vocab_senses WHERE slug='show-off.phrv.display'), ARRAY['show off','carry on','get into','try out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 6, 'npc', 'Don''t give up, though.', 'でもやめないでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 7, 'user', 'I won''t; I''ll {carry on} practicing daily.', 'やめないよ、毎日練習を続ける。', 'carry on', (SELECT id FROM vocab_senses WHERE slug='carry-on.phrv.continue'), ARRAY['carry on','join in','show off','come along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 8, 'npc', 'There''s an open mic Friday.', '金曜にオープンマイクがあるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 9, 'user', 'Ooh, I could {try out} my new song there.', 'おお、新曲をそこで試せるね。', 'try out', (SELECT id FROM vocab_senses WHERE slug='try-out.phrv.test'), ARRAY['try out','carry on','show off','join in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 10, 'npc', 'Want company?', '付き添おうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 11, 'user', 'Yes! Please {come along} and cheer.', 'うん！一緒に来て応援して。', 'come along', (SELECT id FROM vocab_senses WHERE slug='come-along.phrv.accompany'), ARRAY['come along','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 12, 'npc', 'Wouldn''t miss it.', '絶対行くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 13, 'user', 'Thanks for the support.', '応援ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='conversation'), 14, 'npc', 'Break a leg, {{user_name}}!', '頑張って、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 0, 'npc', 'The village festival starts tonight!', '村の祭りが今夜始まるよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 1, 'user', 'Can visitors {take part} in the parade?', '観光客もパレードに参加できますか？', 'take part', (SELECT id FROM vocab_senses WHERE slug='take-part.phrv.participate'), ARRAY['take part','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 2, 'npc', 'Of course! Everyone''s welcome.', 'もちろん！誰でも大歓迎。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 3, 'user', 'Great, I''d love to {join in} the dancing.', 'いいですね、踊りに加わりたいです。', 'join in', (SELECT id FROM vocab_senses WHERE slug='join-in.phrv.participate2'), ARRAY['join in','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 4, 'npc', 'There''s food and music too.', '食べ物や音楽もあるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 5, 'user', 'I want to {try out} the local sweets.', '地元のお菓子を試してみたい。', 'try out', (SELECT id FROM vocab_senses WHERE slug='try-out.phrv.test'), ARRAY['try out','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 6, 'npc', 'You must! They''re famous.', 'ぜひ！有名なんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 7, 'user', 'It''s easy to {get into} the festive mood here.', 'ここは祭りの雰囲気にすぐ入り込める。', 'get into', (SELECT id FROM vocab_senses WHERE slug='get-into.phrv.enjoy'), ARRAY['get into','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 8, 'npc', 'Bring your friends along.', '友達も連れておいで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 9, 'user', 'They''ll {come along} tomorrow night.', '明日の夜、一緒に来ます。', 'come along', (SELECT id FROM vocab_senses WHERE slug='come-along.phrv.accompany'), ARRAY['come along','carry on','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 10, 'npc', 'Perfect. It runs all week.', '完璧。一週間ずっとやってるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 11, 'user', 'Does the party {carry on} past midnight?', 'パーティーは深夜過ぎまで続きますか？', 'carry on', (SELECT id FROM vocab_senses WHERE slug='carry-on.phrv.continue'), ARRAY['carry on','show off','work on','try out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 12, 'npc', 'Until dawn, usually!', 'たいてい夜明けまで！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 13, 'user', 'Amazing. Let''s go!', 'すごい。行こう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='travel'), 14, 'npc', 'Follow the music!', '音楽についておいで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 0, 'npc', 'We''re organizing a charity run.', 'チャリティーランを企画してる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 1, 'user', 'I''d like to {take part} in it.', '参加したいです。', 'take part', (SELECT id FROM vocab_senses WHERE slug='take-part.phrv.participate'), ARRAY['take part','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 2, 'npc', 'Great! Can you help plan too?', 'いいね！計画も手伝える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 3, 'user', 'Sure, I''ll {work on} the route map.', 'もちろん、コースの地図に取り組むよ。', 'work on', (SELECT id FROM vocab_senses WHERE slug='work-on.phrv.improve'), ARRAY['work on','join in','show off','come along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 4, 'npc', 'Will others help?', '他の人も手伝う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 5, 'user', 'Yes, most of the team will {join in}.', 'うん、チームのほとんどが加わる。', 'join in', (SELECT id FROM vocab_senses WHERE slug='join-in.phrv.participate2'), ARRAY['join in','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 6, 'npc', 'Even the new hires?', '新人も？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 7, 'user', 'I''ll invite them to {come along}.', '一緒に来るよう誘うよ。', 'come along', (SELECT id FROM vocab_senses WHERE slug='come-along.phrv.accompany'), ARRAY['come along','work on','show off','carry on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 8, 'npc', 'Should we make it annual?', '毎年やる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 9, 'user', 'Definitely, let''s {carry on} the tradition.', 'ぜひ、この伝統を続けよう。', 'carry on', (SELECT id FROM vocab_senses WHERE slug='carry-on.phrv.continue'), ARRAY['carry on','join in','show off','work on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 10, 'npc', 'And show the community we care.', '地域に思いを示そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 11, 'user', 'Not to {show off}, just to give back.', '見せびらかすためじゃなく、恩返しのため。', 'show off', (SELECT id FROM vocab_senses WHERE slug='show-off.phrv.display'), ARRAY['show off','join in','work on','come along']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 12, 'npc', 'Well said.', 'いい言葉だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 13, 'user', 'I''ll draft the plan.', '計画を作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-34') AND goal='business'), 14, 'npc', 'Thanks, {{user_name}}.', 'ありがとう、{{user_name}}。', NULL, NULL, NULL);
