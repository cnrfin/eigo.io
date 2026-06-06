-- ============================================================
--  LAUNCH: TOEIC mocks live, practice forms retired
-- ============================================================
--  Publishes the four full-mock TOEIC forms (L&R set + S&W set) and DELETES
--  the old single-skill practice forms. Deleting a form cascades its
--  attempts/responses/scores; the practice listening clips in Storage are
--  cleaned up separately (storage isn't reachable from SQL) — ask Claude or
--  remove listening/toeic-lr-listening-practice-01-*.mp3 in the dashboard.

-- Retire the practice forms (full mocks replace them)
DELETE FROM test_forms WHERE slug IN (
  'toeic-lr-reading-practice-01',
  'toeic-lr-listening-practice-01',
  'toeic-sw-speaking-practice-01',
  'toeic-sw-writing-practice-01'
);

-- Publish the mocks
UPDATE test_forms SET published = true WHERE slug IN (
  'toeic-lr-listening-mock-01',
  'toeic-lr-reading-mock-01',
  'toeic-sw-speaking-mock-01',
  'toeic-sw-writing-mock-01'
);
