-- ============================================================================
-- Publish ALL Vocab 101 lessons for in-app testing / authoring.
-- ----------------------------------------------------------------------------
-- Makes every lesson (all A1 + A2 + reviews) visible on the course map. This
-- overrides the production "gate incomplete units" state, so the map will show
-- many single-lesson levels and the parked A2 lessons. That's expected for
-- testing. To return to the clean production map later, see the re-park block
-- at the bottom.
--
-- Re-runnable.
-- ============================================================================

UPDATE vocab_lessons SET published = true WHERE slug LIKE 'vocab-101-%';

-- Keep each review capstone as the LAST station in its level (A2 lessons were
-- added after the review, so bump the review's order so it still sorts last).
UPDATE vocab_lessons SET order_index = 90 WHERE slug LIKE 'vocab-101-%-review';

-- ── To restore the clean production map later (only complete units live) ────
-- Uncomment and run this block to re-park everything except Units 1, 3, 4:
--
-- UPDATE vocab_lessons SET published = false WHERE slug LIKE 'vocab-101-%';
-- UPDATE vocab_lessons SET published = true  WHERE slug IN (
--   'vocab-101-1','vocab-101-2','vocab-101-u1-review',        -- U1 People
--   'vocab-101-10','vocab-101-5','vocab-101-u3-review',       -- U3 Home & town
--   'vocab-101-7','vocab-101-6','vocab-101-u4-review');       -- U4 Daily life
