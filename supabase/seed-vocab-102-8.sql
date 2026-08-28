-- ============================================================================
-- Vocab 102: vocab-102-8 - Job hunting  (Unit 3)
-- Words: apply for, take on, hand in, fill in, turn down, carry out, look into, sort out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('job-hunting', 'Job hunting', '就職活動', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('apply for', 'apply for', '/əˈplaɪ fɔːr/', '/əˈplaɪ fɔː/', NULL, 3, FALSE, NULL),
  ('take on', 'take on', '/ˌteɪk ˈɑːn/', '/ˌteɪk ˈɒn/', NULL, 4, FALSE, NULL),
  ('hand in', 'hand in', '/ˌhænd ˈɪn/', '/ˌhænd ˈɪn/', NULL, 3, FALSE, NULL),
  ('fill in', 'fill in', '/ˌfɪl ˈɪn/', '/ˌfɪl ˈɪn/', NULL, 3, FALSE, NULL),
  ('turn down', 'turn down', '/ˌtɜːrn ˈdaʊn/', '/ˌtɜːn ˈdaʊn/', NULL, 4, FALSE, NULL),
  ('carry out', 'carry out', '/ˌkæri ˈaʊt/', '/ˌkæri ˈaʊt/', NULL, 4, FALSE, NULL),
  ('look into', 'look into', '/ˌlʊk ˈɪntuː/', '/ˌlʊk ˈɪntuː/', NULL, 4, FALSE, NULL),
  ('sort out', 'sort out', '/ˌsɔːrt ˈaʊt/', '/ˌsɔːt ˈaʊt/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='apply for'), 'apply-for.phrv.request', 1, TRUE, 'phrasal verb', '応募する', 'to formally ask for a job or place', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='take on'), 'take-on.phrv.accept', 1, TRUE, 'phrasal verb', '引き受ける', 'to accept work or responsibility', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hand in'), 'hand-in.phrv.submit', 1, TRUE, 'phrasal verb', '提出する', 'to give something to a person in authority', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fill in'), 'fill-in.phrv.complete', 1, TRUE, 'phrasal verb', '記入する', 'to write information in the spaces on a form', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='turn down'), 'turn-down.phrv.refuse', 1, TRUE, 'phrasal verb', '断る', 'to refuse an offer or request', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='carry out'), 'carry-out.phrv.perform', 1, TRUE, 'phrasal verb', '実行する', 'to do a task or plan', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='look into'), 'look-into.phrv.investigate', 1, TRUE, 'phrasal verb', '調べる', 'to investigate or examine something', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sort out'), 'sort-out.phrv.resolve', 1, TRUE, 'phrasal verb', '解決する', 'to deal with a problem successfully', 'B2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('apply for', 'take on', 'hand in', 'fill in', 'turn down', 'carry out', 'look into', 'sort out')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='sort-out.phrv.resolve'), NULL, 'resolve', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='job-hunting'
