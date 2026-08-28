-- ============================================================================
-- Vocab 102: vocab-102-4 - Nuanced emotions  (Unit 2)
-- Words: nervous, relieved, embarrassed, jealous, proud, frustrated, anxious, grateful.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('emotions', 'Emotions', '感情', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('nervous', 'nervous', '/ˈnɜːrvəs/', '/ˈnɜːvəs/', NULL, 3, FALSE, NULL),
  ('relieved', 'relieved', '/rɪˈliːvd/', '/rɪˈliːvd/', NULL, 3, FALSE, NULL),
  ('embarrassed', 'embarrassed', '/ɪmˈbærəst/', '/ɪmˈbærəst/', NULL, 3, FALSE, NULL),
  ('jealous', 'jealous', '/ˈdʒeləs/', '/ˈdʒeləs/', NULL, 4, FALSE, NULL),
  ('proud', 'proud', '/praʊd/', '/praʊd/', NULL, 3, FALSE, NULL),
  ('frustrated', 'frustrated', '/ˈfrʌstreɪtɪd/', '/frʌsˈtreɪtɪd/', NULL, 4, FALSE, NULL),
  ('anxious', 'anxious', '/ˈæŋkʃəs/', '/ˈæŋkʃəs/', NULL, 4, FALSE, NULL),
  ('grateful', 'grateful', '/ˈɡreɪtfl/', '/ˈɡreɪtfl/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='nervous'), 'nervous.adj.tense', 1, TRUE, 'adjective', '緊張して', 'worried and slightly afraid', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='relieved'), 'relieved.adj.eased', 1, TRUE, 'adjective', 'ほっとした', 'glad because a worry has gone away', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='embarrassed'), 'embarrassed.adj.ashamed', 1, TRUE, 'adjective', '恥ずかしい', 'shy or ashamed in front of other people', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='jealous'), 'jealous.adj.envious', 1, TRUE, 'adjective', '嫉妬して', 'unhappy because you want what someone else has', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='proud'), 'proud.adj.pleased', 1, TRUE, 'adjective', '誇りに思う', 'pleased about something good you or others did', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='frustrated'), 'frustrated.adj.annoyed', 1, TRUE, 'adjective', 'いら立った', 'annoyed because you cannot do what you want', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='anxious'), 'anxious.adj.worried', 1, TRUE, 'adjective', '不安な', 'worried about something that might happen', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='grateful'), 'grateful.adj.thankful', 1, TRUE, 'adjective', '感謝して', 'thankful for something someone did', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('nervous', 'relieved', 'embarrassed', 'jealous', 'proud', 'frustrated', 'anxious', 'grateful')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), (SELECT id FROM vocab_senses WHERE slug='anxious.adj.worried'), NULL, 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='grateful.adj.thankful'), NULL, 'thankful', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='jealous.adj.envious'), NULL, 'envious', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='emotions'
WHERE s.slug IN ('nervous.adj.tense', 'relieved.adj.eased', 'embarrassed.adj.ashamed', 'jealous.adj.envious', 'proud.adj.pleased', 'frustrated.adj.annoyed', 'anxious.adj.worried', 'grateful.adj.thankful')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-4', 2, 0, (SELECT id FROM vocab_categories WHERE slug='emotions'), 'Nuanced emotions', '感情を細かく表す', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-4'), s.id, x.ord FROM (VALUES
  ('nervous.adj.tense',0),('relieved.adj.eased',1),('embarrassed.adj.ashamed',2),('jealous.adj.envious',3),('proud.adj.pleased',4),('frustrated.adj.annoyed',5),('anxious.adj.worried',6),('grateful.adj.thankful',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-4'), 'conversation', 0, 'Before an interview', '面接の前に', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-4'), 'travel', 1, 'A nervous flyer', '飛行機が苦手', 'airport', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-4'), 'business', 2, 'Before the pitch', 'プレゼンの前に', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 0, 'npc', 'You seem quiet today. Everything okay?', '今日は静かだね。大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 1, 'user', 'I''m just {nervous}; I have a big interview tomorrow.', '緊張してるだけ。明日大事な面接があって。', 'nervous', (SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), ARRAY['nervous','relieved','proud','grateful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 2, 'npc', 'Ah, that makes sense. You''ll do great.', 'なるほど。きっとうまくいくよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 3, 'user', 'Thanks. I''m also {frustrated}; I keep forgetting my answers.', 'ありがとう。それにいらいらする。答えを忘れちゃって。', 'frustrated', (SELECT id FROM vocab_senses WHERE slug='frustrated.adj.annoyed'), ARRAY['frustrated','relieved','proud','embarrassed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 4, 'npc', 'Take a breath. Practice with me?', '深呼吸して。私と練習する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 5, 'user', 'That would help. I''m really {grateful} for that.', '助かる。本当に感謝する。', 'grateful', (SELECT id FROM vocab_senses WHERE slug='grateful.adj.thankful'), ARRAY['grateful','jealous','nervous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 6, 'npc', 'Of course. Tell me about your last job.', 'もちろん。前の仕事のこと教えて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 7, 'user', 'I led a big project. I''m quite {proud} of it.', '大きなプロジェクトを率いた。結構誇りに思ってる。', 'proud', (SELECT id FROM vocab_senses WHERE slug='proud.adj.pleased'), ARRAY['proud','embarrassed','nervous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 8, 'npc', 'That''s a great story. Use it tomorrow.', 'いい話だね。明日それを使いなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 9, 'user', 'I will. Last time I was so {embarrassed}; I blanked completely.', 'そうする。前回はすごく恥ずかしくて、頭が真っ白になった。', 'embarrassed', (SELECT id FROM vocab_senses WHERE slug='embarrassed.adj.ashamed'), ARRAY['embarrassed','relieved','grateful','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 10, 'npc', 'Happens to everyone. You''re ready now.', '誰にでもある。もう大丈夫だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 11, 'user', 'Honestly, I feel {relieved} just talking it through.', '正直、話しただけでほっとした。', 'relieved', (SELECT id FROM vocab_senses WHERE slug='relieved.adj.eased'), ARRAY['relieved','nervous','jealous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 12, 'npc', 'Good. Message me after, okay?', 'よかった。終わったら連絡してね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 13, 'user', 'I will. Thanks for listening.', 'するね。聞いてくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='conversation'), 14, 'npc', 'Anytime, {{user_name}}. Good luck!', 'いつでも、{{user_name}}。頑張って！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 0, 'npc', 'Big trip ahead? You look a bit tense.', '大きな旅？少し緊張してるみたい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 1, 'user', 'Yeah, I''m {anxious} about the long flight.', 'うん、長いフライトが不安で。', 'anxious', (SELECT id FROM vocab_senses WHERE slug='anxious.adj.worried'), ARRAY['anxious','proud','grateful','relieved']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 2, 'npc', 'First time flying far?', '遠くへ飛ぶのは初めて？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 3, 'user', 'Kind of. I''m {nervous} during takeoff especially.', 'まあね。特に離陸のとき緊張する。', 'nervous', (SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), ARRAY['nervous','jealous','relieved','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 4, 'npc', 'Takeoff is quick, don''t worry.', '離陸はすぐだよ、心配ないよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 5, 'user', 'You seem so calm. I''m a little {jealous} of that!', 'すごく落ち着いてるね。ちょっと羨ましい！', 'jealous', (SELECT id FROM vocab_senses WHERE slug='jealous.adj.envious'), ARRAY['jealous','grateful','nervous','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 6, 'npc', 'Ha! I fly a lot for work.', 'はは！仕事でよく飛ぶんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 7, 'user', 'Lucky you. I''m {grateful} you''re sitting next to me, honestly.', 'いいなあ。正直、隣に座ってくれて感謝してる。', 'grateful', (SELECT id FROM vocab_senses WHERE slug='grateful.adj.thankful'), ARRAY['grateful','anxious','jealous','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 8, 'npc', 'Happy to help. Deep breaths at takeoff.', '喜んで。離陸のときは深呼吸してね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 9, 'user', 'Okay. I''ll feel {relieved} once we''re in the air.', 'わかった。空に上がればほっとすると思う。', 'relieved', (SELECT id FROM vocab_senses WHERE slug='relieved.adj.eased'), ARRAY['relieved','nervous','jealous','anxious']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 10, 'npc', 'Exactly. Where are you headed?', 'そうそう。どこへ行くの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 11, 'user', 'To see my sister graduate. I''m so {proud} of her.', '妹の卒業式を見に。すごく誇りに思ってる。', 'proud', (SELECT id FROM vocab_senses WHERE slug='proud.adj.pleased'), ARRAY['proud','anxious','jealous','nervous']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 12, 'npc', 'That''s wonderful. Congratulations to her.', '素敵だね。おめでとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 13, 'user', 'Thank you. I feel calmer already.', 'ありがとう。もう落ち着いてきた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='travel'), 14, 'npc', 'See? You''ve got this.', 'ね？大丈夫だよ。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 0, 'npc', 'Ready for the client pitch?', 'クライアントへのプレゼン、準備できてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 1, 'user', 'Almost. I''m a bit {nervous}; it''s a huge account.', 'もう少し。少し緊張してる。大きな案件だから。', 'nervous', (SELECT id FROM vocab_senses WHERE slug='nervous.adj.tense'), ARRAY['nervous','proud','relieved','grateful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 2, 'npc', 'You''ve prepared well. What''s worrying you?', 'よく準備してるよ。何が気がかり？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 3, 'user', 'I''m so {frustrated}; the slides keep crashing.', 'すごくいらいらする。スライドが何度も落ちて。', 'frustrated', (SELECT id FROM vocab_senses WHERE slug='frustrated.adj.annoyed'), ARRAY['frustrated','proud','relieved','grateful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 4, 'npc', 'Let me fix the file for you.', 'ファイル直してあげる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 5, 'user', 'Thank you. I''m really {grateful} for the help.', 'ありがとう。本当に感謝する。', 'grateful', (SELECT id FROM vocab_senses WHERE slug='grateful.adj.thankful'), ARRAY['grateful','jealous','nervous','embarrassed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 6, 'npc', 'Done. It runs smoothly now.', 'できた。もうスムーズに動くよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 7, 'user', 'Oh, I''m so {relieved}! That was stressing me out.', 'ああ、ほっとした！すごくストレスだった。', 'relieved', (SELECT id FROM vocab_senses WHERE slug='relieved.adj.eased'), ARRAY['relieved','nervous','proud','jealous']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 8, 'npc', 'Now go show them your work.', 'さあ、成果を見せてきて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 9, 'user', 'I will. I''m actually {proud} of this campaign.', 'そうする。実はこのキャンペーン、誇りに思ってる。', 'proud', (SELECT id FROM vocab_senses WHERE slug='proud.adj.pleased'), ARRAY['proud','embarrassed','nervous','frustrated']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 10, 'npc', 'You should be. It''s excellent.', '当然だよ。素晴らしいから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 11, 'user', 'Last pitch I froze and felt so {embarrassed}.', '前回はプレゼンで固まって、すごく恥ずかしかった。', 'embarrassed', (SELECT id FROM vocab_senses WHERE slug='embarrassed.adj.ashamed'), ARRAY['embarrassed','relieved','grateful','proud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 12, 'npc', 'Not this time. You''re ready.', '今回は違う。もう大丈夫。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 13, 'user', 'Thanks for the boost.', '励ましてくれてありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-4') AND goal='business'), 14, 'npc', 'Anytime. Go get them, {{user_name}}!', 'いつでも。頑張って、{{user_name}}！', NULL, NULL, NULL);
