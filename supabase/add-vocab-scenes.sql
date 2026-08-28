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
