-- ============================================================================
-- Vocab 102: vocab-102-10 - University life  (Unit 4)
-- Words: degree, lecture, seminar, assignment, tutor, campus, graduate, scholarship.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('university-life', 'University life', '大学生活', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('degree', 'degree', '/dɪˈɡriː/', '/dɪˈɡriː/', NULL, 3, FALSE, NULL),
  ('lecture', 'lecture', '/ˈlektʃər/', '/ˈlektʃə/', NULL, 3, FALSE, NULL),
  ('seminar', 'seminar', '/ˈsemɪnɑːr/', '/ˈsemɪnɑː/', NULL, 4, FALSE, NULL),
  ('assignment', 'assignment', '/əˈsaɪnmənt/', '/əˈsaɪnmənt/', NULL, 3, FALSE, NULL),
  ('tutor', 'tutor', '/ˈtuːtər/', '/ˈtjuːtə/', NULL, 3, FALSE, NULL),
  ('campus', 'campus', '/ˈkæmpəs/', '/ˈkæmpəs/', NULL, 3, FALSE, NULL),
  ('graduate', 'graduate', '/ˈɡrædʒueɪt/', '/ˈɡrædʒueɪt/', NULL, 3, FALSE, NULL),
  ('scholarship', 'scholarship', '/ˈskɑːlərʃɪp/', '/ˈskɒləʃɪp/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='degree'), 'degree.n.qualification', 1, TRUE, 'noun', '学位', 'a qualification you get from a university', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lecture'), 'lecture.n.talk', 1, TRUE, 'noun', '講義', 'a formal talk that teaches students', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='seminar'), 'seminar.n.class', 1, TRUE, 'noun', '演習', 'a small class for discussion', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='assignment'), 'assignment.n.task', 1, TRUE, 'noun', '課題', 'a piece of work given to students', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tutor'), 'tutor.n.teacher', 1, TRUE, 'noun', '個人指導の先生', 'a teacher who helps one or a few students', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='campus'), 'campus.n.grounds', 1, TRUE, 'noun', 'キャンパス', 'the grounds and buildings of a university', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='graduate'), 'graduate.v.finish', 1, TRUE, 'verb', '卒業する', 'to finish your studies at a university', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='scholarship'), 'scholarship.n.grant', 1, TRUE, 'noun', '奨学金', 'money given to help a student study', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('degree', 'lecture', 'seminar', 'assignment', 'tutor', 'campus', 'graduate', 'scholarship')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='university-life'
