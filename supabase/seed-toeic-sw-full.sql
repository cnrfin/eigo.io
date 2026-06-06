-- ============================================================
--  TOEIC S&W Mock 1 — SPEAKING (11 tasks) + WRITING (8 tasks)
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
--  set 'toeic-sw-mock-01'. Per-skill 0-200 score scales are added (interpolated
--  approximations of ETS's unpublished conversion).
--  Picture tasks: images are attached later — see supabase/TOEIC-SW-PHOTOS.md
--  + scripts/attach-toeic-sw-images.mjs. payload.reference tells the AI grader
--  what each picture shows (never displayed to the student).
--  Idempotent. Run AFTER add-practice-tests.sql + seed-test-scales-rubrics.sql
--  + add-test-sets.sql.
-- ============================================================

-- ---- Score scales: raw -> scaled (0-200), nearest-raw lookup ----
INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, 'speaking', '{"raw_basis":29,"table":[
  {"raw":0,"scaled":0},{"raw":3,"scaled":30},{"raw":6,"scaled":60},
  {"raw":9,"scaled":80},{"raw":12,"scaled":100},{"raw":15,"scaled":120},
  {"raw":18,"scaled":140},{"raw":21,"scaled":160},{"raw":24,"scaled":180},
  {"raw":27,"scaled":190},{"raw":29,"scaled":200}]}'::jsonb
FROM exam_tracks t
WHERE t.slug = 'toeic-sw'
  AND NOT EXISTS (SELECT 1 FROM score_scales s WHERE s.track_id = t.id AND s.skill = 'speaking');

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, 'writing', '{"raw_basis":28,"table":[
  {"raw":0,"scaled":0},{"raw":3,"scaled":30},{"raw":6,"scaled":60},
  {"raw":9,"scaled":80},{"raw":12,"scaled":100},{"raw":15,"scaled":120},
  {"raw":18,"scaled":140},{"raw":21,"scaled":160},{"raw":24,"scaled":180},
  {"raw":26,"scaled":190},{"raw":28,"scaled":200}]}'::jsonb
