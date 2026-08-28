-- ============================================================================
-- Vocab 101 — Lesson 5 (new): "Finding your way" (directions)
-- ----------------------------------------------------------------------------
-- Words: where, turn, straight, near, station, street, left, right.
-- left/right are a coordinate pair (can't be cloze'd from text) so they're
-- taught embedded (played in the NPC's directions); the other six are blanked.
-- American spelling, no em-dashes, authored distractors. Options are stored
-- answer-first; the player shuffles them per line.
--
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

-- ── Theme ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('directions', 'Finding your way', '道案内', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('where',    'where',    '/wɛr/',       '/weə/',       60, 1, FALSE, NULL),
  ('turn',     'turn',     '/tɜːrn/',     '/tɜːn/',     200, 1, FALSE, NULL),
  ('straight', 'straight', '/streɪt/',    '/streɪt/',   500, 1, FALSE, 'ストレート。/streɪt/。「まっすぐ」。'),
  ('near',     'near',     '/nɪr/',       '/nɪə/',      250, 1, FALSE, NULL),
  ('station',  'station',  '/ˈsteɪʃən/',  '/ˈsteɪʃən/', 400, 1, FALSE, 'ステーション。/ˈsteɪʃən/。'),
  ('street',   'street',   '/striːt/',    '/striːt/',   300, 1, FALSE, 'ストリート。/striːt/。'),
  ('left',     'left',     '/lɛft/',      '/lɛft/',     220, 1, FALSE, NULL),
  ('right',    'right',    '/raɪt/',      '/raɪt/',      90, 1, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='where'),    'where.adv.place',    1, TRUE, 'adverb',    'どこ',         'in or to what place', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='turn'),     'turn.v.direction',   1, TRUE, 'verb',      '曲がる',       'to change the direction you are moving in', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='straight'), 'straight.adv.direct',1, TRUE, 'adverb',    'まっすぐ',     'in a straight line, without turning', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='near'),     'near.adj.close',     1, TRUE, 'adjective', '近い', 'a short distance away', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='station'),  'station.n.transit',  1, TRUE, 'noun',      '駅',           'a place where trains or buses stop', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='street'),   'street.n.road',      1, TRUE, 'noun',      '通り',     'a road in a town, with buildings along it', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='left'),     'left.adv.direction', 1, TRUE, 'adverb',    '左',           'on or to the left side', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='right'),    'right.adv.direction',1, TRUE, 'adverb',    '右（方向）',   'on or to the right side', 'A1', '「正しい」の意味もあるが、ここは「右」。')
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent) ─────────────────────────
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('where','turn','straight','near','station','street','left','right')));

-- ── Relations ───────────────────────────────────────────────────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='left.adv.direction'),  (SELECT id FROM vocab_senses WHERE slug='right.adv.direction'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='right.adv.direction'), (SELECT id FROM vocab_senses WHERE slug='left.adv.direction'),  NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='near.adj.close'),      NULL, 'far',   'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='near.adj.close'),      NULL, 'close', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='station.n.transit'),   NULL, 'stop',  'near_synonym', NULL);

-- ── Category membership ─────────────────────────────────────────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='directions'
WHERE s.slug IN ('where.adv.place','turn.v.direction','straight.adv.direct','near.adj.close','station.n.transit','street.n.road','left.adv.direction','right.adv.direction')
ON CONFLICT DO NOTHING;

