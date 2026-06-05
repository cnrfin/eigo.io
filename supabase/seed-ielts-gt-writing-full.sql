-- ============================================================
--  Full IELTS General Training Writing mock (Task 1 letter + Task 2 essay)
-- ============================================================
--  GT Writing differs from Academic in Task 1 only: a LETTER (here:
--  semi-formal complaint to a company) instead of a chart description.
--  Task 2 is an essay in both variants and counts double (payload.weight=2).
--  Both tasks AI/human-graded against the IELTS Writing band descriptors (0–9).
--  Part of set ielts-gt-mock-01. All content ORIGINAL. Idempotent.
--  Run AFTER add-practice-tests.sql + seed-test-scales-rubrics.sql +
--  add-test-sets.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_rubric uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-writing-mock-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;
  SELECT id INTO v_rubric FROM rubrics WHERE track_id = v_track AND skill = 'writing' AND name = 'IELTS Writing' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-writing-mock-01', 'IELTS General Training — Writing Mock Test 1',
          'IELTS ジェネラル ライティング模試1', 'full_mock', 3600, true,
          'ielts-gt-mock-01', 'IELTS General Training — Mock Test 1', 'IELTS ジェネラル模試1', 2)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'Task 1 & Task 2',
          'Complete both tasks. Task 1 ≥ 150 words (about 20 minutes); Task 2 ≥ 250 words (about 40 minutes). Task 2 counts double.', 0)
  RETURNING id INTO v_sec;

  -- Task 1: letter (weight 1)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'WRITING TASK 1' || chr(10) ||
    'You recently bought a kitchen appliance from an online store, but when it arrived it did not work properly.' || chr(10) || chr(10) ||
    'Write a letter to the company. In your letter:' || chr(10) ||
    '• describe what you bought and when you bought it' || chr(10) ||
    '• explain what is wrong with it' || chr(10) ||
    '• say what you would like the company to do' || chr(10) || chr(10) ||
    'Begin your letter as follows:  Dear Sir or Madam,')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Write your letter. You do NOT need to write any addresses. Write at least 150 words.',
          '{"task":"task1_letter","min_words":150,"weight":1}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  -- Task 2: essay (weight 2)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'WRITING TASK 2')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'In many countries, more and more people are moving away from small towns to large cities. Why is this happening? Do the advantages of this development outweigh the disadvantages? Write at least 250 words.',
          '{"task":"task2","min_words":250,"weight":2}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-writing-mock-01 (letter + essay; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
