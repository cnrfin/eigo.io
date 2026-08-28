-- ============================================================================
-- Vocab 101 — pilot seed: Lesson 1 "Everyday essentials" (8 words)
-- ----------------------------------------------------------------------------
-- Fully populates one lesson across every content table so we can validate the
-- schema + judge content quality before building UI. NGSL ranks here are
-- ILLUSTRATIVE placeholders; real ranks come from the NGSL dataset.
--
-- Re-runnable: base rows use ON CONFLICT; example/collocation/relation rows are
-- cleared for the pilot senses first (they have no natural unique key).
-- Run AFTER add-vocab-101.sql.
-- ============================================================================

-- ── Categories ──────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('everyday-essentials', 'Everyday essentials', '毎日使う言葉', 'theme'),
  ('states-adjectives',   'States & feelings',   '状態・気持ち', 'semantic_field')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('want',   'want',   '/wɑːnt/',     '/wɒnt/',       150, 1, FALSE, NULL),
  ('need',   'need',   '/niːd/',      '/niːd/',       120, 1, FALSE, NULL),
  ('try',    'try',    '/traɪ/',      '/traɪ/',       250, 1, FALSE, NULL),
  ('keep',   'keep',   '/kiːp/',      '/kiːp/',       180, 1, FALSE, NULL),
  ('enough', 'enough', '/ɪˈnʌf/',     '/ɪˈnʌf/',      300, 1, FALSE, NULL),
  ('busy',   'busy',   '/ˈbɪzi/',     '/ˈbɪzi/',      500, 1, FALSE, NULL),
  ('ready',  'ready',  '/ˈrɛdi/',     '/ˈrɛdi/',      400, 1, FALSE, 'カタカナの「レディー」でおなじみ。「準備ができた」の意味。'),
  ('almost', 'almost', '/ˈɔːlmoʊst/', '/ˈɔːlməʊst/',  350, 1, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses (keep has two, to demonstrate polysemy) ──────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='want'),   'want.v.desire',       1, TRUE,  'verb',        '〜が欲しい',   'to wish to have or do something',                    'A1', '「want」は「欲しい・したい」。なくても困らないものにも使う。「need（必要）」と混同しやすい。'),
  ((SELECT id FROM vocab_words WHERE normalized='need'),   'need.v.require',      1, TRUE,  'verb',        '〜が必要だ',            'to require something because it is essential',       'A1', '「need」は「必要」。それがないと困るもの。「want（欲しい）」との違いに注意。'),
  ((SELECT id FROM vocab_words WHERE normalized='try'),    'try.v.attempt',       1, TRUE,  'verb',        '試す',       'to attempt to do something',                         'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='keep'),   'keep.v.continue',     1, TRUE,  'verb',        '〜し続ける',            'to continue doing something',                        'A1', '後ろは動詞のing形：keep going, keep trying。'),
  ((SELECT id FROM vocab_words WHERE normalized='keep'),   'keep.v.retain',       2, FALSE, 'verb',        '取っておく', 'to have and not give back or throw away',             'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='enough'), 'enough.det.sufficient',1, TRUE, 'determiner',  '十分な',         'as much as is necessary',                            'A1', '名詞の前：enough time。形容詞の後：good enough。'),
  ((SELECT id FROM vocab_words WHERE normalized='busy'),   'busy.adj.occupied',   1, TRUE,  'adjective',   '忙しい',               'having a lot to do',                                 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ready'),  'ready.adj.prepared',  1, TRUE,  'adjective',   '準備ができた',          'prepared for what you are going to do',              'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='almost'), 'almost.adv.nearly',   1, TRUE,  'adverb',      'ほとんど',   'very nearly but not completely',                     'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for the pilot senses (idempotent re-seed) ──────────────
DELETE FROM vocab_examples     WHERE sense_id     IN (SELECT id FROM vocab_senses WHERE slug LIKE '%' AND word_id IN (SELECT id FROM vocab_words WHERE normalized IN ('want','need','try','keep','enough','busy','ready','almost')));
DELETE FROM vocab_collocations WHERE sense_id     IN (SELECT id FROM vocab_senses WHERE word_id IN (SELECT id FROM vocab_words WHERE normalized IN ('want','need','try','keep','enough','busy','ready','almost')));
DELETE FROM vocab_relations    WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN (SELECT id FROM vocab_words WHERE normalized IN ('want','need','try','keep','enough','busy','ready','almost')));

-- ── Examples (self-disambiguating) ──────────────────────────────────────────
-- Natural, situational sentences — 3 per sense, tagged by goal
-- (business / travel / conversation). Not textbook register. See "Content
-- standards" in eigo-ios/docs/VOCAB-101.md. Requires add-vocab-example-goals.sql.
INSERT INTO vocab_examples (sense_id, text_en, text_ja, cloze_answer, disambiguated, order_index, goal) VALUES
  -- want
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'), 'I want to go over the numbers before we send the report.', '送る前に数字を確認したい。',                     'want', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'), 'I want a window seat if there''s one available.',         '空いていれば窓側の席がいい。',                   'want', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'), 'I want a coffee, but what I really need is some sleep.',   'コーヒーが飲みたいけど、本当に必要なのは睡眠。',  'want', TRUE, 2, 'conversation'),
  -- need
  ((SELECT id FROM vocab_senses WHERE slug='need.v.require'), 'I need to reply to this email before the meeting.',       '会議の前にこのメールに返信しないといけない。',    'need', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='need.v.require'), 'You need your passport to check in for the flight.',      '搭乗手続きにはパスポートが必要だ。',              'need', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='need.v.require'), 'I really need a break this weekend.',                     '今週末は本当に休みが必要だ。',                   'need', TRUE, 2, 'conversation'),
  -- try
  ((SELECT id FROM vocab_senses WHERE slug='try.v.attempt'), 'Let''s try a different approach for the next campaign.',   '次のキャンペーンでは違う方法を試そう。',          'try', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='try.v.attempt'), 'You should try the street food near the station.',        '駅の近くの屋台料理を試すといいよ。',              'try', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='try.v.attempt'), 'Let''s try that new ramen place tonight.',                '今夜、あの新しいラーメン屋を試してみよう。',      'try', TRUE, 2, 'conversation'),
  -- keep (continue)
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.continue'), 'Keep me posted on the client''s decision.',             'クライアントの決定を随時知らせて。',              'keep', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.continue'), 'Keep walking straight and the hotel is on your left.',   'まっすぐ進めば、ホテルは左手にあるよ。',          'keep', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.continue'), 'Keep going — you''re doing great.',                      'その調子で、よくやってるよ。',                   'keep', TRUE, 2, 'conversation'),
  -- keep (retain)
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.retain'), 'Keep the invoice for your expense report.',               '経費精算のために請求書を取っておいて。',          'keep', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.retain'), 'Keep your boarding pass until you leave the airport.',     '空港を出るまで搭乗券は持っておいて。',            'keep', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.retain'), 'You can keep the book — I''ve already read it.',           'その本、あげるよ。もう読んだから。',              'keep', TRUE, 2, 'conversation'),
  -- enough
  ((SELECT id FROM vocab_senses WHERE slug='enough.det.sufficient'), 'We don''t have enough budget for both projects.',  '両方のプロジェクトには予算が足りない。',          'enough', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='enough.det.sufficient'), 'Do we have enough time to catch the connection?',  '乗り継ぎに間に合う時間は十分ある？',              'enough', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='enough.det.sufficient'), 'Sorry, I don''t have enough cash — can I pay by card?', 'すみません、現金が足りないのでカードで払えますか？', 'enough', TRUE, 2, 'conversation'),
  -- busy
  ((SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), 'I''m too busy this week to take on anything new.',      '今週は忙しくて新しい仕事は無理だ。',              'busy', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), 'We kept busy exploring the old town all day.',          '一日中、旧市街を歩き回って忙しくしていた。',      'busy', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), 'Work''s been crazy, so I''m too busy to meet up.',      '仕事が立て込んでいて、忙しくて会えない。',        'busy', TRUE, 2, 'conversation'),
  -- ready
  ((SELECT id FROM vocab_senses WHERE slug='ready.adj.prepared'), 'The presentation is ready for tomorrow''s meeting.',   '明日の会議のプレゼンは準備できている。',          'ready', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='ready.adj.prepared'), 'Are you ready to head to the airport?',                '空港に向かう準備はできた？',                     'ready', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='ready.adj.prepared'), 'Give me five minutes — I''m not ready yet.',           '5分ちょうだい、まだ準備できてないの。',           'ready', TRUE, 2, 'conversation'),
  -- almost
  ((SELECT id FROM vocab_senses WHERE slug='almost.adv.nearly'), 'The project is almost done — just final checks left.',  'プロジェクトはほぼ完了、あとは最終確認だけ。',    'almost', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='almost.adv.nearly'), 'We''re almost at the hotel, just one more block.',      'もうすぐホテル、あと1ブロックだ。',              'almost', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='almost.adv.nearly'), 'We''re almost out of milk — can you grab some?',        '牛乳がもうすぐ切れる。買ってきてくれる？',        'almost', TRUE, 2, 'conversation');

