-- User-selectable grading accent for the Pronunciation course.
-- Drives BOTH the grading locale (Azure en-GB / en-US) and, later, which
-- accent's model audio the lessons serve. Defaults to British (brand).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pronunciation_accent TEXT
  DEFAULT 'en-GB'
  CHECK (pronunciation_accent IN ('en-GB', 'en-US'));
