-- ============================================================
--  Sample content: IELTS Speaking practice (audio-graded)
-- ============================================================
--  The three-part IELTS Speaking interview:
--    Part 1 — Introduction & interview (familiar-topic questions)
--    Part 2 — Long turn from a cue card (1 min prep, speak 1-2 min)
--    Part 3 — Two-way discussion (more abstract questions)
--  Each response is recorded and graded from the AUDIO against the IELTS
--  Speaking band descriptors (Fluency & Coherence, Lexical Resource,
--  Grammatical Range & Accuracy, Pronunciation), 0-9.
--
--  Part 2 sets payload.speak_seconds=120 so the recorder allows the longer turn
--  (Part 1/3 stay short). prep_seconds is advisory text for now.
--
--  skill_practice form → results show each part's band + feedback in review.
--  Idempotent. Run AFTER add-practice-tests.sql + seed-test-scales-rubrics.sql.
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
  DELETE FROM test_forms WHERE slug = 'ielts-speaking-practice-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-academic';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track ielts-academic not found — run add-practice-tests.sql first.';
  END IF;

  SELECT id INTO v_rubric
  FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'IELTS Speaking' LIMIT 1;

  -- Self-paced: each answer is bounded by its recording cap, no whole-test timer.
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'ielts-speaking-practice-01', 'IELTS — Speaking Practice 1',
          'IELTS スピーキング練習1', 'skill_practice', NULL, true)
  RETURNING id INTO v_form;

  -- ── Part 1: Introduction & interview ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 1', 'Introduction & Interview',
          'Answer each question by speaking in English. Speak naturally for 2-3 sentences.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'The examiner asks about familiar topics.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
          'Let''s talk about your hometown. Where are you from, and what is it like?',
          '{"subtask":"p1","speak_seconds":45}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
          'Do you work, or are you a student? Please tell me about it.',
          '{"subtask":"p1","speak_seconds":45}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
          'What do you usually do in your free time?',
          '{"subtask":"p1","speak_seconds":45}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  -- ── Part 2: Long turn (cue card) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 2', 'Long Turn',
          'You have 1 minute to prepare, then speak for 1 to 2 minutes.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'Describe a place you like to visit in your free time.' || chr(10) ||
    'You should say:' || chr(10) ||
    '• where it is' || chr(10) ||
    '• how often you go there' || chr(10) ||
    '• what you do there' || chr(10) ||
    'and explain why you enjoy visiting this place.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
          'Speak about the topic on the cue card for 1 to 2 minutes.',
          '{"subtask":"long_turn","prep_seconds":60,"speak_seconds":120}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  -- ── Part 3: Discussion ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Part 3', 'Discussion',
          'Give fuller answers with reasons and examples.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'A two-way discussion of more abstract questions related to Part 2.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
          'Why do you think some people prefer busy places while others prefer quiet ones?',
          '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
          'How have the ways people spend their free time changed in recent years?',
          '{"subtask":"p3","speak_seconds":60}'::jsonb, v_rubric, 9)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-speaking-practice-01 (Parts 1-3, 6 questions; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
