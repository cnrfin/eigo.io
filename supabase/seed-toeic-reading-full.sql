-- ============================================================
--  TOEIC L&R Mock 1 — READING (full-length, 100 questions)
-- ============================================================
--  Faithful 2018-format Reading section, 75 minutes, full_mock:
--    Part 5 — Incomplete Sentences        Q101–130 (30)
--    Part 6 — Text Completion             Q131–146 (4 texts × 4)
--    Part 7 — Reading Comprehension       Q147–200 (54)
--              · 10 single passages (29) · 2 double sets (10) · 3 triple sets (15)
--  All 4-choice (A–D). Original content, business/daily themes.
--  Part of set 'toeic-lr-mock-01' with the Listening form (seed script).
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
  DELETE FROM test_forms WHERE slug = 'toeic-lr-reading-mock-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'toeic-lr';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track toeic-lr not found — run add-practice-tests.sql first.';
  END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-lr-reading-mock-01', 'TOEIC L&R Mock 1 — Reading',
          'TOEIC L&R 模試1 リーディング', 'full_mock', 4500, true,
          'toeic-lr-mock-01', 'TOEIC L&R — Mock Test 1', 'TOEIC L&R 模試1', 1)
  RETURNING id INTO v_form;

  -- ════════════════ Part 5: Incomplete Sentences (Q101–130) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 5', 'Incomplete Sentences',
          'Choose the word or phrase (A–D) that best completes each sentence.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'All visitors must sign in at the reception desk ___ entering the laboratory.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','before',true),(v_q,1,'B','until',false),(v_q,2,'C','among',false),(v_q,3,'D','toward',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Ms. Romero asked that the revised contract be sent directly to ___.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','she',false),(v_q,1,'B','her',true),(v_q,2,'C','hers',false),(v_q,3,'D','herself',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'The marketing team will present ___ proposal at Friday''s board meeting.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','its',true),(v_q,1,'B','it',false),(v_q,2,'C','itself',false),(v_q,3,'D','it''s',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Employees who complete the safety course will receive a ___ of completion.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','certify',false),(v_q,1,'B','certificate',true),(v_q,2,'C','certified',false),(v_q,3,'D','certifiable',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'Because of the road closure, deliveries are expected to arrive ___ than usual this week.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','late',false),(v_q,1,'B','later',true),(v_q,2,'C','latest',false),(v_q,3,'D','lately',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 5, 'single_choice', 'auto_choice', 'The new accounting software is remarkably easy to use, ___ little training is required.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','so',true),(v_q,1,'B','because',false),(v_q,2,'C','despite',false),(v_q,3,'D','whether',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 6, 'single_choice', 'auto_choice', 'Please review the attached ___ before signing the agreement.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','document',true),(v_q,1,'B','documenting',false),(v_q,2,'C','documented',false),(v_q,3,'D','documents are',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 7, 'single_choice', 'auto_choice', 'Mr. Patel has worked in the logistics industry ___ more than fifteen years.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','since',false),(v_q,1,'B','for',true),(v_q,2,'C','during',false),(v_q,3,'D','while',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 8, 'single_choice', 'auto_choice', 'The hotel offers a complimentary shuttle service for guests ___ to catch early flights.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','need',false),(v_q,1,'B','needs',false),(v_q,2,'C','needing',true),(v_q,3,'D','needed',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 9, 'single_choice', 'auto_choice', 'Sales of the company''s home fitness equipment rose ___ during the first quarter.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','sharp',false),(v_q,1,'B','sharply',true),(v_q,2,'C','sharpen',false),(v_q,3,'D','sharpness',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 10, 'single_choice', 'auto_choice', '___ the weather forecast, the outdoor staff picnic will go ahead as planned.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Despite',true),(v_q,1,'B','Although',false),(v_q,2,'C','Even',false),(v_q,3,'D','However',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 11, 'single_choice', 'auto_choice', 'All refund requests must be ___ by the customer service manager.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','approve',false),(v_q,1,'B','approves',false),(v_q,2,'C','approved',true),(v_q,3,'D','approving',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 12, 'single_choice', 'auto_choice', 'The seminar on negotiation skills was so popular that a second session has been ___.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','added',true),(v_q,1,'B','reduced',false),(v_q,2,'C','attended',false),(v_q,3,'D','reminded',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 13, 'single_choice', 'auto_choice', 'Passengers should keep their boarding passes ___ throughout the flight.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','accessible',true),(v_q,1,'B','access',false),(v_q,2,'C','accessing',false),(v_q,3,'D','accessibly',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 14, 'single_choice', 'auto_choice', '___ wishing to take annual leave in August should notify their supervisor by the end of June.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Whoever',false),(v_q,1,'B','Those',true),(v_q,2,'C','Them',false),(v_q,3,'D','Each',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 15, 'single_choice', 'auto_choice', 'The factory tour has been postponed ___ next Thursday because of scheduled maintenance.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','until',true),(v_q,1,'B','by',false),(v_q,2,'C','at',false),(v_q,3,'D','onto',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 16, 'single_choice', 'auto_choice', 'Ms. Lindqvist''s presentation was both informative and ___, according to the feedback forms.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','engaging',true),(v_q,1,'B','engaged',false),(v_q,2,'C','engagement',false),(v_q,3,'D','engages',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 17, 'single_choice', 'auto_choice', 'If the shipment ___ by Friday, please contact our distribution centre immediately.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','will not arrive',false),(v_q,1,'B','has not arrived',true),(v_q,2,'C','is not arriving',false),(v_q,3,'D','would not arrive',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 18, 'single_choice', 'auto_choice', 'The board approved a ___ increase in the research and development budget.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','substance',false),(v_q,1,'B','substantial',true),(v_q,2,'C','substantially',false),(v_q,3,'D','substantiate',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 19, 'single_choice', 'auto_choice', 'Neither the printer ___ the scanner on the third floor is working at the moment.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','or',false),(v_q,1,'B','and',false),(v_q,2,'C','nor',true),(v_q,3,'D','but',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 20, 'single_choice', 'auto_choice', 'Tickets for the technology conference are available at a ___ rate until 31 March.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','discounted',true),(v_q,1,'B','discounting',false),(v_q,2,'C','discounts',false),(v_q,3,'D','discount''s',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 21, 'single_choice', 'auto_choice', 'Mr. Da Silva will be out of the office next week; ___, his assistant will handle urgent enquiries.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','meanwhile',true),(v_q,1,'B','otherwise',false),(v_q,2,'C','instead of',false),(v_q,3,'D','in case',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 22, 'single_choice', 'auto_choice', 'The warranty does not cover damage caused by ___ use of the appliance.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','improper',true),(v_q,1,'B','improperly',false),(v_q,2,'C','impropriety',false),(v_q,3,'D','improperness',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 23, 'single_choice', 'auto_choice', 'Applications received ___ the deadline will not be considered for this round of funding.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','after',true),(v_q,1,'B','within',false),(v_q,2,'C','ahead',false),(v_q,3,'D','behind',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 24, 'single_choice', 'auto_choice', 'The CEO praised the team for completing the merger ___ and under budget.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','early',true),(v_q,1,'B','earlier than',false),(v_q,2,'C','earliest',false),(v_q,3,'D','earliness',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 25, 'single_choice', 'auto_choice', 'Visitors may park in any space ___ marked "Reserved".', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','not',true),(v_q,1,'B','no',false),(v_q,2,'C','none',false),(v_q,3,'D','nothing',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 26, 'single_choice', 'auto_choice', 'The interns rotate between departments every month to gain a broad ___ of the business.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','understanding',true),(v_q,1,'B','understandable',false),(v_q,2,'C','understandably',false),(v_q,3,'D','understands',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 27, 'single_choice', 'auto_choice', '___ the two candidates, Ms. Tan has the more relevant experience in international sales.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Of',true),(v_q,1,'B','From',false),(v_q,2,'C','At',false),(v_q,3,'D','To',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 28, 'single_choice', 'auto_choice', 'The museum''s new wing will ___ host travelling exhibitions from around the world.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','regularly',true),(v_q,1,'B','regular',false),(v_q,2,'C','regularity',false),(v_q,3,'D','regulars',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 29, 'single_choice', 'auto_choice', 'Had the supplier informed us of the delay sooner, we ___ alternative arrangements.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','will make',false),(v_q,1,'B','could have made',true),(v_q,2,'C','are making',false),(v_q,3,'D','have made',false);

  -- ════════════════ Part 6: Text Completion (Q131–146) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 6', 'Text Completion',
          'Read the text and choose the best word, phrase or sentence (A–D) for each numbered blank.', 1)
  RETURNING id INTO v_sec;

  -- Text 1: e-mail (Q131–134)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'To: All staff
