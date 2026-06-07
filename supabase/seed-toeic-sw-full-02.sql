-- ============================================================
--  TOEIC S&W Mock 2 — SPEAKING (11 tasks) + WRITING (8 tasks)
-- ============================================================
--  Faithful TOEIC Speaking & Writing structure, one set:
--    SPEAKING (~20 min, self-paced per task, raw 29):
--      Q1-2   Read a text aloud            (45s prep / 45s speak, 0-3)
--      Q3-4   Describe a picture           (45s prep / 30s speak, 0-3)  [images]
--      Q5-7   Respond to questions         (15s / 15s / 30s, 0-3)
--      Q8-10  Respond using information    (15s / 15s / 30s, 0-3)
--      Q11    Express an opinion           (45s prep / 60s speak, 0-5)
--    WRITING (60 min, raw 28):
--      Q1-5   Write a sentence about a picture, using two given words (0-3) [images]
--      Q6-7   Respond to a written request (e-mail) (0-4)
--      Q8     Opinion essay, 300+ words (0-5)
--  Both forms are seeded UNPUBLISHED (admin draft preview) and tagged into
--  set 'toeic-sw-mock-02'. Score scales are track-level and already seeded
--  by seed-toeic-sw-full.sql, so they are NOT repeated here.
--  Picture tasks: images are attached later — see supabase/TOEIC-SW-PHOTOS-02.md
--  + scripts/attach-toeic-sw-images-02.mjs. payload.reference tells the AI grader
--  what each picture shows (never displayed to the student).
--  Idempotent. Run AFTER add-practice-tests.sql + seed-test-scales-rubrics.sql
--  + add-test-sets.sql + seed-toeic-sw-full.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid;
  v_rub_s uuid;
  v_rub_w uuid;
  v_form  uuid;
  v_sec   uuid;
  v_grp   uuid;
  v_q     uuid;
