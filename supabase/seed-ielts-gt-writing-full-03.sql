-- ============================================================
--  IELTS General Training Writing MOCK 3 (Task 1 letter + Task 2 essay)
-- ============================================================
--  Third GT paper, completing the register rotation: Task 1 is a SEMI-FORMAL
--  letter to your manager (Mock 1: formal complaint; Mock 2: informal letter
--  to a friend). Task 2 is a discuss-both-views question (Mock 1: advantages/
--  disadvantages; Mock 2: agree/disagree). Task 2 counts double.
--  Part of set ielts-gt-mock-03. Seeded UNPUBLISHED for draft review.
--  All content ORIGINAL. Idempotent.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_rubric uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-writing-mock-03';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;
  SELECT id INTO v_rubric FROM rubrics WHERE track_id = v_track AND skill = 'writing' AND name = 'IELTS Writing' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-writing-mock-03', 'IELTS General Training — Writing Mock Test 3',
          'IELTS ジェネラル ライティング模試3', 'full_mock', 3600, false,
          'ielts-gt-mock-03', 'IELTS General Training — Mock Test 3', 'IELTS ジェネラル模試3', 2)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'Task 1 & Task 2',
          'Complete both tasks. Task 1 ≥ 150 words (about 20 minutes); Task 2 ≥ 250 words (about 40 minutes). Task 2 counts double.', 0)
  RETURNING id INTO v_sec;

  -- Task 1: SEMI-FORMAL letter (weight 1)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'WRITING TASK 1' || chr(10) ||
    'You have started an evening course, and you would like to change your working hours so that you can attend it.' || chr(10) || chr(10) ||
    'Write a letter to your manager. In your letter:' || chr(10) ||
    '• explain what you are studying and why' || chr(10) ||
    '• describe the change to your working hours that you would like' || chr(10) ||
    '• explain how you will make sure your work is not affected' || chr(10) || chr(10) ||
    'Begin your letter as follows:  Dear Mr/Ms ____________,')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Write your letter. You do NOT need to write any addresses. Write at least 150 words.',
          '{"task":"task1_letter","min_words":150,"weight":1,"reference":"A SEMI-FORMAL letter to a manager is expected: polite, respectful register (Dear Mr Tanaka, ... Yours sincerely, / Kind regards,), no slang, but warmer than a letter to a stranger. All three bullet points must be covered: the course and the reason for taking it, a concrete proposed change to working hours, and a credible reassurance about workload (e.g. starting earlier, working through lunch, checking email). An overly casual register (Hey!, Cheers!) or an icy formal one (Dear Sir or Madam) should lose tone/task-achievement marks."}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  -- Task 2: essay (weight 2)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'WRITING TASK 2')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Some people prefer to buy new products, while others choose second-hand items whenever they can. Discuss both views and give your own opinion. Give reasons for your answer and include relevant examples from your own knowledge or experience. Write at least 250 words.',
          '{"task":"task2","min_words":250,"weight":2}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-writing-mock-03 (full_mock; UNPUBLISHED; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
