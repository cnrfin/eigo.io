-- ============================================================================
-- Vocab 103: vocab-103-13 - In conversation  (Unit 7)
-- Words: chime in, butt in, talk over, drown out, blurt out, ramble on, tune out, get through to.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('in-conversation-c1', 'In conversation', '会話の中で', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('chime in', 'chime in', '/ˌtʃaɪm ˈɪn/', '/ˌtʃaɪm ˈɪn/', NULL, 5, FALSE, NULL),
  ('butt in', 'butt in', '/ˌbʌt ˈɪn/', '/ˌbʌt ˈɪn/', NULL, 5, FALSE, NULL),
  ('talk over', 'talk over', '/ˌtɔːk ˈoʊvər/', '/ˌtɔːk ˈəʊvə/', NULL, 5, FALSE, NULL),
  ('drown out', 'drown out', '/ˌdraʊn ˈaʊt/', '/ˌdraʊn ˈaʊt/', NULL, 5, FALSE, NULL),
  ('blurt out', 'blurt out', '/ˌblɜːrt ˈaʊt/', '/ˌblɜːt ˈaʊt/', NULL, 5, FALSE, NULL),
  ('ramble on', 'ramble on', '/ˌræmbl ˈɑːn/', '/ˌræmbl ˈɒn/', NULL, 5, FALSE, NULL),
  ('tune out', 'tune out', '/ˌtuːn ˈaʊt/', '/ˌtjuːn ˈaʊt/', NULL, 5, FALSE, NULL),
  ('get through to', 'get through to', '/ˌɡet ˈθruː tuː/', '/ˌɡet ˈθruː tuː/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='chime in'), 'chime-in.phrv.join', 1, TRUE, 'phrasal verb', '口をはさむ（賛同的に）', 'to add your comment to a conversation', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='butt in'), 'butt-in.phrv.interrupt', 1, TRUE, 'phrasal verb', '（無礼に）割り込む', 'to interrupt rudely', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='talk over'), 'talk-over.phrv.interrupt2', 1, TRUE, 'phrasal verb', '話にかぶせる', 'to keep talking while another person is speaking', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='drown out'), 'drown-out.phrv.mask', 1, TRUE, 'phrasal verb', '（音を）かき消す', 'to be so loud that another sound cannot be heard', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='blurt out'), 'blurt-out.phrv.exclaim', 1, TRUE, 'phrasal verb', '思わず口走る', 'to say something suddenly without thinking', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ramble on'), 'ramble-on.phrv.digress', 1, TRUE, 'phrasal verb', 'だらだら話す', 'to talk for a long time in a boring way', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tune out'), 'tune-out.phrv.ignore', 1, TRUE, 'phrasal verb', '聞き流す', 'to stop paying attention', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='get through to'), 'get-through-to.phrv.reach', 1, TRUE, 'phrasal verb', '分からせる', 'to make someone understand you', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('chime in', 'butt in', 'talk over', 'drown out', 'blurt out', 'ramble on', 'tune out', 'get through to')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), (SELECT id FROM vocab_senses WHERE slug='butt-in.phrv.interrupt'), NULL, 'confusable', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='in-conversation-c1'
WHERE s.slug IN ('chime-in.phrv.join', 'butt-in.phrv.interrupt', 'talk-over.phrv.interrupt2', 'drown-out.phrv.mask', 'blurt-out.phrv.exclaim', 'ramble-on.phrv.digress', 'tune-out.phrv.ignore', 'get-through-to.phrv.reach')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-13', 7, 0, (SELECT id FROM vocab_categories WHERE slug='in-conversation-c1'), 'In conversation', '会話の中で', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-13'), s.id, x.ord FROM (VALUES
  ('chime-in.phrv.join',0),('butt-in.phrv.interrupt',1),('talk-over.phrv.interrupt2',2),('drown-out.phrv.mask',3),('blurt-out.phrv.exclaim',4),('ramble-on.phrv.digress',5),('tune-out.phrv.ignore',6),('get-through-to.phrv.reach',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-13'), 'conversation', 0, 'Chaotic group chats', 'にぎやかな会話', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-13'), 'travel', 1, 'A noisy market', 'にぎやかな市場', 'market', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-13'), 'business', 2, 'A messy meeting', 'まとまらない会議', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 0, 'npc', 'Our group chats get chaotic.', 'うちのグループ会話、カオスになるよね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 1, 'user', 'Yeah, people {talk over} each other constantly.', 'うん、みんな絶えずかぶせて話す。', 'talk over', (SELECT id FROM vocab_senses WHERE slug='talk-over.phrv.interrupt2'), ARRAY['talk over','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 2, 'npc', 'And some interrupt rudely.', '無礼に割り込む人もいる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 3, 'user', 'One guy loves to {butt in} mid-sentence.', '一人、話の途中で割り込むのが好きで。', 'butt in', (SELECT id FROM vocab_senses WHERE slug='butt-in.phrv.interrupt'), ARRAY['butt in','chime in','ramble on','tune out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 4, 'npc', 'Do you jump in much?', '君はよく入る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 5, 'user', 'Only to {chime in} with a quick agreement.', '短く同意で口をはさむくらい。', 'chime in', (SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), ARRAY['chime in','butt in','talk over','drown out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 6, 'npc', 'Anyone talk too long?', '長話する人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 7, 'user', 'My uncle can {ramble on} for an hour.', 'おじは1時間だらだら話せる。', 'ramble on', (SELECT id FROM vocab_senses WHERE slug='ramble-on.phrv.digress'), ARRAY['ramble on','chime in','tune out','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 8, 'npc', 'How do you cope?', 'どう耐える？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 9, 'user', 'Honestly, I {tune out} sometimes.', '正直、たまに聞き流す。', 'tune out', (SELECT id FROM vocab_senses WHERE slug='tune-out.phrv.ignore'), ARRAY['tune out','chime in','butt in','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 10, 'npc', 'Ever say the wrong thing?', '失言したことある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 11, 'user', 'Ha, I once {blurt out} a secret by accident.', 'はは、一度うっかり秘密を口走った。', 'blurt out', (SELECT id FROM vocab_senses WHERE slug='blurt-out.phrv.exclaim'), ARRAY['blurt out','chime in','tune out','ramble on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 12, 'npc', 'Classic!', 'あるある！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 13, 'user', 'Never again!', 'もう二度と！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='conversation'), 14, 'npc', 'We''ve all done it, {{user_name}}.', 'みんなやるよ、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 0, 'npc', 'This market is so noisy!', 'この市場、すごくうるさい！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 1, 'user', 'The music totally {drown out} our voices.', '音楽が私たちの声を完全にかき消してる。', 'drown out', (SELECT id FROM vocab_senses WHERE slug='drown-out.phrv.mask'), ARRAY['drown out','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 2, 'npc', 'I can barely hear the vendor.', '店主の声がほとんど聞こえない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 3, 'user', 'It''s hard to {get through to} him over the noise.', 'この騒音じゃ、彼に通じさせるのが難しい。', 'get through to', (SELECT id FROM vocab_senses WHERE slug='get-through-to.phrv.reach'), ARRAY['get through to','chime in','blurt out','talk over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 4, 'npc', 'Try hand gestures.', '身ぶりで試して。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 5, 'user', 'I just {blurt out} the price in bad local language!', '下手な現地語で値段を口走った！', 'blurt out', (SELECT id FROM vocab_senses WHERE slug='blurt-out.phrv.exclaim'), ARRAY['blurt out','chime in','tune out','talk over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 6, 'npc', 'Ha, brave.', 'はは、勇気ある。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 7, 'user', 'A kind stranger did {chime in} to translate.', '親切な人が通訳しに口をはさんでくれた。', 'chime in', (SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), ARRAY['chime in','butt in','drown out','tune out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 8, 'npc', 'Lucky! People here are chatty.', 'ラッキー！ここの人はおしゃべり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 9, 'user', 'Yeah, three of them {talk over} each other helping us.', 'うん、3人がかぶせ合いながら助けてくれた。', 'talk over', (SELECT id FROM vocab_senses WHERE slug='talk-over.phrv.interrupt2'), ARRAY['talk over','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 10, 'npc', 'One kept interrupting, though.', 'でも一人ずっと割り込んでた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 11, 'user', 'Right, he''d {butt in} every time I spoke.', 'そう、話すたびに割り込んできた。', 'butt in', (SELECT id FROM vocab_senses WHERE slug='butt-in.phrv.interrupt'), ARRAY['butt in','chime in','drown out','tune out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 12, 'npc', 'Still, we got the scarf!', 'それでもスカーフ買えた！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 13, 'user', 'Success!', '成功！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='travel'), 14, 'npc', 'Great haggling!', '値切り上手！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 0, 'npc', 'That meeting was hard to follow.', 'あの会議、話が追いにくかった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 1, 'user', 'Two people kept trying to {talk over} each other.', '2人がかぶせ合おうとしてた。', 'talk over', (SELECT id FROM vocab_senses WHERE slug='talk-over.phrv.interrupt2'), ARRAY['talk over','chime in','tune out','get through to']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 2, 'npc', 'Hard to make a point.', '主張しづらいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 3, 'user', 'I struggled to {get through to} the group.', 'グループに分からせるのに苦労した。', 'get through to', (SELECT id FROM vocab_senses WHERE slug='get-through-to.phrv.reach'), ARRAY['get through to','chime in','blurt out','talk over']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 4, 'npc', 'The manager rambled.', 'マネージャーが長々話してた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 5, 'user', 'Yeah, he did {ramble on} about old projects.', 'うん、昔のプロジェクトをだらだら話してた。', 'ramble on', (SELECT id FROM vocab_senses WHERE slug='ramble-on.phrv.digress'), ARRAY['ramble on','chime in','tune out','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 6, 'npc', 'I zoned out.', '私は上の空だった。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 7, 'user', 'Same, I started to {tune out} halfway.', '同じ、途中から聞き流し始めた。', 'tune out', (SELECT id FROM vocab_senses WHERE slug='tune-out.phrv.ignore'), ARRAY['tune out','chime in','butt in','blurt out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 8, 'npc', 'Did you add anything?', '何か発言した？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 9, 'user', 'I only {chime in} at the end with the numbers.', '最後に数字だけ口をはさんだ。', 'chime in', (SELECT id FROM vocab_senses WHERE slug='chime-in.phrv.join'), ARRAY['chime in','butt in','talk over','drown out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 10, 'npc', 'And that intern kept interrupting.', 'それにあのインターンが割り込み続けた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 11, 'user', 'Yes, she''d {butt in} constantly.', 'そう、絶えず割り込んでた。', 'butt in', (SELECT id FROM vocab_senses WHERE slug='butt-in.phrv.interrupt'), ARRAY['butt in','chime in','drown out','tune out']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 12, 'npc', 'Next time, an agenda.', '次回は議題を用意しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 13, 'user', 'Agreed.', '賛成。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-13') AND goal='business'), 14, 'npc', 'Good idea, {{user_name}}.', 'いい考え、{{user_name}}。', NULL, NULL, NULL);
