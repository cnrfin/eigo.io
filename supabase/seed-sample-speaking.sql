-- ============================================================
--  Sample content: EIKEN Grade 3 speaking practice (authentic 2nd-stage flow)
-- ============================================================
--  Mirrors the real Grade 3 interview around a card (passage + one illustration):
--    Read-aloud (5) → No.1 about the passage (5) → No.2 & No.3 about the picture
--    (5 each) → No.4 & No.5 personal questions (5 each).  Each spoken item is 5
--    points; the EIKEN Speaking rubric supplies the criteria (the grader scores
--    each question against ITS max_score, not the whole-test max).
--
--  Picture questions (No.2/No.3) carry a `reference` describing what the
--  illustration shows + the expected answer, so the audio grader (which can't
--  see the image) can judge them. IMAGE: attach a card illustration matching the
--  reference to the card group's image_asset_id when ready; until then those two
--  questions display without a picture.
--
--  skill_practice form → results show raw % + per-question AI feedback.
--  Attaches the EIKEN Speaking rubric if present (run seed-test-scales-rubrics.sql
--  first). Idempotent — re-run replaces the form. Run AFTER add-practice-tests.sql.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_rubric uuid;
  v_form   uuid;
  v_sec    uuid;  -- the interview section
  v_card   uuid;  -- group: passage + illustration
  v_pers   uuid;  -- group: personal questions (card turned over)
  v_q      uuid;  -- scratch for question ids
BEGIN
  DELETE FROM test_forms WHERE slug = 'eiken-g3-speaking-practice-01';  -- refresh on re-run

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'eiken-grade-3';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track eiken-grade-3 not found — run add-practice-tests.sql first.';
  END IF;

  SELECT id INTO v_rubric
  FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'EIKEN Speaking' LIMIT 1;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'eiken-g3-speaking-practice-01', 'EIKEN Grade 3 — Speaking Practice 1',
          '英検3級 スピーキング練習1', 'skill_practice', 600, true)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Interview', 'Card-based Interview',
          'Read the passage aloud, then answer the questions by speaking in English. Tap Record / Stop for each.', 0)
  RETURNING id INTO v_sec;

  -- ── Card group: passage + illustration ──
  -- NOTE: set image_asset_id to a card illustration matching the No.2/No.3
  --       reference once an image is added to the test-assets bucket.
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
    'Tom''s Saturday' || chr(10) ||
    'Tom likes weekends. Every Saturday morning, he plays tennis in the park with his father. After lunch, he often goes to the library to borrow books. In the evening, he helps his mother cook dinner. He thinks Saturdays are a lot of fun.',
    'Look at the card. Read the passage aloud, then answer the questions.')
  RETURNING id INTO v_card;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_card, 0, 'speaking_response', 'ai_rubric',
          'Now, please read the passage aloud.',
          '{"subtask":"read_aloud","prep_seconds":20}'::jsonb, v_rubric, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_card, 1, 'speaking_response', 'ai_rubric',
          'No. 1 — Please look at the passage. What does Tom do every Saturday morning?',
          '{"subtask":"passage_qa","reference":"From the passage: every Saturday morning Tom plays tennis in the park with his father. Expected answer: He plays tennis (in the park) with his father."}'::jsonb,
          v_rubric, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_card, 2, 'speaking_response', 'ai_rubric',
          'No. 2 — Please look at the picture. What is the woman doing?',
          '{"subtask":"picture_qa","reference":"Intended illustration: a park scene. A woman is reading a book on a bench. A boy is riding a bicycle. Two dogs are running. Expected answer (present continuous): She is reading a book."}'::jsonb,
          v_rubric, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_card, 3, 'speaking_response', 'ai_rubric',
          'No. 3 — How many dogs are there in the picture?',
          '{"subtask":"picture_qa","reference":"Intended illustration shows two dogs running in the park. Expected answer: There are two (dogs)."}'::jsonb,
          v_rubric, 5)
  RETURNING id INTO v_q;

  -- ── Personal questions (card turned over) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'Now please answer about yourself.')
  RETURNING id INTO v_pers;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_pers, 0, 'speaking_response', 'ai_rubric',
          'No. 4 — What do you usually do on weekends?',
          '{"subtask":"personal_qa"}'::jsonb, v_rubric, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_pers, 1, 'speaking_response', 'ai_rubric',
          'No. 5 — Do you like sports? Please tell me more.',
          '{"subtask":"personal_qa"}'::jsonb, v_rubric, 5)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded eiken-g3-speaking-practice-01 (read-aloud + 5 questions; rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
