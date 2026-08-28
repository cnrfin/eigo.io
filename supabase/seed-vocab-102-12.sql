-- ============================================================================
-- Vocab 102: vocab-102-12 - Skills & knowledge  (Unit 4)
-- Words: skill, ability, talent, knowledge, experience, qualification, expert, beginner.
-- American spelling, no em-dashes. 15-line scenes. Published.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('skills-knowledge', 'Skills & knowledge', '能力と知識', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('skill', 'skill', '/skɪl/', '/skɪl/', NULL, 3, FALSE, NULL),
  ('ability', 'ability', '/əˈbɪləti/', '/əˈbɪləti/', NULL, 3, FALSE, NULL),
  ('talent', 'talent', '/ˈtælənt/', '/ˈtælənt/', NULL, 3, FALSE, NULL),
  ('knowledge', 'knowledge', '/ˈnɑːlɪdʒ/', '/ˈnɒlɪdʒ/', NULL, 3, TRUE, 'k は発音しない。/ˈnɑːlɪdʒ/。'),
  ('experience', 'experience', '/ɪkˈspɪriəns/', '/ɪkˈspɪəriəns/', NULL, 3, FALSE, NULL),
  ('qualification', 'qualification', '/ˌkwɑːlɪfɪˈkeɪʃn/', '/ˌkwɒlɪfɪˈkeɪʃn/', NULL, 4, FALSE, NULL),
  ('expert', 'expert', '/ˈekspɜːrt/', '/ˈekspɜːt/', NULL, 3, FALSE, NULL),
  ('beginner', 'beginner', '/bɪˈɡɪnər/', '/bɪˈɡɪnə/', NULL, 3, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='skill'), 'skill.n.ability', 1, TRUE, 'noun', '技能', 'an ability to do something well, learned with practice', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ability'), 'ability.n.capacity', 1, TRUE, 'noun', '能力', 'the power or knowledge to do something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='talent'), 'talent.n.gift', 1, TRUE, 'noun', '才能', 'a natural ability to do something well', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='knowledge'), 'knowledge.n.info', 1, TRUE, 'noun', '知識', 'the information and understanding you have', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='experience'), 'experience.n.practice', 1, TRUE, 'noun', '経験', 'skill or knowledge gained from doing something', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='qualification'), 'qualification.n.credential', 1, TRUE, 'noun', '資格', 'an official record of passing an exam or course', 'B2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='expert'), 'expert.n.specialist', 1, TRUE, 'noun', '専門家', 'a person with great skill or knowledge', 'B1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='beginner'), 'beginner.n.novice', 1, TRUE, 'noun', '初心者', 'a person who is just starting to learn something', 'B1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('skill', 'ability', 'talent', 'knowledge', 'experience', 'qualification', 'expert', 'beginner')));
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), (SELECT id FROM vocab_senses WHERE slug='beginner.n.novice'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='beginner.n.novice'), (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='talent.n.gift'), NULL, 'gift', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='skills-knowledge'
WHERE s.slug IN ('skill.n.ability', 'ability.n.capacity', 'talent.n.gift', 'knowledge.n.info', 'experience.n.practice', 'qualification.n.credential', 'expert.n.specialist', 'beginner.n.novice')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-102-12', 4, 2, (SELECT id FROM vocab_categories WHERE slug='skills-knowledge'), 'Skills & knowledge', '能力と知識', TRUE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-102-12'), s.id, x.ord FROM (VALUES
  ('skill.n.ability',0),('ability.n.capacity',1),('talent.n.gift',2),('knowledge.n.info',3),('experience.n.practice',4),('qualification.n.credential',5),('expert.n.specialist',6),('beginner.n.novice',7)
) AS x(slug, ord) JOIN vocab_senses s ON s.slug = x.slug ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-12'), 'conversation', 0, 'Learning a hobby', '趣味を始める', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-12'), 'travel', 1, 'A cooking workshop', '料理教室', 'kitchen', 'chef'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-102-12'), 'business', 2, 'Assessing a candidate', '候補者の評価', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 0, 'npc', 'You started painting? How''s it going?', '絵を始めたの？どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 1, 'user', 'I''m a total {beginner}, but it''s fun.', '完全な初心者だけど、楽しい。', 'beginner', (SELECT id FROM vocab_senses WHERE slug='beginner.n.novice'), ARRAY['beginner','expert','talent','skill']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 2, 'npc', 'Everyone starts somewhere.', '誰でも最初はそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 3, 'user', 'True. It''s a {skill} I''ve always wanted.', '確かに。ずっと欲しかったスキルなんだ。', 'skill', (SELECT id FROM vocab_senses WHERE slug='skill.n.ability'), ARRAY['skill','expert','beginner','experience']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 4, 'npc', 'Do you have a natural eye for it?', '生まれつきセンスある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 5, 'user', 'Not much {talent}, honestly, but I practice.', '正直あまり才能はないけど、練習してる。', 'talent', (SELECT id FROM vocab_senses WHERE slug='talent.n.gift'), ARRAY['talent','beginner','expert','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 6, 'npc', 'Practice beats talent anyway.', '結局、練習が才能に勝るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 7, 'user', 'I hope so. My {ability} is slowly improving.', 'そうだといいな。能力は少しずつ上がってる。', 'ability', (SELECT id FROM vocab_senses WHERE slug='ability.n.capacity'), ARRAY['ability','beginner','expert','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 8, 'npc', 'Are you taking classes?', '教室に通ってる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 9, 'user', 'Yeah, my teacher is a real {expert}.', 'うん、先生は本物の専門家。', 'expert', (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), ARRAY['expert','beginner','talent','skill']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 10, 'npc', 'Lucky you. Learn a lot?', 'いいね。たくさん学んでる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 11, 'user', 'Loads. She has years of {experience}.', 'すごく。長年の経験がある人。', 'experience', (SELECT id FROM vocab_senses WHERE slug='experience.n.practice'), ARRAY['experience','beginner','talent','ability']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 12, 'npc', 'Keep at it!', '続けてね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 13, 'user', 'I will.', 'うん。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='conversation'), 14, 'npc', 'Show me a painting soon, {{user_name}}.', '今度絵を見せてね、{{user_name}}。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 0, 'npc', 'Welcome to the cooking class! Cooked before?', '料理教室へようこそ！料理の経験は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 1, 'user', 'A bit, but I''m mostly a {beginner}.', '少しだけ、でもほぼ初心者です。', 'beginner', (SELECT id FROM vocab_senses WHERE slug='beginner.n.novice'), ARRAY['beginner','expert','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 2, 'npc', 'No problem. We start simple.', '大丈夫。簡単なものから。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 3, 'user', 'I''d love to learn the {skill} of fresh pasta.', '生パスタのスキルを学びたいです。', 'skill', (SELECT id FROM vocab_senses WHERE slug='skill.n.ability'), ARRAY['skill','expert','beginner','knowledge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 4, 'npc', 'It''s easier than it looks.', '見た目より簡単だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 5, 'user', 'My {knowledge} of Italian food is small.', 'イタリア料理の知識は少ないんです。', 'knowledge', (SELECT id FROM vocab_senses WHERE slug='knowledge.n.info'), ARRAY['knowledge','beginner','expert','talent']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 6, 'npc', 'You''ll learn fast here.', 'ここですぐ学べるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 7, 'user', 'Are you a trained {expert}?', '訓練を受けた専門家ですか？', 'expert', (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), ARRAY['expert','beginner','talent','skill']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 8, 'npc', 'Thirty years in the kitchen.', '厨房で30年。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 9, 'user', 'Wow, so much {experience}!', 'わあ、経験が豊富ですね！', 'experience', (SELECT id FROM vocab_senses WHERE slug='experience.n.practice'), ARRAY['experience','beginner','talent','knowledge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 10, 'npc', 'It all adds up over time.', '時間をかけて積み重なるんだ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 11, 'user', 'You clearly have real {talent} too.', '本物の才能もありますね。', 'talent', (SELECT id FROM vocab_senses WHERE slug='talent.n.gift'), ARRAY['talent','beginner','expert','knowledge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 12, 'npc', 'You''re kind. Let''s cook!', '優しいね。さあ作ろう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 13, 'user', 'I''m excited!', 'わくわくします！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='travel'), 14, 'npc', 'Aprons on, everyone!', 'みんなエプロンを！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 0, 'npc', 'What did you think of the applicant?', 'あの応募者どう思った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 1, 'user', 'Strong. She has the right {qualification} for the role.', '優秀。この役職に合う資格を持ってる。', 'qualification', (SELECT id FROM vocab_senses WHERE slug='qualification.n.credential'), ARRAY['qualification','beginner','talent','expert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 2, 'npc', 'Any hands-on background?', '実務経験は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 3, 'user', 'Yes, five years of {experience} in sales.', 'うん、営業で5年の経験。', 'experience', (SELECT id FROM vocab_senses WHERE slug='experience.n.practice'), ARRAY['experience','beginner','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 4, 'npc', 'Good. Technical side?', 'いいね。技術面は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 5, 'user', 'Solid {knowledge} of our software.', 'うちのソフトの知識もしっかりある。', 'knowledge', (SELECT id FROM vocab_senses WHERE slug='knowledge.n.info'), ARRAY['knowledge','beginner','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 6, 'npc', 'Can she lead a team?', 'チームを率いられる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 7, 'user', 'I think she has the {ability} to manage people.', '人をまとめる能力があると思う。', 'ability', (SELECT id FROM vocab_senses WHERE slug='ability.n.capacity'), ARRAY['ability','beginner','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 8, 'npc', 'What''s her strongest area?', '一番の強みは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 9, 'user', 'Communication is her best {skill}.', 'コミュニケーションが一番のスキル。', 'skill', (SELECT id FROM vocab_senses WHERE slug='skill.n.ability'), ARRAY['skill','beginner','qualification','expert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 10, 'npc', 'We need that badly.', 'それがまさに必要だ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 11, 'user', 'And she''s an {expert} in data analysis.', 'それにデータ分析の専門家でもある。', 'expert', (SELECT id FROM vocab_senses WHERE slug='expert.n.specialist'), ARRAY['expert','beginner','talent','qualification']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 12, 'npc', 'Sounds like a great hire.', 'いい採用になりそう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 13, 'user', 'Let''s make an offer.', 'オファーを出そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-102-12') AND goal='business'), 14, 'npc', 'Agreed, {{user_name}}.', '賛成、{{user_name}}。', NULL, NULL, NULL);
