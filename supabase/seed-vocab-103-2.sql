-- ============================================================================
-- Vocab 103: vocab-103-2 - Describing character  (Unit 1)
-- Words: come across, stand out, down-to-earth, easygoing, level-headed, strong-willed, self-conscious, laid-back.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('describing-character-c1', 'Describing character', '人柄を表す', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('come across', 'come across', '/ˌkʌm əˈkrɔːs/', '/ˌkʌm əˈkrɒs/', NULL, 5, FALSE, NULL),
  ('stand out', 'stand out', '/ˌstænd ˈaʊt/', '/ˌstænd ˈaʊt/', NULL, 5, FALSE, NULL),
  ('down-to-earth', 'down-to-earth', '/ˌdaʊn tu ˈɜːrθ/', '/ˌdaʊn tu ˈɜːθ/', NULL, 5, FALSE, NULL),
  ('easygoing', 'easygoing', '/ˌiːziˈɡoʊɪŋ/', '/ˌiːziˈɡəʊɪŋ/', NULL, 5, FALSE, NULL),
  ('level-headed', 'level-headed', '/ˌlevl ˈhedɪd/', '/ˌlevl ˈhedɪd/', NULL, 5, FALSE, NULL),
  ('strong-willed', 'strong-willed', '/ˌstrɔːŋ ˈwɪld/', '/ˌstrɒŋ ˈwɪld/', NULL, 5, FALSE, NULL),
  ('self-conscious', 'self-conscious', '/ˌself ˈkɑːnʃəs/', '/ˌself ˈkɒnʃəs/', NULL, 5, FALSE, NULL),
  ('laid-back', 'laid-back', '/ˌleɪd ˈbæk/', '/ˌleɪd ˈbæk/', NULL, 5, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='come across'), 'come-across.phrv.seem', 1, TRUE, 'phrasal verb', '（…という）印象を与える', 'to seem or appear a certain way to others', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stand out'), 'stand-out.phrv.notable', 1, TRUE, 'phrasal verb', '目立つ', 'to be noticeably better or different', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='down-to-earth'), 'down-to-earth.adj.practical', 1, TRUE, 'idiom', '現実的で気取らない', 'practical and honest; not proud', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='easygoing'), 'easygoing.adj.relaxed', 1, TRUE, 'adjective', 'おおらかな', 'relaxed and tolerant; not easily upset', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='level-headed'), 'level-headed.adj.calm', 1, TRUE, 'adjective', '冷静で分別のある', 'calm and sensible, even under pressure', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='strong-willed'), 'strong-willed.adj.determined', 1, TRUE, 'adjective', '意志が強い', 'determined; not easily persuaded', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='self-conscious'), 'self-conscious.adj.shy', 1, TRUE, 'adjective', '人目を気にする', 'worried about what others think of you', 'C1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='laid-back'), 'laid-back.adj.relaxed2', 1, TRUE, 'adjective', 'のんびりした', 'calm and not easily worried or stressed', 'C1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('come across', 'stand out', 'down-to-earth', 'easygoing', 'level-headed', 'strong-willed', 'self-conscious', 'laid-back')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='describing-character-c1'
