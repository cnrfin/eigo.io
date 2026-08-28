-- ============================================================================
-- Vocab 103: vocab-103-5 - Getting things done  (Unit 3)
-- Words: nail down, draw up, roll out, follow through, hammer out, flesh out, map out, iron out.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('getting-things-done-c1', 'Getting things done', '物事を進める', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('nail down', 'nail down', '/ˌneɪl ˈdaʊn/', '/ˌneɪl ˈdaʊn/', NULL, 5, FALSE, NULL),
  ('draw up', 'draw up', '/ˌdrɔː ˈʌp/', '/ˌdrɔː ˈʌp/', NULL, 5, FALSE, NULL),
  ('roll out', 'roll out', '/ˌroʊl ˈaʊt/', '/ˌrəʊl ˈaʊt/', NULL, 5, FALSE, NULL),
  ('follow through', 'follow through', '/ˌfɑːloʊ ˈθruː/', '/ˌfɒləʊ ˈθruː/', NULL, 5, FALSE, NULL),
  ('hammer out', 'hammer out', '/ˌhæmər ˈaʊt/', '/ˌhæmə ˈaʊt/', NULL, 5, FALSE, NULL),
  ('flesh out', 'flesh out', '/ˌfleʃ ˈaʊt/', '/ˌfleʃ ˈaʊt/', NULL, 5, FALSE, NULL),
  ('map out', 'map out', '/ˌmæp ˈaʊt/', '/ˌmæp ˈaʊt/', NULL, 5, FALSE, NULL),
  ('iron out', 'iron out', '/ˌaɪərn ˈaʊt/', '/ˌaɪən ˈaʊt/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='nail down'), 'nail-down.phrv.finalize', 1, TRUE, 'phrasal verb', '（詳細を）確定する', 'to agree or decide something exactly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='draw up'), 'draw-up.phrv.prepare', 1, TRUE, 'phrasal verb', '（書類などを）作成する', 'to prepare a document, plan, or list', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='roll out'), 'roll-out.phrv.launch', 1, TRUE, 'phrasal verb', '展開する', 'to introduce a new product or plan', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='follow through'), 'follow-through.phrv.complete', 1, TRUE, 'phrasal verb', '最後までやり遂げる', 'to finish something you have started', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hammer out'), 'hammer-out.phrv.negotiate', 1, TRUE, 'phrasal verb', '話し合ってまとめる', 'to reach an agreement after long discussion', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='flesh out'), 'flesh-out.phrv.detail', 1, TRUE, 'phrasal verb', '肉付けする', 'to add more detail to a plan or idea', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='map out'), 'map-out.phrv.plan', 1, TRUE, 'phrasal verb', '綿密に計画する', 'to plan something carefully in advance', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='iron out'), 'iron-out.phrv.resolve', 1, TRUE, 'phrasal verb', '（問題を）解決する', 'to solve small problems or difficulties', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('nail down', 'draw up', 'roll out', 'follow through', 'hammer out', 'flesh out', 'map out', 'iron out')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='getting-things-done-c1'
