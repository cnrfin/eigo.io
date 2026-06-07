-- ============================================================
--  EIKEN Grade 3 — Mock Test 1: READING + WRITING + SPEAKING
-- ============================================================
--  Three forms of set 'eiken-g3-mock-01' (the listening form is seeded
--  separately by scripts/seed-eiken-g3-listening-mock.mjs, set_order 2):
--
--    eiken-g3-reading-mock-01  (set_order 0, 40 min, 30 questions)
--      大問1  15 vocabulary/grammar gap-fills   (4 choices, labels 1-4)
--      大問2   5 dialogue-completion items      (4 choices)
--      大問3A  school-event notice              (2 questions)
--      大問3B  short e-mail exchange            (3 questions)
--      大問3C  short personal essay             (5 questions)
--      Answer keys balanced (1:7 2:8 3:7 4:8), no position 3+ in a row.
--
--    eiken-g3-writing-mock-01  (set_order 1, 25 min, 2 AI-rubric tasks)
--      Eメール  reply to a friend's e-mail containing TWO questions (15-25 w)
--      意見文   opinion QUESTION with two reasons (25-35 w)
--
--    eiken-g3-speaking-mock-01 (set_order 3, untimed second-stage interview)
--      音読 → No.1 (passage) → No.2/No.3 (illustration) → No.4/No.5 (personal)
--      Card illustration is attached later — see supabase/EIKEN-G3-IMAGES.md
--      + scripts/attach-eiken-g3-images.mjs. payload.reference tells the AI
--      grader what the picture shows (never displayed to the student).
--
--  All three forms are seeded UNPUBLISHED (admin draft preview).
--  All content is ORIGINAL, CEFR A2 / junior-high level, and different from
--  the eiken-g3-*-practice-01 forms.
--  Idempotent. Run AFTER add-practice-tests.sql + seed-test-scales-rubrics.sql
--  + add-test-sets.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid;
  v_rub_w uuid;
  v_rub_s uuid;
  v_form  uuid;
  v_sec   uuid;
  v_grp   uuid;
  v_q     uuid;
