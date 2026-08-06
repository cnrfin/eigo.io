-- ============================================================================
-- Memory Library — personal, photo-anchored vocabulary.
--
-- A "memory" is a photo the learner shared. From each one we keep:
--   • words     — detected object vocab (triaged) + conversation "gap" words
--   • sentences — lines the learner banked from the mascot chat
--
-- Words and sentences carry FSRS-ready columns so spaced review can be layered
-- on later WITHOUT another migration. Photos live in the private `memories`
-- storage bucket, one folder per user. Idempotent; safe to re-run.
-- ============================================================================

-- ── Storage bucket for memory photos (private) ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('memories', 'memories', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users manage own memory photos" ON storage.objects;
CREATE POLICY "Users manage own memory photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path  TEXT,
  context     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_words (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_id      UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  term           TEXT NOT NULL,
  gloss          TEXT,
  pos            TEXT,
  example        TEXT,
  example_gloss  TEXT,
  source         TEXT NOT NULL DEFAULT 'detected' CHECK (source IN ('detected','gap')),
  -- FSRS-ready state (used by the review slice)
  state          TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new','learning','review','relearning')),
  stability      REAL,
  difficulty     REAL,
  scheduled_days REAL NOT NULL DEFAULT 0,
  reps           INT  NOT NULL DEFAULT 0,
  lapses         INT  NOT NULL DEFAULT 0,
  due            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_sentences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_id      UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  en             TEXT NOT NULL,
  ja             TEXT,
  state          TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new','learning','review','relearning')),
  stability      REAL,
  difficulty     REAL,
  scheduled_days REAL NOT NULL DEFAULT 0,
  reps           INT  NOT NULL DEFAULT 0,
  lapses         INT  NOT NULL DEFAULT 0,
  due            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row-level security: users only see/write their own rows ─────────────────
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_sentences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own memories" ON memories;
CREATE POLICY "own memories" ON memories FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own memory words" ON memory_words;
CREATE POLICY "own memory words" ON memory_words FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own memory sentences" ON memory_sentences;
CREATE POLICY "own memory sentences" ON memory_sentences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_words_user_due ON memory_words(user_id, due);
CREATE INDEX IF NOT EXISTS idx_memory_words_memory ON memory_words(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_sentences_user_due ON memory_sentences(user_id, due);
CREATE INDEX IF NOT EXISTS idx_memory_sentences_memory ON memory_sentences(memory_id);
