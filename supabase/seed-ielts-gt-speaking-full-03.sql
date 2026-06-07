-- ============================================================
--  IELTS General Training Speaking MOCK 3 (Parts 1–3)
-- ============================================================
--  Third GT paper, all-new topics (Mock 1: neighbourhood/shopping/weekends,
--  a person; Mock 2: food/transport/photos, an experience). Mock 3:
--  work or study / weather and seasons / music; cue card is a PLACE
--  ("a park or green space"); Part 3 discusses public spaces in cities.
--  Same format: Part 1 (3 topics x 3), Part 2 (1 min prep / 1–2 min talk),
--  Part 3 (5 questions). Audio-graded 0–9, linear interview mode, no
--  whole-test timer. Part of set ielts-gt-mock-03.
--  Seeded UNPUBLISHED for draft review. All content ORIGINAL. Idempotent.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_rubric uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-speaking-mock-03';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;
  SELECT id INTO v_rubric FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'IELTS Speaking' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-speaking-mock-03', 'IELTS General Training — Speaking Mock Test 3',
          'IELTS ジェネラル スピーキング模試3', 'full_mock', NULL, false,
          'ielts-gt-mock-03', 'IELTS General Training — Mock Test 3', 'IELTS ジェネラル模試3', 3)
  RETURNING id INTO v_form;

  -- Part 1
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 1', 'Introduction & Interview',
          'Answer each question by speaking in English. Speak naturally for a few sentences.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'The examiner asks about three familiar topics: your work or studies, the weather and seasons, and music.') RETURNING id INTO v_grp;

  -- Topic 1: Work or study
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric', 'Let''s talk about what you do. Do you work, or are you a student?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric', 'What do you enjoy most about your work or studies?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric', 'Is there something about it you would like to change? Why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  -- Topic 2: Weather & seasons
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric', 'What is the weather usually like where you live?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 4, 'speaking_response', 'ai_rubric', 'Which season do you like best? Why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 5, 'speaking_response', 'ai_rubric', 'Does the weather ever change your plans? How?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  -- Topic 3: Music
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 6, 'speaking_response', 'ai_rubric', 'What kind of music do you like to listen to?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 7, 'speaking_response', 'ai_rubric', 'When do you usually listen to music?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 8, 'speaking_response', 'ai_rubric', 'Have you ever learned to play a musical instrument? Tell me about it.', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  -- Part 2 (long turn)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 2', 'Long Turn',
          'You have 1 minute to prepare, then speak for 1 to 2 minutes.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'Describe a park or green space you like to visit.' || chr(10) ||
    'You should say:' || chr(10) ||
    '• where it is' || chr(10) ||
    '• how often you go there' || chr(10) ||
    '• what you do there' || chr(10) ||
    'and explain why you like this place.')
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
  VALUES (v_sec, 0, 'prompt', 'A two-way discussion of more abstract questions related to public spaces in cities.') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric', 'Why are parks and green spaces important in cities?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric', 'How do people of different ages use public parks differently?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric', 'Should city councils spend more money on green spaces, even if taxes rise? Why or why not?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric', 'Some people prefer indoor leisure activities to outdoor ones. Why do you think that is?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 4, 'speaking_response', 'ai_rubric', 'Do you think cities in the future will have more green space or less? Why?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-speaking-mock-03 (full_mock, Parts 1-3; UNPUBLISHED; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
