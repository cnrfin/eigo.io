-- ============================================================
--  IELTS General Training Speaking MOCK 2 (Parts 1–3)
-- ============================================================
--  Second GT paper, all-new topics (Mock 1: neighbourhood/shopping/weekends,
--  "a person who helped you", helping others). Mock 2: food & cooking /
--  getting around / taking photos; cue card is an EXPERIENCE ("a time you
--  learned a new skill"); Part 3 discusses learning and skills.
--  Same format as Mock 1: Part 1 (3 topics x 3), Part 2 (1 min prep / 1–2 min
--  talk), Part 3 (5 questions). Audio-graded 0–9, linear interview mode,
--  no whole-test timer. Part of set ielts-gt-mock-02.
--  Seeded UNPUBLISHED for draft review. All content ORIGINAL. Idempotent.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_rubric uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-speaking-mock-02';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;
  SELECT id INTO v_rubric FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'IELTS Speaking' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-speaking-mock-02', 'IELTS General Training — Speaking Mock Test 2',
          'IELTS ジェネラル スピーキング模試2', 'full_mock', NULL, false,
          'ielts-gt-mock-02', 'IELTS General Training — Mock Test 2', 'IELTS ジェネラル模試2', 3)
  RETURNING id INTO v_form;

  -- Part 1
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 1', 'Introduction & Interview',
          'Answer each question by speaking in English. Speak naturally for a few sentences.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'The examiner asks about three familiar topics: food and cooking, getting around, and taking photos.') RETURNING id INTO v_grp;

  -- Topic 1: Food & cooking
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric', 'Let''s talk about food. What kind of food do you usually eat at home?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric', 'Can you cook? What do you like to make?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric', 'Do you prefer eating at home or eating out? Why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  -- Topic 2: Getting around
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric', 'How do you usually get around your town or city?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 4, 'speaking_response', 'ai_rubric', 'Is public transport good where you live? Why or why not?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 5, 'speaking_response', 'ai_rubric', 'Is there a journey you make regularly that you enjoy? Tell me about it.', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  -- Topic 3: Taking photos
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 6, 'speaking_response', 'ai_rubric', 'Do you take many photos on your phone?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 7, 'speaking_response', 'ai_rubric', 'What kind of things do you like to photograph?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 8, 'speaking_response', 'ai_rubric', 'Do you ever print your photos, or do you keep them all on a screen? Why?', '{"subtask":"p1","speak_seconds":40}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  -- Part 2 (long turn)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 2', 'Long Turn',
          'You have 1 minute to prepare, then speak for 1 to 2 minutes.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'Describe a time you learned a new skill.' || chr(10) ||
    'You should say:' || chr(10) ||
    '• what the skill was' || chr(10) ||
    '• why you decided to learn it' || chr(10) ||
    '• how you learned it' || chr(10) ||
    'and explain how you felt when you could finally do it.')
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
  VALUES (v_sec, 0, 'prompt', 'A two-way discussion of more abstract questions related to learning and skills.') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric', 'Why do some adults find it harder than children to learn new things?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric', 'Is it better to learn a skill from a teacher or by yourself? Why?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric', 'Which practical skills do you think every child should learn at school?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric', 'How has the internet changed the way people learn new skills?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 4, 'speaking_response', 'ai_rubric', 'Do you think people will need to keep learning new skills throughout their working lives? Why?', '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-speaking-mock-02 (full_mock, Parts 1-3; UNPUBLISHED; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
