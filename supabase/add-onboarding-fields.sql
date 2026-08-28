-- ============================================================================
-- Onboarding profile fields
-- ----------------------------------------------------------------------------
-- Captured during the pre-signup onboarding flow (eigo-ios app/onboarding/*)
-- and flushed into the profile on first authenticated load. All optional; the
-- user can edit them later in Settings.
--
--   english_name        Name to address the learner by in vocab scenes
--                       ({{user_name}}). Distinct from display_name / auth name.
--   occupation          'student' | 'worker'.
--   profession          Effective profession for scene tokens
--                       ({{profession}} / {{a_profession}}): 'student', or the
--                       worker's free-text job.
--   learning_goals      Up to 2 of 'conversation' | 'travel' | 'work' | 'exam'.
--                       conversation/travel/work map to vocab scene goal types;
--                       'exam' flags exam/test content (no scene).
--   self_assessed_level 'beginner' | 'high_beginner' | 'intermediate' |
--                       'high_intermediate' | 'advanced'. A rough self-placement
--                       (self-report or the quick word check) — NOT the real,
--                       test-derived cefr_level.
--   avatar_config       Rive user-teacup configuration (head/face/body/etc).
--                       JSONB so the shape can evolve with the avatar builder.
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists english_name        text,
  add column if not exists occupation          text,
  add column if not exists profession          text,
  add column if not exists learning_goals      text[],
  add column if not exists self_assessed_level text,
  add column if not exists avatar_config       jsonb;
