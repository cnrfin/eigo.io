-- ============================================================
--  Full IELTS Speaking mock (full_mock → official Speaking band)
-- ============================================================
--  The three-part interview: Part 1 (intro), Part 2 (long turn from a cue card,
--  1 min prep / speak 1–2 min), Part 3 (discussion). Each response is recorded
--  and graded from the AUDIO against the IELTS Speaking band descriptors (0–9);
--  the official Speaking band is the average of the parts, rounded to the
--  nearest half. mode=full_mock. Part 2 sets speak_seconds=120.
--  All content ORIGINAL. Idempotent. Run AFTER add-practice-tests.sql +
--  seed-test-scales-rubrics.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_rubric uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-speaking-mock-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-academic';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-academic not found.'; END IF;
  SELECT id INTO v_rubric FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'IELTS Speaking' LIMIT 1;

  -- No whole-test countdown: speaking is self-paced, with each answer bounded by
  -- its own recording cap (payload.speak_seconds). A global auto-submit timer
  -- would risk cutting off a recording mid-answer.
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'ielts-speaking-mock-01', 'IELTS — Speaking Mock Test 1',
          'IELTS スピーキング模試1', 'full_mock', NULL, true)
  RETURNING id INTO v_form;

  -- Part 1
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 1', 'Introduction & Interview',
          'Answer each question by speaking in English. Speak naturally for a few sentences.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'The examiner asks about three familiar topics: your home, food, and free time. Answer each briefly.') RETURNING id INTO v_grp;

  -- Topic 1: Home
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric', 'Let''s talk about where you live. Do you live in a house or an apartment?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric', 'What is your favourite room in your home, and why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric', 'Would you like to move somewhere else in the future? Why or why not?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  -- Topic 2: Food
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric', 'What do you usually eat for breakfast?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 4, 'speaking_response', 'ai_rubric', 'Do you prefer eating at home or in restaurants? Why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 5, 'speaking_response', 'ai_rubric', 'Is there a food you would like to learn to cook?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  -- Topic 3: Free time
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 6, 'speaking_response', 'ai_rubric', 'What do you usually do in your free time?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 7, 'speaking_response', 'ai_rubric', 'Do you prefer spending free time alone or with others? Why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 8, 'speaking_response', 'ai_rubric', 'Has the way you spend your free time changed since you were a child?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  -- Part 2 (long turn)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 2', 'Long Turn',
          'You have 1 minute to prepare, then speak for 1 to 2 minutes.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'Describe a skill you would like to learn.' || chr(10) ||
    'You should say:' || chr(10) ||
    '• what the skill is' || chr(10) ||
    '• why you want to learn it' || chr(10) ||
    '• how you would learn it' || chr(10) ||
    'and explain how this skill would be useful to you.')
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
  VALUES (v_sec, 0, 'prompt', 'A two-way discussion of more abstract questions related to learning skills.') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric', 'Why do you think some people find it harder to learn new skills as they get older?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric', 'Should schools focus more on practical skills or on academic knowledge? Why?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric', 'How has technology changed the way people learn new things?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric', 'Do you think it is more important to be skilled at many things or an expert in one? Why?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 4, 'speaking_response', 'ai_rubric', 'How might the skills people need for work change in the future?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-speaking-mock-01 (full_mock, Parts 1-3; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
