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