-- ── Lesson + items ──────────────────────────────────────────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-5', 1, 5, (SELECT id FROM vocab_categories WHERE slug='directions'), 'Finding your way', '道案内', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-5'), s.id, x.ord
FROM (VALUES
  ('where.adv.place',0),('turn.v.direction',1),('straight.adv.direct',2),('near.adj.close',3),
  ('station.n.transit',4),('street.n.road',5),('left.adv.direction',6),('right.adv.direction',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

-- ── Scenes ──────────────────────────────────────────────────────────────────
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-5'), 'travel',       0, 'Asking for directions',    '道をたずねる',       'street',  'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-5'), 'conversation', 1, 'Finding a friend''s café', '友達のカフェを探す', 'street',  'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-5'), 'business',     2, 'Finding the meeting room', '会議室を探す',       'office',  'receptionist');

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 0, 'user', 'Excuse me, could you help me?', 'すみません、助けてもらえますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 1, 'user', '{Where} is the station?', '駅はどこですか？', 'Where', (SELECT id FROM vocab_senses WHERE slug='where.adv.place'), ARRAY['How','Why','When','Where']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 2, 'npc', 'The station? Go {straight} down this road.', '駅ですか？この道をまっすぐ行ってください。', 'straight', (SELECT id FROM vocab_senses WHERE slug='straight.adv.direct'), ARRAY['straight','up','back','inside']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 3, 'user', 'Straight, okay.', 'まっすぐ、はい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 4, 'npc', 'Then {turn} left at the traffic lights.', 'そして信号を左に曲がって。', 'turn', (SELECT id FROM vocab_senses WHERE slug='turn.v.direction'), ARRAY['wait','turn','stop','park']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 5, 'user', 'Turn left. Got it.', '左に曲がる、了解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 6, 'npc', 'It''s on Green {Street}, next to the park.', '公園の隣、グリーン通りにあります。', 'Street', (SELECT id FROM vocab_senses WHERE slug='street.n.road'), ARRAY['Floor','Corner','Station','Street']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 7, 'user', 'Oh, is it {near}? Can I walk?', 'あ、近いですか？歩けますか？', 'near', (SELECT id FROM vocab_senses WHERE slug='near.adj.close'), ARRAY['busy','closed','far','near']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 8, 'npc', 'Yes, five minutes. It''s on your right.', 'はい、5分ほど。右手にありますよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 9, 'user', 'So the train {station} is past the park?', 'じゃあ駅は公園の先？', 'station', (SELECT id FROM vocab_senses WHERE slug='station.n.transit'), ARRAY['hotel','shop','station','school']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 10, 'npc', 'Exactly. You can''t miss it!', 'その通り。すぐ分かりますよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='travel'), 11, 'user', 'Thank you so much!', '本当にありがとう！', NULL, NULL, NULL);

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 0, 'npc', 'Hey! Are you close?', 'やあ！もうすぐ着く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 1, 'user', 'Almost! {Where} exactly is the café?', 'もうすぐ！カフェは正確にどこ？', 'Where', (SELECT id FROM vocab_senses WHERE slug='where.adv.place'), ARRAY['When','Where','Who','Why']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 2, 'npc', 'Go {straight} past the station, then it''s easy.', '駅をまっすぐ通り過ぎて、そこからは簡単。', 'straight', (SELECT id FROM vocab_senses WHERE slug='straight.adv.direct'), ARRAY['home','back','upstairs','straight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 3, 'user', 'Okay, past the station.', 'オーケー、駅を通り過ぎて。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 4, 'npc', '{Turn} right at the bookshop.', '本屋を右に曲がって。', 'Turn', (SELECT id FROM vocab_senses WHERE slug='turn.v.direction'), ARRAY['Run','Sit','Turn','Look']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 5, 'user', 'Right at the bookshop.', '本屋で右ね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 6, 'npc', 'We''re on Baker {Street}, number 12.', 'ベーカー通りの12番地だよ。', 'Street', (SELECT id FROM vocab_senses WHERE slug='street.n.road'), ARRAY['Table','Street','Station','Floor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 7, 'user', 'Great, sounds {near}. Two minutes?', 'いいね、近そう。2分くらい？', 'near', (SELECT id FROM vocab_senses WHERE slug='near.adj.close'), ARRAY['loud','cold','far','near']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 8, 'npc', 'Yeah! It''s the blue door on your left.', 'うん！左の青いドアだよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='conversation'), 9, 'user', 'See you soon!', 'じゃあすぐ行くね！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 0, 'user', 'Hi, {where} is meeting room B?', 'こんにちは、会議室Bはどこですか？', 'where', (SELECT id FROM vocab_senses WHERE slug='where.adv.place'), ARRAY['who','how','where','when']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 1, 'npc', 'Go {straight} down this hallway.', 'この廊下をまっすぐ進んでください。', 'straight', (SELECT id FROM vocab_senses WHERE slug='straight.adv.direct'), ARRAY['straight','outside','downstairs','back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 2, 'user', 'Straight down, okay.', 'まっすぐ、はい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 3, 'npc', '{Turn} left at the water cooler.', '給水器のところで左に曲がって。', 'Turn', (SELECT id FROM vocab_senses WHERE slug='turn.v.direction'), ARRAY['Sit','Call','Wait','Turn']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 4, 'user', 'Left at the water cooler.', '給水器で左。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 5, 'npc', 'It''s the second door on your right.', '右手の2番目のドアです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 6, 'user', 'Is it {near}, just around the corner, or do I need the elevator?', '近い？すぐそこの角？それともエレベーター？', 'near', (SELECT id FROM vocab_senses WHERE slug='near.adj.close'), ARRAY['upstairs','far','near','outside']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 7, 'npc', 'Very near, just around the corner.', 'すぐ近くです、その角を曲がったところ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-5') AND goal='business'), 8, 'user', 'Great, thank you!', 'ありがとうございます！', NULL, NULL, NULL);
