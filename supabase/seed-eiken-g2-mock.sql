-- ============================================================
--  EIKEN Grade 2 — Mock Test 1: READING + WRITING + SPEAKING
-- ============================================================
--  2024 renewal format (CEFR B1), set 'eiken-g2-mock-01':
--    READING (31 Q, 55 min):
--      大問1  — 17 short-sentence vocab/grammar gaps (incl. phrasal verbs/idioms)
--      大問2  — TWO passages, each with 3 gap-fill-in-context blanks (6 Q)
--      大問3A — e-mail, 3 questions
--      大問3B — expository passage, 5 questions
--    WRITING (2 tasks, 30 min): 要約 — summarize an original ~150-word passage
--      in 45-55 words (new 2024 format) + 意見文 — opinion essay, 80-100 words,
--      agree/disagree with TWO reasons.
--    SPEAKING (interview, 5 tasks incl. 音読, untimed): card with a ~60-word
--      passage + ONE three-panel illustration (the story for question No. 2).
--      The image is attached separately: see supabase/EIKEN-G2-IMAGES.md +
--      scripts/attach-eiken-g2-images.mjs. payload.reference tells the AI
--      grader what the panels show (never displayed to the student).
--    The listening form of this set is seeded by
--      scripts/seed-eiken-g2-listening-mock.mjs (set_order 2).
--  All three forms are seeded UNPUBLISHED (admin draft preview).
--  All content is ORIGINAL practice material at B1 level.
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
    ('eiken-g2-reading-mock-01', 'eiken-g2-writing-mock-01', 'eiken-g2-speaking-mock-01');

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'eiken-grade-2';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track eiken-grade-2 not found — run add-practice-tests.sql first.';
  END IF;
  SELECT id INTO v_rub_w FROM rubrics WHERE track_id = v_track AND skill = 'writing'  AND name = 'EIKEN Writing'  LIMIT 1;
  SELECT id INTO v_rub_s FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'EIKEN Speaking' LIMIT 1;
  IF v_rub_w IS NULL OR v_rub_s IS NULL THEN
    RAISE EXCEPTION 'EIKEN rubrics not found — run seed-test-scales-rubrics.sql first.';
  END IF;

  -- ═══════════════════════════ READING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-g2-reading-mock-01', 'EIKEN Grade 2 — Reading Mock Test 1',
          '英検2級 リーディング模試1', 'full_mock', 3300, false,
          'eiken-g2-mock-01', 'EIKEN Grade 2 — Mock Test 1', '英検2級 模試1', 0)
  RETURNING id INTO v_form;

  -- ──────────── 大問1: 短文の語句空所補充 (Q1–17) ────────────
  -- Keys: B C A D C B D A C A D B C D A B C  (A:4 B:4 C:5 D:4, no letter 3× in a row)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問1', 'Vocabulary & Grammar',
          'Choose the best word or phrase (A–D) to complete each sentence.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none')
  RETURNING id INTO v_grp;

  -- Q1 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'The city decided to (     ) a survey to find out how residents feel about the new bus routes. The results will be announced in June.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','discount',false),(v_q,1,'B','conduct',true),(v_q,2,'C','punish',false),(v_q,3,'D','translate',false);

  -- Q2 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'A: Did you hear that the factory by the river is going to close?' || chr(10) ||
    'B: Yes. More than two hundred people will lose their jobs. The news came as a complete (     ) to everyone in town.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','profit',false),(v_q,1,'B','courage',false),(v_q,2,'C','shock',true),(v_q,3,'D','degree',false);

  -- Q3 (A) — phrasal verb
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'The meeting was going well until the two managers started arguing loudly. In the end, the president had to (     ) and calm them down.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','step in',true),(v_q,1,'B','show off',false),(v_q,2,'C','pass away',false),(v_q,3,'D','break out',false);

  -- Q4 (D) — grammar: present progressive passive
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice',
    'A new sports stadium (     ) in the city center now. It will be completed in two years.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','is building',false),(v_q,1,'B','has built',false),(v_q,2,'C','was built',false),(v_q,3,'D','is being built',true);

  -- Q5 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice',
    'Lisa''s presentation about the new project was so (     ) that even people from other departments came to listen and asked many questions afterward.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','temporary',false),(v_q,1,'B','anxious',false),(v_q,2,'C','impressive',true),(v_q,3,'D','equal',false);

  -- Q6 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 5, 'single_choice', 'auto_choice',
    'Doctors say that getting enough sleep is (     ) for good health, especially for students preparing for exams.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','harmful',false),(v_q,1,'B','essential',true),(v_q,2,'C','legal',false),(v_q,3,'D','brief',false);

  -- Q7 (D) — phrasal verb
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 6, 'single_choice', 'auto_choice',
    'Because of rising costs, the company had no choice but to (     ) its plan to build a second office in the city.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','hand in',false),(v_q,1,'B','look up to',false),(v_q,2,'C','get along with',false),(v_q,3,'D','call off',true);

  -- Q8 (A) — grammar: second conditional
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 7, 'single_choice', 'auto_choice',
    'If I (     ) more about computers, I could fix this problem myself instead of waiting for the repair service.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','knew',true),(v_q,1,'B','know',false),(v_q,2,'C','have known',false),(v_q,3,'D','will know',false);

  -- Q9 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 8, 'single_choice', 'auto_choice',
    'The museum offers free (     ) to all visitors under eighteen, so it is very popular with school groups.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','emergency',false),(v_q,1,'B','industry',false),(v_q,2,'C','admission',true),(v_q,3,'D','atmosphere',false);

  -- Q10 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 9, 'single_choice', 'auto_choice',
    'After months of discussions, the two countries finally reached an (     ) on trade. Both leaders called it an important step forward.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','agreement',true),(v_q,1,'B','instrument',false),(v_q,2,'C','environment',false),(v_q,3,'D','appointment',false);

  -- Q11 (D) — phrasal verb
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 10, 'single_choice', 'auto_choice',
    'Kevin was invited to join the city orchestra, but he had to (     ) the offer because of his busy work schedule.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','take after',false),(v_q,1,'B','put on',false),(v_q,2,'C','look into',false),(v_q,3,'D','turn down',true);

  -- Q12 (B) — grammar: present perfect continuous
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 11, 'single_choice', 'auto_choice',
    'Maki has been (     ) the piano since she was four years old, and now she teaches children in her neighborhood.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','played',false),(v_q,1,'B','playing',true),(v_q,2,'C','play',false),(v_q,3,'D','to play',false);

  -- Q13 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 12, 'single_choice', 'auto_choice',
    'The mountain road was closed because of the storm, so the climbers had no (     ) but to return to the hotel.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','effect',false),(v_q,1,'B','talent',false),(v_q,2,'C','choice',true),(v_q,3,'D','luggage',false);

  -- Q14 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 13, 'single_choice', 'auto_choice',
    'The new shopping mall has greatly (     ) the number of visitors to the town. Local restaurants are much busier than before.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','defended',false),(v_q,1,'B','compared',false),(v_q,2,'C','divided',false),(v_q,3,'D','increased',true);

  -- Q15 (A) — grammar: subjunctive after "suggest"
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 14, 'single_choice', 'auto_choice',
    'The teacher suggested that Paul (     ) his report once more before handing it in, because small mistakes can change the meaning.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','check',true),(v_q,1,'B','checks',false),(v_q,2,'C','checked',false),(v_q,3,'D','to check',false);

  -- Q16 (B) — idiom: by chance
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 15, 'single_choice', 'auto_choice',
    'Ryo met his old high school teacher (     ) at the airport last week. They had not seen each other for ten years.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','on purpose',false),(v_q,1,'B','by chance',true),(v_q,2,'C','in order',false),(v_q,3,'D','for free',false);

  -- Q17 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 16, 'single_choice', 'auto_choice',
    'The charity concert (     ) in raising over one million yen for families who lost their homes in the flood.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','apologized',false),(v_q,1,'B','belonged',false),(v_q,2,'C','succeeded',true),(v_q,3,'D','arrived',false);

  -- ──────────── 大問2: 長文の語句空所補充 (Q18–23) ────────────
  -- TWO passages, each with 3 gap-fill-in-context blanks. Keys: C B D / A D B
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問2', 'Passage Gap Fill',
          'Read each passage and choose the best phrase (A–D) for each numbered blank.', 1)
  RETURNING id INTO v_sec;

  -- ── Passage 2A: Quiet Hours at the Supermarket (Q18–20) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'Quiet Hours at the Supermarket' || chr(10) || chr(10) ||
    'Shopping at a busy supermarket can be stressful. Bright lights, loud music, and frequent announcements may not bother most customers, but for some people, such as those who are very sensitive to sound, these things can make shopping ( 18 ). As a result, some of them avoid large stores completely.' || chr(10) || chr(10) ||
    'To help such customers, supermarkets in several countries have introduced "quiet hours." During these times, the stores turn off the background music, stop most announcements, and make the lights softer. Staff members are also asked to ( 19 ). For example, they do not collect shopping carts or fill the shelves while quiet hours continue.' || chr(10) || chr(10) ||
    'Quiet hours have brought stores an unexpected benefit, too. Many ordinary shoppers say they actually prefer the calm atmosphere, and some now choose to ( 20 ). Because of this, more stores are thinking about offering quiet hours every day rather than just once a week.')
  RETURNING id INTO v_grp;

  -- Q18 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '( 18 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','cheaper than before',false),(v_q,1,'B','easier to enjoy',false),
    (v_q,2,'C','almost impossible',true),(v_q,3,'D','good for their health',false);

  -- Q19 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '( 19 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','play their favorite songs',false),(v_q,1,'B','avoid making loud noises',true),
    (v_q,2,'C','leave the store early',false),(v_q,3,'D','speak to every customer',false);

  -- Q20 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '( 20 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','complain about the noise',false),(v_q,1,'B','shop at smaller stores',false),
    (v_q,2,'C','buy fewer items',false),(v_q,3,'D','visit during those times',true);

  -- ── Passage 2B: Renting Instead of Buying (Q21–23) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
    'Renting Instead of Buying' || chr(10) || chr(10) ||
    'These days, many people enjoy fashion without filling their closets. Instead of buying new clothes each season, they use services that ( 21 ). For a monthly fee, customers receive several items chosen to match their taste, wear them for a few weeks, and then send them back.' || chr(10) || chr(10) ||
    'Such services are attractive for two reasons. First, they save money: one month''s fee is usually less than the price of a single new jacket. Second, they are good for the environment. Making clothes requires huge amounts of water and energy, and millions of unwanted garments ( 22 ) every year. When one jacket is shared by many people, fewer new clothes need to be produced.' || chr(10) || chr(10) ||
    'Of course, renting is not perfect. Some customers say that popular items are often unavailable, and others simply prefer owning their favorite clothes. Even so, the number of users keeps growing, and experts believe the clothing rental market will ( 23 ) over the next ten years.')
  RETURNING id INTO v_grp;

  -- Q21 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '( 21 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','lend clothes for a short time',true),(v_q,1,'B','repair old jackets cheaply',false),
    (v_q,2,'C','sell used clothing abroad',false),(v_q,3,'D','teach people how to sew',false);

  -- Q22 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '( 22 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','are given to charity',false),(v_q,1,'B','become more expensive',false),
    (v_q,2,'C','are turned into new products',false),(v_q,3,'D','are simply thrown away',true);

  -- Q23 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '( 23 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','disappear completely',false),(v_q,1,'B','continue to grow',true),
    (v_q,2,'C','become illegal',false),(v_q,3,'D','stay exactly the same',false);

  -- ──────────── 大問3A: Eメールの内容一致選択 (Q24–26) ────────────
  -- Keys: B D A
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問3A', 'E-mail Comprehension',
          'Read the e-mail and choose the best answer (A–D) for each question.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'From: Rachel Goodwin' || chr(10) ||
    'To: All volunteers' || chr(10) ||
    'Date: October 14' || chr(10) ||
    'Subject: Autumn Park Festival' || chr(10) || chr(10) ||
    'Dear volunteers,' || chr(10) || chr(10) ||
    'Thank you for offering to help at the Maplewood Autumn Park Festival on Saturday, October 26. This year, more than two thousand visitors are expected, so your help is really important.' || chr(10) || chr(10) ||
    'Last year, some visitors said it was hard to find the recycling stations, so this year we will set up twice as many of them and put up large signs with pictures. We need volunteers to stand near the stations for one-hour shifts and show visitors how to separate their trash. If you would like to do this job, please reply to this e-mail by Friday and tell me which hours you can work.' || chr(10) || chr(10) ||
    'Also, the festival committee has decided to hold a photo contest. Visitors will vote for their favorite photograph of the park, and the winner will receive a one-year free pass to the city''s botanical garden. If you know anyone who enjoys photography, please tell them about the contest. Photos must be sent to the committee''s website by October 20.' || chr(10) || chr(10) ||
    'I look forward to seeing you all at the volunteer meeting next Tuesday at 7 p.m. in the community center.' || chr(10) || chr(10) ||
    'Best regards,' || chr(10) ||
    'Rachel Goodwin' || chr(10) ||
    'Festival Volunteer Leader')
  RETURNING id INTO v_grp;

  -- Q24 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'Why will there be more recycling stations at the festival this year?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The city made a new recycling rule.',false),(v_q,1,'B','Visitors had trouble finding them last year.',true),
    (v_q,2,'C','The festival will be held in a larger park.',false),(v_q,3,'D','There were not enough volunteers last year.',false);

  -- Q25 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'Volunteers who want to help at the recycling stations should', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','attend a training class on October 20.',false),(v_q,1,'B','make large signs with pictures.',false),
    (v_q,2,'C','go to the botanical garden.',false),(v_q,3,'D','reply to the e-mail by Friday.',true);

  -- Q26 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'What will the winner of the photo contest receive?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A one-year pass to a botanical garden.',true),(v_q,1,'B','A new camera.',false),
    (v_q,2,'C','Free tickets to next year''s festival.',false),(v_q,3,'D','A book of photographs of the park.',false);

  -- ──────────── 大問3B: 長文の内容一致選択 (Q27–31) ────────────
  -- Keys: C A D B C
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問3B', 'Passage Comprehension',
          'Read the passage and choose the best answer (A–D) for each question.', 3)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'The Return of Night Trains' || chr(10) || chr(10) ||
    'For much of the twentieth century, night trains were a popular way to travel across Europe. Passengers got on a train in the evening, slept in small beds on board, and woke up in another country. In the 1990s, however, low-cost airlines appeared, and flying became cheaper and faster than rail travel. As a result, night trains lost most of their passengers, and many services were stopped one after another.' || chr(10) || chr(10) ||
    'Recently, night trains have been making a comeback, and one major reason is the environment. Airplanes produce far more carbon dioxide per passenger than trains do. Many travelers today want to reduce the damage their trips cause to the climate, so they choose to spend a night on a train instead of taking a short flight. In some countries, this idea has become so popular that there is even a special word for choosing trains over planes.' || chr(10) || chr(10) ||
    'Railway companies have worked hard to attract these new passengers. On modern night trains, travelers can book private rooms with comfortable beds and showers, and the price of a ticket usually includes breakfast. Companies have also introduced apps that let passengers order drinks and snacks from their beds.' || chr(10) || chr(10) ||
    'However, night trains still face some problems. Running a train through several countries at night is expensive, so tickets sometimes cost more than plane tickets. In addition, when a train crosses borders, differences between countries'' rail systems can cause delays.' || chr(10) || chr(10) ||
    'Even so, new night train routes have opened across Europe every year since 2020, connecting cities such as Paris, Berlin, and Vienna. Transportation experts say that if governments support railways the way they have supported airports, night trains could once again become the most common way to travel long distances in Europe.')
  RETURNING id INTO v_grp;

  -- Q27 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'Why did many night train services stop after the 1990s?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','The trains became too old to use safely.',false),(v_q,1,'B','Passengers complained about the small beds.',false),
    (v_q,2,'C','Cheap flights took away their passengers.',true),(v_q,3,'D','Governments stopped supporting railways.',false);

  -- Q28 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'Many travelers choose night trains today because', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','they want their trips to cause less damage to the climate.',true),(v_q,1,'B','plane tickets have become much more expensive.',false),
    (v_q,2,'C','they are afraid of flying at night.',false),(v_q,3,'D','trains are now faster than airplanes.',false);

  -- Q29 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'What is one thing that railway companies have done to attract passengers?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They have lowered ticket prices on all routes.',false),(v_q,1,'B','They have built new stations in small towns.',false),
    (v_q,2,'C','They have made trains run without stopping at borders.',false),(v_q,3,'D','They have introduced apps for ordering food and drinks.',true);

  -- Q30 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice',
    'What is one problem that night trains face?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Few passengers want to book private rooms.',false),(v_q,1,'B','Crossing borders can cause delays.',true),
    (v_q,2,'C','There are no routes between major cities.',false),(v_q,3,'D','Breakfast is no longer included in tickets.',false);

  -- Q31 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice',
    'What do transportation experts say about night trains?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They will replace airplanes within a few years.',false),(v_q,1,'B','They are only useful for business travelers.',false),
    (v_q,2,'C','With government support, they could become the main way to travel far in Europe.',true),(v_q,3,'D','They should connect more cities outside Europe.',false);

  -- ═══════════════════════════ WRITING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-g2-writing-mock-01', 'EIKEN Grade 2 — Writing Mock Test 1',
          '英検2級 ライティング模試1', 'full_mock', 1800, false,
          'eiken-g2-mock-01', 'EIKEN Grade 2 — Mock Test 1', '英検2級 模試1', 1)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'Summary & Opinion',
          'Two tasks, as in the EIKEN Grade 2 writing section (2024 renewal): a summary of an English passage (45-55 words) and an opinion essay with two reasons (80-100 words).', 0)
  RETURNING id INTO v_sec;

  -- ── Task 1: 要約 (summarize the passage in 45–55 words) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
    'These days, many supermarkets and convenience stores have introduced self-checkout machines. Instead of waiting for a member of staff, customers scan the items themselves and pay by card or smartphone. The number of stores using these machines is increasing every year.' || chr(10) || chr(10) ||
    'Why have stores introduced them? Self-checkout machines allow customers to pay quickly, so the lines at the cash registers become shorter. Also, stores do not need as many workers at the registers, so staff members can spend more time helping customers find products or keeping the shelves full.' || chr(10) || chr(10) ||
    'On the other hand, some customers, especially elderly people, find the machines difficult to use and need help anyway. In addition, stores have found that some items are not scanned, either by mistake or on purpose, so they lose money. For these reasons, a few stores have actually removed their self-checkout machines.',
    'Read the passage above and summarize it in English.')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Summarize the passage in your own words as far as possible. Write 45-55 words.',
    '{"task":"summary","min_words":45,"max_words":55,"reference":"Summary task (2024 Grade 2 format). A full-credit 45-55-word summary must cover the THREE key points of the passage: (1) more and more stores are introducing self-checkout machines, where customers scan their items and pay by themselves; (2) the machines help stores — customers can pay quickly so lines get shorter, and fewer staff are needed at the registers so staff can do other work; (3) however, some customers, especially elderly people, find the machines hard to use, and stores lose money when items are not scanned, so a few stores have removed them. The summary must be in the student''s own words as far as possible (copying whole sentences from the passage loses Content/Vocabulary points), must not add the student''s own opinion, and must be 45-55 words."}'::jsonb,
    v_rub_w, 16) RETURNING id INTO v_q;

  -- ── Task 2: 意見文 (80–100 words, opinion + 2 reasons) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'Write an essay on the given TOPIC. Give TWO reasons to support your answer. Structure: introduction, main body, and conclusion.')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'TOPIC: Some people say that high schools should teach students how to manage money. Do you agree with this opinion?' || chr(10) ||
    'POINTS (you may use these or your own ideas): Daily life / Jobs / The future' || chr(10) ||
    'Write your opinion and TWO reasons. Write 80-100 words.',
    '{"task":"opinion","min_words":80,"max_words":100,"reference":"B1 social topic. A full-credit essay states a clear position (agree or disagree), gives TWO distinct reasons, each developed with at least one supporting sentence (e.g. agree — young people need to budget when they start living alone, and money lessons can help them avoid trouble with online shopping or smartphone payments / disagree — school hours are limited and subjects like English or science matter more, and families can teach money skills at home), is organised as introduction, body and conclusion with connectors (First, Second, For example, Therefore), and is 80-100 words. Either position is acceptable, and the suggested POINTS (Daily life / Jobs / The future) are optional — answers that ignore them lose nothing."}'::jsonb,
    v_rub_w, 16) RETURNING id INTO v_q;

  -- ═══════════════════════════ SPEAKING ═══════════════════════════
  -- Interview format (Grade 2): card with a ~60-word passage + ONE three-panel
  -- illustration for the No. 2 narration. Untimed (self-paced interview).
  -- The illustration is attached later via scripts/attach-eiken-g2-images.mjs
  -- — see supabase/EIKEN-G2-IMAGES.md.
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-g2-speaking-mock-01', 'EIKEN Grade 2 — Speaking Mock Test 1',
          '英検2級 スピーキング模試1', 'full_mock', NULL, false,
          'eiken-g2-mock-01', 'EIKEN Grade 2 — Mock Test 1', '英検2級 模試1', 3)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Interview', 'Card-based Interview',
          'Read the passage silently, then read it aloud. Answer a question about the passage, tell the story of the three pictures, and then give your opinions. Tap Record / Stop for each task.', 0)
  RETURNING id INTO v_sec;

  -- ── Group 0: card passage — 音読 + No.1 ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
    'Car Sharing' || chr(10) || chr(10) ||
    'Today, many people in cities do not own a car. Instead, they use car-sharing services that allow them to rent a car for a short time when they need one. People can save money in this way, and so car sharing is becoming more and more popular. Some cities also hope that car sharing will reduce traffic and parking problems.',
    'Look at the card. First, read the passage silently for twenty seconds, then read it aloud. After that, answer the questions.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Now, please read the passage aloud.',
    '{"subtask":"read_aloud","prep_seconds":20}'::jsonb, v_rub_s, 5) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'No. 1 — According to the passage, why is car sharing becoming more and more popular?',
    '{"subtask":"passage_qa","reference":"From the passage: People can save money in this way, and so car sharing is becoming more and more popular. In this way refers to using car-sharing services to rent a car for a short time when needed instead of owning one. Expected answer: Because people can save money by renting a car for a short time when they need one / by using car-sharing services instead of owning a car. Full marks require converting the passage wording into an answer (Because they can save money by...); reading the sentence from the card unchanged, without resolving in this way, loses points."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  -- ── Group 1: three-panel illustration — No.2 (narration) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'image',
    'Three-Panel Story — Your story should begin with this sentence: One day, Mr. and Mrs. Sato were talking about buying a new bookshelf.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'No. 2 — Now, please look at the three pictures and describe the situation. You have twenty seconds to prepare. Your story should begin with the sentence on the card: "One day, Mr. and Mrs. Sato were talking about buying a new bookshelf."',
    '{"subtask":"picture_qa","prep_seconds":20,"speak_seconds":60,"reference":"Three-panel story (situation, action, outcome). Panel 1: In their living room, Mrs. Sato is showing Mr. Sato a store flyer with a picture of a large bookshelf; they decide to buy it, but they do not own a car. Panel 2: The next morning, at a car-sharing parking space near their home, Mr. Sato unlocks a small blue shared car with his smartphone while Mrs. Sato waits next to the car. Panel 3: That afternoon, outside the furniture store, the couple happily load a large box containing the bookshelf into the back of the shared car. Full marks: a connected past-tense narration of about 60 seconds that begins with the given opening sentence and covers ALL THREE panels — (1) the couple decided to buy a bookshelf they saw in a flyer, (2) the next day the husband rented/unlocked a shared car using his smartphone, (3) at the store they put the large box into the car. Reasonable variations (reserved a car on his phone, picked up the bookshelf, carried the box to the car) are acceptable; missing a panel or describing only states without actions loses points."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  -- ── Group 2: No.3 + No.4 (card turned over) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 2, 'prompt', 'Now, please turn the card over. Answer the following questions.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'No. 3 — Some people say that car-sharing services will become more popular than owning a car. What do you think about that?',
    '{"subtask":"personal_qa","reference":"Opinion question related to the card topic (car sharing). Full marks: a clear position (I agree / I disagree, or I think so / I do not think so) followed by one or two supporting reasons at B1 level in connected sentences, e.g. agree — owning a car is expensive and parking is hard to find in cities, so renting only when needed makes sense / disagree — people who live in the countryside need their own cars, and shared cars are not always available when you want one. A bare yes/no without reasons loses points."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'No. 4 — Today, many people shop on the Internet instead of going to stores. Do you think more people will shop online in the future? Please tell me why or why not.',
    '{"subtask":"personal_qa","reference":"Broader yes/no opinion question about society (online shopping), not connected to the card. Full marks: a clear Yes/No answer followed by one or two reasons in connected sentences at B1 level, e.g. Yes — online shopping is convenient, people can compare prices easily, and delivery keeps getting faster / No — many people want to see and touch products before buying, and returning items by mail is troublesome. One-word answers without support lose points."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded EIKEN Grade 2 Mock 1 (reading: 31 Q, writing: 2 tasks, speaking: 5 tasks incl. 音読) — UNPUBLISHED.';
  RAISE NOTICE 'Listening (30 Q): run scripts/seed-eiken-g2-listening-mock.mjs. Speaking illustration: see supabase/EIKEN-G2-IMAGES.md.';
END $$;