-- ── Collocations (attested) ─────────────────────────────────────────────────
INSERT INTO vocab_collocations (sense_id, pattern, example, collocate, colloc_type) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'),        'want to + VERB', 'want to go home',     'to',    'verb+inf'),
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'),        'want a + NOUN',  'want a break',        'a',     'verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='need.v.require'),       'need to + VERB', 'need to sleep',       'to',    'verb+inf'),
  ((SELECT id FROM vocab_senses WHERE slug='need.v.require'),       'need + NOUN',    'need help',           'help',  'verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='try.v.attempt'),        'try to + VERB',  'try to help',         'to',    'verb+inf'),
  ((SELECT id FROM vocab_senses WHERE slug='try.v.attempt'),        'give it a try',  'give it a try',       'give',  'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.continue'),      'keep + VERB-ing','keep going',          'going', 'verb+ger'),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.continue'),      'keep in touch',  'keep in touch',       'touch', 'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.retain'),        'keep the + NOUN','keep the change',     'change','verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='enough.det.sufficient'),'enough + NOUN',  'enough time',         'time',  'det+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='enough.det.sufficient'),'not enough',     'not enough money',    'not',   'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'),    'busy with + NOUN','busy with work',     'with',  'adj+prep'),
  ((SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'),    'a busy + NOUN',  'a busy day',          'day',   'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='ready.adj.prepared'),   'ready to + VERB','ready to start',      'to',    'adj+inf'),
  ((SELECT id FROM vocab_senses WHERE slug='ready.adj.prepared'),   'ready for + NOUN','ready for the test', 'for',   'adj+prep'),
  ((SELECT id FROM vocab_senses WHERE slug='almost.adv.nearly'),    'almost + ADJ',   'almost done',         'done',  'adv+adj'),
  ((SELECT id FROM vocab_senses WHERE slug='almost.adv.nearly'),    'almost always',  'almost always',       'always','adv+adv');

