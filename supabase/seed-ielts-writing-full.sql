-- ============================================================
--  Full IELTS Academic Writing mock (full_mock → official Writing band)
-- ============================================================
--  Task 1 (describe data, ≥150 words, weight 1) + Task 2 (essay, ≥250 words,
--  weight 2). Both essay/ai_rubric graded against the IELTS Writing band
--  descriptors (0–9). mode=full_mock → official Writing band = (T1 + 2·T2)/3,
--  rounded to the nearest half band. 60-minute timer.
--
--  NOTE: Task 1 uses a bar chart IMAGE (images/ielts-academic-writing-mock-01-
--  task1.png in test-assets). Re-running this seed deletes the form and the
--  group's image link — re-attach the existing asset to the Task 1 group
--  afterwards (set question_groups.image_asset_id; the upload itself survives).
--  payload.reference carries the chart data for the AI grader.
--  All content ORIGINAL. Idempotent. Run AFTER add-practice-tests.sql +
--  seed-test-scales-rubrics.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_rubric uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-academic-writing-mock-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-academic';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-academic not found.'; END IF;
  SELECT id INTO v_rubric FROM rubrics WHERE track_id = v_track AND skill = 'writing' AND name = 'IELTS Writing' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'ielts-academic-writing-mock-01', 'IELTS Academic — Writing Mock Test 1',
          'IELTS アカデミック ライティング模試1', 'full_mock', 3600, true)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'Task 1 & Task 2',
          'Complete both tasks. Task 1 ≥ 150 words (about 20 minutes); Task 2 ≥ 250 words (about 40 minutes). Task 2 counts double.', 0)
  RETURNING id INTO v_sec;

  -- Task 1 (weight 1) — chart image attached separately (see NOTE above)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'image',
    'WRITING TASK 1' || chr(10) ||
    'The bar chart below shows the percentage of people who used four different modes of transport to get to work in one city in 2005 and in 2020.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
          '{"task":"task1","min_words":150,"weight":1,"reference":"Chart data: Car 2005 55% / 2020 40%; Bus 2005 20% / 2020 18%; Bicycle 2005 10% / 2020 22%; Train 2005 15% / 2020 20%. Overall: car commuting fell sharply while cycling more than doubled; train rose moderately; bus roughly stable."}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  -- Task 2 (weight 2)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'WRITING TASK 2')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Some people think governments should spend money improving public transport, while others believe it is better spent on building and maintaining roads. Discuss both views and give your own opinion. Write at least 250 words.',
          '{"task":"task2","min_words":250,"weight":2}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-academic-writing-mock-01 (full_mock; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
