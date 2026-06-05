-- ============================================================
--  Sample content: TOEIC L&R Reading practice (auto-graded)
-- ============================================================
--  Faithful TOEIC Reading structure:
--    Part 5 — Incomplete Sentences (grammar/vocabulary)
--    Part 6 — Text Completion (a text with blanks, incl. a sentence-insertion)
--    Part 7 — Reading Comprehension (a single passage + questions)
--  All 4-choice multiple choice with letter options (A-D), business/workplace
--  themes — TOEIC's conventions. skill_practice form → raw % + review (an
--  official scaled score needs a full 100-question Reading section).
--  All content is ORIGINAL. Idempotent. Run AFTER add-practice-tests.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid;
  v_form  uuid;
  v_sec   uuid;
  v_grp   uuid;
  v_q     uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'toeic-lr-reading-practice-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'toeic-lr';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track toeic-lr not found — run add-practice-tests.sql first.';
  END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'toeic-lr-reading-practice-01', 'TOEIC L&R — Reading Practice 1',
          'TOEIC L&R リーディング練習1', 'skill_practice', 1500, true)
  RETURNING id INTO v_form;

  -- ── Part 5: Incomplete Sentences ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 5', 'Incomplete Sentences',
          'Choose the word or phrase (A-D) that best completes each sentence.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'The marketing team ( ) its quarterly report to the director yesterday.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','submit',false),(v_q,1,'B','submitted',true),(v_q,2,'C','submitting',false),(v_q,3,'D','submits',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Please contact the front desk ( ) you have any questions about your reservation.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','if',true),(v_q,1,'B','unless',false),(v_q,2,'C','despite',false),(v_q,3,'D','although',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'The updated software is significantly more ( ) than the previous version.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','efficient',true),(v_q,1,'B','efficiently',false),(v_q,2,'C','efficiency',false),(v_q,3,'D','efficiencies',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'All visitors are required to sign in ( ) arrival at the reception desk.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','on',true),(v_q,1,'B','in',false),(v_q,2,'C','among',false),(v_q,3,'D','between',false);

  -- ── Part 6: Text Completion ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 6', 'Text Completion',
          'Read the text and choose the best option (A-D) for each blank.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'To: All Staff' || chr(10) || 'From: Facilities Management' || chr(10) || 'Subject: Office Renovation' || chr(10) || chr(10) ||
    'Please be aware that the third floor will be closed for renovation from June 3 to June 14. During this period, staff who normally work on the third floor (1) ______ to a temporary workspace on the second floor. We apologize for any inconvenience. (2) ______, the renovation will create a more comfortable and modern environment. If you have any questions, please (3) ______ the facilities team. (4) ______')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Blank (1)', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','relocate',false),(v_q,1,'B','will be relocated',true),(v_q,2,'C','relocating',false),(v_q,3,'D','have relocated',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Blank (2)', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','However',true),(v_q,1,'B','Therefore',false),(v_q,2,'C','For example',false),(v_q,3,'D','In addition',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'Blank (3)', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','contacting',false),(v_q,1,'B','contact',true),(v_q,2,'C','contacts',false),(v_q,3,'D','contacted',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Blank (4) — choose the sentence that best fits.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Thank you for your cooperation.',true),
    (v_q,1,'B','The cafeteria will also be closed permanently.',false),
    (v_q,2,'C','Please submit your expense report by Friday.',false),
    (v_q,3,'D','We are currently hiring new sales staff.',false);

  -- ── Part 7: Reading Comprehension (single passage) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 7', 'Reading Comprehension',
          'Read the passage and choose the best answer (A-D) to each question.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'Greenfield Public Library — Notice' || chr(10) || chr(10) ||
    'Starting Monday, July 1, the library will extend its weekday opening hours. From that date, the library will open at 9:00 a.m. and close at 8:00 p.m., Monday through Friday. Weekend hours remain unchanged (10:00 a.m. to 5:00 p.m.). In addition, the library will launch a new online booking system for study rooms. Members can reserve a room up to one week in advance using their library card number. For assistance, please visit the information desk or call 555-0143.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the main purpose of the notice?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To announce changes to library services',true),
    (v_q,1,'B','To advertise a book sale',false),
    (v_q,2,'C','To recruit volunteers',false),
    (v_q,3,'D','To explain a new membership fee',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What time will the library close on weekdays from July 1?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','5:00 p.m.',false),(v_q,1,'B','8:00 p.m.',true),(v_q,2,'C','9:00 a.m.',false),(v_q,3,'D','10:00 a.m.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'How can members reserve a study room?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','By visiting the library in person only',false),
    (v_q,1,'B','Using the new online system with their library card number',true),
    (v_q,2,'C','By emailing the library director',false),
    (v_q,3,'D','Study rooms cannot be reserved',false);

  RAISE NOTICE 'Seeded toeic-lr-reading-practice-01 (Parts 5/6/7, 11 questions).';
END $$;