-- ── Relations (typed, sense-scoped; want↔need is in-corpus) ─────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'),  (SELECT id FROM vocab_senses WHERE slug='need.v.require'), NULL, 'confusable', '「want=欲しい」「need=必要」。日本語だと両方「〜がいる」的に訳せて混同しやすい。'),
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'),  NULL, 'would like', 'near_synonym', 'ていねいな言い方は would like。'),
  ((SELECT id FROM vocab_senses WHERE slug='need.v.require'), (SELECT id FROM vocab_senses WHERE slug='want.v.desire'), NULL, 'confusable', '同上。'),
  ((SELECT id FROM vocab_senses WHERE slug='need.v.require'), NULL, 'require', 'near_synonym', 'かたい語は require。'),
  ((SELECT id FROM vocab_senses WHERE slug='try.v.attempt'),  NULL, 'attempt', 'synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.continue'),NULL, 'continue', 'synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.continue'),NULL, 'stop', 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='keep.v.retain'),  NULL, 'hold on to', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='enough.det.sufficient'), NULL, 'sufficient', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='enough.det.sufficient'), NULL, 'not enough', 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), NULL, 'free', 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='ready.adj.prepared'), NULL, 'prepared', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='almost.adv.nearly'), NULL, 'nearly', 'near_synonym', NULL);

-- ── Category membership ─────────────────────────────────────────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s CROSS JOIN vocab_categories c
WHERE c.slug = 'everyday-essentials'
  AND s.slug IN ('want.v.desire','need.v.require','try.v.attempt','keep.v.continue','enough.det.sufficient','busy.adj.occupied','ready.adj.prepared','almost.adv.nearly')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s CROSS JOIN vocab_categories c
WHERE c.slug = 'states-adjectives'
  AND s.slug IN ('busy.adj.occupied','ready.adj.prepared')
ON CONFLICT DO NOTHING;

-- ── Lesson + items ──────────────────────────────────────────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free)
VALUES ('vocab-101-1', 1, 1, (SELECT id FROM vocab_categories WHERE slug='everyday-essentials'),
        'Everyday essentials', '毎日使う言葉', TRUE, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-1'), s.id, x.ord
FROM (VALUES
  ('want.v.desire',0),('need.v.require',1),('try.v.attempt',2),('keep.v.continue',3),
  ('enough.det.sufficient',4),('busy.adj.occupied',5),('ready.adj.prepared',6),('almost.adv.nearly',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;
