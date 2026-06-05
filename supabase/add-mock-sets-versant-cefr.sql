-- ============================================================
--  Give the Versant + CEFR full mocks set cards / preview screens
-- ============================================================
--  Both are complete in a single sitting, so each becomes a one-section
--  "set": same card on the tests page (title + skill chips + completion)
--  and the same two-column preview screen as the IELTS mock set.
--  Run AFTER add-test-sets.sql. Idempotent.
--  (The seeds scripts/seed-versant.mjs + scripts/seed-cefr.mjs also set
--  these fields now, so re-running them keeps the tagging.)
-- ============================================================

UPDATE test_forms SET
  set_slug = 'versant-mock-01',
  set_title = 'Versant Style — Speaking & Listening Mock Test 1',
  set_title_ja = 'Versant形式 スピーキング＆リスニング模試1',
  set_order = 0
WHERE slug = 'versant-eslt-mock-01';

UPDATE test_forms SET
  set_slug = 'cefr-check',
  set_title = 'CEFR Level Check',
  set_title_ja = 'CEFR レベルチェック',
  set_order = 0
WHERE slug = 'cefr-check-01';
