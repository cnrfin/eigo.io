-- ============================================================
--  Full-length IELTS General Training Reading MOCK 2 (40 marks)
-- ============================================================
--  Second GT paper, all-new content (Mock 1: pool notice / cafés / WFH policy /
--  fire safety / night trains). Section 1 = everyday texts (14 marks),
--  Section 2 = workplace texts (13), Section 3 = one longer text (13).
--  Question mix: True/False/Not Given, gap fill, matching statements/headings,
--  multiple choice. mode=full_mock → official GT Reading band. 60-minute timer.
--  Part of set ielts-gt-mock-02. Seeded UNPUBLISHED for draft review.
--  All content ORIGINAL. Idempotent.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-gt-reading-mock-02';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-general';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-general not found.'; END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'ielts-gt-reading-mock-02', 'IELTS General Training — Reading Mock Test 2',
          'IELTS ジェネラル リーディング模試2', 'full_mock', 3600, false,
          'ielts-gt-mock-02', 'IELTS General Training — Mock Test 2', 'IELTS ジェネラル模試2', 1)
  RETURNING id INTO v_form;

  -- ===================== SECTION 1 (14 marks): everyday texts =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 1', 'Everyday texts',
          'Read the texts and answer Questions 1–14.', 0)
  RETURNING id INTO v_sec;

  -- ── Text 1: recycling notice (Q1–7) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'ELM COURT APARTMENTS — WASTE AND RECYCLING

General waste is collected every Tuesday, and recycling every Friday. All bins must be placed outside the rear entrance by 7 am on collection day.

Glass is NOT collected from the building. Please take bottles and jars to the bottle bank in the supermarket car park on Forest Road.

Large items such as furniture and mattresses: residents may book two free collections per year through the council website. Additional collections cost £15 each.

Batteries and electrical items must never be placed in household bins; a battery box is located in the entrance hall.

