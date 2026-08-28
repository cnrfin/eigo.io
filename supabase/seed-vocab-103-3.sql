-- ============================================================================
-- Vocab 103: vocab-103-3 - Making a point  (Unit 2)
-- Words: get at, play down, touch on, sum up, put across, gloss over, single out, harp on.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('making-a-point', 'Making a point', '主張を伝える', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('get at', 'get at', '/ˈɡet æt/', '/ˈɡet æt/', NULL, 5, FALSE, NULL),
  ('play down', 'play down', '/ˌpleɪ ˈdaʊn/', '/ˌpleɪ ˈdaʊn/', NULL, 5, FALSE, NULL),
  ('touch on', 'touch on', '/ˈtʌtʃ ɑːn/', '/ˈtʌtʃ ɒn/', NULL, 5, FALSE, NULL),
  ('sum up', 'sum up', '/ˌsʌm ˈʌp/', '/ˌsʌm ˈʌp/', NULL, 5, FALSE, NULL),
  ('put across', 'put across', '/ˌpʊt əˈkrɔːs/', '/ˌpʊt əˈkrɒs/', NULL, 5, FALSE, NULL),
  ('gloss over', 'gloss over', '/ˌɡlɑːs ˈoʊvər/', '/ˌɡlɒs ˈəʊvə/', NULL, 5, FALSE, NULL),
  ('single out', 'single out', '/ˌsɪŋɡl ˈaʊt/', '/ˌsɪŋɡl ˈaʊt/', NULL, 5, FALSE, NULL),
  ('harp on', 'harp on', '/ˈhɑːrp ɑːn/', '/ˈhɑːp ɒn/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='get at'), 'get-at.phrv.imply', 1, TRUE, 'phrasal verb', '言おうとする', 'to try to say or suggest something', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='play down'), 'play-down.phrv.minimize', 1, TRUE, 'phrasal verb', '軽く扱う', 'to make something seem less important than it is', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='touch on'), 'touch-on.phrv.mention', 1, TRUE, 'phrasal verb', '軽く触れる', 'to mention something briefly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sum up'), 'sum-up.phrv.summarize', 1, TRUE, 'phrasal verb', '要約する', 'to state the main points briefly', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='put across'), 'put-across.phrv.convey', 1, TRUE, 'phrasal verb', '（考えを）伝える', 'to communicate an idea so people understand it', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gloss over'), 'gloss-over.phrv.evade', 1, TRUE, 'phrasal verb', 'ごまかす', 'to avoid discussing something fully', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='single out'), 'single-out.phrv.select', 1, TRUE, 'phrasal verb', '一つだけ取り上げる', 'to choose one person or thing from a group', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='harp on'), 'harp-on.phrv.dwell', 1, TRUE, 'phrasal verb', 'くどくど言う', 'to keep talking about something in an annoying way', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('get at', 'play down', 'touch on', 'sum up', 'put across', 'gloss over', 'single out', 'harp on')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='making-a-point'
