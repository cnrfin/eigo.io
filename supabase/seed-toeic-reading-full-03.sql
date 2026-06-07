-- ============================================================
--  TOEIC L&R Mock 3 — READING (full-length, 100 questions)
-- ============================================================
--  Faithful 2018-format Reading section, 75 minutes, full_mock:
--    Part 5 — Incomplete Sentences        Q101–130 (30)
--    Part 6 — Text Completion             Q131–146 (4 texts × 4)
--    Part 7 — Reading Comprehension       Q147–200 (54)
--              · 10 single passages (29) · 2 double sets (10) · 3 triple sets (15)
--  All 4-choice (A–D). Original content, business/daily themes.
--  Part of set 'toeic-lr-mock-03' with the Listening form (seed script).
--  PUBLISHED = FALSE — draft for review before release.
--  Idempotent. Run AFTER add-practice-tests.sql + seed-test-scales-rubrics.sql
--  + add-test-sets.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid;
  v_form  uuid;
  v_sec   uuid;
  v_grp   uuid;
  v_q     uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'toeic-lr-reading-mock-03';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'toeic-lr';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track toeic-lr not found — run add-practice-tests.sql first.';
  END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-lr-reading-mock-03', 'TOEIC L&R Mock 3 — Reading',
          'TOEIC L&R 模試3 リーディング', 'full_mock', 4500, false,
          'toeic-lr-mock-03', 'TOEIC L&R — Mock Test 3', 'TOEIC L&R 模試3', 1)
  RETURNING id INTO v_form;

  -- ════════════════ Part 5: Incomplete Sentences (Q101–130) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 5', 'Incomplete Sentences',
          'Choose the word or phrase (A–D) that best completes each sentence.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'The marketing team responded ___ to the client''s request for revised artwork.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','prompt',false),(v_q,1,'B','promptly',true),(v_q,2,'C','prompted',false),(v_q,3,'D','promptness',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'The quarterly sales report must be submitted ___ Friday at the latest.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','at',false),(v_q,1,'B','in',false),(v_q,2,'C','until',false),(v_q,3,'D','by',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '___ the forecast predicted heavy rain, the outdoor concert went ahead as planned.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Although',true),(v_q,1,'B','Despite',false),(v_q,2,'C','However',false),(v_q,3,'D','Because',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'All visitors ___ to sign in at the security desk upon arrival.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','requires',false),(v_q,1,'B','requiring',false),(v_q,2,'C','are required',true),(v_q,3,'D','have required',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'The seminar on negotiation skills attracted a large ___ of participants from overseas.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','amount',false),(v_q,1,'B','number',true),(v_q,2,'C','deal',false),(v_q,3,'D','sum',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 5, 'single_choice', 'auto_choice', 'Customer ___ with our delivery service has improved since the new tracking system launched.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','satisfaction',true),(v_q,1,'B','satisfy',false),(v_q,2,'C','satisfied',false),(v_q,3,'D','satisfying',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 6, 'single_choice', 'auto_choice', 'The revised floor plan makes the showroom look considerably ___ than before.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','space',false),(v_q,1,'B','spacious',false),(v_q,2,'C','most spacious',false),(v_q,3,'D','more spacious',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 7, 'single_choice', 'auto_choice', 'Employees ___ complete the online safety course will receive a certificate by e-mail.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','whose',false),(v_q,1,'B','whom',false),(v_q,2,'C','who',true),(v_q,3,'D','which',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 8, 'single_choice', 'auto_choice', 'The city council voted to ___ the old swimming pool rather than demolish it.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','persuade',false),(v_q,1,'B','renovate',true),(v_q,2,'C','apologize',false),(v_q,3,'D','respond',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 9, 'single_choice', 'auto_choice', 'Before ___ the contract, please read the cancellation policy carefully.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','signing',true),(v_q,1,'B','sign',false),(v_q,2,'C','signed',false),(v_q,3,'D','signature',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 10, 'single_choice', 'auto_choice', 'Customers may choose ___ the standard and premium delivery options at checkout.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','among',false),(v_q,1,'B','during',false),(v_q,2,'C','between',true),(v_q,3,'D','within',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 11, 'single_choice', 'auto_choice', 'Thanks to its ___ location near two subway lines, the hotel is popular with business travellers.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','convenience',false),(v_q,1,'B','conveniently',false),(v_q,2,'C','conveniences',false),(v_q,3,'D','convenient',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 12, 'single_choice', 'auto_choice', '___ the software update is complete, restart your computer to apply the changes.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','While',false),(v_q,1,'B','Once',true),(v_q,2,'C','Until',false),(v_q,3,'D','Whether',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 13, 'single_choice', 'auto_choice', 'The list of approved vendors ___ updated every quarter by the purchasing department.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','is',true),(v_q,1,'B','are',false),(v_q,2,'C','have been',false),(v_q,3,'D','were',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 14, 'single_choice', 'auto_choice', 'Please direct any ___ about the merger to the communications office.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','decisions',false),(v_q,1,'B','arrivals',false),(v_q,2,'C','departures',false),(v_q,3,'D','inquiries',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 15, 'single_choice', 'auto_choice', 'The firm hired an outside consultant ___ its aging computer network.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','modernize',false),(v_q,1,'B','to modernize',true),(v_q,2,'C','modernized',false),(v_q,3,'D','modernizes',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 16, 'single_choice', 'auto_choice', 'The two branches operate ___ , each with its own budget and staff.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','repeatedly',false),(v_q,1,'B','gradually',false),(v_q,2,'C','independently',true),(v_q,3,'D','shortly',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 17, 'single_choice', 'auto_choice', '___ the merger is approved by regulators, the combined company will employ over 4,000 people.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','If',true),(v_q,1,'B','So',false),(v_q,2,'C','Or',false),(v_q,3,'D','Nor',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 18, 'single_choice', 'auto_choice', 'The head chef is known for her ___ use of locally grown herbs.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','create',false),(v_q,1,'B','creation',false),(v_q,2,'C','creatively',false),(v_q,3,'D','creative',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 19, 'single_choice', 'auto_choice', 'Anyone ___ in volunteering at the spring festival should contact Ms. Ito by Wednesday.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','interest',false),(v_q,1,'B','interesting',false),(v_q,2,'C','interested',true),(v_q,3,'D','interests',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 20, 'single_choice', 'auto_choice', 'Free wireless Internet is available ___ the terminal building.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','throughout',true),(v_q,1,'B','among',false),(v_q,2,'C','onto',false),(v_q,3,'D','besides',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 21, 'single_choice', 'auto_choice', 'The warranty period may be ___ for an additional year for a small fee.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','expired',false),(v_q,1,'B','extended',true),(v_q,2,'C','enlarged',false),(v_q,3,'D','estimated',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 22, 'single_choice', 'auto_choice', 'Since the new manager arrived, sales at the downtown branch ___ by nearly 15 percent.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','rose',false),(v_q,1,'B','rise',false),(v_q,2,'C','are rising',false),(v_q,3,'D','have risen',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 23, 'single_choice', 'auto_choice', 'Tickets for the awards dinner are ___ from the front desk for $40.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','visible',false),(v_q,1,'B','payable',false),(v_q,2,'C','available',true),(v_q,3,'D','capable',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 24, 'single_choice', 'auto_choice', 'Staff may store personal items in ___ assigned lockers during shifts.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','theirs',false),(v_q,1,'B','their',true),(v_q,2,'C','them',false),(v_q,3,'D','they',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 25, 'single_choice', 'auto_choice', 'The flight was overbooked; ___, several passengers volunteered to travel the next morning.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','fortunately',true),(v_q,1,'B','whereas',false),(v_q,2,'C','despite',false),(v_q,3,'D','so that',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 26, 'single_choice', 'auto_choice', 'The committee praised the ___ of the volunteers who organized the fundraiser.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','dedicate',false),(v_q,1,'B','dedicated',false),(v_q,2,'C','dedication',true),(v_q,3,'D','dedicates',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 27, 'single_choice', 'auto_choice', 'The new copier is not only faster ___ also more energy-efficient than the old model.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','and',false),(v_q,1,'B','then',false),(v_q,2,'C','as',false),(v_q,3,'D','but',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 28, 'single_choice', 'auto_choice', 'Please ___ the attached form and return it to human resources by 15 May.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','complete',true),(v_q,1,'B','agree',false),(v_q,2,'C','respond',false),(v_q,3,'D','comply',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 29, 'single_choice', 'auto_choice', '___ wishing to participate in the wellness program should register by the end of the month.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Whoever',false),(v_q,1,'B','Those',true),(v_q,2,'C','Whose',false),(v_q,3,'D','Them',false);

  -- ════════════════ Part 6: Text Completion (Q131–146) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 6', 'Text Completion',
          'Read the text and choose the best word, phrase or sentence (A–D) for each numbered blank.', 1)
  RETURNING id INTO v_sec;

  -- Text 1: notice (Q131–134)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'NOTICE TO ALL RESIDENTS — RIVERTON COURT APARTMENTS

