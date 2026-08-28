-- ============================================================================
-- Vocab 102: vocab-102-9 - Meetings & tasks  (Unit 3)
-- Words: schedule, arrange, cancel, postpone, attend, agenda, presentation, workload.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('meetings-tasks', 'Meetings & tasks', '会議と仕事', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('schedule', 'schedule', '/ˈskedʒuːl/', '/ˈʃedjuːl/', NULL, 3, FALSE, NULL),
  ('arrange', 'arrange', '/əˈreɪndʒ/', '/əˈreɪndʒ/', NULL, 3, FALSE, NULL),
  ('cancel', 'cancel', '/ˈkænsl/', '/ˈkænsl/', NULL, 3, FALSE, NULL),
  ('postpone', 'postpone', '/poʊsˈtpoʊn/', '/pəˈspəʊn/', NULL, 4, FALSE, NULL),
  ('attend', 'attend', '/əˈtend/', '/əˈtend/', NULL, 3, FALSE, NULL),
  ('agenda', 'agenda', '/əˈdʒendə/', '/əˈdʒendə/', NULL, 4, FALSE, NULL),
  ('presentation', 'presentation', '/ˌpreznˈteɪʃn/', '/ˌpreznˈteɪʃn/', NULL, 3, FALSE, NULL),
  ('workload', 'workload', '/ˈwɜːrkloʊd/', '/ˈwɜːkləʊd/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='schedule'), 'schedule.n.timetable', 1, TRUE, 'noun', '予定表', 'a plan of when things will happen', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='arrange'), 'arrange.v.organize', 1, TRUE, 'verb', '手配する', 'to plan or organize something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cancel'), 'cancel.v.calloff', 1, TRUE, 'verb', '中止する', 'to decide that something will not happen', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='postpone'), 'postpone.v.delay', 1, TRUE, 'verb', '延期する', 'to move something to a later time', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='attend'), 'attend.v.gotomeeting', 1, TRUE, 'verb', '出席する', 'to go to an event or meeting', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='agenda'), 'agenda.n.itemlist', 1, TRUE, 'noun', '議題', 'a list of things to discuss at a meeting', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='presentation'), 'presentation.n.talk', 1, TRUE, 'noun', 'プレゼン', 'a talk giving information to a group', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='workload'), 'workload.n.amount', 1, TRUE, 'noun', '仕事量', 'the amount of work a person has to do', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('schedule', 'arrange', 'cancel', 'postpone', 'attend', 'agenda', 'presentation', 'workload')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='postpone.v.delay'), NULL, 'delay', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='meetings-tasks'
WHERE s.slug IN ('schedule.n.timetable', 'arrange.v.organize', 'cancel.v.calloff', 'postpone.v.delay', 'attend.v.gotomeeting', 'agenda.n.itemlist', 'presentation.n.talk', 'workload.n.amount')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-9', 3, 2, (SELECT id FROM vocab_categories WHERE slug='meetings-tasks'), 'Meetings & tasks', '会議とタスク', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-9'), s.id, x.ord FROM (VALUES
  ('schedule.n.timetable',0),('arrange.v.organize',1),('cancel.v.calloff',2),('postpone.v.delay',3),('attend.v.gotomeeting',4),('agenda.n.itemlist',5),('presentation.n.talk',6),('workload.n.amount',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-9'), 'conversation', 0, 'Planning a party', 'パーティーの計画', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-9'), 'travel', 1, 'A tour itinerary', 'ツアーの日程', 'hotel', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-9'), 'business', 2, 'Organizing a review', '会議の準備', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 0, 'npc', 'Are we still doing the party this weekend?', '今週末のパーティー、まだやる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 1, 'user', 'Yes! I''ll {arrange} the food and drinks.', 'うん！食べ物と飲み物を手配するよ。', 'arrange', (SELECT id FROM vocab_senses WHERE slug='arrange.v.organize'), ARRAY['arrange','cancel','postpone','attend']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 2, 'npc', 'Great. What time?', 'いいね。何時？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 3, 'user', 'Let''s {schedule} it for seven on Saturday.', '土曜の7時に予定しよう。', 'schedule', (SELECT id FROM vocab_senses WHERE slug='schedule.n.timetable'), ARRAY['schedule','cancel','attend','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 4, 'npc', 'Perfect. Is everyone coming?', '完璧。みんな来る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 5, 'user', 'Most can {attend}; a few are unsure.', 'ほとんど出席できる。数人は未定。', 'attend', (SELECT id FROM vocab_senses WHERE slug='attend.v.gotomeeting'), ARRAY['attend','cancel','arrange','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 6, 'npc', 'What if it rains?', '雨だったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 7, 'user', 'Then we''ll {postpone} it to Sunday.', 'そのときは日曜に延期する。', 'postpone', (SELECT id FROM vocab_senses WHERE slug='postpone.v.delay'), ARRAY['postpone','arrange','attend','cancel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 8, 'npc', 'And if it storms both days?', '両日とも荒れたら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 9, 'user', 'Then we sadly {cancel} and try next month.', '残念だけど中止して、来月にする。', 'cancel', (SELECT id FROM vocab_senses WHERE slug='cancel.v.calloff'), ARRAY['cancel','arrange','attend','schedule']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 10, 'npc', 'Fingers crossed for sun.', '晴れますように。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 11, 'user', 'Me too. I need a break from my {workload}.', '私も。仕事量から解放されたい。', 'workload', (SELECT id FROM vocab_senses WHERE slug='workload.n.amount'), ARRAY['workload','agenda','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 12, 'npc', 'You work too hard!', '働きすぎだよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 13, 'user', 'This party is my reward.', 'このパーティーがご褒美。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='conversation'), 14, 'npc', 'Well earned, {{user_name}}.', '当然のご褒美だね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 0, 'npc', 'Here''s the plan for your three days.', '3日間のプランです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 1, 'user', 'Thanks. Is the {schedule} flexible?', 'ありがとう。予定は融通きく？', 'schedule', (SELECT id FROM vocab_senses WHERE slug='schedule.n.timetable'), ARRAY['schedule','agenda','workload','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 2, 'npc', 'Somewhat. Mornings are fixed.', '少しは。午前は固定です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 3, 'user', 'Can I {attend} the cooking class on day two?', '2日目の料理教室に参加できますか？', 'attend', (SELECT id FROM vocab_senses WHERE slug='attend.v.gotomeeting'), ARRAY['attend','cancel','arrange','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 4, 'npc', 'Of course, I''ll add you.', 'もちろん、追加します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 5, 'user', 'Could you {arrange} a taxi for the airport too?', '空港へのタクシーも手配してもらえますか？', 'arrange', (SELECT id FROM vocab_senses WHERE slug='arrange.v.organize'), ARRAY['arrange','cancel','attend','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 6, 'npc', 'Done. Anything to remove?', '了解。外したいものは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 7, 'user', 'Let''s {cancel} the museum; I''ve seen it.', '美術館は中止で。もう見たので。', 'cancel', (SELECT id FROM vocab_senses WHERE slug='cancel.v.calloff'), ARRAY['cancel','arrange','attend','schedule']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 8, 'npc', 'No problem. The hike is weather-dependent.', '大丈夫。ハイキングは天気次第です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 9, 'user', 'If it rains, can we {postpone} the hike?', '雨なら、ハイキングは延期できますか？', 'postpone', (SELECT id FROM vocab_senses WHERE slug='postpone.v.delay'), ARRAY['postpone','arrange','attend','cancel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 10, 'npc', 'Yes, we''ll move it to day three.', 'はい、3日目に移します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 11, 'user', 'Great. What''s on the {agenda} for tonight?', 'いいですね。今夜の予定は何ですか？', 'agenda', (SELECT id FROM vocab_senses WHERE slug='agenda.n.itemlist'), ARRAY['agenda','workload','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 12, 'npc', 'A welcome dinner by the harbor.', '港での歓迎ディナーです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 13, 'user', 'That sounds lovely.', '素敵ですね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='travel'), 14, 'npc', 'Enjoy your stay!', '滞在を楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 0, 'npc', 'Can you set up the quarterly review?', '四半期レビューを準備できる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 1, 'user', 'Sure. I''ll {schedule} it for next Tuesday.', 'いいよ。来週火曜に予定するね。', 'schedule', (SELECT id FROM vocab_senses WHERE slug='schedule.n.timetable'), ARRAY['schedule','cancel','attend','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 2, 'npc', 'Good. Who needs to be there?', 'いいね。誰が必要？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 3, 'user', 'All team leads should {attend}.', 'チームリーダー全員が出席すべき。', 'attend', (SELECT id FROM vocab_senses WHERE slug='attend.v.gotomeeting'), ARRAY['attend','cancel','arrange','postpone']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 4, 'npc', 'Send them the topics in advance.', '事前に議題を送って。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 5, 'user', 'I''ll email the {agenda} tomorrow.', '明日、議題をメールするよ。', 'agenda', (SELECT id FROM vocab_senses WHERE slug='agenda.n.itemlist'), ARRAY['agenda','workload','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 6, 'npc', 'Are you presenting the results?', '結果は君が発表する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 7, 'user', 'Yes, I''m preparing the {presentation} now.', 'うん、今プレゼンを準備してる。', 'presentation', (SELECT id FROM vocab_senses WHERE slug='presentation.n.talk'), ARRAY['presentation','agenda','schedule','workload']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 8, 'npc', 'The CEO might be traveling that day.', 'その日、CEOは出張かも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 9, 'user', 'If so, we can {postpone} it a week.', 'それなら1週間延期できる。', 'postpone', (SELECT id FROM vocab_senses WHERE slug='postpone.v.delay'), ARRAY['postpone','arrange','attend','cancel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 10, 'npc', 'Let''s keep it if we can.', 'できれば予定通りで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 11, 'user', 'Agreed. My {workload} is lighter next week anyway.', '賛成。どのみち来週は仕事量が軽い。', 'workload', (SELECT id FROM vocab_senses WHERE slug='workload.n.amount'), ARRAY['workload','agenda','schedule','presentation']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 12, 'npc', 'Perfect. Thanks for organizing.', '完璧。準備ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 13, 'user', 'Happy to help.', '喜んで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-9') AND goal='business'), 14, 'npc', 'You''re a star, {{user_name}}.', '助かるよ、{{user_name}}。', NULL, NULL, NULL);