WHERE s.slug IN ('come-across.phrv.seem', 'stand-out.phrv.notable', 'down-to-earth.adj.practical', 'easygoing.adj.relaxed', 'level-headed.adj.calm', 'strong-willed.adj.determined', 'self-conscious.adj.shy', 'laid-back.adj.relaxed2')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-103-2', 1, 1, (SELECT id FROM vocab_categories WHERE slug='describing-character-c1'), 'Describing character', '人柄を描写する', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-103-2'), s.id, x.ord FROM (VALUES
  ('come-across.phrv.seem',0),('stand-out.phrv.notable',1),('down-to-earth.adj.practical',2),('easygoing.adj.relaxed',3),('level-headed.adj.calm',4),('strong-willed.adj.determined',5),('self-conscious.adj.shy',6),('laid-back.adj.relaxed2',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-2'), 'conversation', 0, 'How the date went', 'デートの感想', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-2'), 'travel', 1, 'Travel companions', '旅の仲間', 'hostel', 'traveler'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-103-2'), 'business', 2, 'Assessing a candidate', '候補者の評価', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 0, 'npc', 'How was your date with Leo?', 'レオとのデートどうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 1, 'user', 'Good! He can {come across} as really genuine.', 'よかった！すごく誠実な印象を与える人。', 'come across', (SELECT id FROM vocab_senses WHERE slug='come-across.phrv.seem'), ARRAY['come across','stand out','take to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 2, 'npc', 'Nice. Confident guy?', 'いいね。自信ある感じ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 3, 'user', 'A bit {self-conscious}, actually; he kept fixing his hair.', '実はちょっと人目を気にしてた、ずっと髪を直してて。', 'self-conscious', (SELECT id FROM vocab_senses WHERE slug='self-conscious.adj.shy'), ARRAY['self-conscious','easygoing','down-to-earth','laid-back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 4, 'npc', 'Aw. Was he pretentious?', 'そう。気取ってた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 5, 'user', 'No, very {down-to-earth}; no showing off.', 'ううん、すごく気取らない、見栄も張らない。', 'down-to-earth', (SELECT id FROM vocab_senses WHERE slug='down-to-earth.adj.practical'), ARRAY['down-to-earth','strong-willed','self-conscious','level-headed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 6, 'npc', 'Does he know what he wants?', '彼、自分の意志ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 7, 'user', 'Definitely {strong-willed}; he''s very determined.', '間違いなく意志が強い、すごく芯がある。', 'strong-willed', (SELECT id FROM vocab_senses WHERE slug='strong-willed.adj.determined'), ARRAY['strong-willed','easygoing','self-conscious','laid-back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 8, 'npc', 'Did he seem special?', '特別な感じだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 9, 'user', 'Yeah, he really did {stand out} from other dates.', 'うん、他のデート相手より際立ってた。', 'stand out', (SELECT id FROM vocab_senses WHERE slug='stand-out.phrv.notable'), ARRAY['stand out','come across','take to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 10, 'npc', 'Easy to talk to?', '話しやすかった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 11, 'user', 'So {easygoing}; nothing bothered him.', 'すごくおおらか、何も気にしない。', 'easygoing', (SELECT id FROM vocab_senses WHERE slug='easygoing.adj.relaxed'), ARRAY['easygoing','strong-willed','self-conscious','down-to-earth']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 12, 'npc', 'Second date, then?', 'じゃあ2回目は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 13, 'user', 'For sure!', 'もちろん！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='conversation'), 14, 'npc', 'Yay! Tell me after, {{user_name}}.', 'やった！また教えて、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 0, 'npc', 'How''s your travel group?', '旅のグループはどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 1, 'user', 'Really {laid-back}; no one stresses about plans.', 'すごくのんびり、誰も予定でピリピリしない。', 'laid-back', (SELECT id FROM vocab_senses WHERE slug='laid-back.adj.relaxed2'), ARRAY['laid-back','strong-willed','self-conscious','down-to-earth']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 2, 'npc', 'Nice. Anyone take charge?', 'いいね。仕切る人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 3, 'user', 'One guy is super {level-headed}; he stays calm in any crisis.', '一人すごく冷静で、どんな時も落ち着いてる。', 'level-headed', (SELECT id FROM vocab_senses WHERE slug='level-headed.adj.calm'), ARRAY['level-headed','self-conscious','strong-willed','easygoing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 4, 'npc', 'Handy on the road.', '旅では助かるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 5, 'user', 'And the others are {easygoing}; happy with anything.', '他のみんなはおおらかで、何でもOK。', 'easygoing', (SELECT id FROM vocab_senses WHERE slug='easygoing.adj.relaxed'), ARRAY['easygoing','strong-willed','self-conscious','level-headed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 6, 'npc', 'Anyone shy?', '恥ずかしがりな人は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 7, 'user', 'One girl is a bit {self-conscious} in photos.', '一人、写真だと少し人目を気にする。', 'self-conscious', (SELECT id FROM vocab_senses WHERE slug='self-conscious.adj.shy'), ARRAY['self-conscious','laid-back','level-headed','strong-willed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 8, 'npc', 'How do you seem to them?', '君はどう見られてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 9, 'user', 'I hope I {come across} as friendly.', 'フレンドリーな印象だといいな。', 'come across', (SELECT id FROM vocab_senses WHERE slug='come-across.phrv.seem'), ARRAY['come across','stand out','warm to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 10, 'npc', 'You do! You''re memorable.', 'そうだよ！印象に残る。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 11, 'user', 'Thanks. I try to {stand out} in a good way.', 'ありがとう。いい意味で目立ちたい。', 'stand out', (SELECT id FROM vocab_senses WHERE slug='stand-out.phrv.notable'), ARRAY['stand out','come across','take to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 12, 'npc', 'You definitely do.', '間違いなくそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 13, 'user', 'Aw, thanks!', 'うれしい、ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='travel'), 14, 'npc', 'Let''s plan tomorrow!', '明日の計画立てよう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 0, 'npc', 'What did you think of the candidate?', 'あの候補者どう思った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 1, 'user', 'She can {come across} as very professional.', 'とてもプロフェッショナルな印象を与える。', 'come across', (SELECT id FROM vocab_senses WHERE slug='come-across.phrv.seem'), ARRAY['come across','stand out','warm to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 2, 'npc', 'Calm under pressure?', 'プレッシャーに強い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 3, 'user', 'Very {level-headed}; she stayed calm in the tough questions.', 'とても冷静、難しい質問でも落ち着いてた。', 'level-headed', (SELECT id FROM vocab_senses WHERE slug='level-headed.adj.calm'), ARRAY['level-headed','self-conscious','laid-back','easygoing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 4, 'npc', 'Does she push back?', '意見を主張する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 5, 'user', 'Yes, {strong-willed}; she defends her ideas well.', 'うん、意志が強い、自分の考えをしっかり守る。', 'strong-willed', (SELECT id FROM vocab_senses WHERE slug='strong-willed.adj.determined'), ARRAY['strong-willed','self-conscious','laid-back','easygoing']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 6, 'npc', 'Did she impress?', '印象に残った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 7, 'user', 'She really did {stand out} among the applicants.', '応募者の中で際立ってた。', 'stand out', (SELECT id FROM vocab_senses WHERE slug='stand-out.phrv.notable'), ARRAY['stand out','come across','warm to','grow on']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 8, 'npc', 'Approachable?', '話しかけやすい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 9, 'user', 'Yes, very {down-to-earth}; no arrogance at all.', 'うん、すごく気取らない、傲慢さゼロ。', 'down-to-earth', (SELECT id FROM vocab_senses WHERE slug='down-to-earth.adj.practical'), ARRAY['down-to-earth','self-conscious','strong-willed','level-headed']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 10, 'npc', 'Would she fit our relaxed culture?', 'うちのゆるい社風に合う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 11, 'user', 'I think so; she seemed fairly {laid-back} too.', '合うと思う、結構のんびりもしてた。', 'laid-back', (SELECT id FROM vocab_senses WHERE slug='laid-back.adj.relaxed2'), ARRAY['laid-back','strong-willed','self-conscious','down-to-earth']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 12, 'npc', 'Let''s make an offer.', 'オファーを出そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 13, 'user', 'Agreed.', '賛成。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-103-2') AND goal='business'), 14, 'npc', 'Great call, {{user_name}}.', 'いい判断、{{user_name}}。', NULL, NULL, NULL);
