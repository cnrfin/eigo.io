-- ============================================================
--  Sample content: IELTS Academic Reading practice (auto-graded)
-- ============================================================
--  One original Academic-style passage with faithful IELTS question types:
--    True/False/Not Given, sentence/summary completion (gap-fill),
--    multiple choice, and a "choose TWO" multi-select.
--  (Matching-heading/info questions are omitted until the matching UI exists.)
--
--  skill_practice form → results show raw % + per-question review (an official
--  band needs a full-length 40-question paper). All content is ORIGINAL.
--  Idempotent — re-run replaces the form. Run AFTER add-practice-tests.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid;
  v_form  uuid;
  v_sec   uuid;
  v_grp   uuid;
  v_q     uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-academic-reading-practice-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-academic';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track ielts-academic not found — run add-practice-tests.sql first.';
  END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'ielts-academic-reading-practice-01', 'IELTS Academic — Reading Practice 1',
          'IELTS アカデミック リーディング練習1', 'skill_practice', 1200, true)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Reading Passage 1', 'The Return of Urban Beekeeping',
          'Read the passage and answer the questions below.', 0)
  RETURNING id INTO v_sec;

  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'Once associated only with the countryside, beekeeping has quietly returned to the world''s cities. Over the past two decades, rooftops, balconies, and community gardens in places such as London, Paris, and Tokyo have become home to thousands of honeybee colonies. City authorities that once discouraged the practice now often promote it, and some have changed local laws to make keeping bees easier.

Several factors explain the trend. Concern about declining bee populations has pushed many residents to act locally. Cities can, somewhat surprisingly, be good places for bees: parks, street trees, and private gardens provide a wide variety of flowers, and urban areas are often warmer than the surrounding countryside, which can lengthen the season in which bees are active. Urban honey is also prized by some buyers, who believe its flavour reflects the particular mix of plants in a neighbourhood.

The movement is not without critics. Some scientists warn that placing too many hives in a small area can leave too little food for wild pollinators, such as solitary bees and bumblebees, which are often more important for pollination than honeybees. A few studies suggest that in districts with very high hive density, the local bees may all compete for the same limited flowers. For this reason, experts increasingly argue that cities should plant more flowering species rather than simply add more hives.

Training is widely available. Many cities now have beekeeping associations that run courses for beginners, and some companies install and manage hives on behalf of offices and hotels. Supporters say that, beyond any honey produced, the real value of urban beekeeping is educational: it reconnects city dwellers with the natural systems on which they depend.')
  RETURNING id INTO v_grp;

  -- ── Q1–4: True / False / Not Given ──
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'true_false_notgiven', 'auto_choice',
          'Do the following statements agree with the information in the passage? Write TRUE, FALSE, or NOT GIVEN.' || chr(10) || 'City governments have generally become more supportive of urban beekeeping.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '', 'True', true), (v_q, 1, '', 'False', false), (v_q, 2, '', 'Not Given', false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'true_false_notgiven', 'auto_choice',
          'Urban areas are usually colder than the countryside around them.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '', 'True', false), (v_q, 1, '', 'False', true), (v_q, 2, '', 'Not Given', false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'true_false_notgiven', 'auto_choice',
          'Urban honey is sold at a higher price than honey from the countryside.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '', 'True', false), (v_q, 1, '', 'False', false), (v_q, 2, '', 'Not Given', true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'true_false_notgiven', 'auto_choice',
          'Honeybees are the most important pollinators in cities.', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, '', 'True', false), (v_q, 1, '', 'False', true), (v_q, 2, '', 'Not Given', false);

  -- ── Q5–7: Sentence / summary completion (NO MORE THAN TWO WORDS) ──
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score)
  VALUES (v_grp, 4, 'gap_fill', 'auto_text',
          'Complete the sentence. Use NO MORE THAN TWO WORDS from the passage.' || chr(10) || 'Cities can suit bees partly because parks and gardens provide a wide variety of ______.',
          '{"accepted":["flowers"],"case_sensitive":false}'::jsonb, 1)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score)
  VALUES (v_grp, 5, 'gap_fill', 'auto_text',
          'Where hive density is very high, the local bees may all ______ for the same limited flowers.',
          '{"accepted":["compete"],"case_sensitive":false}'::jsonb, 1)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score)
  VALUES (v_grp, 6, 'gap_fill', 'auto_text',
          'Experts argue that cities should plant more ______ species rather than add more hives.',
          '{"accepted":["flowering"],"case_sensitive":false}'::jsonb, 1)
  RETURNING id INTO v_q;

  -- ── Q8–9: Multiple choice (one answer, A–D) ──
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 7, 'single_choice', 'auto_choice',
          'According to the passage, why can cities be suitable places for bees?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, 'A', 'They have far fewer predators than the countryside.', false),
    (v_q, 1, 'B', 'They offer a variety of flowers and are often milder in temperature.', true),
    (v_q, 2, 'C', 'They have banned the use of all pesticides.', false),
    (v_q, 3, 'D', 'They allow much larger hives than rural areas.', false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 8, 'single_choice', 'auto_choice',
          'What is the main concern raised by critics of urban beekeeping?', 1)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, 'A', 'Bees may sting people in crowded areas.', false),
    (v_q, 1, 'B', 'Training courses are too expensive.', false),
    (v_q, 2, 'C', 'Too many hives can leave too little food for wild pollinators.', true),
    (v_q, 3, 'D', 'Urban honey has a poor flavour.', false);

  -- ── Q10: Choose TWO (multi-select, 1 mark each) ──
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 9, 'multiple_choice', 'auto_choice',
          'Which TWO forms of help for new urban beekeepers are mentioned in the passage? Choose TWO.', 2)
  RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q, 0, 'A', 'Courses run by beekeeping associations', true),
    (v_q, 1, 'B', 'Government cash subsidies', false),
    (v_q, 2, 'C', 'Companies that install and manage hives', true),
    (v_q, 3, 'D', 'Free hives provided by the city', false),
    (v_q, 4, 'E', 'Online markets for selling honey', false);

  -- ── Q11: Matching headings (match a heading to each of the 4 paragraphs) ──
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score)
  VALUES (v_grp, 10, 'matching', 'auto_choice',
    'Choose the correct heading for each paragraph from the list of headings.',
    ('{"items":[{"id":"p1","text":"Paragraph 1"},{"id":"p2","text":"Paragraph 2"},{"id":"p3","text":"Paragraph 3"},{"id":"p4","text":"Paragraph 4"}],'
    || '"match_options":[{"id":"i","text":"The history of honey trading"},{"id":"ii","text":"A traditional practice returns to the city"},{"id":"iii","text":"Why cities can be good for bees"},{"id":"iv","text":"Concerns about competition for food"},{"id":"v","text":"Getting started: courses and companies"},{"id":"vi","text":"Government bans on urban hives"}],'
    || '"answer":{"p1":"ii","p2":"iii","p3":"iv","p4":"v"}}')::jsonb, 4)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded ielts-academic-reading-practice-01 (11 questions across 5 IELTS types, incl. matching).';
END $$;
