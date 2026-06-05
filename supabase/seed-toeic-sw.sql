-- ============================================================
--  Sample content: TOEIC Speaking & Writing practice (AI-graded)
-- ============================================================
--  TOEIC S&W is a separate test from L&R (track: toeic-sw), scored 0–200 per
--  test. This seeds two forms — one Speaking, one Writing — using the tasks
--  that need no image:
--    Speaking: Read a text aloud (×2), Respond to questions (×2), Express an
--              opinion (×1). Recorded + graded from AUDIO.
--    Writing:  Respond to a written request (e-mail) + Write an opinion essay.
--  Per-task max scores follow TOEIC's raw scale (read-aloud/respond 0–3,
--  opinion 0–5; e-mail 0–4, essay 0–5); the TOEIC S&W rubrics supply criteria.
--
--  (Describe-a-picture and write-a-sentence-from-a-photo are deferred — they
--   need images.) skill_practice → per-task scores + feedback in review.
--  All content ORIGINAL. Idempotent. Run AFTER add-practice-tests.sql +
--  seed-test-scales-rubrics.sql.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_rub_s  uuid;
  v_rub_w  uuid;
  v_form   uuid;
  v_sec    uuid;
  v_grp    uuid;
  v_q      uuid;
BEGIN
  DELETE FROM test_forms WHERE slug IN ('toeic-sw-speaking-practice-01', 'toeic-sw-writing-practice-01');

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'toeic-sw';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track toeic-sw not found — run add-practice-tests.sql first.';
  END IF;
  SELECT id INTO v_rub_s FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'TOEIC Speaking' LIMIT 1;
  SELECT id INTO v_rub_w FROM rubrics WHERE track_id = v_track AND skill = 'writing'  AND name = 'TOEIC Writing'  LIMIT 1;

  -- =========================== SPEAKING ===========================
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'toeic-sw-speaking-practice-01', 'TOEIC Speaking — Practice 1',
          'TOEIC スピーキング練習1', 'skill_practice', 1200, true)
  RETURNING id INTO v_form;

  -- Read aloud
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Read Aloud', 'Read a Text Aloud',
          'You have 45 seconds to prepare, then read the text aloud clearly.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
          'Read the following text aloud:' || chr(10) || chr(10) ||
          'Thank you for calling Westside Dental Clinic. Our office is open Monday through Friday, from nine a.m. to six p.m. If you would like to book an appointment, please press one. To speak with a receptionist, please stay on the line.',
          '{"subtask":"read_aloud","prep_seconds":45,"speak_seconds":45}'::jsonb, v_rub_s, 3)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
          'Read the following text aloud:' || chr(10) || chr(10) ||
          'Welcome aboard the City Express bus. For your safety, please remain seated while the bus is moving. Our next stop is Central Station, where you can transfer to the subway. We hope you enjoy your journey with us today.',
          '{"subtask":"read_aloud","prep_seconds":45,"speak_seconds":45}'::jsonb, v_rub_s, 3)
  RETURNING id INTO v_q;

  -- Respond to questions
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Respond', 'Respond to Questions',
          'Answer each question by speaking in English. Begin speaking after the prompt.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'Imagine that a friend is asking you about everyday topics.') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
          'What time do you usually wake up on weekdays, and what is the first thing you do?',
          '{"subtask":"respond","speak_seconds":30}'::jsonb, v_rub_s, 3)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
          'Describe a restaurant you enjoy going to and explain why you like it.',
          '{"subtask":"respond","speak_seconds":45}'::jsonb, v_rub_s, 3)
  RETURNING id INTO v_q;

  -- Express an opinion
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Opinion', 'Express an Opinion',
          'You have 30 seconds to prepare, then speak for up to 60 seconds.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
          'Some people prefer working from home, while others prefer working in an office. Which do you prefer, and why? Give reasons to support your opinion.',
          '{"subtask":"opinion","prep_seconds":30,"speak_seconds":60}'::jsonb, v_rub_s, 5)
  RETURNING id INTO v_q;

  -- =========================== WRITING ============================
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'toeic-sw-writing-practice-01', 'TOEIC Writing — Practice 1',
          'TOEIC ライティング練習1', 'skill_practice', 1800, true)
  RETURNING id INTO v_form;

  -- Respond to a written request (e-mail)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Respond to a Request', 'E-mail Response',
          'Read the e-mail and write a reply.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'From: Daniel Reed, Office Manager' || chr(10) || 'Subject: New Office Printer' || chr(10) || chr(10) ||
    'Hello,' || chr(10) ||
    'We are planning to buy a new printer for the third-floor office. Could you let us know which features are most important to your team? We would also like to hear any other suggestions you may have.' || chr(10) ||
    'Thanks,' || chr(10) || 'Daniel')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
          'Reply to the e-mail. In your reply, ask TWO questions and make ONE suggestion.',
          '{"task":"email"}'::jsonb, v_rub_w, 4)
  RETURNING id INTO v_q;

  -- Opinion essay
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Opinion Essay', 'Write an Opinion Essay',
          'Write at least 300 words. Support your opinion with reasons and examples.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
          'Do you agree or disagree with the following statement? Companies should allow their employees to work from home several days a week. Give reasons and examples to support your opinion. Write at least 300 words.',
          '{"task":"opinion","min_words":300}'::jsonb, v_rub_w, 5)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded TOEIC S&W (speaking: 5 tasks, writing: 2 tasks; rubrics: %, %).',
    COALESCE(v_rub_s::text, 'generic'), COALESCE(v_rub_w::text, 'generic');
END $$;
