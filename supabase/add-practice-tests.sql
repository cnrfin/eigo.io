-- ============================================================
--  Practice Tests — assessment engine for IELTS / TOEIC / EIKEN
-- ============================================================
--  One model expresses all three exams as DATA, not code:
--    - Content catalog (authored once, shared by every exam)
--    - Per-user attempt data (one row-set per sitting)
--
--  IMPORTANT — intellectual property:
--  All items stored here are ORIGINAL practice material written
--  to match each exam's publicly documented format. "IELTS",
--  "TOEIC" and "EIKEN" are trademarks of their respective owners
--  (British Council/IDP/Cambridge, ETS, and Eiken Foundation of
--  Japan). No official or licensed exam content is stored here.
--
--  SECURITY — answer leakage:
--  Tables that contain correct answers (question_options.is_correct,
--  questions.payload accepted-answers, assets.transcript) are
--  service-role-only. Questions must be delivered to clients through
--  an API route that STRIPS answer fields, and grading must run
--  server-side. RLS below enforces this: clients can browse the
--  exam catalogue (exams, tracks, published forms) but cannot read
--  raw answer-bearing rows directly.
-- ============================================================


-- ============================================================
--  1. CONTENT CATALOG
-- ============================================================

-- Exam families: IELTS, TOEIC, EIKEN
CREATE TABLE IF NOT EXISTS exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,                       -- 'ielts' | 'toeic' | 'eiken'
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  trademark_notice TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A "track" = anything you can sit and get ONE score for.
-- This absorbs all the cross-exam variation:
--   EIKEN grades (5,4,3,Pre-2,Pre-2 Plus,2,Pre-1,1) -> 8 tracks
--   IELTS Academic / General Training               -> 2 tracks
--   TOEIC Listening&Reading / Speaking&Writing       -> 2 tracks
CREATE TABLE IF NOT EXISTS exam_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  slug TEXT UNIQUE NOT NULL,                        -- 'ielts-academic','toeic-lr','eiken-grade-2'...
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL DEFAULT '',
  level_label TEXT NOT NULL DEFAULT '',             -- e.g. 'Grade Pre-2 Plus'
  scoring_model TEXT NOT NULL DEFAULT 'raw'
    CHECK (scoring_model IN ('band', 'scaled', 'cse_passfail', 'raw')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw -> reported score conversion (band tables, 5-495 scaling,
-- CSE mapping, pass/fail thresholds). skill NULL = overall scale.
CREATE TABLE IF NOT EXISTS score_scales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES exam_tracks(id) ON DELETE CASCADE NOT NULL,
  skill TEXT CHECK (skill IN ('reading', 'listening', 'writing', 'speaking')),
  scale JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scoring rubrics for AI / human-graded skills (band descriptors,
-- EIKEN writing criteria, TOEIC S&W scales).
CREATE TABLE IF NOT EXISTS rubrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES exam_tracks(id) ON DELETE CASCADE,
  skill TEXT NOT NULL CHECK (skill IN ('writing', 'speaking')),
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media: listening audio + images (TOEIC photos, IELTS Academic charts).
-- transcript is the listening answer key -> service-role only.
CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('audio', 'image')),
  storage_path TEXT NOT NULL,                       -- Supabase storage object path
  duration_seconds NUMERIC(8,2),
  transcript TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A concrete paper: a full mock OR a single-skill practice set.
CREATE TABLE IF NOT EXISTS test_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES exam_tracks(id) ON DELETE CASCADE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_ja TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'full_mock'
    CHECK (mode IN ('full_mock', 'skill_practice')),
  time_limit_seconds INTEGER,                       -- whole-form limit (sections may carry their own)
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One skill block of a form: 'Part 1', 'Listening Section 3', etc.
CREATE TABLE IF NOT EXISTS sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES test_forms(id) ON DELETE CASCADE NOT NULL,
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'listening', 'writing', 'speaking')),
  part_label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  time_limit_seconds INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A shared stimulus that several questions hang off:
-- reading passage, audio clip, a photo, or a writing prompt.
CREATE TABLE IF NOT EXISTS question_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  stimulus_type TEXT NOT NULL DEFAULT 'none'
    CHECK (stimulus_type IN ('none', 'passage', 'audio', 'image', 'prompt')),
  passage_text TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  audio_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  image_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The polymorphic item. question_type + payload + scoring_method
