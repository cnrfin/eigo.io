-- ============================================================
--  Full-length IELTS General Training Reading MOCK 3 (40 marks)
-- ============================================================
--  Third GT paper, all-new content (Mock 1: pool / cafés / WFH / fire safety /
--  night trains. Mock 2: recycling / markets / induction / job ad /
--  supermarkets). Section 1 = everyday texts (14), Section 2 = workplace
--  texts (13), Section 3 = one longer text (13). mode=full_mock → official GT
--  Reading band. 60-minute timer. Part of set ielts-gt-mock-03.
--  Seeded UNPUBLISHED for draft review. All content ORIGINAL. Idempotent.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-reading-mock-03';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-reading-mock-03', 'IELTS General Training — Reading Mock Test 3',
          'IELTS ジェネラル リーディング模試3', 'full_mock', 3600, false,
          'ielts-gt-mock-03', 'IELTS General Training — Mock Test 3', 'IELTS ジェネラル模試3', 1)
  RETURNING id INTO v_form;

  -- ===================== SECTION 1 (14 marks): everyday texts =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 1', 'Everyday texts',
          'Read the texts and answer Questions 1–14.', 0)
  RETURNING id INTO v_sec;

  -- ── Text 1: cinema notice (Q1–7) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'HILLSIDE CINEMA — TICKETS AND SCREENINGS

Standard tickets cost £9.50. Under-14s and over-65s pay £6. On Mondays, ALL tickets are £5.

Booking online carries a fee of 75p per ticket. There is no fee for tickets bought at the box office.

Doors open 30 minutes before each screening. Latecomers may be admitted during the advertisements, but once the film itself has started, entry is not permitted.

Only food and drink bought at the cinema may be consumed inside the screens.