From: Olivia Reyes, Facilities Manager
Subject: Parking garage cleaning

Dear colleagues,

The basement parking garage will be closed for its annual deep clean on Saturday 14 June. All vehicles must be removed from the garage ---(131)--- 8 p.m. on Friday.

While the garage is closed, staff may use the open-air lot on Mercer Street at no charge. Please display the temporary permit attached to this message on your dashboard; vehicles ---(132)--- a permit may be ticketed by the city.

The cleaning crew will also repaint the numbered bays. ---(133)---. We expect the garage to reopen at 6 a.m. on Monday.

Thank you for your ---(134)---.

Olivia')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(131)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','by',true),(v_q,1,'B','since',false),(v_q,2,'C','from',false),(v_q,3,'D','along',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(132)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','within',false),(v_q,1,'B','without',true),(v_q,2,'C','among',false),(v_q,3,'D','beyond',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(133) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','For this reason, bay numbers may look slightly different next week.',true),
    (v_q,1,'B','The Mercer Street lot has therefore been permanently closed.',false),
    (v_q,2,'C','Unfortunately, the cleaning has been cancelled.',false),
    (v_q,3,'D','Salaries will be reviewed at the same time.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(134)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','cooperate',false),(v_q,1,'B','cooperation',true),(v_q,2,'C','cooperative',false),(v_q,3,'D','cooperatively',false);

  -- Text 2: notice (Q135–138)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
'NOTICE TO ALL RESIDENTS — GREENVIEW APARTMENTS

Beginning 1 July, the building''s recycling programme will be ---(135)---. In addition to paper and glass, residents will be able to recycle soft plastics and small electronic items.

New colour-coded bins ---(136)--- in the ground-floor refuse room next week. A leaflet explaining what goes in each bin will be delivered to every mailbox. ---(137)---.