The building''s main elevator will be out of service for scheduled maintenance from Monday 9 June to Wednesday 11 June. During this period, residents are asked to use the service elevator at the ---(131)--- end of the corridor or the stairs.

The work involves replacing the elevator''s thirty-year-old motor, which has become increasingly ---(132)---. Once the new motor is installed, rides will be smoother and waiting times shorter.

We recognise that the closure will be inconvenient, particularly for residents on the upper floors. ---(133)---. Please contact the building office at least one day ahead to arrange a time.

Thank you for your ---(134)--- while this essential work is carried out.

Riverton Court Management')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(131)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','urgent',false),(v_q,1,'B','brief',false),(v_q,2,'C','opposite',true),(v_q,3,'D','mutual',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(132)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','unreliable',true),(v_q,1,'B','unreliably',false),(v_q,2,'C','unreliability',false),(v_q,3,'D','relying',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(133) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The elevator was replaced last month and is working perfectly.',false),
    (v_q,1,'B','Residents are not permitted to use the stairs at any time.',false),
    (v_q,2,'C','The building will be demolished at the end of the year.',false),
    (v_q,3,'D','Staff will be happy to help carry shopping or other heavy items upstairs.',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(134)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','patient',false),(v_q,1,'B','patience',true),(v_q,2,'C','patiently',false),(v_q,3,'D','patients',false);

  -- Text 2: e-mail (Q135–138)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
'To: Lukas Meyer <l.meyer@birchmail.com>
From: welcome@atlasshieldinsurance.com
Subject: Welcome to AtlasShield — your policy documents

Dear Mr. Meyer,

Thank you for choosing AtlasShield Travel Insurance. Your annual multi-trip policy is now ---(135)--- and covers all journeys beginning on or after 1 July.

Your policy documents are attached. Please check that your personal details are correct and tell us about any errors ---(136)--- seven days.

When you travel, carry your policy number and our 24-hour assistance line with you. ---(137)---. Claims can be started online at atlasshield.com/claims, where most are settled within ten business days.

We wish you safe and enjoyable ---(138)---.

The AtlasShield Team')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(135)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','active',true),(v_q,1,'B','activate',false),(v_q,2,'C','activation',false),(v_q,3,'D','actively',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(136)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','by',false),(v_q,1,'B','at',false),(v_q,2,'C','within',true),(v_q,3,'D','since',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(137) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Your policy does not include any form of assistance.',false),
    (v_q,1,'B','Both can be found on the wallet card included with your documents.',true),
    (v_q,2,'C','Claims must be submitted by post within one day.',false),
    (v_q,3,'D','We no longer insure travellers under any circumstances.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(138)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','meetings',false),(v_q,1,'B','purchases',false),(v_q,2,'C','savings',false),(v_q,3,'D','journeys',true);

  -- Text 3: flyer (Q139–142)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 2, 'passage',
'CRUMB & CRUST BAKERY — Introducing the Warm Welcome Card

Love our sourdough? Now your loyalty earns you more than a friendly smile. Pick up a free Warm Welcome Card at the counter and receive one stamp for ---(139)--- purchase over $5.

