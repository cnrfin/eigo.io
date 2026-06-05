-- ============================================================
--  Full-length IELTS Academic Reading mock (full_mock → official band)
-- ============================================================
--  3 original passages, 40 marks total (P1=13, P2=13, P3=14), across the real
--  IELTS question-type mix: True/False/Not Given, sentence/summary completion,
--  multiple choice, matching headings, and choose-TWO. mode=full_mock so the
--  official Reading band fires (raw out of 40 → band table). 60-minute timer.
--  All content ORIGINAL. Idempotent. Run AFTER add-practice-tests.sql +
--  seed-test-scales-rubrics.sql.
-- ============================================================

DO $$
DECLARE
  v_track uuid; v_form uuid; v_sec uuid; v_grp uuid; v_q uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'ielts-academic-reading-mock-01';

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'ielts-academic';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Track ielts-academic not found.'; END IF;

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'ielts-academic-reading-mock-01', 'IELTS Academic — Reading Mock Test 1',
          'IELTS アカデミック リーディング模試1', 'full_mock', 3600, true)
  RETURNING id INTO v_form;

  -- ===================== PASSAGE 1 (13) =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Passage 1', 'The history of the vending machine',
          'Read the passage and answer Questions 1–13.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'The first vending machine on record was not a modern invention. In the first century AD, a Greek engineer named Hero of Alexandria described a device that dispensed a fixed amount of holy water when a coin was dropped into a slot. The coin fell onto a small lever, which briefly opened a valve before the weight of the coin slid off and closed it again. For centuries the idea went no further.

Modern vending machines appeared in London in the early 1880s. The first commercial machines sold postcards, and were soon followed by machines offering stamps and writing paper. In 1888 the Thomas Adams Gum Company installed machines on New York train platforms to sell chewing gum, and these were among the first vending successes in the United States.

The range of goods grew quickly. By the early twentieth century, machines sold cigarettes, sweets, and even, briefly, live bait for fishing. The biggest change came with refrigeration: cold-drink machines, introduced in the 1920s and 1930s, allowed bottled drinks to be sold safely in warm weather, and these soon became the most common type of machine worldwide.

Japan is often described as the country most enthusiastic about vending machines, with roughly one machine for every twenty-three people — the highest density in the world. Japanese machines sell an unusually wide variety of products, from hot coffee and fresh eggs to umbrellas. Several factors explain this: a dense urban population, very low rates of vandalism and theft, and high labour costs that make automated sales attractive.

