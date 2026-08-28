-- ============================================================================
-- Vocab 102: vocab-102-7 - The workplace  (Unit 3)
-- Words: salary, promotion, overtime, staff, manager, department, shift, contract.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('workplace', 'The workplace', '職場', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('salary', 'salary', '/ˈsæləri/', '/ˈsæləri/', NULL, 3, FALSE, NULL),
  ('promotion', 'promotion', '/prəˈmoʊʃn/', '/prəˈməʊʃn/', NULL, 4, FALSE, NULL),
  ('overtime', 'overtime', '/ˈoʊvərtaɪm/', '/ˈəʊvətaɪm/', NULL, 4, FALSE, NULL),
  ('staff', 'staff', '/stæf/', '/stɑːf/', NULL, 3, FALSE, NULL),
  ('manager', 'manager', '/ˈmænɪdʒər/', '/ˈmænɪdʒə/', NULL, 3, FALSE, NULL),
  ('department', 'department', '/dɪˈpɑːrtmənt/', '/dɪˈpɑːtmənt/', NULL, 3, FALSE, NULL),
  ('shift', 'shift', '/ʃɪft/', '/ʃɪft/', NULL, 3, FALSE, NULL),
  ('contract', 'contract', '/ˈkɑːntrækt/', '/ˈkɒntrækt/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='salary'), 'salary.n.pay', 1, TRUE, 'noun', '給料', 'the money you are paid each month for your job', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='promotion'), 'promotion.n.advance', 1, TRUE, 'noun', '昇進', 'a move to a higher, more important job', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='overtime'), 'overtime.n.extrahours', 1, TRUE, 'noun', '残業', 'extra hours you work beyond your normal time', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='staff'), 'staff.n.employees', 1, TRUE, 'noun', '従業員', 'the group of people who work for a company', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='manager'), 'manager.n.boss', 1, TRUE, 'noun', '管理職', 'a person who leads a team or business', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='department'), 'department.n.section', 1, TRUE, 'noun', '部署', 'a section of a company or organization', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shift'), 'shift.n.workperiod', 1, TRUE, 'noun', 'シフト', 'a set period of work time', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='contract'), 'contract.n.agreement', 1, TRUE, 'noun', '契約', 'a written work agreement', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('salary', 'promotion', 'overtime', 'staff', 'manager', 'department', 'shift', 'contract')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='workplace'