Collect eight stamps and your next loaf, pastry or coffee is on us. Cards never expire, ---(140)--- you can collect stamps at your own pace.

Members also receive our monthly newsletter with seasonal recipes and baking tips. ---(141)---. Simply write your e-mail address on the sign-up sheet beside the till.

The Warm Welcome Card is available at both our High Street and Mill Lane ---(142)---.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(139)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','few',false),(v_q,1,'B','all',false),(v_q,2,'C','much',false),(v_q,3,'D','every',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(140)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','or',false),(v_q,1,'B','so',true),(v_q,2,'C','nor',false),(v_q,3,'D','yet',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(141) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Subscribing takes less than a minute.',true),
    (v_q,1,'B','The newsletter was discontinued several years ago.',false),
    (v_q,2,'C','Stamps cannot be earned on any purchase.',false),
    (v_q,3,'D','Our bakery uses only frozen dough from overseas.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(142)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','locates',false),(v_q,1,'B','locating',false),(v_q,2,'C','locations',true),(v_q,3,'D','locate',false);

  -- Text 4: memo (Q143–146)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 3, 'passage',
'MEMO
To: All employees, Harrick & Lowe
From: Dana Whitfield, IT Security Manager
Re: Phishing e-mails — a reminder

Several staff members reported suspicious e-mails last week that appeared to come from our payroll provider. The messages asked recipients to confirm their bank details by ---(143)--- a link.

Please remember that genuine payroll messages will never request passwords or account numbers. If you receive such a message, do not reply or click anything; ---(144)---, forward it to security@harricklowe.com and then delete it.

---(145)---. The session takes twenty minutes and can be completed at your desk.

Thank you for staying ---(146)---. Your caution protects the whole firm.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(143)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','click',false),(v_q,1,'B','clicking',true),(v_q,2,'C','clicked',false),(v_q,3,'D','clicks',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(144)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','likewise',false),(v_q,1,'B','meanwhile',false),(v_q,2,'C','therefore',false),(v_q,3,'D','instead',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(145) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The payroll provider has gone out of business.',false),
    (v_q,1,'B','Staff should share their passwords with colleagues for safekeeping.',false),
    (v_q,2,'C','A short online refresher course on identifying phishing is now available on the intranet.',true),
    (v_q,3,'D','Our offices will close early every Friday this summer.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(146)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','alert',true),(v_q,1,'B','alertly',false),(v_q,2,'C','alertness',false),(v_q,3,'D','alerts',false);

  -- ════════════════ Part 7: Reading Comprehension (Q147–200) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 7', 'Reading Comprehension',
          'Read the texts and choose the best answer (A–D) to each question.', 2)
  RETURNING id INTO v_sec;

  -- ── Single passage 1: text-message chain (Q147–148) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'Skylane Air (08:05): Skylane Air baggage update: bag tag SK482217 from flight SK309 was not loaded in Lisbon. It will arrive on flight SK315 at 14:40 and be delivered to your hotel this evening. Reply HELP to chat with an agent.
Joana Pires (08:09): HELP
Agent Theo (08:11): Good morning, this is Theo. I can see your bag arrives at 14:40. Delivery to the Hotel Miramar is scheduled between 18:00 and 21:00. How can I help?
Joana Pires (08:13): I have a conference dinner at 19:00 and my suit is in that bag. Could I collect it at the airport instead?
Agent Theo (08:15): Of course. I''ll have it held at the Skylane service desk in arrivals from 15:15. Please bring your passport and this reference: SK-77103.
Joana Pires (08:16): That works. Thank you!')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is suggested about Ms. Pires''s bag?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It has been lost permanently',false),(v_q,1,'B','It was damaged in Lisbon',false),
    (v_q,2,'C','It will arrive on a later flight',true),(v_q,3,'D','It was delivered to the wrong hotel',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'At 08:16, what does Ms. Pires mean when she writes, "That works"?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','She agrees to pick up the bag at the airport',true),(v_q,1,'B','The hotel delivery time suits her schedule',false),
    (v_q,2,'C','Her suit no longer needs to be cleaned',false),(v_q,3,'D','The conference dinner has been postponed',false);

  -- ── Single passage 2: notice (Q149–150) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
'PLAYHOUSE ON THE GREEN — TICKET EXCHANGE POLICY

Plans change — and your tickets can too. Tickets for any performance may be exchanged for another date of the same production up to 24 hours before the show: free of charge for season subscribers, and for a $4 fee per ticket for all other customers.

Exchanges can be made online under "My Bookings", by phone, or in person at the box office. Tickets cannot be exchanged on the day of the performance; however, unused tickets may be donated to our community seats programme in return for a tax receipt.