-- is what lets ONE engine render and grade every exam format.
--   payload examples:
--     gap_fill            -> {"accepted": ["colour","color"], "case_sensitive": false}
--     matching            -> {"pairs": [...], "options": [...]}
--     speaking_response   -> {"subtask": "long_turn", "prep_seconds": 60, "speak_seconds": 120}
--     essay/email         -> {"min_words": 250, "task": "task2"}
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES question_groups(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'single_choice', 'multiple_choice', 'gap_fill', 'matching',
    'true_false_notgiven', 'ordering', 'short_answer',
    'essay', 'email_response', 'speaking_response'
  )),
  scoring_method TEXT NOT NULL DEFAULT 'auto_choice' CHECK (scoring_method IN (
    'auto_choice', 'auto_text', 'ai_rubric', 'human', 'ai_plus_human'
  )),
  prompt TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,        -- type-specific data incl. accepted answers
  rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Choices for *_choice / true_false_notgiven questions.
-- is_correct is the answer key -> service-role only.
CREATE TABLE IF NOT EXISTS question_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT '',                   -- 'A','B','C','D'
  content TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
--  2. PER-USER ATTEMPT DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  form_id UUID REFERENCES test_forms(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'scored')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  raw_score NUMERIC(7,2),
  overall_score JSONB NOT NULL DEFAULT '{}'::jsonb,  -- band/scaled/CSE + pass/fail summary
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,        -- resumable per-section cursor + timers
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per answered question. Spans all answer shapes:
-- selected options, free text, or a recorded audio asset + transcript.
CREATE TABLE IF NOT EXISTS responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES test_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  selected_option_ids UUID[] NOT NULL DEFAULT '{}',
  text_response TEXT NOT NULL DEFAULT '',
  audio_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,  -- via recordings pipeline
  transcript TEXT NOT NULL DEFAULT '',                            -- via transcriptions pipeline
  is_correct BOOLEAN,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  graded_by TEXT CHECK (graded_by IN ('auto', 'ai', 'tutor')),
  grader_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ai_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,    -- rubric breakdown + comments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);

-- Denormalized per-skill result so the dashboard reads cheaply.
CREATE TABLE IF NOT EXISTS attempt_skill_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES test_attempts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'listening', 'writing', 'speaking')),
  raw_score NUMERIC(7,2),
  scaled_score NUMERIC(7,2),                         -- band / scaled / CSE for that skill
  max_score NUMERIC(7,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attempt_id, skill)
);


-- ============================================================
--  3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_exam_tracks_exam ON exam_tracks(exam_id);
CREATE INDEX IF NOT EXISTS idx_score_scales_track ON score_scales(track_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_track ON rubrics(track_id);
CREATE INDEX IF NOT EXISTS idx_test_forms_track ON test_forms(track_id);
CREATE INDEX IF NOT EXISTS idx_test_forms_published ON test_forms(track_id, published);
CREATE INDEX IF NOT EXISTS idx_sections_form ON sections(form_id);
CREATE INDEX IF NOT EXISTS idx_question_groups_section ON question_groups(section_id);
CREATE INDEX IF NOT EXISTS idx_questions_group ON questions(group_id);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_form ON test_attempts(form_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_status ON test_attempts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_responses_attempt ON responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_attempt_skill_scores_attempt ON attempt_skill_scores(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_skill_scores_user ON attempt_skill_scores(user_id, skill);


-- ============================================================
--  4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE exams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_tracks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_scales       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_forms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_skill_scores ENABLE ROW LEVEL SECURITY;

-- ---- Catalogue browsing (safe, non-answer-bearing) ----
-- Anyone authenticated may list exams, tracks, and published forms.
CREATE POLICY "Anyone can read exams"
  ON exams FOR SELECT USING (true);

CREATE POLICY "Anyone can read tracks"
  ON exam_tracks FOR SELECT USING (true);

CREATE POLICY "Anyone can read published forms"
  ON test_forms FOR SELECT USING (published = true);

-- ---- Answer-bearing / content tables: SERVICE ROLE ONLY ----
-- These are served to clients ONLY through API routes that strip
-- answer fields. No direct client SELECT.
CREATE POLICY "Service role full access score_scales"
  ON score_scales FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access rubrics"
  ON rubrics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access assets"
  ON assets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access sections"
  ON sections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access question_groups"
  ON question_groups FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access questions"
  ON questions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access question_options"
  ON question_options FOR ALL USING (auth.role() = 'service_role');

-- Service role also manages catalogue authoring for the browsable tables.
CREATE POLICY "Service role full access exams"
  ON exams FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access tracks"
  ON exam_tracks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access forms"
  ON test_forms FOR ALL USING (auth.role() = 'service_role');

-- ---- Per-user attempt data ----
-- Users may read and manage their own attempts/responses (save progress).
-- Authoritative grading fields (score, is_correct) are written by the
-- service role during server-side grading.
CREATE POLICY "Users can view own attempts"
  ON test_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own attempts"
  ON test_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access attempts"
  ON test_attempts FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own responses"
  ON responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_attempts a
    WHERE a.id = responses.attempt_id AND a.user_id = auth.uid()
  ));
CREATE POLICY "Users can manage own responses"
  ON responses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM test_attempts a
    WHERE a.id = responses.attempt_id AND a.user_id = auth.uid()
  ));
