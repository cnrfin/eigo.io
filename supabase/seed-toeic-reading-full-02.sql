-- ============================================================
--  TOEIC L&R Mock 2 — READING (full-length, 100 questions)
-- ============================================================
--  Faithful 2018-format Reading section, 75 minutes, full_mock:
--    Part 5 — Incomplete Sentences        Q101–130 (30)
--    Part 6 — Text Completion             Q131–146 (4 texts × 4)
--    Part 7 — Reading Comprehension       Q147–200 (54)
--              · 10 single passages (29) · 2 double sets (10) · 3 triple sets (15)
--  All 4-choice (A–D). Original content, business/daily themes.
--  Part of set 'toeic-lr-mock-02' with the Listening form (seed script).
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
  DELETE FROM test_forms WHERE slug = 'toeic-lr-reading-mock-02';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'toeic-lr';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track toeic-lr not found — run add-practice-tests.sql first.';
  END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'toeic-lr-reading-mock-02', 'TOEIC L&R Mock 2 — Reading',
          'TOEIC L&R 模試2 リーディング', 'full_mock', 4500, false,
          'toeic-lr-mock-02', 'TOEIC L&R — Mock Test 2', 'TOEIC L&R 模試2', 1)
  RETURNING id INTO v_form;

  -- ════════════════ Part 5: Incomplete Sentences (Q101–130) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 5', 'Incomplete Sentences',
          'Choose the word or phrase (A–D) that best completes each sentence.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Mr. Okada will conduct the training session ___ because the usual instructor is on leave.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','he',false),(v_q,1,'B','himself',true),(v_q,2,'C','his',false),(v_q,3,'D','him',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'The technicians inspected the equipment ___ before returning it to service.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','thorough',false),(v_q,1,'B','thoroughness',false),(v_q,2,'C','more thorough',false),(v_q,3,'D','thoroughly',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '___ its compact size, the new projector delivers exceptionally bright images.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Despite',true),(v_q,1,'B','Although',false),(v_q,2,'C','Because',false),(v_q,3,'D','Unless',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'All luggage left in the lobby will be ___ to the storage room by the concierge.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','move',false),(v_q,1,'B','moving',false),(v_q,2,'C','moved',true),(v_q,3,'D','moves',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'Please silence your mobile phone ___ the performance is in progress.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','during',false),(v_q,1,'B','among',false),(v_q,2,'C','while',true),(v_q,3,'D','between',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 5, 'single_choice', 'auto_choice', 'The committee reached a unanimous ___ after only twenty minutes of discussion.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','decision',true),(v_q,1,'B','decide',false),(v_q,2,'C','decisive',false),(v_q,3,'D','decisively',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 6, 'single_choice', 'auto_choice', 'Of all the venues we considered, the Grandview Ballroom offered the ___ rates.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','reasonably',false),(v_q,1,'B','more reasonable',false),(v_q,2,'C','reason',false),(v_q,3,'D','most reasonable',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 7, 'single_choice', 'auto_choice', 'The new security badges will remain valid ___ a period of two years.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','since',false),(v_q,1,'B','for',true),(v_q,2,'C','at',false),(v_q,3,'D','onto',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 8, 'single_choice', 'auto_choice', 'Employees ___ parking permits expire this month should renew them online.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','who',false),(v_q,1,'B','whom',false),(v_q,2,'C','which',false),(v_q,3,'D','whose',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 9, 'single_choice', 'auto_choice', 'Tartan Rail apologises for the delay and will ___ passengers for any additional travel costs.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','deliver',false),(v_q,1,'B','reimburse',true),(v_q,2,'C','conduct',false),(v_q,3,'D','install',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 10, 'single_choice', 'auto_choice', 'The hotel''s renovation will significantly improve the ___ of its conference facilities.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','appear',false),(v_q,1,'B','appears',false),(v_q,2,'C','appearance',true),(v_q,3,'D','appearing',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 11, 'single_choice', 'auto_choice', '___ Ms. Duarte nor her assistant was able to attend the ribbon-cutting ceremony.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Neither',true),(v_q,1,'B','Either',false),(v_q,2,'C','Both',false),(v_q,3,'D','Not only',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 12, 'single_choice', 'auto_choice', 'The finance director recommended ___ the contract negotiations until the exchange rate stabilises.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','delaying',true),(v_q,1,'B','delay',false),(v_q,2,'C','to delay',false),(v_q,3,'D','delayed',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 13, 'single_choice', 'auto_choice', 'Seats in the front row are ___ for guests with mobility needs.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','absent',false),(v_q,1,'B','vacant',false),(v_q,2,'C','reserved',true),(v_q,3,'D','crowded',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 14, 'single_choice', 'auto_choice', 'Each of the laboratory technicians ___ required to wear protective eyewear at all times.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','are',false),(v_q,1,'B','is',true),(v_q,2,'C','were',false),(v_q,3,'D','being',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 15, 'single_choice', 'auto_choice', 'The express train to the airport departs ___ ten-minute intervals during peak hours.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','on',false),(v_q,1,'B','in',false),(v_q,2,'C','for',false),(v_q,3,'D','at',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 16, 'single_choice', 'auto_choice', 'Roxbury Financial offers ___ advice tailored to each client''s retirement goals.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','profession',false),(v_q,1,'B','professional',true),(v_q,2,'C','professionally',false),(v_q,3,'D','professionalism',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 17, 'single_choice', 'auto_choice', 'By the time the auditors arrive next week, the accounting team ___ all the receipts.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','will have organized',true),(v_q,1,'B','organizes',false),(v_q,2,'C','is organizing',false),(v_q,3,'D','has been organized',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 18, 'single_choice', 'auto_choice', 'The shipment cleared customs quickly; ___, it reached the warehouse two days early.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','nevertheless',false),(v_q,1,'B','in contrast',false),(v_q,2,'C','otherwise',false),(v_q,3,'D','as a result',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 19, 'single_choice', 'auto_choice', 'Ms. Greer wrote the entire grant proposal ___ over a single weekend.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','her',false),(v_q,1,'B','hers',false),(v_q,2,'C','herself',true),(v_q,3,'D','she',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 20, 'single_choice', 'auto_choice', 'Construction noise will be kept to a ___ during examination week at the adjacent college.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','shortage',false),(v_q,1,'B','limitation',false),(v_q,2,'C','minimum',true),(v_q,3,'D','decrease',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 21, 'single_choice', 'auto_choice', 'The staff cafeteria will be closed ___ further notice owing to a plumbing repair.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','toward',false),(v_q,1,'B','against',false),(v_q,2,'C','onto',false),(v_q,3,'D','until',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 22, 'single_choice', 'auto_choice', 'Applicants for the interpreter role must demonstrate ___ in at least two foreign languages.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','proficiency',true),(v_q,1,'B','proficient',false),(v_q,2,'C','proficiently',false),(v_q,3,'D','more proficient',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 23, 'single_choice', 'auto_choice', 'Keep your receipt ___ you need to exchange the item at a later date.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','so that',false),(v_q,1,'B','in case',true),(v_q,2,'C','as if',false),(v_q,3,'D','even though',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 24, 'single_choice', 'auto_choice', 'The board insists that every expense report ___ by two managers before payment.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','approves',false),(v_q,1,'B','approving',false),(v_q,2,'C','is approving',false),(v_q,3,'D','be approved',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 25, 'single_choice', 'auto_choice', 'The museum''s membership has grown ___ since the interactive science wing opened in March.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','tightly',false),(v_q,1,'B','previously',false),(v_q,2,'C','considerably',true),(v_q,3,'D','accidentally',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 26, 'single_choice', 'auto_choice', '___ to popular demand, the bakery has extended its weekend opening hours.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Instead',false),(v_q,1,'B','Owing',true),(v_q,2,'C','Except',false),(v_q,3,'D','Prior',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 27, 'single_choice', 'auto_choice', 'The updated mobile app is far more ___ than the previous version.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','reliable',true),(v_q,1,'B','reliably',false),(v_q,2,'C','reliability',false),(v_q,3,'D','relies',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 28, 'single_choice', 'auto_choice', 'In ___ with airline policy, passengers must stow their bags during takeoff and landing.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','response',false),(v_q,1,'B','addition',false),(v_q,2,'C','accordance',true),(v_q,3,'D','exchange',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 29, 'single_choice', 'auto_choice', '___ you require assistance with the new payroll system, please contact the help desk.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Unless',false),(v_q,1,'B','Whether',false),(v_q,2,'C','So',false),(v_q,3,'D','Should',true);

  -- ════════════════ Part 6: Text Completion (Q131–146) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 6', 'Text Completion',
          'Read the text and choose the best word, phrase or sentence (A–D) for each numbered blank.', 1)
  RETURNING id INTO v_sec;

  -- Text 1: e-mail (Q131–134)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'To: All staff
