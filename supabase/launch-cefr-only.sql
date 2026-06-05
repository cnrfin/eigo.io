-- ============================================================
--  LAUNCH GATE: publish only the CEFR Level Check
-- ============================================================
--  Unpublishes every test form except the CEFR check so the first release
--  ships with one exam. `published = false` gates everything server-side:
--  the catalog and set APIs skip the forms and starting an attempt is
--  rejected, so deep links are safe. The category cards on /dashboard/tests
--  automatically show their "Coming this month" state.
--
--  In-flight attempts on unpublished forms are unaffected (resume/results
--  read the attempt, not the publish flag).
update test_forms set published = false where slug <> 'cefr-check-01';

-- When ready to launch the rest, re-publish per exam, e.g.:
--   update test_forms set published = true where slug in
--     ('toeic-lr-listening-mock-01', 'toeic-lr-reading-mock-01');
-- or everything at once:
--   update test_forms set published = true;
