-- ============================================================
--  TOEIC S&W Mock 3 — SPEAKING (11 tasks) + WRITING (8 tasks)
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
--  set 'toeic-sw-mock-03'. Score scales are track-level and already seeded
--  by seed-toeic-sw-full.sql, so they are NOT repeated here.
--  Picture tasks: images are attached later — see supabase/TOEIC-SW-PHOTOS-03.md
--  + scripts/attach-toeic-sw-images-03.mjs. payload.reference tells the AI grader
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
  DELETE FROM test_forms WHERE slug IN ('toeic-sw-speaking-mock-03', 'toeic-sw-writing-mock-03');

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'toeic-sw';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track toeic-sw not found — run add-practice-tests.sql first.';
  END IF;
  SELECT id INTO v_rub_s FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'TOEIC Speaking' LIMIT 1;
  SELECT id INTO v_rub_w FROM rubrics WHERE track_id = v_track AND skill = 'writing'  AND name = 'TOEIC Writing'  LIMIT 1;

  -- ═══════════════════════════ SPEAKING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-sw-speaking-mock-03', 'TOEIC S&W Mock 3 — Speaking',
          'TOEIC S&W 模試3 スピーキング', 'full_mock', 1200, false,
          'toeic-sw-mock-03', 'TOEIC S&W — Mock Test 3', 'TOEIC S&W 模試3', 0)
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
    'Attention, shoppers. Our store will be closing in twenty minutes. Please bring your final purchases to the checkout lanes at the front of the store. Tonight only, all bakery items are reduced by fifty percent, and fresh flowers are buy one, get one free. Thank you for shopping with us this evening, and we look forward to serving you again tomorrow.',
    '{"subtask":"read_aloud","prep_seconds":45,"speak_seconds":45}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'Read the following text aloud:' || chr(10) || chr(10) ||
    'Spring has arrived at the Harborview Botanical Garden! Join us this weekend for our annual Spring Festival, featuring guided tours, live music, and hands-on gardening workshops. Stroll past beds of tulips, daffodils, and cherry blossoms, or relax with refreshments at our garden café. Tickets are available online, by phone, or at the main gate. Don''t miss the most colorful event of the season!',
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
    '{"subtask":"describe_picture","prep_seconds":45,"speak_seconds":30,"reference":"A city bus stop in the daytime. Several people wait under a glass bus shelter — a young man stands checking his phone while a woman with a shoulder bag and an older man sit on the bench. A city bus is approaching along the street toward the stop, with shops visible in the background."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type)
  VALUES (v_sec, 1, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Describe the picture in as much detail as you can.',
    '{"subtask":"describe_picture","prep_seconds":45,"speak_seconds":30,"reference":"A bright open-plan office. Two colleagues — a man and a woman — stand at a desk looking at a tablet together; the woman holds the tablet while the man points at the screen. Around them, other employees work at rows of desks with computer monitors, and large windows let in daylight."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q5-7: Respond to Questions ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Questions 5-7', 'Respond to Questions',
          'Imagine that a marketing firm is doing research in your area. You have agreed to answer some questions over the phone about shopping online. Each response begins after a 3-second countdown.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt', 'A marketing firm is asking you about shopping online.') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'How often do you shop online, and when did you last buy something online?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":15}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'What kinds of products do you usually buy online?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":15}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
    'Do you think having products delivered to your home is better than buying them in a store? Why or why not?',
    '{"subtask":"respond","prep_seconds":3,"speak_seconds":30}'::jsonb, v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q8-10: Respond to Questions Using Information Provided ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Questions 8-10', 'Respond Using Information Provided',
          'You will answer three questions from a caller using the information below. For the first question you have 45 seconds to review the information before recording begins; after that, each response starts after a 3-second countdown.', 3)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'BUSINESS TRIP ITINERARY — Mark Pearson, Sales Manager' || chr(10) ||
    'Chicago, Monday 9 June - Tuesday 10 June' || chr(10) ||
    'Hotel: Grandview Plaza Hotel, 200 Lake Street (downtown)' || chr(10) || chr(10) ||
    'MONDAY, 9 JUNE' || chr(10) ||
    ' 7:30 a.m.   Flight KA 318 departs Easton City Airport, Terminal 2' || chr(10) ||
    ' 9:10 a.m.   Arrive Chicago — taxi to hotel' || chr(10) ||
    ' 1:00 - 2:30  Lunch meeting with regional sales team — hotel restaurant' || chr(10) ||
    ' 3:00 - 4:30  Factory tour — Kemper Manufacturing' || chr(10) || chr(10) ||
    'TUESDAY, 10 JUNE' || chr(10) ||
    ' 9:00 - 10:30  Meeting: New product presentation — Laura Chen, Purchasing Manager, Kemper Manufacturing' || chr(10) ||
    '11:00 - 12:00  Meeting: Contract review — David Okafor, Legal Department' || chr(10) ||
    ' 2:15 p.m.   Flight KA 321 returns to Easton City Airport' || chr(10) || chr(10) ||
    'Note: Keep all taxi receipts for your expense claim.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Hello, this is Mark Pearson. I''m afraid I left my itinerary at the office. What time does my flight leave on Monday morning, and where does it leave from?',
    '{"subtask":"respond_info","prep_seconds":45,"speak_seconds":15,"reference":"Flight KA 318 departs at 7:30 a.m. on Monday, 9 June, from Easton City Airport, Terminal 2."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'As I remember, I''ll be staying at the Lakeside Inn near the airport, the same as on my last trip. That''s right, isn''t it?',
    '{"subtask":"respond_info","prep_seconds":3,"speak_seconds":15,"reference":"No — this time he is staying at the Grandview Plaza Hotel at 200 Lake Street, downtown, NOT the Lakeside Inn near the airport."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
    'Could you give me all the details about my meetings on the second day of the trip?',
    '{"subtask":"respond_info","prep_seconds":3,"speak_seconds":30,"reference":"Two meetings on Tuesday, 10 June: a new product presentation with Laura Chen, Purchasing Manager at Kemper Manufacturing, from 9:00 to 10:30; and a contract review with David Okafor of the Legal Department, from 11:00 to 12:00."}'::jsonb,
    v_rub_s, 3) RETURNING id INTO v_q;

  -- ── Q11: Express an Opinion ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Question 11', 'Express an Opinion',
          'You will give your opinion about a topic. You have 45 seconds to prepare, then 60 seconds to speak. Say as much as you can in the time allowed.', 4)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Some companies prefer to hire workers who already have several years of experience. Others prefer to hire recent graduates and train them themselves. Which approach do you think is better for a company, and why? Give specific reasons or examples to support your opinion.',
    '{"subtask":"opinion","prep_seconds":45,"speak_seconds":60}'::jsonb, v_rub_s, 5) RETURNING id INTO v_q;

  -- ═══════════════════════════ WRITING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-sw-writing-mock-03', 'TOEIC S&W Mock 3 — Writing',
          'TOEIC S&W 模試3 ライティング', 'full_mock', 3600, false,
          'toeic-sw-mock-03', 'TOEIC S&W — Mock Test 3', 'TOEIC S&W 模試3', 1)
  RETURNING id INTO v_form;

  -- ── Q1-5: Write a Sentence Based on a Picture ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Questions 1-5', 'Write a Sentence Based on a Picture',
          'Write ONE sentence based on each picture, using the TWO words or phrases given. You may use them in any order and change their form. Recommended time: about 8 minutes for all five pictures.', 0)
  RETURNING id INTO v_sec;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "flowers" / "sell"',
    '{"task":"picture_sentence","words":["flowers","sell"],"reference":"A florist in an apron sells colorful flowers to a customer at an outdoor market stall."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 1, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "train" / "board"',
    '{"task":"picture_sentence","words":["train","board"],"reference":"Passengers board a train through its open doors at a station platform."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 2, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "laptop" / "while"',
    '{"task":"picture_sentence","words":["laptop","while"],"reference":"A woman eats a salad while working on a laptop at a café table."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 3, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "sign" / "point"',
    '{"task":"picture_sentence","words":["sign","point"],"reference":"A tour guide points at a large information sign while a group of tourists looks on."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 4, 'image') RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Write ONE sentence based on the picture using both words: "chairs" / "arrange"',
    '{"task":"picture_sentence","words":["chairs","arrange"],"reference":"A man arranges chairs around a long table in an empty meeting room."}'::jsonb, v_rub_w, 3) RETURNING id INTO v_q;

  -- ── Q6-7: Respond to a Written Request ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Questions 6-7', 'Respond to a Written Request',
          'Read each e-mail and write a reply. Recommended time: about 10 minutes per e-mail.', 1)
  RETURNING id INTO v_sec;

  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'From: Jamie Carter, Customer Service Team' || chr(10) ||
    'Subject: Could we swap shifts next week?' || chr(10) || chr(10) ||
    'Hello,' || chr(10) || chr(10) ||
    'I have a medical appointment next Thursday afternoon, but I am scheduled to work then. Would you be willing to take my Thursday afternoon shift? Of course, I would be happy to cover one of your shifts in return. Please let me know what would work for you.' || chr(10) || chr(10) ||
    'Thanks,' || chr(10) || 'Jamie Carter')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
    'Reply to the e-mail as Jamie''s co-worker. In your reply, give TWO pieces of information about your availability and ask ONE question.',
    '{"task":"email"}'::jsonb, v_rub_w, 4) RETURNING id INTO v_q;

  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
    'From: Elena Russo, Silverbrook Hotel' || chr(10) ||
    'Subject: Your banquet reservation' || chr(10) || chr(10) ||
    'Dear customer,' || chr(10) || chr(10) ||
    'Thank you for reserving our banquet room for your company dinner next month. To help us prepare, could you tell us more about what you will need for the event? For example, we can offer several menu options, different seating arrangements, and audio-visual equipment.' || chr(10) || chr(10) ||
    'Kind regards,' || chr(10) || 'Elena Russo')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
    'Reply to the e-mail as the customer. In your reply, describe TWO requirements for the banquet and ask ONE question.',
    '{"task":"email"}'::jsonb, v_rub_w, 4) RETURNING id INTO v_q;

  -- ── Q8: Opinion Essay ──
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Question 8', 'Write an Opinion Essay',
          'Write an essay of at least 300 words. State your opinion clearly and support it with reasons and examples. Recommended time: 30 minutes.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none') RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Some people prefer to work for a large company. Others prefer to work for a small company. Which would you prefer, and why? Use specific reasons and examples to support your opinion. Write at least 300 words.',
    '{"task":"opinion","min_words":300}'::jsonb, v_rub_w, 5) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded TOEIC S&W Mock 3 (speaking: 11 tasks raw 29, writing: 8 tasks raw 28) — UNPUBLISHED.';
END $$;
