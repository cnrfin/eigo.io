-- ============================================================================
-- Vocab 101: Lesson 25 (A2): "At work"  (Unit 7, Work and study)
-- ----------------------------------------------------------------------------
-- Words (all new): meeting, email, boss, project, deadline, report, desk, colleague.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('at-work', 'At work', '職場で', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('meeting', 'meeting', NULL, NULL, NULL, 2, FALSE, NULL),
  ('email', 'email', NULL, NULL, NULL, 2, FALSE, NULL),
  ('boss', 'boss', NULL, NULL, NULL, 2, FALSE, NULL),
  ('project', 'project', NULL, NULL, NULL, 2, FALSE, NULL),
  ('deadline', 'deadline', NULL, NULL, NULL, 2, FALSE, NULL),
  ('report', 'report', NULL, NULL, NULL, 2, FALSE, NULL),
  ('desk', 'desk', NULL, NULL, NULL, 2, FALSE, NULL),
  ('colleague', 'colleague', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='meeting'), 'meeting.n.work', 1, TRUE, 'noun', '会議', 'a time when people gather to talk about work', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='email'), 'email.n.msg', 1, TRUE, 'noun', 'メール', 'a message sent over the internet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='boss'), 'boss.n.work', 1, TRUE, 'noun', '上司', 'the person who leads you at work', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='project'), 'project.n.work', 1, TRUE, 'noun', 'プロジェクト', 'a planned piece of work', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='deadline'), 'deadline.n.time', 1, TRUE, 'noun', '締め切り', 'the time by which work must be done', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='report'), 'report.n.doc', 1, TRUE, 'noun', '報告書', 'a written account of work or facts', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='desk'), 'desk.n.furniture', 1, TRUE, 'noun', '机', 'a table you work at', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='colleague'), 'colleague.n.work', 1, TRUE, 'noun', '同僚', 'a person you work with', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('meeting','email','boss','project','deadline','report','desk','colleague')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='at-work'
WHERE s.slug IN ('meeting.n.work','email.n.msg','boss.n.work','project.n.work','deadline.n.time','report.n.doc','desk.n.furniture','colleague.n.work')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-25', 7, 2, (SELECT id FROM vocab_categories WHERE slug='at-work'), 'At work', '職場で', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-25'), s.id, x.ord
FROM (VALUES
  ('meeting.n.work',0),('email.n.msg',1),('boss.n.work',2),('project.n.work',3),('deadline.n.time',4),('report.n.doc',5),('desk.n.furniture',6),('colleague.n.work',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-25'), 'conversation', 0, 'The new job', '新しい仕事', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-25'), 'business', 1, 'Monday meeting', '月曜の会議', 'office', 'colleague'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-25'), 'travel', 2, 'At a conference', '会議イベントで', 'venue', 'organizer');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 0, 'npc', 'How''s the new job going?', '新しい仕事どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 1, 'user', 'Good! My {boss}, who leads the team, is supportive.', 'いいよ！チームを率いる上司がとても親切。', 'boss', (SELECT id FROM vocab_senses WHERE slug='boss.n.work'), ARRAY['teacher','friend','boss','guest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 2, 'npc', 'Nice. Friendly {colleague}s at the office?', 'いいね。職場の同僚はフレンドリー？', 'colleague', (SELECT id FROM vocab_senses WHERE slug='colleague.n.work'), ARRAY['colleague','doctor','guest','student']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 3, 'user', 'Yeah. I even have my own {desk} to work at.', 'うん。自分の作業机もある。', 'desk', (SELECT id FROM vocab_senses WHERE slug='desk.n.furniture'), ARRAY['desk','floor','room','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 4, 'npc', 'Fancy! Busy already?', 'いいね！もう忙しい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 5, 'user', 'A little. My first {project}, a big one, starts Monday.', '少し。最初の大きなプロジェクトが月曜に始まる。', 'project', (SELECT id FROM vocab_senses WHERE slug='project.n.work'), ARRAY['meeting','email','report','project']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 6, 'npc', 'You''ll do great!', 'うまくいくよ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 0, 'npc', 'Ready for the {meeting}?', '会議の準備できた？', 'meeting', (SELECT id FROM vocab_senses WHERE slug='meeting.n.work'), ARRAY['desk','email','report','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 1, 'user', 'Almost. When''s the {deadline} to submit it?', 'もう少し。提出の締め切りはいつ？', 'deadline', (SELECT id FROM vocab_senses WHERE slug='deadline.n.time'), ARRAY['meeting','deadline','desk','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 2, 'npc', 'Friday. Did you finish writing the {report}?', '金曜。報告書を書き終えた？', 'report', (SELECT id FROM vocab_senses WHERE slug='report.n.doc'), ARRAY['report','email','desk','plan']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 3, 'user', 'Nearly. I''ll send it by {email}.', 'もうすぐ。メールで送るよ。', 'email', (SELECT id FROM vocab_senses WHERE slug='email.n.msg'), ARRAY['report','desk','email','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 4, 'npc', 'Perfect. See you in there.', '完璧。中で会おう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 5, 'user', 'Right behind you.', 'すぐ行く。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 6, 'npc', 'Let''s go.', '行こう。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 0, 'npc', 'Welcome to the conference!', 'カンファレンスへようこそ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 1, 'user', 'Thanks! Did you get my {email} with the slides attached?', 'ありがとう！スライド添付のメール届いた？', 'email', (SELECT id FROM vocab_senses WHERE slug='email.n.msg'), ARRAY['ticket','report','email','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 2, 'npc', 'Yes. You''re presenting your {project} to the room?', 'はい。プロジェクトをみんなの前で発表するの？', 'project', (SELECT id FROM vocab_senses WHERE slug='project.n.work'), ARRAY['project','report','desk','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 3, 'user', 'Right. Is there a hard {deadline} for slides?', 'はい。スライドの締め切りは？', 'deadline', (SELECT id FROM vocab_senses WHERE slug='deadline.n.time'), ARRAY['deadline','meeting','report','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 4, 'npc', 'By noon. Your {meeting} room is upstairs.', '正午まで。会議室は上の階です。', 'meeting', (SELECT id FROM vocab_senses WHERE slug='meeting.n.work'), ARRAY['meeting','email','desk','report']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 5, 'user', 'Great, thank you.', '了解、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 6, 'npc', 'Good luck!', '頑張って！', NULL, NULL, NULL);