Questions about the programme should be ---(138)--- to the building manager, Mr. Hubbard, in Unit 101.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(135)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','expanded',true),(v_q,1,'B','expansion',false),(v_q,2,'C','expanding',false),(v_q,3,'D','expandable',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(136)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','install',false),(v_q,1,'B','installing',false),(v_q,2,'C','will be installed',true),(v_q,3,'D','have installed',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(137) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Residents are encouraged to read it carefully.',true),
    (v_q,1,'B','The mailboxes will be removed shortly afterwards.',false),
    (v_q,2,'C','Glass will no longer be accepted at that time.',false),
    (v_q,3,'D','Parking permits expire at the end of June.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(138)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','directed',true),(v_q,1,'B','direct',false),(v_q,2,'C','direction',false),(v_q,3,'D','directly',false);

  -- Text 3: letter (Q139–142)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 2, 'passage',
'Dear Ms. Kavanagh,

Thank you for your order of 12 May. We are pleased to confirm that the ergonomic chairs you requested are in stock and will be dispatched within three business days.

Please note that your order qualifies for our corporate discount, ---(139)--- has been applied to the enclosed invoice. The total shown is therefore lower than the price quoted on our website.

Our delivery team will contact you one day in advance to arrange a suitable time. ---(140)---. Assembly instructions are included in every box, and a video guide is ---(141)--- on our website.

We appreciate your business and look forward to ---(142)--- you again.

Sincerely,
Dale Whitfield
Customer Care, OfficePro Supplies')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(139)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','which',true),(v_q,1,'B','who',false),(v_q,2,'C','what',false),(v_q,3,'D','where',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(140) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Someone must be present to sign for the delivery.',true),
    (v_q,1,'B','The chairs are unfortunately out of stock.',false),
    (v_q,2,'C','Your payment has been refunded in full.',false),
    (v_q,3,'D','The website will be offline this weekend.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(141)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','available',true),(v_q,1,'B','availability',false),(v_q,2,'C','availably',false),(v_q,3,'D','avail',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(142)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','serve',false),(v_q,1,'B','serving',true),(v_q,2,'C','served',false),(v_q,3,'D','service',false);

  -- Text 4: advertisement (Q143–146)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 3, 'passage',
'BRIDGEPORT BUSINESS HUB — Flexible offices in the heart of the city

Why sign a long lease when your team is still growing? At Bridgeport Business Hub, you can rent fully furnished offices by the week, the month or the year — and change the size of your space ---(143)--- your needs change.

Every membership includes ultra-fast internet, meeting rooms and unlimited coffee. Our reception team will greet your visitors and handle your mail ---(144)--- you focus on your work.

---(145)---. Book a free tour at bridgeporthub.com and see the space for yourself.

Offices are filling quickly, so don''t ---(146)--- — availability is limited.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(143)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','whenever',true),(v_q,1,'B','wherever',false),(v_q,2,'C','whoever',false),(v_q,3,'D','whatever',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(144)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','while',true),(v_q,1,'B','during',false),(v_q,2,'C','despite',false),(v_q,3,'D','unless',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(145) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Words alone cannot do the building justice.',true),
    (v_q,1,'B','The hub closed permanently last year.',false),
    (v_q,2,'C','Long-term leases are required for all tenants.',false),
    (v_q,3,'D','Coffee is available for an additional fee.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(146)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','wait',true),(v_q,1,'B','waiting',false),(v_q,2,'C','waited',false),(v_q,3,'D','waits',false);

  -- ════════════════ Part 7: Reading Comprehension (Q147–200) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 7', 'Reading Comprehension',
          'Read the texts and choose the best answer (A–D) to each question.', 2)
  RETURNING id INTO v_sec;

  -- ── Single passage 1: text-message chain (Q147–148) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'Mia Castellano (10:12): Are you at the convention centre yet? Our booth number changed — we''re at C-14 now, not B-7.
Jonah Brandt (10:14): Just parked. C-14? That''s the corner spot, right? More foot traffic at least.
Mia Castellano (10:15): Exactly. But the banner stand is still being shipped to B-7. Can you catch the delivery and redirect it?
Jonah Brandt (10:16): On it. I''ll wait by B-7 and walk it over myself.
Mia Castellano (10:17): You''re a lifesaver. The brochures are already at the new booth.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Why did Ms. Castellano contact Mr. Brandt?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To tell him about a booth change',true),(v_q,1,'B','To cancel a convention',false),
    (v_q,2,'C','To order more brochures',false),(v_q,3,'D','To ask for a parking pass',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'At 10:16, what does Mr. Brandt mean when he writes, "On it"?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','He is standing on the banner stand',false),(v_q,1,'B','He will handle the delivery',true),
    (v_q,2,'C','He has already left the venue',false),(v_q,3,'D','He disagrees with the plan',false);

  -- ── Single passage 2: notice (Q149–150) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
'RIVERTON PUBLIC LIBRARY — SYSTEM UPGRADE

The library''s online catalogue and account services will be unavailable from 9 p.m. Friday 8 April until approximately noon on Sunday 10 April while we move to a new library management system.

During this period: borrowing and returns will be recorded manually; holds cannot be placed; and the self-service kiosks will be switched off. The building itself will remain open during normal hours.

From 11 April, log in with your existing card number. You will be asked to set a new PIN the first time you sign in. Loans due over the upgrade weekend will be automatically extended to Wednesday 13 April — no late fees will apply.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What will happen at the library during the upgrade weekend?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The building will close completely',false),(v_q,1,'B','Borrowing will be recorded manually',true),
    (v_q,2,'C','All loans must be returned',false),(v_q,3,'D','New cards will be issued',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is indicated about items due during the upgrade?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They must be renewed by phone',false),(v_q,1,'B','They will incur a small fee',false),
    (v_q,2,'C','Their due date will be extended',true),(v_q,3,'D','They should be left at the kiosks',false);

  -- ── Single passage 3: e-mail (Q151–153) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 2, 'passage',
'To: Daniel Mwangi <d.mwangi@calverton.com>
From: Hana Sato <h.sato@calverton.com>
Subject: Re: Annual client appreciation event
Date: 3 October

Hi Daniel,

Thanks for volunteering to organise this year''s client appreciation evening. To answer your questions:

1. Budget — the same as last year, plus 10% to cover rising catering costs. Finance has already approved this.
2. Venue — the rooftop of the Aldwych Hotel got excellent feedback last year, but they now require a minimum of 120 guests. Our list currently has 95 confirmed. Either we widen the invitation list to include former clients, or we look at smaller venues such as the Glasshouse.
3. Date — please avoid the week of 14 November; half the sales team will be at the Berlin expo.

Could you put together two complete options (venue, menu, rough cost) by next Friday? I''d like to present both to Ms. Odell before she travels.

Best,
Hana')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the purpose of the e-mail?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To answer questions about an event',true),(v_q,1,'B','To cancel a client meeting',false),
    (v_q,2,'C','To request a larger budget',false),(v_q,3,'D','To announce a new client',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is suggested about the Aldwych Hotel rooftop?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It received poor reviews last year',false),(v_q,1,'B','It may be too large for the current guest list',true),
    (v_q,2,'C','It is closed in November',false),(v_q,3,'D','It no longer serves food',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is Mr. Mwangi asked to do by next Friday?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Confirm 120 guests',false),(v_q,1,'B','Book flights to Berlin',false),
    (v_q,2,'C','Prepare two event options',true),(v_q,3,'D','Meet with Ms. Odell',false);

  -- ── Single passage 4: advertisement (Q154–156) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 3, 'passage',
'KESTREL COURIERS — SAME-DAY DELIVERY FOR LOCAL BUSINESSES

Documents, samples, spare parts: if it fits on a bike or in a van, we''ll get it across the city today.

• Book before 11 a.m. for guaranteed delivery by 5 p.m.
• Live tracking on every parcel — share the link with your customer
• Signed proof of delivery, stored in your account for 12 months
• Fixed-price city-centre rates: no surge charges, ever

NEW: open a monthly business account before 30 June and your first ten deliveries are half price. Accounts include a dedicated phone line and consolidated monthly invoicing — one bill, however many parcels you send.

Quote and booking at kestrelcouriers.com. Bulk rates available for regular senders of 50+ parcels per month.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is guaranteed for orders booked before 11 a.m.?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Free packaging',false),(v_q,1,'B','Delivery by 5 p.m. the same day',true),
    (v_q,2,'C','A discount on the next order',false),(v_q,3,'D','International shipping',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What benefit is offered to new business accounts opened before 30 June?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Half-price first ten deliveries',true),(v_q,1,'B','Free live tracking',false),
    (v_q,2,'C','A free bicycle',false),(v_q,3,'D','Two years of stored receipts',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'According to the advertisement, who can receive bulk rates?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','First-time customers',false),(v_q,1,'B','Customers paying by phone',false),
    (v_q,2,'C','Senders of 50 or more parcels a month',true),(v_q,3,'D','City-centre restaurants only',false);

  -- ── Single passage 5: memo (Q157–159) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 4, 'passage',
'MEMO
To: All Halverson Manufacturing supervisors
From: Greta Lindholm, Operations Director
Date: 21 February
Re: Energy-saving initiative — results and next phase

Three months ago we began phase one of our energy-saving initiative: motion-sensor lighting in the warehouses and revised start-up procedures for the assembly lines. The results have exceeded expectations — electricity use fell 14% compared with the same quarter last year, saving approximately $38,000.

Phase two begins 1 March. Compressed-air systems, our second-largest energy cost, will be inspected and leaks repaired throughout the plant. Each supervisor will receive an inspection schedule for their area; production will not need to stop, but some equipment may be unavailable for short periods. Please brief your teams and report any concerns about the schedule to my office by 26 February.

A summary of phase-one savings by department is attached. Well done, everyone.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What was a result of phase one?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Electricity use fell by 14%',true),(v_q,1,'B','Production stopped for a quarter',false),
    (v_q,2,'C','Two warehouses were closed',false),(v_q,3,'D','Assembly lines were replaced',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What will be the focus of phase two?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Motion-sensor lighting',false),(v_q,1,'B','Compressed-air systems',true),
    (v_q,2,'C','Solar panel installation',false),(v_q,3,'D','New assembly procedures',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What are supervisors asked to do by 26 February?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Repair air leaks themselves',false),(v_q,1,'B','Submit energy-saving ideas',false),
    (v_q,2,'C','Report concerns about the schedule',true),(v_q,3,'D','Attach department summaries',false);

  -- ── Single passage 6: article (Q160–162) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 5, 'passage',
'LOCAL BUSINESS NEWS — Crowd backs reopening of historic cinema

DALEFORD — The Regent, a 1930s cinema that closed eight years ago, is set to reopen next spring after a community fundraising campaign passed its £450,000 target on Tuesday — three weeks ahead of schedule.

More than 2,100 residents contributed, and a matching grant from the Daleford Heritage Trust doubled every donation made in the final month. The money will pay for roof repairs, restored seating for 220, and a modern projection system.

"People kept telling us they didn''t just want a cinema — they wanted somewhere to gather," said campaign organiser Priya Anand. Accordingly, the new Regent will include a small café and a flexible studio space for clubs and school groups.

The operator, Vista Community Cinemas, has pledged to employ at least twelve local staff. Membership pre-sales begin 1 December at theregentdaleford.org.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the article mainly about?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The reopening of a cinema',true),(v_q,1,'B','The closure of a heritage trust',false),
    (v_q,2,'C','A new film festival',false),(v_q,3,'D','A school fundraising event',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What did the Daleford Heritage Trust do?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It bought the building',false),(v_q,1,'B','It matched final-month donations',true),
    (v_q,2,'C','It hired twelve staff',false),(v_q,3,'D','It designed the café',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What will happen on 1 December?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The cinema will reopen',false),(v_q,1,'B','Roof repairs will begin',false),
    (v_q,2,'C','Membership pre-sales will start',true),(v_q,3,'D','A grant application will close',false);

  -- ── Single passage 7: online chat (Q163–165) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 6, 'passage',
'TEAM CHAT — #project-meridian
Lena Vogel (14:02): Quick update — the client moved the design review from Thursday to tomorrow at 9.
Sam Okafor (14:03): Tomorrow?! The interactive prototype won''t be ready. The animations still freeze on tablets.
Lena Vogel (14:04): I know. I suggest we demo on a laptop only and present the tablet version as "in progress".
Priscilla Niang (14:05): Agreed. Better a smooth demo on one device than a glitchy one on three.
Sam Okafor (14:06): Fine by me. I''ll prepare a short slide explaining the tablet timeline so it doesn''t look like we''re hiding anything.
Lena Vogel (14:07): Perfect. Send it to me by 6 and I''ll merge it into the deck.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What problem does the team face?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A review was moved earlier',true),(v_q,1,'B','A client cancelled the project',false),
    (v_q,2,'C','A laptop was lost',false),(v_q,3,'D','A designer resigned',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What does Ms. Vogel suggest?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Postponing the review again',false),(v_q,1,'B','Demonstrating on a laptop only',true),
    (v_q,2,'C','Buying new tablets',false),(v_q,3,'D','Removing the animations',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What will Mr. Okafor send by 6 o''clock?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A repaired prototype',false),(v_q,1,'B','A slide about the tablet timeline',true),
    (v_q,2,'C','The full presentation deck',false),(v_q,3,'D','Meeting notes from Thursday',false);

  -- ── Single passage 8: letter (Q166–168) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 7, 'passage',
'Marisol Vega
Editor, The Coastal Gazette

Dear Ms. Vega,

I am writing to thank the Gazette for last month''s feature on apprenticeships at small businesses. The response has been remarkable.

Within a week of publication, our boatyard received forty-three enquiries about our carpentry apprenticeship — more than in the previous two years combined. We have now taken on two apprentices and, because of the unexpected interest, created a third position funded jointly with the harbour authority.

May I suggest a follow-up piece next spring? Readers may like to see how the apprentices'' first year unfolds, and several other workshops along the harbour have started programmes of their own since your article appeared.

With appreciation,
Ruben Iversen
Iversen & Sons Boatyard')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Why did Mr. Iversen write the letter?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To thank the newspaper for an article',true),(v_q,1,'B','To complain about a story',false),
    (v_q,2,'C','To advertise boats for sale',false),(v_q,3,'D','To apply for a job',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is indicated about the third apprenticeship position?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It is unpaid',false),(v_q,1,'B','It is jointly funded',true),
    (v_q,2,'C','It was cancelled',false),(v_q,3,'D','It lasts two years',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What does Mr. Iversen suggest?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Publishing a follow-up article',true),(v_q,1,'B','Visiting the harbour authority',false),
    (v_q,2,'C','Hiring a fourth apprentice',false),(v_q,3,'D','Printing a correction',false);

  -- ── Single passage 9: webpage (Q169–171) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 8, 'passage',
'www.summitgear.com/returns

RETURNS & EXCHANGES — SUMMIT OUTDOOR GEAR

We want you to love your gear. If you don''t, here''s how returns work:

• 60 days — return any unused item with its tags for a full refund to the original payment method.
• 61–120 days — unused items can be exchanged or refunded as store credit.
• Used items — if a product fails because of a manufacturing fault within two years, we will repair it, replace it, or credit you, whichever you prefer. Normal wear and tear is not covered.

To start a return, sign in to your account and select the order. Print the prepaid label — returns are free within the country. International customers pay return postage, which is deducted from the refund.

Items bought from other retailers must be returned to the original seller. Online purchases may also be returned at any of our stores; bring the digital receipt.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What can customers receive for an unused item returned after 90 days?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A full cash refund',false),(v_q,1,'B','Store credit or an exchange',true),
    (v_q,2,'C','A repair voucher',false),(v_q,3,'D','Nothing — returns are closed',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is true about international returns?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They are not accepted',false),(v_q,1,'B','Postage is deducted from the refund',true),
    (v_q,2,'C','They take two years',false),(v_q,3,'D','They require a phone call',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'According to the webpage, what should customers who bought from another retailer do?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Return the item to the original seller',true),(v_q,1,'B','Visit a Summit store',false),
    (v_q,2,'C','Email customer service',false),(v_q,3,'D','Request a prepaid label',false);

  -- ── Single passage 10: article (Q172–175) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 9, 'passage',
'WORKPLACE TRENDS QUARTERLY — The quiet rise of the "micro-office"

For decades, conventional wisdom held that growing companies should consolidate staff into ever-larger headquarters. A growing number of firms are doing the opposite. — [1] —

Rather than one central office, they rent several small spaces — "micro-offices" — of eight to twenty desks, scattered across the districts where employees actually live. Staff choose whichever location suits them on a given day. — [2] —

The model is not without challenges. Team gatherings require more planning, and companies report spending more on coordination tools. Yet supporters argue the trade-off is worth it: commute times fall dramatically, and firms can recruit across an entire metropolitan region instead of a single postcode. — [3] —

Hardware maker Brontide Audio is typical. After replacing its 400-desk headquarters with nine micro-offices, the company found that average commutes fell from 52 to 19 minutes, and voluntary staff turnover dropped by a third within a year. — [4] — Other firms are watching closely.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the article mainly about?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A trend toward many small offices',true),(v_q,1,'B','The growth of company headquarters',false),
    (v_q,2,'C','A shortage of office furniture',false),(v_q,3,'D','New audio products',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What challenge of the micro-office model is mentioned?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Higher rents per desk',false),(v_q,1,'B','More planning for team gatherings',true),
    (v_q,2,'C','Longer commutes',false),(v_q,3,'D','Difficulty recruiting',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is reported about Brontide Audio?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Its staff turnover decreased',true),(v_q,1,'B','It moved into a larger headquarters',false),
    (v_q,2,'C','It doubled its workforce',false),(v_q,3,'D','It opened 400 offices',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'In which of the positions marked [1], [2], [3] and [4] does the following sentence best belong? "Desks are booked through an app, so no location ever overfills."', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','[1]',false),(v_q,1,'B','[2]',true),(v_q,2,'C','[3]',false),(v_q,3,'D','[4]',false);

  -- ── Double passages 1: e-mail + schedule (Q176–180) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 10, 'passage',
'TEXT 1 — E-MAIL

To: facilities@nordwind.com
From: Karl Jensen, Training Coordinator
Subject: Room booking — onboarding week
Date: 2 May

Hello,

We have eleven new employees starting on Monday 19 May, and I''d like to book rooms for their onboarding week. Requirements:

• Mon–Tue: one room with a projector for all eleven, full day.
• Wed: two smaller rooms for parallel workshops (six and five people), mornings only.
• Thu: no room needed (department visits).
• Fri: one room with video-conferencing for the welcome call with the Oslo office, 9–11 a.m.

Natural light would be appreciated — last year''s group found the basement rooms gloomy. Please confirm by Wednesday.

Thanks,
Karl

TEXT 2 — ROOM CONFIRMATION (extract)

Booking ref: 5512 — Onboarding week, 19–23 May
Mon 19: Aurora Room (cap. 14, projector, windows) — 9:00–17:00
Tue 20: Aurora Room — 9:00–17:00
Wed 21: Birch Room (cap. 8, windows) + Cedar Room (cap. 6, interior) — 9:00–12:30
Fri 23: Fjord Suite (cap. 10, video wall) — 9:00–11:00
Notes: Aurora unavailable Wed (board meeting). Cedar was the only second room free; apologies — it is an interior room. Fjord Suite capacity is 10; one participant should join the call from a desk.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Why did Mr. Jensen write the e-mail?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To reserve rooms for new-employee training',true),(v_q,1,'B','To complain about a basement office',false),
    (v_q,2,'C','To cancel a video call',false),(v_q,3,'D','To order projectors',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'When will the new employees visit departments?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Monday',false),(v_q,1,'B','Wednesday',false),(v_q,2,'C','Thursday',true),(v_q,3,'D','Friday',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'Which of Mr. Jensen''s preferences could NOT be fully met?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A projector on Monday',false),(v_q,1,'B','Natural light in both Wednesday rooms',true),
    (v_q,2,'C','Video-conferencing on Friday',false),(v_q,3,'D','A full-day room on Tuesday',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Why is the Aurora Room unavailable on Wednesday?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It is being redecorated',false),(v_q,1,'B','A board meeting is scheduled',true),
    (v_q,2,'C','The projector is broken',false),(v_q,3,'D','It is too small',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What is suggested about the Friday welcome call?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It will be rescheduled to Thursday',false),(v_q,1,'B','One person will join from a desk',true),
    (v_q,2,'C','It will last all day',false),(v_q,3,'D','The Oslo office cancelled it',false);

  -- ── Double passages 2: invoice + e-mail (Q181–185) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 11, 'passage',
'TEXT 1 — INVOICE

BLUEPEAK OFFICE SOLUTIONS — INVOICE #20488
Billed to: Fernwell Architects, 12 Quay Street
Date issued: 5 August · Payment due: 4 September

1. Ergonomic task chair (×6) ............ $1,740
2. Height-adjustable desk (×4) .......... $2,360
3. Monitor arm, dual (×4) ............... $ 480
4. Delivery & installation .............. $ 150
                              Subtotal:   $4,730
              Loyalty discount (5%):     −$ 236.50
                              TOTAL:      $4,493.50

Note: items 1–3 carry a 5-year warranty. Returns accepted within 30 days of delivery in original packaging.

TEXT 2 — E-MAIL

To: billing@bluepeak.com
From: Asha Fernwell
Subject: Invoice #20488 — two issues
Date: 11 August

Hello,

The furniture arrived yesterday and the installation team did an excellent job. Two issues with the invoice, however:

First, we ordered five chairs, not six — only five were delivered, which matches our order confirmation #C-7741. Could you correct the quantity and reissue the invoice?

Second, the loyalty discount should be 8%, not 5%. Our account was upgraded to Gold tier in June; your colleague Devon confirmed the new rate at the time by e-mail, which I can forward.

We''re happy to pay as soon as the corrected invoice arrives.

Regards,
Asha Fernwell')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What did Fernwell Architects purchase from Bluepeak?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Office furniture',true),(v_q,1,'B','Computer software',false),
    (v_q,2,'C','Architectural drawings',false),(v_q,3,'D','Cleaning services',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'In the e-mail, what does Ms. Fernwell say about the delivery?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It arrived damaged',false),(v_q,1,'B','The installers did good work',true),
    (v_q,2,'C','It was two weeks late',false),(v_q,3,'D','It went to the wrong address',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What quantity error appears on the invoice?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Six chairs were billed instead of five',true),(v_q,1,'B','Four desks were billed instead of five',false),
    (v_q,2,'C','Two monitor arms are missing',false),(v_q,3,'D','Delivery was charged twice',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Why does Ms. Fernwell believe the discount is wrong?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Her account was upgraded to a higher tier',true),(v_q,1,'B','The subtotal was calculated incorrectly',false),
    (v_q,2,'C','A coupon code was not applied',false),(v_q,3,'D','The warranty was not included',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'When will Fernwell Architects most likely pay?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','After receiving a corrected invoice',true),(v_q,1,'B','On 4 September regardless',false),
    (v_q,2,'C','After the warranty expires',false),(v_q,3,'D','Once the sixth chair arrives',false);

  -- ── Triple passages 1: ad + booking form + e-mail (Q186–190) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 12, 'passage',
'TEXT 1 — ADVERTISEMENT

HARTWELL CONFERENCE CENTRE — Autumn corporate packages
• HALF-DAY (4 h): main hall, basic AV, tea & coffee — $900
• FULL-DAY (8 h): main hall, full AV with technician, tea & coffee, buffet lunch — $1,950
• PREMIUM (8 h): everything in Full-Day plus two breakout rooms and post-event cleaning — $2,400
Book any package for a Monday or Tuesday and receive 15% off. Quote code AUTUMN at booking.

TEXT 2 — BOOKING FORM (submitted online)

Company: Meridian Insurance
Contact: Lucy Tran
Package: PREMIUM
Date requested: Tuesday 7 October
Attendees: 85
Code entered: AUTUMN
Special requests: vegetarian options at lunch; one breakout room set up theatre-style.

TEXT 3 — E-MAIL

To: l.tran@meridian-ins.com
From: bookings@hartwellcc.com
Subject: Booking 7 October — confirmed with one change
Date: 12 September

Dear Ms. Tran,

Your Premium booking for Tuesday 7 October is confirmed, and the 15% discount has been applied. One change: the technician originally assigned is unavailable that day, so AV support will be provided by our senior engineer at no extra charge — she will contact you this week to run through your slides and microphones.

Both breakout rooms are reserved; Room 2 will be set theatre-style as requested. Our caterer confirms a full vegetarian line at the buffet.

Kind regards,
Hartwell Bookings Team')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is included in the Premium package but NOT the Full-Day package?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Breakout rooms and post-event cleaning',true),(v_q,1,'B','A buffet lunch',false),
    (v_q,2,'C','An AV technician',false),(v_q,3,'D','Tea and coffee',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Why does Meridian Insurance qualify for the discount?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The event is on a Tuesday',true),(v_q,1,'B','They are a returning customer',false),
    (v_q,2,'C','They booked two events',false),(v_q,3,'D','They have over 100 attendees',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'How much will Meridian Insurance most likely pay?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','$900',false),(v_q,1,'B','$1,657.50',false),(v_q,2,'C','$2,040',true),(v_q,3,'D','$2,400',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'What change does the e-mail mention?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A different AV person will assist',true),(v_q,1,'B','The date moved to Monday',false),
    (v_q,2,'C','Lunch was cancelled',false),(v_q,3,'D','The discount no longer applies',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What will be set up theatre-style?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The main hall',false),(v_q,1,'B','Breakout Room 2',true),
    (v_q,2,'C','The buffet area',false),(v_q,3,'D','The reception lobby',false);

  -- ── Triple passages 2: webpage + review + response (Q191–195) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 13, 'passage',
'TEXT 1 — WEBPAGE

TRAILSIDE BIKE TOURS — Vineyard Loop (full day)
Cycle 38 km of quiet lanes through the Belmore Valley, with tastings at two family wineries and a picnic lunch by the river. Suitable for casual riders; e-bikes available (+$25). Groups of 8–14. Departs Saturdays, 9 a.m., from our Belmore depot. $129 per person including bike, helmet, lunch and tastings. Riders must be 18+ for winery entry. Full refund up to 72 hours before departure.

TEXT 2 — CUSTOMER REVIEW (trailsidetours.com)
★★★★☆ — "Wonderful day, one suggestion" — posted 14 June by R. Kapoor
The Vineyard Loop exceeded expectations — the guides were knowledgeable, the picnic was generous, and the second winery was a real highlight. I rented an e-bike and it was worth every cent on the valley climb. My one suggestion: the morning briefing was held outdoors with traffic noise, and several of us at the back couldn''t hear the safety instructions. A small speaker would fix it. I''d still recommend the tour to any group of friends.

TEXT 3 — COMPANY RESPONSE
Reply from Trailside Bike Tours — 16 June
Thank you for the detailed review, Mr. Kapoor! We''re delighted the climb felt easy on the e-bike. You''ll be pleased to hear we''ve already acted on your suggestion: from this weekend, all briefings take place inside the depot meeting room, and guides now use a portable microphone. We hope to welcome you on our new Coastal Lighthouse route in September — as a thank-you, use code KAPOOR10 for 10% off your next booking.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is included in the standard tour price?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Lunch and wine tastings',true),(v_q,1,'B','An e-bike',false),
    (v_q,2,'C','Hotel pickup',false),(v_q,3,'D','A photo package',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What did Mr. Kapoor pay for his place on the tour?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','$104',false),(v_q,1,'B','$129',false),(v_q,2,'C','$154',true),(v_q,3,'D','$179',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What problem did Mr. Kapoor mention?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The safety briefing was hard to hear',true),(v_q,1,'B','The lunch portions were small',false),
    (v_q,2,'C','The guides lacked knowledge',false),(v_q,3,'D','The wineries were closed',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'How did the company respond to the suggestion?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Briefings were moved indoors with a microphone',true),(v_q,1,'B','The route was shortened',false),
    (v_q,2,'C','E-bike fees were removed',false),(v_q,3,'D','Group sizes were reduced',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What is Mr. Kapoor offered?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A discount on a future booking',true),(v_q,1,'B','A full refund',false),
    (v_q,2,'C','A free e-bike upgrade',false),(v_q,3,'D','A private tour',false);

  -- ── Triple passages 3: memo + agenda + e-mail (Q196–200) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 14, 'passage',
'TEXT 1 — MEMO

To: All department heads, Veltri Foods
From: Sofia Veltri, CEO
Date: 8 January
Re: Annual strategy summit — 5–6 February, Lakeview Lodge

This year''s summit will focus on our expansion into plant-based products. Each department head will give a 15-minute update on day one. Day two is reserved for cross-department workshops. Please send your update slides to my assistant, Tom Becker, by 30 January. Note that the lodge has limited Wi-Fi in the meeting barn — bring printed handouts as a backup.

TEXT 2 — AGENDA (Day 1, extract)

09:00 Welcome & goals — S. Veltri
09:20 Sales update — D. Romero
09:40 Production update — F. Achebe
10:00 Break
10:20 R&D update — L. Castell
10:40 Marketing update — (TBC)
11:00 Supply-chain update — J. Whitaker
11:30 Q&A panel — all presenters

TEXT 3 — E-MAIL

To: t.becker@veltrifoods.com
From: Marnie Holt, Marketing Director
Subject: Summit slot + slides
Date: 27 January

Hi Tom,

Two things. First, my slides are attached — three days early, you''ll notice! Second, I''m scheduled "TBC" at 10:40, but my train from the trade fair doesn''t reach Lakeview until 10:50 at the earliest. Could I swap with Jonas Whitaker at 11:00? I''ve checked with him and he''s happy either way.

Also, following the memo''s advice, I''ve couriered 30 printed handout packs directly to the lodge.

Best,
Marnie')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the main focus of this year''s summit?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Expansion into plant-based products',true),(v_q,1,'B','Opening overseas offices',false),
    (v_q,2,'C','A company merger',false),(v_q,3,'D','New packaging designs',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What are presenters advised to bring, and why?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Printed handouts, because Wi-Fi is limited',true),(v_q,1,'B','Laptops, because screens are unavailable',false),
    (v_q,2,'C','Samples, because investors will attend',false),(v_q,3,'D','Warm clothing, because the barn is cold',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'By how many days did Ms. Holt beat the slide deadline?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','One',false),(v_q,1,'B','Two',false),(v_q,2,'C','Three',true),(v_q,3,'D','Five',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Why does Ms. Holt want to change her presentation time?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Her train arrives after her scheduled slot begins',true),(v_q,1,'B','Her slides are not ready',false),
    (v_q,2,'C','She prefers to present first',false),(v_q,3,'D','She must leave early on day one',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'Whose presentation slot would Ms. Holt take if her request is approved?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Mr. Whitaker''s',true),(v_q,1,'B','Ms. Castell''s',false),
    (v_q,2,'C','Mr. Romero''s',false),(v_q,3,'D','Ms. Veltri''s',false);

END $$;
