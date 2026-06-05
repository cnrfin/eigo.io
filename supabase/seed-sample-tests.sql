-- ============================================================
--  Sample content: EIKEN Grade 3 reading practice (auto-graded)
-- ============================================================
--  A small, published skill_practice form so the student test flow can be
--  exercised end to end with NO audio and NO AI grading — every item is
--  objective and auto-graded. Because it is skill_practice (not a full mock),
--  results show raw score + % + per-question review, not an official CSE score.
--
--  Faithful to EIKEN format: all items are 4-choice multiple choice with
--  NUMBERED options (1–4) — EIKEN reading has no free-text answers.
--  All items are ORIGINAL content written to EIKEN Grade 3 (A1) level.
--  Idempotent — re-run replaces the form. Run AFTER add-practice-tests.sql.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_form   uuid;
  v_sec1   uuid;
  v_sec2   uuid;
  v_grp    uuid;
  v_q      uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'eiken-g3-reading-practice-01';  -- refresh on re-run

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'eiken-grade-3';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track eiken-grade-3 not found — run add-practice-tests.sql first.';
  END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'eiken-g3-reading-practice-01', 'EIKEN Grade 3 — Reading Practice 1',
          '英検3級 リーディング練習1', 'skill_practice', 1200, true)
  RETURNING id INTO v_form;

  -- ── Part 1: vocabulary & grammar (4-choice) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 1', 'Vocabulary & Grammar',
          'Choose the best word or phrase (1-4) to complete each sentence.', 0)
  RETURNING id INTO v_sec1;

  INSERT INTO question_groups (section_id, order_index, stimulus_type)
  VALUES (v_sec1, 0, 'none')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'My sister can (   ) the piano very well.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'play', true), (v_q, 1, '2', 'do', false),
    (v_q, 2, '3', 'make', false), (v_q, 3, '4', 'go', false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'I usually go to school (   ) bike.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'in', false), (v_q, 1, '2', 'on', false),
    (v_q, 2, '3', 'by', true), (v_q, 3, '4', 'at', false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'A: (   ) is your birthday?  B: It''s in May.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'What', false), (v_q, 1, '2', 'When', true),
    (v_q, 2, '3', 'Where', false), (v_q, 3, '4', 'Who', false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'There (   ) many books on the desk.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'is', false), (v_q, 1, '2', 'are', true),
    (v_q, 2, '3', 'am', false), (v_q, 3, '4', 'be', false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'My brother is (   ) than me.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'tall', false), (v_q, 1, '2', 'taller', true),
    (v_q, 2, '3', 'tallest', false), (v_q, 3, '4', 'more tall', false);

  -- ── Part 2: reading comprehension (shared passage, 4-choice) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 2', 'Reading Comprehension',
          'Read the passage and choose the best answer (1-4).', 1)
  RETURNING id INTO v_sec2;

  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec2, 0, 'passage',
    'Kenta is a junior high school student. His favorite subject is science. Every Sunday, he goes to the city library to read books about space. He wants to be an astronaut and travel to the moon someday.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is Kenta''s favorite subject?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'Math', false), (v_q, 1, '2', 'English', false),
    (v_q, 2, '3', 'Science', true), (v_q, 3, '4', 'Music', false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Where does Kenta go every Sunday?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'To the park', false), (v_q, 1, '2', 'To the city library', true),
    (v_q, 2, '3', 'To school', false), (v_q, 3, '4', 'To the moon', false);

  -- (Formerly a free-text gap-fill — converted to authentic 4-choice MCQ.)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What does Kenta want to be in the future?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'A teacher', false), (v_q, 1, '2', 'A scientist', false),
    (v_q, 2, '3', 'An astronaut', true), (v_q, 3, '4', 'A doctor', false);

  RAISE NOTICE 'Seeded eiken-g3-reading-practice-01 (8 four-choice questions).';
END $$;
