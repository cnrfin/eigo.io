-- ============================================================================
-- Vocab 103: vocab-103-6 - Workplace idioms  (Unit 3)
-- Words: touch base, on the same page, in the loop, pull your weight, cut corners, step up, take the lead, hit the ground running.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('workplace-idioms', 'Workplace idioms', '職場の言い回し', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('touch base', 'touch base', '/ˌtʌtʃ ˈbeɪs/', '/ˌtʌtʃ ˈbeɪs/', NULL, 5, FALSE, NULL),
  ('on the same page', 'on the same page', '/ˌɑːn ðə seɪm ˈpeɪdʒ/', '/ˌɒn ðə seɪm ˈpeɪdʒ/', NULL, 5, FALSE, NULL),
  ('in the loop', 'in the loop', '/ˌɪn ðə ˈluːp/', '/ˌɪn ðə ˈluːp/', NULL, 5, FALSE, NULL),
  ('pull your weight', 'pull your weight', '/ˌpʊl jər ˈweɪt/', '/ˌpʊl jə ˈweɪt/', NULL, 5, FALSE, NULL),
  ('cut corners', 'cut corners', '/ˌkʌt ˈkɔːrnərz/', '/ˌkʌt ˈkɔːnəz/', NULL, 5, FALSE, NULL),
  ('step up', 'step up', '/ˌstep ˈʌp/', '/ˌstep ˈʌp/', NULL, 5, FALSE, NULL),
  ('take the lead', 'take the lead', '/ˌteɪk ðə ˈliːd/', '/ˌteɪk ðə ˈliːd/', NULL, 5, FALSE, NULL),
  ('hit the ground running', 'hit the ground running', '/ˌhɪt ðə ɡraʊnd ˈrʌnɪŋ/', '/ˌhɪt ðə ɡraʊnd ˈrʌnɪŋ/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='touch base'), 'touch-base.idiom.contact', 1, TRUE, 'idiom', '（短く）連絡を取る', 'to make brief contact to share news', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='on the same page'), 'on-the-same-page.idiom.aligned', 1, TRUE, 'idiom', '認識が一致している', 'in agreement and sharing the same understanding', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='in the loop'), 'in-the-loop.idiom.informed', 1, TRUE, 'idiom', '情報を共有されて', 'kept informed about something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='pull your weight'), 'pull-your-weight.idiom.contribute', 1, TRUE, 'idiom', '自分の役割を果たす', 'to do your fair share of the work', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cut corners'), 'cut-corners.idiom.skimp', 1, TRUE, 'idiom', '手を抜く', 'to do something cheaply or quickly, lowering quality', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='step up'), 'step-up.phrv.rise', 1, TRUE, 'phrasal verb', '一肌脱ぐ', 'to take responsibility when it is needed', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take the lead'), 'take-the-lead.idiom.lead', 1, TRUE, 'idiom', '主導する', 'to take charge of something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hit the ground running'), 'hit-the-ground-running.idiom.start', 1, TRUE, 'idiom', '好スタートを切る', 'to start something and be effective immediately', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('touch base', 'on the same page', 'in the loop', 'pull your weight', 'cut corners', 'step up', 'take the lead', 'hit the ground running')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='workplace-idioms'