CREATE POLICY "Service role full access responses"
  ON responses FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own skill scores"
  ON attempt_skill_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access skill scores"
  ON attempt_skill_scores FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
--  5. SEED — exam families + tracks
-- ============================================================

INSERT INTO exams (slug, name, name_ja, trademark_notice, order_index) VALUES
  ('ielts', 'IELTS', 'アイエルツ',
   'IELTS is a registered trademark of the British Council, IDP: IELTS Australia and Cambridge Assessment English. This product is not endorsed by or affiliated with them.', 1),
  ('toeic', 'TOEIC', 'トーイック',
   'TOEIC is a registered trademark of ETS. This product is not endorsed by or affiliated with ETS.', 2),
  ('eiken', 'EIKEN', '英検',
   'EIKEN is a registered trademark of the Eiken Foundation of Japan. This product is not endorsed by or affiliated with the Foundation.', 3)
ON CONFLICT (slug) DO NOTHING;

-- IELTS tracks
INSERT INTO exam_tracks (exam_id, slug, name, name_ja, level_label, scoring_model, order_index)
SELECT e.id, t.slug, t.name, t.name_ja, t.level_label, 'band', t.ord
FROM exams e
JOIN (VALUES
  ('ielts-academic', 'IELTS Academic',          'アカデミック', '', 1),
  ('ielts-general',  'IELTS General Training',   'ジェネラル',   '', 2)
) AS t(slug, name, name_ja, level_label, ord) ON TRUE
WHERE e.slug = 'ielts'
ON CONFLICT (slug) DO NOTHING;

-- TOEIC tracks
INSERT INTO exam_tracks (exam_id, slug, name, name_ja, level_label, scoring_model, order_index)
SELECT e.id, t.slug, t.name, t.name_ja, t.level_label, 'scaled', t.ord
FROM exams e
JOIN (VALUES
  ('toeic-lr', 'TOEIC Listening & Reading', 'L&R', '', 1),
  ('toeic-sw', 'TOEIC Speaking & Writing',  'S&W', '', 2)
) AS t(slug, name, name_ja, level_label, ord) ON TRUE
WHERE e.slug = 'toeic'
ON CONFLICT (slug) DO NOTHING;

-- EIKEN tracks (all grades, incl. Pre-2 Plus added in 2025)
INSERT INTO exam_tracks (exam_id, slug, name, name_ja, level_label, scoring_model, order_index)
SELECT e.id, t.slug, t.name, t.name_ja, t.level_label, 'cse_passfail', t.ord
FROM exams e
JOIN (VALUES
  ('eiken-grade-5',      'EIKEN Grade 5',       '5級',      'Grade 5',       1),
  ('eiken-grade-4',      'EIKEN Grade 4',       '4級',      'Grade 4',       2),
  ('eiken-grade-3',      'EIKEN Grade 3',       '3級',      'Grade 3',       3),
  ('eiken-grade-pre2',   'EIKEN Grade Pre-2',   '準2級',    'Grade Pre-2',   4),
  ('eiken-grade-pre2plus','EIKEN Grade Pre-2 Plus','準2級プラス','Grade Pre-2 Plus', 5),
  ('eiken-grade-2',      'EIKEN Grade 2',       '2級',      'Grade 2',       6),
  ('eiken-grade-pre1',   'EIKEN Grade Pre-1',   '準1級',    'Grade Pre-1',   7),
  ('eiken-grade-1',      'EIKEN Grade 1',       '1級',      'Grade 1',       8)
) AS t(slug, name, name_ja, level_label, ord) ON TRUE
WHERE e.slug = 'eiken'
ON CONFLICT (slug) DO NOTHING;