BEGIN
  DELETE FROM test_forms WHERE slug IN ('toeic-sw-speaking-mock-02', 'toeic-sw-writing-mock-02');

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'toeic-sw';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track toeic-sw not found — run add-practice-tests.sql first.';
  END IF;
  SELECT id INTO v_rub_s FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'TOEIC Speaking' LIMIT 1;
  SELECT id INTO v_rub_w FROM rubrics WHERE track_id = v_track AND skill = 'writing'  AND name = 'TOEIC Writing'  LIMIT 1;

  -- ═══════════════════════════ SPEAKING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-sw-speaking-mock-02', 'TOEIC S&W Mock 2 — Speaking',
          'TOEIC S&W 模試2 スピーキング', 'full_mock', 1200, false,
          'toeic-sw-mock-02', 'TOEIC S&W — Mock Test 2', 'TOEIC S&W 模試2', 0)
  RETURNING id INTO v_form;

  -- ── Q1-2: Read a Text Aloud ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Questions 1-2', 'Read a Text Aloud',
          'You will read a short text aloud. You have 45 seconds to prepare, then 45 seconds to read the text clearly into the microphone.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Read the following text aloud:' || chr(10) || chr(10) ||
    'Attention, visitors. The museum will be closing in fifteen minutes. Please make your way to the main exit on the ground floor. If you would like to support our exhibitions, memberships, postcards, and gift items are available at the front desk until closing time. We hope you have enjoyed your visit, and we look forward to seeing you again soon.',
    '{"subtask":"read_aloud","prep_seconds":45,"speak_seconds":45}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'Read the following text aloud:' || chr(10) || chr(10) ||
    'Are you ready to discover the joy of cooking? At the Lakeside Culinary Studio, our evening classes cover everything from quick weeknight dinners to elegant desserts. You will learn to chop, season, and plate your dishes like a professional. Classes are small, friendly, and suitable for complete beginners. Spaces fill up quickly, so register online or stop by our studio today.',
    '{"subtask":"read_aloud","prep_seconds":45,"speak_seconds":45}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q3-4: Describe a Picture (images attached later) ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Questions 3-4', 'Describe a Picture',
          'You will describe the picture on your screen in as much detail as you can. You have 45 seconds to prepare, then 30 seconds to speak.', 1)
  RETURNING id INTO v_sec;

  INSERT INTO question_groups (section_id, order_index, stimulus_type)
  VALUES (v_sec, 0, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Describe the picture in as much detail as you can.',
    '{"subtask":"describe_picture","prep_seconds":45,"speak_seconds":30,"reference":"The interior of a busy coffee shop. A barista in an apron hands a paper cup to a woman customer across a wooden counter. Behind the counter there are shelves with mugs and bags of coffee, and other customers sit at small tables working on laptops."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type)
  VALUES (v_sec, 1, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Describe the picture in as much detail as you can.',
    '{"subtask":"describe_picture","prep_seconds":45,"speak_seconds":30,"reference":"A city park on a clear day. Two joggers run along a paved path while a man walks a small dog nearby. Wooden benches and tall trees line the path, and office buildings are visible in the background."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q5-7: Respond to Questions ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Questions 5-7', 'Respond to Questions',
          'Imagine that a marketing firm is doing research in your area. You have agreed to answer some questions over the phone about public transportation. Each response begins after a 3-second countdown.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'A marketing firm is asking you about public transportation in your area.') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'How often do you use public transportation, and what type do you use most?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":15}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'How long does it take to get from your home to the nearest bus stop or train station?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":15}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
    'Do you think more people in your area will use public transportation in the future? Why or why not?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":30}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q8-10: Respond to Questions Using Information Provided ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Questions 8-10', 'Respond Using Information Provided',
          'You will answer three questions from a caller using the information below. For the first question you have 45 seconds to review the information before recording begins; after that, each response starts after a 3-second countdown.', 3)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'NORFIELD PUBLISHING — INTERVIEW SCHEDULE' || chr(10) ||
    'Position: Marketing Assistant' || chr(10) ||
    'Date: Tuesday, 12 May — Conference Room 3 (second floor)' || chr(10) ||
    'Interviewer: Patricia Lane, Marketing Director' || chr(10) || chr(10) ||
    '10:00 - 10:30  Kelly Nguyen — Sales Clerk, Brightway Books' || chr(10) ||
    '10:30 - 11:00  Brian Ortega — Junior Copywriter, Adlink Agency' || chr(10) ||
    '11:00 - 11:30  Marta Silva — Marketing Intern, Norfield Publishing' || chr(10) ||
    '12:00 -  1:30  Lunch break' || chr(10) ||
    ' 2:00 -  2:30  Daniel Reed — Events Coordinator, City Arts Festival' || chr(10) ||
    ' 2:30 -  3:00  Aisha Karim — Social Media Assistant, TrendCo Marketing' || chr(10) || chr(10) ||
    'Note: Each candidate will take a 15-minute writing test after the interview.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Hello, this is Patricia Lane. I don''t have the schedule with me. What day are the interviews, and where will they be held?',
    '{"subtask":"respond_info","prep_seconds":45,"speak_seconds":15,"reference":"The interviews are on Tuesday, 12 May, in Conference Room 3 on the second floor."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'I seem to remember that Daniel Reed''s interview is first thing in the morning. Is that right?',
    '{"subtask":"respond_info","prep_seconds":3,"speak_seconds":15,"reference":"No — Daniel Reed is the first interview of the AFTERNOON, at 2:00. The first interview of the morning is Kelly Nguyen at 10:00."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
    'Could you give me all the details about the candidates I will be seeing in the morning?',
    '{"subtask":"respond_info","prep_seconds":3,"speak_seconds":30,"reference":"Three morning candidates: Kelly Nguyen, a sales clerk at Brightway Books, at 10:00; Brian Ortega, a junior copywriter at Adlink Agency, at 10:30; and Marta Silva, a marketing intern at Norfield Publishing, at 11:00."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q11: Express an Opinion ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Question 11', 'Express an Opinion',
          'You will give your opinion about a topic. You have 45 seconds to prepare, then 60 seconds to speak. Say as much as you can in the time allowed.', 4)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Do you agree or disagree with the following statement? "For a team leader, good communication skills are more important than expert technical knowledge." Give specific reasons or examples to support your opinion.',
    '{"subtask":"opinion","prep_seconds":45,"speak_seconds":60}'::jsonb, v_rub_s, 5) RETURNING id INTO v_q;

  -- ═══════════════════════════ WRITING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-sw-writing-mock-02', 'TOEIC S&W Mock 2 — Writing',
          'TOEIC S&W 模試2 ライティング', 'full_mock', 3600, false,
          'toeic-sw-mock-02', 'TOEIC S&W — Mock Test 2', 'TOEIC S&W 模試2', 1)
  RETURNING id INTO v_form;

  -- ── Q1-5: Write a Sentence Based on a Picture ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Questions 1-5', 'Write a Sentence Based on a Picture',
          'Write ONE sentence based on each picture, using the TWO words or phrases given. You may use them in any order and change their form. Recommended time: about 8 minutes for all five pictures.', 0)
  RETURNING id INTO v_sec;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "man" / "dog"',
    '{"task":"picture_sentence","words":["man","dog"],"reference":"A man walks a small dog on a leash along a path in a park."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 1, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "mechanic" / "repair"',
    '{"task":"picture_sentence","words":["mechanic","repair"],"reference":"A mechanic in overalls repairs a car with its hood open in a garage."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 2, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "luggage" / "so"',
    '{"task":"picture_sentence","words":["luggage","so"],"reference":"Travelers stand in a long line with their luggage at an airport check-in counter."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 3, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "shelf" / "put"',
    '{"task":"picture_sentence","words":["shelf","put"],"reference":"A supermarket employee in uniform puts canned goods on a shelf in a grocery store aisle."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 4, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "hands" / "after"',
    '{"task":"picture_sentence","words":["hands","after"],"reference":"Two businesspeople shake hands across a table after a meeting, with documents and laptops on the table."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  -- ── Q6-7: Respond to a Written Request ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Questions 6-7', 'Respond to a Written Request',
          'Read each e-mail and write a reply. Recommended time: about 10 minutes per e-mail.', 1)
  RETURNING id INTO v_sec;

  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'From: Anna Brooks, Carlton Office Supplies' || chr(10) ||
    'Subject: Your recent order' || chr(10) || chr(10) ||
    'Dear customer,' || chr(10) || chr(10) ||
    'Thank you for your order last week. Unfortunately, one of the items, the desk organizer set, is temporarily out of stock. Would you prefer to wait about two weeks for it, or receive a similar product at the same price? Please also confirm the delivery address for the rest of your order.' || chr(10) || chr(10) ||
    'Kind regards,' || chr(10) || 'Anna Brooks')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
    'Reply to the e-mail as the customer. In your reply, give TWO pieces of information and ask ONE question.',
    '{"task":"email"}'::jsonb, v_rub_w, 4) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
    'From: Sam Whitaker, Human Resources' || chr(10) ||
    'Subject: New employee orientation feedback' || chr(10) || chr(10) ||
    'Hello,' || chr(10) || chr(10) ||
    'We are currently reviewing the orientation programme for new staff. Since you joined the company recently, we would like to hear about your experience. How useful did you find the orientation, and is there anything we should change?' || chr(10) || chr(10) ||
    'Thank you,' || chr(10) || 'Sam Whitaker')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
    'Reply to the e-mail. In your reply, describe ONE problem you have noticed and make TWO suggestions.',
    '{"task":"email"}'::jsonb, v_rub_w, 4) RETURNING id INTO v_q;

  -- ── Q8: Opinion Essay ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Question 8', 'Write an Opinion Essay',
          'Write an essay of at least 300 words. State your opinion clearly and support it with reasons and examples. Recommended time: 30 minutes.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Do you agree or disagree with the following statement? "The best way for a company to keep good employees is to pay them well." Use specific reasons and examples to support your opinion. Write at least 300 words.',
    '{"task":"opinion","min_words":300}'::jsonb, v_rub_w, 5) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded TOEIC S&W Mock 2 (speaking: 11 tasks raw 29, writing: 8 tasks raw 28) — UNPUBLISHED.';
END $$;