From: Imran Chaudhry, IT Director
Subject: New expense-reporting system

Dear colleagues,

Starting 1 September, all expense claims must be ---(131)--- through the new ClaroExpense portal. Paper forms will be retired at the end of August.

The portal is simple to use: receipts can be photographed with your phone and attached ---(132)--- to each claim. Approved claims will be paid within five business days — half the current processing time.

Two thirty-minute training sessions will be offered next week. ---(133)---. A recorded version will also be posted on the intranet.

Thank you in advance for helping us make this transition as ---(134)--- as possible.

Imran')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(131)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','submit',false),(v_q,1,'B','submitting',false),(v_q,2,'C','submission',false),(v_q,3,'D','submitted',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(132)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','automatically',true),(v_q,1,'B','automatic',false),(v_q,2,'C','automation',false),(v_q,3,'D','automate',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(133) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The portal was shut down permanently last year.',false),
    (v_q,1,'B','Paper forms will therefore remain mandatory.',false),
    (v_q,2,'C','Attendance at one of them is strongly encouraged.',true),
    (v_q,3,'D','Receipts should be discarded immediately after purchase.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(134)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','smoothly',false),(v_q,1,'B','smooth',true),(v_q,2,'C','smoothness',false),(v_q,3,'D','smoother',false);

  -- Text 2: notice (Q135–138)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
'PRODUCT RECALL NOTICE — AURALUX ELECTRIC KETTLE, MODEL K-40

Customers who purchased the Auralux K-40 kettle between January and April of this year are ---(135)--- to stop using it immediately.

A small number of units contain a faulty switch that may cause the kettle to overheat, ---(136)--- a possible burn hazard. No injuries have been reported, but we are recalling all affected units as a precaution.

Please return the kettle to any retailer for a full refund; no receipt is required. ---(137)---. To arrange this, call our recall hotline at 0800 555 214 or visit auralux.com/recall.

