-- Latest exam results per exam, attached to the student's profile.
-- Keyed by exam-track slug, latest scored result wins. Examples:
--   { "toeic-lr":       { "total": 875, "per_skill": [...], "updated_at": "..." },
--     "ielts-academic": { "overall_band": 6.5, "per_skill": [...], "updated_at": "..." },
--     "versant":        { "gse": 61, "cefr": "B1+", "updated_at": "..." },
--     "cefr":           { "level": "B2", "cefr_j": "B2.1", "updated_at": "..." } }
-- Written by finalizeAttempt (single-form exams) and the set-results API
-- (multi-section mocks, once every section is scored). Estimates, not
-- official certifications. Run AFTER add-cefr-level-to-profiles.sql.
alter table public.profiles
  add column if not exists exam_scores jsonb not null default '{}';
