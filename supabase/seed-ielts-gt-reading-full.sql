-- ============================================================
--  Full-length IELTS General Training Reading mock (40 marks)
-- ============================================================
--  Real GT structure: Section 1 = short everyday texts (14 marks),
--  Section 2 = workplace texts (13), Section 3 = one longer general-interest
--  text (13). Question mix: True/False/Not Given, gap fill, matching
--  statements/headings, multiple choice. mode=full_mock → the official GT
--  Reading band fires (raw /40 through the STRICTER GT band table).
--  60-minute timer. Part of set ielts-gt-mock-01. All content ORIGINAL.
--  Idempotent. Run AFTER add-practice-tests.sql + seed-test-scales-rubrics.sql
--  + add-test-sets.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-reading-mock-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-reading-mock-01', 'IELTS General Training — Reading Mock Test 1',
          'IELTS ジェネラル リーディング模試1', 'full_mock', 3600, true,
          'ielts-gt-mock-01', 'IELTS General Training — Mock Test 1', 'IELTS ジェネラル模試1', 1)
  RETURNING id INTO v_form;

  -- ===================== SECTION 1 (14 marks): everyday texts =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 1', 'Everyday texts',
          'Read the texts and answer Questions 1–14.', 0)
  RETURNING id INTO v_sec;

  -- ── Text 1: pool notice (Q1–7) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'GREENFIELD COMMUNITY POOL — INFORMATION FOR VISITORS

Opening hours: 6.30 am – 9.30 pm on weekdays; 8 am – 6 pm at weekends.

Adult entry costs £4.50. Children under 16 pay £2, and children under 4 swim free. A monthly pass costs £30 and includes all public sessions plus one free guest visit per month.

Lane swimming is reserved for adults before 8 am. On Wednesday evenings the main pool closes at 7 pm for swimming-club training; the small pool stays open as usual.

All children under 8 must be accompanied in the water by an adult. Lockers require a £1 coin, which is returned when you leave. Photography is not permitted anywhere in the building.