WHERE s.slug IN ('get-at.phrv.imply', 'play-down.phrv.minimize', 'touch-on.phrv.mention', 'sum-up.phrv.summarize', 'put-across.phrv.convey', 'gloss-over.phrv.evade', 'single-out.phrv.select', 'harp-on.phrv.dwell')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-3', 2, 0, (SELECT id FROM vocab_categories WHERE slug='making-a-point'), 'Making a point', '言いたいことを伝える', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-3'), s.id, x.ord FROM (VALUES
  ('get-at.phrv.imply',0),('play-down.phrv.minimize',1),('touch-on.phrv.mention',2),('sum-up.phrv.summarize',3),('put-across.phrv.convey',4),('gloss-over.phrv.evade',5),('single-out.phrv.select',6),('harp-on.phrv.dwell',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-3'), 'conversation', 0, 'A disagreement', '意見の食い違い', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-3'), 'travel', 1, 'Tour plan questions', 'ツアー計画の疑問', 'agency', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-3'), 'business', 2, 'Prepping a presentation', 'プレゼンの準備', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 0, 'npc', 'You seem unsure about my idea.', '私の案に自信なさそうだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 1, 'user', 'I''m not sure what you {get at}, honestly.', '正直、何を言おうとしてるのか分からなくて。', 'get at', (SELECT id FROM vocab_senses WHERE slug='get-at.phrv.imply'), ARRAY['get at','play down','sum up','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 2, 'npc', 'Let me explain it better.', 'もっとちゃんと説明するね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 3, 'user', 'Please. You didn''t quite {put across} the main point.', 'お願い。要点がうまく伝わってなかった。', 'put across', (SELECT id FROM vocab_senses WHERE slug='put-across.phrv.convey'), ARRAY['put across','gloss over','single out','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 4, 'npc', 'Okay. The risk is small.', 'わかった。リスクは小さいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 5, 'user', 'I feel you {play down} the danger, though.', 'でも危険を軽く見てる気がする。', 'play down', (SELECT id FROM vocab_senses WHERE slug='play-down.phrv.minimize'), ARRAY['play down','sum up','touch on','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 6, 'npc', 'Maybe. What worries you most?', 'かもね。何が一番心配？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 7, 'user', 'You {gloss over} the budget completely.', '予算を完全にスルーしてる。', 'gloss over', (SELECT id FROM vocab_senses WHERE slug='gloss-over.phrv.evade'), ARRAY['gloss over','sum up','touch on','single out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 8, 'npc', 'Fair. Let''s be thorough.', 'なるほど。ちゃんとやろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 9, 'user', 'Can you {sum up} the whole plan first?', 'まず計画全体を要約してくれる？', 'sum up', (SELECT id FROM vocab_senses WHERE slug='sum-up.phrv.summarize'), ARRAY['sum up','harp on','single out','touch on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 10, 'npc', 'Sure, in three lines.', 'いいよ、3行で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 11, 'user', 'Thanks. I don''t want to {harp on}, but details matter.', 'ありがとう。くどくど言いたくないけど、細部は大事。', 'harp on', (SELECT id FROM vocab_senses WHERE slug='harp-on.phrv.dwell'), ARRAY['harp on','sum up','single out','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 12, 'npc', 'Understood. Details it is.', '了解。細部を詰めよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 13, 'user', 'Great, let''s dig in.', 'よし、取りかかろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='conversation'), 14, 'npc', 'Good talk, {{user_name}}.', 'いい話し合いだね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 0, 'npc', 'Any concerns about the tour plan?', 'ツアー計画で気になることは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 1, 'user', 'The guide only did {touch on} the safety rules.', 'ガイドは安全ルールに軽く触れただけで。', 'touch on', (SELECT id FROM vocab_senses WHERE slug='touch-on.phrv.mention'), ARRAY['touch on','single out','sum up','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 2, 'npc', 'You want more detail?', 'もっと詳しく？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 3, 'user', 'Yes, could you {sum up} the daily schedule?', 'はい、一日の予定を要約してもらえますか？', 'sum up', (SELECT id FROM vocab_senses WHERE slug='sum-up.phrv.summarize'), ARRAY['sum up','single out','harp on','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 4, 'npc', 'Morning hikes, afternoon free.', '午前はハイキング、午後は自由。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 5, 'user', 'Can you {single out} the optional paid activities?', '有料オプションだけ挙げてもらえますか？', 'single out', (SELECT id FROM vocab_senses WHERE slug='single-out.phrv.select'), ARRAY['single out','play down','sum up','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 6, 'npc', 'Sure: the boat trip and the spa.', 'はい、ボートとスパです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 7, 'user', 'The brochure seems to {play down} those fees.', 'パンフはその料金を軽く扱ってる気がします。', 'play down', (SELECT id FROM vocab_senses WHERE slug='play-down.phrv.minimize'), ARRAY['play down','sum up','touch on','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 8, 'npc', 'You''re right, they''re extra.', 'その通り、別料金です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 9, 'user', 'Just {put across} all costs upfront next time.', '次回は全費用を最初に明確に伝えてください。', 'put across', (SELECT id FROM vocab_senses WHERE slug='put-across.phrv.convey'), ARRAY['put across','sum up','touch on','single out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 10, 'npc', 'Noted. Transparency helps.', '了解。透明性は大事ですね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 11, 'user', 'Exactly. Don''t {gloss over} the extras.', 'そう。追加分をごまかさないで。', 'gloss over', (SELECT id FROM vocab_senses WHERE slug='gloss-over.phrv.evade'), ARRAY['gloss over','sum up','touch on','single out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 12, 'npc', 'Understood, all clear now.', '了解、すべて明確です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 13, 'user', 'Perfect, thanks.', '完璧、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='travel'), 14, 'npc', 'Enjoy the tour!', 'ツアーを楽しんで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 0, 'npc', 'Ready for the board presentation?', '役員会のプレゼン、準備できてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 1, 'user', 'Almost. I''ll {sum up} the quarter in one slide.', 'もう少し。四半期を1枚に要約する。', 'sum up', (SELECT id FROM vocab_senses WHERE slug='sum-up.phrv.summarize'), ARRAY['sum up','harp on','single out','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 2, 'npc', 'Good. Keep it clear.', 'いいね。分かりやすく。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 3, 'user', 'I want to {put across} the growth story simply.', '成長のストーリーをシンプルに伝えたい。', 'put across', (SELECT id FROM vocab_senses WHERE slug='put-across.phrv.convey'), ARRAY['put across','gloss over','single out','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 4, 'npc', 'Any weak numbers?', '弱い数字は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 5, 'user', 'One dip; I won''t {play down} it, just explain it.', '一つ落ち込みが。軽く扱わず、ちゃんと説明する。', 'play down', (SELECT id FROM vocab_senses WHERE slug='play-down.phrv.minimize'), ARRAY['play down','sum up','touch on','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 6, 'npc', 'Honesty is better. Highlight a star?', '正直がいい。目玉は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 7, 'user', 'Yes, I''ll {single out} the top region.', 'うん、一番の地域だけ取り上げる。', 'single out', (SELECT id FROM vocab_senses WHERE slug='single-out.phrv.select'), ARRAY['single out','sum up','touch on','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 8, 'npc', 'And the new project?', '新プロジェクトは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 9, 'user', 'I''ll just {touch on} it briefly for now.', '今は軽く触れるだけにする。', 'touch on', (SELECT id FROM vocab_senses WHERE slug='touch-on.phrv.mention'), ARRAY['touch on','sum up','single out','harp on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 10, 'npc', 'Don''t over-explain.', '説明しすぎないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 11, 'user', 'Right, I won''t {harp on} one topic.', 'うん、一つの話題をくどくど言わない。', 'harp on', (SELECT id FROM vocab_senses WHERE slug='harp-on.phrv.dwell'), ARRAY['harp on','sum up','single out','gloss over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 12, 'npc', 'You''ll nail it.', 'うまくいくよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 13, 'user', 'Fingers crossed.', 'うまくいきますように。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-3') AND goal='business'), 14, 'npc', 'You''ve got this, {{user_name}}.', '大丈夫、{{user_name}}。', NULL, NULL, NULL);
