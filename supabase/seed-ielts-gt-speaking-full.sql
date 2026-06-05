-- ============================================================
--  Full IELTS General Training Speaking mock (same format as Academic)
-- ============================================================
--  The Speaking test is IDENTICAL in format across IELTS variants; this is a
--  fresh paper so GT takers don't re-see the Academic mock's questions.
--  Part 1 (3 topics x 3), Part 2 (cue card, 1 min prep / 1–2 min talk),
--  Part 3 (5 discussion questions). Audio-graded 0–9; the Speaking band is
--  the weighted average of the parts. Linear interview mode (forward-only),
--  no whole-test timer. Part of set ielts-gt-mock-01. All content ORIGINAL.
--  Idempotent. Run AFTER add-practice-tests.sql + seed-test-scales-rubrics.sql
--  + add-test-sets.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_rubric uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-speaking-mock-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;
  SELECT id INTO v_rubric FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'IELTS Speaking' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-speaking-mock-01', 'IELTS General Training — Speaking Mock Test 1',
          'IELTS ジェネラル スピーキング模試1', 'full_mock', NULL, true,
          'ielts-gt-mock-01', 'IELTS General Training — Mock Test 1', 'IELTS ジェネラル模試1', 3)
  RETURNING id INTO v_form;

  -- Part 1
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 1', 'Introduction & Interview',
          'Answer each question by speaking in English. Speak naturally for a few sentences.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'The examiner asks about three familiar topics: your neighbourhood, shopping, and weekends.') RETURNING id INTO v_grp;

  -- Topic 1: Neighbourhood
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric', 'Let''s talk about the area where you live. What do you like about your neighbourhood?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric', 'Is your neighbourhood a good place for families with children? Why or why not?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric', 'How long have you lived there, and would you like to stay?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  -- Topic 2: Shopping
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric', 'Do you enjoy shopping? Why or why not?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 4, 'speaking_response', 'ai_rubric', 'Do you prefer shopping online or in shops? Why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 5, 'speaking_response', 'ai_rubric', 'Is there anything you bought recently that you were especially pleased with?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  -- Topic 3: Weekends
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 6, 'speaking_response', 'ai_rubric', 'What do you usually do at the weekend?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 7, 'speaking_response', 'ai_rubric', 'Are your weekends different now from when you were a child? How?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 8, 'speaking_response', 'ai_rubric', 'Do you prefer to plan your weekends or keep them free? Why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  -- Part 2 (long turn)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 2', 'Long Turn',
          'You have 1 minute to prepare, then speak for 1 to 2 minutes.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'Describe a person who helped you when you needed it.' || chr(10) ||
    'You should say:' || chr(10) ||
    '• who this person is' || chr(10) ||
    '• how you know them' || chr(10) ||
    '• what they did to help you' || chr(10) ||
    'and explain why their help was important to you.')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
          'Speak about the topic on the cue card for 1 to 2 minutes.',
          '{"subtask":"long_turn","prep_seconds":60,"speak_seconds":120}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  -- Part 3 (discussion)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 3', 'Discussion',
          'Give fuller answers with reasons and examples.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'A two-way discussion of more abstract questions related to helping others.') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric', 'Why do you think some people are more willing to help strangers than others?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric', 'Has the way neighbours help each other changed compared with the past? How?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric', 'Should schools teach children to do volunteer work? Why or why not?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric', 'Is it better to give people money or time when they need help? Why?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 4, 'speaking_response', 'ai_rubric', 'How might technology change the way people help each other in the future?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-speaking-mock-01 (full_mock, Parts 1-3; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
