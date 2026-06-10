-- ============================================================
--  Mini courses (Brilliant-style prep courses, one per exam)
-- ============================================================
--  Courses teach the QUESTION TYPES of each exam's mock tests with fresh
--  examples — never the mock answers themselves. Content tables are
--  service-role only (screens contain answers + explanations); all access
--  goes through /api/courses/* which gates on entitlement (the first lesson
--  of every course is free; the rest need any non-cancelled subscription,
--  same rule as the mock tests). Progress is per user per lesson.
--  Run once in the SQL editor. Idempotent.

CREATE TABLE IF NOT EXISTS courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  exam_slug   TEXT NOT NULL,             -- 'toeic' | 'ielts' | 'eiken' | 'versant' (exams.slug)
  title       TEXT NOT NULL,
  title_ja    TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  description_ja TEXT NOT NULL DEFAULT '',
  published   BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title       TEXT NOT NULL,
  title_ja    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id    UUID NOT NULL REFERENCES course_levels(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  title_ja    TEXT NOT NULL,
  free        BOOLEAN NOT NULL DEFAULT false,   -- first lesson of each course
  estimated_minutes INTEGER NOT NULL DEFAULT 10
);

-- One screen = one step of a lesson. type 'concept' renders content
-- (markdown-ish JA body, optional EN); type 'question' renders an exercise
-- with instant feedback: content carries the same payload shapes the test
-- engine uses (question_type, prompt, options with is_correct, accepted,
-- explanation_ja). Audio for listening drills via audio_asset_id.
CREATE TABLE IF NOT EXISTS lesson_screens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  type        TEXT NOT NULL CHECK (type IN ('concept', 'question')),
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  image_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  screen_index INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- Content is answer-bearing → service-role only (like the test tables):
ALTER TABLE courses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_levels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
-- (no policies: anon/authenticated cannot read; the API uses service role)

CREATE INDEX IF NOT EXISTS idx_course_levels_course ON course_levels(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_level        ON lessons(level_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_screens_lesson ON lesson_screens(lesson_id, order_index);
