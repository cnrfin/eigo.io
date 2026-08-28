-- ============================================================================
-- Vocab 103: vocab-103-15 - Achievement  (Unit 8)
-- Words: pull off, live up to, carry off, sail through, bounce back, press on, forge ahead, come through.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('achievement-c1', 'Achievement', '成し遂げる', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pull off', 'pull off', '/ˌpʊl ˈɔːf/', '/ˌpʊl ˈɒf/', NULL, 5, FALSE, NULL),
  ('live up to', 'live up to', '/ˌlɪv ˈʌp tuː/', '/ˌlɪv ˈʌp tuː/', NULL, 5, FALSE, NULL),
  ('carry off', 'carry off', '/ˌkæri ˈɔːf/', '/ˌkæri ˈɒf/', NULL, 5, FALSE, NULL),
  ('sail through', 'sail through', '/ˌseɪl ˈθruː/', '/ˌseɪl ˈθruː/', NULL, 5, FALSE, NULL),
  ('bounce back', 'bounce back', '/ˌbaʊns ˈbæk/', '/ˌbaʊns ˈbæk/', NULL, 5, FALSE, NULL),
  ('press on', 'press on', '/ˌpres ˈɑːn/', '/ˌpres ˈɒn/', NULL, 5, FALSE, NULL),
  ('forge ahead', 'forge ahead', '/ˌfɔːrdʒ əˈhed/', '/ˌfɔːdʒ əˈhed/', NULL, 5, FALSE, NULL),
  ('come through', 'come through', '/ˌkʌm ˈθruː/', '/ˌkʌm ˈθruː/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pull off'), 'pull-off.phrv.achieve', 1, TRUE, 'phrasal verb', '（難しいことを）成し遂げる', 'to succeed in doing something difficult', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='live up to'), 'live-up-to.phrv.meet', 1, TRUE, 'phrasal verb', '期待に応える', 'to be as good as people expected', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='carry off'), 'carry-off.phrv.manage', 1, TRUE, 'phrasal verb', 'うまくやってのける', 'to do something difficult successfully', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sail through'), 'sail-through.phrv.pass', 1, TRUE, 'phrasal verb', '楽々と通過する', 'to succeed at something very easily', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bounce back'), 'bounce-back.phrv.recover', 1, TRUE, 'phrasal verb', '立ち直る', 'to recover quickly after a setback', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='press on'), 'press-on.phrv.persist', 1, TRUE, 'phrasal verb', '頑張って続ける', 'to continue doing something despite difficulty', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='forge ahead'), 'forge-ahead.phrv.advance', 1, TRUE, 'phrasal verb', '力強く前進する', 'to move forward with determination', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='come through'), 'come-through.phrv.deliver', 1, TRUE, 'phrasal verb', '期待に応えて助ける', 'to do what is needed in a difficult time', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pull off', 'live up to', 'carry off', 'sail through', 'bounce back', 'press on', 'forge ahead', 'come through')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='press-on.phrv.persist'), (SELECT id FROM vocab_senses WHERE slug='forge-ahead.phrv.advance'), NULL, 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='achievement-c1'