Today, machines increasingly accept payment by smartphone and card rather than coins, and some use sensors to track which products sell best so they can be restocked efficiently. Yet the basic principle is exactly the one Hero described nearly two thousand years ago: a payment triggers the release of a fixed quantity of goods.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'true_false_notgiven', 'auto_choice', 'Hero of Alexandria''s device dispensed water.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', 'The first modern vending machines in London sold drinks.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', 'Chewing-gum machines in New York were among the first vending successes in the US.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', 'The Thomas Adams Gum Company later expanded its machines to Europe.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 4, 'gap_fill', 'auto_text', 'Cold-drink machines became common after the introduction of ______.', '{"accepted":["refrigeration"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', 'In Japan there is about one machine for every ______ people.', '{"accepted":["23","twenty-three"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', 'Japan has the highest machine ______ in the world.', '{"accepted":["density"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 7, 'gap_fill', 'auto_text', 'High ______ costs in Japan make automated sales attractive.', '{"accepted":["labour","labor"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 8, 'gap_fill', 'auto_text', 'Some modern machines use ______ to decide when to restock.', '{"accepted":["sensors"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 9, 'single_choice', 'auto_choice', 'What does the writer say about Hero''s machine?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It was widely copied at the time.',false),(v_q,1,'B','The idea was not developed further for a long time.',true),(v_q,2,'C','It sold food to travellers.',false),(v_q,3,'D','It was powered by electricity.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 10, 'single_choice', 'auto_choice', 'What was the first product sold by London''s commercial machines?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Stamps',false),(v_q,1,'B','Postcards',true),(v_q,2,'C','Writing paper',false),(v_q,3,'D','Chewing gum',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 11, 'single_choice', 'auto_choice', 'According to the passage, why are vending machines so common in Japan?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Low crime rates and high labour costs',true),(v_q,1,'B','Government subsidies',false),(v_q,2,'C','Cheap electricity',false),(v_q,3,'D','A shortage of shops',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 12, 'single_choice', 'auto_choice', 'What does the writer conclude about modern machines?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They are completely different from early ones.',false),(v_q,1,'B','They no longer accept any coins.',false),(v_q,2,'C','They still work on Hero''s basic principle.',true),(v_q,3,'D','They are becoming less popular.',false);

  -- ===================== PASSAGE 2 (13) =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Passage 2', 'Vertical farming',
          'Read the passage and answer Questions 14–26.', 1)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'A. Vertical farming is the practice of growing crops indoors in stacked layers, often inside warehouses or shipping containers. Instead of spreading outwards across fields, production is built upwards, so a small footprint of land can hold many growing surfaces.

B. Supporters point to several advantages. Because the environment is fully controlled, crops can be grown all year regardless of the weather, and without pesticides. Water use is dramatically lower, as the same water is recycled through the system. And because farms can be placed inside cities, food travels only a short distance to reach shops.

C. The approach depends on technology. Sunlight is replaced by energy-efficient LED lighting tuned to the colours plants use most. Rather than soil, most vertical farms use hydroponics, in which roots sit in a nutrient solution. Temperature, humidity and carbon dioxide are managed by climate-control systems, and sensors track plant health.

D. There are serious limitations, however. Replacing the sun with electric light makes energy the largest running cost, and the price of building and equipping a farm is high. Only certain crops are currently profitable; grains and most fruit are not.

E. Most experts therefore take a measured view. Vertical farming is well suited to leafy greens and herbs grown close to large cities, where freshness and short transport distances are valued. It is unlikely, though, to replace traditional field farming for staple crops any time soon.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 0, 'matching', 'auto_choice', 'Choose the correct heading for each paragraph (A–E) from the list.',
     ('{"items":[{"id":"A","text":"Paragraph A"},{"id":"B","text":"Paragraph B"},{"id":"C","text":"Paragraph C"},{"id":"D","text":"Paragraph D"},{"id":"E","text":"Paragraph E"}],'
      || '"match_options":[{"id":"i","text":"A definition of the approach"},{"id":"ii","text":"The equipment that makes it possible"},{"id":"iii","text":"Why some see it as promising"},{"id":"iv","text":"The main disadvantages"},{"id":"v","text":"A realistic view of its future"},{"id":"vi","text":"The history of greenhouse farming"},{"id":"vii","text":"Government funding for agriculture"}],'
      || '"answer":{"A":"i","B":"iii","C":"ii","D":"iv","E":"v"}}')::jsonb, 5)
  RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'single_choice', 'auto_choice', 'What does paragraph B give as an advantage of vertical farming?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It produces larger individual plants.',false),(v_q,1,'B','It uses much less water and can run all year.',true),(v_q,2,'C','It needs more workers than field farming.',false),(v_q,3,'D','It depends on good weather.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'single_choice', 'auto_choice', 'What is described as the largest running cost?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Water',false),(v_q,1,'B','Energy for lighting',true),(v_q,2,'C','Seeds',false),(v_q,3,'D','Transport',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'single_choice', 'auto_choice', 'Which crops does the passage say suit vertical farming best?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Grains',false),(v_q,1,'B','Fruit trees',false),(v_q,2,'C','Leafy greens and herbs',true),(v_q,3,'D','Root vegetables',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 4, 'single_choice', 'auto_choice', 'What is the writer''s overall view of vertical farming?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It will soon replace field farming.',false),(v_q,1,'B','It is best for certain crops near cities.',true),(v_q,2,'C','It has already failed.',false),(v_q,3,'D','It is too costly ever to use.',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', 'Vertical farms grow crops in stacked ______.', '{"accepted":["layers"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', 'Sunlight is replaced by energy-efficient ______ lighting.', '{"accepted":["LED"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 7, 'gap_fill', 'auto_text', 'Instead of soil, most vertical farms use ______.', '{"accepted":["hydroponics"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 8, 'gap_fill', 'auto_text', 'Plant health is tracked using ______.', '{"accepted":["sensors"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  -- ===================== PASSAGE 3 (14) =====================
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', 'Passage 3', 'The return of the wolf',
          'Read the passage and answer Questions 27–40.', 2)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
'By 1926, hunting had wiped out the last wolves in Yellowstone National Park in the United States. For nearly seventy years the park had no wolves at all. During that time the elk population grew large and, with no predator to fear, the elk grazed freely in the open valleys, stripping young willow and aspen trees along the rivers.

In 1995, in an effort to restore the park''s natural balance, biologists reintroduced wolves captured in Canada. The effects went far beyond the wolves themselves. The elk began to avoid the open valleys where they were easily hunted, and the young trees there finally had a chance to grow. As the willows and aspen recovered, beavers returned to build dams, and the slower, deeper water and stronger roots made the riverbanks more stable.

Scientists call this chain of effects a trophic cascade: a change at the top of the food chain reshapes the whole ecosystem beneath it. The Yellowstone wolves became one of the most studied examples in ecology.

Not everyone welcomed the wolves. Ranchers near the park lost livestock to them, and some strongly opposed the programme. To reduce the conflict, conservation groups set up schemes to compensate farmers for animals killed by wolves. Debate over how many wolves the region should hold still continues today.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 0, 'true_false_notgiven', 'auto_choice', 'Wolves disappeared from Yellowstone in the 1920s.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 1, 'true_false_notgiven', 'auto_choice', 'The reintroduced wolves came from Canada.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',true),(v_q,1,'','False',false),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 2, 'true_false_notgiven', 'auto_choice', 'After the wolves returned, the elk population immediately increased.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 3, 'true_false_notgiven', 'auto_choice', 'All local ranchers supported the reintroduction.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',true),(v_q,2,'','Not Given',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 4, 'true_false_notgiven', 'auto_choice', 'The compensation scheme has completely ended the conflict.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES (v_q,0,'','True',false),(v_q,1,'','False',false),(v_q,2,'','Not Given',true);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 5, 'gap_fill', 'auto_text', 'When the wolves returned, ______ began to avoid the open valleys.', '{"accepted":["elk"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 6, 'gap_fill', 'auto_text', 'Trees such as willows and ______ recovered along the rivers.', '{"accepted":["aspen"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 7, 'gap_fill', 'auto_text', '______ returned to the area and built dams.', '{"accepted":["beavers"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, max_score) VALUES
    (v_grp, 8, 'gap_fill', 'auto_text', 'As a result, the riverbanks became more ______.', '{"accepted":["stable"],"case_sensitive":false}'::jsonb, 1) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 9, 'single_choice', 'auto_choice', 'Why were wolves reintroduced to Yellowstone in 1995?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To attract more tourists',false),(v_q,1,'B','To restore the park''s natural balance',true),(v_q,2,'C','To control the beaver population',false),(v_q,3,'D','To replace the elk',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 10, 'single_choice', 'auto_choice', 'What happened to riverside vegetation after 1995?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','It disappeared completely.',false),(v_q,1,'B','It recovered.',true),(v_q,2,'C','It was planted by rangers.',false),(v_q,3,'D','It was unaffected.',false);
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 11, 'single_choice', 'auto_choice', 'What does the term "trophic cascade" describe?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','A type of waterfall',false),(v_q,1,'B','A chain of ecological effects',true),(v_q,2,'C','A method wolves use to hunt',false),(v_q,3,'D','A government policy',false);

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score) VALUES
    (v_grp, 12, 'multiple_choice', 'auto_choice', 'Which TWO effects of the wolves'' return are mentioned? Choose TWO.', 2) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Beavers returned to the area.',true),(v_q,1,'B','Elk changed their behaviour.',true),(v_q,2,'C','Tourism to the park declined.',false),(v_q,3,'D','The rivers dried up.',false),(v_q,4,'E','Forests were cut down.',false);

  RAISE NOTICE 'Seeded ielts-academic-reading-mock-01 (full_mock, 40 marks).';
END $$;
