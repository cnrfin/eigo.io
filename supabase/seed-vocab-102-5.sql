-- ============================================================================
-- Vocab 102: vocab-102-5 - Giving opinions  (Unit 2)
-- Words: opinion, agree, disagree, suggest, prefer, admit, doubt, reckon.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('opinions', 'Giving opinions', '意見を言う', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('opinion', 'opinion', '/əˈpɪnjən/', '/əˈpɪnjən/', NULL, 3, FALSE, NULL),
  ('agree', 'agree', '/əˈɡriː/', '/əˈɡriː/', NULL, 3, FALSE, NULL),
  ('disagree', 'disagree', '/ˌdɪsəˈɡriː/', '/ˌdɪsəˈɡriː/', NULL, 3, FALSE, NULL),
  ('suggest', 'suggest', '/səˈdʒest/', '/səˈdʒest/', NULL, 3, FALSE, NULL),
  ('prefer', 'prefer', '/prɪˈfɜːr/', '/prɪˈfɜː/', NULL, 3, FALSE, NULL),
  ('admit', 'admit', '/ədˈmɪt/', '/ədˈmɪt/', NULL, 4, FALSE, NULL),
  ('doubt', 'doubt', '/daʊt/', '/daʊt/', NULL, 4, TRUE, 'b は発音しない。/daʊt/。'),
  ('reckon', 'reckon', '/ˈrekən/', '/ˈrekən/', NULL, 4, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='opinion'), 'opinion.n.view', 1, TRUE, 'noun', '意見', 'what you think or believe about something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='agree'), 'agree.v.concur', 1, TRUE, 'verb', '同意する', 'to have the same opinion as someone', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='disagree'), 'disagree.v.differ', 1, TRUE, 'verb', '反対する', 'to have a different opinion from someone', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='suggest'), 'suggest.v.propose', 1, TRUE, 'verb', '提案する', 'to offer an idea or plan for others to consider', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='prefer'), 'prefer.v.rather', 1, TRUE, 'verb', 'の方を好む', 'to like one thing more than another', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='admit'), 'admit.v.confess', 1, TRUE, 'verb', '認める', 'to agree that something is true, often unwillingly', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='doubt'), 'doubt.v.question', 1, TRUE, 'verb', '疑う', 'to think that something may not be true', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reckon'), 'reckon.v.think', 1, TRUE, 'verb', '…だと思う', 'to think or believe something (informal)', 'B2', 'くだけた言い方の「思う」。会話向け。')
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('opinion', 'agree', 'disagree', 'suggest', 'prefer', 'admit', 'doubt', 'reckon')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), (SELECT id FROM vocab_senses WHERE slug='disagree.v.differ'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='disagree.v.differ'), (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='opinions'
WHERE s.slug IN ('opinion.n.view', 'agree.v.concur', 'disagree.v.differ', 'suggest.v.propose', 'prefer.v.rather', 'admit.v.confess', 'doubt.v.question', 'reckon.v.think')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-5', 2, 1, (SELECT id FROM vocab_categories WHERE slug='opinions'), 'Giving opinions', '意見の言い方', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-5'), s.id, x.ord FROM (VALUES
  ('opinion.n.view',0),('agree.v.concur',1),('disagree.v.differ',2),('suggest.v.propose',3),('prefer.v.rather',4),('admit.v.confess',5),('doubt.v.question',6),('reckon.v.think',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-5'), 'conversation', 0, 'Choosing a restaurant', '店を選ぶ', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-5'), 'travel', 1, 'Planning the day', '一日の計画', 'hotel', 'travel buddy'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-5'), 'business', 2, 'A launch decision', '発売の判断', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 0, 'npc', 'Where should we eat tonight?', '今夜どこで食べる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 1, 'user', 'Can I {suggest} the new ramen place?', '新しいラーメン屋を提案してもいい？', 'suggest', (SELECT id FROM vocab_senses WHERE slug='suggest.v.propose'), ARRAY['suggest','admit','doubt','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 2, 'npc', 'Hmm, it''s always crowded.', 'うーん、いつも混んでるよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 3, 'user', 'True. I {prefer} somewhere quiet anyway.', '確かに。どっちにしても静かな方が好き。', 'prefer', (SELECT id FROM vocab_senses WHERE slug='prefer.v.rather'), ARRAY['prefer','agree','disagree','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 4, 'npc', 'Same. What about the cafe on Fifth?', '私も。5番街のカフェは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 5, 'user', 'I {agree}, that''s a good choice.', '賛成、いい選択だね。', 'agree', (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), ARRAY['agree','disagree','admit','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 6, 'npc', 'Great. Though it can be pricey.', 'いいね。ちょっと高いかもだけど。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 7, 'user', 'I {doubt} it''s that expensive for lunch.', 'ランチならそんなに高くないと思うよ。', 'doubt', (SELECT id FROM vocab_senses WHERE slug='doubt.v.question'), ARRAY['doubt','agree','suggest','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 8, 'npc', 'You might be right. Let''s check the menu.', 'そうかも。メニュー見てみよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 9, 'user', 'In my {opinion}, their pasta is the best.', '私の意見では、あそこのパスタが一番。', 'opinion', (SELECT id FROM vocab_senses WHERE slug='opinion.n.view'), ARRAY['opinion','agree','doubt','suggest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 10, 'npc', 'Bold claim! I''ve never tried it.', '自信あるね！食べたことないや。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 11, 'user', 'I''ll {admit}, I go there too often.', '認めるよ、行きすぎてるって。', 'admit', (SELECT id FROM vocab_senses WHERE slug='admit.v.confess'), ARRAY['admit','disagree','prefer','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 12, 'npc', 'Ha, let''s go then.', 'はは、じゃあ行こう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 13, 'user', 'Perfect, I''m hungry.', 'いいね、お腹すいた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='conversation'), 14, 'npc', 'Let''s walk over, {{user_name}}.', '歩いて行こう、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 0, 'npc', 'Shall we do the museum or the beach first?', '美術館と海、どっちを先にする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 1, 'user', 'I {reckon} the beach first, before it gets hot.', '暑くなる前に、海が先だと思う。', 'reckon', (SELECT id FROM vocab_senses WHERE slug='reckon.v.think'), ARRAY['reckon','admit','doubt','agree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 2, 'npc', 'Hmm, mornings are best for the museum, though.', 'うーん、美術館は午前がいいけどね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 3, 'user', 'I {disagree}; the beach is quieter early.', '反対だな、海は朝の方が空いてる。', 'disagree', (SELECT id FROM vocab_senses WHERE slug='disagree.v.differ'), ARRAY['disagree','agree','suggest','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 4, 'npc', 'Fair point. I can be flexible.', '一理あるね。合わせられるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 5, 'user', 'Can I {suggest} the beach now, museum after lunch?', '海を今、美術館を昼食後にって提案してもいい？', 'suggest', (SELECT id FROM vocab_senses WHERE slug='suggest.v.propose'), ARRAY['suggest','admit','doubt','reckon']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 6, 'npc', 'That works for me.', 'それでいいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 7, 'user', 'Good. I {prefer} the sea in the morning.', 'よかった。海は朝の方が好き。', 'prefer', (SELECT id FROM vocab_senses WHERE slug='prefer.v.rather'), ARRAY['prefer','agree','disagree','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 8, 'npc', 'Me too, actually.', '実は私も。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 9, 'user', 'See, we {agree} after all!', 'ほら、結局意見が合った！', 'agree', (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), ARRAY['agree','disagree','admit','doubt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 10, 'npc', 'Ha, we usually do.', 'はは、たいていそうだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 11, 'user', 'In my {opinion}, flexible plans are the best plans.', '私の意見では、柔軟な計画が一番いい。', 'opinion', (SELECT id FROM vocab_senses WHERE slug='opinion.n.view'), ARRAY['opinion','doubt','suggest','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 12, 'npc', 'Wise words. Let''s grab our bags.', '名言だね。荷物取ってこよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 13, 'user', 'Ready when you are.', 'いつでもいいよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='travel'), 14, 'npc', 'Off we go!', '出発！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 0, 'npc', 'So, do we launch in June or July?', 'で、発売は6月？7月？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 1, 'user', 'In my {opinion}, July gives us more time.', '私の意見では、7月の方が時間に余裕がある。', 'opinion', (SELECT id FROM vocab_senses WHERE slug='opinion.n.view'), ARRAY['opinion','doubt','agree','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 2, 'npc', 'Interesting. Marketing wants June.', 'なるほど。マーケは6月推し。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 3, 'user', 'I {disagree} with June; it''s too rushed.', '6月には反対、急ぎすぎる。', 'disagree', (SELECT id FROM vocab_senses WHERE slug='disagree.v.differ'), ARRAY['disagree','agree','suggest','reckon']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 4, 'npc', 'You may be right. What''s your plan?', '確かに。案は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 5, 'user', 'I''d {suggest} a soft launch in July.', '7月にソフトローンチを提案するよ。', 'suggest', (SELECT id FROM vocab_senses WHERE slug='suggest.v.propose'), ARRAY['suggest','admit','doubt','prefer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 6, 'npc', 'The client might push back, though.', 'でもクライアントが渋るかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 7, 'user', 'I {doubt} they''ll mind a short delay.', '短い遅れなら気にしないと思う。', 'doubt', (SELECT id FROM vocab_senses WHERE slug='doubt.v.question'), ARRAY['doubt','agree','suggest','opinion']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 8, 'npc', 'Okay. Can you present this idea?', 'わかった。この案、発表できる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 9, 'user', 'Sure, though I''ll {admit} I''m still refining it.', 'いいよ、まだ詰めてるのは認めるけど。', 'admit', (SELECT id FROM vocab_senses WHERE slug='admit.v.confess'), ARRAY['admit','disagree','prefer','agree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 10, 'npc', 'That''s fine. The team will like it.', '大丈夫。チームも気に入るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 11, 'user', 'I hope they {agree} once they see the timeline.', '日程を見たら賛成してくれるといいな。', 'agree', (SELECT id FROM vocab_senses WHERE slug='agree.v.concur'), ARRAY['agree','disagree','doubt','suggest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 12, 'npc', 'Let''s find out in the meeting.', '会議で確かめよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 13, 'user', 'I''ll set it up.', 'セットするね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-5') AND goal='business'), 14, 'npc', 'Great work, {{user_name}}.', 'いい仕事だね、{{user_name}}。', NULL, NULL, NULL);