WHERE s.slug IN ('pull-off.phrv.achieve', 'live-up-to.phrv.meet', 'carry-off.phrv.manage', 'sail-through.phrv.pass', 'bounce-back.phrv.recover', 'press-on.phrv.persist', 'forge-ahead.phrv.advance', 'come-through.phrv.deliver')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-15', 8, 0, (SELECT id FROM vocab_categories WHERE slug='achievement-c1'), 'Achievement', 'やり遂げる', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-15'), s.id, x.ord FROM (VALUES
  ('pull-off.phrv.achieve',0),('live-up-to.phrv.meet',1),('carry-off.phrv.manage',2),('sail-through.phrv.pass',3),('bounce-back.phrv.recover',4),('press-on.phrv.persist',5),('forge-ahead.phrv.advance',6),('come-through.phrv.deliver',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-15'), 'conversation', 0, 'After the marathon', 'マラソンのあと', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-15'), 'travel', 1, 'A tough trek', '過酷なトレッキング', 'mountain', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-15'), 'business', 2, 'A launch delivered', 'ローンチ達成', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 0, 'npc', 'You finished the marathon!', 'マラソン完走したね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 1, 'user', 'I still can''t believe I did {pull off} the whole thing.', '全部やり遂げたなんて、まだ信じられない。', 'pull off', (SELECT id FROM vocab_senses WHERE slug='pull-off.phrv.achieve'), ARRAY['pull off','live up to','sail through','bounce back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 2, 'npc', 'Was training hard?', '練習はきつかった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 3, 'user', 'Brutal, but I had to {press on}.', '過酷、でも頑張って続けるしかなかった。', 'press on', (SELECT id FROM vocab_senses WHERE slug='press-on.phrv.persist'), ARRAY['press on','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 4, 'npc', 'Any setbacks?', 'つまずきは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 5, 'user', 'An injury, but I did {bounce back} quickly.', 'けがしたけど、すぐ立ち直った。', 'bounce back', (SELECT id FROM vocab_senses WHERE slug='bounce-back.phrv.recover'), ARRAY['bounce back','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 6, 'npc', 'Did the race meet the hype?', 'レースは評判通りだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 7, 'user', 'It totally did {live up to} my expectations.', '完全に期待に応えてくれた。', 'live up to', (SELECT id FROM vocab_senses WHERE slug='live-up-to.phrv.meet'), ARRAY['live up to','pull off','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 8, 'npc', 'Was the last mile okay?', '最後の1マイルは大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 9, 'user', 'Surprisingly, I did {sail through} the finish.', '意外にも、ゴールは楽々だった。', 'sail through', (SELECT id FROM vocab_senses WHERE slug='sail-through.phrv.pass'), ARRAY['sail through','pull off','press on','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 10, 'npc', 'Your friends cheered?', '友達は応援した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 11, 'user', 'Yeah, they did {come through} with signs and snacks.', 'うん、みんな応援ボードと軽食で駆けつけてくれた。', 'come through', (SELECT id FROM vocab_senses WHERE slug='come-through.phrv.deliver'), ARRAY['come through','pull off','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 12, 'npc', 'Amazing support.', 'すごい応援。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 13, 'user', 'Best day.', '最高の日。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='conversation'), 14, 'npc', 'So proud, {{user_name}}.', '誇らしいよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 0, 'npc', 'This trek is exhausting.', 'このトレッキング、へとへと。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 1, 'user', 'I know, but let''s {press on} to the summit.', 'わかる、でも頂上まで頑張って続けよう。', 'press on', (SELECT id FROM vocab_senses WHERE slug='press-on.phrv.persist'), ARRAY['press on','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 2, 'npc', 'The path is steep now.', '道が急になってきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 3, 'user', 'We''ll {forge ahead}; the view is worth it.', '力強く前進しよう、景色にその価値がある。', 'forge ahead', (SELECT id FROM vocab_senses WHERE slug='forge-ahead.phrv.advance'), ARRAY['forge ahead','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 4, 'npc', 'You slipped earlier, okay?', 'さっき滑ったけど大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 5, 'user', 'Fine now; I did {bounce back} fast.', 'もう平気、すぐ立ち直った。', 'bounce back', (SELECT id FROM vocab_senses WHERE slug='bounce-back.phrv.recover'), ARRAY['bounce back','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 6, 'npc', 'Think we can finish today?', '今日中に終わると思う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 7, 'user', 'If we push, we can {pull off} the full loop.', '頑張れば、周回を成し遂げられる。', 'pull off', (SELECT id FROM vocab_senses WHERE slug='pull-off.phrv.achieve'), ARRAY['pull off','live up to','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 8, 'npc', 'The guide made it look easy.', 'ガイドは簡単そうにやってたね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 9, 'user', 'Yeah, she did {carry off} the tricky parts smoothly.', 'うん、難所を軽々とやってのけた。', 'carry off', (SELECT id FROM vocab_senses WHERE slug='carry-off.phrv.manage'), ARRAY['carry off','live up to','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 10, 'npc', 'And the river crossing?', '川渡りは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 11, 'user', 'We did {sail through} it, no problem.', '楽々と渡れた、問題なし。', 'sail through', (SELECT id FROM vocab_senses WHERE slug='sail-through.phrv.pass'), ARRAY['sail through','pull off','press on','forge ahead']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 12, 'npc', 'We''re doing great!', 'いい調子！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 13, 'user', 'Almost there!', 'もうすぐ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='travel'), 14, 'npc', 'Keep going!', 'その調子！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 0, 'npc', 'We shipped the launch on time!', '予定通りローンチできた！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 1, 'user', 'I can''t believe we did {pull off} such a tight deadline.', 'こんなきつい締め切りを成し遂げたなんて。', 'pull off', (SELECT id FROM vocab_senses WHERE slug='pull-off.phrv.achieve'), ARRAY['pull off','live up to','sail through','bounce back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 2, 'npc', 'The team was incredible.', 'チームがすごかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 3, 'user', 'Everyone did {come through} in the final week.', '最終週、みんなが期待に応えてくれた。', 'come through', (SELECT id FROM vocab_senses WHERE slug='come-through.phrv.deliver'), ARRAY['come through','live up to','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 4, 'npc', 'Did it meet the client''s hopes?', 'クライアントの期待に応えた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 5, 'user', 'It really did {live up to} their expectations.', '本当に期待に応えた。', 'live up to', (SELECT id FROM vocab_senses WHERE slug='live-up-to.phrv.meet'), ARRAY['live up to','pull off','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 6, 'npc', 'There was that mid-project crisis.', '途中で危機があったよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 7, 'user', 'True, but we did {bounce back} strong.', '確かに、でも力強く立ち直った。', 'bounce back', (SELECT id FROM vocab_senses WHERE slug='bounce-back.phrv.recover'), ARRAY['bounce back','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 8, 'npc', 'Now the next phase?', '次のフェーズは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 9, 'user', 'Yes, let''s {forge ahead} with version two.', 'うん、バージョン2に力強く進もう。', 'forge ahead', (SELECT id FROM vocab_senses WHERE slug='forge-ahead.phrv.advance'), ARRAY['forge ahead','live up to','sail through','come through']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 10, 'npc', 'The demo was flawless.', 'デモは完璧だった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 11, 'user', 'The presenter did {carry off} it beautifully.', '発表者が見事にやってのけた。', 'carry off', (SELECT id FROM vocab_senses WHERE slug='carry-off.phrv.manage'), ARRAY['carry off','live up to','sail through','press on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 12, 'npc', 'Great quarter.', 'いい四半期。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 13, 'user', 'Proud of us.', '誇らしい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-15') AND goal='business'), 14, 'npc', 'Well done, {{user_name}}.', 'よくやった、{{user_name}}。', NULL, NULL, NULL);