We apologise for any inconvenience and thank you for your ---(138)--- attention to this matter.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(135)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','urging',false),(v_q,1,'B','urged',true),(v_q,2,'C','urgent',false),(v_q,3,'D','urgently',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(136)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','created',false),(v_q,1,'B','creates',false),(v_q,2,'C','creating',true),(v_q,3,'D','creation',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(137) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Alternatively, a free replacement can be mailed to your home.',true),
    (v_q,1,'B','The kettle has won several international design awards.',false),
    (v_q,2,'C','Refunds will unfortunately not be offered for this model.',false),
    (v_q,3,'D','The faulty switch significantly improves heating times.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(138)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','prompted',false),(v_q,1,'B','promptly',false),(v_q,2,'C','promptness',false),(v_q,3,'D','prompt',true);

  -- Text 3: letter (Q139–142)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 2, 'passage',
'Dear Mr. Arroyo,

Thank you for attending the first-round interview for the graphic designer position at Lanterna Studio last Thursday.

We were impressed by your portfolio and would like to invite you to a ---(139)--- interview on Tuesday 18 March at 10 a.m. The session will last about two hours and will include a short design exercise; no special preparation is ---(140)---.

Please confirm your availability by replying to this letter or calling our office by Friday. Our studio is a ten-minute walk from Central Station. ---(141)---.

We look forward to ---(142)--- from you.

Sincerely,
Beatriz Lanterna
Creative Director, Lanterna Studio')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(139)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','seconds',false),(v_q,1,'B','secondly',false),(v_q,2,'C','second',true),(v_q,3,'D','secondary',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(140)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','necessity',false),(v_q,1,'B','necessarily',false),(v_q,2,'C','necessitate',false),(v_q,3,'D','necessary',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(141) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The position has unfortunately already been filled.',false),
    (v_q,1,'B','A map with walking directions is enclosed.',true),
    (v_q,2,'C','Your first interview has been cancelled.',false),
    (v_q,3,'D','Trains no longer stop at Central Station.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(142)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','hearing',true),(v_q,1,'B','hear',false),(v_q,2,'C','heard',false),(v_q,3,'D','hears',false);

  -- Text 4: advertisement (Q143–146)
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 3, 'passage',
'SILVERLEAF CATERING — Office lunches your team will actually talk about

From weekly team lunches to annual banquets, our chefs prepare menus ---(143)--- to your budget and dietary needs. Everything is cooked the same morning in our city-centre kitchen and delivered in fully recyclable packaging.

Order online ---(144)--- 48 hours in advance and delivery is free anywhere within the city. Need something sooner? Call us — same-day orders are often possible for groups of up to twenty.

---(145)---. Visit silverleafcatering.com to browse sample menus and photos from recent events.

First-time customers receive 10% off ---(146)--- they mention this advertisement when ordering.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '(143)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','tailored',true),(v_q,1,'B','tailoring',false),(v_q,2,'C','tailors',false),(v_q,3,'D','tailor',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '(144)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','so much',false),(v_q,1,'B','at least',true),(v_q,2,'C','as soon',false),(v_q,3,'D','ever since',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '(145) Choose the sentence that best fits the blank.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Our kitchen closed permanently in May.',false),
    (v_q,1,'B','Refunds are never provided under any circumstances.',false),
    (v_q,2,'C','We regret that we cannot deliver to offices.',false),
    (v_q,3,'D','But don''t just take our word for it.',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', '(146)', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','until',false),(v_q,1,'B','despite',false),(v_q,2,'C','provided',true),(v_q,3,'D','whoever',false);

  -- ════════════════ Part 7: Reading Comprehension (Q147–200) ════════════════
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Part 7', 'Reading Comprehension',
          'Read the texts and choose the best answer (A–D) to each question.', 2)
  RETURNING id INTO v_sec;

  -- ── Single passage 1: text-message chain (Q147–148) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'Noor Haddad (11:48): Hi Marco — the client lunch starts at 12:30. Are you on schedule?
Marco Bellini (11:50): Slight hitch. The bridge on Welland Avenue is closed, so we''re rerouting through the industrial park. New ETA 12:20.
Noor Haddad (11:51): Cutting it close. Can your team set up in ten minutes?
Marco Bellini (11:52): If someone meets us at the loading dock with a trolley, absolutely.
Noor Haddad (11:53): Done. I''ll send Tomas down at 12:15. Use the rear entrance — the lobby is being recarpeted today.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Why is Mr. Bellini''s delivery delayed?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','His van broke down',false),(v_q,1,'B','The order was misplaced',false),
    (v_q,2,'C','A road is closed',true),(v_q,3,'D','The kitchen opened late',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'At 11:53, what does Ms. Haddad mean when she writes, "Done"?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','She will arrange for someone to help at the dock',true),(v_q,1,'B','The lunch has already finished',false),
    (v_q,2,'C','The lobby carpet has been installed',false),(v_q,3,'D','She is cancelling the order',false);

  -- ── Single passage 2: notice (Q149–150) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
'NOTICE — HARGREAVES PHARMACY IS MOVING

From Monday 3 March, Hargreaves Pharmacy will serve customers from new, larger premises at 48 Station Road — directly opposite our current shop. Our telephone number and opening hours remain unchanged.

All prescriptions on file will transfer automatically; there is nothing customers need to do. The new shop includes a private consultation room and step-free access from the street.

To celebrate the move, customers presenting this notice during March will receive 10% off non-prescription items.