The café on the first floor serves hot food until 3 pm, and drinks and snacks until closing time.',
  'Questions 1–7 are about the notice.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'true_false_notgiven', 'auto_choice', 'Children under four can use the pool without paying.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', 'A monthly pass includes unlimited guest visits.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', 'The swimming club uses the main pool on Wednesday evenings.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', 'The café is run by the swimming club.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', 'Before ______, lane swimming is for adults only.', '{"accepted":["8 am","8am","8","8:00","8.00"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', 'Lockers need a £______ coin, which is given back.', '{"accepted":["1","one"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', 'Hot food is available in the café until ______.', '{"accepted":["3 pm","3pm","3","3:00","3.00"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ── Text 2: four cafés, matching statements (Q8–14) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 1, 'passage',
'FOUR LOCAL CAFÉS

A — HARBOUR VIEW
Open from 6 am, with a sea-facing terrace. Famous for its fresh fish lunches. Closes early, at 4 pm. Tables cannot be booked — just turn up.

B — THE BOOK NOOK
A quiet café inside a second-hand bookshop. No music is played. Free refills on filter coffee, and a poetry evening is held on the first Friday of every month. Please note: cash only.

C — CASA VERDE
A family-run café where every dish on the menu is vegetarian. There is seating in the garden and a play corner for small children. Open late, until 11 pm.

D — STAZIONE
Right beside the railway station, with a fast takeaway counter. Opens at 5.30 am on weekdays — the earliest in town. A loyalty card gives you every tenth coffee free. Standing room only inside.',
  'Questions 8–14: Which café (A–D) matches each statement? You may use any letter more than once.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 0, 'matching', 'auto_choice', 'Match each statement (Questions 8–14) with the correct café.',
     ('{"items":['
      || '{"id":"q8","text":"8. You can get a free drink after repeat visits."},'
      || '{"id":"q9","text":"9. This café does not accept card payments."},'
      || '{"id":"q10","text":"10. There is somewhere for small children to play."},'
      || '{"id":"q11","text":"11. This café opens earliest on weekdays."},'
      || '{"id":"q12","text":"12. You cannot reserve a table here."},'
      || '{"id":"q13","text":"13. You can listen to people reading aloud here once a month."},'
      || '{"id":"q14","text":"14. No meat is served here."}],'
      || '"match_options":[{"id":"A","text":"Harbour View"},{"id":"B","text":"The Book Nook"},{"id":"C","text":"Casa Verde"},{"id":"D","text":"Stazione"}],'
      || '"answer":{"q8":"D","q9":"B","q10":"C","q11":"D","q12":"A","q13":"B","q14":"C"}}')::jsonb, 7)
  RETURNING id INTO v_q;

  -- ===================== SECTION 2 (13 marks): workplace texts =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 2', 'Workplace texts',
          'Read the texts and answer Questions 15–27.', 1)
  RETURNING id INTO v_sec;

  -- ── Text 3: working-from-home policy (Q15–21) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'STAFF GUIDELINES: WORKING FROM HOME

Employees may work remotely for up to three days per week, subject to their manager''s approval. Requests should be made through the HR portal at least one week in advance.

During core hours (10 am to 4 pm), remote staff must be reachable by phone and online chat. Work involving client data may only be carried out on company laptops; the use of personal devices for client data is prohibited.

A home-office allowance of £200 per year is available for equipment such as desks, chairs and monitors. Receipts must be submitted to claim the allowance.

Staff in their first three months of employment are expected to work fully on site. All team members, wherever they normally work, attend the team meeting in person on Monday mornings.',
  'Questions 15–21 are about the staff guidelines.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'true_false_notgiven', 'auto_choice', 'Employees may work remotely up to three days a week.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', 'Remote-work requests must be made at least two weeks in advance.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', 'Personal laptops may be used for client data.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', 'The company pays for staff home internet connections.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', 'The yearly home-office allowance is £______.', '{"accepted":["200","two hundred"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', 'Core hours run from 10 am to ______.', '{"accepted":["4 pm","4pm","4","4:00","4.00"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', 'New staff work fully on site for their first ______ months.', '{"accepted":["three","3"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ── Text 4: fire safety procedures (Q22–27) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 1, 'passage',
'FIRE SAFETY PROCEDURES — BRIGHTWELL OFFICE PARK

The fire alarm is tested every Tuesday at 9 am; this short test does not require any action. If the alarm sounds continuously at any other time, leave the building immediately by the nearest staircase. Do not use the lifts.

The assembly point is Car Park C, behind the main building. Fire wardens, who wear orange vests, will check that floors are clear. Visitors are the responsibility of the member of staff hosting them.

Fire doors close automatically and must never be propped open. First-aid kits are located at each reception desk. Anything blocking an exit should be reported to the facilities team at once.',
  'Questions 22–27 are about the fire safety procedures.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'single_choice', 'auto_choice', '22. If the alarm sounds continuously, staff should', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','leave the building using the stairs.',true),(v_q,1,'B','take the nearest lift down.',false),(v_q,2,'C','wait at their desk for instructions.',false),(v_q,3,'D','go to reception for a first-aid kit.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'single_choice', 'auto_choice', '23. During an evacuation, visitors are looked after by', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','the fire wardens.',false),(v_q,1,'B','the reception team.',false),(v_q,2,'C','the staff member hosting them.',true),(v_q,3,'D','the facilities team.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'single_choice', 'auto_choice', '24. The weekly alarm test happens on', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Monday mornings.',false),(v_q,1,'B','Tuesday mornings.',true),(v_q,2,'C','Tuesday afternoons.',false),(v_q,3,'D','Friday mornings.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 3, 'gap_fill', 'auto_text', '25. The assembly point is Car Park ______.', '{"accepted":["c"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', '26. Fire wardens can be recognised by their ______ vests.', '{"accepted":["orange"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', '27. Blocked exits must be reported to the ______ team.', '{"accepted":["facilities"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ===================== SECTION 3 (13 marks): longer text =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 3', 'The quiet comeback of the night train',
          'Read the passage and answer Questions 28–40.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'A — For most of the twentieth century, overnight sleeper trains were how Europeans crossed their continent. Business travellers boarded in one capital after dinner and stepped out in another before breakfast. But from the 1990s onwards, budget airlines offered faster journeys at a fraction of the price, and one by one the great night routes were withdrawn. By the early 2010s, many observers considered the sleeper train a museum piece.

B — Then, against most predictions, the decline reversed. From the mid-2010s, several national rail operators began relaunching night services, ordering new sleeping carriages for routes that had been closed only a few years earlier, and new private companies entered the market with overnight routes of their own. What had looked like a managed retreat turned into a small but unmistakable revival.

C — The reasons travellers give are consistent. Many cite climate concerns: a long train journey typically produces a small fraction of the emissions of the same trip by air. Others point to convenience of a different kind — no airport transfers, no security queues, and arrival in the city centre early in the morning, rested and in time for a meeting. Because a berth doubles as accommodation, the ticket effectively replaces a hotel night as well as a flight.

D — The economics, however, remain stubbornly difficult. A sleeping carriage carries far fewer passengers than a seated one, yet costs more to build and staff. Trains pay access fees for every kilometre of track they use, often to several different countries in a single night, and an operator can sell each berth only once per evening, while an airline can fly the same aircraft several times a day.

E — Operators are responding with design. The newest carriages replace shared compartments with compact pod-style berths for solo travellers, private cabins with their own showers, and app-based booking. Several operators have introduced women-only compartments, and loading areas for bicycles have become standard on many routes.

F — Few analysts expect night trains to replace short-haul flying altogether. Their future depends heavily on track fees and on continued public support for international rail. But on routes of roughly 800 to 1,500 kilometres — too long to drive, short enough to sleep through — the night train has re-established itself as a realistic alternative rather than a nostalgic curiosity.',
  '')
  RETURNING id INTO v_grp;

  -- Q28–33: matching headings (6 marks)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 0, 'matching', 'auto_choice', 'Questions 28–33: Choose the correct heading for each paragraph (A–F) from the list (i–viii).',
     ('{"items":[{"id":"A","text":"Paragraph A"},{"id":"B","text":"Paragraph B"},{"id":"C","text":"Paragraph C"},{"id":"D","text":"Paragraph D"},{"id":"E","text":"Paragraph E"},{"id":"F","text":"Paragraph F"}],'
      || '"match_options":[{"id":"i","text":"Why passengers are choosing night trains again"},{"id":"ii","text":"The decline of a travel tradition"},{"id":"iii","text":"New designs for modern travellers"},{"id":"iv","text":"The financial challenges of overnight rail"},{"id":"v","text":"A revival led by rail operators"},{"id":"vi","text":"A modest but real future"},{"id":"vii","text":"Safety problems on board"},{"id":"viii","text":"Competition between rail companies"}],'
      || '"answer":{"A":"ii","B":"v","C":"i","D":"iv","E":"iii","F":"vi"}}')::jsonb, 6)
  RETURNING id INTO v_q;

  -- Q34–37: True/False/Not Given
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', '34. Budget airlines contributed to the closure of sleeper routes.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', '35. Sleeping carriages are cheaper for operators to run than seated ones.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', '36. Some new carriages include private showers.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 4, 'true_false_notgiven', 'auto_choice', '37. Governments have agreed to abolish track access fees for night trains.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  -- Q38–39: multiple choice
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 5, 'single_choice', 'auto_choice', '38. According to the passage, one key advantage over flying is', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','arriving in the city centre in the morning.',true),(v_q,1,'B','tickets that are always cheaper.',false),(v_q,2,'C','shorter total journey times.',false),(v_q,3,'D','a larger luggage allowance.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 6, 'single_choice', 'auto_choice', '39. The writer''s overall view is that night trains', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','will soon replace short-haul flights entirely.',false),(v_q,1,'B','are a realistic option on medium-distance routes.',true),(v_q,2,'C','are likely to disappear again within a decade.',false),(v_q,3,'D','succeed only where governments own the railways.',false);

  -- Q40: gap fill
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 7, 'gap_fill', 'auto_text', '40. Night trains work best on routes of roughly 800 to ______ kilometres.', '{"accepted":["1500","1,500"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-reading-mock-01 (40 marks: S1 14, S2 13, S3 13).';
END $$;
