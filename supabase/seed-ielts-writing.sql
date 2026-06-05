-- ============================================================
--  Sample content: IELTS Academic Writing practice (AI-graded)
-- ============================================================
--  Task 1 (describe data, ≥150 words) + Task 2 (discuss both views + opinion,
--  ≥250 words). Both are graded from the text by the AI rubric grader against
--  the IELTS Writing band descriptors (0–9). Task 2 carries payload.weight=2,
--  so when run as a full IELTS mock the overall Writing band is (T1 + 2·T2)/3,
--  rounded to the nearest half — exactly as IELTS weights them.
--
--  NOTE: real Task 1 shows a chart/graph image. Images are deferred, so the
--  data is presented as text in the prompt (fully gradable); attach a chart
--  image to the Task 1 group's image_asset_id later for full fidelity.
--
--  skill_practice form → results show raw % + each task's band & feedback in
--  review. All content is ORIGINAL. Idempotent — re-run replaces the form.
--  Run AFTER add-practice-tests.sql and seed-test-scales-rubrics.sql.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_rubric uuid;
  v_form   uuid;
  v_sec    uuid;
  v_grp    uuid;
  v_q      uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-academic-writing-practice-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-academic';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track ielts-academic not found — run add-practice-tests.sql first.';
  END IF;

  SELECT id INTO v_rubric
  FROM rubrics WHERE track_id = v_track AND skill = 'writing' AND name = 'IELTS Writing' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'ielts-academic-writing-practice-01', 'IELTS Academic — Writing Practice 1',
          'IELTS アカデミック ライティング練習1', 'skill_practice', 3600, true)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'Task 1 & Task 2',
          'Complete both tasks in English. Task 1 ≥ 150 words; Task 2 ≥ 250 words (Task 2 counts double).', 0)
  RETURNING id INTO v_sec;

  -- ── Task 1 (data description, weight 1) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'WRITING TASK 1 — You should spend about 20 minutes on this task.' || chr(10) ||
    'The table below shows the number of visitors (in millions) to three types of tourist attraction in one country in 2000, 2010 and 2020.' || chr(10) || chr(10) ||
    'Museums — 2000: 12,  2010: 18,  2020: 25' || chr(10) ||
    'Theme parks — 2000: 20,  2010: 24,  2020: 22' || chr(10) ||
    'National parks — 2000: 8,  2010: 15,  2020: 30')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
          '{"task":"task1","min_words":150,"weight":1}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  -- ── Task 2 (essay, weight 2) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'WRITING TASK 2 — You should spend about 40 minutes on this task.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Some people believe that universities should mainly prepare students with practical skills for the workplace. Others think the main purpose of university is to pursue knowledge for its own sake. Discuss both views and give your own opinion. Write at least 250 words.',
          '{"task":"task2","min_words":250,"weight":2}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-academic-writing-practice-01 (Task 1 + Task 2; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