If a performance is cancelled by the theatre, all ticket holders will be offered a choice of a full refund or seats at a future performance. Please allow up to five business days for refunds to appear.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Who can exchange tickets without paying a fee?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','All ticket holders',false),(v_q,1,'B','Season subscribers',true),
    (v_q,2,'C','First-time visitors',false),(v_q,3,'D','Group organizers',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What can customers do with a ticket on the day of a performance?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Exchange it at the box office',false),(v_q,1,'B','Receive an automatic refund',false),
    (v_q,2,'C','Transfer it to another production',false),(v_q,3,'D','Donate it in return for a tax receipt',true);

  -- ── Single passage 3: webpage (Q151–153) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 2, 'passage',
'www.anchorworks.com/faq

ANCHORWORKS CO-WORKING — FREQUENTLY ASKED QUESTIONS

Q: What is included in the monthly membership?
A: All memberships include high-speed Internet, printing of up to 100 pages per month, unlimited coffee, and access to the rooftop lounge. Flex members use any open desk in the shared area; Resident members have their own reserved desk with a lockable cabinet.

Q: Can I book meeting rooms?
A: Yes. Flex members receive four hours of meeting-room credit per month and Resident members receive ten; additional hours are $15 each. Rooms can be booked through the member app up to 30 days ahead.

Q: Is the building open at night?
A: Resident members have 24-hour keycard access. Flex members may use the space from 7 a.m. to 8 p.m. on weekdays and 9 a.m. to 5 p.m. on Saturdays.

Q: Can I bring a guest?
A: Guests are welcome free of charge for up to two hours per visit; they must sign in at reception and remain with their host. For longer visits, day passes are available for $20.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is included in all AnchorWorks memberships?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Use of a rooftop lounge',true),(v_q,1,'B','A reserved desk',false),
    (v_q,2,'C','24-hour keycard access',false),(v_q,3,'D','Free day passes for guests',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'How do Resident memberships differ from Flex memberships?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They exclude printing services',false),(v_q,1,'B','They are limited to weekends',false),
    (v_q,2,'C','They include more meeting-room hours',true),(v_q,3,'D','They do not allow guests',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is indicated about guests?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They must buy a day pass on arrival',false),(v_q,1,'B','They may stay for two hours at no charge',true),
    (v_q,2,'C','They may use the space unaccompanied',false),(v_q,3,'D','They receive free meeting-room credit',false);

  -- ── Single passage 4: online review (Q154–156) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 3, 'passage',
'gadgetlens.com/reviews — SONAFOLD X2 WIRELESS HEADPHONES — ★★★★☆

By Marcus Webb, 14 March

The Sonafold X2 arrives two years after the popular X1, and the upgrade is mostly about comfort. The redesigned earcups are wrapped in a softer foam, and at 198 grams the X2 is light enough to forget you''re wearing it on a long flight — exactly where its excellent noise cancellation belongs.

Battery life is officially 30 hours; in my testing with noise cancellation switched on, I measured just over 27 — still enough for a week of commuting. A ten-minute charge provides about four hours of playback.

My one real complaint is the carrying case, which has grown so bulky that it barely fits in a jacket pocket — an odd choice for headphones marketed to travellers. The X2 also no longer includes a wired audio cable in the box; it must be purchased separately.

At $249, the X2 costs $50 more than the X1 did at launch. If you already own the X1, keep it. For everyone else, this is the most comfortable option in its price range.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What does the reviewer like most about the X2?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Its carrying case',false),(v_q,1,'B','Its low price',false),
    (v_q,2,'C','Its included accessories',false),(v_q,3,'D','Its comfortable design',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What does the reviewer criticize?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The weight of the headphones',false),(v_q,1,'B','The size of the carrying case',true),
    (v_q,2,'C','The quality of the noise cancellation',false),(v_q,3,'D','The speed of charging',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is suggested about owners of the X1?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They do not need to upgrade',true),(v_q,1,'B','They can trade in for a discount',false),
    (v_q,2,'C','They will receive a free cable',false),(v_q,3,'D','They paid more at launch',false);

  -- ── Single passage 5: memo (Q157–159) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 4, 'passage',
'MEMO
To: All staff, Delmore Manufacturing
From: Victor Anand, Site Services Manager
Date: 3 June
Re: New visitor procedure — effective 16 June

From Monday 16 June, all visitors to the Delmore site must be pre-registered. Hosts should enter the visitor''s name, company and arrival time in the new VisitorHub system at least one business day before the visit. Same-day registration is possible only with the approval of the duty manager.

On arrival, visitors will print their own badge at the lobby kiosk by entering the reference code sent to them by e-mail. Badges must be worn visibly at all times, and visitors must be accompanied by their host beyond the lobby. Hosts are responsible for returning badges to reception when their guests leave.

Delivery drivers are not affected by the change and should continue to report to the warehouse gate as usual.

A short demonstration of VisitorHub will be held in the cafeteria on Thursday 12 June at 10 a.m. Questions may be sent to siteservices@delmore.com.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the purpose of the memo?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To announce a building closure',false),(v_q,1,'B','To introduce a new site manager',false),
    (v_q,2,'C','To explain a new procedure for visitors',true),(v_q,3,'D','To schedule warehouse deliveries',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What must hosts do before a visit?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Collect badges from the warehouse',false),(v_q,1,'B','Notify the duty manager of all visits',false),
    (v_q,2,'C','E-mail a reference code to reception',false),(v_q,3,'D','Enter visitor details in a system at least a day ahead',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'Who is NOT affected by the new procedure?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Lobby receptionists',false),(v_q,1,'B','Delivery drivers',true),
    (v_q,2,'C','Visiting clients',false),(v_q,3,'D','Staff hosting guests',false);

  -- ── Single passage 6: article (Q160–162) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 5, 'passage',
'THE MILLBROOK HERALD — Food-truck festival returns, twice the size

MILLBROOK — Rolling Feast, the food-truck festival that drew unexpected crowds to Carmody Park last September, will return on the weekend of 21–22 August — this time with forty trucks, double last year''s number.

Organiser Dee Calloway said last year''s event was a victim of its own success. "Lines were forty-five minutes at the popular trucks, and three of them sold out before sunset," she said. "We heard people loud and clear." Besides more trucks, this year''s festival adds a second entrance on Beechwood Road, extended hours until 10 p.m., and a free park-and-ride bus from the railway station car park.

Twenty-eight trucks have been confirmed so far, ranging from wood-fired pizza to Filipino barbecue. Vendor applications remain open until 30 June at rollingfeast.com, where weekend passes are also on sale for $5 — children under twelve enter free. Local breweries will run a covered beer garden near the bandstand, and live music is scheduled for both evenings.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is indicated about last year''s festival?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It attracted more visitors than expected',true),(v_q,1,'B','It was cancelled because of rain',false),
    (v_q,2,'C','It lost money for the organisers',false),(v_q,3,'D','It was held in August',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What change is mentioned for this year''s event?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The festival will move to a new park',false),(v_q,1,'B','A shuttle bus will run from the station',true),
    (v_q,2,'C','Tickets will no longer be required',false),(v_q,3,'D','The event will last three days',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is suggested about food-truck vendors?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They must be local businesses',false),(v_q,1,'B','They all sell pizza',false),
    (v_q,2,'C','They pay no participation fee',false),(v_q,3,'D','They may still apply until 30 June',true);

  -- ── Single passage 7: online chat (Q163–165) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 6, 'passage',
'TEAM CHAT — #office-move
Renee Okada (09:31): Morning all. Reminder: the movers arrive Friday at 6 p.m. sharp. Everything you want moved must be in a labelled crate by 5.
Stefan Brandt (09:33): The label printer on floor 3 is out of toner. Can we handwrite labels?
Renee Okada (09:34): Only if you also write your new desk number from the seating chart. Unlabelled crates go to a holding room at Westbrook, and digging things out of there could take days.
Aisha Mensah (09:36): What about the plants? There are about a dozen on our floor.
Renee Okada (09:37): The movers won''t take anything living. Take them home for the weekend or find them new owners.
Stefan Brandt (09:38): I''ll put a sign-up sheet in the kitchen. Give it ten minutes and they''ll all be adopted.
Aisha Mensah (09:39): Monitors and docking stations stay, right? IT said new ones are already at Westbrook.
Renee Okada (09:40): Correct — leave all IT equipment on the desks. Personal items and paper files only.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What are employees asked to do by 5 p.m. on Friday?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Return their monitors to IT',false),(v_q,1,'B','Print new seating charts',false),
    (v_q,2,'C','Pack their belongings in labelled crates',true),(v_q,3,'D','Sign up for a moving shift',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What does Ms. Okada say about unlabelled crates?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They will be placed in a holding room',true),(v_q,1,'B','They will be thrown away',false),
    (v_q,2,'C','They will be returned on Monday',false),(v_q,3,'D','They will be opened by IT staff',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What will Mr. Brandt most likely do next?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Order toner for the printer',false),(v_q,1,'B','Carry monitors to Westbrook',false),
    (v_q,2,'C','Water the office plants',false),(v_q,3,'D','Put up a sign-up sheet in the kitchen',true);

  -- ── Single passage 8: letter (Q166–168) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 7, 'passage',
'Brockton Community College
Department of Business Studies

Dear Ms. Reinhart,

Each spring, our department invites a local business leader to deliver the keynote address at our Entrepreneurship Week, which this year runs from 14 to 18 April. On behalf of the faculty, I would be delighted if you would be this year''s speaker.

Many of our students cite Reinhart Organic Skincare as exactly the kind of business they hope to build: you founded the company from a market stall, and it now employs sixty people and ships to nine countries. A 40-minute talk on that journey, followed by 20 minutes of questions, would be ideal. The address takes place on Tuesday 15 April at 6 p.m. in the Halloran Auditorium, before an audience of roughly 300 students, staff and invited guests.

We offer our keynote speakers an honorarium of $500, which several past speakers have chosen to donate to our student start-up fund. We would also be glad to arrange a tour of our new innovation lab before the event.

Could you let me know by 28 February whether you are able to join us? I would be happy to discuss any aspect of the evening at 555-0173.

Yours sincerely,
Dr. Samuel Ode
Chair, Department of Business Studies')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Why did Dr. Ode write to Ms. Reinhart?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To offer her a teaching position',false),(v_q,1,'B','To invite her to give a speech',true),
    (v_q,2,'C','To request a donation to a fund',false),(v_q,3,'D','To order skincare products',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is indicated about Reinhart Organic Skincare?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It employs 300 people',false),(v_q,1,'B','It is moving to new premises',false),
    (v_q,2,'C','It began as a market stall',true),(v_q,3,'D','It sponsors Entrepreneurship Week',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is Ms. Reinhart asked to do by 28 February?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Confirm whether she can attend',true),(v_q,1,'B','Donate her honorarium',false),
    (v_q,2,'C','Visit the innovation lab',false),(v_q,3,'D','Prepare a list of questions',false);

  -- ── Single passage 9: webpage (Q169–171) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 8, 'passage',
'www.spokecity.com/how-it-works

SPOKECITY BIKE SHARE — HOW IT WORKS

1. JOIN. Download the SpokeCity app and choose a plan: Pay-As-You-Go ($1 to unlock plus 15 cents per minute) or the Monthly Pass ($24 for unlimited 45-minute rides).
2. RIDE. Scan the code on any bike to unlock it. Lights switch on automatically, and a phone holder and basket are fitted as standard.
3. RETURN. End every ride at a marked docking station. Rides ending elsewhere incur a $10 retrieval fee, charged to your account.

Good to know:
• Monthly Pass rides longer than 45 minutes cost 15 cents per additional minute.
• Report a faulty bike by tapping the wrench icon in the app — you will not be charged for that ride, and the bike is locked to other users until it is repaired.
• Helmets are recommended and are sold at cost price in our Riverside Walk office.
• Riders must be 16 or older.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What happens if a ride ends away from a docking station?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The bike locks immediately',false),(v_q,1,'B','The rider''s membership is cancelled',false),
    (v_q,2,'C','The rider receives a warning in the app',false),(v_q,3,'D','A $10 fee is charged',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is indicated about faulty bikes?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Riders who report them are not charged for the ride',true),(v_q,1,'B','They are removed within an hour',false),
    (v_q,2,'C','They must be returned to Riverside Walk',false),(v_q,3,'D','They can still be unlocked by other users',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is included with every bike?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A helmet',false),(v_q,1,'B','A repair kit',false),
    (v_q,2,'C','A basket and phone holder',true),(v_q,3,'D','A child seat',false);

  -- ── Single passage 10: article (Q172–175) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 9, 'passage',
'BUSINESS HORIZONS WEEKLY — Four days on the clock, five days of output

When Calder & Finch, a 70-person accounting firm in Glenport, announced it would close every Friday for six months without cutting pay, managing partner Ruth Calder admits she expected chaos. — [1] —

Instead, the firm has just made the four-day week permanent. Over the pilot, client work was completed on average a day faster than in the previous year, and staff turnover fell to zero — in an industry where one resignation a month is typical for a firm its size. — [2] —

The change required discipline. Internal meetings were capped at twenty minutes, with agendas circulated in advance. Routine status updates moved to a shared dashboard. — [3] — Employees also agreed to stagger their holiday bookings more evenly across the year, so that client coverage never dipped.

Not every business can copy the model, Ms. Calder concedes; her firm''s clients rarely need same-day responses on a Friday. But she encourages sceptics to run the numbers. "We measured everything for six months," she said. "The only thing we lost was the Friday commute." — [4] —')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the article mainly about?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A merger of two accounting firms',false),(v_q,1,'B','A firm''s trial of a shorter workweek',true),
    (v_q,2,'C','Rising commuting costs',false),(v_q,3,'D','New meeting software',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is indicated about the results of the pilot?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Client work slowed slightly',false),(v_q,1,'B','Pay was reduced by one day',false),
    (v_q,2,'C','Several clients left the firm',false),(v_q,3,'D','No employees resigned during it',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'According to the article, how did the firm change its meetings?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It limited them to twenty minutes',true),(v_q,1,'B','It moved them all to Fridays',false),
    (v_q,2,'C','It made attendance optional',false),(v_q,3,'D','It hired an outside facilitator',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'In which of the positions marked [1], [2], [3] and [4] does the following sentence best belong? "Anything that did not genuinely need a discussion stopped being a meeting," Ms. Calder explained.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','[1]',false),(v_q,1,'B','[2]',false),(v_q,2,'C','[3]',true),(v_q,3,'D','[4]',false);

  -- ── Double passages 1: booth reservation form + organizer e-mail (Q176–180) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 10, 'passage',
'TEXT 1 — BOOTH RESERVATION FORM

NORTHERN HOMEWARES EXPO — 12–14 October, Castlebridge Exhibition Hall
Exhibitor: Fernhill Ceramics Ltd. — Contact: Iris Fennimore (i.fennimore@fernhillceramics.com)
Booth type (please tick ONE):
[ ] STANDARD (3 m × 3 m) — $820: table, two chairs, sign
[X] CORNER (3 m × 4 m, two open sides) — $1,150: table, two chairs, sign, spotlight track
[ ] ISLAND (6 m × 6 m, four open sides) — $2,900: custom layout, meeting nook
Extras: [X] electrical outlet ($60) · [ ] carpet ($90) · [X] two additional exhibitor passes ($50)
Special requests: We will demonstrate pottery throwing at the booth and would prefer a location near a water connection.
Payment: 50% deposit due with this form; balance due 12 September.

TEXT 2 — E-MAIL

To: Iris Fennimore <i.fennimore@fernhillceramics.com>
From: Booth Allocations <booths@northernhomewares.com>
Subject: Fernhill Ceramics — booth confirmation
Date: 28 July

Dear Ms. Fennimore,

Thank you for your reservation and deposit. We are pleased to confirm corner booth C-22 for Fernhill Ceramics.

Regarding your special request: the only corner locations near a water connection were already taken. However, booth C-22 is directly opposite the hall''s demonstration stage, which has a sink and water supply that exhibitors may book in 30-minute slots at no charge. Most exhibitors find this works well for live demonstrations — the stage also has tiered seating for forty people.

One correction to your form: additional exhibitor passes are now $30 each, not $50 for two as printed on the older form you used, so your balance will be slightly different from the printed total. An updated invoice is attached; the remaining balance is due by 12 September.

Finally, please note that all demonstration equipment must be approved by our safety team. Kindly send a short description of your pottery wheel to safety@northernhomewares.com by 1 September.

Best regards,
Casper Holt
Exhibitor Services, Northern Homewares Expo')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What type of booth did Fernhill Ceramics request?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A corner booth',true),(v_q,1,'B','A standard booth',false),
    (v_q,2,'C','An island booth',false),(v_q,3,'D','A shared booth',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Why does Ms. Fennimore want to be near a water connection?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To clean the booth carpet daily',false),(v_q,1,'B','To serve drinks to visitors',false),
    (v_q,2,'C','Her company plans live pottery demonstrations',true),(v_q,3,'D','To operate a coffee machine',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What does Mr. Holt indicate about the demonstration stage?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It costs $30 per slot',false),(v_q,1,'B','It is next to a water connection at booth C-22',false),
    (v_q,2,'C','It seats fourteen people',false),(v_q,3,'D','Its facilities can be reserved free of charge',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Why will Fernhill''s balance differ from the form''s printed total?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A deposit was overpaid',false),(v_q,1,'B','The price of extra passes has changed',true),
    (v_q,2,'C','The electrical outlet is now free',false),(v_q,3,'D','A loyalty discount was applied',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What must Ms. Fennimore do by 1 September?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Send details of her equipment to the safety team',true),(v_q,1,'B','Pay the remaining balance',false),
    (v_q,2,'C','Book the demonstration stage',false),(v_q,3,'D','Collect her exhibitor passes',false);

  -- ── Double passages 2: renewal notice + customer-support chat (Q181–185) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 11, 'passage',
'TEXT 1 — RENEWAL NOTICE

KITCHEN GARDENER MAGAZINE — Time to renew!

Account: KG-30557 — Ms. Paula Strand
Your 12-issue subscription ends with the September issue.

Renew by 15 August and lock in our best rate:
• 12 issues (print + digital) — $48 (regular price $62)
• 12 issues (digital only) — $30
As a renewal gift, print subscribers receive our 64-page Winter Growing Guide with the October issue.

Renew online at kitchengardener.com/renew, or call 555-0190 (Mon–Fri, 9–5).
If you do nothing, your subscription will simply end — we never bill without your say-so.

TEXT 2 — CUSTOMER SUPPORT CHAT (9 September)

Agent Milo: Kitchen Gardener support, this is Milo. How can I help?
Paula Strand: Hi. I renewed my print-and-digital subscription on the website on 12 August, but I''ve just noticed I was billed $62 instead of the advertised $48.
Agent Milo: Let me look... I see it. Our system applied the regular rate in error — renewals made through the website on 11 and 12 August were affected by a pricing fault. I''m very sorry.
Paula Strand: So how do we fix it?
Agent Milo: I''ve refunded the $14 difference just now; it should reach your card within five business days. For the inconvenience, I''d also like to extend your subscription by two free issues. And your Winter Growing Guide will still ship with the October issue as promised.
Paula Strand: That all sounds fair. One more thing — my September issue hasn''t arrived, and it''s already the 9th.
Agent Milo: September issues were posted a week late because of a printer changeover; yours should arrive within the next few days. If it hasn''t arrived by the 16th, contact us again and we''ll send a replacement copy.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'By when should subscribers renew to receive the lower price?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','9 September',false),(v_q,1,'B','12 August',false),
    (v_q,2,'C','15 August',true),(v_q,3,'D','1 October',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is suggested about Ms. Strand''s renewal?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It was made by telephone',false),(v_q,1,'B','It qualified for the discounted rate',true),
    (v_q,2,'C','It was for the digital-only option',false),(v_q,3,'D','It was submitted after the deadline',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What caused the incorrect charge?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A fault in the website''s pricing system',true),(v_q,1,'B','A change in subscription rates',false),
    (v_q,2,'C','An expired credit card',false),(v_q,3,'D','A duplicate order',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'What does Milo offer in addition to the refund?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A free digital upgrade',false),(v_q,1,'B','A replacement growing guide',false),
    (v_q,2,'C','A $14 gift voucher',false),(v_q,3,'D','Two extra issues at no charge',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What should Ms. Strand do if her September issue has not arrived by 16 September?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Visit the printing company',false),(v_q,1,'B','Renew her subscription again',false),
    (v_q,2,'C','Contact support for a replacement copy',true),(v_q,3,'D','Download the digital edition instead',false);

  -- ── Triple passages 1: catalogue page + purchase order + e-mail (Q186–190) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 12, 'passage',
'TEXT 1 — CATALOGUE PAGE

GRAYMONT OFFICE FURNITURE — Spring catalogue, p. 41: Seating

• TARN task chair — mesh back, adjustable arms. Black, grey or red. $149
• LUND task chair — fabric, lumbar support, headrest. Black or navy. $219
• OTTERSEA visitor chair — stackable, beech frame. Green or charcoal. $89
• HALDEN drafting stool — for standing desks and counters. Black only. $129

Delivery: free on orders over $1,000; otherwise $45 flat rate. Items in stock ship within five business days. Note: navy LUND chairs are made to order — please allow three weeks.
Volume discount: 5% on any order of ten or more chairs (applied automatically).

TEXT 2 — PURCHASE ORDER

PURCHASE ORDER #PO-7741 — Date: 2 April
From: Bistreau & Co. Accountants, 18 Vine Lane
Supplier: Graymont Office Furniture
• LUND task chair, navy ×8 .......... $1,752.00
• OTTERSEA visitor chair, green ×4 .......... $356.00
Subtotal: $2,108.00 · Volume discount (5%): −$105.40 · Delivery: free
TOTAL: $2,002.60
Requested delivery date: on or before 25 April (office reopening)

TEXT 3 — E-MAIL

To: orders@graymontfurniture.com
From: Hélène Bistreau <h.bistreau@bistreau.com>
Subject: PO-7741 — delivery received today, two problems
Date: 24 April

Dear Graymont team,

Our order arrived this morning — a day ahead of the date we requested, which we appreciated. Unfortunately, there are two problems.

First, only six navy LUND chairs were delivered; the packing list shows eight, so two are missing rather than delayed. Second, the four visitor chairs you sent are charcoal, not the green we ordered. Green was chosen specifically to match our newly decorated reception area, so we would like the correct colour rather than a refund.

Our office reopens to clients on Monday, so we can manage temporarily, but please confirm by Friday when the two missing task chairs and the four replacement visitor chairs will arrive. We are happy for the courier to collect the charcoal chairs at the same time.

Kind regards,
Hélène Bistreau')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is indicated in the catalogue about navy LUND chairs?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They cost less than the black version',false),(v_q,1,'B','They take longer to deliver',true),
    (v_q,2,'C','They are stackable',false),(v_q,3,'D','They are no longer in production',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Why did Bistreau & Co. receive free delivery?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It is a long-standing customer',false),(v_q,1,'B','It ordered before 25 April',false),
    (v_q,2,'C','It collected part of the order itself',false),(v_q,3,'D','Its order total exceeded $1,000',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is suggested about the order on PO-7741?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It was large enough to earn a discount',true),(v_q,1,'B','It was placed by telephone',false),
    (v_q,2,'C','It included a drafting stool',false),(v_q,3,'D','It was paid for in advance',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'What does Ms. Bistreau say about the delivery?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It was a week late',false),(v_q,1,'B','It was left at the wrong address',false),
    (v_q,2,'C','It arrived earlier than requested',true),(v_q,3,'D','It was damaged in transit',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'Why does Ms. Bistreau prefer replacement chairs to a refund?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The chairs were a limited edition',false),(v_q,1,'B','The colour was chosen to match the reception area',true),
    (v_q,2,'C','A refund would take five business days',false),(v_q,3,'D','The charcoal chairs arrived damaged',false);

  -- ── Triple passages 2: tourism webpage + boat-tour schedule + e-mail (Q191–195) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 13, 'passage',
'TEXT 1 — WEBPAGE

visitkestrelbay.com — WELCOME TO KESTREL BAY

Perched between sandstone cliffs and a sheltered harbour, Kestrel Bay offers galleries, seafood restaurants and the region''s finest coastal walks. Don''t miss the Harbour Heritage Museum (free on Sundays) or the lighthouse viewing platform.

The most popular way to see the coastline is from the water. Kestrel Bay Cruises operates daily boat tours from the West Quay from April to October; see their timetable for details. Tickets are sold at the quay kiosk, but advance booking is strongly recommended in July and August. Groups of ten or more should contact the operator directly for group rates and private charters.

Getting here: trains from Aldermouth run hourly; the harbour is a five-minute walk from the station.

TEXT 2 — BOAT TOUR SCHEDULE

KESTREL BAY CRUISES — Daily sailings, April–October (from West Quay)
• 10:00 — HARBOUR HIGHLIGHTS (50 min) — adults $18, children $9
• 12:30 — SEAL COLONY CRUISE (90 min) — adults $28, children $14
• 15:00 — CLIFFS & CAVES (2 h; not suitable for children under 8) — adults $34
• 18:30 — SUNSET CRUISE (90 min; July and August only) — adults $30, includes a drink
All sailings depend on the weather; full refunds are given for cancelled departures. Boats have indoor seating and are wheelchair accessible except CLIFFS & CAVES.

TEXT 3 — E-MAIL

To: bookings@kestrelbaycruises.com
From: Gordon Ashby <g.ashby@silvertrailtours.com>
Subject: Group booking — Tuesday 12 August
Date: 22 July

Hello,

I am organising a coach tour for a seniors'' social club, and we will be in Kestrel Bay on Tuesday 12 August. There will be 23 passengers, so I understand from the town''s tourism website that I should contact you directly for a group rate.

We would like the 90-minute afternoon cruise that visits the seal colony. Two of our members use wheelchairs — I gather from your timetable that this should not be a problem. Could you confirm the group price, and whether we could board ten minutes early to allow everyone extra time?

Lunch is booked at the Quayside Oyster House at 11:00, which should leave us comfortable time to reach the quay afterwards.

Many thanks,
Gordon Ashby, Silvertrail Tours')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'According to the webpage, what should large groups do?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Buy tickets at the quay kiosk',false),(v_q,1,'B','Visit only in July or August',false),
    (v_q,2,'C','Book the museum first',false),(v_q,3,'D','Contact the cruise operator directly',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is indicated about the SUNSET CRUISE?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It is offered during only two months of the year',true),(v_q,1,'B','It is the cheapest cruise',false),
    (v_q,2,'C','It is unsuitable for young children',false),(v_q,3,'D','It departs from the railway station',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'Which cruise does Mr. Ashby want to book?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Harbour Highlights',false),(v_q,1,'B','Cliffs & Caves',false),
    (v_q,2,'C','Seal Colony Cruise',true),(v_q,3,'D','Sunset Cruise',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'What is suggested about the cruise Mr. Ashby has chosen?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It includes a free drink',false),(v_q,1,'B','It is accessible to wheelchair users',true),
    (v_q,2,'C','It lasts two hours',false),(v_q,3,'D','It requires a private charter',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'Why did Mr. Ashby write to Kestrel Bay Cruises instead of buying tickets at the kiosk?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The kiosk is closed in August',false),(v_q,1,'B','His club members cannot walk to the quay',false),
    (v_q,2,'C','He wants to pay by invoice',false),(v_q,3,'D','His group exceeds the size mentioned on the website',true);

  -- ── Triple passages 3: language-school ad + test results + e-mail (Q196–200) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 14, 'passage',
'TEXT 1 — ADVERTISEMENT

LINGUA PORT LANGUAGE SCHOOL — Evening Spanish & French, term begins 6 October

Small classes (maximum ten students), native-speaker teachers, and city-centre studios two minutes from the Grand Parade tram stop.

Levels: Beginner (A1) · Elementary (A2) · Intermediate (B1) · Upper-Intermediate (B2)
• One evening per week, 7–9 p.m., for ten weeks — $260, course book included
• Enrol in two courses in the same term and pay $460 in total

New students at Elementary level or above must take our free 25-minute online placement test before enrolling. Results are e-mailed within two business days, along with a personal level recommendation. Full refunds are available up to seven days before term begins; after that, fees may be transferred to a later term.

TEXT 2 — PLACEMENT TEST RESULT

LINGUA PORT — PLACEMENT TEST RESULT
Candidate: Tomasz Zielinski — Test taken: 18 September (Spanish)
Listening: 71% · Reading: 78% · Grammar: 64% · Writing sample: B1 descriptors mostly met
Recommended level: INTERMEDIATE (B1)
Note: Your grammar score is just below the B1 threshold. If more than a year has passed since you last studied Spanish, you may find the first weeks of B1 demanding; revising the A2 grammar unit list (attached) before term begins is advised.
This recommendation is valid for two terms. Questions: placement@linguaport.com

TEXT 3 — E-MAIL

To: enrolments@linguaport.com
From: Tomasz Zielinski <t.zielinski@morwenmail.com>
Subject: Enrolment — two courses
Date: 22 September

Hello,

I have just received my Spanish placement result recommending Intermediate, and I would like to enrol in the Tuesday B1 Spanish class. It has in fact been almost three years since I last studied Spanish, so I will follow the advice in my result and work through the attached grammar list before October.

I also want to start French from zero, so please enrol me in a Beginner French class on any evening except Tuesday. I understand that no placement test is needed for that level and that taking two courses reduces the total fee.

Finally, my work occasionally sends me abroad at short notice. If a trip forced me to miss several weeks, could my fee be moved to the following term, or is that only possible before the course starts?

Best regards,
Tomasz Zielinski')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is indicated about Lingua Port classes?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They are limited to ten students',true),(v_q,1,'B','They meet twice a week',false),
    (v_q,2,'C','They include a tram pass',false),(v_q,3,'D','They run for two terms',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'According to the advertisement, who must take a placement test?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','All new students',false),(v_q,1,'B','Students enrolling in two courses',false),
    (v_q,2,'C','New students above beginner level',true),(v_q,3,'D','Students requesting refunds',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What does the test result advise Mr. Zielinski to do?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Retake the test in two weeks',false),(v_q,1,'B','Review some grammar before the course',true),
    (v_q,2,'C','Enrol at Elementary level instead',false),(v_q,3,'D','Take an additional writing course',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'How much will Mr. Zielinski most likely pay for his courses?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','$260',false),(v_q,1,'B','$520',false),
    (v_q,2,'C','$480',false),(v_q,3,'D','$460',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What does Mr. Zielinski ask about?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Transferring his fee to a later term',true),(v_q,1,'B','Changing his recommended level',false),
    (v_q,2,'C','The location of the studios',false),(v_q,3,'D','Buying additional course books',false);

END $$;
