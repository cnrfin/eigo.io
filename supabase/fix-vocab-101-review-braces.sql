-- ============================================================================
-- Fix two stray-brace issues in Vocab 101 review scenes (found by content audit).
-- Surgical: uses replace() so only the stray {token} is stripped; any other
-- wording edits on these lines are preserved. Idempotent.
--
--  u2-review  · conversation L1 (order 0): {happy} in a PLAY line -> unbrace.
--  u12-review · conversation L9 (order 8): two tokens; keep {careful}, unbrace
--               {police} (careful is the blanked answer).
-- ============================================================================

UPDATE vocab_scene_lines
SET text_en = replace(text_en, '{happy}', 'happy')
WHERE order_index = 0
  AND scene_id = (SELECT id FROM vocab_scenes WHERE goal = 'conversation'
                  AND lesson_id = (SELECT id FROM vocab_lessons WHERE slug = 'vocab-101-u2-review'));

UPDATE vocab_scene_lines
SET text_en = replace(text_en, '{police}', 'police')
WHERE order_index = 8
  AND scene_id = (SELECT id FROM vocab_scenes WHERE goal = 'conversation'
                  AND lesson_id = (SELECT id FROM vocab_lessons WHERE slug = 'vocab-101-u12-review'));
