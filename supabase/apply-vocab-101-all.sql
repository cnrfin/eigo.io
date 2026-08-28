-- Vocab 101 — full apply (all 45 files, dependency order). Options shuffled. Idempotent.
BEGIN;

-- ═══ FILE: add-vocab-101.sql ═══

-- ============================================================================
-- Vocab 101 — vocabulary course schema
-- ----------------------------------------------------------------------------
-- Sense-first model (see eigo-ios/docs/VOCAB-101.md). Content tables are shared
-- (authenticated read; writes are service-role only). Per-user progress + the
-- SRS card extension are RLS'd to the owner.
--
-- Audio/images reuse the existing private `assets` table + test-assets bucket.
-- Safe to run once; uses IF NOT EXISTS where practical.
-- ============================================================================

-- ── Words (the lemma) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocab_words (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  headword         TEXT NOT NULL,               -- "afford"
  normalized       TEXT NOT NULL UNIQUE,        -- lower-case natural key
  ipa_us           TEXT,
  ipa_uk           TEXT,
  audio_us_id      UUID REFERENCES assets(id) ON DELETE SET NULL,
  audio_uk_id      UUID REFERENCES assets(id) ON DELETE SET NULL,
  ngsl_rank        INT,                         -- frequency rank → ordering + coverage
  frequency_band   INT,                         -- coarse tier (level assignment)
  stress_pattern   TEXT,                        -- optional (e.g. "Oo"); pron course owns detail
  katakana_trap    BOOLEAN NOT NULL DEFAULT FALSE,
  katakana_note_ja TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Senses (the exercise / SRS unit) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocab_senses (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_id        UUID NOT NULL REFERENCES vocab_words(id) ON DELETE CASCADE,
  slug           TEXT NOT NULL UNIQUE,          -- stable content key, e.g. 'keep.v.continue'
  sense_index    INT NOT NULL,
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,-- the sense taught in Vocab 101
  pos            TEXT NOT NULL,                 -- verb/noun/adjective/adverb/determiner…
  gloss_ja       TEXT NOT NULL,                 -- Japanese meaning
  definition_en  TEXT NOT NULL,                 -- short English definition
  register       TEXT,                          -- formal/neutral/informal
  cefr           TEXT,                          -- sense-level difficulty (A1…)
  nuance_note_ja TEXT,                          -- JA disambiguation (see/watch/look)
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (word_id, sense_index)
);

-- ── Examples (sense-linked, self-disambiguating) ────────────────────────────
CREATE TABLE IF NOT EXISTS vocab_examples (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sense_id      UUID NOT NULL REFERENCES vocab_senses(id) ON DELETE CASCADE,
  text_en       TEXT NOT NULL,                  -- contains the target word once
  text_ja       TEXT,
  cloze_answer  TEXT NOT NULL,                  -- exact surface form to blank
  audio_id      UUID REFERENCES assets(id) ON DELETE SET NULL,
  disambiguated BOOLEAN NOT NULL DEFAULT FALSE, -- validated: only the target fits the blank
  order_index   INT NOT NULL DEFAULT 0
);

-- ── Collocations (attested, sense-specific) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS vocab_collocations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sense_id    UUID NOT NULL REFERENCES vocab_senses(id) ON DELETE CASCADE,
  pattern     TEXT NOT NULL,                    -- "make a ___", "___ to VERB"
  example     TEXT NOT NULL,                    -- "make a decision"
  collocate   TEXT NOT NULL,                    -- partner word(s): "make" / "decision"
  colloc_type TEXT,                             -- verb+noun, adj+noun, verb+prep…
  attested    BOOLEAN NOT NULL DEFAULT TRUE     -- verified correct → wrong options provable
);

-- ── Typed relations (synonym / antonym / confusable), sense-scoped ──────────
CREATE TABLE IF NOT EXISTS vocab_relations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_sense_id UUID NOT NULL REFERENCES vocab_senses(id) ON DELETE CASCADE,
  to_sense_id   UUID REFERENCES vocab_senses(id) ON DELETE CASCADE,  -- when target is in-corpus
  to_text       TEXT,                                                -- fallback for out-of-corpus words
  relation_type TEXT NOT NULL CHECK (relation_type IN
                 ('synonym','near_synonym','antonym','confusable','hypernym','hyponym')),
  note_ja       TEXT,                            -- for confusable: why they're mixed up
  strength      REAL,
  CHECK (to_sense_id IS NOT NULL OR to_text IS NOT NULL)
);

-- ── Categories + membership (themes & semantic fields) ──────────────────────
CREATE TABLE IF NOT EXISTS vocab_categories (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug      TEXT NOT NULL UNIQUE,
  label_en  TEXT NOT NULL,
  label_ja  TEXT NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('theme','semantic_field'))
);
CREATE TABLE IF NOT EXISTS vocab_sense_categories (
  sense_id    UUID NOT NULL REFERENCES vocab_senses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES vocab_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (sense_id, category_id)
);

-- ── Lessons (data-driven: a set of senses; exercises generated at runtime) ──
CREATE TABLE IF NOT EXISTS vocab_lessons (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  level_index INT NOT NULL,
  order_index INT NOT NULL,
  theme_id    UUID REFERENCES vocab_categories(id) ON DELETE SET NULL,
  title_en    TEXT NOT NULL,
  title_ja    TEXT NOT NULL,
  published   BOOLEAN NOT NULL DEFAULT FALSE,
  free        BOOLEAN NOT NULL DEFAULT FALSE,   -- free-then-gated (first N lessons free)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vocab_lesson_items (
  lesson_id   UUID NOT NULL REFERENCES vocab_lessons(id) ON DELETE CASCADE,
  sense_id    UUID NOT NULL REFERENCES vocab_senses(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  PRIMARY KEY (lesson_id, sense_id)
);

-- ── Per-user progress (coverage / known / mastered) — independent of SRS ────
CREATE TABLE IF NOT EXISTS user_vocab_state (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sense_id   UUID NOT NULL REFERENCES vocab_senses(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','learning','known','mastered')),
  proved_at  TIMESTAMPTZ,                        -- when a checkout/recall confirmed it
  last_seen  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, sense_id)
);

-- ── Extend vocabulary_cards to schedule a vocab sense OR a lesson phrase ─────
-- One shared SM-2 scheduler; a card references exactly one source.
ALTER TABLE vocabulary_cards ALTER COLUMN phrase_id DROP NOT NULL;
ALTER TABLE vocabulary_cards ADD COLUMN IF NOT EXISTS vocab_sense_id UUID
  REFERENCES vocab_senses(id) ON DELETE CASCADE;
DO $$ BEGIN
  ALTER TABLE vocabulary_cards ADD CONSTRAINT vocabulary_cards_one_source
    CHECK (num_nonnulls(phrase_id, vocab_sense_id) = 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_cards_user_sense
  ON vocabulary_cards(user_id, vocab_sense_id) WHERE vocab_sense_id IS NOT NULL;

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vocab_words_rank ON vocab_words(ngsl_rank);
CREATE INDEX IF NOT EXISTS idx_vocab_senses_word ON vocab_senses(word_id);
CREATE INDEX IF NOT EXISTS idx_vocab_examples_sense ON vocab_examples(sense_id);
CREATE INDEX IF NOT EXISTS idx_vocab_collocations_sense ON vocab_collocations(sense_id);
CREATE INDEX IF NOT EXISTS idx_vocab_relations_from ON vocab_relations(from_sense_id);
CREATE INDEX IF NOT EXISTS idx_vocab_sense_categories_cat ON vocab_sense_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_vocab_lesson_items_lesson ON vocab_lesson_items(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_vocab_state_user ON user_vocab_state(user_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Content tables: authenticated read (no answer-key columns to hide — the
-- "correct answer" to a generated item is derived from senses/relations, and
-- Vocab 101 is self-study, not a graded test). Writes are service-role only
-- (service role bypasses RLS; absence of write policies denies clients).
ALTER TABLE vocab_words           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_senses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_examples        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_collocations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_relations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_sense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_lesson_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocab_state      ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so this file is re-runnable (Postgres has no
-- CREATE POLICY IF NOT EXISTS).
DROP POLICY IF EXISTS "vocab_words read"            ON vocab_words;
DROP POLICY IF EXISTS "vocab_senses read"           ON vocab_senses;
DROP POLICY IF EXISTS "vocab_examples read"         ON vocab_examples;
DROP POLICY IF EXISTS "vocab_collocations read"     ON vocab_collocations;
DROP POLICY IF EXISTS "vocab_relations read"        ON vocab_relations;
DROP POLICY IF EXISTS "vocab_categories read"       ON vocab_categories;
DROP POLICY IF EXISTS "vocab_sense_categories read" ON vocab_sense_categories;
DROP POLICY IF EXISTS "vocab_lessons read"          ON vocab_lessons;
DROP POLICY IF EXISTS "vocab_lesson_items read"     ON vocab_lesson_items;
DROP POLICY IF EXISTS "user_vocab_state owner"      ON user_vocab_state;

CREATE POLICY "vocab_words read"           ON vocab_words            FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_senses read"          ON vocab_senses           FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_examples read"        ON vocab_examples         FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_collocations read"    ON vocab_collocations     FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_relations read"       ON vocab_relations        FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_categories read"      ON vocab_categories       FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_sense_categories read" ON vocab_sense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_lessons read"         ON vocab_lessons          FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_lesson_items read"    ON vocab_lesson_items     FOR SELECT TO authenticated USING (true);

-- Per-user progress: owner-only.
CREATE POLICY "user_vocab_state owner" ON user_vocab_state
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ═══ FILE: add-vocab-scenes.sql ═══

-- ============================================================================
-- Vocab 101 — scene lessons (dialogue) schema
-- ----------------------------------------------------------------------------
-- A scene is a two-character dialogue for a lesson, selected by the learner's
-- goal. Lines play in order; a line with a blank teaches one target word via a
-- 4-option choice. See eigo-ios/docs/VOCAB-SCENES.md.
--
-- Text conventions inside text_en:
--   {Word}          the blanked vocab word (single braces) — one per blank line
--   {{user_name}}   a runtime variable (double braces) — never blanked
--
-- Safe to run once. Run AFTER add-vocab-101.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS vocab_scenes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id   UUID NOT NULL REFERENCES vocab_lessons(id) ON DELETE CASCADE,
  goal        TEXT CHECK (goal IS NULL OR goal IN ('business','travel','conversation')),
  order_index INT NOT NULL DEFAULT 0,
  title_en    TEXT NOT NULL,
  title_ja    TEXT NOT NULL,
  setting     TEXT,                       -- backdrop key (unused in v1)
  npc_role    TEXT,                        -- authoring flavour only
  published   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lesson_id, goal)                 -- one scene per lesson per goal
);

CREATE TABLE IF NOT EXISTS vocab_scene_lines (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scene_id       UUID NOT NULL REFERENCES vocab_scenes(id) ON DELETE CASCADE,
  order_index    INT NOT NULL,
  speaker        TEXT NOT NULL CHECK (speaker IN ('user','npc')),  -- 'user' = user-teacup
  text_en        TEXT NOT NULL,            -- may contain {Blank} and {{user_name}}
  text_ja        TEXT,
  blank_answer   TEXT,                     -- exact braced word; NULL → line just plays
  blank_sense_id UUID REFERENCES vocab_senses(id) ON DELETE SET NULL,  -- for SRS
  options        TEXT[],                   -- 4 incl. answer (blank lines only)
  note           TEXT
);

CREATE INDEX IF NOT EXISTS idx_vocab_scenes_lesson ON vocab_scenes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_vocab_scene_lines_scene ON vocab_scene_lines(scene_id);

-- RLS: authenticated read (content), no client writes.
ALTER TABLE vocab_scenes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_scene_lines ENABLE ROW LEVEL SECURITY;
-- Drop-then-create so this file is re-runnable (Postgres has no
-- CREATE POLICY IF NOT EXISTS).
DROP POLICY IF EXISTS "vocab_scenes read"      ON vocab_scenes;
DROP POLICY IF EXISTS "vocab_scene_lines read" ON vocab_scene_lines;
CREATE POLICY "vocab_scenes read"      ON vocab_scenes      FOR SELECT TO authenticated USING (true);
CREATE POLICY "vocab_scene_lines read" ON vocab_scene_lines FOR SELECT TO authenticated USING (true);

-- ═══ FILE: add-vocab-example-goals.sql ═══

-- ============================================================================
-- Vocab 101 — goal categories on example sentences
-- ----------------------------------------------------------------------------
-- Each sense carries 3 examples, one per goal (business / travel / conversation).
-- The learner selects 2 of the 3 goals; the lesson randomizes examples between
-- their 2, leaving the third out. Run before re-seeding seed-vocab-101-pilot.sql.
-- ============================================================================

ALTER TABLE vocab_examples ADD COLUMN IF NOT EXISTS goal TEXT
  CHECK (goal IS NULL OR goal IN ('business', 'travel', 'conversation'));

CREATE INDEX IF NOT EXISTS idx_vocab_examples_goal ON vocab_examples(sense_id, goal);

-- ═══ FILE: seed-vocab-101-a1.sql ═══

-- ============================================================================
-- Vocab 101 — A1 opening arc: Lessons 1–4 (32 words)
-- ----------------------------------------------------------------------------
--   L1 Hello & goodbye   (greetings & politeness)
--   L2 Me & you          (people & pronouns)
--   L3 My family         (family)
--   L4 Food & drink      (food — POS-mixed, showcases cloze)
--
-- Anchored to the Oxford 3000 A1/A2 slice, frequency-ordered. Every sense has a
-- JA gloss, EN definition, CEFR tag, and 3 goal-tagged, self-disambiguating
-- examples (business / travel / conversation) written in controlled A1–A2
-- vocabulary. See eigo-ios/docs/VOCAB-101.md → "Scope & sequence".
--
-- Prerequisites: run add-vocab-101.sql and add-vocab-example-goals.sql first.
-- Re-runnable: base rows use ON CONFLICT; child rows are cleared for these
-- senses before re-insert. Replaces the earlier pilot lesson (want/need/…).
-- ============================================================================

-- ── Remove the pilot test words (cascades to their senses/examples/cards) ────
DELETE FROM vocab_words WHERE normalized IN ('want','need','try','keep','enough','busy','ready','almost');

-- ── Themes ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('greetings', 'Greetings & politeness', 'あいさつ',       'theme'),
  ('people',    'People',                 '人',             'theme'),
  ('family',    'Family',                 '家族',           'theme'),
  ('food',      'Food & drink',           '食べ物と飲み物', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  -- L1
  ('hello',   'hello',   '/həˈloʊ/',   '/həˈləʊ/',   200, 1, FALSE, NULL),
  ('goodbye', 'goodbye', '/ˌɡʊdˈbaɪ/', '/ˌɡʊdˈbaɪ/', 900, 1, FALSE, NULL),
  ('yes',     'yes',     '/jɛs/',      '/jɛs/',       90, 1, FALSE, NULL),
  ('no',      'no',      '/noʊ/',      '/nəʊ/',       70, 1, FALSE, NULL),
  ('please',  'please',  '/pliːz/',    '/pliːz/',    260, 1, FALSE, NULL),
  ('thanks',  'thanks',  '/θæŋks/',    '/θæŋks/',    400, 1, TRUE,  'カタカナの「サンクス」。英語では気軽なお礼。ていねいには thank you。'),
  ('sorry',   'sorry',   '/ˈsɑːri/',   '/ˈsɒri/',    350, 1, FALSE, NULL),
  ('name',    'name',    '/neɪm/',     '/neɪm/',     150, 1, FALSE, NULL),
  -- L2
  ('I',       'i',       '/aɪ/',       '/aɪ/',        10, 1, FALSE, NULL),
  ('you',     'you',     '/juː/',      '/juː/',       15, 1, FALSE, NULL),
  ('he',      'he',      '/hiː/',      '/hiː/',       25, 1, FALSE, NULL),
  ('she',     'she',     '/ʃiː/',      '/ʃiː/',       40, 1, FALSE, NULL),
  ('we',      'we',      '/wiː/',      '/wiː/',       35, 1, FALSE, NULL),
  ('they',    'they',    '/ðeɪ/',      '/ðeɪ/',       30, 1, FALSE, NULL),
  ('friend',  'friend',  '/frɛnd/',    '/frɛnd/',    220, 1, FALSE, 'フレンド。英語の friend は「1人の友達」。複数は friends。'),
  ('people',  'people',  '/ˈpiːpəl/',  '/ˈpiːpəl/',   80, 1, FALSE, NULL),
  -- L3
  ('family',  'family',  '/ˈfæməli/',  '/ˈfæməli/',  180, 1, FALSE, NULL),
  ('mother',  'mother',  '/ˈmʌðər/',   '/ˈmʌðə/',    240, 1, FALSE, NULL),
  ('father',  'father',  '/ˈfɑːðər/',  '/ˈfɑːðə/',   250, 1, FALSE, NULL),
  ('sister',  'sister',  '/ˈsɪstər/',  '/ˈsɪstə/',   360, 1, FALSE, NULL),
  ('brother', 'brother', '/ˈbrʌðər/',  '/ˈbrʌðə/',   370, 1, FALSE, NULL),
  ('parent',  'parent',  '/ˈpɛərənt/', '/ˈpeərənt/', 300, 1, FALSE, NULL),
  ('child',   'child',   '/tʃaɪld/',   '/tʃaɪld/',   130, 1, FALSE, NULL),
  ('baby',    'baby',    '/ˈbeɪbi/',   '/ˈbeɪbi/',   330, 1, TRUE,  'カタカナの「ベビー」。英語は baby /ˈbeɪbi/。'),
  -- L4
  ('food',    'food',    '/fuːd/',     '/fuːd/',     170, 1, FALSE, NULL),
  ('water',   'water',   '/ˈwɔːtər/',  '/ˈwɔːtə/',   160, 1, FALSE, 'ウォーター。英語は /ˈwɔːtər/。'),
  ('eat',     'eat',     '/iːt/',      '/iːt/',      230, 1, FALSE, NULL),
  ('drink',   'drink',   '/drɪŋk/',    '/drɪŋk/',    320, 1, FALSE, 'ドリンク。動詞は「飲む」、名詞は「飲み物」。'),
  ('bread',   'bread',   '/brɛd/',     '/brɛd/',     420, 1, TRUE,  '英語では bread。「パン」はポルトガル語由来で通じない。'),
  ('hungry',  'hungry',  '/ˈhʌŋɡri/',  '/ˈhʌŋɡri/',  450, 1, FALSE, NULL),
  ('cook',    'cook',    '/kʊk/',      '/kʊk/',      380, 1, FALSE, NULL),
  ('delicious','delicious','/dɪˈlɪʃəs/','/dɪˈlɪʃəs/', 700, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses (one primary sense each) ─────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  -- L1
  ((SELECT id FROM vocab_words WHERE normalized='hello'),   'hello.excl.greeting',  1, TRUE, 'exclamation', 'こんにちは',       'a word you say when you meet someone or answer the phone', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='goodbye'), 'goodbye.excl.parting', 1, TRUE, 'exclamation', 'さようなら',             'a word you say when you leave someone',                    'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='yes'),     'yes.excl.affirm',      1, TRUE, 'exclamation', 'はい',                   'you use it to agree or say something is true',             'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='no'),      'no.excl.refuse',       1, TRUE, 'exclamation', 'いいえ',                 'you use it to disagree or refuse',                         'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='please'),  'please.adv.polite',    1, TRUE, 'adverb',      'お願いします',   'a polite word used when you ask for something',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='thanks'),  'thanks.excl.thank',    1, TRUE, 'exclamation', 'ありがとう',             'a friendly way to thank someone',                          'A1', 'ていねいには thank you。'),
  ((SELECT id FROM vocab_words WHERE normalized='sorry'),   'sorry.excl.apolog',    1, TRUE, 'exclamation', 'ごめんなさい','a word you say when you apologize',                        'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='name'),    'name.n.identity',      1, TRUE, 'noun',        '名前',                   'the word that people call you by',                         'A1', NULL),
  -- L2
  ((SELECT id FROM vocab_words WHERE normalized='i'),       'i.pron.self',          1, TRUE, 'pronoun',     '私（自分）',             'the word you use when you talk about yourself',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='you'),     'you.pron.listener',    1, TRUE, 'pronoun',     'あなた',                 'the person or people you are talking to',                  'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='he'),      'he.pron.male',         1, TRUE, 'pronoun',     '彼（その男性）',         'a word for one man or boy',                                'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='she'),     'she.pron.female',      1, TRUE, 'pronoun',     '彼女（その女性）',       'a word for one woman or girl',                             'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='we'),      'we.pron.group',        1, TRUE, 'pronoun',     '私たち',                 'you and I, or me and my group',                            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='they'),    'they.pron.others',     1, TRUE, 'pronoun',     '彼ら',           'more than one other person or thing',                      'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='friend'),  'friend.n.person',      1, TRUE, 'noun',        '友達',                   'a person you like and know well',                          'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='people'),  'people.n.persons',     1, TRUE, 'noun',        '人々',                   'more than one person',                                     'A1', NULL),
  -- L3
  ((SELECT id FROM vocab_words WHERE normalized='family'),  'family.n.group',       1, TRUE, 'noun',        '家族',                   'the group of people you are related to',                   'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mother'),  'mother.n.parent',      1, TRUE, 'noun',        '母',                     'your female parent',                                       'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='father'),  'father.n.parent',      1, TRUE, 'noun',        '父',                     'your male parent',                                         'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sister'),  'sister.n.sibling',     1, TRUE, 'noun',        '姉',                 'a girl or woman with the same parents as you',             'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='brother'), 'brother.n.sibling',    1, TRUE, 'noun',        '兄',                 'a boy or man with the same parents as you',                'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='parent'),  'parent.n.parent',      1, TRUE, 'noun',        '親',                     'a mother or a father',                                     'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='child'),   'child.n.young',        1, TRUE, 'noun',        '子供',                   'a young person, or someone''s son or daughter',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='baby'),    'baby.n.infant',        1, TRUE, 'noun',        '赤ちゃん',               'a very young child',                                       'A1', NULL),
  -- L4
  ((SELECT id FROM vocab_words WHERE normalized='food'),    'food.n.edible',        1, TRUE, 'noun',        '食べ物',                 'things that people eat',                                    'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='water'),   'water.n.liquid',       1, TRUE, 'noun',        '水',                     'the clear liquid that we drink',                           'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='eat'),     'eat.v.consume',        1, TRUE, 'verb',        '食べる',                 'to put food in your mouth and swallow it',                 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='drink'),   'drink.v.consume',      1, TRUE, 'verb',        '飲む',                   'to take liquid into your mouth and swallow it',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bread'),   'bread.n.food',         1, TRUE, 'noun',        'パン',                   'a common food made by baking flour and water',             'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hungry'),  'hungry.adj.wanting',   1, TRUE, 'adjective',   'お腹がすいた',           'wanting to eat',                                           'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cook'),    'cook.v.prepare',       1, TRUE, 'verb',        '料理する',               'to make food ready by heating it',                         'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='delicious'),'delicious.adj.tasty', 1, TRUE, 'adjective',   'おいしい',               'tasting very good',                                        'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent re-seed) ──────────────────
DELETE FROM vocab_examples WHERE sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN (SELECT id FROM vocab_words WHERE normalized IN
  ('hello','goodbye','yes','no','please','thanks','sorry','name','i','you','he','she','we','they','friend','people','family','mother','father','sister','brother','parent','child','baby','food','water','eat','drink','bread','hungry','cook','delicious')));
DELETE FROM vocab_collocations WHERE sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN (SELECT id FROM vocab_words WHERE normalized IN
  ('hello','goodbye','yes','no','please','thanks','sorry','name','i','you','he','she','we','they','friend','people','family','mother','father','sister','brother','parent','child','baby','food','water','eat','drink','bread','hungry','cook','delicious')));
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN (SELECT id FROM vocab_words WHERE normalized IN
  ('hello','goodbye','yes','no','please','thanks','sorry','name','i','you','he','she','we','they','friend','people','family','mother','father','sister','brother','parent','child','baby','food','water','eat','drink','bread','hungry','cook','delicious')));

-- ── Examples (3 per sense, goal-tagged, self-disambiguating) ────────────────
INSERT INTO vocab_examples (sense_id, text_en, text_ja, cloze_answer, disambiguated, order_index, goal) VALUES
  -- hello
  ((SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), 'I say hello to my team when I get to the office.', '出社したらチームにあいさつする。',        'hello', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), 'Say hello to the driver when you get on the bus.', 'バスに乗ったら運転手にあいさつしてね。',  'hello', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), 'She said hello and gave me a big smile.',          '彼女はあいさつして、にっこり笑った。',    'hello', TRUE, 2, 'conversation'),
  -- goodbye
  ((SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), 'We said goodbye to the client after the meeting.', '会議のあと、クライアントに別れを告げた。','goodbye', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), 'It is hard to say goodbye at the airport.',        '空港でお別れを言うのはつらい。',          'goodbye', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), 'He waved goodbye from the train window.',          '彼は電車の窓から手を振って別れを告げた。','goodbye', TRUE, 2, 'conversation'),
  -- yes
  ((SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'), 'I said yes to the new project.',                        '新しいプロジェクトを引き受けた。',        'yes', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'), 'When they asked if we wanted a tour, we said yes.',     'ツアーはどうかと聞かれて、はいと答えた。','yes', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'), 'She asked if I was hungry and I said yes.',             'お腹すいてる？と聞かれてはいと答えた。',  'yes', TRUE, 2, 'conversation'),
  -- no
  ((SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'), 'The manager said no to the extra budget.',               '部長は追加予算にノーと言った。',          'no', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'), 'I asked for a window seat, but they said no.',           '窓側の席を頼んだが、だめだと言われた。',  'no', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'), 'He said no to dessert because he was full.',             'お腹いっぱいで、彼はデザートを断った。',  'no', TRUE, 2, 'conversation'),
  -- please
  ((SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), 'Please send me the file before five.',                '5時までにファイルを送ってください。',      'please', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), 'Two tickets to the city, please.',                    '街まで切符を2枚お願いします。',            'please', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), 'Please help me carry these bags.',                    'この荷物を運ぶのを手伝ってください。',    'please', TRUE, 2, 'conversation'),
  -- thanks
  ((SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), 'Thanks for finishing the report so fast.',            'レポートを早く仕上げてくれてありがとう。','thanks', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), 'Thanks, that is very kind of you.',                   'ありがとう、ご親切に。',                  'thanks', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), 'Thanks for the coffee this morning.',                 '今朝はコーヒーをありがとう。',            'thanks', TRUE, 2, 'conversation'),
  -- sorry
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), 'Sorry, I am a little late for the meeting.',           'すみません、会議に少し遅れます。',        'sorry', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), 'Sorry, is this the way to the station?',               'すみません、駅はこちらの方向ですか。',    'sorry', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), 'Sorry, I did not hear what you said.',                 'ごめん、今言ったこと聞こえなかった。',    'sorry', TRUE, 2, 'conversation'),
  -- name
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'), 'Could you tell me your name for the booking?',          '予約のためお名前を教えていただけますか。','name', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'), 'Please write your name on the hotel form.',             'ホテルの用紙にお名前をご記入ください。',  'name', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'), 'I forgot his name, but he seems nice.',                 '彼の名前は忘れたけど、いい人そう。',      'name', TRUE, 2, 'conversation'),
  -- I
  ((SELECT id FROM vocab_senses WHERE slug='i.pron.self'), 'I will send the email after lunch.',                        '昼食のあとメールを送ります。',            'I', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='i.pron.self'), 'I would like a room for two nights.',                       '2泊で部屋をお願いしたいです。',            'I', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='i.pron.self'), 'I really like this song.',                                  'この曲、本当に好き。',                    'I', TRUE, 2, 'conversation'),
  -- you
  ((SELECT id FROM vocab_senses WHERE slug='you.pron.listener'), 'Can you check these numbers for me?',                  'この数字を確認してもらえますか。',        'you', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='you.pron.listener'), 'You need to show your ticket here.',                   'ここで切符を見せる必要があります。',      'you', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='you.pron.listener'), 'Do you want to go for a walk?',                        '散歩に行かない？',                        'you', TRUE, 2, 'conversation'),
  -- he
  ((SELECT id FROM vocab_senses WHERE slug='he.pron.male'), 'He works in the sales team.',                              '彼は営業チームで働いている。',            'He', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='he.pron.male'), 'He asked the driver for directions.',                      '彼は運転手に道をたずねた。',              'He', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='he.pron.male'), 'He is my brother''s best friend.',                         '彼は兄の親友だ。',                        'He', TRUE, 2, 'conversation'),
  -- she
  ((SELECT id FROM vocab_senses WHERE slug='she.pron.female'), 'She leads the design team.',                            '彼女はデザインチームを率いている。',      'She', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='she.pron.female'), 'She booked the hotel for us.',                          '彼女が私たちのホテルを予約した。',        'She', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='she.pron.female'), 'She always makes me laugh.',                            '彼女はいつも私を笑わせてくれる。',        'She', TRUE, 2, 'conversation'),
  -- we
  ((SELECT id FROM vocab_senses WHERE slug='we.pron.group'), 'We finished the project on time.',                        '私たちは期限どおりにプロジェクトを終えた。','We', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='we.pron.group'), 'We are staying near the station.',                        '私たちは駅の近くに泊まっています。',      'We', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='we.pron.group'), 'We watched a movie last night.',                          '昨夜、私たちは映画を見た。',              'We', TRUE, 2, 'conversation'),
  -- they
  ((SELECT id FROM vocab_senses WHERE slug='they.pron.others'), 'They sent the contract this morning.',                 '彼らは今朝、契約書を送ってきた。',        'They', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='they.pron.others'), 'They live in a small town by the sea.',                '彼らは海辺の小さな町に住んでいる。',      'They', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='they.pron.others'), 'They have two children.',                              '彼らには子供が2人いる。',                'They', TRUE, 2, 'conversation'),
  -- friend
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'), 'A friend from work helped me with the report.',         '職場の友達がレポートを手伝ってくれた。',  'friend', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'), 'I am meeting a friend in Osaka.',                       '大阪で友達に会う予定だ。',                'friend', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'), 'My best friend lives next door.',                       '親友は隣に住んでいる。',                  'friend', TRUE, 2, 'conversation'),
  -- people
  ((SELECT id FROM vocab_senses WHERE slug='people.n.persons'), 'A lot of people came to the meeting.',                 '大勢の人が会議に来た。',                  'people', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='people.n.persons'), 'The city is full of friendly people.',                 'その街は親切な人であふれている。',        'people', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='people.n.persons'), 'Many people like this restaurant.',                    '多くの人がこのレストランを好んでいる。',  'people', TRUE, 2, 'conversation'),
  -- family
  ((SELECT id FROM vocab_senses WHERE slug='family.n.group'), 'I cannot work this weekend; it is family time.',         '今週末は働けない、家族の時間だ。',        'family', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='family.n.group'), 'We are traveling with our whole family.',                '家族みんなで旅行している。',              'family', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='family.n.group'), 'My family lives in the countryside.',                    '私の家族は田舎に住んでいる。',            'family', TRUE, 2, 'conversation'),
  -- mother
  ((SELECT id FROM vocab_senses WHERE slug='mother.n.parent'), 'My mother runs a small shop.',                          '母は小さな店を営んでいる。',              'mother', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='mother.n.parent'), 'I bought a gift for my mother.',                        '母におみやげを買った。',                  'mother', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='mother.n.parent'), 'My mother makes great soup.',                           '母はスープを作るのが上手だ。',            'mother', TRUE, 2, 'conversation'),
  -- father
  ((SELECT id FROM vocab_senses WHERE slug='father.n.parent'), 'His father started the company.',                       '彼の父が会社を始めた。',                  'father', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='father.n.parent'), 'My father loves to travel by train.',                   '父は電車で旅するのが好きだ。',            'father', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='father.n.parent'), 'My father reads the news every morning.',               '父は毎朝ニュースを読む。',                'father', TRUE, 2, 'conversation'),
  -- sister
  ((SELECT id FROM vocab_senses WHERE slug='sister.n.sibling'), 'My sister works at the same office.',                  '姉は同じ会社で働いている。',              'sister', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='sister.n.sibling'), 'My sister met us at the airport.',                     '妹が空港まで迎えに来てくれた。',          'sister', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='sister.n.sibling'), 'My little sister is very funny.',                      '妹はとても面白い。',                      'sister', TRUE, 2, 'conversation'),
  -- brother
  ((SELECT id FROM vocab_senses WHERE slug='brother.n.sibling'), 'My brother and I run the business together.',         '兄と私で一緒に事業をしている。',          'brother', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='brother.n.sibling'), 'My brother is coming with us to Kyoto.',              '弟も一緒に京都へ行く。',                  'brother', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='brother.n.sibling'), 'My older brother teaches music.',                     '兄は音楽を教えている。',                  'brother', TRUE, 2, 'conversation'),
  -- parent
  ((SELECT id FROM vocab_senses WHERE slug='parent.n.parent'), 'Every parent on the team gets flexible hours.',         'チームの親には柔軟な勤務時間がある。',    'parent', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='parent.n.parent'), 'A parent must stay with young children on the tour.',   'ツアーでは親が小さい子と一緒にいる必要がある。','parent', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='parent.n.parent'), 'Being a parent is hard but happy work.',                '親であることは大変だけど幸せなことだ。',  'parent', TRUE, 2, 'conversation'),
  -- child
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'), 'The office has a room for staff with a child.',           '会社には子供のいる社員のための部屋がある。','child', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'), 'A child under six travels free on this train.',           '6歳未満の子供はこの電車は無料だ。',      'child', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'), 'Their child just started school.',                        '彼らの子供は学校に通い始めたばかりだ。',  'child', TRUE, 2, 'conversation'),
  -- baby
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'), 'She is back from work after having a baby.',              '彼女は赤ちゃんを産んで仕事に戻った。',    'baby', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'), 'We booked a quiet room because of the baby.',             '赤ちゃんがいるので静かな部屋を予約した。','baby', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'), 'The baby sleeps all morning.',                            '赤ちゃんは午前中ずっと寝ている。',        'baby', TRUE, 2, 'conversation'),
  -- food
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'), 'The company gives us free food at lunch.',                '会社は昼食に無料の食べ物を出してくれる。','food', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'), 'The street food here is amazing.',                        'ここの屋台の食べ物は最高だ。',            'food', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'), 'There is a lot of food in the fridge.',                   '冷蔵庫に食べ物がたくさんある。',          'food', TRUE, 2, 'conversation'),
  -- water
  ((SELECT id FROM vocab_senses WHERE slug='water.n.liquid'), 'Please bring some water to the meeting room.',           '会議室に水を持ってきてください。',        'water', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='water.n.liquid'), 'You can buy water at the station.',                      '駅で水を買えます。',                      'water', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='water.n.liquid'), 'Can I have a glass of water?',                           'お水を一杯もらえますか。',                'water', TRUE, 2, 'conversation'),
  -- eat
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), 'We often eat lunch at our desks.',                        '私たちはよく自席で昼食を食べる。',        'eat', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), 'Let us eat something before the flight.',                 '飛行機の前に何か食べよう。',              'eat', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), 'I usually eat breakfast at seven.',                       '私はたいてい7時に朝食を食べる。',        'eat', TRUE, 2, 'conversation'),
  -- drink
  ((SELECT id FROM vocab_senses WHERE slug='drink.v.consume'), 'I drink coffee during long meetings.',                  '長い会議の間はコーヒーを飲む。',          'drink', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='drink.v.consume'), 'Do not drink the tap water on the trip.',               '旅行中は水道水を飲まないで。',            'drink', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='drink.v.consume'), 'I drink tea every night.',                              '私は毎晩お茶を飲む。',                    'drink', TRUE, 2, 'conversation'),
  -- bread
  ((SELECT id FROM vocab_senses WHERE slug='bread.n.food'), 'There is bread and coffee in the break room.',            '休憩室にパンとコーヒーがある。',          'bread', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='bread.n.food'), 'We bought fresh bread near the hotel.',                    'ホテルの近くで焼きたてのパンを買った。',  'bread', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='bread.n.food'), 'I had bread and eggs for breakfast.',                      '朝食にパンと卵を食べた。',                'bread', TRUE, 2, 'conversation'),
  -- hungry
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), 'I skipped lunch, so I am really hungry now.',        '昼食を抜いたので、今とてもお腹がすいた。','hungry', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), 'We were hungry after the long walk.',                '長い散歩のあと、お腹がすいた。',          'hungry', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), 'I am hungry, so let us order something.',             'お腹がすいたから、何か注文しよう。',      'hungry', TRUE, 2, 'conversation'),
  -- cook
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'), 'I do not have time to cook during the week.',            '平日は料理する時間がない。',              'cook', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'), 'The hotel lets you cook in the room.',                   'そのホテルは部屋で料理させてくれる。',    'cook', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'), 'I like to cook dinner for my friends.',                  '友達に夕食を作るのが好きだ。',            'cook', TRUE, 2, 'conversation'),
  -- delicious
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), 'The food at the work party was delicious.',         '会社のパーティーの料理はおいしかった。',  'delicious', TRUE, 0, 'business'),
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), 'We found a delicious little noodle shop.',           'おいしい小さな麺屋を見つけた。',          'delicious', TRUE, 1, 'travel'),
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), 'This cake is really delicious.',                     'このケーキは本当においしい。',            'delicious', TRUE, 2, 'conversation');

-- ── Collocations (attested; shown on the word card) ─────────────────────────
INSERT INTO vocab_collocations (sense_id, pattern, example, collocate, colloc_type) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), 'yes, please',     'yes, please',       'yes',   'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'),   'first name',      'first name',        'first', 'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='name.n.identity'),   'your name',       'What is your name?','your',  'det+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), 'so sorry',        'I am so sorry',     'so',    'adv+adj'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'),   'a good friend',   'a good friend',     'good',  'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'),   'best friend',     'my best friend',    'best',  'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='people.n.persons'),  'a lot of people', 'a lot of people',   'lot',   'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='family.n.group'),    'a big family',    'a big family',      'big',   'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'),     'a young child',   'a young child',     'young', 'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'),     'have a baby',     'have a baby',       'have',  'verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'),     'fast food',       'fast food',         'fast',  'adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='food.n.edible'),     'healthy food',    'healthy food',      'healthy','adj+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='water.n.liquid'),    'a glass of water','a glass of water',  'glass', 'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'),     'eat out',         'eat out',           'out',   'verb+adv'),
  ((SELECT id FROM vocab_senses WHERE slug='eat.v.consume'),     'eat breakfast',   'eat breakfast',     'breakfast','verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='drink.v.consume'),   'drink water',     'drink water',       'water', 'verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='bread.n.food'),      'a loaf of bread', 'a loaf of bread',   'loaf',  'fixed'),
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'),    'cook dinner',     'cook dinner',       'dinner','verb+noun'),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'),'very hungry',     'very hungry',       'very',  'adv+adj'),
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'),'really delicious','really delicious', 'really','adv+adj');

-- ── Relations (typed; in-corpus antonyms use to_sense_id) ───────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), (SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), NULL, 'antonym', '会うとき hello、別れるとき goodbye。'),
  ((SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'),(SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), NULL, 'antonym', '同上。'),
  ((SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'),     (SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'),       NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='no.excl.refuse'),      (SELECT id FROM vocab_senses WHERE slug='yes.excl.affirm'),      NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'),   NULL, 'thank you',  'near_synonym', 'ていねいな言い方。'),
  ((SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'),   NULL, 'excuse me',  'near_synonym', '声をかけるときは excuse me も使う。'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'),     NULL, 'buddy',      'near_synonym', 'くだけた言い方。'),
  ((SELECT id FROM vocab_senses WHERE slug='friend.n.person'),     NULL, 'enemy',      'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='mother.n.parent'),     NULL, 'mom',        'near_synonym', 'くだけた言い方は mom。'),
  ((SELECT id FROM vocab_senses WHERE slug='father.n.parent'),     NULL, 'dad',        'near_synonym', 'くだけた言い方は dad。'),
  ((SELECT id FROM vocab_senses WHERE slug='child.n.young'),       NULL, 'kid',        'near_synonym', 'くだけた言い方は kid。'),
  ((SELECT id FROM vocab_senses WHERE slug='baby.n.infant'),       NULL, 'infant',     'near_synonym', 'かたい言い方は infant。'),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'),  NULL, 'full',       'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'),  NULL, 'thirsty',    'confusable', 'hungry=お腹がすいた、thirsty=のどがかわいた。'),
  ((SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), NULL, 'tasty',      'synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'),      NULL, 'prepare',    'near_synonym', NULL);

-- ── Category membership (each lesson's senses → its theme) ───────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='greetings'
WHERE s.slug IN ('hello.excl.greeting','goodbye.excl.parting','yes.excl.affirm','no.excl.refuse','please.adv.polite','thanks.excl.thank','sorry.excl.apolog','name.n.identity')
ON CONFLICT DO NOTHING;
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='people'
WHERE s.slug IN ('i.pron.self','you.pron.listener','he.pron.male','she.pron.female','we.pron.group','they.pron.others','friend.n.person','people.n.persons')
ON CONFLICT DO NOTHING;
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='family'
WHERE s.slug IN ('family.n.group','mother.n.parent','father.n.parent','sister.n.sibling','brother.n.sibling','parent.n.parent','child.n.young','baby.n.infant')
ON CONFLICT DO NOTHING;
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='food'
WHERE s.slug IN ('food.n.edible','water.n.liquid','eat.v.consume','drink.v.consume','bread.n.food','hungry.adj.wanting','cook.v.prepare','delicious.adj.tasty')
ON CONFLICT DO NOTHING;

-- ── Lessons (upsert so the old pilot title/order is overwritten) ────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-1', 1, 1, (SELECT id FROM vocab_categories WHERE slug='greetings'), 'Hello & goodbye', 'あいさつ',           TRUE, TRUE),
  ('vocab-101-2', 1, 2, (SELECT id FROM vocab_categories WHERE slug='people'),    'Me & you',        'わたしとあなた',     TRUE, TRUE),
  ('vocab-101-3', 1, 3, (SELECT id FROM vocab_categories WHERE slug='family'),    'My family',       'わたしの家族',       TRUE, TRUE),
  ('vocab-101-4', 1, 4, (SELECT id FROM vocab_categories WHERE slug='food'),      'Food & drink',    '食べ物と飲み物',     TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index = EXCLUDED.level_index, order_index = EXCLUDED.order_index,
  theme_id = EXCLUDED.theme_id, title_en = EXCLUDED.title_en, title_ja = EXCLUDED.title_ja,
  published = EXCLUDED.published, free = EXCLUDED.free;

-- ── Lesson items (clear old, then set order) ────────────────────────────────
DELETE FROM vocab_lesson_items WHERE lesson_id IN (SELECT id FROM vocab_lessons WHERE slug IN ('vocab-101-1','vocab-101-2','vocab-101-3','vocab-101-4'));

INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug=x.lesson), s.id, x.ord
FROM (VALUES
  ('vocab-101-1','hello.excl.greeting',0),('vocab-101-1','goodbye.excl.parting',1),('vocab-101-1','yes.excl.affirm',2),('vocab-101-1','no.excl.refuse',3),
  ('vocab-101-1','please.adv.polite',4),('vocab-101-1','thanks.excl.thank',5),('vocab-101-1','sorry.excl.apolog',6),('vocab-101-1','name.n.identity',7),
  ('vocab-101-2','i.pron.self',0),('vocab-101-2','you.pron.listener',1),('vocab-101-2','he.pron.male',2),('vocab-101-2','she.pron.female',3),
  ('vocab-101-2','we.pron.group',4),('vocab-101-2','they.pron.others',5),('vocab-101-2','friend.n.person',6),('vocab-101-2','people.n.persons',7),
  ('vocab-101-3','family.n.group',0),('vocab-101-3','mother.n.parent',1),('vocab-101-3','father.n.parent',2),('vocab-101-3','sister.n.sibling',3),
  ('vocab-101-3','brother.n.sibling',4),('vocab-101-3','parent.n.parent',5),('vocab-101-3','child.n.young',6),('vocab-101-3','baby.n.infant',7),
  ('vocab-101-4','food.n.edible',0),('vocab-101-4','water.n.liquid',1),('vocab-101-4','eat.v.consume',2),('vocab-101-4','drink.v.consume',3),
  ('vocab-101-4','bread.n.food',4),('vocab-101-4','hungry.adj.wanting',5),('vocab-101-4','cook.v.prepare',6),('vocab-101-4','delicious.adj.tasty',7)
) AS x(lesson, slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

-- ═══ FILE: seed-vocab-101-1-scenes.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 1 scenes: "Ordering a coffee" (travel) + "Arriving for a
-- meeting" (business). Same eight words, two situations. See VOCAB-SCENES.md.
--
-- Re-runnable: clears this lesson's scenes (cascades lines) then re-inserts.
-- Run AFTER add-vocab-scenes.sql and the A1 word seed (seed-vocab-101-a1.sql).
-- ============================================================================

DELETE FROM vocab_scenes WHERE lesson_id = (SELECT id FROM vocab_lessons WHERE slug='vocab-101-1');

INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-1'), 'travel',       0, 'Ordering a coffee',      'コーヒーを注文する', 'cafe',      'barista'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-1'), 'business',     1, 'Arriving for a meeting', '打ち合わせに到着',   'reception', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-1'), 'conversation', 2, 'Meeting someone new',    '初対面のあいさつ',   'party',     'new friend');

-- Helpers used below:
--   scene(goal)  = (SELECT id FROM vocab_scenes WHERE lesson_id=<L1> AND goal=<goal>)
--   sense(slug)  = (SELECT id FROM vocab_senses WHERE slug=<slug>)

-- ── Travel scene: "Ordering a coffee" ──────────────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 0, 'npc',  'Hi! Come on in.',                          'いらっしゃいませ！どうぞ。',        NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 1, 'user', '{Hello}, can I get a coffee?',             'こんにちは、コーヒーをもらえますか？', 'Hello',   (SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), ARRAY['Name','Goodbye','Thanks','Hello']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 2, 'npc',  'Of course. Can I get a {name} for the cup?', 'もちろん。カップにお名前をいただけますか？', 'name', (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['water','friend','name','drink']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 3, 'user', 'It''s {{user_name}}.',                     '{{user_name}}です。',               NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 4, 'npc',  'Thanks, {{user_name}}! Do you want milk?', 'ありがとう、{{user_name}}さん！ミルクは？', NULL,  NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 5, 'user', 'Yes, a little.',                           'はい、少しだけ。',                  NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 6, 'npc',  'Anything else?',                           '他にはいかがですか？',              NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 7, 'user', 'Some water too, {please}?',                'お水もお願いします。',              'please',  (SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), ARRAY['sorry','name','no','please']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 8, 'npc',  'That''ll be ¥480, {{user_name}}.',        '480円になります、{{user_name}}さん。', NULL,   NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 9, 'user', '{Sorry}, how much?',                       'すみません、おいくらですか？',      'Sorry',   (SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), ARRAY['Thanks','Hello','Sorry','Please']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 10, 'npc',  '¥480. Here''s your coffee.',              '480円です。コーヒーをどうぞ。',     NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 11, 'user', '{Thanks}!',                               'ありがとう！',                      'Thanks',  (SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), ARRAY['Sorry','Hello','Please','Thanks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 12, 'npc',  'Have a good day!',                        'よい一日を！',                      NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='travel'), 13, 'user', 'You too. {Goodbye}!',                     'あなたも。さようなら！',            'Goodbye', (SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), ARRAY['Hello','Name','Please','Goodbye']);

-- ── Business scene: "Arriving for a meeting" ───────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 0, 'user', '{Hello}, I have a meeting with Ms. Tanaka.', 'こんにちは、田中さんとお約束があります。', 'Hello', (SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), ARRAY['Name','Goodbye','Hello','Thanks']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 1, 'npc',  'Welcome. Can I have your {name}?',           'ようこそ。お名前をいただけますか？', 'name',  (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['friend','water','name','drink']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 2, 'user', 'It''s {{user_name}}.',                       '{{user_name}}です。',               NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 3, 'npc',  'Thanks, {{user_name}}. Do you have an appointment?', 'ありがとう、{{user_name}}さん。ご予約はありますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 4, 'user', 'Yes, at two.',                              'はい、2時に。',                     NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 5, 'npc',  'Would you like a coffee while you wait?',    'お待ちの間、コーヒーはいかがですか？', NULL,   NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 6, 'user', 'No, thank you.',                            'いいえ、けっこうです。',            NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 7, 'npc',  'She''ll be ready soon. {Please} take a seat.', 'もうすぐです。おかけください。',     'Please', (SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), ARRAY['Please','No','Sorry','Name']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 8, 'npc',  'Here''s your visitor pass.',                '訪問者パスです。',                  NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 9, 'user', '{Thanks}.',                                 'ありがとう。',                      'Thanks',  (SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), ARRAY['No','Goodbye','Thanks','Sorry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 10, 'user', '{Sorry}, which floor is it?',              'すみません、何階ですか？',          'Sorry',   (SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), ARRAY['Yes','Thanks','Hello','Sorry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 11, 'npc',  'Third floor.',                            '3階です。',                         NULL,      NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='business'), 12, 'user', 'Great, {goodbye} for now.',              'では、失礼します。',                'goodbye', (SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), ARRAY['name','please','hello','goodbye']);

-- ── Conversation scene: "Meeting someone new" ─────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 0, 'npc',  'Hey! You must be one of Teri''s friends.', 'あ、ミカの友達だよね？',            NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 1, 'user', '{Hello}! Yeah, I am.',                     'こんにちは！うん、そうだよ。',      'Hello',   (SELECT id FROM vocab_senses WHERE slug='hello.excl.greeting'), ARRAY['Thanks','Goodbye','Hello','Name']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 2, 'npc',  'Cool, I''m Sam. What''s your {name}?',     'いいね、サムだよ。名前は？',        'name',    (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['friend','water','drink','name']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 3, 'user', 'I''m {{user_name}}.',                      '{{user_name}}だよ。',               NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 4, 'npc',  'Nice one, {{user_name}}. Want a drink?',   'いいね、{{user_name}}さん。飲み物いる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 5, 'user', 'Yes, sure.',                               'うん、ぜひ。',                      NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 6, 'npc',  'Soda or juice?',                           'ソーダとジュース、どっち？',        NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 7, 'user', 'Juice, {please}.',                         'ジュースをお願い。',                'please',  (SELECT id FROM vocab_senses WHERE slug='please.adv.polite'), ARRAY['please','sorry','name','no']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 8, 'npc',  'Here you go.',                             'はい、どうぞ。',                    NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 9, 'user', '{Thanks}!',                                'ありがとう！',                      'Thanks',  (SELECT id FROM vocab_senses WHERE slug='thanks.excl.thank'), ARRAY['Please','Thanks','Hello','Sorry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 10, 'npc',  'So, how do you know Teri?',               'で、ミカとはどういう知り合い？',    NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 11, 'user', '{Sorry}, it''s loud. What was that?',             'ごめん、うるさくて…なんて？',       'Sorry',   (SELECT id FROM vocab_senses WHERE slug='sorry.excl.apolog'), ARRAY['Thanks','Hello','Yes','Sorry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 12, 'npc',  'How do you know Teri?',                   'ミカとはどういう知り合い？',        NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 13, 'user', 'Oh, from work.',                          'あぁ、仕事仲間だよ。',              NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 14, 'npc',  'Ah, cool. Hey, I''ll catch you later.',   'なるほどね。じゃ、またあとで。',    NULL,       NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-1') AND goal='conversation'), 15, 'user', 'Sure, {goodbye}!',                       'うん、じゃあね！',                  'goodbye', (SELECT id FROM vocab_senses WHERE slug='goodbye.excl.parting'), ARRAY['hello','name','goodbye','please']);

-- ═══ FILE: seed-vocab-101-2.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 2, re-cut scene-first: "Getting to know you"
-- ----------------------------------------------------------------------------
-- Replaces the retired pronoun lesson. Words: meet, live, work, student,
-- teacher, friend (reused), city, nice. Situational + cloze-friendly.
-- Includes word senses, a few relations, the lesson remap, and 3 goal scenes.
--
-- Re-runnable. Run AFTER add-vocab-101.sql, add-vocab-scenes.sql, and
-- seed-vocab-101-a1.sql (which created friend.n.person, reused here).
-- The old pronoun senses are left orphaned (not in any lesson) — harmless.
-- ============================================================================

-- ── Theme ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('introductions', 'Getting to know you', '自己紹介', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('meet',    'meet',    '/miːt/',       '/miːt/',        300, 1, FALSE, NULL),
  ('live',    'live',    '/lɪv/',        '/lɪv/',         250, 1, FALSE, '動詞は /lɪv/「住む」。形容詞「ライブ」は /laɪv/ で別物。'),
  ('work',    'work',    '/wɜːrk/',      '/wɜːk/',         80, 1, FALSE, NULL),
  ('student', 'student', '/ˈstuːdənt/',  '/ˈstjuːdənt/',  400, 1, FALSE, NULL),
  ('teacher', 'teacher', '/ˈtiːtʃər/',   '/ˈtiːtʃə/',     500, 1, FALSE, NULL),
  ('city',    'city',    '/ˈsɪti/',      '/ˈsɪti/',       350, 1, FALSE, NULL),
  ('nice',    'nice',    '/naɪs/',       '/naɪs/',        450, 1, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='meet'),    'meet.v.encounter',   1, TRUE, 'verb',      '会う',   'to see and talk to someone, especially for the first time', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='live'),    'live.v.reside',      1, TRUE, 'verb',      '住む',             'to have your home in a place',                              'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='work'),    'work.v.job',         1, TRUE, 'verb',      '働く',             'to have a job; to do a job',                                'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='student'), 'student.n.learner',  1, TRUE, 'noun',      '学生',             'a person who studies at a school or university',            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='teacher'), 'teacher.n.educator', 1, TRUE, 'noun',      '先生',             'a person whose job is to teach',                            'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='city'),    'city.n.place',       1, TRUE, 'noun',      '都市',   'a large town',                                              'A1', '「都市」。小さいのは town（町）。'),
  ((SELECT id FROM vocab_words WHERE normalized='nice'),    'nice.adj.pleasant',  1, TRUE, 'adjective', 'すてきな', 'pleasant, kind, or friendly',                               'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent) ─────────────────────────
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('meet','live','work','student','teacher','city','nice')));

-- ── Relations (for card display + recall-accept) ───────────────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'),   NULL, 'kind',     'synonym',      NULL),
  ((SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'),   NULL, 'friendly', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='student.n.learner'),   NULL, 'pupil',    'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'),    NULL, 'see',      'confusable',   'meet=（初めて）会う・知り合う、see=会う／見る。'),
  ((SELECT id FROM vocab_senses WHERE slug='city.n.place'),        NULL, 'town',     'confusable',   'city=大都市、town=町（小さめ）。');

-- ── Category membership ─────────────────────────────────────────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='introductions'
WHERE s.slug IN ('meet.v.encounter','live.v.reside','work.v.job','student.n.learner','teacher.n.educator','city.n.place','nice.adj.pleasant','friend.n.person')
ON CONFLICT DO NOTHING;

-- ── Remap the lesson (was pronouns) → Getting to know you ──────────────────
UPDATE vocab_lessons SET
  title_en='Getting to know you', title_ja='自己紹介',
  theme_id=(SELECT id FROM vocab_categories WHERE slug='introductions'),
  level_index=1, order_index=2, published=TRUE, free=TRUE
WHERE slug='vocab-101-2';

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-2'), s.id, x.ord
FROM (VALUES
  ('meet.v.encounter',0),('live.v.reside',1),('work.v.job',2),('student.n.learner',3),
  ('teacher.n.educator',4),('friend.n.person',5),('city.n.place',6),('nice.adj.pleasant',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

-- ── Scenes ──────────────────────────────────────────────────────────────────
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-2'), 'conversation', 0, 'Meeting a new neighbour', '新しいご近所さん',     'home',    'neighbour'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-2'), 'travel',       1, 'Chatting at a hostel',     '宿で世間話',           'hostel',  'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-2'), 'business',     2, 'A new colleague',          '新しい同僚',           'office',  'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 0, 'npc',  'Hi! Are you the new neighbour?', 'こんにちは！新しく越してきた方ですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 1, 'user', 'Yes, I just moved in. Nice to {meet} you.', 'はい、引っ越してきたばかりです。はじめまして。', 'meet', (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['sell','drive','meet','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 2, 'npc',  'Welcome! Where did you live before?', 'ようこそ！前はどこに住んでいましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 3, 'user', 'I used to {live} in a house in a smaller town.', '前は小さな町の家に住んでいました。', 'live', (SELECT id FROM vocab_senses WHERE slug='live.v.reside'), ARRAY['work','live','study','travel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 4, 'npc',  'Big change! So what do you do?', '大きな変化ですね！お仕事は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 5, 'user', 'I''m a {student}. I study nursing.', '学生です。看護を勉強しています。', 'student', (SELECT id FROM vocab_senses WHERE slug='student.n.learner'), ARRAY['driver','student','teacher','doctor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 6, 'npc',  'Nice. It''s a great {city}, full of universities, for students.', 'いいね。大学がたくさんある、学生にいい街だよ。', 'city', (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['shop','city','town','village']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 7, 'user', 'That''s good to hear.', 'それは嬉しいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 8, 'npc',  'Let me know if you need anything. Neighbours should be {nice} and helpful!', '何かあれば言ってね。ご近所さんは親切で助け合うべき！', 'nice', (SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'), ARRAY['nice','quiet','busy','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='conversation'), 9, 'user', 'Thanks! I''m {{user_name}}, by the way.', 'ありがとう！あ、{{user_name}}です。', NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 0, 'npc',  'Hi! Are you traveling too?',                  'やあ！君も旅行中？',                  NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 1, 'user', 'Yeah! First time here.',                      'うん！ここは初めて。',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 2, 'npc',  'Nice to {meet} you. Where are you from?',     'はじめまして。どこから来たの？',      'meet',    (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['meet','cook','buy','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 3, 'user', 'Japan. You?',                                 '日本だよ。君は？',                    NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 4, 'npc',  'Canada. So what do you do back home?',        'カナダ。地元では何してるの？',        NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 5, 'user', 'I {work} at a small company.',                '小さな会社で働いてるよ。',            'work',    (SELECT id FROM vocab_senses WHERE slug='work.v.job'), ARRAY['work','play','sleep','live']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 6, 'npc',  'Cool! I''m a {teacher}. I teach kids.',      'いいね！僕は先生、子どもたちに教えてるんだ。', 'teacher', (SELECT id FROM vocab_senses WHERE slug='teacher.n.educator'), ARRAY['nurse','teacher','waiter','student']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 7, 'user', 'That sounds fun.',                            '楽しそう。',                          NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 8, 'npc',  'Have you seen much of the {city} yet?',       'もう街はけっこう見て回った？',        'city',    (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['city','food','train','hotel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 9, 'user', 'A little, but it''s really {nice}, so clean and green.',             '少し、でもすごくいい、きれいで緑も多い。',          'nice',    (SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'), ARRAY['cold','far','loud','nice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='travel'), 10, 'npc',  'You''ll love it. Let''s grab dinner sometime!', '気に入るよ。今度ごはん行こう！',    NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 0, 'npc',  'Hi, you must be the new hire. Welcome!',      'はじめまして、新しい方ですね。ようこそ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 1, 'user', 'Thank you! Nice to {meet} you.',              'ありがとうございます！はじめまして。', 'meet',    (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['drive','sell','meet','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 2, 'npc',  'You too. How are you finding the {city}?',    'こちらこそ。街の感じはどうですか？',  'city',    (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['weather','food','train','city']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 3, 'user', 'It''s great. I {live} in an apartment a short walk from here.', 'いいですよ。歩いてすぐのアパートに住んでます。', 'live', (SELECT id FROM vocab_senses WHERE slug='live.v.reside'), ARRAY['work','live','park','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 4, 'npc',  'Convenient! I''m in the design team. And you?', '便利ですね！私はデザインチームです。あなたは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 5, 'user', 'Marketing.',                                  'マーケティングです。',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 6, 'npc',  'Nice. My work {friend} Sam will show you around.', 'いいですね。同僚のサムが案内しますよ。', 'friend', (SELECT id FROM vocab_senses WHERE slug='friend.n.person'), ARRAY['client','friend','boss','manager']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 7, 'user', 'Great, thanks.',                              'ありがとうございます。',              NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 8, 'npc',  'He''s really {nice}; he helps everyone out.',  '彼は本当に親切で、みんなを助けてくれます。', 'nice', (SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'), ARRAY['nice','quiet','strict','new']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-2') AND goal='business'), 9, 'user', 'Looking forward to it.',                      '楽しみです。',                        NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-3.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 3, re-cut scene-first: "Shopping"
-- ----------------------------------------------------------------------------
-- Replaces the retired family lesson. Words: want, buy, money, big, small,
-- color, cheap, size. Situational + cloze-friendly (mixed POS).
-- Word senses + relations + lesson remap + 3 goal scenes. American spelling.
--
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- The old family senses are left orphaned (not in any lesson) — harmless.
-- ============================================================================

-- ── Theme ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('shopping', 'Shopping', '買い物', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('want',  'want',  '/wɑːnt/',  '/wɒnt/',   150, 1, FALSE, NULL),
  ('buy',   'buy',   '/baɪ/',    '/baɪ/',    200, 1, FALSE, NULL),
  ('money', 'money', '/ˈmʌni/',  '/ˈmʌni/',  180, 1, FALSE, NULL),
  ('big',   'big',   '/bɪɡ/',    '/bɪɡ/',    120, 1, FALSE, NULL),
  ('small', 'small', '/smɔːl/',  '/smɔːl/',  160, 1, FALSE, 'スモール。/smɔːl/。'),
  ('color', 'color', '/ˈkʌlər/', '/ˈkʌlə/',  260, 1, FALSE, 'カラー。英語は /ˈkʌlər/。英式は colour。'),
  ('cheap', 'cheap', '/tʃiːp/',  '/tʃiːp/',  420, 1, FALSE, NULL),
  ('size',  'size',  '/saɪz/',   '/saɪz/',   300, 1, FALSE, 'サイズ。/saɪz/。')
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='want'),  'want.v.desire',   1, TRUE, 'verb',      '欲しい', 'to wish to have or do something', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='buy'),   'buy.v.purchase',  1, TRUE, 'verb',      '買う',           'to get something by paying money', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='money'), 'money.n.currency',1, TRUE, 'noun',      'お金',           'coins and notes used to pay for things', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='big'),   'big.adj.size',    1, TRUE, 'adjective', '大きい',         'large in size or amount', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='small'), 'small.adj.size',  1, TRUE, 'adjective', '小さい',         'little in size or amount', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='color'), 'color.n.hue',     1, TRUE, 'noun',      '色',             'red, blue, green and so on', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cheap'), 'cheap.adj.price', 1, TRUE, 'adjective', '安い',           'costing little money', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='size'),  'size.n.measure',  1, TRUE, 'noun',      'サイズ', 'how big or small something is', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent) ─────────────────────────
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('want','buy','money','big','small','color','cheap','size')));

-- ── Relations ───────────────────────────────────────────────────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='big.adj.size'),   (SELECT id FROM vocab_senses WHERE slug='small.adj.size'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='small.adj.size'), (SELECT id FROM vocab_senses WHERE slug='big.adj.size'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='big.adj.size'),   NULL, 'large',      'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'),NULL, 'expensive',  'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), NULL, 'sell',       'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), NULL, 'purchase',   'near_synonym', 'かたい語は purchase。'),
  ((SELECT id FROM vocab_senses WHERE slug='want.v.desire'),  NULL, 'would like', 'near_synonym', 'ていねいな言い方は would like。'),
  ((SELECT id FROM vocab_senses WHERE slug='money.n.currency'),NULL,'cash',       'near_synonym', '現金は cash。');

-- ── Category membership ─────────────────────────────────────────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='shopping'
WHERE s.slug IN ('want.v.desire','buy.v.purchase','money.n.currency','big.adj.size','small.adj.size','color.n.hue','cheap.adj.price','size.n.measure')
ON CONFLICT DO NOTHING;

-- ── Remap the lesson (was family) → Shopping ───────────────────────────────
UPDATE vocab_lessons SET
  title_en='Shopping', title_ja='買い物',
  theme_id=(SELECT id FROM vocab_categories WHERE slug='shopping'),
  level_index=1, order_index=3, published=TRUE, free=TRUE
WHERE slug='vocab-101-3';

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-3'), s.id, x.ord
FROM (VALUES
  ('want.v.desire',0),('buy.v.purchase',1),('money.n.currency',2),('big.adj.size',3),
  ('small.adj.size',4),('color.n.hue',5),('cheap.adj.price',6),('size.n.measure',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

-- ── Scenes ──────────────────────────────────────────────────────────────────
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-3'), 'travel',       0, 'Buying a T-shirt',     'Tシャツを買う',   'shop',  'shopkeeper'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-3'), 'business',     1, 'A shirt for work',     '仕事用のシャツ',   'shop',  'assistant'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-3'), 'conversation', 2, 'Shopping with a friend','友達と買い物',    'shop',  'friend');

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 0, 'npc',  'Hi! Looking for anything special?', 'いらっしゃい！何かお探しですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 1, 'user', 'Yes, I {want} a T-shirt like this.', 'はい、こんな感じのTシャツが欲しいです。', 'want', (SELECT id FROM vocab_senses WHERE slug='want.v.desire'), ARRAY['sell','want','wash','make']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 2, 'npc',  'Sure! What size are you?', 'もちろん！サイズは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 3, 'user', 'Medium, I think. Do you have this in my {size}?', 'Mだと思う。このサイズ、ありますか？', 'size', (SELECT id FROM vocab_senses WHERE slug='size.n.measure'), ARRAY['size','price','shape','color']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 4, 'npc',  'Let me check. Here''s a medium.', '確認しますね。はい、Mサイズです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 5, 'user', 'Hmm, it''s a little {big}. Anything smaller?', 'うーん、少し大きいです。もっと小さいのは？', 'big', (SELECT id FROM vocab_senses WHERE slug='big.adj.size'), ARRAY['big','old','cheap','heavy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 6, 'npc',  'Here''s a smaller one.', '小さいのはこちらです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 7, 'user', 'Better! Do you have another {color}, maybe blue?', 'いいね！別の色、例えば青はある？', 'color', (SELECT id FROM vocab_senses WHERE slug='color.n.hue'), ARRAY['price','brand','size','color']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 8, 'npc',  'We have blue and green.', '青と緑があります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 9, 'user', 'Blue is great. I''ll {buy} this one.', '青がいいです。これを買います。', 'buy', (SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), ARRAY['buy','borrow','return','wash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 10, 'npc',  'Great! That''s 1500 yen.', 'ありがとうございます！1500円です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 11, 'user', 'I don''t have much {money} on me. Card okay?', 'あまり現金がないんです。カードでいいですか？', 'money', (SELECT id FROM vocab_senses WHERE slug='money.n.currency'), ARRAY['space','room','time','money']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='travel'), 12, 'npc',  'Card is fine!', 'カードで大丈夫です！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 0, 'npc',  'Hi, can I help you find something?', 'いらっしゃいませ、何かお探しですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 1, 'user', 'Yes, I need a shirt for the office.', 'はい、仕事用のシャツを探しています。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 2, 'npc',  'Of course. What {size} - small, medium, or large?', 'もちろん。サイズは？S、M、L？', 'size', (SELECT id FROM vocab_senses WHERE slug='size.n.measure'), ARRAY['age','size','color','weight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 3, 'user', 'Large, please.', 'Lでお願いします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 4, 'npc',  'Here are a few. This white one is popular.', 'こちらです。この白が人気ですよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 5, 'user', 'Nice. Do you have it in a darker {color}?', 'いいですね。もっと濃い色はありますか？', 'color', (SELECT id FROM vocab_senses WHERE slug='color.n.hue'), ARRAY['color','style','price','size']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 6, 'npc',  'We have navy and grey.', '紺とグレーがあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 7, 'user', 'Is this one {cheap}? I''m on a budget.', 'これは安いですか？予算があまりなくて。', 'cheap', (SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'), ARRAY['cheap','new','warm','soft']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 8, 'npc',  'It''s on sale, actually.', '実はセール中なんです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 9, 'user', 'Perfect. I''ll {buy} the navy one.', '完璧です。紺色を買います。', 'buy', (SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), ARRAY['iron','wash','fold','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 10, 'npc',  'Great. How would you like to pay?', 'かしこまりました。お支払いは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 11, 'user', 'Card, please. I didn''t bring much {money}.', 'カードで。あまり現金を持ってこなくて。', 'money', (SELECT id FROM vocab_senses WHERE slug='money.n.currency'), ARRAY['money','time','work','luggage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='business'), 12, 'npc',  'No problem at all.', 'まったく問題ありません。', NULL, NULL, NULL);

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 0, 'npc',  'Ooh, this shop is cute!', 'わあ、この店かわいい！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 1, 'user', 'Right? I {want} a new bag.', 'でしょ？新しいバッグが欲しいな。', 'want', (SELECT id FROM vocab_senses WHERE slug='want.v.desire'), ARRAY['sell','lose','want','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 2, 'npc',  'This one''s nice. Try it!', 'これいいね。持ってみなよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 3, 'user', 'It''s cute, but a bit {small} for my stuff.', 'かわいいけど、荷物には少し小さいな。', 'small', (SELECT id FROM vocab_senses WHERE slug='small.adj.size'), ARRAY['wet','small','heavy','cheap']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 4, 'npc',  'What about this one?', 'じゃあこれは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 5, 'user', 'Oh, that''s better. Not too {big}, not too small.', 'あ、いいね。大きすぎず、小さすぎず。', 'big', (SELECT id FROM vocab_senses WHERE slug='big.adj.size'), ARRAY['cheap','big','plain','dark']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 6, 'npc',  'How much is it?', 'いくら？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 7, 'user', 'Only 2000 yen. Pretty {cheap}!', 'たった2000円。けっこう安い！', 'cheap', (SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'), ARRAY['heavy','old','cheap','loud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 8, 'npc',  'Bargain! You should get it.', 'お買い得！買っちゃいなよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 9, 'user', 'Yeah, I''ll {buy} it.', 'うん、買う。', 'buy', (SELECT id FROM vocab_senses WHERE slug='buy.v.purchase'), ARRAY['read','watch','cook','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-3') AND goal='conversation'), 10, 'npc',  'Good choice.', 'いい選択。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-4-scenes.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 4 (Food & drink) scenes: travel / business / conversation.
-- Distractors are authored (sensible related words), so each blank has one
-- defensible answer from the line's context. See VOCAB-SCENES.md.
--
-- Re-runnable: clears this lesson's scenes then re-inserts.
-- Run AFTER add-vocab-scenes.sql and seed-vocab-101-a1.sql.
-- ============================================================================

DELETE FROM vocab_scenes WHERE lesson_id = (SELECT id FROM vocab_lessons WHERE slug='vocab-101-4');

INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-4'), 'travel',       0, 'At a restaurant',       'レストランで',     'restaurant', 'waiter'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-4'), 'business',     1, 'Lunch with a colleague','同僚とランチ',     'restaurant', 'colleague'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-4'), 'conversation', 2, 'A friend cooks for you','友達が作ってくれる','home',       'friend');

-- ── Travel: "At a restaurant" ──────────────────────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 0, 'npc',  'Hi! Welcome. Sit anywhere.',                'いらっしゃいませ！お好きな席へどうぞ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 1, 'user', 'Thanks! I''m so {hungry}. I skipped lunch.', 'ありがとう！お昼を抜いたからお腹ぺこぺこ。', 'hungry', (SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), ARRAY['hungry','bored','tired','thirsty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 2, 'npc',  'Here''s the menu, then.',                    'ではメニューをどうぞ。',              NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 3, 'user', 'Could I get some {water}? I''m really thirsty.', 'お水をもらえますか？のどがすごく渇いて。', 'water', (SELECT id FROM vocab_senses WHERE slug='water.n.liquid'), ARRAY['rice','coffee','water','bread']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 4, 'npc',  'Of course. Anything to eat?',                'もちろん。お食事は？',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 5, 'user', 'I''m starving. What''s good to {eat} here?',      'お腹ぺこぺこ。ここで何を食べるのがいい？', 'eat', (SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), ARRAY['order','drink','eat','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 6, 'npc',  'The ramen''s our best. And fresh from the oven…', 'ラーメンが一番人気です。それに焼きたての…', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 7, 'npc',  '…we''ve got warm {bread} too.',              '…温かいパンもありますよ。',          'bread', (SELECT id FROM vocab_senses WHERE slug='bread.n.food'), ARRAY['fruit','bread','cheese','rice']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 8, 'user', 'Ramen and the bread, please.',               'ラーメンとパンをお願いします。',      NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 9, 'npc',  'Great. Here you go.',                        'かしこまりました。どうぞ。',          NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 10, 'user', 'Mmm, this is {delicious}, absolutely amazing!',                 'んー、最高においしい！',                    'delicious', (SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), ARRAY['awful','cold','delicious','salty']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='travel'), 11, 'npc',  'Glad you like it! Enjoy.',                  'お気に召してよかったです。ごゆっくり。', NULL, NULL, NULL);

-- ── Business: "Lunch with a colleague" ─────────────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 0, 'npc',  'Shall we grab lunch? I''m starving.',       'お昼行きませんか？お腹ぺこぺこで。',  NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 1, 'user', 'Me too. I''m {hungry}; I haven''t eaten all day.',                    '私も。お腹すいた、一日中何も食べてない。',              'hungry', (SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), ARRAY['hungry','thirsty','late','tired']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 2, 'npc',  'What kind of {food} do you feel like eating?', 'どんな食べ物の気分ですか？',        'food', (SELECT id FROM vocab_senses WHERE slug='food.n.edible'), ARRAY['weather','food','drink','music']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 3, 'user', 'Italian sounds good.',                       'イタリアンがいいですね。',            NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 4, 'npc',  'Perfect. After you.',                        'いいですね。お先にどうぞ。',          NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 5, 'npc',  'Something to {drink}? Water or juice?',      '飲み物は？お水かジュース。',          'drink', (SELECT id FROM vocab_senses WHERE slug='drink.v.consume'), ARRAY['read','wear','drink','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 6, 'user', 'Just water, thanks.',                        'お水で、ありがとう。',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 7, 'npc',  'Here''s the pasta.',                         'パスタが来ましたよ。',                NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 8, 'user', 'Let''s {eat}. I''m so hungry.',             '食べましょう、お腹ぺこぺこで。',      'eat', (SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), ARRAY['cook','pay','wait','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 9, 'user', 'Wow, this is {delicious}, the best I''ve had!',                  'わあ、これ最高においしい！',                'delicious', (SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), ARRAY['awful','cold','plain','delicious']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 10, 'npc',  'Glad you like it. Good to catch up.',       'よかった。話せてよかったです。',      NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='business'), 11, 'user', 'Definitely. Let''s do this again.',          '本当に。またやりましょう。',          NULL, NULL, NULL);

-- ── Conversation: "A friend cooks for you" ─────────────────────────────────
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 0, 'npc',  'Come in! I''m making dinner.',            '入って！今ごはん作ってるとこ。',      NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 1, 'user', 'Smells amazing! I''m {hungry}!',         'いい匂い！お腹すいた！',              'hungry', (SELECT id FROM vocab_senses WHERE slug='hungry.adj.wanting'), ARRAY['hungry','tired','thirsty','sleepy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 2, 'npc',  'I love to {cook}. I made it all myself.', '料理するの大好きなんだ。全部自分で作ったよ。', 'cook', (SELECT id FROM vocab_senses WHERE slug='cook.v.prepare'), ARRAY['paint','clean','cook','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 3, 'user', 'Wow, thanks! Can I help?',                'わあ、ありがとう！手伝おうか？',      NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 4, 'npc',  'Just sit. Want something to drink?',      '座ってて。飲み物いる？',              NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 5, 'user', 'Water''s fine, thanks.',                  'お水でいいよ、ありがとう。',          NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 6, 'npc',  'Try some {bread}. It''s still warm from the oven.', 'パン食べてみて、まだ温かいよ。',   'bread', (SELECT id FROM vocab_senses WHERE slug='bread.n.food'), ARRAY['bread','rice','salad','soup']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 7, 'user', 'Thanks! Let''s {eat}, I''m starving.',    'ありがとう！食べよう、ぺこぺこだよ。', 'eat', (SELECT id FROM vocab_senses WHERE slug='eat.v.consume'), ARRAY['cook','leave','wait','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 8, 'npc',  'Dig in!',                                 'どうぞ召し上がれ！',                  NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 9, 'user', 'Mmm, this is {delicious}, so tasty!',               'んー、おいしくて、すごく美味しい！',                'delicious', (SELECT id FROM vocab_senses WHERE slug='delicious.adj.tasty'), ARRAY['burnt','delicious','plain','awful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 10, 'npc',  'Aw, thanks! Have as much as you want.',  'ありがとう！好きなだけ食べてね。',    NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-4') AND goal='conversation'), 11, 'user', 'I definitely will.',                      '絶対そうする。',                      NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-5.sql ═══

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

-- ═══ FILE: seed-vocab-101-6.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 6 (new): "Making plans"  (Unit 4)
-- ----------------------------------------------------------------------------
-- Words: when, time, free, busy, plan, meet (reused from L2), + tomorrow,
-- tonight (played — day/time adverbs are a paradigm, taught embedded).
-- Blanks: when, time, free, busy, plan, meet. American spelling, no em-dashes.
-- Options stored answer-first; player + editor shuffle them.
--
-- Re-runnable. Run AFTER add-vocab-101.sql, add-vocab-scenes.sql, and
-- seed-vocab-101-2.sql (which created meet.v.encounter, reused here).
-- ============================================================================

-- ── Theme ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('plans', 'Making plans', '予定を立てる', 'theme')
ON CONFLICT (slug) DO NOTHING;

-- ── Words ───────────────────────────────────────────────────────────────────
INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('when',     'when',     '/wɛn/',        '/wen/',         50, 1, FALSE, NULL),
  ('time',     'time',     '/taɪm/',       '/taɪm/',        70, 1, FALSE, 'タイム。/taɪm/。'),
  ('free',     'free',     '/friː/',       '/friː/',       300, 1, FALSE, 'フリー。ここは「暇な・空いている」。'),
  ('busy',     'busy',     '/ˈbɪzi/',      '/ˈbɪzi/',      500, 1, FALSE, 'ビジー。/ˈbɪzi/。'),
  ('plan',     'plan',     '/plæn/',       '/plæn/',       350, 1, FALSE, 'プラン。動詞は「計画する」。'),
  ('tomorrow', 'tomorrow', '/təˈmɑːroʊ/',  '/təˈmɒrəʊ/',   600, 1, FALSE, NULL),
  ('tonight',  'tonight',  '/təˈnaɪt/',    '/təˈnaɪt/',    700, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

-- ── Senses ──────────────────────────────────────────────────────────────────
INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='when'),     'when.adv.time',      1, TRUE, 'adverb',    'いつ',           'at what time', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='time'),     'time.n.clock',       1, TRUE, 'noun',      '時間',     'the hour of the day, shown on a clock', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='free'),     'free.adj.available', 1, TRUE, 'adjective', '暇な','not busy; able to do something', 'A1', '「無料」の意味もあるが、ここは「暇・空いている」。'),
  ((SELECT id FROM vocab_words WHERE normalized='busy'),     'busy.adj.occupied',  1, TRUE, 'adjective', '忙しい',         'having a lot to do', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plan'),     'plan.v.arrange',     1, TRUE, 'verb',      '計画する', 'to decide and arrange what you are going to do', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tomorrow'), 'tomorrow.adv.nextday',1, TRUE,'adverb',    '明日',           'on the day after today', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tonight'),  'tonight.adv.evening', 1, TRUE,'adverb',    '今夜',           'on the evening or night of today', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Clear child rows for these senses (idempotent) ─────────────────────────
DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('when','time','free','busy','plan','tomorrow','tonight')));

-- ── Relations ───────────────────────────────────────────────────────────────
INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='free.adj.available'), (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'),    NULL, 'arrange',      'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='tomorrow.adv.nextday'), NULL, 'today',     'confusable', 'today=今日、tomorrow=明日。'),
  ((SELECT id FROM vocab_senses WHERE slug='tonight.adv.evening'),  NULL, 'this evening','near_synonym', NULL);

-- ── Category membership (meet reused from L2) ──────────────────────────────
INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='plans'
WHERE s.slug IN ('when.adv.time','time.n.clock','free.adj.available','busy.adj.occupied','plan.v.arrange','tomorrow.adv.nextday','tonight.adv.evening','meet.v.encounter')
ON CONFLICT DO NOTHING;

-- ── Lesson + items (meet.v.encounter reused → spiral) ──────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-6', 1, 6, (SELECT id FROM vocab_categories WHERE slug='plans'), 'Making plans', '予定を立てる', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-6'), s.id, x.ord
FROM (VALUES
  ('when.adv.time',0),('time.n.clock',1),('free.adj.available',2),('busy.adj.occupied',3),
  ('plan.v.arrange',4),('tomorrow.adv.nextday',6),('tonight.adv.evening',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

-- ── Scenes ──────────────────────────────────────────────────────────────────
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-6'), 'conversation', 0, 'Weekend plans with a friend', '友達と週末の予定', 'phone',  'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-6'), 'travel',       1, 'Planning a day trip',         '日帰り旅行の計画',  'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-6'), 'business',     2, 'Scheduling a meeting',        '打ち合わせの日程',  'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 0, 'npc', 'Hey, do you have plans this weekend?', 'ねえ、今週末って予定ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 1, 'user', 'Not really, I''m {free} all day. Why?', 'ううん、一日中暇。どうしたの？', 'free', (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), ARRAY['sick','tired','busy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 2, 'npc', 'Want to do something tomorrow?', '明日、何かしない？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 3, 'user', 'Sure! Let''s {plan} something fun.', 'いいね！何か楽しいこと計画しよう。', 'plan', (SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'), ARRAY['plan','cook','buy','clean']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 4, 'npc', 'Great. {When} works for you?', 'いいね。いつが都合いい？', 'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['Why','Where','When','Who']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 5, 'user', 'Afternoon? What {time}, like two o''clock, is good?', '午後？何時がいい？2時とか？', 'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['place','price','day','time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 6, 'npc', 'Two o''clock?', '2時は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 7, 'user', 'Perfect. Where should we meet?', '完璧。どこで会う？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 8, 'npc', 'Let''s meet at the park entrance.', '公園の入り口で会おう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 9, 'user', 'Sounds good. I''m never too {busy} for you!', 'いいね。君のためならいつでも空けるよ！', 'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['busy','free','hungry','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='conversation'), 10, 'npc', 'Aw! See you tomorrow then.', 'うれしい！じゃあ明日ね。', NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 0, 'npc', 'Today was fun! Are you free tonight?', '今日は楽しかった！今夜は空いてる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 1, 'user', 'Ah, I''m a bit {busy} tonight. Tomorrow?', 'あー、今夜はちょっと忙しくて。明日は？', 'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['lost','full','free','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 2, 'npc', 'Tomorrow works! What do you want to do?', '明日いいよ！何したい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 3, 'user', 'Let''s {plan} and organize a day trip somewhere.', '日帰り旅行を計画して段取りしよう。', 'plan', (SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'), ARRAY['plan','pack','book','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 4, 'npc', 'Nice! {When} should we start?', 'いいね！いつ出発する？', 'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['How','Who','Where','When']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 5, 'user', 'Early? What {time} is the first bus?', '早めに？始発バスは何時？', 'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['name','size','time','price']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 6, 'npc', 'Around eight, I think.', '8時くらいかな。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 7, 'user', 'Let''s meet at the hostel lobby.', 'ホステルのロビーで会おう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 8, 'npc', 'Perfect. Are you {free}, with nothing planned, the day after too?', '完璧。翌日も予定なく空いてる？', 'free', (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), ARRAY['wet','sad','free','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 9, 'user', 'Yeah, I''m free all week!', 'うん、今週はずっと空いてるよ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='travel'), 10, 'npc', 'Amazing. See you tomorrow morning!', '最高。じゃあ明日の朝ね！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 0, 'npc', 'Could we schedule a quick call this week?', '今週、短い打ち合わせを設定できますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 1, 'user', 'Sure. I''m {free}, with no meetings, tomorrow afternoon.', 'はい。明日の午後は会議もなく空いてます。', 'free', (SELECT id FROM vocab_senses WHERE slug='free.adj.available'), ARRAY['free','late','out','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 2, 'npc', 'Ah, I''m {busy} then. How about Friday?', 'あー、その時は忙しくて。金曜はどうですか？', 'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['early','ready','busy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 3, 'user', 'Friday works.', '金曜で大丈夫です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 4, 'npc', 'Great. {When} suits you, morning or afternoon?', 'では、いつがいいですか、午前か午後？', 'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['Who','When','Why','Where']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 5, 'user', 'Morning. Is ten a good {time}?', '午前で。10時でいいですか？', 'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['size','time','price','place']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 6, 'npc', 'Ten is perfect.', '10時で完璧です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 7, 'user', 'Shall we meet in room B?', 'B会議室で会いましょうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 8, 'npc', 'Yes. I''ll {plan} the agenda and send it over.', 'はい。議題を計画して送りますね。', 'plan', (SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'), ARRAY['drive','cook','paint','plan']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-6') AND goal='business'), 9, 'user', 'Thanks, see you Friday.', 'ありがとうございます、金曜に。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-7.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 7 (new): "Daily routine"  (Unit 4)
-- ----------------------------------------------------------------------------
-- Words: wake, sleep, work (reused from L2), start, finish, early, late, shower.
-- American spelling, no em-dashes. Options answer-first (player/editor shuffle).
--
-- Re-runnable. Run AFTER add-vocab-101.sql, add-vocab-scenes.sql, and
-- seed-vocab-101-2.sql (work.v.job reused here).
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('routine', 'Daily routine', '毎日の習慣', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('wake',   'wake',   '/weɪk/',    '/weɪk/',    500, 1, FALSE, NULL),
  ('sleep',  'sleep',  '/sliːp/',   '/sliːp/',   400, 1, FALSE, NULL),
  ('start',  'start',  '/stɑːrt/',  '/stɑːt/',   150, 1, FALSE, 'スタート。/stɑːrt/。'),
  ('finish', 'finish', '/ˈfɪnɪʃ/',  '/ˈfɪnɪʃ/',  350, 1, FALSE, NULL),
  ('early',  'early',  '/ˈɜːrli/',  '/ˈɜːli/',   300, 1, FALSE, NULL),
  ('late',   'late',   '/leɪt/',    '/leɪt/',    250, 1, FALSE, NULL),
  ('shower', 'shower', '/ˈʃaʊər/',  '/ˈʃaʊə/',   700, 2, FALSE, 'シャワー。/ˈʃaʊər/。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='wake'),   'wake.v.rise',    1, TRUE, 'verb',      '起きる',           'to stop sleeping', 'A1', 'ふつう wake up の形で使う。'),
  ((SELECT id FROM vocab_words WHERE normalized='sleep'),  'sleep.v.rest',   1, TRUE, 'verb',      '寝る',       'to rest with your eyes closed, not awake', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='start'),  'start.v.begin',  1, TRUE, 'verb',      '始める',   'to begin doing something', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='finish'), 'finish.v.end',   1, TRUE, 'verb',      '終える',   'to complete something and stop', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='early'),  'early.adv.time', 1, TRUE, 'adverb',    '早く',             'before the usual or expected time', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='late'),   'late.adv.time',  1, TRUE, 'adverb',    '遅く',             'after the usual or expected time', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shower'), 'shower.v.wash',  1, TRUE, 'verb',      'シャワーを浴びる', 'to wash your body under a shower', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('wake','sleep','start','finish','early','late','shower')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='start.v.begin'),  (SELECT id FROM vocab_senses WHERE slug='finish.v.end'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='finish.v.end'),   (SELECT id FROM vocab_senses WHERE slug='start.v.begin'),  NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='early.adv.time'), (SELECT id FROM vocab_senses WHERE slug='late.adv.time'),  NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='late.adv.time'),  (SELECT id FROM vocab_senses WHERE slug='early.adv.time'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='wake.v.rise'),    (SELECT id FROM vocab_senses WHERE slug='sleep.v.rest'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='start.v.begin'),  NULL, 'begin', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='routine'
WHERE s.slug IN ('wake.v.rise','sleep.v.rest','work.v.job','start.v.begin','finish.v.end','early.adv.time','late.adv.time','shower.v.wash')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-7', 1, 7, (SELECT id FROM vocab_categories WHERE slug='routine'), 'Daily routine', '毎日の習慣', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-7'), s.id, x.ord
FROM (VALUES
  ('wake.v.rise',0),('sleep.v.rest',1),('start.v.begin',3),
  ('finish.v.end',4),('early.adv.time',5),('late.adv.time',6),('shower.v.wash',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-7'), 'conversation', 0, 'Talking about your morning', '朝のことを話す',   'cafe',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-7'), 'travel',       1, 'A homestay host asks',       'ホストの質問',     'home',   'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-7'), 'business',     2, 'Talking about work hours',   '勤務時間の話',     'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 0, 'npc', 'You look tired! Rough morning?', '疲れてるね！朝から大変だった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 1, 'user', 'Yeah, I {wake} up at five and can''t sleep again.', 'うん、5時に起きて、もう眠れないんだ。', 'wake', (SELECT id FROM vocab_senses WHERE slug='wake.v.rise'), ARRAY['wake','sleep','sit','stay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 2, 'npc', 'Five?! That is so early.', '5時？！めちゃ早いね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 3, 'user', 'I know. I {shower} to wake up, then grab coffee.', 'だよね。目を覚ますためにシャワーを浴びて、それからコーヒー。', 'shower', (SELECT id FROM vocab_senses WHERE slug='shower.v.wash'), ARRAY['shower','sleep','drive','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 4, 'npc', 'When do you start work?', '仕事はいつ始まるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 5, 'user', 'I {start} at seven and finish late.', '7時に始めて、遅くまで。', 'start', (SELECT id FROM vocab_senses WHERE slug='start.v.begin'), ARRAY['leave','start','close','stop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 6, 'npc', 'Wow. What time do you {finish} and clock off?', 'わあ。何時に終わって退勤するの？', 'finish', (SELECT id FROM vocab_senses WHERE slug='finish.v.end'), ARRAY['finish','cook','wake','clean']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 7, 'user', 'Around eight. So I sleep in {late} on weekends!', '8時くらい。だから週末は遅くまで寝る！', 'late', (SELECT id FROM vocab_senses WHERE slug='late.adv.time'), ARRAY['early','late','loud','fast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='conversation'), 8, 'npc', 'Ha, you deserve it!', 'はは、その価値あるよ！', NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 0, 'npc', 'Welcome! What time do you usually wake up?', 'ようこそ！普段は何時に起きますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 1, 'user', 'I get up quite {early}, around six.', 'けっこう早く起きます、6時ごろ。', 'early', (SELECT id FROM vocab_senses WHERE slug='early.adv.time'), ARRAY['late','early','quiet','slow']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 2, 'npc', 'Great. Did you sleep okay?', 'いいですね。よく眠れましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 3, 'user', 'Yes! I {sleep} about seven hours each night.', 'はい！毎晩7時間くらい寝ます。', 'sleep', (SELECT id FROM vocab_senses WHERE slug='sleep.v.rest'), ARRAY['sleep','walk','work','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 4, 'npc', 'Good. What are your plans today?', 'よかった。今日の予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 5, 'user', 'A morning tour that''s supposed to {start} at nine.', '9時に始まる予定の朝のツアーです。', 'start', (SELECT id FROM vocab_senses WHERE slug='start.v.begin'), ARRAY['close','finish','end','start']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 6, 'npc', 'Nine? You should leave soon then.', '9時？じゃあそろそろ出た方がいいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 7, 'user', 'Right, I don''t want to be {late} and miss it.', 'ですね、遅れて乗り遅れたくないので。', 'late', (SELECT id FROM vocab_senses WHERE slug='late.adv.time'), ARRAY['early','sick','late','lost']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 8, 'npc', 'Do you need anything before you go?', '出かける前に何か要りますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 9, 'user', 'Just a quick {shower} to freshen up, then I''m off.', 'さっとシャワーを浴びてさっぱりしたら出ます。', 'shower', (SELECT id FROM vocab_senses WHERE slug='shower.v.wash'), ARRAY['meal','shower','nap','break']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='travel'), 10, 'npc', 'Of course. Have a great day!', 'もちろん。良い一日を！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 0, 'npc', 'You are always here early. What time do you get in?', 'いつも早いですね。何時に来るんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 1, 'user', 'I usually {start} work around eight, and finish later.', 'たいてい8時ごろ仕事を始めて、あとで終わる。', 'start', (SELECT id FROM vocab_senses WHERE slug='start.v.begin'), ARRAY['finish','start','leave','close']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 2, 'npc', 'Eight? I do not get here until nine.', '8時？私は9時まで来ませんよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 3, 'user', 'I start early so I can {finish} and go home by five.', '早く始めれば5時までに終わって帰れる。', 'finish', (SELECT id FROM vocab_senses WHERE slug='finish.v.end'), ARRAY['finish','start','cook','wake']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 4, 'npc', 'Makes sense. Do you work late often?', 'なるほど。よく遅くまで働くんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 5, 'user', 'Only sometimes. I try not to stay {late} after the office closes.', 'たまにだけ。閉店後まで遅くまで残らないようにしてる。', 'late', (SELECT id FROM vocab_senses WHERE slug='late.adv.time'), ARRAY['home','out','late','early']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 6, 'npc', 'Good balance. Do you sleep enough?', 'いいバランスですね。睡眠は足りてます？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 7, 'user', 'Ha, I {sleep} maybe six hours a night.', 'はは、一晩に6時間くらいしか寝てない。', 'sleep', (SELECT id FROM vocab_senses WHERE slug='sleep.v.rest'), ARRAY['rest','eat','work','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 8, 'npc', 'You need more! Take it easy.', 'もっと必要ですよ！無理しないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 9, 'user', 'I hope to work less next month.', '来月はもっと働く時間を減らしたいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-7') AND goal='business'), 10, 'npc', 'That is the spirit!', 'その意気です！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-8.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 8 (new): "Free time & hobbies"  (Unit 8)
-- ----------------------------------------------------------------------------
-- Words: like, love, play, music, sport, read, watch, favorite. All content
-- words, pinned by their objects, so every one is cloze-able. American spelling,
-- no em-dashes. Options answer-first (player/editor shuffle).
--
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('hobbies', 'Free time & hobbies', '趣味・余暇', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('like',     'like',     '/laɪk/',      '/laɪk/',       40, 1, FALSE, NULL),
  ('love',     'love',     '/lʌv/',       '/lʌv/',       120, 1, FALSE, 'ラブ。/lʌv/。'),
  ('play',     'play',     '/pleɪ/',      '/pleɪ/',      130, 1, FALSE, NULL),
  ('music',    'music',    '/ˈmjuːzɪk/',  '/ˈmjuːzɪk/',  260, 1, FALSE, 'ミュージック。/ˈmjuːzɪk/。'),
  ('sport',    'sport',    '/spɔːrt/',    '/spɔːt/',     380, 1, FALSE, 'スポーツ。単数は sport、複数は sports。'),
  ('read',     'read',     '/riːd/',      '/riːd/',      170, 1, FALSE, NULL),
  ('watch',    'watch',    '/wɑːtʃ/',     '/wɒtʃ/',      230, 1, FALSE, NULL),
  ('favorite', 'favorite', '/ˈfeɪvərɪt/', '/ˈfeɪvərɪt/', 550, 2, FALSE, 'フェイバリット。英式は favourite。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='like'),     'like.v.enjoy',    1, TRUE, 'verb',      '好き',             'to enjoy something or think it is good', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='love'),     'love.v.adore',    1, TRUE, 'verb',      '大好き',   'to like something very much', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='play'),     'play.v.games',    1, TRUE, 'verb',      'する',   'to take part in a game or make music', 'A1', 'スポーツや楽器に使う：play tennis / play the guitar。'),
  ((SELECT id FROM vocab_words WHERE normalized='music'),    'music.n.sound',   1, TRUE, 'noun',      '音楽',             'sounds arranged to be nice to listen to', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sport'),    'sport.n.game',    1, TRUE, 'noun',      'スポーツ',         'a physical game or activity, like soccer or tennis', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='read'),     'read.v.text',     1, TRUE, 'verb',      '読む',             'to look at and understand written words', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='watch'),    'watch.v.look',    1, TRUE, 'verb',      '見る',       'to look at something for a time, like TV', 'A1', 'watch=じっと観る（TV/映画）。see/look と混同注意。'),
  ((SELECT id FROM vocab_words WHERE normalized='favorite'), 'favorite.adj.best',1, TRUE,'adjective', 'お気に入りの',     'that you like the best', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('like','love','play','music','sport','read','watch','favorite')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), (SELECT id FROM vocab_senses WHERE slug='love.v.adore'), NULL, 'near_synonym', 'love は like より強い。'),
  ((SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), NULL, 'enjoy', 'synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), NULL, 'hate',  'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='love.v.adore'), NULL, 'hate',  'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='watch.v.look'), NULL, 'see',   'confusable', 'watch=（動くものを）じっと観る、see=見える／会う、look=（意識して）見る。'),
  ((SELECT id FROM vocab_senses WHERE slug='favorite.adj.best'), NULL, 'best', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='hobbies'
WHERE s.slug IN ('like.v.enjoy','love.v.adore','play.v.games','music.n.sound','sport.n.game','read.v.text','watch.v.look','favorite.adj.best')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-8', 1, 8, (SELECT id FROM vocab_categories WHERE slug='hobbies'), 'Free time & hobbies', '趣味・余暇', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-8'), s.id, x.ord
FROM (VALUES
  ('like.v.enjoy',0),('love.v.adore',1),('play.v.games',2),('music.n.sound',3),
  ('sport.n.game',4),('read.v.text',5),('watch.v.look',6),('favorite.adj.best',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-8'), 'conversation', 0, 'Talking about music', '音楽の話',       'home',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-8'), 'travel',       1, 'What do you do for fun?', '趣味は何？',  'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-8'), 'business',     2, 'Weekend hobbies',      '週末の趣味',     'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 0, 'npc', 'Do you like this song?', 'この曲好き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 1, 'user', 'Yeah, I really {love} this band!', 'うん、このバンド本当に大好き！', 'love', (SELECT id FROM vocab_senses WHERE slug='love.v.adore'), ARRAY['sell','own','love','hate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 2, 'npc', 'Me too! What kind of music do you like?', '私も！どんな音楽が好き？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 3, 'user', 'Jazz is my {favorite}, the one I love most.', 'ジャズが一番好き、大好きなの。', 'favorite', (SELECT id FROM vocab_senses WHERE slug='favorite.adj.best'), ARRAY['second','favorite','worst','only']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 4, 'npc', 'Nice! Do you play anything?', 'いいね！何か演奏する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 5, 'user', 'Yeah, I {play} the piano.', 'うん、ピアノを弾くよ。', 'play', (SELECT id FROM vocab_senses WHERE slug='play.v.games'), ARRAY['play','buy','watch','read']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 6, 'npc', 'Cool! I cannot play any instruments.', 'すごい！私は楽器は何もできない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 7, 'user', 'That''s okay, you can still enjoy {music}, listening to songs.', '大丈夫、曲を聴いて音楽を楽しめるよ。', 'music', (SELECT id FROM vocab_senses WHERE slug='music.n.sound'), ARRAY['music','food','sport','news']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 8, 'npc', 'True! Let us go to a concert sometime.', 'たしかに！今度コンサート行こう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='conversation'), 9, 'user', 'I would really {like} that a lot!', 'それ、すごくいいね！', 'like', (SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), ARRAY['forget','hate','need','like']);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 0, 'npc', 'So what do you do for fun back home?', '地元では趣味は何？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 1, 'user', 'I {watch} a lot of movies.', '映画をよく観るよ。', 'watch', (SELECT id FROM vocab_senses WHERE slug='watch.v.look'), ARRAY['cook','drive','read','watch']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 2, 'npc', 'Nice! Do you read much too?', 'いいね！本もよく読む？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 3, 'user', 'Yeah, I {read} books on the train every day.', 'うん、毎日電車で本を読む。', 'read', (SELECT id FROM vocab_senses WHERE slug='read.v.text'), ARRAY['read','eat','sleep','run']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 4, 'npc', 'Same! What kind of books?', '同じだ！どんな本？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 5, 'user', 'Mystery novels, mostly.', 'だいたいミステリー小説。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 6, 'npc', 'Cool. Do you play a {sport}, like tennis, as well?', 'いいね。テニスみたいなスポーツもする？', 'sport', (SELECT id FROM vocab_senses WHERE slug='sport.n.game'), ARRAY['song','sport','book','game']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 7, 'user', 'I {play} tennis on weekends.', '週末にテニスをするよ。', 'play', (SELECT id FROM vocab_senses WHERE slug='play.v.games'), ARRAY['play','read','wash','watch']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 8, 'npc', 'Fun! Tennis is my {favorite}, the one I love most, too.', '楽しい！テニスが一番好き、私も大好き。', 'favorite', (SELECT id FROM vocab_senses WHERE slug='favorite.adj.best'), ARRAY['first','worst','favorite','last']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='travel'), 9, 'user', 'We should play together sometime!', '今度一緒にやろう！', NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 0, 'npc', 'Any fun plans this weekend?', '今週末は何か楽しい予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 1, 'user', 'Just relaxing. I really {like} reading on Sundays.', 'のんびり。日曜に読書するのが本当に好き。', 'like', (SELECT id FROM vocab_senses WHERE slug='like.v.enjoy'), ARRAY['like','hate','sell','need']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 2, 'npc', 'Nice. What do you like to read?', 'いいですね。どんな本を読むんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 3, 'user', 'History, mostly. And I listen to {music} - songs and bands.', '歴史が多いかな。それに音楽を聴く、曲やバンドを。', 'music', (SELECT id FROM vocab_senses WHERE slug='music.n.sound'), ARRAY['sport','weather','music','news']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 4, 'npc', 'I love music too. Do you play?', '私も音楽大好きです。演奏します？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 5, 'user', 'A little. I {play} guitar for fun.', '少し。趣味でギターを弾きます。', 'play', (SELECT id FROM vocab_senses WHERE slug='play.v.games'), ARRAY['play','watch','cook','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 6, 'npc', 'Nice! I''m more into {sport}, like football, myself.', 'いいね！私はサッカーみたいなスポーツの方が好き。', 'sport', (SELECT id FROM vocab_senses WHERE slug='sport.n.game'), ARRAY['work','food','music','sport']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 7, 'user', 'Oh? Do you play, or just {watch}?', 'そうなんですね。やる方ですか、観る方ですか？', 'watch', (SELECT id FROM vocab_senses WHERE slug='watch.v.look'), ARRAY['cook','buy','watch','read']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 8, 'npc', 'I play soccer every Saturday!', '毎週土曜にサッカーをします！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-8') AND goal='business'), 9, 'user', 'That is my favorite to watch!', 'それ、観るのが一番好きです！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-9.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 9 (new): "Feelings"  (Unit 2)
-- ----------------------------------------------------------------------------
-- Words: happy, sad, tired, angry, worried, excited, bored, scared. Each blank
-- is pinned by its cause. American spelling, no em-dashes. Options answer-first.
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('feelings', 'Feelings', '気持ち', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('happy',   'happy',   '/ˈhæpi/',    '/ˈhæpi/',    140, 1, FALSE, NULL),
  ('sad',     'sad',     '/sæd/',      '/sæd/',      450, 1, FALSE, NULL),
  ('tired',   'tired',   '/ˈtaɪərd/',  '/ˈtaɪəd/',   400, 1, FALSE, NULL),
  ('angry',   'angry',   '/ˈæŋɡri/',   '/ˈæŋɡri/',   500, 1, FALSE, NULL),
  ('worried', 'worried', '/ˈwɜːrid/',  '/ˈwʌrid/',   600, 2, FALSE, NULL),
  ('excited', 'excited', '/ɪkˈsaɪtɪd/','/ɪkˈsaɪtɪd/',550, 2, FALSE, 'エキサイト。/ɪkˈsaɪtɪd/。'),
  ('bored',   'bored',   '/bɔːrd/',    '/bɔːd/',     650, 2, FALSE, 'bored=退屈している。boring=退屈させる。'),
  ('scared',  'scared',  '/skɛrd/',    '/skeəd/',    700, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='happy'),   'happy.adj.glad',      1, TRUE, 'adjective', 'うれしい', 'feeling pleased and good', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sad'),     'sad.adj.unhappy',     1, TRUE, 'adjective', '悲しい',           'feeling unhappy', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tired'),   'tired.adj.sleepy',    1, TRUE, 'adjective', '疲れた',     'needing rest or sleep', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='angry'),   'angry.adj.mad',       1, TRUE, 'adjective', '怒った',           'feeling strong displeasure', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='worried'), 'worried.adj.anxious', 1, TRUE, 'adjective', '心配した',         'thinking something bad may happen', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='excited'), 'excited.adj.eager',   1, TRUE, 'adjective', 'わくわくした',     'very happy and eager about something', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bored'),   'bored.adj.dull',      1, TRUE, 'adjective', '退屈した',         'not interested; having nothing to do', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='scared'),  'scared.adj.afraid',   1, TRUE, 'adjective', '怖がった',         'feeling afraid', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('happy','sad','tired','angry','worried','excited','bored','scared')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'),    (SELECT id FROM vocab_senses WHERE slug='sad.adj.unhappy'),  NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='sad.adj.unhappy'),   (SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='excited.adj.eager'), (SELECT id FROM vocab_senses WHERE slug='bored.adj.dull'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'),    NULL, 'glad',    'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'),NULL,'nervous', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='scared.adj.afraid'), NULL, 'afraid',  'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='feelings'
WHERE s.slug IN ('happy.adj.glad','sad.adj.unhappy','tired.adj.sleepy','angry.adj.mad','worried.adj.anxious','excited.adj.eager','bored.adj.dull','scared.adj.afraid')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-9', 1, 9, (SELECT id FROM vocab_categories WHERE slug='feelings'), 'Feelings', '気持ち', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-9'), s.id, x.ord
FROM (VALUES
  ('happy.adj.glad',0),('sad.adj.unhappy',1),('tired.adj.sleepy',2),('angry.adj.mad',3),
  ('worried.adj.anxious',4),('excited.adj.eager',5),('bored.adj.dull',6),('scared.adj.afraid',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-9'), 'conversation', 0, 'Checking on a friend',   '友達を気づかう',   'home',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-9'), 'travel',       1, 'A long travel day',      '長い移動の一日',   'airport','companion'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-9'), 'business',     2, 'A stressful day at work','忙しい仕事の日',   'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 0, 'npc', 'Hey, you seem quiet today.', 'ねえ、今日は静かだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 1, 'user', 'Yeah, I''m a bit {sad}. My dog is sick.', 'うん、ちょっと悲しくて。犬が病気なんだ。', 'sad', (SELECT id FROM vocab_senses WHERE slug='sad.adj.unhappy'), ARRAY['happy','hungry','sad','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 2, 'npc', 'Oh no, I''m sorry. Is it serious?', 'えっ、大丈夫？ひどいの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 3, 'user', 'The vet isn''t sure. I''m {scared}.', '獣医さんも分からなくて。怖いよ。', 'scared', (SELECT id FROM vocab_senses WHERE slug='scared.adj.afraid'), ARRAY['full','bored','scared','excited']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 4, 'npc', 'That''s really hard. He''ll be okay.', 'それはつらいね。きっと大丈夫だよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 5, 'user', 'Thanks. I''m just {worried} about him.', 'ありがとう。ただ心配で。', 'worried', (SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'), ARRAY['happy','sleepy','worried','hungry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 6, 'npc', 'Do you want to talk, or get some food?', '話す？それとも何か食べに行く？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 7, 'user', 'Maybe food. I''m {tired} of worrying.', '食べようかな。心配し疲れたよ。', 'tired', (SELECT id FROM vocab_senses WHERE slug='tired.adj.sleepy'), ARRAY['excited','tired','cold','angry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 8, 'npc', 'Let''s go. My treat.', '行こう。おごるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='conversation'), 9, 'user', 'Aw, that makes me {happy}. Thanks.', 'うれしい、ありがとう。', 'happy', (SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'), ARRAY['sad','angry','happy','scared']);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 0, 'npc', 'Ugh, that flight was delayed for hours.', 'あー、フライトが何時間も遅れたね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 1, 'user', 'I know, I''m so {tired}.', 'ほんと、すごく疲れた。', 'tired', (SELECT id FROM vocab_senses WHERE slug='tired.adj.sleepy'), ARRAY['cold','tired','hungry','happy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 2, 'npc', 'Me too. That wait was endless.', '私も。待ち時間が長すぎた。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 3, 'user', 'Right? I got so {bored} sitting there.', 'だよね。座ってて超退屈だった。', 'bored', (SELECT id FROM vocab_senses WHERE slug='bored.adj.dull'), ARRAY['scared','excited','bored','angry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 4, 'npc', 'At least we''re here now. Look at that view!', 'でも着いたよ。あの景色見て！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 5, 'user', 'Wow, now I''m {excited} again!', 'わあ、またわくわくしてきた！', 'excited', (SELECT id FROM vocab_senses WHERE slug='excited.adj.eager'), ARRAY['sad','excited','worried','tired']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 6, 'npc', 'Let''s find the hotel before dark.', '暗くなる前にホテルを探そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 7, 'user', 'Okay. I''m a bit {worried} we''ll get lost.', 'うん。道に迷わないか少し心配。', 'worried', (SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'), ARRAY['worried','happy','hungry','full']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 8, 'npc', 'Don''t worry, I have a map.', '大丈夫、地図があるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='travel'), 9, 'user', 'Phew. Okay, now I''m {happy}!', 'ほっ。よし、これで嬉しい！', 'happy', (SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'), ARRAY['sad','angry','happy','scared']);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 0, 'npc', 'You seem stressed. Everything okay?', '大変そうですね。大丈夫ですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 1, 'user', 'A little {worried}. The client is unhappy.', '少し心配で。クライアントが不満なんです。', 'worried', (SELECT id FROM vocab_senses WHERE slug='worried.adj.anxious'), ARRAY['bored','worried','excited','hungry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 2, 'npc', 'Ah. What happened?', 'そうですか。何があったんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 3, 'user', 'They were {angry} about the delay.', '遅れに怒っていました。', 'angry', (SELECT id FROM vocab_senses WHERE slug='angry.adj.mad'), ARRAY['angry','happy','hungry','tired']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 4, 'npc', 'That''s tough. Did you fix it?', 'それは大変。解決しました？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 5, 'user', 'Yes! So now I''m {happy} and relieved.', 'はい！だから今はうれしくてほっとしています。', 'happy', (SELECT id FROM vocab_senses WHERE slug='happy.adj.glad'), ARRAY['happy','scared','sad','bored']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 6, 'npc', 'Great work. You must be exhausted.', 'お疲れさま。くたくたでしょう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 7, 'user', 'Honestly, I''m really {tired}.', '正直、本当に疲れました。', 'tired', (SELECT id FROM vocab_senses WHERE slug='tired.adj.sleepy'), ARRAY['excited','angry','tired','hungry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 8, 'npc', 'Go home and rest.', '家に帰って休んで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-9') AND goal='business'), 9, 'user', 'I will. Actually, I''m {excited} for the weekend now!', 'そうします。実は今から週末が楽しみです！', 'excited', (SELECT id FROM vocab_senses WHERE slug='excited.adj.eager'), ARRAY['angry','excited','sad','worried']);

-- ═══ FILE: seed-vocab-101-10.sql ═══

-- ============================================================================
-- Vocab 101 — Lesson 10 (new): "Home"  (Unit 3)
-- ----------------------------------------------------------------------------
-- Words: house, room, kitchen, bathroom, bed, garden, door, window. Blanks are
-- pinned by function (cook → kitchen, shower → bathroom, etc.). Reuses shower
-- (L7) in a played line. American spelling, no em-dashes. Options answer-first.
-- Re-runnable. Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('home', 'Home', '家', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('house',    'house',    '/haʊs/',       '/haʊs/',       130, 1, FALSE, NULL),
  ('room',     'room',     '/ruːm/',       '/ruːm/',       160, 1, FALSE, 'ルーム。/ruːm/。'),
  ('kitchen',  'kitchen',  '/ˈkɪtʃən/',    '/ˈkɪtʃən/',    420, 1, FALSE, 'キッチン。/ˈkɪtʃən/。'),
  ('bathroom', 'bathroom', '/ˈbæθruːm/',   '/ˈbɑːθruːm/',  520, 1, FALSE, NULL),
  ('bed',      'bed',      '/bɛd/',        '/bed/',        240, 1, FALSE, 'ベッド。/bɛd/。'),
  ('garden',   'garden',   '/ˈɡɑːrdn/',    '/ˈɡɑːdn/',     450, 1, FALSE, NULL),
  ('door',     'door',     '/dɔːr/',       '/dɔː/',        200, 1, FALSE, NULL),
  ('window',   'window',   '/ˈwɪndoʊ/',    '/ˈwɪndəʊ/',    300, 1, FALSE, 'ウィンドウ。/ˈwɪndoʊ/。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='house'),    'house.n.building',   1, TRUE, 'noun', '家',       'a building where people live', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='room'),     'room.n.space',       1, TRUE, 'noun', '部屋',     'a part of a building with its own walls', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='kitchen'),  'kitchen.n.cook',     1, TRUE, 'noun', '台所', 'the room where you cook', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bathroom'), 'bathroom.n.wash',    1, TRUE, 'noun', '浴室', 'the room with a bath, shower, or toilet', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bed'),      'bed.n.sleep',        1, TRUE, 'noun', 'ベッド',   'the piece of furniture you sleep on', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='garden'),   'garden.n.yard',      1, TRUE, 'noun', '庭',       'an outdoor area with plants next to a house', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='door'),     'door.n.entry',       1, TRUE, 'noun', 'ドア', 'the part you open to go in or out', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='window'),   'window.n.glass',     1, TRUE, 'noun', '窓',       'the glass opening in a wall that lets in light', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('house','room','kitchen','bathroom','bed','garden','door','window')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='garden.n.yard'),    NULL, 'yard',   'near_synonym', 'アメリカ英語では yard も使う。'),
  ((SELECT id FROM vocab_senses WHERE slug='bathroom.n.wash'),  NULL, 'toilet', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='door.n.entry'),     (SELECT id FROM vocab_senses WHERE slug='window.n.glass'), NULL, 'confusable', 'door=出入りする扉、window=光を入れる窓。');

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='home'
WHERE s.slug IN ('house.n.building','room.n.space','kitchen.n.cook','bathroom.n.wash','bed.n.sleep','garden.n.yard','door.n.entry','window.n.glass')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-10', 1, 10, (SELECT id FROM vocab_categories WHERE slug='home'), 'Home', '家', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-10'), s.id, x.ord
FROM (VALUES
  ('house.n.building',0),('room.n.space',1),('kitchen.n.cook',2),('bathroom.n.wash',3),
  ('bed.n.sleep',4),('garden.n.yard',5),('door.n.entry',6),('window.n.glass',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-10'), 'conversation', 0, 'Describing your new place', '新居を紹介する', 'home',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-10'), 'travel',       1, 'A host shows you around',   '宿の案内',       'home',   'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-10'), 'business',     2, 'Working from home',         '在宅勤務',       'home',   'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 0, 'npc', 'So how is the new place?', '新しい家はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 1, 'user', 'I love it! It''s a small {house} with a garden.', '気に入ってる！庭付きの小さな家なんだ。', 'house', (SELECT id FROM vocab_senses WHERE slug='house.n.building'), ARRAY['station','office','car','house']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 2, 'npc', 'A garden? Nice! How many rooms?', '庭付き？いいね！部屋はいくつ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 3, 'user', 'Three. And a big {kitchen} for cooking.', '3つ。それに料理用の大きなキッチン。', 'kitchen', (SELECT id FROM vocab_senses WHERE slug='kitchen.n.cook'), ARRAY['kitchen','bathroom','garage','closet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 4, 'npc', 'You love cooking. Any outdoor space?', '料理好きだもんね。外のスペースは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 5, 'user', 'Yeah, I grow flowers in the {garden}.', 'うん、庭で花を育ててるよ。', 'garden', (SELECT id FROM vocab_senses WHERE slug='garden.n.yard'), ARRAY['garden','bathroom','garage','kitchen']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 6, 'npc', 'Sounds lovely. Is your room upstairs?', 'すてき。部屋は2階？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 7, 'user', 'Yeah, with a huge {bed}. So comfy!', 'うん、大きなベッドがあってすごく快適！', 'bed', (SELECT id FROM vocab_senses WHERE slug='bed.n.sleep'), ARRAY['bed','shelf','sink','desk']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 8, 'npc', 'I''m jealous! Can I visit?', 'いいなあ！遊びに行っていい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='conversation'), 9, 'user', 'Of course! It has a great {window} view too.', 'もちろん！窓からの眺めもいいんだ。', 'window', (SELECT id FROM vocab_senses WHERE slug='window.n.glass'), ARRAY['door','wall','floor','window']);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 0, 'npc', 'Welcome! Let me show you around.', 'ようこそ！ご案内しますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 1, 'user', 'Thanks, it''s lovely!', 'ありがとう、すてきですね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 2, 'npc', 'This is the {kitchen}, you can cook here.', 'ここがキッチンです、料理できますよ。', 'kitchen', (SELECT id FROM vocab_senses WHERE slug='kitchen.n.cook'), ARRAY['garage','hallway','kitchen','garden']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 3, 'user', 'Perfect. Where''s the {bathroom}? I''d like to shower.', 'いいですね。浴室はどこですか？シャワーを浴びたくて。', 'bathroom', (SELECT id FROM vocab_senses WHERE slug='bathroom.n.wash'), ARRAY['garden','bathroom','kitchen','garage']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 4, 'npc', 'Just down the hall. Your bedroom is here.', '廊下の先です。寝室はこちら。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 5, 'user', 'Oh nice, a big {bed}!', 'わあ、大きなベッド！', 'bed', (SELECT id FROM vocab_senses WHERE slug='bed.n.sleep'), ARRAY['sink','shelf','bed','stove']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 6, 'npc', 'Yes, and the {window} opens for fresh air.', 'ええ、窓を開けると換気できますよ。', 'window', (SELECT id FROM vocab_senses WHERE slug='window.n.glass'), ARRAY['roof','floor','door','window']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 7, 'user', 'Perfect. Is there wifi?', '完璧です。Wi-Fiはありますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 8, 'npc', 'Yes, the password is on the fridge. Make yourself at home.', 'はい、パスワードは冷蔵庫に。ごゆっくり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='travel'), 9, 'user', 'Thanks! Should I lock the {door} when I go out?', 'ありがとう！出かける時はドアに鍵をかけますか？', 'door', (SELECT id FROM vocab_senses WHERE slug='door.n.entry'), ARRAY['window','box','door','gate']);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 0, 'npc', 'Do you work from home these days?', '最近は在宅で働いてるんですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 1, 'user', 'Yes, I turned a spare {room} into an office.', 'はい、空き部屋をオフィスにしました。', 'room', (SELECT id FROM vocab_senses WHERE slug='room.n.space'), ARRAY['garage','garden','room','kitchen']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 2, 'npc', 'Smart. Is it quiet?', '賢いですね。静かですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 3, 'user', 'Very. I just close the {door} and focus.', 'とても。ドアを閉めれば集中できます。', 'door', (SELECT id FROM vocab_senses WHERE slug='door.n.entry'), ARRAY['door','window','book','laptop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 4, 'npc', 'Nice setup. Good light?', 'いい環境ですね。明るいですか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 5, 'user', 'Yeah, a big {window} next to my desk.', 'ええ、机の隣に大きな窓があります。', 'window', (SELECT id FROM vocab_senses WHERE slug='window.n.glass'), ARRAY['wall','window','floor','door']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 6, 'npc', 'Lucky! I work in my kitchen.', 'いいなあ！私はキッチンで働いてます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 7, 'user', 'Ha! My whole {house} is my office now.', 'はは！今や家全体がオフィスです。', 'house', (SELECT id FROM vocab_senses WHERE slug='house.n.building'), ARRAY['house','city','office','car']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 8, 'npc', 'True for all of us these days!', '今はみんなそうですよね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-10') AND goal='business'), 9, 'user', 'At least the walk to the {bathroom} is short!', '少なくともトイレまでは近いです！', 'bathroom', (SELECT id FROM vocab_senses WHERE slug='bathroom.n.wash'), ARRAY['bathroom','station','airport','office']);

-- ═══ FILE: seed-vocab-101-11.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 11 (new): "School"  (Unit 7, Work and study)
-- ----------------------------------------------------------------------------
-- Words: study, class, book, test, easy, hard, question, answer. All new.
-- American spelling, no em-dashes. Parked (published=FALSE) until Unit 7 gets
-- its second lesson + review. Reuses (played only): teacher, student, friend.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('school', 'School', '学校', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('study',    'study',    '/ˈstʌdi/',      '/ˈstʌdi/',     300, 1, FALSE, NULL),
  ('class',    'class',    '/klæs/',        '/klɑːs/',      250, 1, FALSE, 'クラス。/klæs/。'),
  ('book',     'book',     '/bʊk/',         '/bʊk/',        200, 1, FALSE, 'ブック。/bʊk/。'),
  ('test',     'test',     '/test/',        '/test/',       350, 1, FALSE, 'テスト。/test/。'),
  ('easy',     'easy',     '/ˈiːzi/',       '/ˈiːzi/',      400, 1, FALSE, NULL),
  ('hard',     'hard',     '/hɑːrd/',       '/hɑːd/',       300, 1, FALSE, NULL),
  ('question', 'question', '/ˈkwestʃən/',   '/ˈkwestʃən/',  350, 1, FALSE, NULL),
  ('answer',   'answer',   '/ˈænsər/',      '/ˈɑːnsə/',     400, 1, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='study'),    'study.v.learn',   1, TRUE, 'verb',      '勉強する',   'to spend time learning about a subject', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='class'),    'class.n.lesson',  1, TRUE, 'noun',      '授業', 'a time when students learn together; a group of students', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='book'),     'book.n.reading',  1, TRUE, 'noun',      '本',         'sheets of paper with words, held together to read', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='test'),     'test.n.exam',     1, TRUE, 'noun',      'テスト', 'a set of questions to check what you know', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='easy'),     'easy.adj.simple', 1, TRUE, 'adjective', '簡単な',     'not difficult to do or understand', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hard'),     'hard.adj.difficult',1,TRUE,'adjective', '難しい',     'difficult to do or understand', 'A1', 'この意味では difficult とほぼ同じ。'),
  ((SELECT id FROM vocab_words WHERE normalized='question'), 'question.n.query',1, TRUE, 'noun',      '質問',       'something you ask to get information', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='answer'),   'answer.n.reply',  1, TRUE, 'noun',      '答え',       'what you say or write in reply to a question', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('study','class','book','test','easy','hard','question','answer')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='easy.adj.simple'),   (SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'),(SELECT id FROM vocab_senses WHERE slug='easy.adj.simple'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='question.n.query'),  (SELECT id FROM vocab_senses WHERE slug='answer.n.reply'),     NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='answer.n.reply'),    (SELECT id FROM vocab_senses WHERE slug='question.n.query'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'),NULL, 'difficult', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='school'
WHERE s.slug IN ('study.v.learn','class.n.lesson','book.n.reading','test.n.exam','easy.adj.simple','hard.adj.difficult','question.n.query','answer.n.reply')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-11', 7, 1, (SELECT id FROM vocab_categories WHERE slug='school'), 'School', '学校', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-11'), s.id, x.ord
FROM (VALUES
  ('study.v.learn',0),('class.n.lesson',1),('book.n.reading',2),('test.n.exam',3),
  ('easy.adj.simple',4),('hard.adj.difficult',5),('question.n.query',6),('answer.n.reply',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-11'), 'conversation', 0, 'After the test',        'テストのあとで',   'school', 'classmate'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-11'), 'travel',       1, 'Joining a class abroad','海外で授業に参加', 'school', 'staff'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-11'), 'business',     2, 'A training day',        '研修の日',         'office', 'trainer');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 0, 'npc',  'Hey! How did the test go?',              'やあ！テストどうだった？',           NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 1, 'user', 'Honestly, it was really {hard}; I couldn''t finish.',        '正直、すごく難しくて、終わらなかった。',           'hard', (SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'), ARRAY['easy','near','hard','late']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 2, 'npc',  'Really? I thought it was {easy}, simple even.',       '本当？簡単だと思ったよ、むしろ楽勝。',       'easy', (SELECT id FROM vocab_senses WHERE slug='easy.adj.simple'), ARRAY['hard','busy','easy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 3, 'user', 'The last {question} was so tricky.',     '最後の質問が難しくて。',             'question', (SELECT id FROM vocab_senses WHERE slug='question.n.query'), ARRAY['answer','book','class','question']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 4, 'npc',  'Oh, I wasn''t sure of my {answer} either.','ああ、私も答えに自信なかった。',     'answer', (SELECT id FROM vocab_senses WHERE slug='answer.n.reply'), ARRAY['question','answer','test','word']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 5, 'user', 'Did you {study} a lot for it?',          'たくさん勉強した？',                 'study', (SELECT id FROM vocab_senses WHERE slug='study.v.learn'), ARRAY['study','cook','sleep','play']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 6, 'npc',  'Not enough! I need a better {book}.',    '足りなかった！もっといい本が要るな。','book', (SELECT id FROM vocab_senses WHERE slug='book.n.reading'), ARRAY['test','book','room','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 7, 'user', 'Same. Let''s take the next {test}, the exam next month, together.','だね。次のテスト、来月の試験を一緒に受けよう。','test', (SELECT id FROM vocab_senses WHERE slug='test.n.exam'), ARRAY['bus','class','trip','test']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='conversation'), 8, 'npc',  'Deal. We''ve got this!',                 '決まり。やれるよ！',                 NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 0, 'npc',  'Welcome! Would you like to join a {class}?','ようこそ！クラスに参加しますか？',   'class', (SELECT id FROM vocab_senses WHERE slug='class.n.lesson'), ARRAY['room','test','class','trip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 1, 'user', 'Yes! I want to {study} English here.',      'はい！ここで英語を勉強したいです。', 'study', (SELECT id FROM vocab_senses WHERE slug='study.v.learn'), ARRAY['work','sleep','study','travel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 2, 'npc',  'Wonderful. Do you have a {book} already?',  '素敵。もう本は持っていますか？',     'book', (SELECT id FROM vocab_senses WHERE slug='book.n.reading'), ARRAY['map','bag','key','book']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 3, 'user', 'Not yet. Is it {easy} enough for beginners?',      'まだです。初心者にも簡単ですか？',     'easy', (SELECT id FROM vocab_senses WHERE slug='easy.adj.simple'), ARRAY['far','easy','busy','hard']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 4, 'npc',  'Very gentle, don''t worry. Here''s your schedule.','とても優しいので大丈夫。これが予定表です。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 5, 'user', 'Thank you so much!',                        'どうもありがとうございます！',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='travel'), 6, 'npc',  'See you in class tomorrow!',                '明日クラスで会いましょう！',         NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 0, 'npc',  'Today''s training ends with a short test.', '今日の研修は最後に小テストがあります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 1, 'user', 'A test? Is it {hard}, tricky to pass?',                     'テスト？難しくて受かりにくい？',             'hard', (SELECT id FROM vocab_senses WHERE slug='hard.adj.difficult'), ARRAY['easy','hard','late','long']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 2, 'npc',  'Not too bad if you {study} the notes.',     'メモを勉強すれば大丈夫ですよ。',     'study', (SELECT id FROM vocab_senses WHERE slug='study.v.learn'), ARRAY['sleep','study','rush','skip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 3, 'user', 'Okay. Can I ask a {question}?',             'わかりました。質問してもいいですか？', 'question', (SELECT id FROM vocab_senses WHERE slug='question.n.query'), ARRAY['test','answer','break','question']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 4, 'npc',  'Of course, go ahead.',                      'もちろん、どうぞ。',                 NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 5, 'user', 'Will the {test} be online?',                'テストはオンラインですか？',         'test', (SELECT id FROM vocab_senses WHERE slug='test.n.exam'), ARRAY['class','call','test','trip']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 6, 'npc',  'Yes, right after lunch.',                   'はい、昼食のすぐあとに。',           NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 7, 'user', 'Got it. I''ll review before then.',         '了解です。それまでに復習します。',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-11') AND goal='business'), 8, 'npc',  'Great attitude!',                           'いい姿勢ですね！',                   NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-12.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 12 (new): "At the hotel"  (Unit 9, Travel and holidays)
-- ----------------------------------------------------------------------------
-- Words: key, night, stay, bag, floor, guest, breakfast, reception. All new.
-- American spelling, no em-dashes. Parked (published=FALSE) until Unit 9 fills
-- out. Reuses (played only): name, please, thanks, help, right.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('hotel', 'At the hotel', 'ホテル', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('key',       'key',       '/kiː/',        '/kiː/',        400, 1, FALSE, 'キー。/kiː/。'),
  ('night',     'night',     '/naɪt/',       '/naɪt/',       200, 1, FALSE, NULL),
  ('stay',      'stay',      '/steɪ/',       '/steɪ/',       300, 1, FALSE, 'ステイ。/steɪ/。'),
  ('bag',       'bag',       '/bæɡ/',        '/bæɡ/',        350, 1, TRUE,  'バッグ。/bæɡ/。母音は「ア」に近い。'),
  ('floor',     'floor',     '/flɔːr/',      '/flɔː/',       450, 1, FALSE, NULL),
  ('guest',     'guest',     '/ɡest/',       '/ɡest/',       600, 2, FALSE, 'ゲスト。/ɡest/。'),
  ('breakfast', 'breakfast', '/ˈbrekfəst/',  '/ˈbrekfəst/',  550, 2, FALSE, 'ブレックファスト。/ˈbrekfəst/。'),
  ('reception', 'reception', '/rɪˈsepʃən/',  '/rɪˈsepʃən/',  900, 2, FALSE, 'レセプション。/rɪˈsepʃən/。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='key'),       'key.n.lock',       1, TRUE, 'noun', '鍵',       'a small object that opens a lock or door', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='night'),     'night.n.time',     1, TRUE, 'noun', '夜',   'the dark part of the day; one night of a stay', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stay'),      'stay.v.remain',    1, TRUE, 'verb', '泊まる', 'to live somewhere for a short time, like a hotel', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bag'),       'bag.n.luggage',    1, TRUE, 'noun', 'かばん', 'a container you carry things in', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='floor'),     'floor.n.level',    1, TRUE, 'noun', '階',       'one level of a building', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='guest'),     'guest.n.visitor',  1, TRUE, 'noun', '客', 'a person who stays at a hotel or visits', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='breakfast'), 'breakfast.n.meal', 1, TRUE, 'noun', '朝食',     'the first meal of the day', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='reception'), 'reception.n.desk', 1, TRUE, 'noun', '受付', 'the desk where hotel guests check in', 'A2', 'ホテルの「フロント」は英語では reception / front desk。')
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('key','night','stay','bag','floor','guest','breakfast','reception')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='guest.n.visitor'), NULL, 'visitor', 'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='stay.v.remain'),   NULL, 'remain',  'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='hotel'
WHERE s.slug IN ('key.n.lock','night.n.time','stay.v.remain','bag.n.luggage','floor.n.level','guest.n.visitor','breakfast.n.meal','reception.n.desk')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-12', 9, 1, (SELECT id FROM vocab_categories WHERE slug='hotel'), 'At the hotel', 'ホテルにて', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-12'), s.id, x.ord
FROM (VALUES
  ('key.n.lock',0),('night.n.time',1),('stay.v.remain',2),('bag.n.luggage',3),
  ('floor.n.level',4),('guest.n.visitor',5),('breakfast.n.meal',6),('reception.n.desk',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-12'), 'travel',       0, 'Checking in',            'チェックイン',     'hotel', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-12'), 'business',     1, 'A work trip',            '出張',             'hotel', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-12'), 'conversation', 2, 'Telling a friend',       '友達に伝える',     'lobby', 'friend');

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 0, 'npc',  'Good evening! Do you have a reservation?',   'こんばんは！ご予約はありますか？',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 1, 'user', 'Yes, a room for two {night}s, please.',             'はい、2泊の部屋をお願いします。',         'night', (SELECT id FROM vocab_senses WHERE slug='night.n.time'), ARRAY['hour','night','day','week']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 2, 'npc',  'Perfect. Here is your room {key}.',          'かしこまりました。お部屋の鍵です。', 'key', (SELECT id FROM vocab_senses WHERE slug='key.n.lock'), ARRAY['bag','map','card','key']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 3, 'user', 'Thank you. Which {floor} is the room on?',   'ありがとう。部屋は何階ですか？',     'floor', (SELECT id FROM vocab_senses WHERE slug='floor.n.level'), ARRAY['side','street','door','floor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 4, 'npc',  'The third floor. The lift is on your right.','3階です。エレベーターは右手に。',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 5, 'user', 'Great. Could I {stay} one extra night?',     'いいですね。もう1泊できますか？',   'stay', (SELECT id FROM vocab_senses WHERE slug='stay.v.remain'), ARRAY['leave','call','move','stay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 6, 'npc',  'Of course, just let us know.',               'もちろん、お知らせください。',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='travel'), 7, 'user', 'Thanks so much!',                            'どうもありがとう！',                 NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 0, 'npc',  'Welcome. Are you here for business?',        'ようこそ。お仕事ですか？',           NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 1, 'user', 'Yes. Is {breakfast} in the morning included?',              'はい。朝の朝食は付いていますか？',       'breakfast', (SELECT id FROM vocab_senses WHERE slug='breakfast.n.meal'), ARRAY['breakfast','coffee','parking','dinner']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 2, 'npc',  'Yes, from seven. Need help with your {bag}?','はい、7時から。お荷物をお持ちしますか？', 'bag', (SELECT id FROM vocab_senses WHERE slug='bag.n.luggage'), ARRAY['bag','coat','box','key']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 3, 'user', 'No thanks. Where is {reception} in the morning?','大丈夫です。朝は受付はどこですか？', 'reception', (SELECT id FROM vocab_senses WHERE slug='reception.n.desk'), ARRAY['station','reception','garden','kitchen']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 4, 'npc',  'Right here by the door. Are you our only {guest} tonight?','こちら、ドアの横です。今夜のお客様はお一人ですか？', 'guest', (SELECT id FROM vocab_senses WHERE slug='guest.n.visitor'), ARRAY['guest','driver','friend','worker']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 5, 'user', 'A colleague is coming later too.',           '同僚も後で来ます。',                 NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='business'), 6, 'npc',  'Lovely. Enjoy your stay!',                   'かしこまりました。ごゆっくりどうぞ！', NULL, NULL, NULL);

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 0, 'npc',  'Hey! How''s the hotel?',                  'やあ！ホテルはどう？',               NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 1, 'user', 'Really nice. I''m here for three {night}s and two days.','すごくいいよ。2泊3日で来てるんだ。',       'night', (SELECT id FROM vocab_senses WHERE slug='night.n.time'), ARRAY['night','week','hour','day']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 2, 'npc',  'Nice! Is the morning {breakfast} any good?',      'いいね！朝の朝食はおいしい？',           'breakfast', (SELECT id FROM vocab_senses WHERE slug='breakfast.n.meal'), ARRAY['dinner','coffee','lunch','breakfast']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 3, 'user', 'Amazing. Where should I put my travel {bag}?',   '最高。旅行かばんはどこに置こう？',       'bag', (SELECT id FROM vocab_senses WHERE slug='bag.n.luggage'), ARRAY['book','coat','key','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 4, 'npc',  'Just leave it here. How long will you {stay}?','ここに置いて。どのくらい泊まるの？', 'stay', (SELECT id FROM vocab_senses WHERE slug='stay.v.remain'), ARRAY['pay','stay','walk','leave']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 5, 'user', 'Until Friday, then I go home.',            '金曜まで、それから帰るよ。',         NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-12') AND goal='conversation'), 6, 'npc',  'Let''s get dinner before you leave!',     '帰る前に夕飯食べようよ！',           NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-13.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 13 (new): "Not feeling well"  (Unit 10, Health and body)
-- ----------------------------------------------------------------------------
-- Words: sick, hurt, doctor, rest, better, help, medicine, fever. All new.
-- American spelling, no em-dashes. Parked (published=FALSE) until Unit 10 fills
-- out. Reuses (played only): tired, water, please, thanks, sorry.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('health', 'Not feeling well', '体調', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('sick',     'sick',     '/sɪk/',        '/sɪk/',        450, 1, FALSE, NULL),
  ('hurt',     'hurt',     '/hɜːrt/',      '/hɜːt/',       500, 1, FALSE, NULL),
  ('doctor',   'doctor',   '/ˈdɑːktər/',   '/ˈdɒktə/',     300, 1, FALSE, 'ドクター。/ˈdɑːktər/。'),
  ('rest',     'rest',     '/rest/',       '/rest/',       400, 1, FALSE, NULL),
  ('better',   'better',   '/ˈbetər/',     '/ˈbetə/',      200, 1, FALSE, NULL),
  ('help',     'help',     '/help/',       '/help/',       150, 1, FALSE, NULL),
  ('medicine', 'medicine', '/ˈmedɪsɪn/',   '/ˈmedsɪn/',    650, 2, FALSE, NULL),
  ('fever',    'fever',    '/ˈfiːvər/',    '/ˈfiːvə/',     800, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='sick'),     'sick.adj.ill',      1, TRUE, 'adjective', '具合が悪い', 'not well; ill', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hurt'),     'hurt.v.pain',       1, TRUE, 'verb',      '痛む',       'to feel pain in part of your body', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='doctor'),   'doctor.n.medic',    1, TRUE, 'noun',      '医者',       'a person whose job is to treat sick people', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='rest'),     'rest.v.relax',      1, TRUE, 'verb',      '休む',       'to stop activity so your body can recover', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='better'),   'better.adj.improved',1,TRUE, 'adjective', 'よくなった', 'less sick than before; improved', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='help'),     'help.v.assist',     1, TRUE, 'verb',      '助ける', 'to do something useful for someone', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='medicine'), 'medicine.n.drug',   1, TRUE, 'noun',      '薬',         'something you take to get better when sick', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fever'),    'fever.n.high',      1, TRUE, 'noun',      '熱',         'a high body temperature when you are ill', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('sick','hurt','doctor','rest','better','help','medicine','fever')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='sick.adj.ill'),  NULL, 'ill',    'near_synonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='help.v.assist'), NULL, 'assist', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='health'
WHERE s.slug IN ('sick.adj.ill','hurt.v.pain','doctor.n.medic','rest.v.relax','better.adj.improved','help.v.assist','medicine.n.drug','fever.n.high')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-13', 10, 1, (SELECT id FROM vocab_categories WHERE slug='health'), 'Not feeling well', '体調が悪い', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-13'), s.id, x.ord
FROM (VALUES
  ('sick.adj.ill',0),('hurt.v.pain',1),('doctor.n.medic',2),('rest.v.relax',3),
  ('better.adj.improved',4),('help.v.assist',5),('medicine.n.drug',6),('fever.n.high',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-13'), 'conversation', 0, 'A friend checks on you', '友達が心配する',   'home',     'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-13'), 'travel',       1, 'At the pharmacy',        '薬局で',           'pharmacy', 'pharmacist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-13'), 'business',     2, 'Calling in sick',        '欠勤の連絡',       'phone',    'boss');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 0, 'npc',  'You don''t look great. Are you okay?',   '元気なさそう。大丈夫？',             NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 1, 'user', 'Not really. I feel {sick}, like I might throw up.',             'あんまり。気持ち悪くて、吐きそう。',         'sick', (SELECT id FROM vocab_senses WHERE slug='sick.adj.ill'), ARRAY['happy','busy','free','sick']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 2, 'npc',  'Oh no. Where does it {hurt}?',           'あらら。どこが痛いの？',             'hurt', (SELECT id FROM vocab_senses WHERE slug='hurt.v.pain'), ARRAY['cook','rest','hurt','help']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 3, 'user', 'My head and throat. I need to {rest}.',  '頭とのど。休まないと。',             'rest', (SELECT id FROM vocab_senses WHERE slug='rest.v.relax'), ARRAY['run','study','rest','work']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 4, 'npc',  'Definitely. Lie down for a bit.',        'そうだね。少し横になって。',         NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 5, 'user', 'Thanks. I hope I feel {better}, not worse, tomorrow.','ありがとう。明日はよくなるといいな、悪化じゃなくて。','better', (SELECT id FROM vocab_senses WHERE slug='better.adj.improved'), ARRAY['better','worse','late','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 6, 'npc',  'Drink some water. Call me if you need anything.','お水を飲んで。何かあったら呼んでね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='conversation'), 7, 'user', 'You''re the best, thank you.',            '本当にありがとう。',                 NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 0, 'npc',  'Hello, how can I help you?',             'こんにちは、どうされましたか？',     NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 1, 'user', 'Hi. I think I have a {fever}; I feel very hot.',           'こんにちは。熱があるみたいで、体がすごく熱い。',     'fever', (SELECT id FROM vocab_senses WHERE slug='fever.n.high'), ARRAY['map','fever','key','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 2, 'npc',  'I see. Do you feel {sick}, like nausea, in the morning?','なるほど。朝、吐き気のような気持ち悪さは？',   'sick', (SELECT id FROM vocab_senses WHERE slug='sick.adj.ill'), ARRAY['glad','free','sick','late']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 3, 'user', 'Yes, a little. What {medicine} should I take?','はい、少し。どの薬を飲めば？',       'medicine', (SELECT id FROM vocab_senses WHERE slug='medicine.n.drug'), ARRAY['water','coffee','medicine','bread']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 4, 'npc',  'This one. Take it twice a day.',         'これです。1日2回飲んでください。',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 5, 'user', 'Thank you. Can you {help} me read the label?','ありがとう。ラベルを読むのを手伝ってもらえますか？', 'help', (SELECT id FROM vocab_senses WHERE slug='help.v.assist'), ARRAY['cook','pay','drive','help']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 6, 'npc',  'Of course. Rest well and drink water.',  'もちろん。よく休んで水分を。',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='travel'), 7, 'user', 'I will. Thanks a lot!',                  'そうします。どうもありがとう！',     NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 0, 'npc',  'Morning! Are you coming in today?',      'おはよう！今日は出社する？',         NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 1, 'user', 'Sorry, I''m too {sick} to work today.',              'すみません、体調が悪くて今日は働けません。',   'sick', (SELECT id FROM vocab_senses WHERE slug='sick.adj.ill'), ARRAY['sick','late','busy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 2, 'npc',  'Oh no. Have you seen a {doctor}?',       'あらら。医者には行った？',           'doctor', (SELECT id FROM vocab_senses WHERE slug='doctor.n.medic'), ARRAY['teacher','doctor','driver','guest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 3, 'user', 'Not yet. I just need to {rest}.',        'まだです。とにかく休みたくて。',     'rest', (SELECT id FROM vocab_senses WHERE slug='rest.v.relax'), ARRAY['work','run','drive','rest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 4, 'npc',  'Of course. Take the day off.',           'もちろん。今日は休んで。',           NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 5, 'user', 'Thank you. I''ll rest and feel {better} soon.',   'ありがとうございます。休んですぐよくなります。', 'better', (SELECT id FROM vocab_senses WHERE slug='better.adj.improved'), ARRAY['worse','tired','better','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 6, 'npc',  'Get well! We''ll manage here.',          'お大事に！こっちは大丈夫。',         NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-13') AND goal='business'), 7, 'user', 'I appreciate it.',                       '助かります。',                       NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-14.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 14 (new): "Weather"  (Unit 11, Weather and seasons)
-- ----------------------------------------------------------------------------
-- Words: hot, cold, rain, sunny, warm, outside, wind, umbrella. All new.
-- American spelling, no em-dashes. Parked (published=FALSE) until Unit 11 fills
-- out. Reuses (played only): nice, today, tomorrow.
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('weather', 'Weather', '天気', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('hot',      'hot',      '/hɑːt/',       '/hɒt/',        250, 1, FALSE, NULL),
  ('cold',     'cold',     '/koʊld/',      '/kəʊld/',      250, 1, FALSE, NULL),
  ('rain',     'rain',     '/reɪn/',       '/reɪn/',       400, 1, FALSE, NULL),
  ('sunny',    'sunny',    '/ˈsʌni/',      '/ˈsʌni/',      700, 2, FALSE, NULL),
  ('warm',     'warm',     '/wɔːrm/',      '/wɔːm/',       450, 1, FALSE, NULL),
  ('outside',  'outside',  '/ˌaʊtˈsaɪd/',  '/ˌaʊtˈsaɪd/',  400, 1, FALSE, NULL),
  ('wind',     'wind',     '/wɪnd/',       '/wɪnd/',       550, 2, FALSE, NULL),
  ('umbrella', 'umbrella', '/ʌmˈbrelə/',   '/ʌmˈbrelə/',   750, 2, FALSE, 'アンブレラ。/ʌmˈbrelə/。強勢は真ん中。')
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='hot'),      'hot.adj.temp',     1, TRUE, 'adjective', '暑い', 'having a high temperature', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cold'),     'cold.adj.chilly',  1, TRUE, 'adjective', '寒い', 'having a low temperature', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='rain'),     'rain.n.drops',     1, TRUE, 'noun',      '雨',       'water that falls from the clouds', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sunny'),    'sunny.adj.bright', 1, TRUE, 'adjective', '晴れた',   'with a lot of sun', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='warm'),     'warm.adj.mild',    1, TRUE, 'adjective', '暖かい',   'a little hot, in a pleasant way', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='outside'),  'outside.adv.out',  1, TRUE, 'adverb',    '外で', 'not inside a building', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wind'),     'wind.n.air',       1, TRUE, 'noun',      '風',       'air moving outside', 'A1', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='umbrella'), 'umbrella.n.rain',  1, TRUE, 'noun',      '傘',       'a thing you hold over you in the rain', 'A1', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('hot','cold','rain','sunny','warm','outside','wind','umbrella')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='hot.adj.temp'),    (SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), (SELECT id FROM vocab_senses WHERE slug='hot.adj.temp'),   NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='warm.adj.mild'),   NULL, 'hot', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='weather'
WHERE s.slug IN ('hot.adj.temp','cold.adj.chilly','rain.n.drops','sunny.adj.bright','warm.adj.mild','outside.adv.out','wind.n.air','umbrella.n.rain')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-14', 11, 1, (SELECT id FROM vocab_categories WHERE slug='weather'), 'Weather', '天気', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-14'), s.id, x.ord
FROM (VALUES
  ('hot.adj.temp',0),('cold.adj.chilly',1),('rain.n.drops',2),('sunny.adj.bright',3),
  ('warm.adj.mild',4),('outside.adv.out',5),('wind.n.air',6),('umbrella.n.rain',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-14'), 'conversation', 0, 'Small talk',           '天気の話',       'park',   'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-14'), 'travel',       1, 'Asking a local',       '地元の人に聞く', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-14'), 'business',     2, 'An event may change',  '予定が変わるかも', 'office', 'colleague');

-- Conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 0, 'npc',  'Beautiful day, isn''t it?',              'いい天気だね。',                     NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 1, 'user', 'Yes! It''s so {sunny}, not a single cloud.',           'うん！雲一つなくて、よく晴れてる。',         'sunny', (SELECT id FROM vocab_senses WHERE slug='sunny.adj.bright'), ARRAY['windy','cloudy','sunny','rainy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 2, 'npc',  'I know. It''s a little {hot} for me, I''m sweating.','だね。私にはちょっと暑くて、汗ばむよ。', 'hot', (SELECT id FROM vocab_senses WHERE slug='hot.adj.temp'), ARRAY['late','hot','near','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 3, 'user', 'Really? I think it''s pleasantly {warm}, not cold at all.', '本当？ちょうどよく暖かくて、全然寒くないよ。','warm', (SELECT id FROM vocab_senses WHERE slug='warm.adj.mild'), ARRAY['busy','warm','cold','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 4, 'npc',  'Ha, maybe. Yesterday was freezing {cold}; I wore my coat.',    'はは、かもね。昨日は凍えるほど寒くて、コートを着た。','cold', (SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), ARRAY['easy','free','hot','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 5, 'user', 'True! I like this weather much better.',  '確かに！今日の方がずっといいな。',   NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='conversation'), 6, 'npc',  'Same. Let''s sit and enjoy it.',         'だね。座って楽しもう。',             NULL, NULL, NULL);

-- Travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 0, 'npc',  'Enjoying your trip so far?',             '旅行は楽しんでる？',                 NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 1, 'user', 'Yes! Will there be {rain} tomorrow? I''d better pack an umbrella.',    'うん！明日は雨が降る？傘を用意しなきゃ。',         'rain', (SELECT id FROM vocab_senses WHERE slug='rain.n.drops'), ARRAY['snow','sun','wind','rain']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 2, 'npc',  'Maybe in the evening. Bring an {umbrella} so you stay dry.','夕方はあるかも。濡れないように傘を持って。', 'umbrella', (SELECT id FROM vocab_senses WHERE slug='umbrella.n.rain'), ARRAY['coat','bag','map','umbrella']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 3, 'user', 'Good idea. Is it usually {sunny} here, or grey and cloudy?',  'いいね。ここは普段晴れてる？それとも曇りがち？',     'sunny', (SELECT id FROM vocab_senses WHERE slug='sunny.adj.bright'), ARRAY['sunny','cold','rainy','late']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 4, 'npc',  'Most days, yes. Great for walking.',     'たいていはね。散歩にいいよ。',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 5, 'user', 'Perfect. I love being {outside} in the fresh air.',       '最高。外の新鮮な空気が好きなんだ。',     'outside', (SELECT id FROM vocab_senses WHERE slug='outside.adv.out'), ARRAY['alone','outside','busy','inside']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='travel'), 6, 'npc',  'Then you''ll love this town!',           'ならこの町を気に入るよ！',           NULL, NULL, NULL);

-- Business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 0, 'npc',  'Did you hear? The outdoor event might change.','聞いた？屋外イベントが変わるかも。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 1, 'user', 'Oh no. Is it the {rain}? It''s pouring outside.',               'えっ。雨のせい？外は土砂降り。',                   'rain', (SELECT id FROM vocab_senses WHERE slug='rain.n.drops'), ARRAY['sun','rain','heat','snow']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 2, 'npc',  'Partly. And the {wind} is strong; it''s blowing hats off.','半分は。それに風が強くて、帽子が飛ばされる。',   'wind', (SELECT id FROM vocab_senses WHERE slug='wind.n.air'), ARRAY['wind','floor','sun','street']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 3, 'user', 'That''s a shame. It''s also freezing {cold}; I can see my breath.',  '残念。しかも凍えるほど寒くて、息が白い。',         'cold', (SELECT id FROM vocab_senses WHERE slug='cold.adj.chilly'), ARRAY['cold','free','hot','easy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 4, 'npc',  'Right. In this weather we shouldn''t meet {outside}.','ですね。この天気だと外で集まらない方が。','outside', (SELECT id FROM vocab_senses WHERE slug='outside.adv.out'), ARRAY['early','late','outside','inside']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 5, 'user', 'Agreed. Let''s move it indoors.',        '賛成。室内に移そう。',               NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-14') AND goal='business'), 6, 'npc',  'I''ll email everyone now.',              '今みんなにメールするね。',           NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-15.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 15 (A2): "Describing people"  (Unit 1, People and introductions)
-- ----------------------------------------------------------------------------
-- Words (all new): tall, short, kind, funny, quiet, hair, friendly, young.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('describe-people', 'Describing people', '人の描写', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('tall', 'tall', NULL, NULL, NULL, 2, FALSE, NULL),
  ('short', 'short', NULL, NULL, NULL, 2, FALSE, NULL),
  ('kind', 'kind', NULL, NULL, NULL, 2, FALSE, NULL),
  ('funny', 'funny', NULL, NULL, NULL, 2, FALSE, NULL),
  ('quiet', 'quiet', NULL, NULL, NULL, 2, FALSE, NULL),
  ('hair', 'hair', NULL, NULL, NULL, 2, FALSE, NULL),
  ('friendly', 'friendly', NULL, NULL, NULL, 2, FALSE, NULL),
  ('young', 'young', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='tall'), 'tall.adj.height', 1, TRUE, 'adjective', '背が高い', 'having more than average height', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='short'), 'short.adj.height', 1, TRUE, 'adjective', '背が低い', 'small in height or length', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='kind'), 'kind.adj.nice', 1, TRUE, 'adjective', '親切な', 'caring and gentle toward others', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='funny'), 'funny.adj.humor', 1, TRUE, 'adjective', '面白い', 'making you laugh', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='quiet'), 'quiet.adj.calm', 1, TRUE, 'adjective', '静かな', 'not talking or making much noise', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hair'), 'hair.n.head', 1, TRUE, 'noun', '髪', 'the threads that grow on your head', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='friendly'), 'friendly.adj.warm', 1, TRUE, 'adjective', 'フレンドリーな', 'behaving in a warm, kind way', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='young'), 'young.adj.age', 1, TRUE, 'adjective', '若い', 'not old; early in life', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('tall','short','kind','funny','quiet','hair','friendly','young')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), (SELECT id FROM vocab_senses WHERE slug='short.adj.height'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='short.adj.height'), (SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='describe-people'
WHERE s.slug IN ('tall.adj.height','short.adj.height','kind.adj.nice','funny.adj.humor','quiet.adj.calm','hair.n.head','friendly.adj.warm','young.adj.age')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-15', 1, 4, (SELECT id FROM vocab_categories WHERE slug='describe-people'), 'Describing people', '人を描写する', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-15'), s.id, x.ord
FROM (VALUES
  ('tall.adj.height',0),('short.adj.height',1),('kind.adj.nice',2),('funny.adj.humor',3),('quiet.adj.calm',4),('hair.n.head',5),('friendly.adj.warm',6),('young.adj.age',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-15'), 'conversation', 0, 'Describing a friend', '友達の描写', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-15'), 'travel', 1, 'Meeting the host family', 'ホストファミリーに会う', 'guesthouse', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-15'), 'business', 2, 'A new coworker', '新しい同僚', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 0, 'npc', 'Have you met my friend Sam?', '私の友達サムに会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 1, 'user', 'I think so. Is he really {tall}, over six feet?', 'たぶん。彼、本当に背が高い？180センチ超え？', 'tall', (SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), ARRAY['kind','young','tall','short']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 2, 'npc', 'Yes! And super {funny} too, always cracking jokes.', 'うん！しかもすごく面白くて、いつも冗談を言ってる。', 'funny', (SELECT id FROM vocab_senses WHERE slug='funny.adj.humor'), ARRAY['quiet','sick','funny','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 3, 'user', 'Oh right. He''s very {kind}, always helping people.', 'そうだ。彼ってとても親切で、いつも人を助けてる。', 'kind', (SELECT id FROM vocab_senses WHERE slug='kind.adj.nice'), ARRAY['tall','kind','loud','cold']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 4, 'npc', 'So kind. A bit {quiet}, though; he rarely speaks up.', '本当に親切。でも少しおとなしくて、あまり自分から話さない。', 'quiet', (SELECT id FROM vocab_senses WHERE slug='quiet.adj.calm'), ARRAY['tall','young','funny','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 5, 'user', 'That''s okay. I like quiet people.', 'いいよ。静かな人は好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='conversation'), 6, 'npc', 'Me too. You''ll get along!', '私も。気が合うよ！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 0, 'npc', 'Welcome! Let me tell you about the family.', 'ようこそ！家族を紹介しますね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 1, 'user', 'Thank you! Are they {friendly} and welcoming?', 'ありがとう！みんなフレンドリーで歓迎してくれる？', 'friendly', (SELECT id FROM vocab_senses WHERE slug='friendly.adj.warm'), ARRAY['busy','angry','friendly','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 2, 'npc', 'Very! My daughter is {young}, just six.', 'とても！娘は若くて、まだ6歳。', 'young', (SELECT id FROM vocab_senses WHERE slug='young.adj.age'), ARRAY['kind','young','short','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 3, 'user', 'How sweet. And your son?', '可愛いですね。息子さんは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 4, 'npc', 'Tall, with long {hair} down to his shoulders.', '背が高くて、肩まで届く長い髪だよ。', 'hair', (SELECT id FROM vocab_senses WHERE slug='hair.n.head'), ARRAY['coat','hair','bag','eyes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 5, 'user', 'Got it. Is he {tall} like you, over six feet?', '了解。あなたみたいに背が高い？180超え？', 'tall', (SELECT id FROM vocab_senses WHERE slug='tall.adj.height'), ARRAY['quiet','young','short','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='travel'), 6, 'npc', 'Even taller! Come in.', 'もっと高いよ！どうぞ。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 0, 'npc', 'Have you met the new hire yet?', '新しい人にもう会った？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 1, 'user', 'Not yet. What''s she like?', 'まだ。どんな人？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 2, 'npc', 'Really {kind}; she helps everyone in the team.', 'とても親切で、チームのみんなを助けてくれる。', 'kind', (SELECT id FROM vocab_senses WHERE slug='kind.adj.nice'), ARRAY['late','tall','kind','loud']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 3, 'user', 'Nice. Is she {quiet} or outgoing?', 'いいね。おとなしい？それとも社交的？', 'quiet', (SELECT id FROM vocab_senses WHERE slug='quiet.adj.calm'), ARRAY['quiet','busy','young','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 4, 'npc', 'Pretty {friendly}, actually; she chats with everyone.', '実はかなりフレンドリーで、誰とでも話す。', 'friendly', (SELECT id FROM vocab_senses WHERE slug='friendly.adj.warm'), ARRAY['friendly','sick','angry','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 5, 'user', 'Great. Is she {short} or tall?', 'いいね。背は低い？高い？', 'short', (SELECT id FROM vocab_senses WHERE slug='short.adj.height'), ARRAY['young','short','tall','kind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-15') AND goal='business'), 6, 'npc', 'Quite short, but full of energy!', '結構小柄だけど元気いっぱい！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-16.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 16 (A2): "Your life & routine"  (Unit 1, People and introductions)
-- ----------------------------------------------------------------------------
-- Words (all new): usually, always, sometimes, never, often, weekend, morning, evening.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('life-routine', 'Your life and routine', '生活と習慣', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('usually', 'usually', NULL, NULL, NULL, 2, FALSE, NULL),
  ('always', 'always', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sometimes', 'sometimes', NULL, NULL, NULL, 2, FALSE, NULL),
  ('never', 'never', NULL, NULL, NULL, 2, FALSE, NULL),
  ('often', 'often', NULL, NULL, NULL, 2, FALSE, NULL),
  ('weekend', 'weekend', NULL, NULL, NULL, 2, FALSE, NULL),
  ('morning', 'morning', NULL, NULL, NULL, 2, FALSE, NULL),
  ('evening', 'evening', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='usually'), 'usually.adv.freq', 1, TRUE, 'adverb', 'たいてい', 'most of the time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='always'), 'always.adv.freq', 1, TRUE, 'adverb', 'いつも', 'every time; all the time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sometimes'), 'sometimes.adv.freq', 1, TRUE, 'adverb', '時々', 'on some occasions but not often', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='never'), 'never.adv.freq', 1, TRUE, 'adverb', '決して…ない', 'not at any time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='often'), 'often.adv.freq', 1, TRUE, 'adverb', 'よく', 'many times; frequently', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='weekend'), 'weekend.n.time', 1, TRUE, 'noun', '週末', 'Saturday and Sunday', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='morning'), 'morning.n.time', 1, TRUE, 'noun', '朝', 'the early part of the day', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='evening'), 'evening.n.time', 1, TRUE, 'noun', '夕方', 'the end of the day, before night', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('usually','always','sometimes','never','often','weekend','morning','evening')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='always.adv.freq'), (SELECT id FROM vocab_senses WHERE slug='never.adv.freq'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='never.adv.freq'), (SELECT id FROM vocab_senses WHERE slug='always.adv.freq'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='life-routine'
WHERE s.slug IN ('usually.adv.freq','always.adv.freq','sometimes.adv.freq','never.adv.freq','often.adv.freq','weekend.n.time','morning.n.time','evening.n.time')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-16', 1, 5, (SELECT id FROM vocab_categories WHERE slug='life-routine'), 'Your life & routine', '生活と習慣', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-16'), s.id, x.ord
FROM (VALUES
  ('usually.adv.freq',0),('always.adv.freq',1),('sometimes.adv.freq',2),('never.adv.freq',3),('often.adv.freq',4),('weekend.n.time',5),('morning.n.time',6),('evening.n.time',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-16'), 'conversation', 0, 'What do you do?', '何してるの？', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-16'), 'travel', 1, 'Your daily plans', '一日の予定', 'guesthouse', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-16'), 'business', 2, 'Work habits', '仕事の習慣', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 0, 'npc', 'What do you do in your free time?', '暇なときは何してるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 1, 'user', 'I {usually} read or walk, most evenings.', 'たいてい、ほとんどの晩は本を読むか散歩する。', 'usually', (SELECT id FROM vocab_senses WHERE slug='usually.adv.freq'), ARRAY['soon','late','never','usually']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 2, 'npc', 'Nice. Do you exercise?', 'いいね。運動する？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 3, 'user', 'I {always} run on Mondays, without fail.', '月曜は必ず走る。', 'always', (SELECT id FROM vocab_senses WHERE slug='always.adv.freq'), ARRAY['never','soon','late','always']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 4, 'npc', 'Wow. And on the weekend?', 'すごい。週末は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 5, 'user', 'On the {weekend} I relax at home.', '週末は家でのんびりする。', 'weekend', (SELECT id FROM vocab_senses WHERE slug='weekend.n.time'), ARRAY['night','morning','weekend','evening']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 6, 'npc', 'That sounds lovely.', 'いいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='conversation'), 7, 'user', 'Yeah, and I {sometimes} cook a big meal, maybe once a week.', 'うん、時々、週1回くらいごちそうを作る。', 'sometimes', (SELECT id FROM vocab_senses WHERE slug='sometimes.adv.freq'), ARRAY['never','always','early','sometimes']);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 0, 'npc', 'What are your plans while you stay here?', '滞在中の予定は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 1, 'user', 'In the {morning}, right after breakfast, I''d like to explore.', '朝、朝食のあとに散策したいです。', 'morning', (SELECT id FROM vocab_senses WHERE slug='morning.n.time'), ARRAY['weekend','evening','morning','night']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 2, 'npc', 'Good idea. And later?', 'いいですね。その後は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 3, 'user', 'In the {evening}, before bed, I usually rest.', '夕方、寝る前にたいてい休みます。', 'evening', (SELECT id FROM vocab_senses WHERE slug='evening.n.time'), ARRAY['morning','evening','noon','night']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 4, 'npc', 'Do you go out much?', 'よく出かけますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 5, 'user', 'I {often} try local food, almost every day.', 'よく、ほぼ毎日地元の料理を試します。', 'often', (SELECT id FROM vocab_senses WHERE slug='often.adv.freq'), ARRAY['never','often','late','soon']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 6, 'npc', 'You''ll love it here then.', 'ならここが気に入りますよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='travel'), 7, 'user', 'I {usually} do, most of the time! Thank you.', 'たいていはそうです！ありがとう。', 'usually', (SELECT id FROM vocab_senses WHERE slug='usually.adv.freq'), ARRAY['soon','usually','late','never']);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 0, 'npc', 'You''re so organized!', '本当にきちんとしてるね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 1, 'user', 'Thanks. I {always} plan my week, every single Sunday.', 'ありがとう。毎週日曜、必ず一週間を計画するの。', 'always', (SELECT id FROM vocab_senses WHERE slug='always.adv.freq'), ARRAY['never','late','rarely','always']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 2, 'npc', 'Do you ever work weekends?', '週末に働くことある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 3, 'user', 'No, I {never} work on Sundays.', 'いや、日曜は絶対働かない。', 'never', (SELECT id FROM vocab_senses WHERE slug='never.adv.freq'), ARRAY['soon','never','always','often']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 4, 'npc', 'Smart. Meetings?', '賢いね。会議は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 5, 'user', 'I {often} have them in the morning, several times a week.', 'よく、週に何度か午前中にあるよ。', 'often', (SELECT id FROM vocab_senses WHERE slug='often.adv.freq'), ARRAY['soon','never','often','rarely']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 6, 'npc', 'And you still relax on the {weekend}?', 'それでも週末は休むの？', 'weekend', (SELECT id FROM vocab_senses WHERE slug='weekend.n.time'), ARRAY['evening','weekend','morning','night']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-16') AND goal='business'), 7, 'user', 'Always! Balance matters.', 'いつもね！バランスが大事。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-17.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 17 (A2): "Friends & relationships"  (Unit 2, Feelings and relationships)
-- ----------------------------------------------------------------------------
-- Words (all new): know, remember, forget, together, argue, laugh, cry, trust.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('relationships', 'Friends and relationships', '友達と人間関係', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('know', 'know', NULL, NULL, NULL, 2, FALSE, NULL),
  ('remember', 'remember', NULL, NULL, NULL, 2, FALSE, NULL),
  ('forget', 'forget', NULL, NULL, NULL, 2, FALSE, NULL),
  ('together', 'together', NULL, NULL, NULL, 2, FALSE, NULL),
  ('argue', 'argue', NULL, NULL, NULL, 2, FALSE, NULL),
  ('laugh', 'laugh', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cry', 'cry', NULL, NULL, NULL, 2, FALSE, NULL),
  ('trust', 'trust', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='know'), 'know.v.aware', 1, TRUE, 'verb', '知っている', 'to have information about something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='remember'), 'remember.v.recall', 1, TRUE, 'verb', '覚えている', 'to keep something in your mind', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='forget'), 'forget.v.lose', 1, TRUE, 'verb', '忘れる', 'to fail to remember', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='together'), 'together.adv.joint', 1, TRUE, 'adverb', '一緒に', 'with each other', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='argue'), 'argue.v.fight', 1, TRUE, 'verb', '口論する', 'to disagree in an angry way', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='laugh'), 'laugh.v.joy', 1, TRUE, 'verb', '笑う', 'to make sounds because something is funny', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cry'), 'cry.v.tears', 1, TRUE, 'verb', '泣く', 'to have tears fall from your eyes', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='trust'), 'trust.v.faith', 1, TRUE, 'verb', '信頼する', 'to believe someone is honest and good', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('know','remember','forget','together','argue','laugh','cry','trust')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), (SELECT id FROM vocab_senses WHERE slug='forget.v.lose'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='forget.v.lose'), (SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='laugh.v.joy'), (SELECT id FROM vocab_senses WHERE slug='cry.v.tears'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='cry.v.tears'), (SELECT id FROM vocab_senses WHERE slug='laugh.v.joy'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='relationships'
WHERE s.slug IN ('know.v.aware','remember.v.recall','forget.v.lose','together.adv.joint','argue.v.fight','laugh.v.joy','cry.v.tears','trust.v.faith')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-17', 2, 2, (SELECT id FROM vocab_categories WHERE slug='relationships'), 'Friends & relationships', '友達と人間関係', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-17'), s.id, x.ord
FROM (VALUES
  ('know.v.aware',0),('remember.v.recall',1),('forget.v.lose',2),('together.adv.joint',3),('argue.v.fight',4),('laugh.v.joy',5),('cry.v.tears',6),('trust.v.faith',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-17'), 'conversation', 0, 'Old friends', '昔からの友達', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-17'), 'travel', 1, 'Making friends', '旅先で友達を作る', 'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-17'), 'business', 2, 'Clearing the air', 'わだかまりを解く', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 0, 'npc', 'How long have you and Mia been friends?', 'ミアとはどのくらいの付き合い？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 1, 'user', 'Years! We {know} everything about each other.', '何年も！お互い何でも知ってる。', 'know', (SELECT id FROM vocab_senses WHERE slug='know.v.aware'), ARRAY['leave','forget','meet','know']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 2, 'npc', 'Do you {remember} how you met?', 'どうやって出会ったか覚えてる？', 'remember', (SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), ARRAY['forget','trust','remember','argue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 3, 'user', 'Of course. We {laugh} about it now.', 'もちろん。今では笑い話。', 'laugh', (SELECT id FROM vocab_senses WHERE slug='laugh.v.joy'), ARRAY['leave','cry','laugh','argue']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 4, 'npc', 'Aw. Best friends are the best.', 'いいね。親友は最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 5, 'user', 'Yeah. She once made me {cry} happy tears.', 'うん。嬉し泣きさせられたこともある。', 'cry', (SELECT id FROM vocab_senses WHERE slug='cry.v.tears'), ARRAY['cry','sleep','shout','laugh']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='conversation'), 6, 'npc', 'That''s a real friend.', 'それが本当の友達だね。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 0, 'npc', 'First time staying in a hostel?', 'ホステルは初めて？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 1, 'user', 'Yes! Everyone seems friendly.', 'うん！みんなフレンドリーだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 2, 'npc', 'People {trust} each other here. It''s nice.', 'ここではみんな信頼し合ってる。いいよね。', 'trust', (SELECT id FROM vocab_senses WHERE slug='trust.v.faith'), ARRAY['argue','trust','forget','leave']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 3, 'user', 'Do you travel {together} with friends?', '友達と一緒に旅してるの？', 'together', (SELECT id FROM vocab_senses WHERE slug='together.adv.joint'), ARRAY['alone','apart','late','together']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 4, 'npc', 'Sometimes. Do you {know} anyone in town?', '時々。この町に知り合いいる？', 'know', (SELECT id FROM vocab_senses WHERE slug='know.v.aware'), ARRAY['meet','call','forget','know']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 5, 'npc', 'Do you ever {forget} people''s names?', '人の名前を忘れることある？', 'forget', (SELECT id FROM vocab_senses WHERE slug='forget.v.lose'), ARRAY['remember','know','forget','trust']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='travel'), 6, 'user', 'Ha, always! But let''s get dinner together.', 'はは、いつも！でも一緒に夕飯行こう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 0, 'npc', 'Can we talk about yesterday?', '昨日のこと話せる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 1, 'user', 'Sure. I didn''t mean to {argue}.', 'もちろん。言い争うつもりはなかった。', 'argue', (SELECT id FROM vocab_senses WHERE slug='argue.v.fight'), ARRAY['forget','argue','agree','laugh']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 2, 'npc', 'It''s okay. I still {trust} you.', '大丈夫。まだ信頼してるよ。', 'trust', (SELECT id FROM vocab_senses WHERE slug='trust.v.faith'), ARRAY['argue','leave','trust','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 3, 'user', 'Thanks. I value working {together}.', 'ありがとう。一緒に働けるのが嬉しい。', 'together', (SELECT id FROM vocab_senses WHERE slug='together.adv.joint'), ARRAY['away','apart','alone','together']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 4, 'npc', 'Me too. Do you {remember} Friday''s plan?', '私も。金曜の予定覚えてる？', 'remember', (SELECT id FROM vocab_senses WHERE slug='remember.v.recall'), ARRAY['know','argue','remember','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 5, 'user', 'Yes, it''s all set.', 'うん、準備万端。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-17') AND goal='business'), 6, 'npc', 'Great. No hard feelings.', 'よかった。しこりなしで。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-18.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 18 (A2): "Around town"  (Unit 3, Home and town)
-- ----------------------------------------------------------------------------
-- Words (all new): bank, park, library, market, corner, museum, shop, bridge.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('around-town', 'Around town', '町なか', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('bank', 'bank', NULL, NULL, NULL, 2, FALSE, NULL),
  ('park', 'park', NULL, NULL, NULL, 2, FALSE, NULL),
  ('library', 'library', NULL, NULL, NULL, 2, FALSE, NULL),
  ('market', 'market', NULL, NULL, NULL, 2, FALSE, NULL),
  ('corner', 'corner', NULL, NULL, NULL, 2, FALSE, NULL),
  ('museum', 'museum', NULL, NULL, NULL, 2, FALSE, NULL),
  ('shop', 'shop', NULL, NULL, NULL, 2, FALSE, NULL),
  ('bridge', 'bridge', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='bank'), 'bank.n.money', 1, TRUE, 'noun', '銀行', 'a place that keeps and lends money', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='park'), 'park.n.green', 1, TRUE, 'noun', '公園', 'an open green area in a town', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='library'), 'library.n.books', 1, TRUE, 'noun', '図書館', 'a place with books you can borrow', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='market'), 'market.n.stalls', 1, TRUE, 'noun', '市場', 'a place where people buy and sell goods', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='corner'), 'corner.n.turn', 1, TRUE, 'noun', '角', 'the place where two streets meet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='museum'), 'museum.n.art', 1, TRUE, 'noun', '博物館', 'a place that shows art or history', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shop'), 'shop.n.store', 1, TRUE, 'noun', '店', 'a place where you buy things', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bridge'), 'bridge.n.cross', 1, TRUE, 'noun', '橋', 'a structure built over a river or road', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('bank','park','library','market','corner','museum','shop','bridge')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='around-town'
WHERE s.slug IN ('bank.n.money','park.n.green','library.n.books','market.n.stalls','corner.n.turn','museum.n.art','shop.n.store','bridge.n.cross')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-18', 3, 4, (SELECT id FROM vocab_categories WHERE slug='around-town'), 'Around town', '町なか', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-18'), s.id, x.ord
FROM (VALUES
  ('bank.n.money',0),('park.n.green',1),('library.n.books',2),('market.n.stalls',3),('corner.n.turn',4),('museum.n.art',5),('shop.n.store',6),('bridge.n.cross',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-18'), 'travel', 0, 'Finding places', '場所を探す', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-18'), 'conversation', 1, 'A day out', 'お出かけ', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-18'), 'business', 2, 'Lunch spot', 'ランチの場所', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 0, 'npc', 'You look lost. Need help?', '迷ってる？手伝おうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 1, 'user', 'Yes! Where''s the nearest {bank} to change money?', 'はい！お金を両替する一番近い銀行は？', 'bank', (SELECT id FROM vocab_senses WHERE slug='bank.n.money'), ARRAY['shop','bank','museum','park']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 2, 'npc', 'Two streets down, on the {corner} where two roads meet.', '二本先、道が交わる角に。', 'corner', (SELECT id FROM vocab_senses WHERE slug='corner.n.turn'), ARRAY['corner','library','market','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 3, 'user', 'Thanks. Is there a {library} to borrow books nearby?', 'ありがとう。本を借りる図書館は近くに？', 'library', (SELECT id FROM vocab_senses WHERE slug='library.n.books'), ARRAY['bank','library','market','park']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 4, 'npc', 'Yes, next to the big {park} with the trees.', 'うん、木のある大きな公園の隣。', 'park', (SELECT id FROM vocab_senses WHERE slug='park.n.green'), ARRAY['shop','corner','park','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 5, 'user', 'Perfect, thank you so much!', '完璧、どうもありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='travel'), 6, 'npc', 'No problem. Enjoy the town!', 'どういたしまして。町を楽しんで！', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 0, 'npc', 'What should we do today?', '今日は何しよう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 1, 'user', 'Let''s visit the {market} to buy fresh food first.', 'まず市場で新鮮な食材を買おう。', 'market', (SELECT id FROM vocab_senses WHERE slug='market.n.stalls'), ARRAY['library','bank','market','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 2, 'npc', 'Good idea. Then the art {museum}?', 'いいね。それから美術館？', 'museum', (SELECT id FROM vocab_senses WHERE slug='museum.n.art'), ARRAY['park','bank','museum','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 3, 'user', 'Yes! And a little {shop} to buy gifts after.', 'うん！そのあと小さな店でお土産を。', 'shop', (SELECT id FROM vocab_senses WHERE slug='shop.n.store'), ARRAY['corner','shop','park','bank']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 4, 'npc', 'Sounds fun. Lunch on the grass in the {park}?', '楽しそう。公園の芝生でお昼？', 'park', (SELECT id FROM vocab_senses WHERE slug='park.n.green'), ARRAY['museum','market','park','shop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 5, 'user', 'Love it. Let''s go!', 'いいね。行こう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='conversation'), 6, 'npc', 'Best day ever.', '最高の一日。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 0, 'npc', 'Want to grab lunch nearby?', '近くでランチどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 1, 'user', 'Sure. There''s a good {shop} for sandwiches.', 'いいね。サンドイッチのいい店がある。', 'shop', (SELECT id FROM vocab_senses WHERE slug='shop.n.store'), ARRAY['shop','park','bank','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 2, 'npc', 'Where is it?', 'どこ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 3, 'user', 'Just past the {bank} where I get cash.', '現金をおろす銀行を過ぎたところ。', 'bank', (SELECT id FROM vocab_senses WHERE slug='bank.n.money'), ARRAY['museum','shop','park','bank']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 4, 'npc', 'Oh, near the {corner} where the streets meet?', '道が交わる角の近く？', 'corner', (SELECT id FROM vocab_senses WHERE slug='corner.n.turn'), ARRAY['corner','bridge','park','market']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 5, 'user', 'Yes, right after the {bridge} over the river.', '川にかかる橋のすぐ先。', 'bridge', (SELECT id FROM vocab_senses WHERE slug='bridge.n.cross'), ARRAY['park','corner','shop','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-18') AND goal='business'), 6, 'npc', 'Great, let''s go.', 'いいね、行こう。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-19.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 19 (A2): "Transport"  (Unit 3, Home and town)
-- ----------------------------------------------------------------------------
-- Words (all new): bus, train, ticket, stop, catch, ride, platform, seat.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('transport', 'Transport', '交通', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('bus', 'bus', NULL, NULL, NULL, 2, FALSE, NULL),
  ('train', 'train', NULL, NULL, NULL, 2, FALSE, NULL),
  ('ticket', 'ticket', NULL, NULL, NULL, 2, FALSE, NULL),
  ('stop', 'stop', NULL, NULL, NULL, 2, FALSE, NULL),
  ('catch', 'catch', NULL, NULL, NULL, 2, FALSE, NULL),
  ('ride', 'ride', NULL, NULL, NULL, 2, FALSE, NULL),
  ('platform', 'platform', NULL, NULL, NULL, 2, FALSE, NULL),
  ('seat', 'seat', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='bus'), 'bus.n.vehicle', 1, TRUE, 'noun', 'バス', 'a large road vehicle that carries many people', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='train'), 'train.n.rail', 1, TRUE, 'noun', '電車', 'a line of vehicles that runs on rails', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ticket'), 'ticket.n.pass', 1, TRUE, 'noun', '切符', 'a paper that lets you travel or enter', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stop'), 'stop.n.place', 1, TRUE, 'noun', '停留所', 'a place where a bus or train stops', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='catch'), 'catch.v.board', 1, TRUE, 'verb', '間に合う', 'to get on a bus or train in time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ride'), 'ride.n.trip', 1, TRUE, 'noun', '乗ること', 'a trip in a vehicle', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='platform'), 'platform.n.rail', 1, TRUE, 'noun', 'ホーム', 'the place where you get on a train', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='seat'), 'seat.n.place', 1, TRUE, 'noun', '席', 'a place to sit', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('bus','train','ticket','stop','catch','ride','platform','seat')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='transport'
WHERE s.slug IN ('bus.n.vehicle','train.n.rail','ticket.n.pass','stop.n.place','catch.v.board','ride.n.trip','platform.n.rail','seat.n.place')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-19', 3, 5, (SELECT id FROM vocab_categories WHERE slug='transport'), 'Transport', '交通', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-19'), s.id, x.ord
FROM (VALUES
  ('bus.n.vehicle',0),('train.n.rail',1),('ticket.n.pass',2),('stop.n.place',3),('catch.v.board',4),('ride.n.trip',5),('platform.n.rail',6),('seat.n.place',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-19'), 'travel', 0, 'Buying a ticket', '切符を買う', 'station', 'staff'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-19'), 'conversation', 1, 'Almost missed it', '危なかった', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-19'), 'business', 2, 'Commuting', '通勤', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 0, 'npc', 'Hello! Where are you traveling today?', 'こんにちは！今日はどちらまで？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 1, 'user', 'To the coast. One {ticket}, please.', '海岸まで。切符を一枚ください。', 'ticket', (SELECT id FROM vocab_senses WHERE slug='ticket.n.pass'), ARRAY['ticket','key','map','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 2, 'npc', 'Sure. The {train} leaves at ten.', 'かしこまりました。電車は10時発です。', 'train', (SELECT id FROM vocab_senses WHERE slug='train.n.rail'), ARRAY['ride','bus','stop','train']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 3, 'user', 'Which {platform} is it?', '何番ホームですか？', 'platform', (SELECT id FROM vocab_senses WHERE slug='platform.n.rail'), ARRAY['platform','corner','gate','street']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 4, 'npc', 'Platform three. Window {seat} okay?', '3番ホームです。窓側の席でいい？', 'seat', (SELECT id FROM vocab_senses WHERE slug='seat.n.place'), ARRAY['ticket','seat','room','floor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 5, 'user', 'Perfect, thank you!', '完璧、ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='travel'), 6, 'npc', 'Safe travels!', 'よい旅を！', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 0, 'npc', 'You made it! I thought you''d be late.', '間に合ったね！遅れるかと思った。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 1, 'user', 'I almost missed the {bus}!', 'もう少しでバスに乗り遅れるとこだった！', 'bus', (SELECT id FROM vocab_senses WHERE slug='bus.n.vehicle'), ARRAY['train','bus','seat','ticket']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 2, 'npc', 'Oh no. Did you run for it?', 'えっ。走ったの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 3, 'user', 'Yes, I just managed to {catch} it.', 'うん、なんとか乗れた。', 'catch', (SELECT id FROM vocab_senses WHERE slug='catch.v.board'), ARRAY['ride','miss','catch','stop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 4, 'npc', 'Where''s your {stop}?', 'どの停留所？', 'stop', (SELECT id FROM vocab_senses WHERE slug='stop.n.place'), ARRAY['seat','gate','corner','stop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 5, 'user', 'Right here. Short {ride} today.', 'ここだよ。今日は短い移動。', 'ride', (SELECT id FROM vocab_senses WHERE slug='ride.n.trip'), ARRAY['trip','ride','seat','walk']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='conversation'), 6, 'npc', 'Lucky you!', '運がいいね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 0, 'npc', 'How''s your commute?', '通勤はどう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 1, 'user', 'Long. I take the {train} every day.', '長い。毎日電車。', 'train', (SELECT id FROM vocab_senses WHERE slug='train.n.rail'), ARRAY['train','bus','seat','ride']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 2, 'npc', 'Do you get a seat?', '座れる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 3, 'user', 'Only if I {catch} the early one.', '早いのに乗れたときだけ。', 'catch', (SELECT id FROM vocab_senses WHERE slug='catch.v.board'), ARRAY['ride','miss','stop','catch']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 4, 'npc', 'Ah, the {seat} race!', 'ああ、席取り合戦ね！', 'seat', (SELECT id FROM vocab_senses WHERE slug='seat.n.place'), ARRAY['seat','ticket','room','stop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 5, 'user', 'Exactly. A long {ride} standing is rough.', 'そう。立ちっぱなしの長い移動はきつい。', 'ride', (SELECT id FROM vocab_senses WHERE slug='ride.n.trip'), ARRAY['ride','trip','seat','walk']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-19') AND goal='business'), 6, 'npc', 'Work from home Fridays?', '金曜は在宅にすれば？', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-20.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 20 (A2): "Chores"  (Unit 4, Daily life)
-- ----------------------------------------------------------------------------
-- Words (all new): clean, wash, tidy, mess, dishes, laundry, trash, sweep.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('chores', 'Chores', '家事', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('clean', 'clean', NULL, NULL, NULL, 2, FALSE, NULL),
  ('wash', 'wash', NULL, NULL, NULL, 2, FALSE, NULL),
  ('tidy', 'tidy', NULL, NULL, NULL, 2, FALSE, NULL),
  ('mess', 'mess', NULL, NULL, NULL, 2, FALSE, NULL),
  ('dishes', 'dishes', NULL, NULL, NULL, 2, FALSE, NULL),
  ('laundry', 'laundry', NULL, NULL, NULL, 2, FALSE, NULL),
  ('trash', 'trash', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sweep', 'sweep', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='clean'), 'clean.v.tidy', 1, TRUE, 'verb', '掃除する', 'to remove dirt and make something clean', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wash'), 'wash.v.clean', 1, TRUE, 'verb', '洗う', 'to clean something with water', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tidy'), 'tidy.v.order', 1, TRUE, 'verb', '片づける', 'to put things in their proper place', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mess'), 'mess.n.disorder', 1, TRUE, 'noun', '散らかり', 'a dirty or untidy state', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dishes'), 'dishes.n.plates', 1, TRUE, 'noun', '食器', 'the plates and bowls you eat from', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='laundry'), 'laundry.n.wash', 1, TRUE, 'noun', '洗濯物', 'clothes that need washing', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='trash'), 'trash.n.waste', 1, TRUE, 'noun', 'ゴミ', 'things you throw away', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sweep'), 'sweep.v.broom', 1, TRUE, 'verb', '掃く', 'to clean a floor with a brush', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('clean','wash','tidy','mess','dishes','laundry','trash','sweep')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='chores'
WHERE s.slug IN ('clean.v.tidy','wash.v.clean','tidy.v.order','mess.n.disorder','dishes.n.plates','laundry.n.wash','trash.n.waste','sweep.v.broom')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-20', 4, 4, (SELECT id FROM vocab_categories WHERE slug='chores'), 'Chores', '家事', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-20'), s.id, x.ord
FROM (VALUES
  ('clean.v.tidy',0),('wash.v.clean',1),('tidy.v.order',2),('mess.n.disorder',3),('dishes.n.plates',4),('laundry.n.wash',5),('trash.n.waste',6),('sweep.v.broom',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-20'), 'conversation', 0, 'Splitting chores', '家事の分担', 'home', 'roommate'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-20'), 'travel', 1, 'House rules', '家のルール', 'guesthouse', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-20'), 'business', 2, 'Tidy the office', 'オフィスを片づける', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 0, 'npc', 'Should we split the chores?', '家事を分担しない？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 1, 'user', 'Sure. I''ll {clean} the kitchen until it shines.', 'いいよ。台所をピカピカに掃除する。', 'clean', (SELECT id FROM vocab_senses WHERE slug='clean.v.tidy'), ARRAY['sleep','cook','clean','mess']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 2, 'npc', 'Great. I''ll wash the {dishes} in the sink.', 'じゃあシンクで食器を洗うよ。', 'dishes', (SELECT id FROM vocab_senses WHERE slug='dishes.n.plates'), ARRAY['trash','floor','laundry','dishes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 3, 'user', 'Can you take out the {trash} to the bin too?', 'ゴミをゴミ箱に出してくれる？', 'trash', (SELECT id FROM vocab_senses WHERE slug='trash.n.waste'), ARRAY['trash','box','bag','dishes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 4, 'npc', 'Sure. Who washes the {laundry}, the clothes?', 'いいよ。洗濯物（服）は誰が洗う？', 'laundry', (SELECT id FROM vocab_senses WHERE slug='laundry.n.wash'), ARRAY['dishes','mess','trash','laundry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 5, 'user', 'Let''s take turns.', '交代でやろう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='conversation'), 6, 'npc', 'Deal!', '決まり！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 0, 'npc', 'A few house rules, if that''s okay.', '家のルールをいくつか、いい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 1, 'user', 'Of course.', 'もちろん。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 2, 'npc', 'Please {tidy} your room each day.', '毎日部屋を片づけてね。', 'tidy', (SELECT id FROM vocab_senses WHERE slug='tidy.v.order'), ARRAY['cook','break','mess','tidy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 3, 'user', 'No problem. Should I {wash} my dishes?', '了解。食器は洗いますか？', 'wash', (SELECT id FROM vocab_senses WHERE slug='wash.v.clean'), ARRAY['wash','throw','break','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 4, 'npc', 'Yes please. Don''t leave a {mess}.', 'お願いね。散らかさないで。', 'mess', (SELECT id FROM vocab_senses WHERE slug='mess.n.disorder'), ARRAY['mess','plan','noise','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 5, 'user', 'Understood. I''ll even {sweep} the floor.', '分かりました。床も掃きます。', 'sweep', (SELECT id FROM vocab_senses WHERE slug='sweep.v.broom'), ARRAY['cook','wash','sweep','drive']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='travel'), 6, 'npc', 'Wonderful! Thank you.', '素晴らしい！ありがとう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 0, 'npc', 'The office is a bit messy today.', '今日はオフィスが少し散らかってる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 1, 'user', 'Let''s {clean} up so the room looks neat.', '部屋がきれいに見えるよう片づけよう。', 'clean', (SELECT id FROM vocab_senses WHERE slug='clean.v.tidy'), ARRAY['break','clean','mess','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 2, 'npc', 'Good call. I''ll empty the {trash} can.', 'いいね。ゴミ箱を空にする。', 'trash', (SELECT id FROM vocab_senses WHERE slug='trash.n.waste'), ARRAY['trash','dishes','box','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 3, 'user', 'And I''ll {tidy} the desks and put things away.', '机を片づけて物をしまうよ。', 'tidy', (SELECT id FROM vocab_senses WHERE slug='tidy.v.order'), ARRAY['tidy','cook','break','mess']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 4, 'npc', 'Someone left dirty {dishes} in the sink.', '誰かが汚れた食器をシンクに置いてる。', 'dishes', (SELECT id FROM vocab_senses WHERE slug='dishes.n.plates'), ARRAY['floor','laundry','trash','dishes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 5, 'user', 'I''ll wash them quickly.', 'さっと洗うよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-20') AND goal='business'), 6, 'npc', 'Thanks, team!', 'ありがとう、みんな！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-21.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 21 (A2): "Supermarket"  (Unit 5, Food and eating)
-- ----------------------------------------------------------------------------
-- Words (all new): fresh, bottle, box, heavy, light, fruit, vegetable, list.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('supermarket', 'Supermarket', 'スーパー', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('fresh', 'fresh', NULL, NULL, NULL, 2, FALSE, NULL),
  ('bottle', 'bottle', NULL, NULL, NULL, 2, FALSE, NULL),
  ('box', 'box', NULL, NULL, NULL, 2, FALSE, NULL),
  ('heavy', 'heavy', NULL, NULL, NULL, 2, FALSE, NULL),
  ('light', 'light', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fruit', 'fruit', NULL, NULL, NULL, 2, FALSE, NULL),
  ('vegetable', 'vegetable', NULL, NULL, NULL, 2, FALSE, NULL),
  ('list', 'list', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='fresh'), 'fresh.adj.new', 1, TRUE, 'adjective', '新鮮な', 'recently made or picked; not old', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bottle'), 'bottle.n.container', 1, TRUE, 'noun', 'ボトル', 'a tall container for liquids', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='box'), 'box.n.container', 1, TRUE, 'noun', '箱', 'a container with straight sides', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='heavy'), 'heavy.adj.weight', 1, TRUE, 'adjective', '重い', 'weighing a lot', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='light'), 'light.adj.weight', 1, TRUE, 'adjective', '軽い', 'not weighing much', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fruit'), 'fruit.n.food', 1, TRUE, 'noun', '果物', 'sweet food that grows on plants, like apples', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='vegetable'), 'vegetable.n.food', 1, TRUE, 'noun', '野菜', 'a plant grown for food, like carrots', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='list'), 'list.n.items', 1, TRUE, 'noun', 'リスト', 'items written one under another', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('fresh','bottle','box','heavy','light','fruit','vegetable','list')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='heavy.adj.weight'), (SELECT id FROM vocab_senses WHERE slug='light.adj.weight'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='light.adj.weight'), (SELECT id FROM vocab_senses WHERE slug='heavy.adj.weight'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='supermarket'
WHERE s.slug IN ('fresh.adj.new','bottle.n.container','box.n.container','heavy.adj.weight','light.adj.weight','fruit.n.food','vegetable.n.food','list.n.items')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-21', 5, 2, (SELECT id FROM vocab_categories WHERE slug='supermarket'), 'Supermarket', 'スーパーマーケット', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-21'), s.id, x.ord
FROM (VALUES
  ('fresh.adj.new',0),('bottle.n.container',1),('box.n.container',2),('heavy.adj.weight',3),('light.adj.weight',4),('fruit.n.food',5),('vegetable.n.food',6),('list.n.items',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-21'), 'conversation', 0, 'Grocery run', '買い出し', 'supermarket', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-21'), 'travel', 1, 'At the market', '市場で', 'market', 'vendor'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-21'), 'business', 2, 'Office supplies', 'オフィス用品', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 0, 'npc', 'What''s on the shopping {list}?', '買い物リストには何がある？', 'list', (SELECT id FROM vocab_senses WHERE slug='list.n.items'), ARRAY['list','bottle','bag','box']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 1, 'user', 'We need sweet {fruit} like apples, and milk.', 'りんごみたいな甘い果物と、牛乳が要る。', 'fruit', (SELECT id FROM vocab_senses WHERE slug='fruit.n.food'), ARRAY['bread','fruit','rice','water']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 2, 'npc', 'Let''s get some fresh {vegetable}s like carrots too.', 'にんじんみたいな新鮮な野菜も買おう。', 'vegetable', (SELECT id FROM vocab_senses WHERE slug='vegetable.n.food'), ARRAY['box','bottle','vegetable','fruit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 3, 'user', 'Good. These look really {fresh}, picked today.', 'いいね。これ、今日採れたみたいで新鮮。', 'fresh', (SELECT id FROM vocab_senses WHERE slug='fresh.adj.new'), ARRAY['heavy','fresh','cheap','old']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 4, 'npc', 'Perfect. Anything else?', '完璧。他には？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 5, 'user', 'Just eggs. Let''s check out.', '卵だけ。会計しよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='conversation'), 6, 'npc', 'Right behind you.', 'すぐ後ろにいるよ。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 0, 'npc', 'Morning! Everything is {fresh}, picked this morning.', 'おはよう！全部、今朝採れたばかりで新鮮だよ。', 'fresh', (SELECT id FROM vocab_senses WHERE slug='fresh.adj.new'), ARRAY['old','dry','fresh','heavy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 1, 'user', 'Great! Some sweet {fruit}, please.', 'いいね！甘い果物をください。', 'fruit', (SELECT id FROM vocab_senses WHERE slug='fruit.n.food'), ARRAY['fruit','rice','bread','water']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 2, 'npc', 'Here. Also a {bottle} of juice?', 'はい。ジュースも一本どう？', 'bottle', (SELECT id FROM vocab_senses WHERE slug='bottle.n.container'), ARRAY['box','bag','bottle','list']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 3, 'user', 'Yes. Is the bag too {heavy} to carry?', 'うん。袋は重くて持てない？', 'heavy', (SELECT id FROM vocab_senses WHERE slug='heavy.adj.weight'), ARRAY['cheap','heavy','light','small']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 4, 'npc', 'A little. Want two bags?', '少し。袋二つにする？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 5, 'user', 'Please. Thank you!', 'お願い。ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='travel'), 6, 'npc', 'Enjoy!', 'どうぞ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 0, 'npc', 'The supply order arrived.', '備品の注文が届いたよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 1, 'user', 'Great. What''s in the cardboard {box}?', 'いいね。その段ボール箱に何が入ってる？', 'box', (SELECT id FROM vocab_senses WHERE slug='box.n.container'), ARRAY['list','box','bottle','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 2, 'npc', 'Paper and pens. Here''s the {list}.', '紙とペン。これがリスト。', 'list', (SELECT id FROM vocab_senses WHERE slug='list.n.items'), ARRAY['list','bag','box','bottle']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 3, 'user', 'This box is so {heavy}, I can''t lift it!', 'この箱すごく重くて、持ち上がらない！', 'heavy', (SELECT id FROM vocab_senses WHERE slug='heavy.adj.weight'), ARRAY['light','heavy','cheap','small']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 4, 'npc', 'That one''s {light}, though.', 'でもそっちは軽いよ。', 'light', (SELECT id FROM vocab_senses WHERE slug='light.adj.weight'), ARRAY['dark','heavy','light','big']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 5, 'user', 'I''ll carry it.', '運ぶよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-21') AND goal='business'), 6, 'npc', 'Thanks!', 'ありがとう！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-22.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 22 (A2): "Cooking"  (Unit 5, Food and eating)
-- ----------------------------------------------------------------------------
-- Words (all new): cut, add, mix, taste, boil, fry, recipe, plate.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('cooking', 'Cooking', '料理', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('cut', 'cut', NULL, NULL, NULL, 2, FALSE, NULL),
  ('add', 'add', NULL, NULL, NULL, 2, FALSE, NULL),
  ('mix', 'mix', NULL, NULL, NULL, 2, FALSE, NULL),
  ('taste', 'taste', NULL, NULL, NULL, 2, FALSE, NULL),
  ('boil', 'boil', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fry', 'fry', NULL, NULL, NULL, 2, FALSE, NULL),
  ('recipe', 'recipe', NULL, NULL, NULL, 2, FALSE, NULL),
  ('plate', 'plate', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='cut'), 'cut.v.knife', 1, TRUE, 'verb', '切る', 'to divide something with a knife', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='add'), 'add.v.put', 1, TRUE, 'verb', '加える', 'to put something with something else', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mix'), 'mix.v.stir', 1, TRUE, 'verb', '混ぜる', 'to stir things together', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='taste'), 'taste.v.try', 1, TRUE, 'verb', '味見する', 'to try a small amount of food', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='boil'), 'boil.v.heat', 1, TRUE, 'verb', '茹でる', 'to heat water or food until it bubbles', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fry'), 'fry.v.pan', 1, TRUE, 'verb', '炒める', 'to cook food in hot oil', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='recipe'), 'recipe.n.food', 1, TRUE, 'noun', 'レシピ', 'instructions for making a dish', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='plate'), 'plate.n.dish', 1, TRUE, 'noun', '皿', 'a flat dish you put food on', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('cut','add','mix','taste','boil','fry','recipe','plate')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='cooking'
WHERE s.slug IN ('cut.v.knife','add.v.put','mix.v.stir','taste.v.try','boil.v.heat','fry.v.pan','recipe.n.food','plate.n.dish')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-22', 5, 3, (SELECT id FROM vocab_categories WHERE slug='cooking'), 'Cooking', '料理', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-22'), s.id, x.ord
FROM (VALUES
  ('cut.v.knife',0),('add.v.put',1),('mix.v.stir',2),('taste.v.try',3),('boil.v.heat',4),('fry.v.pan',5),('recipe.n.food',6),('plate.n.dish',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-22'), 'conversation', 0, 'Cooking together', '一緒に料理', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-22'), 'travel', 1, 'A local dish', '地元の料理', 'guesthouse', 'host'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-22'), 'business', 2, 'Team lunch', 'チームランチ', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 0, 'npc', 'Thanks for helping me cook!', '料理手伝ってくれてありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 1, 'user', 'Of course! Should I {cut} the onions into small pieces?', 'もちろん！玉ねぎを小さく切ろうか？', 'cut', (SELECT id FROM vocab_senses WHERE slug='cut.v.knife'), ARRAY['boil','cut','mix','wash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 2, 'npc', 'Yes. Then {add} them to the pan.', 'うん。それからフライパンに入れて。', 'add', (SELECT id FROM vocab_senses WHERE slug='add.v.put'), ARRAY['add','taste','cut','wash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 3, 'user', 'Okay. Now I''ll {mix} everything.', '了解。全部混ぜるね。', 'mix', (SELECT id FROM vocab_senses WHERE slug='mix.v.stir'), ARRAY['boil','mix','fry','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 4, 'npc', 'Can you {taste} it? Enough salt?', '味見してくれる？塩は足りてる？', 'taste', (SELECT id FROM vocab_senses WHERE slug='taste.v.try'), ARRAY['mix','add','cut','taste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 5, 'user', 'Mmm, it''s perfect.', 'んー、完璧。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='conversation'), 6, 'npc', 'You''re a natural!', '才能あるね！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 0, 'npc', 'Tonight I''ll teach you a local dish.', '今夜は地元の料理を教えるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 1, 'user', 'Exciting! Is the {recipe} hard?', '楽しみ！レシピは難しい？', 'recipe', (SELECT id FROM vocab_senses WHERE slug='recipe.n.food'), ARRAY['list','plate','bottle','recipe']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 2, 'npc', 'No. First we {boil} the noodles in hot water.', 'いいえ。まず麺を熱湯で茹でます。', 'boil', (SELECT id FROM vocab_senses WHERE slug='boil.v.heat'), ARRAY['mix','boil','fry','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 3, 'user', 'And the vegetables?', '野菜は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 4, 'npc', 'We {fry} them quickly in oil.', '油でさっと炒めます。', 'fry', (SELECT id FROM vocab_senses WHERE slug='fry.v.pan'), ARRAY['cut','wash','boil','fry']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 5, 'user', 'It smells amazing. Can I {taste}?', 'いい匂い。味見していい？', 'taste', (SELECT id FROM vocab_senses WHERE slug='taste.v.try'), ARRAY['add','cut','taste','mix']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='travel'), 6, 'npc', 'Go ahead!', 'どうぞ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 0, 'npc', 'Everyone brought food for the potluck!', 'みんな持ち寄りで料理を持ってきた！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 1, 'user', 'Nice! Put it on this {plate}.', 'いいね！この皿に置いて。', 'plate', (SELECT id FROM vocab_senses WHERE slug='plate.n.dish'), ARRAY['plate','list','box','bottle']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 2, 'npc', 'Should I {add} some sauce?', 'ソースを足す？', 'add', (SELECT id FROM vocab_senses WHERE slug='add.v.put'), ARRAY['add','wash','cut','taste']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 3, 'user', 'Sure. Then {mix} and toss the salad.', 'うん。それからサラダを混ぜ合わせて。', 'mix', (SELECT id FROM vocab_senses WHERE slug='mix.v.stir'), ARRAY['boil','fry','cut','mix']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 4, 'npc', 'Can you {cut} the bread?', 'パンを切ってくれる？', 'cut', (SELECT id FROM vocab_senses WHERE slug='cut.v.knife'), ARRAY['boil','wash','mix','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 5, 'user', 'On it!', '了解！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-22') AND goal='business'), 6, 'npc', 'This looks great.', 'おいしそう。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-23.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 23 (A2): "Clothes & sizes"  (Unit 6, Shopping and money)
-- ----------------------------------------------------------------------------
-- Words (all new): wear, jacket, shoes, tight, loose, shirt, hat, fit.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('clothes', 'Clothes and sizes', '服とサイズ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('wear', 'wear', NULL, NULL, NULL, 2, FALSE, NULL),
  ('jacket', 'jacket', NULL, NULL, NULL, 2, FALSE, NULL),
  ('shoes', 'shoes', NULL, NULL, NULL, 2, FALSE, NULL),
  ('tight', 'tight', NULL, NULL, NULL, 2, FALSE, NULL),
  ('loose', 'loose', NULL, NULL, NULL, 2, FALSE, NULL),
  ('shirt', 'shirt', NULL, NULL, NULL, 2, FALSE, NULL),
  ('hat', 'hat', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fit', 'fit', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='wear'), 'wear.v.clothes', 1, TRUE, 'verb', '着る', 'to have clothes on your body', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='jacket'), 'jacket.n.clothes', 1, TRUE, 'noun', 'ジャケット', 'a short coat', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shoes'), 'shoes.n.clothes', 1, TRUE, 'noun', '靴', 'things you wear on your feet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tight'), 'tight.adj.fit', 1, TRUE, 'adjective', 'きつい', 'fitting too closely', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='loose'), 'loose.adj.fit', 1, TRUE, 'adjective', 'ゆるい', 'not tight; fitting freely', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='shirt'), 'shirt.n.clothes', 1, TRUE, 'noun', 'シャツ', 'a top with a collar and sleeves', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hat'), 'hat.n.clothes', 1, TRUE, 'noun', '帽子', 'something you wear on your head', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fit'), 'fit.v.size', 1, TRUE, 'verb', '（サイズが）合う', 'to be the right size', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('wear','jacket','shoes','tight','loose','shirt','hat','fit')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), (SELECT id FROM vocab_senses WHERE slug='loose.adj.fit'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='loose.adj.fit'), (SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='clothes'
WHERE s.slug IN ('wear.v.clothes','jacket.n.clothes','shoes.n.clothes','tight.adj.fit','loose.adj.fit','shirt.n.clothes','hat.n.clothes','fit.v.size')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-23', 6, 2, (SELECT id FROM vocab_categories WHERE slug='clothes'), 'Clothes & sizes', '服とサイズ', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-23'), s.id, x.ord
FROM (VALUES
  ('wear.v.clothes',0),('jacket.n.clothes',1),('shoes.n.clothes',2),('tight.adj.fit',3),('loose.adj.fit',4),('shirt.n.clothes',5),('hat.n.clothes',6),('fit.v.size',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-23'), 'travel', 0, 'Trying clothes on', '試着', 'shop', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-23'), 'conversation', 1, 'What to wear', '何を着る', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-23'), 'business', 2, 'Dress code', '服装規定', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 0, 'npc', 'Can I help you find a size?', 'サイズをお探ししましょうか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 1, 'user', 'Yes. Does this collared {shirt} come in medium?', 'はい。この襟付きシャツ、Mサイズある？', 'shirt', (SELECT id FROM vocab_senses WHERE slug='shirt.n.clothes'), ARRAY['jacket','shoes','hat','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 2, 'npc', 'Here. How does it {fit}?', 'どうぞ。サイズは合う？', 'fit', (SELECT id FROM vocab_senses WHERE slug='fit.v.size'), ARRAY['wear','cut','buy','fit']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 3, 'user', 'A bit {tight}; I can barely move my arms.', '少しきつくて、腕がほとんど動かせない。', 'tight', (SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), ARRAY['loose','heavy','big','tight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 4, 'npc', 'Try a large. And these {shoes}?', 'Lを試して。この靴は？', 'shoes', (SELECT id FROM vocab_senses WHERE slug='shoes.n.clothes'), ARRAY['hat','jacket','shoes','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 5, 'user', 'They''re comfy. I''ll take both.', '履き心地いい。両方買う。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='travel'), 6, 'npc', 'Great choice!', 'いい選択！', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 0, 'npc', 'What are you going to {wear} tonight?', '今夜は何を着るの？', 'wear', (SELECT id FROM vocab_senses WHERE slug='wear.v.clothes'), ARRAY['buy','fold','wash','wear']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 1, 'user', 'Maybe my blue {jacket} over a shirt.', 'シャツの上に青いジャケットかな。', 'jacket', (SELECT id FROM vocab_senses WHERE slug='jacket.n.clothes'), ARRAY['jacket','shirt','hat','shoes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 2, 'npc', 'Nice. With a {hat} on your head?', 'いいね。頭に帽子をかぶる？', 'hat', (SELECT id FROM vocab_senses WHERE slug='hat.n.clothes'), ARRAY['jacket','shoes','hat','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 3, 'user', 'No, hats look weird on me.', 'いや、帽子は似合わない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 4, 'npc', 'Ha! What about that shirt?', 'はは！あのシャツは？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 5, 'user', 'It''s too {loose} now; it slips off my shoulders.', '今はゆるすぎて、肩からずり落ちる。', 'loose', (SELECT id FROM vocab_senses WHERE slug='loose.adj.fit'), ARRAY['short','loose','heavy','tight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='conversation'), 6, 'npc', 'The jacket it is!', 'じゃあジャケットで！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 0, 'npc', 'What''s the dress code Friday?', '金曜の服装は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 1, 'user', 'Casual. You can {wear} anything neat.', 'カジュアル。清潔ならなんでもいい。', 'wear', (SELECT id FROM vocab_senses WHERE slug='wear.v.clothes'), ARRAY['fold','wash','buy','wear']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 2, 'npc', 'Is a {jacket} needed to stay warm?', '暖かくするのにジャケットは要る？', 'jacket', (SELECT id FROM vocab_senses WHERE slug='jacket.n.clothes'), ARRAY['shirt','jacket','hat','shoes']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 3, 'user', 'A nice {shirt} with a collar is fine.', '襟付きのきれいなシャツで大丈夫。', 'shirt', (SELECT id FROM vocab_senses WHERE slug='shirt.n.clothes'), ARRAY['jacket','shoes','hat','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 4, 'npc', 'Good. Ties feel too {tight} around the neck anyway.', 'よかった。ネクタイは首がきつすぎるし。', 'tight', (SELECT id FROM vocab_senses WHERE slug='tight.adj.fit'), ARRAY['heavy','loose','big','tight']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 5, 'user', 'Agreed!', '賛成！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-23') AND goal='business'), 6, 'npc', 'See you Friday.', '金曜にね。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-24.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 24 (A2): "Paying"  (Unit 6, Shopping and money)
-- ----------------------------------------------------------------------------
-- Words (all new): pay, cost, change, card, cash, receipt, price, expensive.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('paying', 'Paying', '支払い', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pay', 'pay', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cost', 'cost', NULL, NULL, NULL, 2, FALSE, NULL),
  ('change', 'change', NULL, NULL, NULL, 2, FALSE, NULL),
  ('card', 'card', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cash', 'cash', NULL, NULL, NULL, 2, FALSE, NULL),
  ('receipt', 'receipt', NULL, NULL, NULL, 2, FALSE, NULL),
  ('price', 'price', NULL, NULL, NULL, 2, FALSE, NULL),
  ('expensive', 'expensive', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pay'), 'pay.v.money', 1, TRUE, 'verb', '支払う', 'to give money for something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cost'), 'cost.v.price', 1, TRUE, 'verb', '（費用が）かかる', 'to have a certain price', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='change'), 'change.n.money', 1, TRUE, 'noun', 'お釣り', 'money returned when you pay too much', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='card'), 'card.n.pay', 1, TRUE, 'noun', 'カード', 'a plastic card used to pay', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cash'), 'cash.n.money', 1, TRUE, 'noun', '現金', 'money in coins and notes', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='receipt'), 'receipt.n.proof', 1, TRUE, 'noun', 'レシート', 'a paper showing what you paid', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='price'), 'price.n.cost', 1, TRUE, 'noun', '値段', 'the amount of money something costs', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='expensive'), 'expensive.adj.price', 1, TRUE, 'adjective', '高い', 'costing a lot of money', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pay','cost','change','card','cash','receipt','price','expensive')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='expensive.adj.price'), (SELECT id FROM vocab_senses WHERE slug='cheap.adj.price'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='paying'
WHERE s.slug IN ('pay.v.money','cost.v.price','change.n.money','card.n.pay','cash.n.money','receipt.n.proof','price.n.cost','expensive.adj.price')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-24', 6, 3, (SELECT id FROM vocab_categories WHERE slug='paying'), 'Paying', '支払い', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-24'), s.id, x.ord
FROM (VALUES
  ('pay.v.money',0),('cost.v.price',1),('change.n.money',2),('card.n.pay',3),('cash.n.money',4),('receipt.n.proof',5),('price.n.cost',6),('expensive.adj.price',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-24'), 'travel', 0, 'At the register', 'レジで', 'shop', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-24'), 'conversation', 1, 'Splitting the bill', '割り勘', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-24'), 'business', 2, 'Expense report', '経費精算', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 0, 'npc', 'That''s twelve dollars.', '12ドルになります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 1, 'user', 'Can I {pay} by card?', 'カードで払える？', 'pay', (SELECT id FROM vocab_senses WHERE slug='pay.v.money'), ARRAY['cost','buy','change','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 2, 'npc', 'Of course. Insert your {card} here.', 'もちろん。ここにカードを。', 'card', (SELECT id FROM vocab_senses WHERE slug='card.n.pay'), ARRAY['card','cash','ticket','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 3, 'user', 'Done. Do I get {change}?', 'できた。お釣りある？', 'change', (SELECT id FROM vocab_senses WHERE slug='change.n.money'), ARRAY['price','cash','change','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 4, 'npc', 'No, it was exact. Here''s your {receipt}.', 'いえ、ちょうどです。レシートです。', 'receipt', (SELECT id FROM vocab_senses WHERE slug='receipt.n.proof'), ARRAY['ticket','cash','card','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 5, 'user', 'Thanks a lot!', 'どうもありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='travel'), 6, 'npc', 'Have a nice day!', 'よい一日を！', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 0, 'npc', 'How much did lunch {cost}?', 'ランチいくらかかった？', 'cost', (SELECT id FROM vocab_senses WHERE slug='cost.v.price'), ARRAY['buy','change','pay','cost']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 1, 'user', 'About twenty. A bit {expensive} for lunch.', '20くらい。ランチにしてはちょっと高い。', 'expensive', (SELECT id FROM vocab_senses WHERE slug='expensive.adj.price'), ARRAY['cheap','expensive','heavy','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 2, 'npc', 'Yeah. Do you have {cash}, some coins or notes?', 'だね。現金ある？小銭かお札。', 'cash', (SELECT id FROM vocab_senses WHERE slug='cash.n.money'), ARRAY['change','card','cash','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 3, 'user', 'Only a little. Can you {pay} and I''ll send it?', '少しだけ。払っといて、後で送る?', 'pay', (SELECT id FROM vocab_senses WHERE slug='pay.v.money'), ARRAY['pay','change','cost','buy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 4, 'npc', 'Sure, no worries.', 'いいよ、気にしないで。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 5, 'user', 'Thanks! I''ll get the next one.', 'ありがとう！次は私が。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='conversation'), 6, 'npc', 'Deal.', '決まり。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 0, 'npc', 'Did you keep the {receipt}?', 'レシート取ってある？', 'receipt', (SELECT id FROM vocab_senses WHERE slug='receipt.n.proof'), ARRAY['ticket','receipt','card','cash']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 1, 'user', 'Yes. The {price} was on it.', 'うん。値段も載ってる。', 'price', (SELECT id FROM vocab_senses WHERE slug='price.n.cost'), ARRAY['card','cash','change','price']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 2, 'npc', 'Good. How much did the software {cost}?', 'いいね。ソフトはいくらした？', 'cost', (SELECT id FROM vocab_senses WHERE slug='cost.v.price'), ARRAY['cost','change','buy','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 3, 'user', 'A lot. It''s quite {expensive}, way over budget.', 'かなり。予算をかなりオーバーしてる。', 'expensive', (SELECT id FROM vocab_senses WHERE slug='expensive.adj.price'), ARRAY['light','cheap','expensive','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 4, 'npc', 'I''ll add it to the report.', 'レポートに追加するね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 5, 'user', 'Thanks for handling it.', '対応ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-24') AND goal='business'), 6, 'npc', 'No problem.', 'どういたしまして。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-25.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 25 (A2): "At work"  (Unit 7, Work and study)
-- ----------------------------------------------------------------------------
-- Words (all new): meeting, email, boss, project, deadline, report, desk, colleague.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('at-work', 'At work', '職場で', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('meeting', 'meeting', NULL, NULL, NULL, 2, FALSE, NULL),
  ('email', 'email', NULL, NULL, NULL, 2, FALSE, NULL),
  ('boss', 'boss', NULL, NULL, NULL, 2, FALSE, NULL),
  ('project', 'project', NULL, NULL, NULL, 2, FALSE, NULL),
  ('deadline', 'deadline', NULL, NULL, NULL, 2, FALSE, NULL),
  ('report', 'report', NULL, NULL, NULL, 2, FALSE, NULL),
  ('desk', 'desk', NULL, NULL, NULL, 2, FALSE, NULL),
  ('colleague', 'colleague', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='meeting'), 'meeting.n.work', 1, TRUE, 'noun', '会議', 'a time when people gather to talk about work', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='email'), 'email.n.msg', 1, TRUE, 'noun', 'メール', 'a message sent over the internet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='boss'), 'boss.n.work', 1, TRUE, 'noun', '上司', 'the person who leads you at work', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='project'), 'project.n.work', 1, TRUE, 'noun', 'プロジェクト', 'a planned piece of work', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='deadline'), 'deadline.n.time', 1, TRUE, 'noun', '締め切り', 'the time by which work must be done', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='report'), 'report.n.doc', 1, TRUE, 'noun', '報告書', 'a written account of work or facts', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='desk'), 'desk.n.furniture', 1, TRUE, 'noun', '机', 'a table you work at', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='colleague'), 'colleague.n.work', 1, TRUE, 'noun', '同僚', 'a person you work with', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('meeting','email','boss','project','deadline','report','desk','colleague')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='at-work'
WHERE s.slug IN ('meeting.n.work','email.n.msg','boss.n.work','project.n.work','deadline.n.time','report.n.doc','desk.n.furniture','colleague.n.work')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-25', 7, 2, (SELECT id FROM vocab_categories WHERE slug='at-work'), 'At work', '職場で', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-25'), s.id, x.ord
FROM (VALUES
  ('meeting.n.work',0),('email.n.msg',1),('boss.n.work',2),('project.n.work',3),('deadline.n.time',4),('report.n.doc',5),('desk.n.furniture',6),('colleague.n.work',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-25'), 'conversation', 0, 'The new job', '新しい仕事', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-25'), 'business', 1, 'Monday meeting', '月曜の会議', 'office', 'colleague'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-25'), 'travel', 2, 'At a conference', '会議イベントで', 'venue', 'organizer');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 0, 'npc', 'How''s the new job going?', '新しい仕事どう？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 1, 'user', 'Good! My {boss}, who leads the team, is supportive.', 'いいよ！チームを率いる上司がとても親切。', 'boss', (SELECT id FROM vocab_senses WHERE slug='boss.n.work'), ARRAY['teacher','friend','boss','guest']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 2, 'npc', 'Nice. Friendly {colleague}s at the office?', 'いいね。職場の同僚はフレンドリー？', 'colleague', (SELECT id FROM vocab_senses WHERE slug='colleague.n.work'), ARRAY['colleague','doctor','guest','student']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 3, 'user', 'Yeah. I even have my own {desk} to work at.', 'うん。自分の作業机もある。', 'desk', (SELECT id FROM vocab_senses WHERE slug='desk.n.furniture'), ARRAY['desk','floor','room','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 4, 'npc', 'Fancy! Busy already?', 'いいね！もう忙しい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 5, 'user', 'A little. My first {project}, a big one, starts Monday.', '少し。最初の大きなプロジェクトが月曜に始まる。', 'project', (SELECT id FROM vocab_senses WHERE slug='project.n.work'), ARRAY['meeting','email','report','project']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='conversation'), 6, 'npc', 'You''ll do great!', 'うまくいくよ！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 0, 'npc', 'Ready for the {meeting}?', '会議の準備できた？', 'meeting', (SELECT id FROM vocab_senses WHERE slug='meeting.n.work'), ARRAY['desk','email','report','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 1, 'user', 'Almost. When''s the {deadline} to submit it?', 'もう少し。提出の締め切りはいつ？', 'deadline', (SELECT id FROM vocab_senses WHERE slug='deadline.n.time'), ARRAY['meeting','deadline','desk','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 2, 'npc', 'Friday. Did you finish writing the {report}?', '金曜。報告書を書き終えた？', 'report', (SELECT id FROM vocab_senses WHERE slug='report.n.doc'), ARRAY['report','email','desk','plan']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 3, 'user', 'Nearly. I''ll send it by {email}.', 'もうすぐ。メールで送るよ。', 'email', (SELECT id FROM vocab_senses WHERE slug='email.n.msg'), ARRAY['report','desk','email','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 4, 'npc', 'Perfect. See you in there.', '完璧。中で会おう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 5, 'user', 'Right behind you.', 'すぐ行く。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='business'), 6, 'npc', 'Let''s go.', '行こう。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 0, 'npc', 'Welcome to the conference!', 'カンファレンスへようこそ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 1, 'user', 'Thanks! Did you get my {email} with the slides attached?', 'ありがとう！スライド添付のメール届いた？', 'email', (SELECT id FROM vocab_senses WHERE slug='email.n.msg'), ARRAY['ticket','report','email','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 2, 'npc', 'Yes. You''re presenting your {project} to the room?', 'はい。プロジェクトをみんなの前で発表するの？', 'project', (SELECT id FROM vocab_senses WHERE slug='project.n.work'), ARRAY['project','report','desk','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 3, 'user', 'Right. Is there a hard {deadline} for slides?', 'はい。スライドの締め切りは？', 'deadline', (SELECT id FROM vocab_senses WHERE slug='deadline.n.time'), ARRAY['deadline','meeting','report','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 4, 'npc', 'By noon. Your {meeting} room is upstairs.', '正午まで。会議室は上の階です。', 'meeting', (SELECT id FROM vocab_senses WHERE slug='meeting.n.work'), ARRAY['meeting','email','desk','report']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 5, 'user', 'Great, thank you.', '了解、ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-25') AND goal='travel'), 6, 'npc', 'Good luck!', '頑張って！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-26.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 26 (A2): "Phone & tech"  (Unit 7, Work and study)
-- ----------------------------------------------------------------------------
-- Words (all new): call, text, app, screen, click, online, password, message.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('phone-tech', 'Phone and tech', '電話とテック', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('call', 'call', NULL, NULL, NULL, 2, FALSE, NULL),
  ('text', 'text', NULL, NULL, NULL, 2, FALSE, NULL),
  ('app', 'app', NULL, NULL, NULL, 2, FALSE, NULL),
  ('screen', 'screen', NULL, NULL, NULL, 2, FALSE, NULL),
  ('click', 'click', NULL, NULL, NULL, 2, FALSE, NULL),
  ('online', 'online', NULL, NULL, NULL, 2, FALSE, NULL),
  ('password', 'password', NULL, NULL, NULL, 2, FALSE, NULL),
  ('message', 'message', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='call'), 'call.v.phone', 1, TRUE, 'verb', '電話する', 'to speak to someone by phone', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='text'), 'text.v.msg', 1, TRUE, 'verb', 'メッセージを送る', 'to send a written phone message', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='app'), 'app.n.tech', 1, TRUE, 'noun', 'アプリ', 'a program on a phone or computer', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='screen'), 'screen.n.tech', 1, TRUE, 'noun', '画面', 'the flat surface that shows images', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='click'), 'click.v.tap', 1, TRUE, 'verb', 'クリックする', 'to press a button on a screen or mouse', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='online'), 'online.adv.net', 1, TRUE, 'adverb', 'オンラインで', 'connected to the internet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='password'), 'password.n.tech', 1, TRUE, 'noun', 'パスワード', 'a secret word that lets you log in', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='message'), 'message.n.msg', 1, TRUE, 'noun', 'メッセージ', 'a piece of information you send someone', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('call','text','app','screen','click','online','password','message')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='phone-tech'
WHERE s.slug IN ('call.v.phone','text.v.msg','app.n.tech','screen.n.tech','click.v.tap','online.adv.net','password.n.tech','message.n.msg')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-26', 7, 3, (SELECT id FROM vocab_categories WHERE slug='phone-tech'), 'Phone & tech', '電話とデジタル', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-26'), s.id, x.ord
FROM (VALUES
  ('call.v.phone',0),('text.v.msg',1),('app.n.tech',2),('screen.n.tech',3),('click.v.tap',4),('online.adv.net',5),('password.n.tech',6),('message.n.msg',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-26'), 'conversation', 0, 'A new app', '新しいアプリ', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-26'), 'travel', 1, 'Wifi and login', 'Wi-Fiとログイン', 'hotel', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-26'), 'business', 2, 'Reach me', '連絡方法', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 0, 'npc', 'Have you tried this new {app}?', 'この新しいアプリ試した？', 'app', (SELECT id FROM vocab_senses WHERE slug='app.n.tech'), ARRAY['app','screen','book','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 1, 'user', 'Not yet. Is it easy?', 'まだ。簡単？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 2, 'npc', 'Super easy. Just {click} here.', 'すごく簡単。ここをクリックするだけ。', 'click', (SELECT id FROM vocab_senses WHERE slug='click.v.tap'), ARRAY['click','cook','call','cut']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 3, 'user', 'Oh, nice {screen} - the display looks sharp.', 'お、画面いいね、表示がくっきり。', 'screen', (SELECT id FROM vocab_senses WHERE slug='screen.n.tech'), ARRAY['window','page','screen','app']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 4, 'npc', 'Right? Send me a chat {message} on it.', 'でしょ？これでチャットメッセージ送って。', 'message', (SELECT id FROM vocab_senses WHERE slug='message.n.msg'), ARRAY['email','call','message','app']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 5, 'user', 'Sure, downloading now.', 'うん、今ダウンロードしてる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='conversation'), 6, 'npc', 'You''ll love it.', '気に入るよ。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 0, 'npc', 'Would you like the wifi details?', 'Wi-Fiの情報要りますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 1, 'user', 'Yes please. How do I get {online}, onto the internet?', 'はい。どうやってネットにつなぐ？', 'online', (SELECT id FROM vocab_senses WHERE slug='online.adv.net'), ARRAY['inside','outside','online','offline']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 2, 'npc', 'Open the {screen} and tap the display to select our network.', '画面を開いて、表示をタップしてネットワークを選んで。', 'screen', (SELECT id FROM vocab_senses WHERE slug='screen.n.tech'), ARRAY['screen','app','window','page']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 3, 'user', 'Okay. Do I need a {password}?', '了解。パスワードは要る？', 'password', (SELECT id FROM vocab_senses WHERE slug='password.n.tech'), ARRAY['receipt','ticket','key','password']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 4, 'npc', 'Yes. Then {click} ''connect''.', 'はい。それから『接続』をクリック。', 'click', (SELECT id FROM vocab_senses WHERE slug='click.v.tap'), ARRAY['cut','click','cook','call']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 5, 'user', 'It works. Thank you!', 'つながった。ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='travel'), 6, 'npc', 'Enjoy your stay!', 'ごゆっくり！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 0, 'npc', 'How should I reach you today?', '今日はどうやって連絡すればいい？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 1, 'user', 'You can {call} me anytime.', 'いつでも電話していいよ。', 'call', (SELECT id FROM vocab_senses WHERE slug='call.v.phone'), ARRAY['click','cut','call','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 2, 'npc', 'Or should I {text} you a written note instead?', 'それとも文字でメッセージ送ろうか？', 'text', (SELECT id FROM vocab_senses WHERE slug='text.v.msg'), ARRAY['taste','talk','text','turn']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 3, 'user', 'Sure, send a quick written {message}.', 'うん、短い文字メッセージで。', 'message', (SELECT id FROM vocab_senses WHERE slug='message.n.msg'), ARRAY['email','message','call','app']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 4, 'npc', 'Got it. I''m {online}, connected to the internet, until six.', '了解。6時までネットにつないでるよ。', 'online', (SELECT id FROM vocab_senses WHERE slug='online.adv.net'), ARRAY['offline','inside','online','outside']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 5, 'user', 'Perfect, talk soon.', '完璧、また後で。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-26') AND goal='business'), 6, 'npc', 'Later!', 'じゃあね！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-27.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 27 (A2): "Going out"  (Unit 8, Free time)
-- ----------------------------------------------------------------------------
-- Words (all new): film, party, dance, fun, concert, invite, join, enjoy.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('going-out', 'Going out', 'お出かけ', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('film', 'film', NULL, NULL, NULL, 2, FALSE, NULL),
  ('party', 'party', NULL, NULL, NULL, 2, FALSE, NULL),
  ('dance', 'dance', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fun', 'fun', NULL, NULL, NULL, 2, FALSE, NULL),
  ('concert', 'concert', NULL, NULL, NULL, 2, FALSE, NULL),
  ('invite', 'invite', NULL, NULL, NULL, 2, FALSE, NULL),
  ('join', 'join', NULL, NULL, NULL, 2, FALSE, NULL),
  ('enjoy', 'enjoy', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='film'), 'film.n.movie', 1, TRUE, 'noun', '映画', 'a story shown in moving pictures', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='party'), 'party.n.event', 1, TRUE, 'noun', 'パーティー', 'a social event with food and fun', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dance'), 'dance.v.move', 1, TRUE, 'verb', '踊る', 'to move your body to music', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fun'), 'fun.n.enjoy', 1, TRUE, 'noun', '楽しみ', 'enjoyment or a good time', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='concert'), 'concert.n.music', 1, TRUE, 'noun', 'コンサート', 'a live music performance', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='invite'), 'invite.v.ask', 1, TRUE, 'verb', '招待する', 'to ask someone to come to an event', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='join'), 'join.v.take', 1, TRUE, 'verb', '参加する', 'to take part in something with others', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='enjoy'), 'enjoy.v.like', 1, TRUE, 'verb', '楽しむ', 'to get pleasure from something', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('film','party','dance','fun','concert','invite','join','enjoy')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='going-out'
WHERE s.slug IN ('film.n.movie','party.n.event','dance.v.move','fun.n.enjoy','concert.n.music','invite.v.ask','join.v.take','enjoy.v.like')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-27', 8, 2, (SELECT id FROM vocab_categories WHERE slug='going-out'), 'Going out', '遊びに出かける', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-27'), s.id, x.ord
FROM (VALUES
  ('film.n.movie',0),('party.n.event',1),('dance.v.move',2),('fun.n.enjoy',3),('concert.n.music',4),('invite.v.ask',5),('join.v.take',6),('enjoy.v.like',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-27'), 'conversation', 0, 'Weekend plans', '週末の予定', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-27'), 'travel', 1, 'A night out', '夜遊び', 'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-27'), 'business', 2, 'Team social', 'チームの親睦会', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 0, 'npc', 'Any plans this weekend?', '今週末、予定ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 1, 'user', 'Maybe a {film} at the cinema on Friday.', '金曜に映画館で映画かな。', 'film', (SELECT id FROM vocab_senses WHERE slug='film.n.movie'), ARRAY['film','book','party','concert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 2, 'npc', 'Nice. There''s also a birthday {party} Saturday.', 'いいね。土曜に誕生日パーティーもあるよ。', 'party', (SELECT id FROM vocab_senses WHERE slug='party.n.event'), ARRAY['concert','party','film','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 3, 'user', 'Oh? Can you {invite} me?', 'え？私も誘ってくれる？', 'invite', (SELECT id FROM vocab_senses WHERE slug='invite.v.ask'), ARRAY['forget','leave','join','invite']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 4, 'npc', 'Of course! It''ll be so much {fun}, we''ll laugh all night.', 'もちろん！すごく楽しくて、一晩中笑うよ。', 'fun', (SELECT id FROM vocab_senses WHERE slug='fun.n.enjoy'), ARRAY['rest','work','noise','fun']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 5, 'user', 'Can''t wait!', '楽しみ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='conversation'), 6, 'npc', 'Me neither.', '私も。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 0, 'npc', 'We''re going out tonight. Interested?', '今夜出かけるんだ。興味ある？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 1, 'user', 'Yes! Is there a {concert} with a live band?', 'うん！生バンドのコンサートある？', 'concert', (SELECT id FROM vocab_senses WHERE slug='concert.n.music'), ARRAY['party','film','concert','museum']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 2, 'npc', 'There is. And a place to {dance} to the music after.', 'あるよ。そのあと音楽に合わせて踊れる場所も。', 'dance', (SELECT id FROM vocab_senses WHERE slug='dance.v.move'), ARRAY['cook','drive','dance','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 3, 'user', 'Perfect. Can I {join} you?', '完璧。一緒に行っていい？', 'join', (SELECT id FROM vocab_senses WHERE slug='join.v.take'), ARRAY['leave','forget','argue','join']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 4, 'npc', 'Please do! You''ll {enjoy} it.', 'ぜひ！楽しめるよ。', 'enjoy', (SELECT id FROM vocab_senses WHERE slug='enjoy.v.like'), ARRAY['hate','enjoy','miss','lose']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 5, 'user', 'Let me grab my jacket.', 'ジャケット取ってくる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='travel'), 6, 'npc', 'Hurry, it starts soon!', '急いで、もうすぐ始まる！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 0, 'npc', 'We''re planning a team night out.', 'チームで飲み会を計画してるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 1, 'user', 'Fun! Who did you {invite}?', '楽しそう！誰を誘ったの？', 'invite', (SELECT id FROM vocab_senses WHERE slug='invite.v.ask'), ARRAY['invite','leave','join','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 2, 'npc', 'Everyone. Will you {join}?', '全員。参加する？', 'join', (SELECT id FROM vocab_senses WHERE slug='join.v.take'), ARRAY['join','leave','argue','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 3, 'user', 'Definitely. Is it a {party} with music and food?', 'もちろん。音楽と食べ物のあるパーティー？', 'party', (SELECT id FROM vocab_senses WHERE slug='party.n.event'), ARRAY['film','party','meeting','concert']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 4, 'npc', 'Yes! I hope you {enjoy} it.', 'うん！楽しんでね。', 'enjoy', (SELECT id FROM vocab_senses WHERE slug='enjoy.v.like'), ARRAY['hate','miss','lose','enjoy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 5, 'user', 'I''m sure I will.', 'きっと楽しむよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-27') AND goal='business'), 6, 'npc', 'Great, see you there.', 'じゃあ、現地で。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-28.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 28 (A2): "Sport & exercise"  (Unit 8, Free time)
-- ----------------------------------------------------------------------------
-- Words (all new): run, swim, team, win, lose, ball, gym, practice.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('sport', 'Sport and exercise', 'スポーツと運動', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('run', 'run', NULL, NULL, NULL, 2, FALSE, NULL),
  ('swim', 'swim', NULL, NULL, NULL, 2, FALSE, NULL),
  ('team', 'team', NULL, NULL, NULL, 2, FALSE, NULL),
  ('win', 'win', NULL, NULL, NULL, 2, FALSE, NULL),
  ('lose', 'lose', NULL, NULL, NULL, 2, FALSE, NULL),
  ('ball', 'ball', NULL, NULL, NULL, 2, FALSE, NULL),
  ('gym', 'gym', NULL, NULL, NULL, 2, FALSE, NULL),
  ('practice', 'practice', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='run'), 'run.v.move', 1, TRUE, 'verb', '走る', 'to move quickly on your feet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='swim'), 'swim.v.water', 1, TRUE, 'verb', '泳ぐ', 'to move through water with your body', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='team'), 'team.n.group', 1, TRUE, 'noun', 'チーム', 'a group who play or work together', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='win'), 'win.v.beat', 1, TRUE, 'verb', '勝つ', 'to come first in a game or contest', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lose'), 'lose.v.fail', 1, TRUE, 'verb', '負ける', 'to not win a game or contest', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ball'), 'ball.n.object', 1, TRUE, 'noun', 'ボール', 'a round object used in games', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gym'), 'gym.n.place', 1, TRUE, 'noun', 'ジム', 'a place with equipment for exercise', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='practice'), 'practice.v.train', 1, TRUE, 'verb', '練習する', 'to do something often to get better', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('run','swim','team','win','lose','ball','gym','practice')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='win.v.beat'), (SELECT id FROM vocab_senses WHERE slug='lose.v.fail'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='lose.v.fail'), (SELECT id FROM vocab_senses WHERE slug='win.v.beat'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='sport'
WHERE s.slug IN ('run.v.move','swim.v.water','team.n.group','win.v.beat','lose.v.fail','ball.n.object','gym.n.place','practice.v.train')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-28', 8, 3, (SELECT id FROM vocab_categories WHERE slug='sport'), 'Sport & exercise', 'スポーツと運動', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-28'), s.id, x.ord
FROM (VALUES
  ('run.v.move',0),('swim.v.water',1),('team.n.group',2),('win.v.beat',3),('lose.v.fail',4),('ball.n.object',5),('gym.n.place',6),('practice.v.train',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-28'), 'conversation', 0, 'The big game', '大事な試合', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-28'), 'travel', 1, 'Joining a gym', 'ジムに入る', 'gym', 'trainer'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-28'), 'business', 2, 'Company sports day', '社内スポーツ大会', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 0, 'npc', 'Did you watch the game last night?', '昨日の試合見た？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 1, 'user', 'Yes! Our football {team} played so well.', 'うん！うちのサッカーチーム、すごくよかった。', 'team', (SELECT id FROM vocab_senses WHERE slug='team.n.group'), ARRAY['ball','team','group','gym']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 2, 'npc', 'Did they {win}? I saw them celebrating.', '勝った？喜んでるのを見たよ。', 'win', (SELECT id FROM vocab_senses WHERE slug='win.v.beat'), ARRAY['swim','run','win','lose']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 3, 'user', 'Almost. They {lose} by one point, so close to winning.', '惜しい。1点差で負けた、あと少しで勝てたのに。', 'lose', (SELECT id FROM vocab_senses WHERE slug='lose.v.fail'), ARRAY['win','run','swim','lose']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 4, 'npc', 'So close! Whose {ball} went out of play?', '惜しい！誰のボールが外に出た？', 'ball', (SELECT id FROM vocab_senses WHERE slug='ball.n.object'), ARRAY['ball','gym','team','net']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 5, 'user', 'Ours, at the end. Heartbreaking.', '最後はうちの。悔しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='conversation'), 6, 'npc', 'Next time!', '次があるさ！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 0, 'npc', 'Welcome! First time at this {gym}, with all the weights?', 'ようこそ！重りの揃ったこのジム、初めて？', 'gym', (SELECT id FROM vocab_senses WHERE slug='gym.n.place'), ARRAY['park','shop','gym','pool']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 1, 'user', 'Yes. I''d like to {swim} in the pool and lift weights.', 'はい。プールで泳いで、筋トレしたいです。', 'swim', (SELECT id FROM vocab_senses WHERE slug='swim.v.water'), ARRAY['swim','run','sleep','dance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 2, 'npc', 'Great. Do you like to {run} on the treadmill too?', 'いいね。ランニングマシンで走るのも好き？', 'run', (SELECT id FROM vocab_senses WHERE slug='run.v.move'), ARRAY['swim','sit','run','cook']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 3, 'user', 'Sometimes. When can I {practice}?', '時々。いつ練習できますか？', 'practice', (SELECT id FROM vocab_senses WHERE slug='practice.v.train'), ARRAY['rest','practice','shop','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 4, 'npc', 'Anytime. Here''s your pass.', 'いつでも。パスをどうぞ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 5, 'user', 'Thank you so much.', 'ありがとうございます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='travel'), 6, 'npc', 'See you around!', 'またね！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 0, 'npc', 'Are you joining the company sports day?', '社内スポーツ大会に出る？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 1, 'user', 'Sure! Which {team} am I on, red or blue?', 'うん！私はどのチーム？赤か青？', 'team', (SELECT id FROM vocab_senses WHERE slug='team.n.group'), ARRAY['ball','gym','team','group']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 2, 'npc', 'The blue one. Can you {run} fast, like a sprinter?', '青チーム。スプリンターみたいに速く走れる？', 'run', (SELECT id FROM vocab_senses WHERE slug='run.v.move'), ARRAY['sit','run','cook','swim']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 3, 'user', 'Fast enough to {win}, I hope!', '勝てるくらいには！', 'win', (SELECT id FROM vocab_senses WHERE slug='win.v.beat'), ARRAY['lose','run','swim','win']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 4, 'npc', 'Ha! Want to {practice} first?', 'はは！先に練習する？', 'practice', (SELECT id FROM vocab_senses WHERE slug='practice.v.train'), ARRAY['practice','rest','shop','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 5, 'user', 'Good idea. Saturday?', 'いいね。土曜？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-28') AND goal='business'), 6, 'npc', 'Perfect.', '完璧。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-29.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 29 (A2): "Airport & station"  (Unit 9, Travel and holidays)
-- ----------------------------------------------------------------------------
-- Words (all new): flight, gate, passport, board, wait, suitcase, delay, arrive.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('airport', 'Airport and station', '空港と駅', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('flight', 'flight', NULL, NULL, NULL, 2, FALSE, NULL),
  ('gate', 'gate', NULL, NULL, NULL, 2, FALSE, NULL),
  ('passport', 'passport', NULL, NULL, NULL, 2, FALSE, NULL),
  ('board', 'board', NULL, NULL, NULL, 2, FALSE, NULL),
  ('wait', 'wait', NULL, NULL, NULL, 2, FALSE, NULL),
  ('suitcase', 'suitcase', NULL, NULL, NULL, 2, FALSE, NULL),
  ('delay', 'delay', NULL, NULL, NULL, 2, FALSE, NULL),
  ('arrive', 'arrive', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='flight'), 'flight.n.plane', 1, TRUE, 'noun', 'フライト', 'a journey by plane', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='gate'), 'gate.n.airport', 1, TRUE, 'noun', '搭乗口', 'the door where you board a plane', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='passport'), 'passport.n.doc', 1, TRUE, 'noun', 'パスポート', 'an official document for foreign travel', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='board'), 'board.v.geton', 1, TRUE, 'verb', '搭乗する', 'to get on a plane, train, or ship', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wait'), 'wait.v.stay', 1, TRUE, 'verb', '待つ', 'to stay until something happens', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='suitcase'), 'suitcase.n.bag', 1, TRUE, 'noun', 'スーツケース', 'a large case for clothes when traveling', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='delay'), 'delay.n.late', 1, TRUE, 'noun', '遅れ', 'a time when something is later than planned', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='arrive'), 'arrive.v.reach', 1, TRUE, 'verb', '到着する', 'to reach a place', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('flight','gate','passport','board','wait','suitcase','delay','arrive')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='arrive.v.reach'), NULL, 'reach', 'near_synonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='airport'
WHERE s.slug IN ('flight.n.plane','gate.n.airport','passport.n.doc','board.v.geton','wait.v.stay','suitcase.n.bag','delay.n.late','arrive.v.reach')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-29', 9, 2, (SELECT id FROM vocab_categories WHERE slug='airport'), 'Airport & station', '空港と駅', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-29'), s.id, x.ord
FROM (VALUES
  ('flight.n.plane',0),('gate.n.airport',1),('passport.n.doc',2),('board.v.geton',3),('wait.v.stay',4),('suitcase.n.bag',5),('delay.n.late',6),('arrive.v.reach',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-29'), 'travel', 0, 'Checking in', '搭乗手続き', 'airport', 'staff'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-29'), 'conversation', 1, 'Landing soon', 'もうすぐ到着', 'phone', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-29'), 'business', 2, 'A business trip', '出張', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 0, 'npc', 'Good morning! May I see your {passport} and boarding pass?', 'おはようございます！パスポートと搭乗券を拝見できますか？', 'passport', (SELECT id FROM vocab_senses WHERE slug='passport.n.doc'), ARRAY['card','ticket','passport','receipt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 1, 'user', 'Here you go. My {flight} departs at noon.', 'どうぞ。フライトは正午発です。', 'flight', (SELECT id FROM vocab_senses WHERE slug='flight.n.plane'), ARRAY['flight','gate','bus','train']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 2, 'npc', 'Great. Your boarding {gate} is B12.', 'はい。搭乗ゲートはB12です。', 'gate', (SELECT id FROM vocab_senses WHERE slug='gate.n.airport'), ARRAY['gate','platform','door','corner']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 3, 'user', 'When do we {board}?', 'いつ搭乗ですか？', 'board', (SELECT id FROM vocab_senses WHERE slug='board.v.geton'), ARRAY['arrive','wait','board','land']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 4, 'npc', 'In one hour. Enjoy your trip!', '1時間後です。よい旅を！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 5, 'user', 'Thank you!', 'ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='travel'), 6, 'npc', 'Safe travels.', 'お気をつけて。', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 0, 'npc', 'Hey! What time do you {arrive} and land?', 'やあ！何時に到着（着陸）する？', 'arrive', (SELECT id FROM vocab_senses WHERE slug='arrive.v.reach'), ARRAY['arrive','leave','wait','board']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 1, 'user', 'Around three, if there''s no {delay}.', '遅れがなければ3時ごろ。', 'delay', (SELECT id FROM vocab_senses WHERE slug='delay.n.late'), ARRAY['gate','ride','delay','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 2, 'npc', 'Okay. Should I {wait} at the station?', '了解。駅で待ってようか？', 'wait', (SELECT id FROM vocab_senses WHERE slug='wait.v.stay'), ARRAY['leave','wait','drive','run']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 3, 'user', 'Yes please. My {flight} took off on time.', 'お願い。フライトは定刻に離陸した。', 'flight', (SELECT id FROM vocab_senses WHERE slug='flight.n.plane'), ARRAY['gate','flight','bus','train']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 4, 'npc', 'Great. I''ll be there.', 'よかった。行くね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 5, 'user', 'See you soon!', 'またすぐ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='conversation'), 6, 'npc', 'Text me when you land.', '着いたらメッセージして。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 0, 'npc', 'All set for the trip?', '出張の準備できた？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 1, 'user', 'Almost. My {flight} to Tokyo leaves early.', 'もう少し。東京行きのフライトが早い。', 'flight', (SELECT id FROM vocab_senses WHERE slug='flight.n.plane'), ARRAY['flight','train','bus','gate']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 2, 'npc', 'Just one {suitcase} to check in?', '預けるスーツケースは一つ？', 'suitcase', (SELECT id FROM vocab_senses WHERE slug='suitcase.n.bag'), ARRAY['seat','bag','suitcase','box']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 3, 'user', 'Yes, packing light.', 'うん、身軽にね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 4, 'npc', 'Any {delay} expected?', '遅れはありそう？', 'delay', (SELECT id FROM vocab_senses WHERE slug='delay.n.late'), ARRAY['seat','gate','delay','ride']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 5, 'user', 'No. I should {arrive} and land by evening.', 'いえ。夕方には到着して着陸するはず。', 'arrive', (SELECT id FROM vocab_senses WHERE slug='arrive.v.reach'), ARRAY['arrive','board','leave','wait']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-29') AND goal='business'), 6, 'npc', 'Safe trip!', '気をつけて！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-30.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 30 (A2): "Sightseeing"  (Unit 9, Travel and holidays)
-- ----------------------------------------------------------------------------
-- Words (all new): visit, map, photo, tour, famous, view, souvenir, castle.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('sightseeing', 'Sightseeing', '観光', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('visit', 'visit', NULL, NULL, NULL, 2, FALSE, NULL),
  ('map', 'map', NULL, NULL, NULL, 2, FALSE, NULL),
  ('photo', 'photo', NULL, NULL, NULL, 2, FALSE, NULL),
  ('tour', 'tour', NULL, NULL, NULL, 2, FALSE, NULL),
  ('famous', 'famous', NULL, NULL, NULL, 2, FALSE, NULL),
  ('view', 'view', NULL, NULL, NULL, 2, FALSE, NULL),
  ('souvenir', 'souvenir', NULL, NULL, NULL, 2, FALSE, NULL),
  ('castle', 'castle', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='visit'), 'visit.v.go', 1, TRUE, 'verb', '訪れる', 'to go to see a place or person', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='map'), 'map.n.guide', 1, TRUE, 'noun', '地図', 'a drawing of an area that shows roads', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='photo'), 'photo.n.pic', 1, TRUE, 'noun', '写真', 'a picture made with a camera', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='tour'), 'tour.n.trip', 1, TRUE, 'noun', 'ツアー', 'a trip to see the interesting parts of a place', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='famous'), 'famous.adj.known', 1, TRUE, 'adjective', '有名な', 'known by many people', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='view'), 'view.n.scene', 1, TRUE, 'noun', '景色', 'what you can see from a place', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='souvenir'), 'souvenir.n.gift', 1, TRUE, 'noun', 'お土産', 'something you buy to remember a trip', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='castle'), 'castle.n.building', 1, TRUE, 'noun', '城', 'a large old building built for defense', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('visit','map','photo','tour','famous','view','souvenir','castle')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='sightseeing'
WHERE s.slug IN ('visit.v.go','map.n.guide','photo.n.pic','tour.n.trip','famous.adj.known','view.n.scene','souvenir.n.gift','castle.n.building')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-30', 9, 3, (SELECT id FROM vocab_categories WHERE slug='sightseeing'), 'Sightseeing', '観光', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-30'), s.id, x.ord
FROM (VALUES
  ('visit.v.go',0),('map.n.guide',1),('photo.n.pic',2),('tour.n.trip',3),('famous.adj.known',4),('view.n.scene',5),('souvenir.n.gift',6),('castle.n.building',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-30'), 'travel', 0, 'A guided tour', 'ガイドツアー', 'street', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-30'), 'conversation', 1, 'Trip photos', '旅行の写真', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-30'), 'business', 2, 'A free afternoon', '自由な午後', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 0, 'npc', 'Welcome to today''s {tour}!', '本日のツアーへようこそ！', 'tour', (SELECT id FROM vocab_senses WHERE slug='tour.n.trip'), ARRAY['tour','view','shop','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 1, 'user', 'Thank you! Is that the old {castle} where kings lived?', 'ありがとう！あれが王の住んだ古いお城？', 'castle', (SELECT id FROM vocab_senses WHERE slug='castle.n.building'), ARRAY['castle','park','museum','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 2, 'npc', 'Yes, it''s very {famous}; everyone knows it.', 'はい、とても有名で、誰もが知ってる。', 'famous', (SELECT id FROM vocab_senses WHERE slug='famous.adj.known'), ARRAY['cheap','quiet','famous','near']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 3, 'user', 'Wow, what a {view}!', 'わあ、いい景色！', 'view', (SELECT id FROM vocab_senses WHERE slug='view.n.scene'), ARRAY['photo','view','seat','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 4, 'npc', 'Best spot in the city. Take your time.', '街で一番の場所です。ごゆっくり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 5, 'user', 'Amazing. Thank you.', '素晴らしい。ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='travel'), 6, 'npc', 'Let''s continue.', '続けましょう。', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 0, 'npc', 'How was your trip?', '旅行どうだった？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 1, 'user', 'Amazing! We got to {visit} so many places.', '最高！たくさんの場所を訪れたよ。', 'visit', (SELECT id FROM vocab_senses WHERE slug='visit.v.go'), ARRAY['miss','forget','visit','leave']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 2, 'npc', 'Show me a {photo}!', '写真見せて！', 'photo', (SELECT id FROM vocab_senses WHERE slug='photo.n.pic'), ARRAY['photo','ticket','map','card']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 3, 'user', 'Here. We used this {map} every day.', 'はい。毎日この地図を使った。', 'map', (SELECT id FROM vocab_senses WHERE slug='map.n.guide'), ARRAY['menu','list','photo','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 4, 'npc', 'Did you bring a {souvenir}?', 'お土産買った？', 'souvenir', (SELECT id FROM vocab_senses WHERE slug='souvenir.n.gift'), ARRAY['receipt','ticket','souvenir','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 5, 'user', 'Yes, for you!', 'うん、あなたに！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='conversation'), 6, 'npc', 'Aw, thank you!', 'わあ、ありがとう！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 0, 'npc', 'You have a free afternoon on the trip, right?', '出張で午後は自由なんだよね？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 1, 'user', 'Yes! I want to {visit} the old town.', 'うん！旧市街を訪れたい。', 'visit', (SELECT id FROM vocab_senses WHERE slug='visit.v.go'), ARRAY['visit','miss','leave','forget']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 2, 'npc', 'Nice. The {view} from the hill is great.', 'いいね。丘からの景色が最高。', 'view', (SELECT id FROM vocab_senses WHERE slug='view.n.scene'), ARRAY['view','photo','map','seat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 3, 'user', 'Is the cathedral {famous}, known worldwide?', '大聖堂は有名？世界的に知られてる？', 'famous', (SELECT id FROM vocab_senses WHERE slug='famous.adj.known'), ARRAY['near','famous','cheap','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 4, 'npc', 'Very. Grab a {souvenir} while you''re there.', 'とても。ついでにお土産も。', 'souvenir', (SELECT id FROM vocab_senses WHERE slug='souvenir.n.gift'), ARRAY['receipt','ticket','souvenir','bag']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 5, 'user', 'Good idea. Thanks!', 'いいね。ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-30') AND goal='business'), 6, 'npc', 'Have fun!', '楽しんで！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-31.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 31 (A2): "At the doctor"  (Unit 10, Health and body)
-- ----------------------------------------------------------------------------
-- Words (all new): pain, feel, cough, worse, nurse, appointment, temperature, checkup.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('at-doctor', 'At the doctor', '診察', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('pain', 'pain', NULL, NULL, NULL, 2, FALSE, NULL),
  ('feel', 'feel', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cough', 'cough', NULL, NULL, NULL, 2, FALSE, NULL),
  ('worse', 'worse', NULL, NULL, NULL, 2, FALSE, NULL),
  ('nurse', 'nurse', NULL, NULL, NULL, 2, FALSE, NULL),
  ('appointment', 'appointment', NULL, NULL, NULL, 2, FALSE, NULL),
  ('temperature', 'temperature', NULL, NULL, NULL, 2, FALSE, NULL),
  ('checkup', 'checkup', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='pain'), 'pain.n.hurt', 1, TRUE, 'noun', '痛み', 'a feeling of hurt in your body', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='feel'), 'feel.v.sense', 1, TRUE, 'verb', '感じる', 'to experience something in your body or mind', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cough'), 'cough.v.throat', 1, TRUE, 'verb', '咳をする', 'to push air out of your throat with a sharp sound', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='worse'), 'worse.adj.bad', 1, TRUE, 'adjective', 'もっと悪い', 'more bad than before', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='nurse'), 'nurse.n.medic', 1, TRUE, 'noun', '看護師', 'a person who cares for sick people', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='appointment'), 'appointment.n.time', 1, TRUE, 'noun', '予約', 'an arranged time to meet or be seen', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='temperature'), 'temperature.n.heat', 1, TRUE, 'noun', '体温', 'how hot or cold something is', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='checkup'), 'checkup.n.exam', 1, TRUE, 'noun', '健康診断', 'a medical examination to check your health', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('pain','feel','cough','worse','nurse','appointment','temperature','checkup')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='worse.adj.bad'), (SELECT id FROM vocab_senses WHERE slug='better.adj.improved'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='at-doctor'
WHERE s.slug IN ('pain.n.hurt','feel.v.sense','cough.v.throat','worse.adj.bad','nurse.n.medic','appointment.n.time','temperature.n.heat','checkup.n.exam')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-31', 10, 2, (SELECT id FROM vocab_categories WHERE slug='at-doctor'), 'At the doctor', '医者にかかる', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-31'), s.id, x.ord
FROM (VALUES
  ('pain.n.hurt',0),('feel.v.sense',1),('cough.v.throat',2),('worse.adj.bad',3),('nurse.n.medic',4),('appointment.n.time',5),('temperature.n.heat',6),('checkup.n.exam',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-31'), 'conversation', 0, 'See a doctor', '医者に行きなよ', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-31'), 'travel', 1, 'Making an appointment', '予約を取る', 'clinic', 'receptionist'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-31'), 'business', 2, 'Time off for a checkup', '健診で休む', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 0, 'npc', 'You''ve been coughing a lot.', 'よく咳してるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 1, 'user', 'Yeah, I {feel} awful today.', 'うん、今日はひどい気分。', 'feel', (SELECT id FROM vocab_senses WHERE slug='feel.v.sense'), ARRAY['drive','clean','cook','feel']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 2, 'npc', 'Any {pain} anywhere?', 'どこか痛い？', 'pain', (SELECT id FROM vocab_senses WHERE slug='pain.n.hurt'), ARRAY['help','pain','rest','fever']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 3, 'user', 'My chest hurts, and I {cough} a lot at night.', '胸が痛くて、夜はよく咳き込む。', 'cough', (SELECT id FROM vocab_senses WHERE slug='cough.v.throat'), ARRAY['sleep','laugh','cough','eat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 4, 'npc', 'That sounds {worse}, more painful than yesterday.', '昨日より痛そうで、悪化してるね。', 'worse', (SELECT id FROM vocab_senses WHERE slug='worse.adj.bad'), ARRAY['free','better','worse','easy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 5, 'user', 'It is. I should see someone.', 'うん。診てもらうべきだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='conversation'), 6, 'npc', 'Definitely.', '絶対に。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 0, 'npc', 'Hello, do you have an {appointment}?', 'こんにちは、ご予約はありますか？', 'appointment', (SELECT id FROM vocab_senses WHERE slug='appointment.n.time'), ARRAY['seat','ticket','receipt','appointment']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 1, 'user', 'No. Can I see a {nurse} today?', 'いいえ。今日、看護師さんに診てもらえますか？', 'nurse', (SELECT id FROM vocab_senses WHERE slug='nurse.n.medic'), ARRAY['clerk','teacher','driver','nurse']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 2, 'npc', 'Yes. First, a quick {checkup}.', 'はい。まず簡単な健康チェックを。', 'checkup', (SELECT id FROM vocab_senses WHERE slug='checkup.n.exam'), ARRAY['ticket','checkup','tour','class']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 3, 'user', 'Sure. Will you take my {temperature}?', 'はい。体温を測りますか？', 'temperature', (SELECT id FROM vocab_senses WHERE slug='temperature.n.heat'), ARRAY['receipt','fever','pain','temperature']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 4, 'npc', 'Yes, please sit here.', 'はい、こちらにおかけください。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 5, 'user', 'Thank you.', 'ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='travel'), 6, 'npc', 'The nurse will call you soon.', '看護師がすぐお呼びします。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 0, 'npc', 'You look a bit pale. Everything okay?', '少し顔色悪いね。大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 1, 'user', 'I have a doctor''s {appointment} tomorrow.', '明日、医者の予約があるんだ。', 'appointment', (SELECT id FROM vocab_senses WHERE slug='appointment.n.time'), ARRAY['appointment','ticket','seat','meeting']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 2, 'npc', 'A {checkup}?', '健康診断？', 'checkup', (SELECT id FROM vocab_senses WHERE slug='checkup.n.exam'), ARRAY['ticket','class','tour','checkup']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 3, 'user', 'Yes. I {feel} tired lately.', 'うん。最近だるくて。', 'feel', (SELECT id FROM vocab_senses WHERE slug='feel.v.sense'), ARRAY['feel','cook','drive','clean']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 4, 'npc', 'Rest up. Don''t let it get {worse}.', '休んでね。悪化させないで。', 'worse', (SELECT id FROM vocab_senses WHERE slug='worse.adj.bad'), ARRAY['better','free','easy','worse']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 5, 'user', 'Thanks. I''ll take the morning off.', 'ありがとう。午前は休むよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-31') AND goal='business'), 6, 'npc', 'Of course.', 'もちろん。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-32.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 32 (A2): "The body"  (Unit 10, Health and body)
-- ----------------------------------------------------------------------------
-- Words (all new): head, stomach, back, throat, sore, arm, leg, hand.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('body', 'The body', '体', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('head', 'head', NULL, NULL, NULL, 2, FALSE, NULL),
  ('stomach', 'stomach', NULL, NULL, NULL, 2, FALSE, NULL),
  ('back', 'back', NULL, NULL, NULL, 2, FALSE, NULL),
  ('throat', 'throat', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sore', 'sore', NULL, NULL, NULL, 2, FALSE, NULL),
  ('arm', 'arm', NULL, NULL, NULL, 2, FALSE, NULL),
  ('leg', 'leg', NULL, NULL, NULL, 2, FALSE, NULL),
  ('hand', 'hand', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='head'), 'head.n.body', 1, TRUE, 'noun', '頭', 'the top part of your body, above your neck', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stomach'), 'stomach.n.body', 1, TRUE, 'noun', 'お腹', 'the part of your body where food goes', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='back'), 'back.n.body', 1, TRUE, 'noun', '背中', 'the rear part of your body', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='throat'), 'throat.n.body', 1, TRUE, 'noun', 'のど', 'the passage at the back of your mouth', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sore'), 'sore.adj.hurt', 1, TRUE, 'adjective', '痛い', 'painful, especially when touched', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='arm'), 'arm.n.body', 1, TRUE, 'noun', '腕', 'the long part of your body from shoulder to hand', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='leg'), 'leg.n.body', 1, TRUE, 'noun', '脚', 'the long part of your body you stand on', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hand'), 'hand.n.body', 1, TRUE, 'noun', '手', 'the part at the end of your arm with fingers', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('head','stomach','back','throat','sore','arm','leg','hand')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='body'
WHERE s.slug IN ('head.n.body','stomach.n.body','back.n.body','throat.n.body','sore.adj.hurt','arm.n.body','leg.n.body','hand.n.body')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-32', 10, 3, (SELECT id FROM vocab_categories WHERE slug='body'), 'The body', '体', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-32'), s.id, x.ord
FROM (VALUES
  ('head.n.body',0),('stomach.n.body',1),('back.n.body',2),('throat.n.body',3),('sore.adj.hurt',4),('arm.n.body',5),('leg.n.body',6),('hand.n.body',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-32'), 'conversation', 0, 'Aches and pains', 'あちこち痛い', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-32'), 'travel', 1, 'Where does it hurt?', 'どこが痛い？', 'clinic', 'doctor'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-32'), 'business', 2, 'Desk ergonomics', 'デスクの姿勢', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 0, 'npc', 'You don''t look well. What hurts?', '元気なさそう。どこが痛いの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 1, 'user', 'My {head} is pounding.', '頭がずきずきする。', 'head', (SELECT id FROM vocab_senses WHERE slug='head.n.body'), ARRAY['head','arm','leg','hand']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 2, 'npc', 'Did you eat? Maybe your {stomach}?', '食べた？お腹かも？', 'stomach', (SELECT id FROM vocab_senses WHERE slug='stomach.n.body'), ARRAY['head','stomach','back','throat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 3, 'user', 'No, it''s my {throat} too. It''s dry.', 'ううん、のども。乾いてる。', 'throat', (SELECT id FROM vocab_senses WHERE slug='throat.n.body'), ARRAY['stomach','back','throat','leg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 4, 'npc', 'Sounds like a cold. Everything {sore}?', '風邪っぽいね。全身痛い？', 'sore', (SELECT id FROM vocab_senses WHERE slug='sore.adj.hurt'), ARRAY['happy','fresh','sore','easy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 5, 'user', 'Pretty much. I''ll rest.', 'だいたいね。休むよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='conversation'), 6, 'npc', 'Feel better!', 'お大事に！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 0, 'npc', 'Where does it hurt?', 'どこが痛みますか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 1, 'user', 'My lower {back}, mostly.', '主に腰（背中の下）です。', 'back', (SELECT id FROM vocab_senses WHERE slug='back.n.body'), ARRAY['hand','head','throat','back']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 2, 'npc', 'Can you lift your {arm} above your head?', '腕を頭の上まで上げられますか？', 'arm', (SELECT id FROM vocab_senses WHERE slug='arm.n.body'), ARRAY['throat','head','leg','arm']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 3, 'user', 'Yes, but my {leg} is stiff when I walk.', 'はい、でも歩くと脚がこわばって。', 'leg', (SELECT id FROM vocab_senses WHERE slug='leg.n.body'), ARRAY['head','leg','arm','hand']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 4, 'npc', 'I see. Is it very {sore}?', 'なるほど。とても痛いですか？', 'sore', (SELECT id FROM vocab_senses WHERE slug='sore.adj.hurt'), ARRAY['sore','easy','happy','fresh']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 5, 'user', 'A little, when I walk.', '歩くと少し。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='travel'), 6, 'npc', 'Let''s take a look.', '診てみましょう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 0, 'npc', 'Long day at the desk, huh?', '一日中デスクワークだね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 1, 'user', 'Yeah, my {back} aches from sitting all day.', '一日中座って背中が痛い。', 'back', (SELECT id FROM vocab_senses WHERE slug='back.n.body'), ARRAY['throat','leg','back','head']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 2, 'npc', 'Stretch your {hand}s too, from typing.', 'タイピングで手も疲れるよ、伸ばして。', 'hand', (SELECT id FROM vocab_senses WHERE slug='hand.n.body'), ARRAY['throat','leg','head','hand']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 3, 'user', 'Good point. My {arm} feels tight when I reach up.', '確かに。腕を上げると張る。', 'arm', (SELECT id FROM vocab_senses WHERE slug='arm.n.body'), ARRAY['head','arm','throat','leg']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 4, 'npc', 'Take breaks so nothing gets {sore}.', '痛くならないよう休憩をね。', 'sore', (SELECT id FROM vocab_senses WHERE slug='sore.adj.hurt'), ARRAY['sore','happy','easy','fresh']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 5, 'user', 'I''ll set a timer.', 'タイマーをかけるよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-32') AND goal='business'), 6, 'npc', 'Smart.', '賢いね。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-33.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 33 (A2): "Seasons"  (Unit 11, Weather and seasons)
-- ----------------------------------------------------------------------------
-- Words (all new): summer, winter, spring, autumn, snow, cloudy, coat, season.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('seasons', 'Seasons', '季節', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('summer', 'summer', NULL, NULL, NULL, 2, FALSE, NULL),
  ('winter', 'winter', NULL, NULL, NULL, 2, FALSE, NULL),
  ('spring', 'spring', NULL, NULL, NULL, 2, FALSE, NULL),
  ('autumn', 'autumn', NULL, NULL, NULL, 2, FALSE, NULL),
  ('snow', 'snow', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cloudy', 'cloudy', NULL, NULL, NULL, 2, FALSE, NULL),
  ('coat', 'coat', NULL, NULL, NULL, 2, FALSE, NULL),
  ('season', 'season', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='summer'), 'summer.n.season', 1, TRUE, 'noun', '夏', 'the warmest season of the year', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='winter'), 'winter.n.season', 1, TRUE, 'noun', '冬', 'the coldest season of the year', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='spring'), 'spring.n.season', 1, TRUE, 'noun', '春', 'the season when plants start to grow', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='autumn'), 'autumn.n.season', 1, TRUE, 'noun', '秋', 'the season when leaves fall', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='snow'), 'snow.n.weather', 1, TRUE, 'noun', '雪', 'soft white pieces of frozen water that fall', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cloudy'), 'cloudy.adj.sky', 1, TRUE, 'adjective', '曇りの', 'with many clouds in the sky', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='coat'), 'coat.n.clothes', 1, TRUE, 'noun', 'コート', 'a warm outer piece of clothing', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='season'), 'season.n.time', 1, TRUE, 'noun', '季節', 'one of the four parts of the year', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('summer','winter','spring','autumn','snow','cloudy','coat','season')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='seasons'
WHERE s.slug IN ('summer.n.season','winter.n.season','spring.n.season','autumn.n.season','snow.n.weather','cloudy.adj.sky','coat.n.clothes','season.n.time')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-33', 11, 2, (SELECT id FROM vocab_categories WHERE slug='seasons'), 'Seasons', '季節', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-33'), s.id, x.ord
FROM (VALUES
  ('summer.n.season',0),('winter.n.season',1),('spring.n.season',2),('autumn.n.season',3),('snow.n.weather',4),('cloudy.adj.sky',5),('coat.n.clothes',6),('season.n.time',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-33'), 'conversation', 0, 'Favorite season', '好きな季節', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-33'), 'travel', 1, 'When to visit', 'いつ行く？', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-33'), 'business', 2, 'Seasonal planning', '季節の計画', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 0, 'npc', 'What''s your favorite {season}, summer or winter?', '好きな季節は？夏、それとも冬？', 'season', (SELECT id FROM vocab_senses WHERE slug='season.n.time'), ARRAY['month','season','weather','day']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 1, 'user', 'Definitely {summer}. I love the beach.', '絶対夏。海が大好き。', 'summer', (SELECT id FROM vocab_senses WHERE slug='summer.n.season'), ARRAY['spring','summer','winter','autumn']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 2, 'npc', 'Not {winter}, with all the snow?', '雪の多い冬じゃないの？', 'winter', (SELECT id FROM vocab_senses WHERE slug='winter.n.season'), ARRAY['autumn','spring','summer','winter']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 3, 'user', 'Too cold! But white {snow} is pretty.', '寒すぎ！でも白い雪はきれい。', 'snow', (SELECT id FROM vocab_senses WHERE slug='snow.n.weather'), ARRAY['snow','rain','sun','wind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 4, 'npc', 'True. Snowball fights are fun.', '確かに。雪合戦は楽しい。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 5, 'user', 'Ha, sometimes!', 'はは、時々ね！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='conversation'), 6, 'npc', 'Summer it is for you.', '君は夏派だね。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 0, 'npc', 'When''s the best {season} to visit, spring or autumn?', '訪れるのに一番いい季節は？春か秋？', 'season', (SELECT id FROM vocab_senses WHERE slug='season.n.time'), ARRAY['season','day','weather','month']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 1, 'user', 'Is {spring} nice here, when the flowers bloom?', '花が咲く春はここではいい？', 'spring', (SELECT id FROM vocab_senses WHERE slug='spring.n.season'), ARRAY['spring','winter','autumn','summer']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 2, 'npc', 'Very! {autumn} is beautiful too, with the red leaves.', 'とても！紅葉の秋もきれいだよ。', 'autumn', (SELECT id FROM vocab_senses WHERE slug='autumn.n.season'), ARRAY['winter','summer','spring','autumn']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 3, 'user', 'And the weather?', '天気は？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 4, 'npc', 'Mild, though the sky is sometimes grey and {cloudy}.', '穏やか、でも時々空が灰色に曇る。', 'cloudy', (SELECT id FROM vocab_senses WHERE slug='cloudy.adj.sky'), ARRAY['cloudy','sunny','rainy','windy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 5, 'user', 'Perfect for walking.', '散歩にぴったり。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='travel'), 6, 'npc', 'Bring a light jacket.', '薄手のジャケットを持ってきて。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 0, 'npc', 'Let''s schedule the {winter} launch, around December.', '12月ごろ、冬の発売を予定しよう。', 'winter', (SELECT id FROM vocab_senses WHERE slug='winter.n.season'), ARRAY['autumn','summer','winter','spring']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 1, 'user', 'Good. But heavy {snow} could block the roads.', 'いいね。でも大雪で道がふさがるかも。', 'snow', (SELECT id FROM vocab_senses WHERE slug='snow.n.weather'), ARRAY['rain','sun','snow','wind']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 2, 'npc', 'True. Start before the sky turns grey and {cloudy}?', '確かに。空が灰色に曇る前に始める？', 'cloudy', (SELECT id FROM vocab_senses WHERE slug='cloudy.adj.sky'), ARRAY['windy','cloudy','sunny','rainy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 3, 'user', 'Yes. Order warm {coat}s for the staff early.', 'うん。スタッフ用の暖かいコートも早めに。', 'coat', (SELECT id FROM vocab_senses WHERE slug='coat.n.clothes'), ARRAY['hat','bag','coat','shirt']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 4, 'npc', 'Good thinking.', 'いい考え。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 5, 'user', 'I''ll draft a timeline.', '予定表を作るよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-33') AND goal='business'), 6, 'npc', 'Thanks.', 'ありがとう。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-34.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 34 (A2): "Bank & post"  (Unit 12, Services and problems)
-- ----------------------------------------------------------------------------
-- Words (all new): account, send, form, sign, open, close, letter, stamp.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('bank-post', 'Bank and post', '銀行と郵便', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('account', 'account', NULL, NULL, NULL, 2, FALSE, NULL),
  ('send', 'send', NULL, NULL, NULL, 2, FALSE, NULL),
  ('form', 'form', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sign', 'sign', NULL, NULL, NULL, 2, FALSE, NULL),
  ('open', 'open', NULL, NULL, NULL, 2, FALSE, NULL),
  ('close', 'close', NULL, NULL, NULL, 2, FALSE, NULL),
  ('letter', 'letter', NULL, NULL, NULL, 2, FALSE, NULL),
  ('stamp', 'stamp', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='account'), 'account.n.bank', 1, TRUE, 'noun', '口座', 'an arrangement to keep money at a bank', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='send'), 'send.v.mail', 1, TRUE, 'verb', '送る', 'to make something go to a place or person', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='form'), 'form.n.doc', 1, TRUE, 'noun', '用紙', 'a printed paper with spaces to fill in', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sign'), 'sign.v.write', 1, TRUE, 'verb', '署名する', 'to write your name on something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='open'), 'open.v.start', 1, TRUE, 'verb', '開ける', 'to start or make available', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='close'), 'close.v.shut', 1, TRUE, 'verb', '閉じる', 'to shut or stop something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='letter'), 'letter.n.mail', 1, TRUE, 'noun', '手紙', 'a written message sent by post', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='stamp'), 'stamp.n.mail', 1, TRUE, 'noun', '切手', 'a small paper you stick on mail to pay for it', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('account','send','form','sign','open','close','letter','stamp')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='open.v.start'), (SELECT id FROM vocab_senses WHERE slug='close.v.shut'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='close.v.shut'), (SELECT id FROM vocab_senses WHERE slug='open.v.start'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='bank-post'
WHERE s.slug IN ('account.n.bank','send.v.mail','form.n.doc','sign.v.write','open.v.start','close.v.shut','letter.n.mail','stamp.n.mail')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-34', 12, 1, (SELECT id FROM vocab_categories WHERE slug='bank-post'), 'Bank & post', '銀行と郵便', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-34'), s.id, x.ord
FROM (VALUES
  ('account.n.bank',0),('send.v.mail',1),('form.n.doc',2),('sign.v.write',3),('open.v.start',4),('close.v.shut',5),('letter.n.mail',6),('stamp.n.mail',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-34'), 'travel', 0, 'Opening an account', '口座を開く', 'bank', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-34'), 'conversation', 1, 'Sending a letter', '手紙を送る', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-34'), 'business', 2, 'Paperwork', '書類仕事', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 0, 'npc', 'Good afternoon. How can I help?', 'こんにちは。どうされましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 1, 'user', 'I''d like to {open} a savings account.', '貯金口座を開きたいです。', 'open', (SELECT id FROM vocab_senses WHERE slug='open.v.start'), ARRAY['close','open','lose','pay']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 2, 'npc', 'Sure. Please fill this {form}.', 'かしこまりました。この用紙にご記入を。', 'form', (SELECT id FROM vocab_senses WHERE slug='form.n.doc'), ARRAY['letter','list','card','form']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 3, 'user', 'Done. Where do I {sign}?', '書けました。どこにサインを？', 'sign', (SELECT id FROM vocab_senses WHERE slug='sign.v.write'), ARRAY['close','sign','send','open']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 4, 'npc', 'Here. And your {account} is ready.', 'こちらです。口座ができました。', 'account', (SELECT id FROM vocab_senses WHERE slug='account.n.bank'), ARRAY['letter','account','ticket','stamp']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 5, 'user', 'Wonderful. Thank you!', '素晴らしい。ありがとう！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='travel'), 6, 'npc', 'My pleasure.', 'どういたしまして。', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 0, 'npc', 'What are you writing?', '何を書いてるの？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 1, 'user', 'A hand-written {letter} to my grandma.', 'おばあちゃんへの手書きの手紙。', 'letter', (SELECT id FROM vocab_senses WHERE slug='letter.n.mail'), ARRAY['card','list','form','letter']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 2, 'npc', 'How sweet. Will you {send} it today?', '素敵。今日送るの？', 'send', (SELECT id FROM vocab_senses WHERE slug='send.v.mail'), ARRAY['open','close','send','sign']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 3, 'user', 'Yes, once I buy a {stamp}.', 'うん、切手を買ったら。', 'stamp', (SELECT id FROM vocab_senses WHERE slug='stamp.n.mail'), ARRAY['stamp','coin','card','ticket']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 4, 'npc', 'The post office is about to {close}.', '郵便局、もうすぐ閉まるよ。', 'close', (SELECT id FROM vocab_senses WHERE slug='close.v.shut'), ARRAY['sign','open','close','send']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 5, 'user', 'Then I''ll hurry!', 'じゃあ急ぐ！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='conversation'), 6, 'npc', 'Good luck!', '頑張って！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 0, 'npc', 'Can you handle the new client forms?', '新規顧客の書類、お願いできる？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 1, 'user', 'Sure. Which {form} first?', 'うん。どの用紙から？', 'form', (SELECT id FROM vocab_senses WHERE slug='form.n.doc'), ARRAY['form','card','letter','list']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 2, 'npc', 'This one. Please {sign} at the bottom.', 'これ。下にサインして。', 'sign', (SELECT id FROM vocab_senses WHERE slug='sign.v.write'), ARRAY['open','close','send','sign']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 3, 'user', 'Done. Should I {send} it to accounting?', 'できた。経理に送る？', 'send', (SELECT id FROM vocab_senses WHERE slug='send.v.mail'), ARRAY['close','sign','send','open']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 4, 'npc', 'Yes, and note the {account} number.', 'うん、口座番号も控えて。', 'account', (SELECT id FROM vocab_senses WHERE slug='account.n.bank'), ARRAY['ticket','letter','account','stamp']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 5, 'user', 'On it.', '了解。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-34') AND goal='business'), 6, 'npc', 'Thanks!', 'ありがとう！', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-35.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 35 (A2): "Problems & complaints"  (Unit 12, Services and problems)
-- ----------------------------------------------------------------------------
-- Words (all new): broken, wrong, fix, return, problem, complain, refund, replace.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('problems', 'Problems and complaints', 'トラブルと苦情', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('broken', 'broken', NULL, NULL, NULL, 2, FALSE, NULL),
  ('wrong', 'wrong', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fix', 'fix', NULL, NULL, NULL, 2, FALSE, NULL),
  ('return', 'return', NULL, NULL, NULL, 2, FALSE, NULL),
  ('problem', 'problem', NULL, NULL, NULL, 2, FALSE, NULL),
  ('complain', 'complain', NULL, NULL, NULL, 2, FALSE, NULL),
  ('refund', 'refund', NULL, NULL, NULL, 2, FALSE, NULL),
  ('replace', 'replace', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='broken'), 'broken.adj.damaged', 1, TRUE, 'adjective', '壊れた', 'damaged and not working', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='wrong'), 'wrong.adj.incorrect', 1, TRUE, 'adjective', '間違った', 'not correct or not right', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fix'), 'fix.v.repair', 1, TRUE, 'verb', '直す', 'to repair something that is broken', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='return'), 'return.v.giveback', 1, TRUE, 'verb', '返品する', 'to take or send something back', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='problem'), 'problem.n.issue', 1, TRUE, 'noun', '問題', 'something that is wrong and needs fixing', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='complain'), 'complain.v.protest', 1, TRUE, 'verb', '苦情を言う', 'to say you are not happy about something', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='refund'), 'refund.n.money', 1, TRUE, 'noun', '返金', 'money given back to you', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='replace'), 'replace.v.swap', 1, TRUE, 'verb', '交換する', 'to put a new thing in place of another', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('broken','wrong','fix','return','problem','complain','refund','replace')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='problems'
WHERE s.slug IN ('broken.adj.damaged','wrong.adj.incorrect','fix.v.repair','return.v.giveback','problem.n.issue','complain.v.protest','refund.n.money','replace.v.swap')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-35', 12, 2, (SELECT id FROM vocab_categories WHERE slug='problems'), 'Problems & complaints', 'トラブルと苦情', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-35'), s.id, x.ord
FROM (VALUES
  ('broken.adj.damaged',0),('wrong.adj.incorrect',1),('fix.v.repair',2),('return.v.giveback',3),('problem.n.issue',4),('complain.v.protest',5),('refund.n.money',6),('replace.v.swap',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-35'), 'travel', 0, 'A faulty item', '不良品', 'shop', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-35'), 'conversation', 1, 'Tech trouble', '機械トラブル', 'home', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-35'), 'business', 2, 'Handling a complaint', '苦情対応', 'office', 'colleague');

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 0, 'npc', 'Hi, how can I help?', 'こんにちは、どうされましたか？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 1, 'user', 'This phone is {broken}.', 'この電話、壊れてます。', 'broken', (SELECT id FROM vocab_senses WHERE slug='broken.adj.damaged'), ARRAY['cheap','quiet','fresh','broken']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 2, 'npc', 'Oh no. Would you like to {return} it for a refund?', 'あらら。返品して返金されますか？', 'return', (SELECT id FROM vocab_senses WHERE slug='return.v.giveback'), ARRAY['return','open','keep','send']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 3, 'user', 'Yes. Can I get a {refund}?', 'はい。返金してもらえますか？', 'refund', (SELECT id FROM vocab_senses WHERE slug='refund.n.money'), ARRAY['refund','receipt','ticket','change']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 4, 'npc', 'Of course, or we can {replace} it with a new one.', 'もちろん、または新品と交換できます。', 'replace', (SELECT id FROM vocab_senses WHERE slug='replace.v.swap'), ARRAY['return','lose','break','replace']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 5, 'user', 'A new one would be great.', '新品がいいです。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='travel'), 6, 'npc', 'Right away.', 'すぐに。', NULL, NULL, NULL);

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 0, 'npc', 'Why are you frowning at your laptop?', 'なんでパソコンにしかめ面？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 1, 'user', 'The screen is {broken}.', '画面が壊れてる。', 'broken', (SELECT id FROM vocab_senses WHERE slug='broken.adj.damaged'), ARRAY['fresh','clean','broken','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 2, 'npc', 'Is the charger {wrong} too?', '充電器も違うやつ？', 'wrong', (SELECT id FROM vocab_senses WHERE slug='wrong.adj.incorrect'), ARRAY['free','wrong','easy','right']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 3, 'user', 'Maybe. Can you {fix} it?', 'かも。直せる？', 'fix', (SELECT id FROM vocab_senses WHERE slug='fix.v.repair'), ARRAY['fix','break','lose','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 4, 'npc', 'Let me see the {problem}.', '問題を見せて。', 'problem', (SELECT id FROM vocab_senses WHERE slug='problem.n.issue'), ARRAY['answer','plan','problem','view']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 5, 'user', 'Thanks, you''re a lifesaver.', 'ありがとう、助かる。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='conversation'), 6, 'npc', 'Let''s take a look.', '見てみよう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 0, 'npc', 'A customer just called, upset.', 'お客様から怒りの電話が。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 1, 'user', 'What''s the {problem}?', '何が問題？', 'problem', (SELECT id FROM vocab_senses WHERE slug='problem.n.issue'), ARRAY['plan','answer','view','problem']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 2, 'npc', 'Their order was {wrong}.', '注文が間違ってた。', 'wrong', (SELECT id FROM vocab_senses WHERE slug='wrong.adj.incorrect'), ARRAY['right','easy','wrong','free']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 3, 'user', 'Did they {complain} in writing?', '書面で苦情が来た？', 'complain', (SELECT id FROM vocab_senses WHERE slug='complain.v.protest'), ARRAY['relax','complain','laugh','agree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 4, 'npc', 'Yes. Can we {fix} it today?', 'うん。今日中に直せる？', 'fix', (SELECT id FROM vocab_senses WHERE slug='fix.v.repair'), ARRAY['fix','lose','break','drop']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 5, 'user', 'I''ll call them now.', '今すぐ電話する。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-35') AND goal='business'), 6, 'npc', 'Thank you.', 'ありがとう。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-36.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 36 (A2): "Emergencies"  (Unit 12, Services and problems)
-- ----------------------------------------------------------------------------
-- Words (all new): police, lost, hospital, careful, accident, fire, ambulance, danger.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('emergencies', 'Emergencies', '緊急事態', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('police', 'police', NULL, NULL, NULL, 2, FALSE, NULL),
  ('lost', 'lost', NULL, NULL, NULL, 2, FALSE, NULL),
  ('hospital', 'hospital', NULL, NULL, NULL, 2, FALSE, NULL),
  ('careful', 'careful', NULL, NULL, NULL, 2, FALSE, NULL),
  ('accident', 'accident', NULL, NULL, NULL, 2, FALSE, NULL),
  ('fire', 'fire', NULL, NULL, NULL, 2, FALSE, NULL),
  ('ambulance', 'ambulance', NULL, NULL, NULL, 2, FALSE, NULL),
  ('danger', 'danger', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='police'), 'police.n.safety', 1, TRUE, 'noun', '警察', 'people whose job is to keep order and safety', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='lost'), 'lost.adj.astray', 1, TRUE, 'adjective', '道に迷った', 'not knowing where you are', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='hospital'), 'hospital.n.medic', 1, TRUE, 'noun', '病院', 'a place where sick people are treated', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='careful'), 'careful.adj.cautious', 1, TRUE, 'adjective', '気をつけて', 'giving attention to avoid harm', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='accident'), 'accident.n.event', 1, TRUE, 'noun', '事故', 'a sudden event that causes harm', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='fire'), 'fire.n.flame', 1, TRUE, 'noun', '火事', 'flames that burn and can be dangerous', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='ambulance'), 'ambulance.n.medic', 1, TRUE, 'noun', '救急車', 'a vehicle that takes sick people to hospital', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='danger'), 'danger.n.risk', 1, TRUE, 'noun', '危険', 'the chance that something bad will happen', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('police','lost','hospital','careful','accident','fire','ambulance','danger')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='emergencies'
WHERE s.slug IN ('police.n.safety','lost.adj.astray','hospital.n.medic','careful.adj.cautious','accident.n.event','fire.n.flame','ambulance.n.medic','danger.n.risk')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-36', 12, 3, (SELECT id FROM vocab_categories WHERE slug='emergencies'), 'Emergencies', '緊急事態', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-36'), s.id, x.ord
FROM (VALUES
  ('police.n.safety',0),('lost.adj.astray',1),('hospital.n.medic',2),('careful.adj.cautious',3),('accident.n.event',4),('fire.n.flame',5),('ambulance.n.medic',6),('danger.n.risk',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-36'), 'conversation', 0, 'A small accident', 'ちょっとした事故', 'street', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-36'), 'travel', 1, 'Lost and asking help', '迷って助けを求める', 'street', 'local'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-36'), 'business', 2, 'Emergency drill', '避難訓練', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 0, 'npc', 'Are you okay? I saw you fall!', '大丈夫？転んだの見た！', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 1, 'user', 'A small {accident}, but I''m fine.', 'ちょっとした事故、でも平気。', 'accident', (SELECT id FROM vocab_senses WHERE slug='accident.n.event'), ARRAY['party','accident','meeting','tour']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 2, 'npc', 'Please be {careful}!', '気をつけてね！', 'careful', (SELECT id FROM vocab_senses WHERE slug='careful.adj.cautious'), ARRAY['busy','careful','late','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 3, 'user', 'I will. Do I need a {hospital}?', 'うん。病院、要るかな？', 'hospital', (SELECT id FROM vocab_senses WHERE slug='hospital.n.medic'), ARRAY['hospital','museum','library','market']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 4, 'npc', 'Maybe a checkup. Are you {lost} too?', '健診はしたら。道にも迷ってる？', 'lost', (SELECT id FROM vocab_senses WHERE slug='lost.adj.astray'), ARRAY['ready','found','lost','tired']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 5, 'user', 'No, I know the way. Thanks.', 'ううん、道は分かる。ありがとう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='conversation'), 6, 'npc', 'Take care!', '気をつけて！', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 0, 'npc', 'You look worried. Everything okay?', '不安そう。大丈夫？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 1, 'user', 'I''m {lost} and my bag is gone.', '道に迷って、かばんもなくした。', 'lost', (SELECT id FROM vocab_senses WHERE slug='lost.adj.astray'), ARRAY['lost','late','ready','found']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 2, 'npc', 'My bag was stolen. Let''s call the {police}.', 'かばんを盗まれた。警察を呼ぼう。', 'police', (SELECT id FROM vocab_senses WHERE slug='police.n.safety'), ARRAY['guide','police','driver','doctor']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 3, 'user', 'Thank you. Is this area a {danger}?', 'ありがとう。この辺は危険？', 'danger', (SELECT id FROM vocab_senses WHERE slug='danger.n.risk'), ARRAY['danger','museum','party','market']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 4, 'npc', 'No, but always be {careful}.', 'いや、でも常に気をつけて。', 'careful', (SELECT id FROM vocab_senses WHERE slug='careful.adj.cautious'), ARRAY['quiet','late','busy','careful']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 5, 'user', 'I appreciate your help.', '助かります。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='travel'), 6, 'npc', 'Of course.', 'もちろん。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 0, 'npc', 'Today we practice the emergency drill.', '今日は避難訓練をします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 1, 'user', 'Where do we go if there''s a {fire}?', '火事のときはどこへ？', 'fire', (SELECT id FROM vocab_senses WHERE slug='fire.n.flame'), ARRAY['meeting','rain','fire','party']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 2, 'npc', 'Outside, then call an {ambulance} to the hospital if hurt.', '外へ、けが人が出たら病院へ救急車を呼ぶ。', 'ambulance', (SELECT id FROM vocab_senses WHERE slug='ambulance.n.medic'), ARRAY['taxi','train','bus','ambulance']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 3, 'user', 'Understood. Any other {danger}s?', '了解。他に危険は？', 'danger', (SELECT id FROM vocab_senses WHERE slug='danger.n.risk'), ARRAY['market','museum','party','danger']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 4, 'npc', 'Gas leaks. Always be {careful}.', 'ガス漏れ。常に気をつけて。', 'careful', (SELECT id FROM vocab_senses WHERE slug='careful.adj.cautious'), ARRAY['quiet','late','careful','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 5, 'user', 'Got it. Safety first.', '了解。安全第一。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-36') AND goal='business'), 6, 'npc', 'Exactly.', 'その通り。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-37.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 37 (A2): "Describing & comparing"  (Unit 13, The wider world)
-- ----------------------------------------------------------------------------
-- Words (all new): strong, weak, useful, same, different, important, real, true.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('comparing', 'Describing and comparing', '描写と比較', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('strong', 'strong', NULL, NULL, NULL, 2, FALSE, NULL),
  ('weak', 'weak', NULL, NULL, NULL, 2, FALSE, NULL),
  ('useful', 'useful', NULL, NULL, NULL, 2, FALSE, NULL),
  ('same', 'same', NULL, NULL, NULL, 2, FALSE, NULL),
  ('different', 'different', NULL, NULL, NULL, 2, FALSE, NULL),
  ('important', 'important', NULL, NULL, NULL, 2, FALSE, NULL),
  ('real', 'real', NULL, NULL, NULL, 2, FALSE, NULL),
  ('true', 'true', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='strong'), 'strong.adj.power', 1, TRUE, 'adjective', '強い', 'having a lot of power or force', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='weak'), 'weak.adj.power', 1, TRUE, 'adjective', '弱い', 'not having much power or force', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='useful'), 'useful.adj.help', 1, TRUE, 'adjective', '役に立つ', 'helpful for a purpose', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='same'), 'same.adj.identical', 1, TRUE, 'adjective', '同じ', 'not different; alike', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='different'), 'different.adj.unlike', 1, TRUE, 'adjective', '違う', 'not the same', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='important'), 'important.adj.key', 1, TRUE, 'adjective', '重要な', 'having a big effect; mattering a lot', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='real'), 'real.adj.genuine', 1, TRUE, 'adjective', '本物の', 'true and not fake', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='true'), 'true.adj.correct', 1, TRUE, 'adjective', '本当の', 'agreeing with the facts', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('strong','weak','useful','same','different','important','real','true')));

INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type, note_ja) VALUES
  ((SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), (SELECT id FROM vocab_senses WHERE slug='weak.adj.power'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='weak.adj.power'), (SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='same.adj.identical'), (SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), NULL, 'antonym', NULL),
  ((SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), (SELECT id FROM vocab_senses WHERE slug='same.adj.identical'), NULL, 'antonym', NULL);

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='comparing'
WHERE s.slug IN ('strong.adj.power','weak.adj.power','useful.adj.help','same.adj.identical','different.adj.unlike','important.adj.key','real.adj.genuine','true.adj.correct')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-37', 13, 1, (SELECT id FROM vocab_categories WHERE slug='comparing'), 'Describing & comparing', '描写と比較', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-37'), s.id, x.ord
FROM (VALUES
  ('strong.adj.power',0),('weak.adj.power',1),('useful.adj.help',2),('same.adj.identical',3),('different.adj.unlike',4),('important.adj.key',5),('real.adj.genuine',6),('true.adj.correct',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-37'), 'conversation', 0, 'Comparing two options', '二つを比べる', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-37'), 'travel', 1, 'Which one to buy', 'どっちを買う', 'shop', 'clerk'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-37'), 'business', 2, 'Which idea matters', 'どの案が大事', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 0, 'npc', 'These two phones look alike.', 'この二つ、似てるね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 1, 'user', 'They look identical. Are they the {same}?', 'そっくりだね。同じもの？', 'same', (SELECT id FROM vocab_senses WHERE slug='same.adj.identical'), ARRAY['different','new','cheap','same']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 2, 'npc', 'No, totally {different} inside.', 'いや、中身は全く違う。', 'different', (SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), ARRAY['quiet','free','different','same']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 3, 'user', 'Which has a {strong}, long-lasting battery?', 'どっちが強くて長持ちするバッテリー？', 'strong', (SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), ARRAY['short','strong','tall','weak']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 4, 'npc', 'This one. Very {useful} for travel; it does everything.', 'こっち。旅行にすごく役立つ、何でもできる。', 'useful', (SELECT id FROM vocab_senses WHERE slug='useful.adj.help'), ARRAY['useless','quiet','useful','funny']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 5, 'user', 'Then I''ll pick that.', 'じゃあそれにする。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='conversation'), 6, 'npc', 'Good choice.', 'いい選択。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 0, 'npc', 'Looking for a bag?', 'かばんをお探し？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 1, 'user', 'Yes. Is this one {strong} enough to carry books?', 'はい。これ、本を運べるくらい丈夫？', 'strong', (SELECT id FROM vocab_senses WHERE slug='strong.adj.power'), ARRAY['weak','short','strong','tall']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 2, 'npc', 'Very. The other is a bit {weak}; it might tear.', 'とても。もう一方は少し弱くて、破れるかも。', 'weak', (SELECT id FROM vocab_senses WHERE slug='weak.adj.power'), ARRAY['strong','tall','short','weak']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 3, 'user', 'Is a big one more {useful} for long trips?', '大きい方が長旅に役立つ？', 'useful', (SELECT id FROM vocab_senses WHERE slug='useful.adj.help'), ARRAY['quiet','useless','useful','funny']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 4, 'npc', 'For trips, yes. It''s quite {different} from the small one.', '旅行にはね。小さいのとはかなり違う。', 'different', (SELECT id FROM vocab_senses WHERE slug='different.adj.unlike'), ARRAY['quiet','same','free','different']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 5, 'user', 'I''ll take the strong one.', '丈夫な方にします。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='travel'), 6, 'npc', 'Great pick.', 'いい選択。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 0, 'npc', 'We have two proposals.', '提案が二つある。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 1, 'user', 'Which is more {important} to finish first?', 'どっちを先に終わらせるのが大事？', 'important', (SELECT id FROM vocab_senses WHERE slug='important.adj.key'), ARRAY['quiet','useless','cheap','important']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 2, 'npc', 'The second. The numbers are {real}; I checked them myself.', '二つ目。数字は本物、自分で確認した。', 'real', (SELECT id FROM vocab_senses WHERE slug='real.adj.genuine'), ARRAY['fake','free','same','real']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 3, 'user', 'And the claims are {true}, all verified?', '主張は本当？全部確認済み？', 'true', (SELECT id FROM vocab_senses WHERE slug='true.adj.correct'), ARRAY['true','same','false','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 4, 'npc', 'Yes, though the goals are the {same}, word for word.', 'うん、目標は同じ、一字一句。', 'same', (SELECT id FROM vocab_senses WHERE slug='same.adj.identical'), ARRAY['cheap','new','different','same']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 5, 'user', 'Then let''s combine them.', 'じゃあ合わせよう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-37') AND goal='business'), 6, 'npc', 'Smart.', '賢い。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-38.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 38 (A2): "Nature & animals"  (Unit 13, The wider world)
-- ----------------------------------------------------------------------------
-- Words (all new): tree, sea, mountain, dog, cat, bird, river, flower.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('nature', 'Nature and animals', '自然と動物', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('tree', 'tree', NULL, NULL, NULL, 2, FALSE, NULL),
  ('sea', 'sea', NULL, NULL, NULL, 2, FALSE, NULL),
  ('mountain', 'mountain', NULL, NULL, NULL, 2, FALSE, NULL),
  ('dog', 'dog', NULL, NULL, NULL, 2, FALSE, NULL),
  ('cat', 'cat', NULL, NULL, NULL, 2, FALSE, NULL),
  ('bird', 'bird', NULL, NULL, NULL, 2, FALSE, NULL),
  ('river', 'river', NULL, NULL, NULL, 2, FALSE, NULL),
  ('flower', 'flower', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='tree'), 'tree.n.plant', 1, TRUE, 'noun', '木', 'a tall plant with a trunk and branches', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='sea'), 'sea.n.water', 1, TRUE, 'noun', '海', 'the large body of salt water', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='mountain'), 'mountain.n.land', 1, TRUE, 'noun', '山', 'a very high area of land', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='dog'), 'dog.n.animal', 1, TRUE, 'noun', '犬', 'a common animal kept as a pet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='cat'), 'cat.n.animal', 1, TRUE, 'noun', '猫', 'a small animal often kept as a pet', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='bird'), 'bird.n.animal', 1, TRUE, 'noun', '鳥', 'an animal with feathers and wings', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='river'), 'river.n.water', 1, TRUE, 'noun', '川', 'a long line of water that flows to the sea', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='flower'), 'flower.n.plant', 1, TRUE, 'noun', '花', 'the colorful part of a plant', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('tree','sea','mountain','dog','cat','bird','river','flower')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='nature'
WHERE s.slug IN ('tree.n.plant','sea.n.water','mountain.n.land','dog.n.animal','cat.n.animal','bird.n.animal','river.n.water','flower.n.plant')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-38', 13, 2, (SELECT id FROM vocab_categories WHERE slug='nature'), 'Nature & animals', '自然と動物', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-38'), s.id, x.ord
FROM (VALUES
  ('tree.n.plant',0),('sea.n.water',1),('mountain.n.land',2),('dog.n.animal',3),('cat.n.animal',4),('bird.n.animal',5),('river.n.water',6),('flower.n.plant',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-38'), 'conversation', 0, 'A walk in nature', '自然の中を歩く', 'park', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-38'), 'travel', 1, 'A nature tour', '自然ツアー', 'street', 'guide'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-38'), 'business', 2, 'Office pets and plants', 'オフィスのペットと植物', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 0, 'npc', 'It''s so peaceful here.', 'ここ、すごく静か。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 1, 'user', 'Look at that huge {tree}!', 'あの大きな木見て！', 'tree', (SELECT id FROM vocab_senses WHERE slug='tree.n.plant'), ARRAY['bird','flower','river','tree']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 2, 'npc', 'And listen, a {bird} is singing.', '聞いて、鳥が鳴いてる。', 'bird', (SELECT id FROM vocab_senses WHERE slug='bird.n.animal'), ARRAY['cat','bird','dog','fish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 3, 'user', 'Beautiful. Are those red {flower}s, the blooming ones, wild?', 'きれい。あの咲いてる赤い花、野生？', 'flower', (SELECT id FROM vocab_senses WHERE slug='flower.n.plant'), ARRAY['grass','river','tree','flower']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 4, 'npc', 'Yes. The {river}, where the water flows, is close too.', 'うん。水が流れる川も近いよ。', 'river', (SELECT id FROM vocab_senses WHERE slug='river.n.water'), ARRAY['sea','river','tree','road']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 5, 'user', 'Perfect spot for a picnic.', 'ピクニックに最高。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='conversation'), 6, 'npc', 'Let''s stay a while.', '少しいよう。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 0, 'npc', 'Today we''ll see the countryside.', '今日は田舎を見ます。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 1, 'user', 'Will we climb that tall {mountain}?', 'あの高い山に登る？', 'mountain', (SELECT id FROM vocab_senses WHERE slug='mountain.n.land'), ARRAY['mountain','river','tree','bridge']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 2, 'npc', 'Part of it. Then down to the {sea} to swim in salt water.', '途中まで。それから塩水で泳げる海へ下ります。', 'sea', (SELECT id FROM vocab_senses WHERE slug='sea.n.water'), ARRAY['park','river','street','sea']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 3, 'user', 'Is there a {river} to cross on the way?', '途中に渡る川はある？', 'river', (SELECT id FROM vocab_senses WHERE slug='river.n.water'), ARRAY['road','tree','river','sea']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 4, 'npc', 'Yes, with old {tree}s along it.', 'はい、古い木々が並んでます。', 'tree', (SELECT id FROM vocab_senses WHERE slug='tree.n.plant'), ARRAY['tree','flower','bird','river']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 5, 'user', 'Sounds gorgeous.', '素敵そう。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='travel'), 6, 'npc', 'It is. Let''s go.', 'ええ。行きましょう。', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 0, 'npc', 'The office feels dull lately.', '最近オフィスが味気ない。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 1, 'user', 'Maybe an office {dog} to pet and walk?', 'なでたり散歩したりできるオフィス犬でもどう？', 'dog', (SELECT id FROM vocab_senses WHERE slug='dog.n.animal'), ARRAY['dog','cat','bird','fish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 2, 'npc', 'Ha! I''m more of a {cat} person; I love how they purr.', 'はは！私は猫派、あのゴロゴロが好き。', 'cat', (SELECT id FROM vocab_senses WHERE slug='cat.n.animal'), ARRAY['cat','dog','bird','fish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 3, 'user', 'Then some plants? A {flower} on each desk.', 'じゃあ植物？机ごとに花を。', 'flower', (SELECT id FROM vocab_senses WHERE slug='flower.n.plant'), ARRAY['tree','grass','river','flower']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 4, 'npc', 'Nice. Maybe a small {bird} in a cage too?', 'いいね。小さな鳥を鳥かごに入れるのも？', 'bird', (SELECT id FROM vocab_senses WHERE slug='bird.n.animal'), ARRAY['bird','dog','fish','cat']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 5, 'user', 'Let''s start with plants.', 'まず植物から。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-38') AND goal='business'), 6, 'npc', 'Agreed.', '賛成。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-39.sql ═══

-- ============================================================================
-- Vocab 101: Lesson 39 (A2): "Countries & languages"  (Unit 13, The wider world)
-- ----------------------------------------------------------------------------
-- Words (all new): country, language, speak, world, travel, foreign, culture, capital.
-- American spelling, no em-dashes. Parked (published=FALSE). IPA: TODO (author).
-- Run AFTER add-vocab-101.sql and add-vocab-scenes.sql.
-- ============================================================================

INSERT INTO vocab_categories (slug, label_en, label_ja, kind) VALUES
  ('countries', 'Countries and languages', '国と言語', 'theme')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vocab_words (headword, normalized, ipa_us, ipa_uk, ngsl_rank, frequency_band, katakana_trap, katakana_note_ja) VALUES
  ('country', 'country', NULL, NULL, NULL, 2, FALSE, NULL),
  ('language', 'language', NULL, NULL, NULL, 2, FALSE, NULL),
  ('speak', 'speak', NULL, NULL, NULL, 2, FALSE, NULL),
  ('world', 'world', NULL, NULL, NULL, 2, FALSE, NULL),
  ('travel', 'travel', NULL, NULL, NULL, 2, FALSE, NULL),
  ('foreign', 'foreign', NULL, NULL, NULL, 2, FALSE, NULL),
  ('culture', 'culture', NULL, NULL, NULL, 2, FALSE, NULL),
  ('capital', 'capital', NULL, NULL, NULL, 2, FALSE, NULL)
ON CONFLICT (normalized) DO NOTHING;

INSERT INTO vocab_senses (word_id, slug, sense_index, is_primary, pos, gloss_ja, definition_en, cefr, nuance_note_ja) VALUES
  ((SELECT id FROM vocab_words WHERE normalized='country'), 'country.n.nation', 1, TRUE, 'noun', '国', 'an area of land with its own government', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='language'), 'language.n.speech', 1, TRUE, 'noun', '言語', 'the words people use to speak and write', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='speak'), 'speak.v.talk', 1, TRUE, 'verb', '話す', 'to say words with your voice', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='world'), 'world.n.earth', 1, TRUE, 'noun', '世界', 'the earth and all the people on it', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='travel'), 'travel.v.journey', 1, TRUE, 'verb', '旅行する', 'to go from one place to another, often far', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='foreign'), 'foreign.adj.abroad', 1, TRUE, 'adjective', '外国の', 'from or in another country', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='culture'), 'culture.n.society', 1, TRUE, 'noun', '文化', 'the way of life and customs of a people', 'A2', NULL),
  ((SELECT id FROM vocab_words WHERE normalized='capital'), 'capital.n.city', 1, TRUE, 'noun', '首都', 'a country''s main city, where its government is', 'A2', NULL)
ON CONFLICT (slug) DO NOTHING;

DELETE FROM vocab_relations WHERE from_sense_id IN (SELECT id FROM vocab_senses WHERE word_id IN
  (SELECT id FROM vocab_words WHERE normalized IN ('country','language','speak','world','travel','foreign','culture','capital')));

INSERT INTO vocab_sense_categories (sense_id, category_id)
SELECT s.id, c.id FROM vocab_senses s JOIN vocab_categories c ON c.slug='countries'
WHERE s.slug IN ('country.n.nation','language.n.speech','speak.v.talk','world.n.earth','travel.v.journey','foreign.adj.abroad','culture.n.society','capital.n.city')
ON CONFLICT DO NOTHING;

INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free) VALUES
  ('vocab-101-39', 13, 3, (SELECT id FROM vocab_categories WHERE slug='countries'), 'Countries & languages', '国と言語', FALSE, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index, theme_id=EXCLUDED.theme_id,
  title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja, published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-39'), s.id, x.ord
FROM (VALUES
  ('country.n.nation',0),('language.n.speech',1),('speak.v.talk',2),('world.n.earth',3),('travel.v.journey',4),('foreign.adj.abroad',5),('culture.n.society',6),('capital.n.city',7)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug
ON CONFLICT DO NOTHING;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-39'), 'conversation', 0, 'Travel dreams', '旅の夢', 'cafe', 'friend'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-39'), 'travel', 1, 'Where are you from?', 'どこの国？', 'hostel', 'traveller'),
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-39'), 'business', 2, 'A foreign client', '外国のお客様', 'office', 'colleague');

-- conversation
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 0, 'npc', 'If you could go anywhere, where?', 'どこでも行けるなら、どこ？', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 1, 'user', 'So many! Which {country} first, France or Italy?', 'たくさん！どの国が先？フランス、それともイタリア？', 'country', (SELECT id FROM vocab_senses WHERE slug='country.n.nation'), ARRAY['country','world','street','city']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 2, 'npc', 'You love to {travel} to far places, don''t you?', '遠くへ旅行するのが好きだよね？', 'travel', (SELECT id FROM vocab_senses WHERE slug='travel.v.journey'), ARRAY['travel','clean','cook','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 3, 'user', 'I want to see the whole {world}, every country.', '世界中、すべての国を見たい。', 'world', (SELECT id FROM vocab_senses WHERE slug='world.n.earth'), ARRAY['street','room','city','world']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 4, 'npc', 'Would you learn the {language}?', '言語も学ぶ？', 'language', (SELECT id FROM vocab_senses WHERE slug='language.n.speech'), ARRAY['language','music','map','culture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 5, 'user', 'Definitely, at least a little.', 'もちろん、少しは。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='conversation'), 6, 'npc', 'That''s the spirit.', 'その意気。', NULL, NULL, NULL);

-- travel
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 0, 'npc', 'So, which {country} are you from, which nation?', 'で、どこの国の出身？', 'country', (SELECT id FROM vocab_senses WHERE slug='country.n.nation'), ARRAY['street','city','country','world']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 1, 'user', 'Japan. Do you {speak} Japanese?', '日本。日本語話せる？', 'speak', (SELECT id FROM vocab_senses WHERE slug='speak.v.talk'), ARRAY['cook','drive','swim','speak']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 2, 'npc', 'A little! What {language}s do you know?', '少し！何語できる？', 'language', (SELECT id FROM vocab_senses WHERE slug='language.n.speech'), ARRAY['culture','map','music','language']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 3, 'user', 'Two. Is Paris the {capital} of France?', '二つ。パリはフランスの首都？', 'capital', (SELECT id FROM vocab_senses WHERE slug='capital.n.city'), ARRAY['city','map','capital','country']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 4, 'npc', 'It is! You know your geography.', 'そう！地理に詳しいね。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 5, 'user', 'I love learning about places.', '場所を知るのが好き。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='travel'), 6, 'npc', 'Me too!', '私も！', NULL, NULL, NULL);

-- business
INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 0, 'npc', 'We have a {foreign} client visiting from overseas.', '海外からの外国のお客様が来社します。', 'foreign', (SELECT id FROM vocab_senses WHERE slug='foreign.adj.abroad'), ARRAY['local','foreign','cheap','quiet']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 1, 'user', 'Nice. Should I learn about their {culture}?', 'いいね。文化を学んだ方がいい？', 'culture', (SELECT id FROM vocab_senses WHERE slug='culture.n.society'), ARRAY['culture','music','weather','map']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 2, 'npc', 'Yes, it helps. Do you {speak} their language?', 'うん、役立つ。彼らの言語話せる？', 'speak', (SELECT id FROM vocab_senses WHERE slug='speak.v.talk'), ARRAY['swim','drive','cook','speak']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 3, 'user', 'A bit. I''ll practice a few phrases.', '少し。いくつか練習する。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 4, 'npc', 'Great. Which {language} is it?', 'いいね。何語？', 'language', (SELECT id FROM vocab_senses WHERE slug='language.n.speech'), ARRAY['music','map','language','culture']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 5, 'user', 'Spanish. I''ll be ready.', 'スペイン語。準備するよ。', NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-39') AND goal='business'), 6, 'npc', 'Perfect.', '完璧。', NULL, NULL, NULL);

-- ═══ FILE: seed-vocab-101-levels.sql ═══

-- ============================================================================
-- Vocab 101: split the flat course into thematic LEVELS (= units) and add the
-- first unit-review capstone.
-- ----------------------------------------------------------------------------
-- Until now every lesson sat at level_index = 1 (one big "A1" level). This
-- assigns each built lesson to its unit (level_index 1-13, see VOCAB-SCENES.md)
-- and adds a Unit 1 review lesson whose scene recombines all of Unit 1's words.
--
-- Review lessons use the `-review` slug convention (same as the exam course);
-- the app renders them as the level's capstone station.
--
-- Re-runnable. RUN AFTER the per-lesson seeds (seed-vocab-101-a1.sql, 2..10),
-- since those re-assert level_index/order_index on conflict, so this file must be
-- the last word on lesson placement.
-- ============================================================================

-- ── Reassign built lessons to their units ─────────────────────────────────
-- Unit 1 · People & introductions
UPDATE vocab_lessons SET level_index=1, order_index=1 WHERE slug='vocab-101-1';  -- Hello & goodbye
UPDATE vocab_lessons SET level_index=1, order_index=2 WHERE slug='vocab-101-2';  -- Getting to know you
-- Unit 2 · Feelings & relationships
UPDATE vocab_lessons SET level_index=2, order_index=1 WHERE slug='vocab-101-9';  -- Feelings
-- Unit 3 · Home & town
UPDATE vocab_lessons SET level_index=3, order_index=1 WHERE slug='vocab-101-10'; -- Home
UPDATE vocab_lessons SET level_index=3, order_index=2 WHERE slug='vocab-101-5';  -- Finding your way
-- Unit 4 · Daily life
UPDATE vocab_lessons SET level_index=4, order_index=1 WHERE slug='vocab-101-7';  -- Daily routine
UPDATE vocab_lessons SET level_index=4, order_index=2 WHERE slug='vocab-101-6';  -- Making plans
-- Unit 5 · Food & eating
UPDATE vocab_lessons SET level_index=5, order_index=1 WHERE slug='vocab-101-4';  -- Food & drink
-- Unit 6 · Shopping & money
UPDATE vocab_lessons SET level_index=6, order_index=1 WHERE slug='vocab-101-3';  -- Shopping
-- Unit 8 · Free time
UPDATE vocab_lessons SET level_index=8, order_index=1 WHERE slug='vocab-101-8';  -- Free time & hobbies

-- ── Visibility gate ───────────────────────────────────────────────────────
-- A unit only goes live once it is complete (its lessons + review). Units 1
-- (People), 3 (Home & town) and 4 (Daily life) each have two lessons + a review
-- below, so they publish. The single-lesson themes stay hidden as head-start
-- backlog until we finish them (they only need a second lesson + a review).
UPDATE vocab_lessons SET published=true  WHERE slug IN ('vocab-101-1','vocab-101-2','vocab-101-10','vocab-101-5','vocab-101-7','vocab-101-6');
UPDATE vocab_lessons SET published=false WHERE slug IN ('vocab-101-9','vocab-101-4','vocab-101-3','vocab-101-8'); -- Feelings, Food, Shopping, Hobbies

-- ── Unit 1 review capstone ────────────────────────────────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free)
VALUES ('vocab-101-u1-review', 1, 3,
        (SELECT id FROM vocab_categories WHERE slug='greetings'),
        'Review', '復習', true, true)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index,
  theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja,
  published=EXCLUDED.published, free=EXCLUDED.free;

-- Items = every Unit 1 word, so the capstone reviews the whole unit (and any
-- blanked word resolves to an item on the lesson).
DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review'), s.id, x.ord
FROM (VALUES
  ('hello.excl.greeting', 0), ('goodbye.excl.parting', 1), ('yes.excl.affirm', 2),
  ('no.excl.refuse', 3), ('please.adv.polite', 4), ('thanks.excl.thank', 5),
  ('sorry.excl.apolog', 6), ('name.n.identity', 7), ('meet.v.encounter', 8),
  ('live.v.reside', 9), ('work.v.job', 10), ('student.n.learner', 11),
  ('teacher.n.educator', 12), ('friend.n.person', 13), ('city.n.place', 14),
  ('nice.adj.pleasant', 15)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug;

-- Boss scene: a single conversation that recombines Unit 1's words. Only the
-- target-word lines are blanked; the rest play. (Reviews blank more than a
-- normal lesson; this is the payoff for finishing the unit.)
DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review');

INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review'), 'conversation', 0, 'A new class', '新しいクラス', 'classroom', 'classmate');

INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 0, 'npc',  'Hello! Are you new here?',                       'こんにちは！新しく来た方ですか？',       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 1, 'user', 'Yes, hi! It''s nice to {meet} you.',             'はい、こんにちは！はじめまして。',       'meet', (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['call','meet','see','help']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 2, 'npc',  'Nice to meet you too. What''s your {name}?',     'こちらこそ。お名前は？',                 'name', (SELECT id FROM vocab_senses WHERE slug='name.n.identity'), ARRAY['work','age','city','name']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 3, 'user', 'I''m {{user_name}}. I''m a {student} here.',     '{{user_name}}です。ここの生徒です。',    'student', (SELECT id FROM vocab_senses WHERE slug='student.n.learner'), ARRAY['student','friend','doctor','teacher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 4, 'npc',  'Welcome! I''m the {teacher}. Please sit down.',  'ようこそ！私が先生です。どうぞ座って。', 'teacher', (SELECT id FROM vocab_senses WHERE slug='teacher.n.educator'), ARRAY['friend','teacher','waiter','student']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 5, 'user', 'Thanks! Where do you {live}?',                   'ありがとう！どこに住んでいますか？',     'live', (SELECT id FROM vocab_senses WHERE slug='live.v.reside'), ARRAY['live','eat','go','work']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 6, 'npc',  'I live in this {city}, near the station.',       'この街の、駅の近くに住んでいます。',     'city', (SELECT id FROM vocab_senses WHERE slug='city.n.place'), ARRAY['shop','bus','room','city']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 7, 'user', 'Nice. Do you {work} near here?',                 'いいですね。この近くで働いていますか？', 'work', (SELECT id FROM vocab_senses WHERE slug='work.v.job'), ARRAY['work','live','cook','play']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 8, 'npc',  'Yes. My {friend} teaches here too.',             'はい。友達もここで教えています。',       'friend', (SELECT id FROM vocab_senses WHERE slug='friend.n.person'), ARRAY['student','friend','sister','teacher']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 9, 'user', 'That''s {nice}. Goodbye, see you in class!',     'それはいいですね。では、クラスで！',     'nice', (SELECT id FROM vocab_senses WHERE slug='nice.adj.pleasant'), ARRAY['sorry','cold','nice','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u1-review') AND goal='conversation'), 10, 'npc', 'Goodbye! Have a good day.',                      'さようなら！よい一日を。',               NULL, NULL, NULL);

-- ── Unit 3 review capstone (Home & town) ──────────────────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free)
VALUES ('vocab-101-u3-review', 3, 3,
        (SELECT id FROM vocab_categories WHERE slug='directions'),
        'Review', '復習', true, false)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index,
  theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja,
  published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review'), s.id, x.ord
FROM (VALUES
  ('house.n.building', 0), ('room.n.space', 1), ('kitchen.n.cook', 2), ('door.n.entry', 3),
  ('window.n.glass', 4), ('garden.n.yard', 5), ('bed.n.sleep', 6), ('bathroom.n.wash', 7),
  ('where.adv.place', 8), ('turn.v.direction', 9), ('straight.adv.direct', 10), ('near.adj.close', 11),
  ('station.n.transit', 12), ('street.n.road', 13), ('left.adv.direction', 14), ('right.adv.direction', 15)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review'), 'conversation', 0, 'A friend visits', '友達が訪ねてくる', 'home', 'friend');

INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 0, 'npc',  'Hi! I''m near the {station}. Which way now?', 'やあ！駅の近くにいるよ。どっち？',       'station', (SELECT id FROM vocab_senses WHERE slug='station.n.transit'), ARRAY['window','street','station','garden']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 1, 'user', 'Go {straight} down this road.',              'この道をまっすぐ行って。',               'straight', (SELECT id FROM vocab_senses WHERE slug='straight.adv.direct'), ARRAY['back','right','straight','left']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 2, 'user', 'At the shop, {turn} left.',                  'お店の所で左に曲がって。',               'turn', (SELECT id FROM vocab_senses WHERE slug='turn.v.direction'), ARRAY['look','turn','stop','wait']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 3, 'npc',  'Turn left, got it. Is your {street} long?',  '左ね、了解。通りは長い？',               'street', (SELECT id FROM vocab_senses WHERE slug='street.n.road'), ARRAY['door','street','room','garden']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 4, 'user', 'No, it''s {near} now.',                      'ううん、もうすぐだよ。',                 'near', (SELECT id FROM vocab_senses WHERE slug='near.adj.close'), ARRAY['free','late','busy','near']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 5, 'user', 'It''s the white {house} on the right.',      '右側の白い家だよ。',                     'house', (SELECT id FROM vocab_senses WHERE slug='house.n.building'), ARRAY['street','station','house','room']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 6, 'npc',  'Found it! Is this the {kitchen}?',           '着いた！ここが台所？',                   'kitchen', (SELECT id FROM vocab_senses WHERE slug='kitchen.n.cook'), ARRAY['street','station','garden','kitchen']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 7, 'user', 'Yes. And there''s a small {garden} out back.','うん。裏に小さな庭もあるよ。',           'garden', (SELECT id FROM vocab_senses WHERE slug='garden.n.yard'), ARRAY['room','window','garden','door']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 8, 'npc',  'I love this {room}. So bright!',              'この部屋いいね。明るい！',               'room', (SELECT id FROM vocab_senses WHERE slug='room.n.space'), ARRAY['room','garden','kitchen','house']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u3-review') AND goal='conversation'), 9, 'user', 'Thanks! Sit down, make yourself at home.',    'ありがとう！座って、くつろいでね。',     NULL, NULL, NULL);

-- ── Unit 4 review capstone (Daily life) ───────────────────────────────────
INSERT INTO vocab_lessons (slug, level_index, order_index, theme_id, title_en, title_ja, published, free)
VALUES ('vocab-101-u4-review', 4, 3,
        (SELECT id FROM vocab_categories WHERE slug='plans'),
        'Review', '復習', true, false)
ON CONFLICT (slug) DO UPDATE SET
  level_index=EXCLUDED.level_index, order_index=EXCLUDED.order_index,
  theme_id=EXCLUDED.theme_id, title_en=EXCLUDED.title_en, title_ja=EXCLUDED.title_ja,
  published=EXCLUDED.published, free=EXCLUDED.free;

DELETE FROM vocab_lesson_items WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review');
INSERT INTO vocab_lesson_items (lesson_id, sense_id, order_index)
SELECT (SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review'), s.id, x.ord
FROM (VALUES
  ('wake.v.rise', 0), ('shower.v.wash', 1), ('start.v.begin', 2), ('work.v.job', 3),
  ('finish.v.end', 4), ('sleep.v.rest', 5), ('early.adv.time', 6), ('late.adv.time', 7),
  ('time.n.clock', 8), ('free.adj.available', 9), ('busy.adj.occupied', 10), ('meet.v.encounter', 11),
  ('plan.v.arrange', 12), ('when.adv.time', 13), ('today.adv.now', 14), ('tomorrow.adv.nextday', 15),
  ('tonight.adv.evening', 16)
) AS x(slug, ord)
JOIN vocab_senses s ON s.slug = x.slug;

DELETE FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review');
INSERT INTO vocab_scenes (lesson_id, goal, order_index, title_en, title_ja, setting, npc_role) VALUES
  ((SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review'), 'conversation', 0, 'Finding a time', '時間を見つける', 'cafe', 'friend');

INSERT INTO vocab_scene_lines (scene_id, order_index, speaker, text_en, text_ja, blank_answer, blank_sense_id, options) VALUES
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 0, 'npc',  'Are you free tonight?',                      '今夜は空いてる？',                       NULL, NULL, NULL),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 1, 'user', 'Sorry, tonight I''m {busy}.',                'ごめん、今夜は忙しいんだ。',             'busy', (SELECT id FROM vocab_senses WHERE slug='busy.adj.occupied'), ARRAY['early','free','late','busy']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 2, 'npc',  '{When} are you free, then?',                 'じゃあ、いつなら空いてる？',             'When', (SELECT id FROM vocab_senses WHERE slug='when.adv.time'), ARRAY['What','Who','Where','When']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 3, 'user', 'I {finish} work at six.',                    '仕事は6時に終わるよ。',                 'finish', (SELECT id FROM vocab_senses WHERE slug='finish.v.end'), ARRAY['finish','wake','sleep','start']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 4, 'npc',  'And what {time} do you start?',              '始まりは何時？',                         'time', (SELECT id FROM vocab_senses WHERE slug='time.n.clock'), ARRAY['room','plan','day','time']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 5, 'user', 'I {start} at nine.',                         '9時に始まるよ。',                       'start', (SELECT id FROM vocab_senses WHERE slug='start.v.begin'), ARRAY['start','sleep','meet','finish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 6, 'npc',  'Do you {wake} up early?',                    '早く起きるの？',                         'wake', (SELECT id FROM vocab_senses WHERE slug='wake.v.rise'), ARRAY['start','wake','work','sleep']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 7, 'user', 'Yes! I shower and leave by seven, but I {sleep} late on weekends.', 'うん！シャワーして7時には出るよ。でも週末は遅くまで寝る。', 'sleep', (SELECT id FROM vocab_senses WHERE slug='sleep.v.rest'), ARRAY['wake','finish','sleep','start']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 8, 'npc',  'Same here. Let''s {plan} something.',        '同じだね。何か計画しよう。',             'plan', (SELECT id FROM vocab_senses WHERE slug='plan.v.arrange'), ARRAY['work','plan','meet','shower']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 9, 'user', 'Let''s {meet} tomorrow at noon.',            '明日の昼に会おう。',                     'meet', (SELECT id FROM vocab_senses WHERE slug='meet.v.encounter'), ARRAY['meet','wake','plan','finish']),
  ((SELECT id FROM vocab_scenes WHERE lesson_id=(SELECT id FROM vocab_lessons WHERE slug='vocab-101-u4-review') AND goal='conversation'), 10, 'npc', 'Perfect. See you {tomorrow}!',               '完璧。じゃあ明日！',                     'tomorrow', (SELECT id FROM vocab_senses WHERE slug='tomorrow.adv.nextday'), ARRAY['today','when','tonight','tomorrow']);

-- ═══ FILE: publish-vocab-101-all.sql ═══

-- ============================================================================
-- Publish ALL Vocab 101 lessons for in-app testing / authoring.
-- ----------------------------------------------------------------------------
-- Makes every lesson (all A1 + A2 + reviews) visible on the course map. This
-- overrides the production "gate incomplete units" state, so the map will show
-- many single-lesson levels and the parked A2 lessons. That's expected for
-- testing. To return to the clean production map later, see the re-park block
-- at the bottom.
--
-- Re-runnable.
-- ============================================================================

UPDATE vocab_lessons SET published = true WHERE slug LIKE 'vocab-101-%';

-- Keep each review capstone as the LAST station in its level (A2 lessons were
-- added after the review, so bump the review's order so it still sorts last).
UPDATE vocab_lessons SET order_index = 90 WHERE slug LIKE 'vocab-101-%-review';

-- ── To restore the clean production map later (only complete units live) ────
-- Uncomment and run this block to re-park everything except Units 1, 3, 4:
--
-- UPDATE vocab_lessons SET published = false WHERE slug LIKE 'vocab-101-%';
-- UPDATE vocab_lessons SET published = true  WHERE slug IN (
--   'vocab-101-1','vocab-101-2','vocab-101-u1-review',        -- U1 People
--   'vocab-101-10','vocab-101-5','vocab-101-u3-review',       -- U3 Home & town
--   'vocab-101-7','vocab-101-6','vocab-101-u4-review');       -- U4 Daily life

COMMIT;
