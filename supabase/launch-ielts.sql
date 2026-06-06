-- ============================================================
--  LAUNCH: IELTS mocks live, practice forms retired
-- ============================================================
--  Publishes both full-mock sets (Academic + General Training, 4 skills each)
--  and DELETES the four old practice forms. Deleting a form cascades its
--  attempts/responses/scores; orphaned Storage audio is cleaned up separately
--  (node scripts/cleanup-toeic-practice-assets.mjs handles any 'practice-01'
--  asset, not just TOEIC).

-- Retire the practice forms
DELETE FROM test_forms WHERE slug IN (
  'ielts-academic-listening-practice-01',
  'ielts-academic-reading-practice-01',
  'ielts-academic-writing-practice-01',
  'ielts-speaking-practice-01'
);

-- Publish both mock sets
UPDATE test_forms SET published = true WHERE set_slug IN (
  'ielts-academic-mock-01',
  'ielts-gt-mock-01'
);
