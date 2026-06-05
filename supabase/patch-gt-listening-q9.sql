-- Widen the accepted answers for GT Listening S1 Q9 (arrival time) without
-- re-running the seed script (which would regenerate all the audio).
-- Adds colloquial variants: "half 8", "half past 8", "half eight", am-suffixed
-- and spaced forms. Idempotent.
UPDATE questions q
SET payload = '{"accepted":["8.30","8:30","830","8 30","8.30 am","8:30 am","8.30am","8:30am","half past eight","half past 8","half eight","half 8"],"case_sensitive":false}'::jsonb
FROM question_groups g, sections s, test_forms f
WHERE q.group_id = g.id
  AND g.section_id = s.id
  AND s.form_id = f.id
  AND f.slug = 'ielts-gt-listening-mock-01'
  AND q.prompt = 'Arrival time:  ______ in the morning';
