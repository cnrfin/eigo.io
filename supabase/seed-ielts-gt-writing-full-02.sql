-- ============================================================
--  IELTS General Training Writing MOCK 2 (Task 1 letter + Task 2 essay)
-- ============================================================
--  Second GT paper. Deliberately different from Mock 1: Task 1 is an
--  INFORMAL letter to a friend (Mock 1: formal complaint), and Task 2 is an
--  agree/disagree question on a workplace theme (Mock 1: advantages/
--  disadvantages of urban migration). Task 2 counts double (payload.weight=2).
--  Both tasks AI/human-graded against the IELTS Writing band descriptors (0–9).
--  Part of set ielts-gt-mock-02. Seeded UNPUBLISHED for draft review.
--  All content ORIGINAL. Idempotent.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_rubric uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-writing-mock-02';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;
  SELECT id INTO v_rubric FROM rubrics WHERE track_id = v_track AND skill = 'writing' AND name = 'IELTS Writing' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-writing-mock-02', 'IELTS General Training — Writing Mock Test 2',
          'IELTS ジェネラル ライティング模試2', 'full_mock', 3600, false,
          'ielts-gt-mock-02', 'IELTS General Training — Mock Test 2', 'IELTS ジェネラル模試2', 2)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'Task 1 & Task 2',
          'Complete both tasks. Task 1 ≥ 150 words (about 20 minutes); Task 2 ≥ 250 words (about 40 minutes). Task 2 counts double.', 0)
  RETURNING id INTO v_sec;

  -- Task 1: INFORMAL letter (weight 1)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'WRITING TASK 1' || chr(10) ||
    'You are going overseas for one month, and a friend who lives nearby has agreed to look after your flat while you are away.' || chr(10) || chr(10) ||
    'Write a letter to your friend. In your letter:' || chr(10) ||
    '• thank your friend for agreeing to help' || chr(10) ||
    '• explain what needs to be done in the flat' || chr(10) ||
    '• say how you will return the favour' || chr(10) || chr(10) ||
    'Begin your letter as follows:  Dear ____________,')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Write your letter. You do NOT need to write any addresses. Write at least 150 words.',
          '{"task":"task1_letter","min_words":150,"weight":1,"reference":"An INFORMAL letter to a friend is expected: friendly opening and sign-off (e.g. Dear Ken, ... Thanks again, / See you soon,), warm conversational tone, contractions acceptable. All three bullet points must be covered: thanks, clear practical instructions (e.g. plants, post, bins), and a concrete offer in return. An overly formal register (Dear Sir or Madam, Yours faithfully) should lose marks for tone/task achievement."}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  -- Task 2: essay (weight 2)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'WRITING TASK 2')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Some people believe that when hiring staff, employers should value personal qualities more than qualifications and experience. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples from your own knowledge or experience. Write at least 250 words.',
          '{"task":"task2","min_words":250,"weight":2}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-writing-mock-02 (full_mock; UNPUBLISHED; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