Our last day of trading at 51 Station Road will be Saturday 1 March. We thank our customers for thirty years of loyalty at our old address.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'According to the notice, what will happen automatically?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Deliveries will be rescheduled',false),(v_q,1,'B','Prescription records will be transferred',true),
    (v_q,2,'C','Opening hours will be extended',false),(v_q,3,'D','The phone number will change',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'How can customers receive a discount in March?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','By ordering online',false),(v_q,1,'B','By joining a loyalty scheme',false),
    (v_q,2,'C','By booking a consultation',false),(v_q,3,'D','By showing the notice in the shop',true);

  -- ── Single passage 3: e-mail (Q151–153) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 2, 'passage',
'To: Priya Raman <p.raman@windmail.com>
From: membership@thornfieldmuseum.org
Subject: Your membership — time to renew
Date: 15 May

Dear Ms. Raman,

Your Thornfield Museum membership expires on 30 June. Renew by 15 June and you will pay last year''s rate of $60; after that date, the new annual rate of $72 applies.

This year, membership includes two new benefits: free entry to our evening lecture series and a 15% discount in the rooftop café. As before, members enjoy unlimited entry to all exhibitions and invitations to members-only preview days.

Please note that printed membership cards are being phased out. When you renew, you will receive a digital card by e-mail; simply show it on your phone at the entrance. Members who prefer a plastic card may request one at the front desk for a small fee.

Renew online at thornfieldmuseum.org/renew or call 555-0188.