BEGIN
  DELETE FROM test_forms WHERE slug IN
    ('eiken-g3-reading-mock-01', 'eiken-g3-writing-mock-01', 'eiken-g3-speaking-mock-01');

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'eiken-grade-3';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track eiken-grade-3 not found — run add-practice-tests.sql first.';
  END IF;
  SELECT id INTO v_rub_w FROM rubrics WHERE track_id = v_track AND skill = 'writing'  AND name = 'EIKEN Writing'  LIMIT 1;
  SELECT id INTO v_rub_s FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'EIKEN Speaking' LIMIT 1;

  -- ═══════════════════════════ READING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-g3-reading-mock-01', 'EIKEN Grade 3 — Reading Mock Test 1',
          '英検3級 リーディング模試1', 'full_mock', 2400, false,
          'eiken-g3-mock-01', 'EIKEN Grade 3 — Mock Test 1', '英検3級 模試1', 0)
  RETURNING id INTO v_form;

  -- ── 大問1: Vocabulary & Grammar (15 items) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問1', 'Vocabulary & Grammar',
          'Choose the best word or phrase (1-4) to complete each sentence.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type)
  VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  -- (1) key 2
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'My father (   ) to London on business last month.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'goes', false), (v_q, 1, '2', 'went', true),
    (v_q, 2, '3', 'going', false), (v_q, 3, '4', 'go', false);

  -- (2) key 3
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Please be (   ) in the library. People are reading books.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'hungry', false), (v_q, 1, '2', 'fast', false),
    (v_q, 2, '3', 'quiet', true), (v_q, 3, '4', 'busy', false);

  -- (3) key 1
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'A: How (   ) is this blue jacket?  B: It''s twenty dollars.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'much', true), (v_q, 1, '2', 'old', false),
    (v_q, 2, '3', 'long', false), (v_q, 3, '4', 'many', false);

  -- (4) key 4
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Emi was sick yesterday, (   ) she didn''t go to school.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'or', false), (v_q, 1, '2', 'but', false),
    (v_q, 2, '3', 'if', false), (v_q, 3, '4', 'so', true);

  -- (5) key 2
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'Hurry up, (   ) you will miss the bus.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'but', false), (v_q, 1, '2', 'or', true),
    (v_q, 2, '3', 'so', false), (v_q, 3, '4', 'because', false);

  -- (6) key 1
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 5, 'single_choice', 'auto_choice', 'Mr. Sato is our music teacher. He is good at (   ) the guitar.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'playing', true), (v_q, 1, '2', 'play', false),
    (v_q, 2, '3', 'plays', false), (v_q, 3, '4', 'played', false);

  -- (7) key 3
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 6, 'single_choice', 'auto_choice', 'I have two dogs. One is black, and the (   ) is white.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'another', false), (v_q, 1, '2', 'some', false),
    (v_q, 2, '3', 'other', true), (v_q, 3, '4', 'every', false);

  -- (8) key 4
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 7, 'single_choice', 'auto_choice', 'A: Whose notebook is this?  B: It''s (   ).', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'my', false), (v_q, 1, '2', 'I', false),
    (v_q, 2, '3', 'me', false), (v_q, 3, '4', 'mine', true);

  -- (9) key 1
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 8, 'single_choice', 'auto_choice', 'The math test was very (   ), so everyone finished it quickly.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'easy', true), (v_q, 1, '2', 'difficult', false),
    (v_q, 2, '3', 'heavy', false), (v_q, 3, '4', 'expensive', false);

  -- (10) key 2
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 9, 'single_choice', 'auto_choice', 'My sister is interested (   ) French movies.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'on', false), (v_q, 1, '2', 'in', true),
    (v_q, 2, '3', 'to', false), (v_q, 3, '4', 'with', false);

  -- (11) key 4
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 10, 'single_choice', 'auto_choice', 'Tom has lived in Japan (   ) three years.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'since', false), (v_q, 1, '2', 'at', false),
    (v_q, 2, '3', 'on', false), (v_q, 3, '4', 'for', true);

  -- (12) key 3
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 11, 'single_choice', 'auto_choice', 'A: (   ) did you come to the party?  B: By taxi.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'What', false), (v_q, 1, '2', 'When', false),
    (v_q, 2, '3', 'How', true), (v_q, 3, '4', 'Why', false);

  -- (13) key 2
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 12, 'single_choice', 'auto_choice', 'I forgot (   ) my homework, so my teacher was angry.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'doing', false), (v_q, 1, '2', 'to do', true),
    (v_q, 2, '3', 'did', false), (v_q, 3, '4', 'does', false);

  -- (14) key 1
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 13, 'single_choice', 'auto_choice', 'We watched a soccer game at the (   ) near the station.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'stadium', true), (v_q, 1, '2', 'hospital', false),
    (v_q, 2, '3', 'post office', false), (v_q, 3, '4', 'bookstore', false);

  -- (15) key 4
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 14, 'single_choice', 'auto_choice', 'My mother told me (   ) the dishes after dinner.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'wash', false), (v_q, 1, '2', 'washing', false),
    (v_q, 2, '3', 'washed', false), (v_q, 3, '4', 'to wash', true);

  -- ── 大問2: Dialogue completion (5 items) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問2', 'Dialogue Completion',
          'Choose the best sentence or phrase (1-4) to complete each dialogue.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type)
  VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  -- (16) key 3
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'Girl: I''m going to see a movie with Jane tomorrow. (   )' || chr(10) ||
    'Boy: Sorry, I can''t. I have soccer practice.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'What was it about?', false), (v_q, 1, '2', 'Did you have fun?', false),
    (v_q, 2, '3', 'Do you want to come with us?', true), (v_q, 3, '4', 'Where did you see it?', false);

  -- (17) key 1
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'Boy: Mom, where are my gym shoes?' || chr(10) ||
    'Mother: (   )' || chr(10) ||
    'Boy: Oh, thanks. I''ll get them.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'They''re by the front door.', true), (v_q, 1, '2', 'I like your new shoes.', false),
    (v_q, 2, '3', 'You can buy them tomorrow.', false), (v_q, 3, '4', 'The gym is closed today.', false);

  -- (18) key 4
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'Woman: Excuse me. Is there a flower shop near here?' || chr(10) ||
    'Man: (   )' || chr(10) ||
    'Woman: Thank you very much.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'I like roses the best.', false), (v_q, 1, '2', 'No, thank you.', false),
    (v_q, 2, '3', 'It was very beautiful.', false), (v_q, 3, '4', 'Yes, there''s one across the street.', true);

  -- (19) key 2
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice',
    'Girl: Your English is really good, Kenta. (   )' || chr(10) ||
    'Boy: For five years. I want to study abroad someday.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'When is your English test?', false), (v_q, 1, '2', 'How long have you studied it?', true),
    (v_q, 2, '3', 'Can you speak French, too?', false), (v_q, 3, '4', 'Which country is it in?', false);

  -- (20) key 3
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice',
    'Boy: This curry is delicious, Grandma.' || chr(10) ||
    'Grandmother: Thank you. (   )' || chr(10) ||
    'Boy: Yes, please. Just a little.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'Did you make it yourself?', false), (v_q, 1, '2', 'Was the restaurant crowded?', false),
    (v_q, 2, '3', 'Would you like some more?', true), (v_q, 3, '4', 'Can you cook dinner?', false);

  -- ── 大問3A: Notice (2 questions) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問3A', 'Notice',
          'Read the notice and choose the best answer (1-4) for each question.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'Greenfield Junior High School — Winter Concert' || chr(10) || chr(10) ||
    'The school chorus and brass band will hold a winter concert.' || chr(10) || chr(10) ||
    'Date: Friday, December 19' || chr(10) ||
    'Time: 3:30 p.m. - 5:00 p.m.' || chr(10) ||
    'Place: School Gym' || chr(10) || chr(10) ||
    'The chorus will sing first. After that, the brass band will play five songs. Students who want to help as concert staff should talk to Ms. Carter in the music room by December 12. Staff members will put chairs in the gym at 2:30 p.m. on the concert day.')
  RETURNING id INTO v_grp;

  -- (21) key 1
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What time will the concert start?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'At 3:30 p.m.', true), (v_q, 1, '2', 'At 2:30 p.m.', false),
    (v_q, 2, '3', 'At 5:00 p.m.', false), (v_q, 3, '4', 'At noon.', false);

  -- (22) key 4
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Students who want to be concert staff should', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'sing in the chorus.', false), (v_q, 1, '2', 'play five songs.', false),
    (v_q, 2, '3', 'bring chairs from home.', false), (v_q, 3, '4', 'talk to Ms. Carter by December 12.', true);

  -- ── 大問3B: E-mail exchange (3 questions) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問3B', 'E-mails',
          'Read the e-mails and choose the best answer (1-4) for each question.', 3)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'From: Lisa Miller' || chr(10) ||
    'To: Aya Tanaka' || chr(10) ||
    'Date: May 10' || chr(10) ||
    'Subject: Cooking class' || chr(10) || chr(10) ||
    'Hi Aya,' || chr(10) ||
    'How are you? Our town will have a cooking class for students at the community center next Saturday. We will learn how to make pizza! The class starts at ten and finishes at one, and it costs five dollars. Do you want to come with me? My mother can take us there by car.' || chr(10) ||
    'Your friend,' || chr(10) ||
    'Lisa' || chr(10) || chr(10) ||
    '----------------------------------------' || chr(10) || chr(10) ||
    'From: Aya Tanaka' || chr(10) ||
    'To: Lisa Miller' || chr(10) ||
    'Date: May 10' || chr(10) ||
    'Subject: Re: Cooking class' || chr(10) || chr(10) ||
    'Hi Lisa,' || chr(10) ||
    'Thanks for your e-mail. I''d love to come! Last month, I made cookies with my aunt, but I have never made pizza. Should I bring anything? I''ll ask my mom about it tonight and call you tomorrow.' || chr(10) ||
    'See you,' || chr(10) ||
    'Aya')
  RETURNING id INTO v_grp;

  -- (23) key 2
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What will the students learn next Saturday?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'How to make cookies.', false), (v_q, 1, '2', 'How to make pizza.', true),
    (v_q, 2, '3', 'How to drive a car.', false), (v_q, 3, '4', 'How to write e-mails.', false);

  -- (24) key 3
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Lisa''s mother will', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'teach the cooking class.', false), (v_q, 1, '2', 'make lunch for the girls.', false),
    (v_q, 2, '3', 'take the girls by car.', true), (v_q, 3, '4', 'pay five dollars.', false);

  -- (25) key 1
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'Last month, Aya', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'made cookies with her aunt.', true), (v_q, 1, '2', 'went to the community center.', false),
    (v_q, 2, '3', 'ate pizza with Lisa.', false), (v_q, 3, '4', 'cooked dinner for her mother.', false);

  -- ── 大問3C: Personal essay (5 questions) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問3C', 'Story',
          'Read the story and choose the best answer (1-4) for each question.', 4)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'Haruto''s New Hobby' || chr(10) || chr(10) ||
    'Haruto is a junior high school student in Nagano. Last spring, his grandfather gave him an old camera. At first, Haruto didn''t know how to use it, so his grandfather showed him. They walked around town together and took pictures of flowers and birds.' || chr(10) || chr(10) ||
    'Now, taking pictures is Haruto''s favorite hobby. Every weekend, he rides his bike to different places. Last month, he took a picture of a beautiful white bird by the river. His teacher liked the picture very much, so she put it on the wall of his classroom.' || chr(10) || chr(10) ||
    'Next month, there will be a photo contest in Haruto''s city. The winner will get a new camera. Haruto wants to win, but he loves his grandfather''s old camera, so he will keep using it. He is going to take pictures of the summer festival for the contest. His grandfather will go to the festival with him.')
  RETURNING id INTO v_grp;

  -- (26) key 2
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What did Haruto''s grandfather do last spring?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'He bought a new bike.', false), (v_q, 1, '2', 'He gave Haruto an old camera.', true),
    (v_q, 2, '3', 'He took Haruto to a festival.', false), (v_q, 3, '4', 'He won a photo contest.', false);

  -- (27) key 4
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What does Haruto do every weekend?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'He washes his bike.', false), (v_q, 1, '2', 'He visits his teacher.', false),
    (v_q, 2, '3', 'He takes care of birds.', false), (v_q, 3, '4', 'He goes to different places by bike.', true);

  -- (28) key 3
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'Why did Haruto''s teacher put his picture on the classroom wall?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'Haruto asked her to do it.', false), (v_q, 1, '2', 'It was a picture of the school.', false),
    (v_q, 2, '3', 'She liked it very much.', true), (v_q, 3, '4', 'Haruto won a contest with it.', false);

  -- (29) key 2
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'What will the winner of the photo contest get?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'A bike.', false), (v_q, 1, '2', 'A new camera.', true),
    (v_q, 2, '3', 'Festival tickets.', false), (v_q, 3, '4', 'An old picture.', false);

  -- (30) key 4
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What is Haruto going to do for the contest?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '1', 'Buy a new camera.', false), (v_q, 1, '2', 'Take pictures of a white bird.', false),
    (v_q, 2, '3', 'Ride his bike to the river.', false), (v_q, 3, '4', 'Take pictures of the summer festival.', true);

  -- ═══════════════════════════ WRITING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-g3-writing-mock-01', 'EIKEN Grade 3 — Writing Mock Test 1',
          '英検3級 ライティング模試1', 'full_mock', 1500, false,
          'eiken-g3-mock-01', 'EIKEN Grade 3 — Mock Test 1', '英検3級 模試1', 1)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'E-mail & Opinion',
          'Two tasks, as in the EIKEN Grade 3 writing section: an e-mail reply and an opinion.', 0)
  RETURNING id INTO v_sec;

  -- ── Task 1: Eメール — reply to a friend's e-mail (15-25 words) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
    'Hi!' || chr(10) ||
    'Thank you for your e-mail. I went to a new aquarium with my family yesterday. The dolphin show was amazing! I heard that you started learning the guitar last month. I want to know more about it. How often do you practice the guitar? And what song do you want to play? Tell me more!' || chr(10) ||
    'Your friend,' || chr(10) ||
    'Alex',
    'You received this e-mail from your friend Alex. Write a reply. Answer BOTH of your friend''s questions.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
    'Write your reply to Alex. Answer the two questions in the e-mail. (15-25 words)',
    '{"task":"email","min_words":15,"max_words":25,"reference":"The reply must answer BOTH questions from Alex''s e-mail: (1) how often the writer practices the guitar (e.g. every day / twice a week), and (2) what song the writer wants to play. A reply that answers only one question loses content points."}'::jsonb,
    v_rub_w, 16) RETURNING id INTO v_q;

  -- ── Task 2: 意見文 — opinion with two reasons (25-35 words) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'Write your opinion. Give two reasons.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'QUESTION: Which do you like better, eating at home or eating at a restaurant? Write your opinion and two reasons. (25-35 words)',
    '{"task":"opinion","min_words":25,"max_words":35,"reference":"The answer must state a clear choice (eating at home OR eating at a restaurant) and give TWO reasons supporting it."}'::jsonb,
    v_rub_w, 16) RETURNING id INTO v_q;

  -- ═══════════════════════════ SPEAKING ═══════════════════════════
  -- Second-stage interview: untimed (time_limit_seconds NULL).
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-g3-speaking-mock-01', 'EIKEN Grade 3 — Speaking Mock Test 1',
          '英検3級 スピーキング模試1', 'full_mock', NULL, false,
          'eiken-g3-mock-01', 'EIKEN Grade 3 — Mock Test 1', '英検3級 模試1', 3)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Interview', 'Card-based Interview',
          'Read the passage aloud, then answer the questions by speaking in English. Tap Record / Stop for each.', 0)
  RETURNING id INTO v_sec;

  -- ── Card group: passage + illustration ──
  -- image_asset_id stays NULL here — attach the card illustration with
  -- scripts/attach-eiken-g3-images.mjs (file eg3-card.jpg).
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
    'Our City Zoo' || chr(10) ||
    'Many families visit the city zoo on weekends. Children like watching the monkeys because they are very funny. People can also ride ponies and buy animal cookies at the zoo shop.',
    'Look at the card. Read the passage aloud, then answer the questions.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Now, please read the passage aloud.',
    '{"subtask":"read_aloud","prep_seconds":20}'::jsonb, v_rub_s, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'No. 1 — Please look at the passage. Why do children like watching the monkeys?',
    '{"subtask":"passage_qa","reference":"From the passage: children like watching the monkeys because they are very funny. Expected answer: Because they are very funny."}'::jsonb,
    v_rub_s, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
    'No. 2 — Please look at the picture. What is the boy doing?',
    '{"subtask":"picture_qa","reference":"Intended illustration: a zoo scene. A boy is taking a picture of the monkeys with a camera. A girl is eating an ice cream. Three birds are sitting on a fence. Expected answer (present continuous): He is taking a picture (of the monkeys)."}'::jsonb,
    v_rub_s, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 3, 'speaking_response', 'ai_rubric',
    'No. 3 — How many birds are there in the picture?',
    '{"subtask":"picture_qa","reference":"Intended illustration shows exactly three birds sitting on a fence at the zoo. Expected answer: There are three (birds)."}'::jsonb,
    v_rub_s, 5)
  RETURNING id INTO v_q;

  -- ── Personal questions (card turned over) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'Now please answer about yourself.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'No. 4 — What do you like to do after dinner?',
    '{"subtask":"personal_qa"}'::jsonb, v_rub_s, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'No. 5 — Have you ever been to a zoo or an aquarium? Please tell me more.',
    '{"subtask":"personal_qa"}'::jsonb, v_rub_s, 5)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded EIKEN G3 Mock 1 (reading: 30 Q, writing: 2 tasks, speaking: 6 tasks incl. read-aloud) — ALL UNPUBLISHED.';
END $$;