WHERE s.slug IN ('touch-base.idiom.contact', 'on-the-same-page.idiom.aligned', 'in-the-loop.idiom.informed', 'pull-your-weight.idiom.contribute', 'cut-corners.idiom.skimp', 'step-up.phrv.rise', 'take-the-lead.idiom.lead', 'hit-the-ground-running.idiom.start')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-6', 3, 1, (SELECT id FROM vocab_categories WHERE slug='workplace-idioms'), 'Workplace idioms', '職場の言い回し', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-6'), s.id, x.ord FROM (VALUES
  ('touch-base.idiom.contact',0),('on-the-same-page.idiom.aligned',1),('in-the-loop.idiom.informed',2),('pull-your-weight.idiom.contribute',3),('cut-corners.idiom.skimp',4),('step-up.phrv.rise',5),('take-the-lead.idiom.lead',6),('hit-the-ground-running.idiom.start',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-6'), 'conversation', 0, 'A group project', 'グループ課題', 'library', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-6'), 'travel', 1, 'Coordinating a trip', '旅行の調整', 'home', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-6'), 'business', 2, 'Joining a project', 'プロジェクトに参加', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 0, 'npc', 'How''s the group project going?', 'グループ課題どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 1, 'user', 'Okay, but some people don''t {pull your weight}.', 'まあまあ、でも役割を果たさない人がいて。', 'pull your weight', (SELECT id FROM vocab_senses WHERE slug='pull-your-weight.idiom.contribute'), ARRAY['pull your weight','cut corners','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 2, 'npc', 'Ugh, that''s frustrating.', 'うわ、いらいらするね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 3, 'user', 'And one guy tends to {cut corners}.', 'それに一人、手を抜きがちで。', 'cut corners', (SELECT id FROM vocab_senses WHERE slug='cut-corners.idiom.skimp'), ARRAY['cut corners','step up','take the lead','pull your weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 4, 'npc', 'Someone needs to lead.', '誰かがまとめないと。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 5, 'user', 'I might {step up} and organize us.', '私が一肌脱いでまとめようかな。', 'step up', (SELECT id FROM vocab_senses WHERE slug='step-up.phrv.rise'), ARRAY['step up','cut corners','take the lead','pull your weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 6, 'npc', 'You''d be good at that.', '君は向いてるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 7, 'user', 'Thanks. I''ll {take the lead} on the research.', 'ありがとう。調査は私が主導する。', 'take the lead', (SELECT id FROM vocab_senses WHERE slug='take-the-lead.idiom.lead'), ARRAY['take the lead','cut corners','pull your weight','in the loop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 8, 'npc', 'Keep me posted, okay?', '進捗教えてね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 9, 'user', 'Of course, I''ll keep you {in the loop}.', 'もちろん、情報は共有する。', 'in the loop', (SELECT id FROM vocab_senses WHERE slug='in-the-loop.idiom.informed'), ARRAY['in the loop','cut corners','pull your weight','on the same page']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 10, 'npc', 'Does everyone know the plan?', 'みんな計画分かってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 11, 'user', 'Yes, we''re all {on the same page} now.', 'うん、今は全員認識が一致してる。', 'on the same page', (SELECT id FROM vocab_senses WHERE slug='on-the-same-page.idiom.aligned'), ARRAY['on the same page','cut corners','pull your weight','in the loop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 12, 'npc', 'Sounds under control.', 'ちゃんとしてるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 13, 'user', 'Getting there!', 'もう少し！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='conversation'), 14, 'npc', 'You''ve got this, {{user_name}}.', '大丈夫、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 0, 'npc', 'We''re all in different cities before the trip.', '旅行前、みんな別々の街にいるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 1, 'user', 'Let''s {touch base} on a call each week.', '毎週電話で連絡を取り合おう。', 'touch base', (SELECT id FROM vocab_senses WHERE slug='touch-base.idiom.contact'), ARRAY['touch base','cut corners','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 2, 'npc', 'Good idea. Who books what?', 'いいね。誰が何を予約する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 3, 'user', 'We should all {pull your weight} on bookings.', '予約はみんなで役割を分担しよう。', 'pull your weight', (SELECT id FROM vocab_senses WHERE slug='pull-your-weight.idiom.contribute'), ARRAY['pull your weight','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 4, 'npc', 'Don''t book the cheapest dodgy hostel.', '一番安い怪しいホステルは避けて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 5, 'user', 'Right, let''s not {cut corners} on safety.', 'うん、安全面で手を抜かないようにしよう。', 'cut corners', (SELECT id FROM vocab_senses WHERE slug='cut-corners.idiom.skimp'), ARRAY['cut corners','touch base','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 6, 'npc', 'Make sure we all know the plan.', 'みんな計画を把握できるように。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 7, 'user', 'Yes, keep everyone {on the same page}.', 'うん、全員の認識を合わせておこう。', 'on the same page', (SELECT id FROM vocab_senses WHERE slug='on-the-same-page.idiom.aligned'), ARRAY['on the same page','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 8, 'npc', 'And share updates fast.', '更新は早めに共有ね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 9, 'user', 'I''ll keep the group {in the loop}.', 'グループに情報を共有し続ける。', 'in the loop', (SELECT id FROM vocab_senses WHERE slug='in-the-loop.idiom.informed'), ARRAY['in the loop','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 10, 'npc', 'We land and go straight to the tour.', '着いたらすぐツアーへ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 11, 'user', 'Exactly, we {hit the ground running} on day one.', 'そう、初日から全開でいく。', 'hit the ground running', (SELECT id FROM vocab_senses WHERE slug='hit-the-ground-running.idiom.start'), ARRAY['hit the ground running','cut corners','touch base','pull your weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 12, 'npc', 'Efficient trip!', '効率的な旅！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 13, 'user', 'Best kind.', '最高のやつ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='travel'), 14, 'npc', 'Let''s do it!', 'やろう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 0, 'npc', 'You''re joining the client project midway.', '途中からクライアント案件に入るんだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 1, 'user', 'Yes, I need to {hit the ground running}.', 'うん、すぐに戦力にならないと。', 'hit the ground running', (SELECT id FROM vocab_senses WHERE slug='hit-the-ground-running.idiom.start'), ARRAY['hit the ground running','cut corners','touch base','pull your weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 2, 'npc', 'I''ll brief you fully.', 'しっかり説明するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 3, 'user', 'Thanks, keep me {in the loop} on decisions.', 'ありがとう、決定事項は共有して。', 'in the loop', (SELECT id FROM vocab_senses WHERE slug='in-the-loop.idiom.informed'), ARRAY['in the loop','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 4, 'npc', 'We sync every morning.', '毎朝すり合わせしてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 5, 'user', 'Good, we can {touch base} daily then.', 'いいね、じゃあ毎日連絡を取り合える。', 'touch base', (SELECT id FROM vocab_senses WHERE slug='touch-base.idiom.contact'), ARRAY['touch base','cut corners','step up','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 6, 'npc', 'The team''s direction shifted last week.', '先週チームの方向性が変わった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 7, 'user', 'Make sure I''m {on the same page} with them.', '彼らと認識を合わせておいて。', 'on the same page', (SELECT id FROM vocab_senses WHERE slug='on-the-same-page.idiom.aligned'), ARRAY['on the same page','cut corners','touch base','take the lead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 8, 'npc', 'We need someone to own testing.', 'テストの担当者が必要。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 9, 'user', 'I''ll {step up} and handle that.', '私が一肌脱いで担当する。', 'step up', (SELECT id FROM vocab_senses WHERE slug='step-up.phrv.rise'), ARRAY['step up','cut corners','touch base','on the same page']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 10, 'npc', 'And the client calls?', 'クライアントとの電話は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 11, 'user', 'I can {take the lead} on those too.', 'それも私が主導できる。', 'take the lead', (SELECT id FROM vocab_senses WHERE slug='take-the-lead.idiom.lead'), ARRAY['take the lead','cut corners','touch base','in the loop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 12, 'npc', 'Perfect. Welcome aboard.', '完璧。ようこそ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 13, 'user', 'Glad to be here.', '参加できて嬉しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-6') AND goal='business'), 14, 'npc', 'Great to have you, {{user_name}}.', '来てくれて助かる、{{user_name}}。', NULL, NULL, NULL);