WHERE s.slug IN ('apply-for.phrv.request', 'take-on.phrv.accept', 'hand-in.phrv.submit', 'fill-in.phrv.complete', 'turn-down.phrv.refuse', 'carry-out.phrv.perform', 'look-into.phrv.investigate', 'sort-out.phrv.resolve')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-8', 3, 1, (SELECT id FROM vocab_categories WHERE slug='job-hunting'), 'Job hunting', '仕事を探す', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-8'), s.id, x.ord FROM (VALUES
  ('apply-for.phrv.request',0),('take-on.phrv.accept',1),('hand-in.phrv.submit',2),('fill-in.phrv.complete',3),('turn-down.phrv.refuse',4),('carry-out.phrv.perform',5),('look-into.phrv.investigate',6),('sort-out.phrv.resolve',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-8'), 'conversation', 0, 'Job hunting', '仕事探し', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-8'), 'travel', 1, 'The work permit office', '就労許可の窓口', 'office', 'official'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-8'), 'business', 2, 'Delegating a project', 'プロジェクトの分担', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 0, 'npc', 'I heard you''re job hunting. Any luck?', '仕事探してるって聞いたよ。どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 1, 'user', 'Some! I might {apply for} a role at a design studio.', 'まあまあ！デザイン事務所の求人に応募するかも。', 'apply for', (SELECT id FROM vocab_senses WHERE slug='apply-for.phrv.request'), ARRAY['apply for','hand in','turn down','sort out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 2, 'npc', 'Nice! Have you sent your CV?', 'いいね！履歴書は送った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 3, 'user', 'Not yet. I''ll {hand in} my application tomorrow.', 'まだ。明日応募書類を提出するよ。', 'hand in', (SELECT id FROM vocab_senses WHERE slug='hand-in.phrv.submit'), ARRAY['hand in','take on','look into','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 4, 'npc', 'Do they need a form too?', 'フォームも必要なの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 5, 'user', 'Yeah, I still need to {fill in} the online form.', 'うん、まだオンラインフォームに記入しないと。', 'fill in', (SELECT id FROM vocab_senses WHERE slug='fill-in.phrv.complete'), ARRAY['fill in','carry out','take on','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 6, 'npc', 'Don''t rush it.', '焦らないでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 7, 'user', 'I won''t. I''ll also {look into} the company culture first.', '焦らない。会社の雰囲気も先に調べるよ。', 'look into', (SELECT id FROM vocab_senses WHERE slug='look-into.phrv.investigate'), ARRAY['look into','hand in','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 8, 'npc', 'Smart. What if they offer low pay?', '賢い。給料が低かったら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 9, 'user', 'Then I''ll politely {turn down} the offer.', 'そのときは丁寧に断るよ。', 'turn down', (SELECT id FROM vocab_senses WHERE slug='turn-down.phrv.refuse'), ARRAY['turn down','apply for','fill in','hand in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 10, 'npc', 'Good boundaries. Busy otherwise?', 'いい線引きだね。他は忙しい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 11, 'user', 'A little. I might {take on} some freelance work meanwhile.', '少し。その間フリーの仕事も引き受けるかも。', 'take on', (SELECT id FROM vocab_senses WHERE slug='take-on.phrv.accept'), ARRAY['take on','hand in','fill in','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 12, 'npc', 'Keep me posted!', 'また教えてね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 13, 'user', 'I will, thanks.', 'うん、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='conversation'), 14, 'npc', 'You''ve got this, {{user_name}}.', '大丈夫だよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 0, 'npc', 'Good morning. How can I help?', 'おはようございます。ご用件は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 1, 'user', 'I''d like to {apply for} a work permit.', '就労許可を申請したいです。', 'apply for', (SELECT id FROM vocab_senses WHERE slug='apply-for.phrv.request'), ARRAY['apply for','hand in','turn down','sort out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 2, 'npc', 'Sure. Do you have the form?', 'はい。用紙はお持ちですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 3, 'user', 'Yes, but I need to {fill in} a few boxes.', 'はい、でもいくつか記入が必要です。', 'fill in', (SELECT id FROM vocab_senses WHERE slug='fill-in.phrv.complete'), ARRAY['fill in','carry out','take on','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 4, 'npc', 'Take your time. Sign at the bottom.', 'ごゆっくり。下にサインを。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 5, 'user', 'Done. Where do I {hand in} the papers?', 'できました。書類はどこに提出を？', 'hand in', (SELECT id FROM vocab_senses WHERE slug='hand-in.phrv.submit'), ARRAY['hand in','look into','take on','turn down']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 6, 'npc', 'At window three.', '3番窓口です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 7, 'user', 'Great. Can you {sort out} my start date too?', 'ありがとう。開始日も調整してもらえますか？', 'sort out', (SELECT id FROM vocab_senses WHERE slug='sort-out.phrv.resolve'), ARRAY['sort out','apply for','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 8, 'npc', 'We''ll confirm that by email.', 'メールで確認します。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 9, 'user', 'Could you {look into} my visa status while I wait?', '待っている間、ビザの状況を調べてもらえますか？', 'look into', (SELECT id FROM vocab_senses WHERE slug='look-into.phrv.investigate'), ARRAY['look into','hand in','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 10, 'npc', 'Let me check the system.', 'システムを確認しますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 11, 'user', 'Thanks. I know you {carry out} lots of checks.', 'ありがとう。たくさんの確認を行っているんですよね。', 'carry out', (SELECT id FROM vocab_senses WHERE slug='carry-out.phrv.perform'), ARRAY['carry out','apply for','turn down','hand in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 12, 'npc', 'All done. You''re approved!', '完了です。承認されました！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 13, 'user', 'That''s wonderful, thank you.', 'よかった、ありがとうございます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='travel'), 14, 'npc', 'Welcome, and good luck!', 'ようこそ、頑張ってください！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 0, 'npc', 'Can you help with the new client project?', '新しいクライアントの案件、手伝える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 1, 'user', 'Sure, I can {take on} the research part.', 'いいよ、リサーチの部分を引き受ける。', 'take on', (SELECT id FROM vocab_senses WHERE slug='take-on.phrv.accept'), ARRAY['take on','hand in','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 2, 'npc', 'Great. It''s a lot of work.', '助かる。かなりの量だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 3, 'user', 'No problem. I''ll {carry out} the interviews first.', '大丈夫。まずインタビューを実行するよ。', 'carry out', (SELECT id FROM vocab_senses WHERE slug='carry-out.phrv.perform'), ARRAY['carry out','hand in','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 4, 'npc', 'There''s a data issue too.', 'データの問題もあるんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 5, 'user', 'I''ll {look into} the numbers this afternoon.', '午後に数字を調べるよ。', 'look into', (SELECT id FROM vocab_senses WHERE slug='look-into.phrv.investigate'), ARRAY['look into','hand in','turn down','apply for']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 6, 'npc', 'Thanks. When can you finish?', 'ありがとう。いつ終わる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 7, 'user', 'I''ll {hand in} the draft by Thursday.', '木曜までにドラフトを提出する。', 'hand in', (SELECT id FROM vocab_senses WHERE slug='hand-in.phrv.submit'), ARRAY['hand in','take on','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 8, 'npc', 'The client keeps changing the brief.', 'クライアントが要件をころころ変える。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 9, 'user', 'Let me {sort out} the requirements with them.', '要件を先方と整理してくるよ。', 'sort out', (SELECT id FROM vocab_senses WHERE slug='sort-out.phrv.resolve'), ARRAY['sort out','apply for','turn down','fill in']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 10, 'npc', 'Perfect. One more small task?', '完璧。もう一つ小さい仕事いい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 11, 'user', 'Honestly, I''ll {turn down} extra work this week; I''m full.', '正直、今週は追加は断るよ、手一杯で。', 'turn down', (SELECT id FROM vocab_senses WHERE slug='turn-down.phrv.refuse'), ARRAY['turn down','take on','hand in','carry out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 12, 'npc', 'Fair enough. Focus on the main job.', '了解。メインに集中して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 13, 'user', 'Thanks for understanding.', '分かってくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-8') AND goal='business'), 14, 'npc', 'Of course, {{user_name}}.', 'もちろん、{{user_name}}。', NULL, NULL, NULL);
