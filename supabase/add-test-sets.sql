-- ============================================================
--  Mock-test SETS: group single-skill mock forms into one mock
-- ============================================================
--  A "set" bundles the per-skill sections of one full mock (e.g. the four
--  IELTS Academic Mock 1 papers). Sections are taken in SEPARATE sittings —
--  like the real exams — and each is graded immediately on submission. The
--  OFFICIAL combined result (IELTS overall band, EIKEN CSE total + pass/fail)
--  is only computed once every section in the set is scored
--  (GET /api/tests/sets/[slug]).
--
--  Forms with set_slug NULL stay standalone (practice forms, Versant, CEFR).
--  Idempotent. Run in the Supabase SQL editor.
-- ============================================================

ALTER TABLE test_forms ADD COLUMN IF NOT EXISTS set_slug TEXT;
ALTER TABLE test_forms ADD COLUMN IF NOT EXISTS set_title TEXT NOT NULL DEFAULT '';
ALTER TABLE test_forms ADD COLUMN IF NOT EXISTS set_title_ja TEXT NOT NULL DEFAULT '';
ALTER TABLE test_forms ADD COLUMN IF NOT EXISTS set_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_test_forms_set_slug ON test_forms(set_slug) WHERE set_slug IS NOT NULL;

-- ── Tag the IELTS Academic full mock as one set (exam-day order: L, R, W, S) ──
UPDATE test_forms SET
  set_slug   = 'ielts-academic-mock-01',
  set_title  = 'IELTS Academic — Mock Test 1',
  set_title_ja = 'IELTS アカデミック模試1',
  set_order  = CASE slug
    WHEN 'ielts-listening-mock-01'        THEN 0
    WHEN 'ielts-academic-reading-mock-01' THEN 1
    WHEN 'ielts-academic-writing-mock-01' THEN 2
    WHEN 'ielts-speaking-mock-01'         THEN 3
    ELSE 0
  END
WHERE slug IN (
  'ielts-listening-mock-01',
  'ielts-academic-reading-mock-01',
  'ielts-academic-writing-mock-01',
  'ielts-speaking-mock-01'
);