The last screening begins at 9.45 pm. Parking in the multi-storey next door is free after 6 pm for cinema customers.',
  'Questions 1–7 are about the notice.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'true_false_notgiven', 'auto_choice', '1. On Mondays, every ticket costs £5.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', '2. Buying tickets at the box office costs extra.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', '3. Latecomers can enter at any point during the film.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', '4. The cinema offers a student discount.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', '5. The online booking fee is ______p per ticket.', '{"accepted":["75","seventy-five","seventy five"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', '6. Doors open ______ minutes before each screening.', '{"accepted":["30","thirty"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', '7. Parking is free for customers after ______ pm.', '{"accepted":["6","six"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ── Text 2: four coach day-trips, matching statements (Q8–14) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 1, 'passage',
'FOUR COACH DAY-TRIPS

A — KINGSWOOD CASTLE
Departs 8 am — our earliest start. Entry to the castle and a one-hour guided tour are included. Please note the visit involves a long, steep walk up to the gatehouse; sensible shoes are essential.

B — ST AGNES BAY
A relaxed day in a beautiful fishing village, with a traditional fish-and-chips lunch included in the price. Runs twice a week, on Tuesdays and Saturdays.

C — FUNLAND THEME PARK
All rides are included in the ticket, though some have height restrictions for younger children. The coach returns at 8 pm — later than any of our other trips.

D — MELFORD MARKET TOWN
Visit the famous Thursday antiques market. An optional river cruise is available at extra cost. The shortest journey we offer: under an hour each way.',
  'Questions 8–14: Which trip (A–D) matches each statement? You may use any letter more than once.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 0, 'matching', 'auto_choice', 'Match each statement (Questions 8–14) with the correct trip.',
     ('{"items":['
      || '{"id":"q8","text":"8. This trip leaves earliest in the morning."},'
      || '{"id":"q9","text":"9. A meal is included in the price."},'
      || '{"id":"q10","text":"10. Visitors can pay extra for a boat trip."},'
      || '{"id":"q11","text":"11. The visit includes a steep walk."},'
      || '{"id":"q12","text":"12. This trip returns latest in the evening."},'
      || '{"id":"q13","text":"13. It runs on two days each week."},'
      || '{"id":"q14","text":"14. Some attractions have height limits."}],'
      || '"match_options":[{"id":"A","text":"Kingswood Castle"},{"id":"B","text":"St Agnes Bay"},{"id":"C","text":"Funland Theme Park"},{"id":"D","text":"Melford Market Town"}],'
      || '"answer":{"q8":"A","q9":"B","q10":"D","q11":"A","q12":"C","q13":"B","q14":"C"}}')::jsonb, 7)
  RETURNING id INTO v_q;

  -- ===================== SECTION 2 (13 marks): workplace texts =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 2', 'Workplace texts',
          'Read the texts and answer Questions 15–27.', 1)
  RETURNING id INTO v_sec;

  -- ── Text 3: annual leave & sickness policy (Q15–21) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'ANNUAL LEAVE AND SICKNESS ABSENCE — STAFF POLICY

Full-time staff receive 25 days of paid leave per year, in addition to public holidays.

Leave must be requested through the staff portal at least two weeks before the first day requested. No more than ten working days may be taken at once without a director''s approval.

Up to five unused days may be carried into the following year. Carried-over days must be used by the end of March, or they are lost.

If you are unwell, telephone your line manager before 9.30 am on EACH day of absence. Emails and text messages are not accepted. For absences of more than seven days, a doctor''s note is required.',
  'Questions 15–21 are about the staff policy.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'true_false_notgiven', 'auto_choice', '15. Full-time staff receive paid public holidays on top of their 25 days'' leave.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', '16. Leave requests are made by emailing your manager.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', '17. Staff may carry any number of unused days into the next year.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', '18. Part-time staff receive leave in proportion to their hours.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', '19. Requests must be made at least ______ weeks in advance.', '{"accepted":["2","two"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', '20. Carried-over days must be used by the end of ______.', '{"accepted":["march"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', '21. A doctor''s note is required for absences of more than ______ days.', '{"accepted":["7","seven"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ── Text 4: expenses procedure (Q22–27) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 1, 'passage',
'CLAIMING WORK EXPENSES

Claims are submitted monthly through the finance app, by the 5th of the following month. Photograph each receipt and attach it to the claim; original receipts may be requested for audit. Approved claims are paid with your next salary.

Travel: standard-class rail fares are refunded in full. Taxis may be claimed only when no public transport is available, and never for journeys of under two miles. Car mileage is paid at 45p per mile.

Meals: when away from the office for a full day, up to £12 may be claimed for lunch. Alcohol is never refunded.',
  'Questions 22–27 are about the expenses procedure.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'single_choice', 'auto_choice', '22. Expense claims must be submitted', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','by the 5th of the following month.',true),(v_q,1,'B','at the end of each week.',false),(v_q,2,'C','within one year.',false),(v_q,3,'D','before the journey takes place.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'single_choice', 'auto_choice', '23. Taxi fares may be claimed', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','for any work journey.',false),(v_q,1,'B','only when no public transport is available.',true),(v_q,2,'C','for journeys under two miles.',false),(v_q,3,'D','only by managers.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'single_choice', 'auto_choice', '24. Approved claims are paid', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','in cash from reception.',false),(v_q,1,'B','within 48 hours.',false),(v_q,2,'C','with the next salary.',true),(v_q,3,'D','at the end of the year.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 3, 'gap_fill', 'auto_text', '25. Car mileage is paid at ______p per mile.', '{"accepted":["45","forty-five","forty five"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', '26. Up to £______ may be claimed for lunch on a full day away.', '{"accepted":["12","twelve"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', '27. ______ is never refunded.', '{"accepted":["alcohol"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ===================== SECTION 3 (13 marks): longer text =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 3', 'The box that changed the world',
          'Read the passage and answer Questions 28–40.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'A — Until the middle of the twentieth century, moving goods by sea was slow, expensive and chaotic. Every sack, barrel and crate was carried on and off ships by hand, by large gangs of dockworkers. A vessel could spend more time tied up in port being loaded than it spent crossing the ocean, and theft and damage were so common that insurers simply assumed a portion of every cargo would be lost.

B — The man who changed this was not a shipping magnate but a road haulier. Malcom McLean, who owned a trucking company in North Carolina, reasoned that if goods were packed once into a strong metal box, the box itself could be lifted between truck, train and ship without anyone touching the contents. In 1956 he proved it, sending a converted tanker, the Ideal X, from Newark to Houston with fifty-eight such boxes on its deck. Loading her had cost a fraction of the usual price per ton.

C — The idea only worked at scale once everyone agreed what a container was. During the 1960s, after years of argument, the industry settled on standard lengths — twenty and forty feet — and standard corner fittings, so that any crane, ship, lorry or railway wagon in the world could handle any container. That agreement, dull as it sounds, is what made the modern system possible.

D — The consequences for ports were dramatic. Loading work that had occupied hundreds of men for a week could now be done by a handful of crane operators in hours, and the great dockside workforces shrank accordingly. Old harbours in city centres, too shallow and cramped for the new ships, fell quiet, while trade moved to vast deep-water terminals built far from town. The ships themselves grew relentlessly: the largest now carry more than twenty thousand boxes.

E — For shoppers, the effect has been to make distance almost irrelevant. Sea transport became so cheap that it often costs less to ship a television across an ocean than to drive it the last few miles to a customer''s door. Factories no longer need to stand near their markets, and the parts of a single product may cross the sea several times before it is finished.

F — The container age has its problems. Because trade is unbalanced, empty boxes pile up in some countries while others run short. Sealed containers are difficult to inspect, which smugglers have always understood. And the work of the ports continues to pass from people to machines, as terminals automate crane after crane. Yet the box itself has barely changed in nearly seventy years — a reminder that the simplest ideas can rearrange the world.',
  '')
  RETURNING id INTO v_grp;

  -- Q28–33: matching headings (6 marks)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 0, 'matching', 'auto_choice', 'Questions 28–33: Choose the correct heading for each paragraph (A–F) from the list (i–viii).',
     ('{"items":[{"id":"A","text":"Paragraph A"},{"id":"B","text":"Paragraph B"},{"id":"C","text":"Paragraph C"},{"id":"D","text":"Paragraph D"},{"id":"E","text":"Paragraph E"},{"id":"F","text":"Paragraph F"}],'
      || '"match_options":[{"id":"i","text":"A trucking man''s simple idea"},{"id":"ii","text":"Agreeing on a worldwide standard"},{"id":"iii","text":"Slow, costly and chaotic: trade before the box"},{"id":"iv","text":"New homes and offices made from old containers"},{"id":"v","text":"How ports and their workers were transformed"},{"id":"vi","text":"Cheap distance and global factories"},{"id":"vii","text":"Remaining problems and a changeless design"},{"id":"viii","text":"The invention of the dockside crane"}],'
      || '"answer":{"A":"iii","B":"i","C":"ii","D":"v","E":"vi","F":"vii"}}')::jsonb, 6)
  RETURNING id INTO v_q;

  -- Q34–37: True/False/Not Given
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', '34. Before containers, ships could spend longer in port than at sea.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', '35. McLean spent his early career in the shipping industry.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', '36. Standard containers can be carried by ships, lorries and trains.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 4, 'true_false_notgiven', 'auto_choice', '37. Most of the world''s containers are manufactured in one country.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  -- Q38–39: multiple choice
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 5, 'single_choice', 'auto_choice', '38. The Ideal X was significant because it', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','made the first commercial container voyage.',true),(v_q,1,'B','was the largest ship of its time.',false),(v_q,2,'C','was the first ship built of metal.',false),(v_q,3,'D','crossed the Atlantic in record time.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 6, 'single_choice', 'auto_choice', '39. According to the passage, one continuing problem is that', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','empty containers gather where trade is unbalanced.',true),(v_q,1,'B','containers have become too expensive to build.',false),(v_q,2,'C','ships are becoming smaller.',false),(v_q,3,'D','dock work cannot be automated.',false);

  -- Q40: gap fill
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 7, 'gap_fill', 'auto_text', '40. Standard containers come in twenty-foot and ______-foot lengths.', '{"accepted":["40","forty"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-reading-mock-03 (40 marks: S1 14, S2 13, S3 13; UNPUBLISHED).';
END $$;