The Membership Team')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Why should Ms. Raman renew by 15 June?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Her card stops working on that day',false),(v_q,1,'B','The museum closes in July',false),
    (v_q,2,'C','The lecture series begins that week',false),(v_q,3,'D','To pay the lower annual rate',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is a NEW membership benefit this year?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Unlimited exhibition entry',false),(v_q,1,'B','A discount in the café',true),
    (v_q,2,'C','Members-only preview days',false),(v_q,3,'D','Free parking',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is indicated about membership cards?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Digital cards are replacing printed ones',true),(v_q,1,'B','They are mailed within a week',false),
    (v_q,2,'C','Lost cards cannot be replaced',false),(v_q,3,'D','They must be collected in person',false);

  -- ── Single passage 4: advertisement (Q154–156) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 3, 'passage',
'GREENFURROW FARM BOX — Vegetables from our fields to your door

Every week we deliver a box of seasonal vegetables grown on our family farm, just 20 kilometres from the city — harvested no more than 24 hours before they reach you.

Choose your size:
• SMALL — $22 (ideal for 1–2 people)
• FAMILY — $34 (3–5 people)
• JUMBO — $46 (includes fruit and a dozen free-range eggs)

Hate turnips? Use our app to swap up to three items in your box each week — just make your choices by 8 p.m. on Sunday. Deliveries run on Tuesdays and Fridays; if you''re not home, leave a cool box on your doorstep.

Pause your subscription anytime at no charge — holidays shouldn''t cost you money. New customers: enter code FRESHSTART at checkout for 50% off your first box.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is emphasized about the vegetables?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They are imported',false),(v_q,1,'B','They are pre-cooked',false),
    (v_q,2,'C','They are harvested shortly before delivery',true),(v_q,3,'D','They are frozen for freshness',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What can subscribers do by Sunday evening?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Exchange some items in their box',true),(v_q,1,'B','Cancel for a small fee',false),
    (v_q,2,'C','Book a visit to the farm',false),(v_q,3,'D','Order extra eggs separately',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'How can new customers receive a discount?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','By subscribing for a full year',false),(v_q,1,'B','By referring a friend',false),
    (v_q,2,'C','By leaving an online review',false),(v_q,3,'D','By entering a code at checkout',true);

  -- ── Single passage 5: memo (Q157–159) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 4, 'passage',
'MEMO
To: All staff, Corvale Analytics
From: Janine Mott, HR Director
Date: 12 April
Re: Commuting survey — results and pilot programme

Thank you to the 312 employees — 78% of staff — who completed last month''s commuting survey. The key findings: 61% of respondents drive to work alone, parking availability was by far the most common frustration, and 44% said they would use a company shuttle from the Northgate transit hub if one were offered.

In response, a free shuttle pilot will run for eight weeks beginning Monday 5 May. Buses will depart Northgate every 20 minutes between 7:30 and 9:30 a.m., with return trips from 4:30 to 6:30 p.m. Seats are first-come, first-served. If average occupancy reaches 60% during the pilot, the service will become permanent.

The survey also showed strong interest in compressed four-day schedules. This idea needs more study; a working group will examine it and report in June. Please direct questions to hr@corvale.com.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What was the most common complaint in the survey?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Long meetings',false),(v_q,1,'B','Parking availability',true),
    (v_q,2,'C','Shuttle schedules',false),(v_q,3,'D','Cafeteria prices',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What will determine whether the shuttle becomes permanent?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The cost of fuel',false),(v_q,1,'B','The results of a second survey',false),
    (v_q,2,'C','Its average occupancy during the pilot',true),(v_q,3,'D','A vote by department heads',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What will the working group examine?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Compressed work schedules',true),(v_q,1,'B','Expanding the parking garage',false),
    (v_q,2,'C','Remote-work software',false),(v_q,3,'D','Salary adjustments',false);

  -- ── Single passage 6: article (Q160–162) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 5, 'passage',
'THE WESTPORT COURIER — Quayside Market to open on weekday evenings

WESTPORT — For more than forty years, the Quayside Market has operated only on Saturday mornings. Beginning next month, it will also open on Thursday and Friday evenings from 5 to 9 p.m., the market trust announced this week.

The decision follows a trial of four evening events last summer, which drew an average of 3,800 visitors each — nearly double a typical Saturday. Sixty-five of the market''s eighty regular stallholders have signed up for the evening sessions, and the trust is recruiting around fifteen additional vendors, with hot-food sellers especially in demand. Applications are open at quaysidemarket.org.

The trust has upgraded the market''s lighting with solar-powered lamps, and Westport Ferries will add a late 9:15 p.m. sailing on both evenings. "The harbour is beautiful at dusk," said trust chair Eleanor Brennan. "It is time the market made the most of it."')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the article mainly about?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A change to a ferry timetable',false),(v_q,1,'B','The closure of a market',false),
    (v_q,2,'C','The sale of solar lamps',false),(v_q,3,'D','New evening hours for a market',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What was the result of last summer''s trial?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The market lost money',false),(v_q,1,'B','Stallholders complained about the hours',false),
    (v_q,2,'C','Evening events attracted larger crowds than Saturdays',true),(v_q,3,'D','The ferry service was cancelled',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What kind of vendors is the trust especially seeking?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Craft makers',false),(v_q,1,'B','Hot-food sellers',true),
    (v_q,2,'C','Flower growers',false),(v_q,3,'D','Clothing designers',false);

  -- ── Single passage 7: online chat (Q163–165) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 6, 'passage',
'TEAM CHAT — #site-ops
Becca Liu (16:02): Heads-up — checkout is failing for some customers. Error reports started about ten minutes ago.
Dev Anand (16:03): Looking now. It''s the payment gateway — their status page shows a partial outage.
Becca Liu (16:04): Of all days! The 24-hour flash sale ends at midnight.
Hugo Reyes (16:05): Customers who can''t pay will be furious. Should we extend the sale?
Dev Anand (16:06): The gateway says the fix will take about two hours. I suggest a banner apologising and promising that sale prices will be honoured until noon tomorrow.
Becca Liu (16:07): Approved. Hugo, can you draft the banner text and an e-mail to customers with abandoned carts?
Hugo Reyes (16:08): Give me twenty minutes.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What problem is the team discussing?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Customers cannot complete their purchases',true),(v_q,1,'B','A warehouse has lost inventory',false),
    (v_q,2,'C','Sale items were priced incorrectly',false),(v_q,3,'D','Too few staff are on duty',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What does Mr. Anand recommend?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Ending the sale immediately',false),(v_q,1,'B','Switching to a new payment provider',false),
    (v_q,2,'C','Telephoning every affected customer',false),(v_q,3,'D','Posting an apology and honouring sale prices longer',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What will Mr. Reyes most likely do next?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Restart the web servers',false),(v_q,1,'B','Write text for a banner and an e-mail',true),
    (v_q,2,'C','Contact the payment gateway',false),(v_q,3,'D','Issue refunds to all customers',false);

  -- ── Single passage 8: letter (Q166–168) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 7, 'passage',
'Harborlight Youth Orchestra
22 Quayle Street

Dear Ms. Calloway,

On behalf of everyone at the Harborlight Youth Orchestra, thank you for Brightwater Dental''s generous sponsorship of our instrument-loan programme this season.

Your company''s donation funded the repair of eighteen instruments and the purchase of six new cellos. As a result, forty more students can now borrow an instrument free of charge — many of them playing for the very first time.

We would be honoured if you and a guest would join us at our Winter Gala Concert on Saturday 12 December at the Pavilion Theatre. Two seats have been reserved in your name, and we hope you will stay for the reception afterwards to meet some of the young musicians your support has helped. A plaque listing this season''s sponsors will also be unveiled in our rehearsal hall in the new year.

With sincere gratitude,
Edwin Park
Director, Harborlight Youth Orchestra')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'Why did Mr. Park write to Ms. Calloway?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To request a larger donation',false),(v_q,1,'B','To sell concert tickets',false),
    (v_q,2,'C','To thank her company for its support',true),(v_q,3,'D','To recruit new musicians',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What did the donation pay for?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Repairing and purchasing instruments',true),(v_q,1,'B','Building a new rehearsal hall',false),
    (v_q,2,'C','Staff salaries for the season',false),(v_q,3,'D','A professional recording session',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is Ms. Calloway invited to do?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Join the orchestra''s board',false),(v_q,1,'B','Judge a music competition',false),
    (v_q,2,'C','Donate six more cellos',false),(v_q,3,'D','Attend a concert and reception',true);

  -- ── Single passage 9: webpage (Q169–171) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 8, 'passage',
'www.novakitchen.com/warranty

NOVA KITCHEN APPLIANCES — WARRANTY TERMS

Every Nova appliance includes a two-year standard warranty covering manufacturing faults. Parts and labour are free of charge; simply open a claim in our online warranty portal with your serial number and proof of purchase.

Want more cover? Register your appliance on this page within 60 days of purchase and your warranty is extended to three years at no extra cost.

The warranty does not cover damage caused by incorrect installation, commercial use of domestic models, or normal wear items such as filters and bulbs.

If we cannot repair a fault within 21 days of collection, we will replace the appliance with the same or an equivalent model. The warranty is fully transferable: if you sell the appliance, it remains valid for the new owner as long as the original receipt is provided.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'How can customers extend the warranty to three years?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','By paying an annual fee',false),(v_q,1,'B','By buying a second appliance',false),
    (v_q,2,'C','By registering within 60 days of purchase',true),(v_q,3,'D','By calling customer support',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'According to the webpage, what is NOT covered by the warranty?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Manufacturing faults',false),(v_q,1,'B','Damage from incorrect installation',true),
    (v_q,2,'C','Labour costs for repairs',false),(v_q,3,'D','Replacement parts',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What happens if a repair takes longer than 21 days?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The appliance will be replaced',true),(v_q,1,'B','A refund is issued automatically',false),
    (v_q,2,'C','The warranty period is doubled',false),(v_q,3,'D','A loan appliance is delivered',false);

  -- ── Single passage 10: article (Q172–175) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 9, 'passage',
'COMMUNITY LIFE MONTHLY — Fixing things together at the repair café

Every second Saturday, the hall of St. Aldhelm''s Community Centre fills with broken toasters, wobbly chairs, silent radios and laptops that refuse to start. — [1] —

Repair cafés — free meeting places where volunteer fixers help neighbours mend broken household items — began in Amsterdam in 2009 and have since spread to more than 3,000 locations worldwide. St. Aldhelm''s, which opened two years ago, now attracts around eighty visitors a session. — [2] —

Organisers stress that visitors do not simply drop items off and collect them later. Owners sit beside the volunteer, hold the torch, pass the screwdriver and, ideally, learn enough to attempt the next repair themselves. — [3] —

The environmental benefit is measurable. St. Aldhelm''s estimates that 1.2 tonnes of goods were diverted from landfill in its first year alone. — [4] — Demand is now so high that a second monthly session will begin in May.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the article mainly about?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A new appliance store',false),(v_q,1,'B','A charity bicycle race',false),
    (v_q,2,'C','A landfill expansion project',false),(v_q,3,'D','A community repair event',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Where did the repair café movement begin?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','London',false),(v_q,1,'B','Amsterdam',true),
    (v_q,2,'C','St. Aldhelm''s',false),(v_q,3,'D','Copenhagen',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is indicated about visitors to the repair café?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They pay a small fee per item',false),(v_q,1,'B','They must book a week ahead',false),
    (v_q,2,'C','They take part in repairing their own items',true),(v_q,3,'D','They leave items overnight',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'In which of the positions marked [1], [2], [3] and [4] does the following sentence best belong? "None of these items'' owners will pay a cent to have them brought back to life."', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','[1]',true),(v_q,1,'B','[2]',false),(v_q,2,'C','[3]',false),(v_q,3,'D','[4]',false);

  -- ── Double passages 1: shipping confirmation + customer-service chat (Q176–180) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 10, 'passage',
'TEXT 1 — SHIPPING CONFIRMATION (E-MAIL)

To: Theo Marsh <t.marsh@parkerandmarsh.com>
From: orders@lumenandco.com
Subject: Order #88412 has shipped
Date: 10 February

Your order is on its way!
• Linnea desk lamp, charcoal (×2) .......... $158.00
• Standard delivery ........................ free
Estimated delivery: 14 February
Track your parcel: lumenandco.com/track/88412

Returns: unwanted items may be returned within 30 days; the customer pays return postage. If an item arrives damaged or is not what you ordered, we will e-mail you a prepaid return label and cover all costs.

TEXT 2 — CUSTOMER SUPPORT CHAT (15 February)

Bree (Lumen & Co.): Hi, you''re chatting with Bree. How can I help?
Theo Marsh: My order #88412 arrived yesterday. I ordered two charcoal lamps, but both lamps in the box are white.
Bree: I''m sorry about that, Mr. Marsh — I can see the picking error on our side. Two options: keep the white lamps with a 20% refund, or exchange them for the charcoal ones.
Theo Marsh: They need to match our reception desk, so I''ll take the exchange.
Bree: Understood. I''ll send the label and dispatch the charcoal pair today by express at no charge.
Theo Marsh: Great — as long as they arrive before our office opening on the 20th.
Bree: Express takes two days, so you''re well within that.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What did Mr. Marsh order from Lumen & Co.?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Ceiling lights',false),(v_q,1,'B','Two desk lamps',true),
    (v_q,2,'C','A reception desk',false),(v_q,3,'D','Replacement bulbs',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What problem does Mr. Marsh report in the chat?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The lamps are the wrong colour',true),(v_q,1,'B','One lamp arrived broken',false),
    (v_q,2,'C','Only one lamp was delivered',false),(v_q,3,'D','He was charged for delivery',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What does Bree offer Mr. Marsh?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A full refund only',false),(v_q,1,'B','A free additional lamp',false),
    (v_q,2,'C','A partial refund or an exchange',true),(v_q,3,'D','Store credit toward a future order',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Why will Mr. Marsh pay nothing to return the white lamps?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','He is a loyalty-programme member',false),(v_q,1,'B','His order total was over $100',false),
    (v_q,2,'C','He paid for premium shipping',false),(v_q,3,'D','The company sent items he did not order',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'Why does Mr. Marsh need the lamps by 20 February?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','He is moving to a new house',false),(v_q,1,'B','His office opens on that date',true),
    (v_q,2,'C','A photo shoot is scheduled',false),(v_q,3,'D','The exchange offer expires then',false);

  -- ── Double passages 2: job advertisement + e-mail application (Q181–185) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 11, 'passage',
'TEXT 1 — JOB ADVERTISEMENT

ORCHARD LANE BOOKSHOP — ASSISTANT MANAGER (full-time)

Our award-winning independent bookshop seeks an assistant manager to join our team of seven.

Requirements:
• At least three years'' experience in retail
• Availability to work weekends on a rota basis
• Experience ordering stock from suppliers is an advantage

Responsibilities include opening and closing the shop, supervising weekend staff, and running our monthly author events. Salary based on experience.

Apply by 31 July with a cover letter and two references to the owner, Ms. Pilkington, at jobs@orchardlanebooks.com. Interviews will be held during the first week of August; the position begins 1 September.

TEXT 2 — E-MAIL

To: jobs@orchardlanebooks.com
From: Gareth Boon <g.boon@quickpost.net>
Subject: Application — Assistant Manager
Date: 28 July

Dear Ms. Pilkington,

Please accept my application for the assistant manager position. I have spent five years at Fenwick Stationers, the last two as shift supervisor, where I manage weekend rotas and place all stock orders with our twelve suppliers.

I am available to work weekends. One scheduling note: I will be out of town from 1 to 4 August for my sister''s wedding. If interviews are held that week, would it be possible to meet on the 5th or later? I would be sorry to miss the chance over a single date.

My cover letter and two references are attached. Thank you for your consideration.

Kind regards,
Gareth Boon')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What position is being advertised?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Bookshop owner',false),(v_q,1,'B','Sales intern',false),
    (v_q,2,'C','Assistant manager',true),(v_q,3,'D','Stock-room clerk',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is a stated requirement for the job?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A university degree',false),(v_q,1,'B','A driving licence',false),
    (v_q,2,'C','Experience in publishing',false),(v_q,3,'D','Availability to work weekends',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is suggested about Mr. Boon''s retail experience?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It exceeds the minimum required',true),(v_q,1,'B','It is mostly in publishing',false),
    (v_q,2,'C','It is limited to weekends',false),(v_q,3,'D','It was gained at a bookshop',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Why will Mr. Boon be unavailable in early August?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','He is starting another job',false),(v_q,1,'B','He will attend a family wedding',true),
    (v_q,2,'C','He is moving to a new city',false),(v_q,3,'D','He will be at a trade fair',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What does Mr. Boon request?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A higher starting salary',false),(v_q,1,'B','A part-time schedule',false),
    (v_q,2,'C','A tour of the bookshop',false),(v_q,3,'D','An interview later in the week',true);

  -- ── Triple passages 1: webpage + guest review + management response (Q186–190) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 12, 'passage',
'TEXT 1 — WEBPAGE

PINECREST LODGE — Lakeside rooms & suites, Alder Valley
All rates include our farmhouse breakfast. The lakeview spa is open daily 7 a.m.–9 p.m. Guests staying two nights or more enjoy complimentary canoe hire from our private jetty. Dinner at our restaurant, The Boathouse, is popular with non-residents as well as guests — reservations are strongly recommended. A free shuttle meets trains at Alder Station; please book it at least 24 hours in advance.

TEXT 2 — GUEST REVIEW (staymark.com)
★★★☆☆ — "Beautiful spot, two frustrations" — posted 2 August by D. Okonkwo
We spent three nights at Pinecrest Lodge. The lake is stunning, breakfast was the best I''ve had at any hotel, and the canoeing was a daily highlight. Two frustrations, though. We hadn''t realised the station shuttle needed booking a day ahead, and waited forty minutes for a taxi instead. And The Boathouse was fully booked both evenings we tried — odd to stay at a hotel and never manage to eat dinner in it. Hold a few tables for your own guests, perhaps?

TEXT 3 — MANAGEMENT RESPONSE
Reply from Pinecrest Lodge — 4 August
Thank you for this thoughtful review, Mr. Okonkwo. You are quite right on both counts. The shuttle booking requirement now appears in large print on every booking confirmation, and from 1 September The Boathouse will keep six tables each evening exclusively for lodge guests until 6 p.m. As you arrived by taxi through no fault of your own, we would like to refund your fare — please contact me directly at manager@pinecrestlodge.com. We hope to welcome you back to the valley soon.
— Sylvie Marchand, General Manager')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is offered to guests staying at least two nights?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Free canoe hire',true),(v_q,1,'B','A complimentary dinner',false),
    (v_q,2,'C','A late checkout',false),(v_q,3,'D','A spa discount',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Why did Mr. Okonkwo wait forty minutes at the station?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The restaurant was fully booked',false),(v_q,1,'B','His train arrived early',false),
    (v_q,2,'C','He had not reserved the shuttle in advance',true),(v_q,3,'D','His room was not ready',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What is suggested about Mr. Okonkwo''s stay?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','He paid extra to go canoeing',false),(v_q,1,'B','He qualified for free canoe hire',true),
    (v_q,2,'C','He skipped breakfast each morning',false),(v_q,3,'D','He arrived by rental car',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'What will The Boathouse do starting 1 September?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Close on weekday evenings',false),(v_q,1,'B','Extend its opening hours',false),
    (v_q,2,'C','Introduce a new menu',false),(v_q,3,'D','Reserve tables for lodge guests',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What does Ms. Marchand offer Mr. Okonkwo?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A refund of his taxi fare',true),(v_q,1,'B','A free spa treatment',false),
    (v_q,2,'C','A complimentary third night',false),(v_q,3,'D','A discount at The Boathouse',false);

  -- ── Triple passages 2: flyer + gift certificate + e-mail (Q191–195) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 13, 'passage',
'TEXT 1 — FLYER

THE SAFFRON KITCHEN COOKERY SCHOOL — Evening classes, Harborview
• ITALIAN CLASSICS — Tuesdays, 6–9 p.m.
• THAI STREET FOOD — Wednesdays, 6–9 p.m.
• THE ART OF PASTRY — Thursdays, 6–9 p.m.
All classes are hands-on, limited to twelve participants, and finish with dinner around our big table. $85 per person, ingredients included. Please book at least seven days in advance. Gift certificates are available and valid for twelve months. Free parking behind the building.

TEXT 2 — GIFT CERTIFICATE

THE SAFFRON KITCHEN — GIFT CERTIFICATE No. GC-2217
Issued to: Renata Olsen
From: Your colleagues at Driftwood Design — "Happy retirement, Renata!"
Value: any two evening classes
Expires: 30 November
Redeem online with the code on the reverse, or by phone at 555-0142.

TEXT 3 — E-MAIL

To: bookings@saffronkitchen.com
From: Renata Olsen <r.olsen@plummail.net>
Subject: Booking with certificate GC-2217
Date: 20 November

Hello,

I''d like to use my gift certificate for The Art of Pastry on Thursday 28 November and Thai Street Food on Wednesday 3 December. I''ve just noticed, however, that the certificate expires on 30 November — the second class falls three days after that. Could the certificate be extended, given that the December class is the earliest Thai session with space available?

Also, my daughter would like to join me at the pastry class. Could you add her as a paying participant?

Many thanks,
Renata Olsen')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'According to the flyer, what is included in the class fee?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A printed cookbook',false),(v_q,1,'B','A chef''s apron',false),
    (v_q,2,'C','A wine pairing',false),(v_q,3,'D','Ingredients and a shared dinner',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'Why did Ms. Olsen receive the gift certificate?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','She won a company competition',false),(v_q,1,'B','She is retiring from her job',true),
    (v_q,2,'C','It was a birthday present',false),(v_q,3,'D','She referred a new customer',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'What problem does Ms. Olsen mention in her e-mail?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The school has moved location',false),(v_q,1,'B','Both classes she wants are full',false),
    (v_q,2,'C','Her certificate expires before one of her chosen classes',true),(v_q,3,'D','Parking is no longer free',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'Which class does Ms. Olsen want to attend with her daughter?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The Art of Pastry',true),(v_q,1,'B','Thai Street Food',false),
    (v_q,2,'C','Italian Classics',false),(v_q,3,'D','A bread-making workshop',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What is suggested about Ms. Olsen''s booking for 28 November?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It falls after her certificate expires',false),(v_q,1,'B','It must be made by telephone',false),
    (v_q,2,'C','It meets the seven-day advance-booking requirement',true),(v_q,3,'D','It requires a second certificate',false);

  -- ── Triple passages 3: newsletter article + course schedule + e-mail (Q196–200) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 14, 'passage',
'TEXT 1 — COMPANY NEWSLETTER (extract)

BRAMFORD LOGISTICS MONTHLY — Introducing the Bramford Skills Academy
In October we launch the Bramford Skills Academy, a programme of short courses free to all employees. Courses take place during work hours with supervisor approval, and each is capped at fifteen participants. Employees who complete three courses within twelve months earn the Bramford Certificate, which will be formally recognised in annual performance reviews. Sign up through the intranet under "Academy". A new schedule will be published at the start of each month.

TEXT 2 — COURSE SCHEDULE, OCTOBER

• Spreadsheet Essentials — Mon 6 Oct, 9:00–12:00, Room 2A, Head Office
• Presenting with Confidence — Mon 13 Oct, 1:00–5:00, Auditorium, Head Office
• Negotiation Basics — Mon 20 Oct, 9:00–4:00, Harlow Conference Centre (off-site; lunch provided)
• Time Management — Mon 27 Oct, 2:00–4:00, online

TEXT 3 — E-MAIL

To: academy@bramfordlogistics.com
From: Pieter Vandenberg <p.vandenberg@bramfordlogistics.com>
Subject: October enrolment — two courses
Date: 29 September

Hello,

My supervisor has approved two courses for me in October: Spreadsheet Essentials and Negotiation Basics. Please enrol me in both.

One question about Negotiation Basics: I am based at the Eastgate depot, not Head Office. Will transport to the Harlow Conference Centre be arranged, or should I make my own way there?

Finally, I understand I need a third course for the certificate — could you tell me when the November schedule will be available?

Thanks very much,
Pieter Vandenberg
Warehouse Coordinator, Eastgate Depot')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', 'What is the purpose of the newsletter article?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To announce the opening of a new depot',false),(v_q,1,'B','To introduce a new chief executive',false),
    (v_q,2,'C','To announce an employee training programme',true),(v_q,3,'D','To report quarterly financial results',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', 'What is required to earn the Bramford Certificate?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Passing a supervisor''s examination',false),(v_q,1,'B','One full year of employment',false),
    (v_q,2,'C','Payment of a registration fee',false),(v_q,3,'D','Completing three courses within twelve months',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', 'Which course includes lunch?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Negotiation Basics',true),(v_q,1,'B','Spreadsheet Essentials',false),
    (v_q,2,'C','Presenting with Confidence',false),(v_q,3,'D','Time Management',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice', 'What does Mr. Vandenberg ask about?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Parking at Head Office',false),(v_q,1,'B','Transport to an off-site venue',true),
    (v_q,2,'C','The cost of the courses',false),(v_q,3,'D','Changing his work shift',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice', 'What is suggested about Mr. Vandenberg?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','He has already earned the certificate',false),(v_q,1,'B','He will attend the 13 October course',false),
    (v_q,2,'C','His supervisor refused his request',false),(v_q,3,'D','He will need one more course to earn the certificate',true);

END $$;