Garden waste: green bags are available from the building manager at £1 each. Bags left out on the wrong day will not be collected.',
  'Questions 1–7 are about the notice.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'true_false_notgiven', 'auto_choice', '1. Recycling is collected once a week.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', '2. Glass bottles are collected from outside the building.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', '3. Every large-item collection must be paid for.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', '4. The bins are checked by security cameras.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', '5. Bins must be outside by ______ on collection day.', '{"accepted":["7 am","7am","7","7:00","7.00"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', '6. The bottle bank is in the ______ car park.', '{"accepted":["supermarket"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', '7. Green garden-waste bags cost £______ each.', '{"accepted":["1","one"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ── Text 2: four weekend markets, matching statements (Q8–14) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 1, 'passage',
'FOUR WEEKEND MARKETS

A — RIVERSIDE FARMERS'' MARKET
Saturdays only, on the green by the bridge. Fresh fruit, vegetables, cheese and bread direct from local farms. Free parking in the school yard opposite. Note the early finish: stalls pack up at 1 pm sharp.

B — THE OLD YARD
Antiques, vintage clothing and second-hand furniture, every Sunday. Haggling over prices is expected — sellers enjoy it. A cash machine is available by the gate.

C — GREENHILL CRAFT FAIR
Handmade gifts, pottery and jewellery from over forty local makers. Short workshops run all day, where visitors can try a craft themselves. Held INDOORS in the Greenhill Hall, so it runs whatever the weather. Entry £2, under-16s free.

D — STATION SQUARE STREET FOOD
Saturday and Sunday evenings, from 5 pm until late. Dishes from more than twenty countries, with live music from 7 pm. Please note: all stalls are CARD ONLY — no cash is accepted anywhere on the square.',
  'Questions 8–14: Which market (A–D) matches each statement? You may use any letter more than once.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 0, 'matching', 'auto_choice', 'Match each statement (Questions 8–14) with the correct market.',
     ('{"items":['
      || '{"id":"q8","text":"8. You can park without paying."},'
      || '{"id":"q9","text":"9. Visitors can take part in practical sessions."},'
      || '{"id":"q10","text":"10. Negotiating prices is normal here."},'
      || '{"id":"q11","text":"11. This market finishes earliest in the day."},'
      || '{"id":"q12","text":"12. You cannot pay with cash."},'
      || '{"id":"q13","text":"13. It takes place whatever the weather."},'
      || '{"id":"q14","text":"14. Food from many different countries is sold."}],'
      || '"match_options":[{"id":"A","text":"Riverside Farmers'' Market"},{"id":"B","text":"The Old Yard"},{"id":"C","text":"Greenhill Craft Fair"},{"id":"D","text":"Station Square Street Food"}],'
      || '"answer":{"q8":"A","q9":"C","q10":"B","q11":"A","q12":"D","q13":"C","q14":"D"}}')::jsonb, 7)
  RETURNING id INTO v_q;

  -- ===================== SECTION 2 (13 marks): workplace texts =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 2', 'Workplace texts',
          'Read the texts and answer Questions 15–27.', 1)
  RETURNING id INTO v_sec;

  -- ── Text 3: new-staff induction programme (Q15–21) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'NEW STAFF: YOUR INDUCTION PROGRAMME

All new employees attend a two-day induction during their first week.

Day one covers a tour of the building, photographs for ID badges, and IT account setup. Please bring your passport or driving licence — one of these is required.

Day two includes health and safety training and fire procedures. The data-protection module is completed online, in your own time, within your first two weeks.

Every new employee is paired with a "buddy" — an experienced colleague from a different team — for their first month. Your buddy is your first port of call for everyday questions.

Lunch is provided on both induction days. The dress code throughout the company is smart casual.

Your probation period lasts six months, with a review meeting after three.',
  'Questions 15–21 are about the induction programme.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'true_false_notgiven', 'auto_choice', '15. Induction takes place during the first week of employment.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', '16. New staff must bring two forms of identification.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', '17. The data-protection module is taught in a classroom.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', '18. Buddies receive extra pay for the role.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', '19. Your buddy comes from a different ______.', '{"accepted":["team"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', '20. The probation period lasts ______ months.', '{"accepted":["6","six"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', '21. The first review meeting happens after ______ months.', '{"accepted":["3","three"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ── Text 4: job advertisement (Q22–27) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 1, 'passage',
'CUSTOMER SERVICE ASSISTANT — LAKESIDE GARDEN CENTRE

Part-time: 16 hours per week, which must include at least one weekend day.

Pay: £11.40 per hour, plus a staff discount of 20% on everything in store.

We are looking for someone with a friendly manner who enjoys helping customers. Experience on a till is helpful but not essential — full training is given. Applicants must be 18 or over, as the role involves selling licensed garden products.

How to apply: complete the online form on our website. Please do NOT post or email CVs — they will not be considered. Closing date: 14 March. Interviews will be held in the week beginning 24 March, and the successful applicant will start in April.',
  'Questions 22–27 are about the job advertisement.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'single_choice', 'auto_choice', '22. The working hours must include', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','at least one weekend day.',true),(v_q,1,'B','every Saturday and Sunday.',false),(v_q,2,'C','evening shifts only.',false),(v_q,3,'D','public holidays.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'single_choice', 'auto_choice', '23. Experience of working on a till is', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','essential for all applicants.',false),(v_q,1,'B','helpful but not required.',true),(v_q,2,'C','not mentioned.',false),(v_q,3,'D','only needed at weekends.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'single_choice', 'auto_choice', '24. Applications must be made', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','by posting a CV.',false),(v_q,1,'B','by email.',false),(v_q,2,'C','through the website.',true),(v_q,3,'D','in person at the garden centre.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 3, 'gap_fill', 'auto_text', '25. Staff receive a discount of ______ %.', '{"accepted":["20","twenty"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', '26. The closing date for applications is 14 ______.', '{"accepted":["march"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', '27. The successful applicant will start work in ______.', '{"accepted":["april"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ===================== SECTION 3 (13 marks): longer text =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Section 3', 'Why supermarkets are designed the way they are',
          'Read the passage and answer Questions 28–40.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
'A — Walk into any large supermarket and very little of what you see is accidental. The width of the aisles, the music, the smell near the entrance, even the size of the trolleys — all of it reflects decades of research into how shoppers behave. A supermarket is best understood not as a warehouse with a door, but as a carefully engineered environment designed to keep us inside for longer and persuade us to buy more.

B — It was not always this way. Until the early twentieth century, customers handed a list to a clerk, who fetched each item from shelves behind the counter. The change came in 1916, when an American grocer, Clarence Saunders, opened a store in which shoppers walked the aisles and picked up goods for themselves. Self-service shopping cut staff costs dramatically — and, just as importantly, it put products within reach of the customer''s hands for the first time.

C — Out of that simple change grew a set of techniques that are now used worldwide. Everyday essentials such as milk and bread are placed at the back of the store, so that shoppers must walk past hundreds of other products to reach them. The most profitable items sit on shelves at eye level — positions that manufacturers pay extra for — while cheaper alternatives are placed near the floor. Displays at the end of each aisle showcase whatever the store most wants to sell that week.

D — Other techniques work on the senses. Many stores position the bakery near the entrance because the smell of fresh bread makes customers feel hungry, and hungry shoppers buy more food. Slow background music has been shown to make people walk more slowly and spend more time — and money — in the store. Even the steady growth in the size of shopping trolleys plays a part: a half-empty trolley quietly invites us to fill it.

E — The persuasion continues right to the end of the visit. The area beside the checkout, where customers must stand and wait, is stocked with inexpensive items that are easy to add at the last moment. Loyalty cards, meanwhile, reward the shopper with discounts while rewarding the store with something more valuable: detailed data about what each neighbourhood buys, which is used to adjust store layouts and offers.

F — Yet the science of selling may be reaching its limits. As more shopping moves online, some chains have begun simplifying their store layouts rather than complicating them, after research suggested that customers who feel manipulated or cannot find what they need quickly take their business elsewhere. The supermarket of the future, some analysts believe, will compete not by holding shoppers captive, but by getting them out of the door faster than the competition.',
  '')
  RETURNING id INTO v_grp;

  -- Q28–33: matching headings (6 marks)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 0, 'matching', 'auto_choice', 'Questions 28–33: Choose the correct heading for each paragraph (A–F) from the list (i–viii).',
     ('{"items":[{"id":"A","text":"Paragraph A"},{"id":"B","text":"Paragraph B"},{"id":"C","text":"Paragraph C"},{"id":"D","text":"Paragraph D"},{"id":"E","text":"Paragraph E"},{"id":"F","text":"Paragraph F"}],'
      || '"match_options":[{"id":"i","text":"How self-service shopping began"},{"id":"ii","text":"Appealing to the shopper''s senses"},{"id":"iii","text":"An environment where nothing is left to chance"},{"id":"iv","text":"Guiding shoppers around the store"},{"id":"v","text":"Why simpler stores may be the future"},{"id":"vi","text":"The last chance to sell — and to learn"},{"id":"vii","text":"Training staff to serve customers"},{"id":"viii","text":"The rising cost of building supermarkets"}],'
      || '"answer":{"A":"iii","B":"i","C":"iv","D":"ii","E":"vi","F":"v"}}')::jsonb, 6)
  RETURNING id INTO v_q;

  -- Q34–37: True/False/Not Given
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', '34. Before 1916, shop staff collected goods for customers.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', '35. Manufacturers pay more for shelf positions at eye level.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', '36. Slow music makes customers leave the store more quickly.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 4, 'true_false_notgiven', 'auto_choice', '37. Most supermarkets publish their research on shopper behaviour.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  -- Q38–39: multiple choice
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 5, 'single_choice', 'auto_choice', '38. Essentials such as milk are placed at the back of the store so that customers', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','pass many other products on the way.',true),(v_q,1,'B','can find them more easily.',false),(v_q,2,'C','spend less time at the checkout.',false),(v_q,3,'D','use larger trolleys.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 6, 'single_choice', 'auto_choice', '39. According to the passage, some chains are simplifying their layouts because', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','frustrated customers shop elsewhere.',true),(v_q,1,'B','simpler stores are cheaper to build.',false),(v_q,2,'C','governments now require it.',false),(v_q,3,'D','loyalty cards are no longer popular.',false);

  -- Q40: gap fill
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 7, 'gap_fill', 'auto_text', '40. The first self-service store opened in ______.', '{"accepted":["1916"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-gt-reading-mock-02 (40 marks: S1 14, S2 13, S3 13; UNPUBLISHED).';
END $$;