WHERE s.slug IN ('nail-down.phrv.finalize', 'draw-up.phrv.prepare', 'roll-out.phrv.launch', 'follow-through.phrv.complete', 'hammer-out.phrv.negotiate', 'flesh-out.phrv.detail', 'map-out.phrv.plan', 'iron-out.phrv.resolve')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-5', 3, 0, (SELECT id FROM vocab_categories WHERE slug='getting-things-done-c1'), 'Getting things done', '仕事を前に進める', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-5'), s.id, x.ord FROM (VALUES
  ('nail-down.phrv.finalize',0),('draw-up.phrv.prepare',1),('roll-out.phrv.launch',2),('follow-through.phrv.complete',3),('hammer-out.phrv.negotiate',4),('flesh-out.phrv.detail',5),('map-out.phrv.plan',6),('iron-out.phrv.resolve',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-5'), 'conversation', 0, 'Planning a side project', 'サイドプロジェクトの計画', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-5'), 'travel', 1, 'Organizing a group trip', 'グループ旅行の準備', 'home', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-5'), 'business', 2, 'A product launch', '製品ローンチ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 0, 'npc', 'You''re starting a podcast?', 'ポッドキャスト始めるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 1, 'user', 'Yeah, I need to {map out} the first season.', 'うん、まず第1シーズンを綿密に計画しないと。', 'map out', (SELECT id FROM vocab_senses WHERE slug='map-out.phrv.plan'), ARRAY['map out','flesh out','nail down','iron out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 2, 'npc', 'How many episodes?', '何話にするの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 3, 'user', 'I still have to {nail down} the number.', 'まだ本数を確定してないんだ。', 'nail down', (SELECT id FROM vocab_senses WHERE slug='nail-down.phrv.finalize'), ARRAY['nail down','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 4, 'npc', 'Got a topic list?', 'トピック一覧はある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 5, 'user', 'A rough one; I''ll {flesh out} each idea.', 'ざっくりね。各アイデアを肉付けするよ。', 'flesh out', (SELECT id FROM vocab_senses WHERE slug='flesh-out.phrv.detail'), ARRAY['flesh out','roll out','nail down','iron out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 6, 'npc', 'Any guests?', 'ゲストは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 7, 'user', 'Yes, I''ll {draw up} a guest wishlist.', 'うん、呼びたいゲストのリストを作る。', 'draw up', (SELECT id FROM vocab_senses WHERE slug='draw-up.phrv.prepare'), ARRAY['draw up','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 8, 'npc', 'Cool. When do you launch?', 'いいね。いつ公開？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 9, 'user', 'Soon, if I actually {follow through} this time!', '近いうち、今度こそやり遂げれば！', 'follow through', (SELECT id FROM vocab_senses WHERE slug='follow-through.phrv.complete'), ARRAY['follow through','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 10, 'npc', 'You will. Any tech issues?', 'できるよ。技術的な問題は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 11, 'user', 'A few; I''ll {iron out} the audio problems.', '少し。音声の問題を解決する。', 'iron out', (SELECT id FROM vocab_senses WHERE slug='iron-out.phrv.resolve'), ARRAY['iron out','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 12, 'npc', 'Can''t wait to listen!', '聴くの楽しみ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 13, 'user', 'I''ll send you episode one.', '第1話送るね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='conversation'), 14, 'npc', 'Please do, {{user_name}}!', 'ぜひ、{{user_name}}！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 0, 'npc', 'This group trip needs organizing.', 'このグループ旅行、整理が必要だね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 1, 'user', 'I''ll {map out} the route for all five days.', '5日間のルートを綿密に計画するよ。', 'map out', (SELECT id FROM vocab_senses WHERE slug='map-out.phrv.plan'), ARRAY['map out','flesh out','nail down','iron out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 2, 'npc', 'People disagree on the budget.', '予算で意見が割れてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 3, 'user', 'We''ll {hammer out} a budget everyone accepts.', 'みんなが納得する予算を話し合ってまとめよう。', 'hammer out', (SELECT id FROM vocab_senses WHERE slug='hammer-out.phrv.negotiate'), ARRAY['hammer out','roll out','nail down','follow through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 4, 'npc', 'And the dates?', '日程は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 5, 'user', 'Let''s {nail down} the exact dates tonight.', '今夜、正確な日程を確定しよう。', 'nail down', (SELECT id FROM vocab_senses WHERE slug='nail-down.phrv.finalize'), ARRAY['nail down','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 6, 'npc', 'Some want a printed plan.', '印刷した計画がほしい人も。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 7, 'user', 'Sure, I''ll {draw up} an itinerary document.', '了解、旅程の書類を作るよ。', 'draw up', (SELECT id FROM vocab_senses WHERE slug='draw-up.phrv.prepare'), ARRAY['draw up','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 8, 'npc', 'There are a few booking clashes.', '予約が少しかぶってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 9, 'user', 'I''ll {iron out} the overlaps with the hotel.', 'ホテルと調整して重複を解決する。', 'iron out', (SELECT id FROM vocab_senses WHERE slug='iron-out.phrv.resolve'), ARRAY['iron out','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 10, 'npc', 'Then we tell everyone?', 'それからみんなに伝える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 11, 'user', 'Yes, we {roll out} the final plan to the group.', 'うん、最終案をグループに展開する。', 'roll out', (SELECT id FROM vocab_senses WHERE slug='roll-out.phrv.launch'), ARRAY['roll out','nail down','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 12, 'npc', 'Great teamwork!', 'いい連携！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 13, 'user', 'Almost sorted.', 'ほぼ片付いた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='travel'), 14, 'npc', 'Amazing, thanks!', '最高、ありがとう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 0, 'npc', 'Are we ready to launch the app?', 'アプリをローンチする準備できてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 1, 'user', 'Almost. We {roll out} to beta users Friday.', 'もう少し。金曜にベータユーザーへ展開する。', 'roll out', (SELECT id FROM vocab_senses WHERE slug='roll-out.phrv.launch'), ARRAY['roll out','nail down','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 2, 'npc', 'Is the pricing set?', '価格は決まった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 3, 'user', 'Not fully; we must {nail down} the tiers.', '完全には。料金プランを確定しないと。', 'nail down', (SELECT id FROM vocab_senses WHERE slug='nail-down.phrv.finalize'), ARRAY['nail down','roll out','follow through','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 4, 'npc', 'The marketing plan is thin.', 'マーケ計画が薄いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 5, 'user', 'I''ll {flesh out} the campaign this week.', '今週キャンペーンを肉付けする。', 'flesh out', (SELECT id FROM vocab_senses WHERE slug='flesh-out.phrv.detail'), ARRAY['flesh out','roll out','nail down','iron out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 6, 'npc', 'Legal has concerns.', '法務が懸念してる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 7, 'user', 'We''ll {hammer out} the terms with them.', '彼らと条件を話し合ってまとめる。', 'hammer out', (SELECT id FROM vocab_senses WHERE slug='hammer-out.phrv.negotiate'), ARRAY['hammer out','roll out','nail down','follow through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 8, 'npc', 'Any bugs left?', 'バグは残ってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 9, 'user', 'Dev will {iron out} the last few today.', '開発が今日、残りを解決する。', 'iron out', (SELECT id FROM vocab_senses WHERE slug='iron-out.phrv.resolve'), ARRAY['iron out','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 10, 'npc', 'Good. Don''t drop the ball.', 'いいね。ミスしないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 11, 'user', 'I''ll {follow through} on every task.', '全タスクをやり遂げる。', 'follow through', (SELECT id FROM vocab_senses WHERE slug='follow-through.phrv.complete'), ARRAY['follow through','roll out','nail down','hammer out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 12, 'npc', 'That''s why you lead this.', 'だから君がリーダー。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 13, 'user', 'On it.', '任せて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-5') AND goal='business'), 14, 'npc', 'Great, {{user_name}}.', 'いいね、{{user_name}}。', NULL, NULL, NULL);