FROM exam_tracks t
WHERE t.slug = 'toeic-sw'
  AND NOT EXISTS (SELECT 1 FROM score_scales s WHERE s.track_id = t.id AND s.skill = 'writing');

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
  DELETE FROM test_forms WHERE slug IN ('toeic-sw-speaking-mock-01', 'toeic-sw-writing-mock-01');

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'toeic-sw';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track toeic-sw not found — run add-practice-tests.sql first.';
  END IF;
  SELECT id INTO v_rub_s FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'TOEIC Speaking' LIMIT 1;
  SELECT id INTO v_rub_w FROM rubrics WHERE track_id = v_track AND skill = 'writing'  AND name = 'TOEIC Writing'  LIMIT 1;

  -- ═══════════════════════════ SPEAKING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-sw-speaking-mock-01', 'TOEIC S&W Mock 1 — Speaking',
          'TOEIC S&W 模試1 スピーキング', 'full_mock', 1200, false,
          'toeic-sw-mock-01', 'TOEIC S&W — Mock Test 1', 'TOEIC S&W 模試1', 0)
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
    'Attention, passengers on flight two-oh-seven to Vancouver. Boarding will begin in approximately ten minutes at gate twelve. Please have your boarding pass and a valid form of identification ready. Passengers travelling with small children, or those who require extra time, are welcome to board first. We thank you for your patience, and we look forward to welcoming you on board.',
    '{"subtask":"read_aloud","prep_seconds":45,"speak_seconds":45}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'Read the following text aloud:' || chr(10) || chr(10) ||
    'Looking for a fresh start this spring? Greenfield Fitness is offering new members three months of unlimited classes for the price of two. Choose from yoga, swimming, indoor cycling, and more. Our friendly, certified trainers will help you set realistic goals and stay motivated. Visit our website, call us today, or simply drop by the front desk to begin your journey.',
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
    '{"subtask":"describe_picture","prep_seconds":45,"speak_seconds":30,"reference":"An outdoor farmers market on a sunny day. A woman with a basket is choosing tomatoes at a vegetable stall while a vendor in an apron weighs produce on a scale. Other shoppers walk between stalls with striped awnings in the background."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type)
  VALUES (v_sec, 1, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Describe the picture in as much detail as you can.',
    '{"subtask":"describe_picture","prep_seconds":45,"speak_seconds":30,"reference":"A modern office meeting room. Three colleagues sit at a table with laptops and coffee cups while a man stands at a whiteboard pointing at a chart. Large windows show a city skyline behind them."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q5-7: Respond to Questions ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Questions 5-7', 'Respond to Questions',
          'Imagine that a marketing firm is doing research in your area. You have agreed to answer some questions over the phone about eating out. Each response begins after a 3-second countdown.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'A marketing firm is asking you about eating out in your area.') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'How often do you eat at restaurants, and who do you usually go with?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":15}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'What kind of restaurant has opened most recently near where you live?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":15}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
    'If a friend were visiting your town, which restaurant would you recommend, and why?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":30}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q8-10: Respond to Questions Using Information Provided ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Questions 8-10', 'Respond Using Information Provided',
          'You will answer three questions from a caller using the information below. For the first question you have 45 seconds to review the information before recording begins; after that, each response starts after a 3-second countdown.', 3)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'RIVERSIDE BUSINESS SKILLS WORKSHOP — Saturday, 18 October' || chr(10) ||
    'Location: Hartley Conference Centre, Room 2B' || chr(10) ||
    'Registration fee: $40 (includes lunch and materials)' || chr(10) || chr(10) ||
    ' 9:00 -  9:30  Registration and coffee' || chr(10) ||
    ' 9:30 - 11:00  Presentation: Writing Clear Business E-mails — Dana Wells' || chr(10) ||
    '11:00 - 12:30  Workshop: Negotiation Basics — Marcus Cole' || chr(10) ||
    '12:30 -  1:30  Lunch (provided)' || chr(10) ||
    ' 1:30 -  3:00  Workshop: Presenting with Confidence — Dana Wells' || chr(10) ||
    ' 3:00 -  3:15  Closing remarks and certificates')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Hi, I''m thinking of attending the workshop. What time does it start, and how much does it cost?',
    '{"subtask":"respond_info","prep_seconds":45,"speak_seconds":15,"reference":"Registration begins at 9:00 a.m. (sessions start 9:30). The fee is $40, which includes lunch and materials."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'I heard there''s a session about giving presentations in the morning. Is that right?',
    '{"subtask":"respond_info","prep_seconds":3,"speak_seconds":15,"reference":"No — Presenting with Confidence is in the AFTERNOON, 1:30-3:00, led by Dana Wells. The morning sessions are business e-mails (9:30-11:00) and negotiation (11:00-12:30)."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
    'Could you tell me about everything Dana Wells will be doing at the workshop?',
    '{"subtask":"respond_info","prep_seconds":3,"speak_seconds":30,"reference":"Dana Wells leads two sessions: the presentation Writing Clear Business E-mails from 9:30 to 11:00, and the workshop Presenting with Confidence from 1:30 to 3:00."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q11: Express an Opinion ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Question 11', 'Express an Opinion',
          'You will give your opinion about a topic. You have 45 seconds to prepare, then 60 seconds to speak. Say as much as you can in the time allowed.', 4)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Some companies give employees money to spend on training of their choice. Others decide which training employees must take. Which approach do you think is better for a company, and why? Give specific reasons or examples.',
    '{"subtask":"opinion","prep_seconds":45,"speak_seconds":60}'::jsonb, v_rub_s, 5) RETURNING id INTO v_q;

  -- ═══════════════════════════ WRITING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-sw-writing-mock-01', 'TOEIC S&W Mock 1 — Writing',
          'TOEIC S&W 模試1 ライティング', 'full_mock', 3600, false,
          'toeic-sw-mock-01', 'TOEIC S&W — Mock Test 1', 'TOEIC S&W 模試1', 1)
  RETURNING id INTO v_form;

  -- ── Q1-5: Write a Sentence Based on a Picture ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Questions 1-5', 'Write a Sentence Based on a Picture',
          'Write ONE sentence based on each picture, using the TWO words or phrases given. You may use them in any order and change their form. Recommended time: about 8 minutes for all five pictures.', 0)
  RETURNING id INTO v_sec;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "woman" / "bicycle"',
    '{"task":"picture_sentence","words":["woman","bicycle"],"reference":"A woman in a helmet rides a bicycle along a tree-lined park path."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 1, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "boxes" / "carry"',
    '{"task":"picture_sentence","words":["boxes","carry"],"reference":"A delivery worker carries a stack of cardboard boxes up the steps of an office building."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 2, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "umbrella" / "because"',
    '{"task":"picture_sentence","words":["umbrella","because"],"reference":"Pedestrians cross a city street holding umbrellas in heavy rain."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 3, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "menu" / "order"',
    '{"task":"picture_sentence","words":["menu","order"],"reference":"A waiter takes an order from two customers reading menus at a café table."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 4, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "presentation" / "while"',
    '{"task":"picture_sentence","words":["presentation","while"],"reference":"A woman gives a presentation with a projected chart while colleagues take notes at a conference table."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  -- ── Q6-7: Respond to a Written Request ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Questions 6-7', 'Respond to a Written Request',
          'Read each e-mail and write a reply. Recommended time: about 10 minutes per e-mail.', 1)
  RETURNING id INTO v_sec;

  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'From: Mira Solano, Bright Path Travel' || chr(10) ||
    'Subject: Your upcoming group tour' || chr(10) || chr(10) ||
    'Dear customer,' || chr(10) || chr(10) ||
    'Thank you for booking our three-day coach tour. To help us plan, could you tell us about any food preferences or health needs in your group? Also, please let us know where you would like to be picked up on the first morning.' || chr(10) || chr(10) ||
    'Best regards,' || chr(10) || 'Mira Solano')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
    'Reply to the e-mail as the customer. In your reply, give TWO pieces of information and ask ONE question.',
    '{"task":"email"}'::jsonb, v_rub_w, 4) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
    'From: Theo Banks, Office Services' || chr(10) ||
    'Subject: Meeting room booking system feedback' || chr(10) || chr(10) ||
    'Hello,' || chr(10) || chr(10) ||
    'We recently introduced the new online system for booking meeting rooms. As a frequent user, how have you found it so far? We would appreciate your comments and any problems you have noticed.' || chr(10) || chr(10) ||
    'Thank you,' || chr(10) || 'Theo Banks')
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
    'Do you agree or disagree with the following statement? "It is better for employees to change companies several times during their career than to stay at one company for a long time." Use specific reasons and examples to support your opinion. Write at least 300 words.',
    '{"task":"opinion","min_words":300}'::jsonb, v_rub_w, 5) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded TOEIC S&W Mock 1 (speaking: 11 tasks raw 29, writing: 8 tasks raw 28) — UNPUBLISHED.';
END $$;