WHERE s.slug IN ('salary.n.pay', 'promotion.n.advance', 'overtime.n.extrahours', 'staff.n.employees', 'manager.n.boss', 'department.n.section', 'shift.n.workperiod', 'contract.n.agreement')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-7', 3, 0, (SELECT id FROM vocab_categories WHERE slug='workplace'), 'The workplace', '職場のことば', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-7'), s.id, x.ord FROM (VALUES
  ('salary.n.pay',0),('promotion.n.advance',1),('overtime.n.extrahours',2),('staff.n.employees',3),('manager.n.boss',4),('department.n.section',5),('shift.n.workperiod',6),('contract.n.agreement',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-7'), 'conversation', 0, 'Your new job', '新しい仕事', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-7'), 'travel', 1, 'A working holiday', 'ワーキングホリデー', 'hostel', 'employer'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-7'), 'business', 2, 'Onboarding paperwork', '入社手続き', 'office', 'HR staff');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 0, 'npc', 'How''s the new job going?', '新しい仕事どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 1, 'user', 'Good! I''m in the design {department}.', 'いい感じ！デザイン部にいるよ。', 'department', (SELECT id FROM vocab_senses WHERE slug='department.n.section'), ARRAY['department','salary','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 2, 'npc', 'Nice. Do you like your team?', 'いいね。チームは好き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 3, 'user', 'Yeah, my {manager} is really supportive.', 'うん、上司がすごく協力的。', 'manager', (SELECT id FROM vocab_senses WHERE slug='manager.n.boss'), ARRAY['manager','promotion','overtime','staff']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 4, 'npc', 'That helps a lot. Good hours?', '助かるね。時間はいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 5, 'user', 'Mostly. My {shift} runs nine to five.', 'だいたい。勤務は9時から5時。', 'shift', (SELECT id FROM vocab_senses WHERE slug='shift.n.workperiod'), ARRAY['shift','salary','department','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 6, 'npc', 'No late nights?', '夜遅くはない？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 7, 'user', 'Sometimes I do {overtime} when we''re busy.', '忙しいときは残業もする。', 'overtime', (SELECT id FROM vocab_senses WHERE slug='overtime.n.extrahours'), ARRAY['overtime','promotion','staff','manager']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 8, 'npc', 'As long as they pay you for it.', 'ちゃんと払ってくれるならね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 9, 'user', 'They do. My {salary} is fair for the work.', '払ってくれる。仕事に見合った給料だよ。', 'salary', (SELECT id FROM vocab_senses WHERE slug='salary.n.pay'), ARRAY['salary','shift','department','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 10, 'npc', 'That''s great. Room to grow?', 'いいね。昇進の余地は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 11, 'user', 'Yes, there''s a {promotion} in a year if I do well.', 'うん、頑張れば1年で昇進がある。', 'promotion', (SELECT id FROM vocab_senses WHERE slug='promotion.n.advance'), ARRAY['promotion','overtime','staff','shift']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 12, 'npc', 'Sounds like a keeper.', 'いい職場だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 13, 'user', 'I think so too.', '私もそう思う。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='conversation'), 14, 'npc', 'Happy for you, {{user_name}}.', 'よかったね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 0, 'npc', 'So you want to work here over the summer?', '夏の間ここで働きたいの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 1, 'user', 'Yes! Are you hiring {staff} right now?', 'はい！今、従業員を募集してますか？', 'staff', (SELECT id FROM vocab_senses WHERE slug='staff.n.employees'), ARRAY['staff','salary','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 2, 'npc', 'We are. Mostly at the front desk.', 'してるよ。主にフロントで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 3, 'user', 'Great. What {shift} would I work?', 'いいですね。どのシフトになりますか？', 'shift', (SELECT id FROM vocab_senses WHERE slug='shift.n.workperiod'), ARRAY['shift','salary','staff','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 4, 'npc', 'Evenings, five to eleven.', '夕方、5時から11時。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 5, 'user', 'Okay. And what''s the {salary}?', 'わかりました。給料は？', 'salary', (SELECT id FROM vocab_senses WHERE slug='salary.n.pay'), ARRAY['salary','staff','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 6, 'npc', 'It''s hourly, paid every two weeks.', '時給制で、2週間ごとの支払い。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 7, 'user', 'Is there {overtime} if I stay late?', '遅くまで残ったら残業はつきますか？', 'overtime', (SELECT id FROM vocab_senses WHERE slug='overtime.n.extrahours'), ARRAY['overtime','staff','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 8, 'npc', 'Yes, extra pay after eleven.', 'うん、11時以降は割増。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 9, 'user', 'Do I sign a {contract} for the season?', 'シーズンの契約書にサインしますか？', 'contract', (SELECT id FROM vocab_senses WHERE slug='contract.n.agreement'), ARRAY['contract','staff','shift','salary']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 10, 'npc', 'Yes, a three-month one.', 'うん、3か月のね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 11, 'user', 'Who would be my {manager}?', '私の上司は誰になりますか？', 'manager', (SELECT id FROM vocab_senses WHERE slug='manager.n.boss'), ARRAY['manager','staff','shift','contract']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 12, 'npc', 'That would be me!', '私だよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 13, 'user', 'Perfect. When can I start?', '完璧です。いつから始められますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='travel'), 14, 'npc', 'How about Monday?', '月曜はどう？', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 0, 'npc', 'Welcome aboard! Let''s finish your paperwork.', 'ようこそ！書類を済ませましょう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 1, 'user', 'Thanks. Where do I sign the {contract}?', 'ありがとう。契約書はどこにサインを？', 'contract', (SELECT id FROM vocab_senses WHERE slug='contract.n.agreement'), ARRAY['contract','salary','staff','department']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 2, 'npc', 'Right here. Two years, as we agreed.', 'ここです。合意通り2年で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 3, 'user', 'And my {salary} is paid monthly?', '給料は月払いですか？', 'salary', (SELECT id FROM vocab_senses WHERE slug='salary.n.pay'), ARRAY['salary','staff','department','promotion']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 4, 'npc', 'Yes, on the 25th each month.', 'はい、毎月25日に。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 5, 'user', 'Which {department} will I be in?', 'どの部署になりますか？', 'department', (SELECT id FROM vocab_senses WHERE slug='department.n.section'), ARRAY['department','staff','promotion','overtime']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 6, 'npc', 'Product, on the third floor.', '3階のプロダクト部です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 7, 'user', 'How many {staff} are on the team?', 'チームには何人いますか？', 'staff', (SELECT id FROM vocab_senses WHERE slug='staff.n.employees'), ARRAY['staff','salary','promotion','overtime']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 8, 'npc', 'About twelve, all friendly.', '12人くらい、みんな感じいいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 9, 'user', 'Is {overtime} common here?', 'ここは残業が多いですか？', 'overtime', (SELECT id FROM vocab_senses WHERE slug='overtime.n.extrahours'), ARRAY['overtime','salary','department','promotion']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 10, 'npc', 'Rarely, we respect your time.', 'ほとんどない、時間を大切にしてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 11, 'user', 'Good to hear. Is there room for {promotion}?', 'よかった。昇進の余地はありますか？', 'promotion', (SELECT id FROM vocab_senses WHERE slug='promotion.n.advance'), ARRAY['promotion','staff','overtime','department']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 12, 'npc', 'Definitely, we promote from within.', 'もちろん、社内から昇進させます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 13, 'user', 'That''s motivating.', 'やる気が出ます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-7') AND goal='business'), 14, 'npc', 'Glad you''re here, {{user_name}}.', '来てくれて嬉しいよ、{{user_name}}。', NULL, NULL, NULL);