WHERE s.slug IN ('degree.n.qualification', 'lecture.n.talk', 'seminar.n.class', 'assignment.n.task', 'tutor.n.teacher', 'campus.n.grounds', 'graduate.v.finish', 'scholarship.n.grant')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-10', 4, 0, (SELECT id FROM vocab_categories WHERE slug='university-life'), 'University life', '大学生活', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-10'), s.id, x.ord FROM (VALUES
  ('degree.n.qualification',0),('lecture.n.talk',1),('seminar.n.class',2),('assignment.n.task',3),('tutor.n.teacher',4),('campus.n.grounds',5),('graduate.v.finish',6),('scholarship.n.grant',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-10'), 'conversation', 0, 'At university', '大学で', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-10'), 'travel', 1, 'A campus tour abroad', '留学先のキャンパス見学', 'campus', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-10'), 'business', 2, 'Hiring a graduate', '新卒の採用', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 0, 'npc', 'How''s university treating you?', '大学はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 1, 'user', 'Busy! I''m doing a {degree} in biology.', '忙しい！生物学の学位を取ってる。', 'degree', (SELECT id FROM vocab_senses WHERE slug='degree.n.qualification'), ARRAY['degree','lecture','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 2, 'npc', 'Cool. Hard classes?', 'いいね。授業は難しい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 3, 'user', 'The morning {lecture} is tough; it''s three hours.', '朝の講義がきつい、3時間もある。', 'lecture', (SELECT id FROM vocab_senses WHERE slug='lecture.n.talk'), ARRAY['lecture','degree','campus','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 4, 'npc', 'Yikes. Lots of homework?', 'うわ。宿題は多い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 5, 'user', 'Yeah, I have an {assignment} due every week.', 'うん、毎週課題の締め切りがある。', 'assignment', (SELECT id FROM vocab_senses WHERE slug='assignment.n.task'), ARRAY['assignment','tutor','campus','degree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 6, 'npc', 'Who helps when you''re stuck?', '困ったとき誰が助けてくれる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 7, 'user', 'My {tutor} meets me every Thursday.', '指導の先生が毎週木曜に見てくれる。', 'tutor', (SELECT id FROM vocab_senses WHERE slug='tutor.n.teacher'), ARRAY['tutor','lecture','degree','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 8, 'npc', 'Nice support. Do you live nearby?', 'いいサポートだね。近くに住んでる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 9, 'user', 'I live right on {campus}, near the library.', 'キャンパス内、図書館の近くに住んでる。', 'campus', (SELECT id FROM vocab_senses WHERE slug='campus.n.grounds'), ARRAY['campus','degree','lecture','assignment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 10, 'npc', 'Convenient! When do you finish?', '便利だね！いつ終わるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 11, 'user', 'I {graduate} next summer, finally.', '来年の夏にやっと卒業する。', 'graduate', (SELECT id FROM vocab_senses WHERE slug='graduate.v.finish'), ARRAY['graduate','lecture','campus','assignment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 12, 'npc', 'Exciting times ahead.', 'この先が楽しみだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 13, 'user', 'Can''t wait.', '待ちきれない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='conversation'), 14, 'npc', 'Proud of you, {{user_name}}.', '誇らしいよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 0, 'npc', 'Welcome! Ready for the campus tour?', 'ようこそ！キャンパス見学の準備はいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 1, 'user', 'Yes! The {campus} is beautiful.', 'はい！キャンパスがきれいですね。', 'campus', (SELECT id FROM vocab_senses WHERE slug='campus.n.grounds'), ARRAY['campus','degree','lecture','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 2, 'npc', 'Thanks. Are you here for a full program?', 'ありがとう。正規の課程で来たの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 3, 'user', 'One semester, part of my {degree} back home.', '1学期だけ、母国の学位の一部です。', 'degree', (SELECT id FROM vocab_senses WHERE slug='degree.n.qualification'), ARRAY['degree','seminar','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 4, 'npc', 'Great. Did you get funding?', 'いいね。資金は出た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 5, 'user', 'Yes, a {scholarship} covers my tuition.', 'はい、奨学金が学費をカバーしてます。', 'scholarship', (SELECT id FROM vocab_senses WHERE slug='scholarship.n.grant'), ARRAY['scholarship','lecture','campus','seminar']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 6, 'npc', 'Wonderful. Small classes here.', '素晴らしい。ここは少人数制。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 7, 'user', 'I heard each {seminar} has just twelve students.', 'ゼミは12人だけって聞きました。', 'seminar', (SELECT id FROM vocab_senses WHERE slug='seminar.n.class'), ARRAY['seminar','degree','campus','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 8, 'npc', 'Correct. Big lectures too, though.', 'その通り。大きな講義もあるけどね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 9, 'user', 'I don''t mind a big {lecture} now and then.', 'たまの大講義は気になりません。', 'lecture', (SELECT id FROM vocab_senses WHERE slug='lecture.n.talk'), ARRAY['lecture','campus','seminar','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 10, 'npc', 'Good attitude. Exchange students love it.', 'いい姿勢だね。交換留学生に人気だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 11, 'user', 'Do exchange students {graduate} with a certificate?', '交換留学生は修了証をもらって卒業できますか？', 'graduate', (SELECT id FROM vocab_senses WHERE slug='graduate.v.finish'), ARRAY['graduate','lecture','campus','seminar']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 12, 'npc', 'Yes, at the end of the term.', 'はい、学期の終わりに。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 13, 'user', 'Perfect. Let''s see the library.', '完璧です。図書館を見ましょう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='travel'), 14, 'npc', 'Right this way!', 'こちらへどうぞ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 0, 'npc', 'This candidate just finished school.', 'この候補者は学校を出たばかり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 1, 'user', 'Did she {graduate} this year?', '彼女は今年卒業したの？', 'graduate', (SELECT id FROM vocab_senses WHERE slug='graduate.v.finish'), ARRAY['graduate','lecture','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 2, 'npc', 'Yes, top of her class.', 'うん、首席で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 3, 'user', 'What {degree} does she hold?', 'どんな学位を持ってる？', 'degree', (SELECT id FROM vocab_senses WHERE slug='degree.n.qualification'), ARRAY['degree','seminar','campus','tutor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 4, 'npc', 'Computer science, with honors.', 'コンピュータ科学、優等で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 5, 'user', 'Impressive. Did she have a {scholarship}?', 'すごい。奨学金は受けてた？', 'scholarship', (SELECT id FROM vocab_senses WHERE slug='scholarship.n.grant'), ARRAY['scholarship','lecture','campus','seminar']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 6, 'npc', 'A full one, actually.', '実は全額のを。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 7, 'user', 'Any teaching experience, like leading a {seminar}?', 'ゼミを担当したような指導経験は？', 'seminar', (SELECT id FROM vocab_senses WHERE slug='seminar.n.class'), ARRAY['seminar','degree','campus','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 8, 'npc', 'She ran student workshops, yes.', '学生向けワークショップをやってたよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 9, 'user', 'Can we give her a small {assignment} as a test?', '試しに小さな課題を出せる？', 'assignment', (SELECT id FROM vocab_senses WHERE slug='assignment.n.task'), ARRAY['assignment','tutor','campus','degree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 10, 'npc', 'Good idea. A short project.', 'いい考え。短いプロジェクトで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 11, 'user', 'And pair her with a {tutor} for the first month?', '最初の1か月は指導係をつけては？', 'tutor', (SELECT id FROM vocab_senses WHERE slug='tutor.n.teacher'), ARRAY['tutor','lecture','degree','scholarship']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 12, 'npc', 'Perfect onboarding plan.', '完璧な受け入れ計画だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 13, 'user', 'Let''s invite her in.', '面接に呼ぼう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-10') AND goal='business'), 14, 'npc', 'Agreed, {{user_name}}.', '賛成、{{user_name}}。', NULL, NULL, NULL);
