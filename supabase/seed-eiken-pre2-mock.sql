-- ============================================================
--  EIKEN Grade Pre-2 — Mock Test 1: READING + WRITING + SPEAKING
-- ============================================================
--  2024 renewal format (CEFR A2–B1), set 'eiken-pre2-mock-01':
--    READING (29 Q, 50 min):
--      大問1  — 15 short-sentence vocab/grammar gaps (incl. phrasal verbs/idioms)
--      大問2  —  5 dialogue completion
--      大問3  —  1 longer passage with 2 gap-fill-in-context blanks
--      大問4A —  e-mail, 3 questions
--      大問4B —  expository passage, 4 questions
--    WRITING (2 tasks, 30 min): E-mail reply (40–50 words, answers the friend's
--      TWO questions) + opinion (50–60 words, 2 reasons).
--    SPEAKING (interview, 6 tasks, untimed): read-aloud card (~50 words) with
--      two illustrations — イラストA (five people, five different actions) and
--      イラストB (one person with an obvious problem/intention). Images are
--      attached separately: see supabase/EIKEN-PRE2-IMAGES.md +
--      scripts/attach-eiken-pre2-images.mjs. payload.reference tells the AI
--      grader what each picture shows (never displayed to the student).
--    The listening form of this set is seeded by
--      scripts/seed-eiken-pre2-listening-mock.mjs (set_order 2).
--  All three forms are seeded UNPUBLISHED (admin draft preview).
--  All content is ORIGINAL practice material at A2–B1 level.
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
    ('eiken-pre2-reading-mock-01', 'eiken-pre2-writing-mock-01', 'eiken-pre2-speaking-mock-01');

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'eiken-grade-pre2';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track eiken-grade-pre2 not found — run add-practice-tests.sql first.';
  END IF;
  SELECT id INTO v_rub_w FROM rubrics WHERE track_id = v_track AND skill = 'writing'  AND name = 'EIKEN Writing'  LIMIT 1;
  SELECT id INTO v_rub_s FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'EIKEN Speaking' LIMIT 1;
  IF v_rub_w IS NULL OR v_rub_s IS NULL THEN
    RAISE EXCEPTION 'EIKEN rubrics not found — run seed-test-scales-rubrics.sql first.';
  END IF;

  -- ═══════════════════════════ READING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-pre2-reading-mock-01', 'EIKEN Grade Pre-2 — Reading Mock Test 1',
          '英検準2級 リーディング模試1', 'full_mock', 3000, false,
          'eiken-pre2-mock-01', 'EIKEN Grade Pre-2 — Mock Test 1', '英検準2級 模試1', 0)
  RETURNING id INTO v_form;

  -- ──────────── 大問1: 短文の語句空所補充 (Q1–15) ────────────
  -- Keys: C A D B B C A D A B C D A D B  (A:4 B:4 C:3 D:4, no letter 3× in a row)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問1', 'Vocabulary & Grammar',
          'Choose the best word or phrase (A–D) to complete each sentence.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none')
  RETURNING id INTO v_grp;

  -- Q1 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'Kana was (     ) to hear that she had passed the entrance exam. She called her grandmother right away to tell her the news.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','nervous',false),(v_q,1,'B','bored',false),(v_q,2,'C','delighted',true),(v_q,3,'D','careless',false);

  -- Q2 (A) — phrasal verb
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'The soccer game was (     ) because of the heavy snow. It will be held next Sunday instead.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','put off',true),(v_q,1,'B','turned on',false),(v_q,2,'C','taken out',false),(v_q,3,'D','picked up',false);

  -- Q3 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'A: Why don''t we eat at that new Italian restaurant tonight?' || chr(10) ||
    'B: Good idea. I''ll call and (     ) a table for seven o''clock.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','invent',false),(v_q,1,'B','promise',false),(v_q,2,'C','share',false),(v_q,3,'D','reserve',true);

  -- Q4 (B) — grammar: gerund
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice',
    'Mike enjoys (     ) pictures of wild birds in the mountains near his house. He sometimes waits for hours to get one good shot.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','take',false),(v_q,1,'B','taking',true),(v_q,2,'C','taken',false),(v_q,3,'D','takes',false);

  -- Q5 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice',
    'Emi''s father speaks three (     ): Japanese, English, and Chinese. He uses all of them at his job at the airport.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','opinions',false),(v_q,1,'B','languages',true),(v_q,2,'C','messages',false),(v_q,3,'D','promises',false);

  -- Q6 (C) — idiom
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 5, 'single_choice', 'auto_choice',
    'A: I''m so sorry. I broke your pen.' || chr(10) ||
    'B: Don''t worry. It was a really old one, so it doesn''t (     ).', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','agree',false),(v_q,1,'B','fit',false),(v_q,2,'C','matter',true),(v_q,3,'D','waste',false);

  -- Q7 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 6, 'single_choice', 'auto_choice',
    'The doctor (     ) Mr. Lee to get more exercise and to eat less salt. Mr. Lee now walks to his office every day.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','advised',true),(v_q,1,'B','invited',false),(v_q,2,'C','described',false),(v_q,3,'D','celebrated',false);

  -- Q8 (D) — grammar: past participle modifier
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 7, 'single_choice', 'auto_choice',
    'The cake (     ) by my aunt was so delicious that I asked her for the recipe.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','bakes',false),(v_q,1,'B','baking',false),(v_q,2,'C','is baked',false),(v_q,3,'D','baked',true);

  -- Q9 (A) — phrasal verb
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 8, 'single_choice', 'auto_choice',
    'A: This math problem is too difficult for me.' || chr(10) ||
    'B: Don''t (     ). I''m sure you can solve it if you keep trying.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','give up',true),(v_q,1,'B','get on',false),(v_q,2,'C','look after',false),(v_q,3,'D','run out',false);

  -- Q10 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 9, 'single_choice', 'auto_choice',
    'Riku could not decide which guitar to buy, so he asked the shop staff for (     ).', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','permission',false),(v_q,1,'B','advice',true),(v_q,2,'C','silence',false),(v_q,3,'D','courage',false);

  -- Q11 (C) — grammar: conjunction
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 10, 'single_choice', 'auto_choice',
    '(     ) it was raining hard, the students walked to school as usual.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Because',false),(v_q,1,'B','Unless',false),(v_q,2,'C','Although',true),(v_q,3,'D','During',false);

  -- Q12 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 11, 'single_choice', 'auto_choice',
    'The train was so (     ) this morning that Hiroshi could not find a seat. He had to stand all the way to school.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','empty',false),(v_q,1,'B','quiet',false),(v_q,2,'C','quick',false),(v_q,3,'D','crowded',true);

  -- Q13 (A) — idiom: get used to
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 12, 'single_choice', 'auto_choice',
    'A: How''s your new part-time job going?' || chr(10) ||
    'B: It''s tough, but I''m getting used (     ) it little by little.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','to',true),(v_q,1,'B','with',false),(v_q,2,'C','at',false),(v_q,3,'D','from',false);

  -- Q14 (D) — phrasal verb: take after
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 13, 'single_choice', 'auto_choice',
    'Aki (     ) her grandmother in many ways. They both love gardening, and they even laugh in the same way.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','looks into',false),(v_q,1,'B','gets over',false),(v_q,2,'C','puts away',false),(v_q,3,'D','takes after',true);

  -- Q15 (B) — grammar: relative pronoun
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 14, 'single_choice', 'auto_choice',
    'Naomi has a friend (     ) father is a famous pianist. She sometimes gets free tickets to his concerts.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','who',false),(v_q,1,'B','whose',true),(v_q,2,'C','which',false),(v_q,3,'D','whom',false);

  -- ──────────── 大問2: 会話文の文空所補充 (Q16–20) ────────────
  -- Keys: B D A C D
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問2', 'Dialogue Completion',
          'Choose the best phrase or sentence (A–D) to fill the blank in each dialogue.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none')
  RETURNING id INTO v_grp;

  -- Q16 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'Girl: Dad, the science museum has a special show about space this month.' || chr(10) ||
    'Father: That sounds interesting. (     )' || chr(10) ||
    'Girl: It runs until the end of March, so let''s go next weekend.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','How did you get there?',false),(v_q,1,'B','How long will it be held?',true),
    (v_q,2,'C','Who took you there?',false),(v_q,3,'D','What did you see?',false);

  -- Q17 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'Boy: Have you decided what to do after graduation, Mika?' || chr(10) ||
    'Girl: Yes. (     ) My aunt is a nurse, and I really respect her.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','I haven''t thought about it yet.',false),(v_q,1,'B','I''m going to take a long trip.',false),
    (v_q,2,'C','I want to work at my father''s store.',false),(v_q,3,'D','I''m going to study nursing at college.',true);

  -- Q18 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'Woman: Excuse me. I''m looking for a birthday present for my eight-year-old nephew.' || chr(10) ||
    'Clerk: How about this robot kit? Children can build it themselves.' || chr(10) ||
    'Woman: (     ) He''s not good at making things with his hands.' || chr(10) ||
    'Clerk: Then how about this picture book about dinosaurs? It''s very popular.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Hmm, that might be too difficult for him.',true),(v_q,1,'B','Perfect, he loves building things.',false),
    (v_q,2,'C','Sorry, I don''t have enough money today.',false),(v_q,3,'D','Well, he already has that book.',false);

  -- Q19 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice',
    'Man: Hi, Beth. Some of us are going hiking on Mount Hayes tomorrow. Do you want to come?' || chr(10) ||
    'Woman: I''d love to, but (     )' || chr(10) ||
    'Man: That''s too bad. Take care of yourself, and join us next time.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','I''ve already climbed it twice.',false),(v_q,1,'B','I''ll bring lunch for everyone.',false),
    (v_q,2,'C','I''ve had a cold since Thursday.',true),(v_q,3,'D','I''m really good at hiking.',false);

  -- Q20 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice',
    'Woman: Carl, did you finish the sales report for tomorrow''s meeting?' || chr(10) ||
    'Man: Almost. (     )' || chr(10) ||
    'Woman: Sure. Just send it to me by e-mail when you''re done.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','I handed it in yesterday.',false),(v_q,1,'B','I forgot we had a meeting.',false),
    (v_q,2,'C','The meeting room was locked.',false),(v_q,3,'D','Could I have thirty more minutes?',true);

  -- ──────────── 大問3: 長文の語句空所補充 (Q21–22) ────────────
  -- One longer passage, two gap-fill-in-context blanks. Keys: C A
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問3', 'Passage Gap Fill',
          'Read the passage and choose the best phrase (A–D) for each numbered blank.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'A Garden on the Roof' || chr(10) || chr(10) ||
    'Daisuke works at a small office in Osaka. Two years ago, his company started a vegetable garden on the roof of its building. At first, Daisuke was not interested. He thought growing vegetables was ( 21 ). However, one day, a coworker gave him a tomato from the roof, and it was delicious. After that, Daisuke joined the garden club at his company.' || chr(10) || chr(10) ||
    'Now, he waters the plants every morning before work. He says that working in the garden helps him ( 22 ). When he is tired from sitting at his computer, taking care of the vegetables outside makes him feel fresh again. Last month, the club members cooked a curry with their own vegetables and shared it with everyone in the office.')
  RETURNING id INTO v_grp;

  -- Q21 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '( 21 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','good for his health',false),(v_q,1,'B','an important job',false),
    (v_q,2,'C','too much work',true),(v_q,3,'D','a fun way to play',false);

  -- Q22 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '( 22 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','relax during busy days',true),(v_q,1,'B','learn foreign languages',false),
    (v_q,2,'C','make more money',false),(v_q,3,'D','get to work earlier',false);

  -- ──────────── 大問4A: Eメールの内容一致選択 (Q23–25) ────────────
  -- Keys: D B A
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問4A', 'E-mail Comprehension',
          'Read the e-mail and choose the best answer (A–D) for each question.', 3)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'From: Lucy Baker' || chr(10) ||
    'To: Mei Tanaka' || chr(10) ||
    'Date: March 2' || chr(10) ||
    'Subject: Big news' || chr(10) || chr(10) ||
    'Hi Mei,' || chr(10) || chr(10) ||
    'How are you? I was happy to get your e-mail about your school trip to Hiroshima. The photos of the island with the famous gate in the sea were beautiful. I showed them to my mother, and now she wants to visit Japan, too!' || chr(10) || chr(10) ||
    'By the way, I have some big news. My family is going to move to a new house next month. It is near the beach, and it even has a guest room. My new school will be only a ten-minute walk from the house. I am a little sad because I have to say goodbye to my friends at my school now, but I can still see them on weekends because the new house is in the same city.' || chr(10) || chr(10) ||
    'My mother said that you can stay with us during your summer vacation. If you come, we can swim at the beach every morning, and my father will teach us how to surf. He was a surfing teacher when he was a college student. Please ask your parents about it and write back soon.' || chr(10) || chr(10) ||
    'Your friend,' || chr(10) ||
    'Lucy')
  RETURNING id INTO v_grp;

  -- Q23 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'Why does Lucy''s mother want to visit Japan?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Mei sent her a birthday card.',false),(v_q,1,'B','She wants to see Mei''s new school.',false),
    (v_q,2,'C','She is interested in Japanese food.',false),(v_q,3,'D','She saw the photos of Mei''s school trip.',true);

  -- Q24 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'Lucy is a little sad because', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','her new house is far from the beach.',false),(v_q,1,'B','she must leave her friends at her school.',true),
    (v_q,2,'C','she cannot go on a school trip.',false),(v_q,3,'D','the guest room in her house is too small.',false);

  -- Q25 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'What does Lucy ask Mei to do?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Ask her parents about staying with Lucy''s family.',true),(v_q,1,'B','Teach her how to surf in the sea.',false),
    (v_q,2,'C','Send more photos of the famous island.',false),(v_q,3,'D','Come to her goodbye party next month.',false);

  -- ──────────── 大問4B: 長文の内容一致選択 (Q26–29) ────────────
  -- Keys: C B D A
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問4B', 'Passage Comprehension',
          'Read the passage and choose the best answer (A–D) for each question.', 4)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'Running for a Cleaner Town' || chr(10) || chr(10) ||
    'Jogging is a popular way to stay healthy. Recently, however, some joggers have started doing something more while they run: they pick up trash on the streets. This activity is called "plogging." The name joins the English word "jogging" with a Swedish word that means "to pick up." Plogging started in Sweden around 2016, and it quickly spread to other countries through social media.' || chr(10) || chr(10) ||
    'Plogging has several good points. First, it is better exercise than normal jogging. Ploggers do not just run. They also stop, bend down, and carry bags of trash, so they use more muscles and energy. Second, it helps the environment. Trash on the streets is often carried into rivers by rain and then into the sea, where it can hurt fish and seabirds. By picking up trash before this happens, ploggers protect these animals.' || chr(10) || chr(10) ||
    'Today, plogging events are held in many countries, including Japan. At one event, more than one hundred runners filled over fifty bags with trash in just one hour. However, there is one thing ploggers must be careful about. Some trash, such as broken glass, is dangerous, so they should always wear thick gloves and never touch sharp things with bare hands.' || chr(10) || chr(10) ||
    'People who have tried plogging say that looking for trash makes running more fun, like a treasure hunt. Plogging shows that one small idea can be good for both our health and our planet.')
  RETURNING id INTO v_grp;

  -- Q26 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'What is plogging?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A sport that was invented in Japan.',false),(v_q,1,'B','A way of swimming in rivers.',false),
    (v_q,2,'C','Picking up trash while jogging.',true),(v_q,3,'D','A running race held on city streets.',false);

  -- Q27 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'Why is plogging better exercise than normal jogging?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','People run much faster than usual.',false),(v_q,1,'B','People use more muscles when they stop and bend down.',true),
    (v_q,2,'C','People run for a longer time.',false),(v_q,3,'D','People always exercise in large groups.',false);

  -- Q28 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'What must ploggers be careful about?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Running too early in the morning.',false),(v_q,1,'B','Carrying too many bags at one time.',false),
    (v_q,2,'C','Losing their way in town.',false),(v_q,3,'D','Touching dangerous trash such as broken glass.',true);

  -- Q29 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice',
    'What do people who have tried plogging say about it?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It makes running feel like a treasure hunt.',true),(v_q,1,'B','It is too hard for older people.',false),
    (v_q,2,'C','It should become a school subject.',false),(v_q,3,'D','It costs a lot of money to join.',false);

  -- ═══════════════════════════ WRITING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-pre2-writing-mock-01', 'EIKEN Grade Pre-2 — Writing Mock Test 1',
          '英検準2級 ライティング模試1', 'full_mock', 1800, false,
          'eiken-pre2-mock-01', 'EIKEN Grade Pre-2 — Mock Test 1', '英検準2級 模試1', 1)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'E-mail & Opinion',
          'Two tasks, as in the EIKEN Grade Pre-2 writing section: an e-mail reply (40-50 words) and an opinion with two reasons (50-60 words).', 0)
  RETURNING id INTO v_sec;

  -- ── Task 1: Eメール返信 (40–50 words, must answer BOTH questions) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
    'Hi!' || chr(10) || chr(10) ||
    'Thank you for your e-mail. I heard that you started learning how to cook from your grandmother. That''s great! I want to know more about it. What dish do you want to learn to make next? And how often do you cook with your grandmother?' || chr(10) || chr(10) ||
    'Your friend,' || chr(10) ||
    'Alex',
    'You received this e-mail from your friend Alex, who lives abroad. Write a reply that answers BOTH of Alex''s questions.')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
    'Write a reply to Alex''s e-mail. Answer BOTH of the questions in the e-mail. Write 40-50 words.',
    '{"task":"email","min_words":40,"max_words":50,"reference":"Alex asks TWO questions: (1) What dish does the writer want to learn to make next? (2) How often does the writer cook with their grandmother? A full-credit reply must clearly answer BOTH questions (any reasonable content is fine, e.g. a named dish plus a frequency such as every weekend / twice a week), stay on topic, be 40-50 words, and use natural friendly e-mail register at A2-B1 level. Deduct Content points if either question is ignored."}'::jsonb,
    v_rub_w, 16) RETURNING id INTO v_q;

  -- ── Task 2: 意見文 (50–60 words, opinion + 2 reasons) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'Write your opinion about the QUESTION below. Give two reasons to support your opinion.')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'QUESTION: Do you think supermarkets should stop giving free plastic bags to shoppers?' || chr(10) ||
    'Write your opinion and TWO reasons. Write 50-60 words.',
    '{"task":"opinion","min_words":50,"max_words":60,"reference":"Everyday social question at A2-B1 level. A full-credit answer states a clear position (Yes/No), gives TWO distinct supporting reasons (e.g. less plastic waste, people can reuse their own bags / free bags are convenient, some shoppers forget their bags), is organised with simple connectors (First, Second, Also, Therefore), and is 50-60 words. Either position is acceptable."}'::jsonb,
    v_rub_w, 16) RETURNING id INTO v_q;

  -- ═══════════════════════════ SPEAKING ═══════════════════════════
  -- Interview format: card passage (~50 words) + イラストA (five people, five
  -- different actions) + イラストB (one person with an obvious problem or
  -- intention). Untimed (self-paced interview). Images attached later via
  -- scripts/attach-eiken-pre2-images.mjs — see supabase/EIKEN-PRE2-IMAGES.md.
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-pre2-speaking-mock-01', 'EIKEN Grade Pre-2 — Speaking Mock Test 1',
          '英検準2級 スピーキング模試1', 'full_mock', NULL, false,
          'eiken-pre2-mock-01', 'EIKEN Grade Pre-2 — Mock Test 1', '英検準2級 模試1', 3)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Interview', 'Card-based Interview',
          'Read the passage silently, then read it aloud. After that, answer the questions by speaking in English. Tap Record / Stop for each task.', 0)
  RETURNING id INTO v_sec;

  -- ── Group 0: card passage — 音読 + No.1 ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
    'Flea Markets' || chr(10) || chr(10) ||
    'Today, flea markets are popular in many towns. People can sell things they do not need anymore, and visitors can buy clothes, books, and toys at low prices. Some people want to reduce waste, so they sell their old things at flea markets. Flea markets are also good places to talk with people.',
    'Look at the card. First, read the passage aloud. Then answer the questions.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Now, please read the passage aloud.',
    '{"subtask":"read_aloud","prep_seconds":20}'::jsonb, v_rub_s, 5) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'No. 1 — Please look at the passage. Why do some people sell their old things at flea markets?',
    '{"subtask":"passage_qa","reference":"From the passage: Some people want to reduce waste, so they sell their old things at flea markets. Expected answer: Because they want to reduce waste. (Full sentence with because/they preferred; reading the whole sentence from the card unchanged loses points for not converting some people to they.)"}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  -- ── Group 1: イラストA — No.2 (five people, five different actions) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'image', 'Picture A')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'No. 2 — Please look at Picture A. There are five people in the picture. Please describe what each of them is doing, using full sentences.',
    '{"subtask":"picture_qa","reference":"Intended illustration (Picture A): a flea market in a park, five people each doing a DIFFERENT action. (1) A man is carrying a large box. (2) A woman is hanging a T-shirt on a clothes rack. (3) A boy is drinking juice. (4) A girl is taking a picture of some toys with her camera. (5) An old man is sitting on a bench and reading a newspaper. Expected answers in present continuous, one sentence per person, e.g. A man is carrying a box. / A woman is hanging a T-shirt. / A boy is drinking juice. / A girl is taking a picture. / An old man is reading a newspaper. Award full marks only if all five actions are described with correct present continuous; reasonable synonyms (holding a box, putting up a shirt, taking a photo) are acceptable."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  -- ── Group 2: イラストB — No.3 (one person, obvious problem/intention) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 2, 'image', 'Picture B')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'No. 3 — Now, please look at Picture B. Please describe the situation.',
    '{"subtask":"picture_qa","reference":"Intended illustration (Picture B): a woman standing in front of a vending machine on a street. A thought bubble above her head shows a bottle of tea, but the tea button on the machine shows a SOLD OUT sign. Expected answer: She wants to buy (a bottle of) tea, but it is sold out / she cannot buy it because it is sold out. Full marks need BOTH the intention (she wants to buy tea) and the problem (it is sold out), in clear simple sentences."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  -- ── Group 3: No.4 + No.5 (no card) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 3, 'prompt', 'Now, Mr. / Ms. — please turn the card over. Answer the following questions about yourself.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'No. 4 — Do you think more people will go to flea markets in the future? Please tell me why or why not.',
    '{"subtask":"personal_qa","reference":"Opinion question related to the passage topic (flea markets). Any clear Yes/No position followed by one or two supporting reasons at A2-B1 level earns full marks, e.g. Yes — people want to save money and reduce waste / No — more people will shop on the Internet instead."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'No. 5 — Do you like shopping in your free time? Please tell me more.',
    '{"subtask":"personal_qa","reference":"Personal yes/no question plus expansion. Full marks for a clear Yes/No followed by extra detail (what they buy, where, with whom, why), e.g. Yes — I often go to the mall with my friends and look for clothes. One-word answers without expansion lose points."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded EIKEN Grade Pre-2 Mock 1 (reading: 29 Q, writing: 2 tasks, speaking: 6 tasks) — UNPUBLISHED.';
  RAISE NOTICE 'Listening (30 Q): run scripts/seed-eiken-pre2-listening-mock.mjs. Speaking images: see supabase/EIKEN-PRE2-IMAGES.md.';
END $$;
