-- ============================================================
--  EIKEN Grade Pre-1 — Mock Test 1: READING + WRITING + SPEAKING
-- ============================================================
--  2024 renewal format (CEFR B2), set 'eiken-pre1-mock-01':
--    READING (31 Q, 55 min):
--      大問1 — 18 short-sentence vocabulary gaps (B2-C1 lexis: collocations,
--              phrasal verbs, formal vocabulary)
--      大問2 — TWO ~250-word passages × 3 gap-fill-in-context blanks (6 Q)
--      大問3 — TWO passages (~300 and ~400 words, expository/argumentative)
--              with 3 + 4 comprehension questions (7 Q)
--    WRITING (2 tasks, 35 min): 要約 (summarize a ~200-word passage in 60-70
--      words) + 意見文 (agree/disagree essay, 120-150 words, using TWO of the
--      four printed POINTS, with introduction / body / conclusion).
--    SPEAKING (interview, 5 tasks, untimed): four-panel-cartoon narration
--      card (prep 60 s / speak 120 s) + No.1 hypothetical question about the
--      fourth panel + No.2-No.4 opinion questions on related social themes.
--      The single panel image is attached separately: see
--      supabase/EIKEN-PRE1-IMAGES.md + scripts/attach-eiken-pre1-images.mjs.
--      payload.reference tells the AI grader what the panels show (never
--      displayed to the student).
--    The listening form of this set (29 Q) is seeded by
--      scripts/seed-eiken-pre1-listening-mock.mjs (set_order 2).
--  All three forms are seeded UNPUBLISHED (admin draft preview).
--  All content is ORIGINAL practice material at B2 level.
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
    ('eiken-pre1-reading-mock-01', 'eiken-pre1-writing-mock-01', 'eiken-pre1-speaking-mock-01');

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'eiken-grade-pre1';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track eiken-grade-pre1 not found — run add-practice-tests.sql first.';
  END IF;
  SELECT id INTO v_rub_w FROM rubrics WHERE track_id = v_track AND skill = 'writing'  AND name = 'EIKEN Writing'  LIMIT 1;
  SELECT id INTO v_rub_s FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'EIKEN Speaking' LIMIT 1;
  IF v_rub_w IS NULL OR v_rub_s IS NULL THEN
    RAISE EXCEPTION 'EIKEN rubrics not found — run seed-test-scales-rubrics.sql first.';
  END IF;

  -- ═══════════════════════════ READING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-pre1-reading-mock-01', 'EIKEN Grade Pre-1 — Reading Mock Test 1',
          '英検準1級 リーディング模試1', 'full_mock', 3300, false,
          'eiken-pre1-mock-01', 'EIKEN Grade Pre-1 — Mock Test 1', '英検準1級 模試1', 0)
  RETURNING id INTO v_form;

  -- ──────────── 大問1: 短文の語句空所補充 (Q1–18) ────────────
  -- Keys: C A D B D A C B A D C B A D B C A D  (A:5 B:4 C:4 D:5, no letter 3× in a row)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問1', 'Vocabulary',
          'Choose the best word or phrase (A–D) to complete each sentence.', 0)
  RETURNING id INTO v_sec;
  INSERT INTO question_groups (section_id, order_index, stimulus_type) VALUES (v_sec, 0, 'none')
  RETURNING id INTO v_grp;

  -- Q1 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'The two countries finally reached a (     ) after months of negotiations, with each side agreeing to lower tariffs on some agricultural goods.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','collision',false),(v_q,1,'B','sequence',false),(v_q,2,'C','compromise',true),(v_q,3,'D','prescription',false);

  -- Q2 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'Heavy flooding (     ) the village from the rest of the region for three days, and emergency supplies had to be brought in by helicopter.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','isolated',true),(v_q,1,'B','dissolved',false),(v_q,2,'C','imitated',false),(v_q,3,'D','punctuated',false);

  -- Q3 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'Critics praised the novel for its (     ) portrayal of village life, saying that every detail, from the dialect to the weather, felt completely real.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','superficial',false),(v_q,1,'B','monotonous',false),(v_q,2,'C','incoherent',false),(v_q,3,'D','vivid',true);

  -- Q4 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice',
    'Rather than rush into a choice it might regret, the committee voted to (     ) its decision until more reliable data became available.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','provoke',false),(v_q,1,'B','defer',true),(v_q,2,'C','discard',false),(v_q,3,'D','nominate',false);

  -- Q5 (D) — collocation: flatly rejected
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 4, 'single_choice', 'auto_choice',
    'Despite the team''s confidence, their proposal was (     ) rejected by the board, which raised more than a dozen objections.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','scarcely',false),(v_q,1,'B','mutually',false),(v_q,2,'C','vaguely',false),(v_q,3,'D','flatly',true);

  -- Q6 (A) — collocation: restore one's reputation
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 5, 'single_choice', 'auto_choice',
    'After the scandal, the politician attempted to (     ) his reputation by donating to several charities and apologizing publicly.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','restore',true),(v_q,1,'B','oppress',false),(v_q,2,'C','dictate',false),(v_q,3,'D','stumble',false);

  -- Q7 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 6, 'single_choice', 'auto_choice',
    'The company''s profits have (     ) declined over the past five years, falling by about three percent annually.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','abruptly',false),(v_q,1,'B','thoroughly',false),(v_q,2,'C','steadily',true),(v_q,3,'D','generously',false);

  -- Q8 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 7, 'single_choice', 'auto_choice',
    'Volunteers handed out blankets and hot meals to (     ) the suffering of people left homeless by the earthquake.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','accumulate',false),(v_q,1,'B','alleviate',true),(v_q,2,'C','contradict',false),(v_q,3,'D','humiliate',false);

  -- Q9 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 8, 'single_choice', 'auto_choice',
    'The judge ruled that the document was (     ) to the case and instructed the jury to ignore it when reaching their verdict.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','irrelevant',true),(v_q,1,'B','legitimate',false),(v_q,2,'C','courteous',false),(v_q,3,'D','durable',false);

  -- Q10 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 9, 'single_choice', 'auto_choice',
    'The climbers were forced to (     ) their attempt on the summit when the weather suddenly worsened just below the final ridge.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','fulfill',false),(v_q,1,'B','assert',false),(v_q,2,'C','detain',false),(v_q,3,'D','abandon',true);

  -- Q11 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 10, 'single_choice', 'auto_choice',
    'Since the meeting was running late, Ms. Reyes gave only a (     ) summary of the fifty-page report, covering nothing but the main findings.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','clumsy',false),(v_q,1,'B','gradual',false),(v_q,2,'C','concise',true),(v_q,3,'D','spacious',false);

  -- Q12 (B) — collocation: correspond with
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 11, 'single_choice', 'auto_choice',
    'The witness''s account of the accident (     ) closely with the video footage, so the police considered her testimony reliable.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','interfered',false),(v_q,1,'B','corresponded',true),(v_q,2,'C','collided',false),(v_q,3,'D','negotiated',false);

  -- Q13 (A) — formal/C1 vocabulary
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 12, 'single_choice', 'auto_choice',
    'The CEO was widely criticized for making (     ) remarks about the company''s rivals during the press conference, and he later withdrew them.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','derogatory',true),(v_q,1,'B','adhesive',false),(v_q,2,'C','punctual',false),(v_q,3,'D','nutritious',false);

  -- Q14 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 13, 'single_choice', 'auto_choice',
    'Many of the library''s oldest manuscripts (     ) the fire of 1728 only because a quick-thinking librarian carried them outside in baskets.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','resembled',false),(v_q,1,'B','defeated',false),(v_q,2,'C','witnessed',false),(v_q,3,'D','survived',true);

  -- Q15 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 14, 'single_choice', 'auto_choice',
    'The bridge was closed for emergency repairs last week, (     ) thousands of commuters to take a thirty-minute detour around the bay.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','resisting',false),(v_q,1,'B','compelling',true),(v_q,2,'C','dismissing',false),(v_q,3,'D','applauding',false);

  -- Q16 (C) — phrasal verb: fall through
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 15, 'single_choice', 'auto_choice',
    'The merger talks (     ) at the last minute when the smaller company''s shareholders rejected the final offer.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','wore off',false),(v_q,1,'B','stood out',false),(v_q,2,'C','fell through',true),(v_q,3,'D','showed off',false);

  -- Q17 (A) — phrasal verb: live up to
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 16, 'single_choice', 'auto_choice',
    'Sales of the new model failed to (     ) the company''s expectations, and production was cut by half within a year.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','live up to',true),(v_q,1,'B','come down with',false),(v_q,2,'C','get away with',false),(v_q,3,'D','look down on',false);

  -- Q18 (D) — phrasal verb: drag on
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 17, 'single_choice', 'auto_choice',
    'The budget meeting (     ) for nearly four hours, and several exhausted committee members left before any vote was taken.', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','pulled over',false),(v_q,1,'B','called off',false),(v_q,2,'C','handed down',false),(v_q,3,'D','dragged on',true);

  -- ──────────── 大問2: 長文の語句空所補充 (Q19–24) ────────────
  -- Two ~250-word passages, 3 blanks each. Keys: B D A / C A D
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問2', 'Passage Gap Fill',
          'Read each passage and choose the best phrase (A–D) for each numbered blank.', 1)
  RETURNING id INTO v_sec;

  -- Passage 2A (society): remote work and city-center businesses
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'The Quiet Lunch Hour' || chr(10) || chr(10) ||
    'When large numbers of office employees began working from home, most public discussion focused on the workers themselves: their productivity, their well-being, and their work-life balance. Far less attention was paid to the small businesses that had grown up around office districts. Sandwich shops, dry cleaners, and shoe repairers in city centers depended almost entirely on commuters, and when those commuters disappeared, the businesses ( 19 ). Within a year, some downtown streets that had been crowded every lunchtime were lined with empty shopfronts.' || chr(10) || chr(10) ||
    'Some city governments responded with rescue programs, offering reduced rents or temporary cash support. Critics argued, however, that such programs merely delayed the inevitable. In their view, the shift to remote work was permanent, and it made little sense to ( 20 ). Instead, they said, cities should help shop owners move to where the customers now actually were: residential neighborhoods.' || chr(10) || chr(10) ||
    'There are signs that this advice is being followed. In several large cities, vacancy rates on suburban shopping streets have fallen even as office districts continue to struggle. A café owner who relocated from the financial district to a neighborhood near a park reported that her sales had recovered within six months. ( 21 ), her new rent was barely half of what she had been paying downtown. For businesses that depend on daily foot traffic, following the crowd appears to be wiser than waiting for it to come back.')
  RETURNING id INTO v_grp;

  -- Q19 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '( 19 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','moved into larger offices',false),(v_q,1,'B','lost most of their customers',true),
    (v_q,2,'C','hired more part-time staff',false),(v_q,3,'D','extended their opening hours',false);

  -- Q20 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '( 20 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','charge shop owners higher rents',false),(v_q,1,'B','train workers for new careers',false),
    (v_q,2,'C','encourage even more remote work',false),(v_q,3,'D','keep supporting shops in places customers had left',true);

  -- Q21 (A) — connector
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '( 21 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','What was more',true),(v_q,1,'B','In contrast',false),
    (v_q,2,'C','For instance',false),(v_q,3,'D','Nevertheless',false);

  -- Passage 2B (science/environment): the return of the beaver
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
    'Engineers of the Wetlands' || chr(10) || chr(10) ||
    'Beavers were once hunted almost to extinction across Europe for their fur. Today, after decades of protection and reintroduction programs, the animals are spreading again, and scientists are discovering that their return brings unexpected benefits. By building dams of branches and mud, beavers slow the flow of streams and create ponds and wetlands. These act like natural sponges: they store water during heavy rain and release it slowly during dry periods. In one English study, land downstream from a series of beaver dams ( 22 ) during a storm that flooded neighboring valleys.' || chr(10) || chr(10) ||
    'The animals'' engineering also improves water quality. As water passes through a chain of beaver ponds, soil and farm chemicals settle to the bottom instead of flowing onward into rivers. Researchers measuring streams below beaver territories have found the water there to be significantly cleaner than in similar streams without beavers.' || chr(10) || chr(10) ||
    '( 23 ), the beavers'' comeback has not pleased everyone. Their dams sometimes flood farmland or block drainage channels, and the animals cut down trees that landowners would prefer to keep. Some farmers have demanded the right to remove the animals from their land. Conservation groups respond that most conflicts can be solved cheaply with simple devices, such as pipes installed through dams that ( 24 ). Whether beavers are seen as helpful engineers or troublesome neighbors, they are clearly reshaping European landscapes once again.')
  RETURNING id INTO v_grp;

  -- Q22 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice', '( 22 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','was completely washed away',false),(v_q,1,'B','rapidly lost its value',false),
    (v_q,2,'C','suffered far less damage',true),(v_q,3,'D','attracted crowds of tourists',false);

  -- Q23 (A) — connector
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice', '( 23 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','However',true),(v_q,1,'B','As a result',false),
    (v_q,2,'C','Similarly',false),(v_q,3,'D','For example',false);

  -- Q24 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice', '( 24 )', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','keep the animals warm in winter',false),(v_q,1,'B','help farmers catch more fish',false),
    (v_q,2,'C','make the dams easier to find',false),(v_q,3,'D','keep pond water at a safe level',true);

  -- ──────────── 大問3: 長文の内容一致選択 (Q25–31) ────────────
  -- Passage A (~300 words, 3 Q, keys C B D) + Passage B (~400 words, 4 Q, keys A C B D)
  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'reading', '大問3', 'Reading Comprehension',
          'Read each passage and choose the best answer (A–D) for each question.', 2)
  RETURNING id INTO v_sec;

  -- Passage 3A (~300 words, history/society): copyright traps on maps
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 0, 'passage',
    'The Towns That Never Were' || chr(10) || chr(10) ||
    'Mapmaking has always faced a peculiar problem: how can a publisher prove that a rival has copied its work? Coastlines, rivers, and roads are facts, and facts cannot be copyrighted. A competitor accused of copying can simply claim to have surveyed the same landscape. In the early twentieth century, some publishers found a quiet solution. They began inserting deliberate errors into their maps — a curving street that did not exist, or a tiny invented village. If the same imaginary feature later appeared on another company''s map, it could not have come from the real world, and copying was the only explanation.' || chr(10) || chr(10) ||
    'The most famous of these "paper towns" was Agloe, a name two American mapmakers invented in the 1930s by combining their own initials. They placed it beside an empty country road in New York State. Decades later, the fictional town briefly came to life: someone built a small shop at that exact spot and, taking the name from the map, called it the Agloe General Store. When a rival publisher later printed Agloe on its own map and was accused of copying, it pointed to the store and argued that the place genuinely existed.' || chr(10) || chr(10) ||
    'Such traps have not disappeared in the digital age. Online mapping services and dictionary publishers are widely believed to plant fictitious entries for the same purpose, though they rarely confirm it. Legal experts, meanwhile, point out the strategy''s weakness: a trap proves copying only if the copier is careless, and courts have not always accepted such traps as decisive evidence. Even so, mapmakers seem unwilling to give them up — partly, perhaps, because hiding a secret, nonexistent town in a sea of real ones is one of the few jokes their precise profession allows.')
  RETURNING id INTO v_grp;

  -- Q25 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'Why did some map publishers insert deliberate errors into their maps?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','To make their maps more attractive to collectors.',false),(v_q,1,'B','To test whether customers read maps carefully.',false),
    (v_q,2,'C','To be able to show that rivals had copied their work.',true),(v_q,3,'D','To hide sensitive locations from foreign companies.',false);

  -- Q26 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'What happened in the case of Agloe?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Two mapmakers opened a store on an empty road.',false),(v_q,1,'B','A real shop appeared at the invented location.',true),
    (v_q,2,'C','A rival company successfully sued the mapmakers.',false),(v_q,3,'D','The town was removed from every map in the 1930s.',false);

  -- Q27 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'What do legal experts say about map traps?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','They are against the law in most countries.',false),(v_q,1,'B','They are no longer used by online services.',false),
    (v_q,2,'C','They make maps too confusing for users.',false),(v_q,3,'D','They do not always work as evidence in court.',true);

  -- Passage 3B (~400 words, argumentative, science/society): the right to repair
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text)
  VALUES (v_sec, 1, 'passage',
    'Repair or Replace?' || chr(10) || chr(10) ||
    'When a smartphone screen cracks or a washing machine stops spinning, the sensible response was once obvious: have it repaired. Today, repair is often so difficult or expensive that replacement seems the only practical choice. Many modern devices are sealed shut with glue rather than screws, spare parts are sold only to authorized service centers, and repair manuals are treated as company secrets. Critics argue that this is not an accident of design but a deliberate strategy — one that keeps customers buying new products on a regular cycle.' || chr(10) || chr(10) ||
    'In response, a movement known as "right to repair" has grown up in Europe and North America. Its supporters want laws requiring manufacturers to make spare parts, tools, and repair information available to consumers and independent repair shops at reasonable prices. They point to two main benefits. The first is financial: repairing a device typically costs a fraction of replacing it, and a healthy repair market creates skilled jobs in local communities. The second is environmental. Manufacturing a new smartphone generates the great majority of all the carbon emissions the device will ever be responsible for, so extending the life of phones already in use is one of the most direct ways to shrink the electronics industry''s footprint. Discarded electronics, meanwhile, have become one of the world''s fastest-growing forms of waste.' || chr(10) || chr(10) ||
    'Manufacturers have pushed back. They argue that opening devices up to untrained repairers creates safety risks — a carelessly handled battery can catch fire — and that sharing detailed technical information could expose their designs to copying. They also note that the sealed construction critics complain about is partly what makes modern devices slim and water-resistant. Forcing companies to design for repairability, they warn, could mean heavier, less attractive products.' || chr(10) || chr(10) ||
    'Lawmakers have nevertheless begun to act. The European Union now requires makers of certain appliances to supply spare parts for years after sale, and several American states have passed repair laws of their own. Perhaps the most interesting experiment comes from France, where every phone and laptop must display a "repairability score" at the point of sale. Early evidence suggests that shoppers compare the scores and that some manufacturers have quietly redesigned products to raise them. Whatever the law eventually settles, the underlying question is simple: when you buy a product, how much of it do you really own?')
  RETURNING id INTO v_grp;

  -- Q28 (A)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 0, 'single_choice', 'auto_choice',
    'According to critics, why are many modern devices difficult to repair?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Manufacturers design them that way to encourage new purchases.',true),(v_q,1,'B','Repair shops are unwilling to train their staff.',false),
    (v_q,2,'C','Modern parts wear out much faster than older ones.',false),(v_q,3,'D','Consumers prefer devices that cannot be opened.',false);

  -- Q29 (C)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 1, 'single_choice', 'auto_choice',
    'What environmental point do supporters of the right to repair make?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Repair shops recycle nearly all of their waste.',false),(v_q,1,'B','Old devices use more electricity than new ones.',false),
    (v_q,2,'C','Most of a phone''s emissions come from manufacturing it.',true),(v_q,3,'D','Discarded electronics can be buried safely.',false);

  -- Q30 (B)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 2, 'single_choice', 'auto_choice',
    'What is one argument made by manufacturers?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Repair laws would make their products cheaper.',false),(v_q,1,'B','Repairs by untrained people can be dangerous.',true),
    (v_q,2,'C','Consumers rarely ask for repair manuals.',false),(v_q,3,'D','Independent shops charge unfairly high prices.',false);

  -- Q31 (D)
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, max_score)
  VALUES (v_grp, 3, 'single_choice', 'auto_choice',
    'What does the example of France suggest?', 1) RETURNING id INTO v_q;
  INSERT INTO question_options (question_id, order_index, label, content, is_correct) VALUES
    (v_q,0,'A','Repair laws are nearly impossible to enforce.',false),(v_q,1,'B','French consumers replace phones especially often.',false),
    (v_q,2,'C','Repairability scores confuse most shoppers.',false),(v_q,3,'D','Displaying repairability scores can influence product design.',true);

  -- ═══════════════════════════ WRITING ═══════════════════════════
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-pre1-writing-mock-01', 'EIKEN Grade Pre-1 — Writing Mock Test 1',
          '英検準1級 ライティング模試1', 'full_mock', 2100, false,
          'eiken-pre1-mock-01', 'EIKEN Grade Pre-1 — Mock Test 1', '英検準1級 模試1', 1)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'Summary & Opinion Essay',
          'Two tasks, as in the EIKEN Grade Pre-1 writing section: summarize a passage in 60-70 words, then write an opinion essay of 120-150 words using two of the given POINTS.', 0)
  RETURNING id INTO v_sec;

  -- ── Task 1: 要約 (summarize the passage in 60–70 words) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'passage',
    'In recent years, many supermarkets have replaced some of their staffed checkout counters with self-checkout machines, where shoppers scan and pay for their items themselves. Store owners say the machines bring clear advantages. Customers buying only a few items can finish quickly instead of waiting in long lines, and because fewer cashiers are needed, stores can hold down labor costs and move staff to other tasks, such as restocking shelves or helping shoppers find products.' || chr(10) || chr(10) ||
    'However, the machines have brought problems as well. Customers who are unfamiliar with the technology, including many elderly shoppers, often run into trouble and end up needing a staff member''s help anyway, which cancels out the time savings. Stores have also discovered that unpaid items — whether scanned incorrectly by accident or deliberately stolen — are far more common at self-checkout machines than at staffed counters, and these losses can be greater than the money saved on wages.' || chr(10) || chr(10) ||
    'There is a social cost, too. For some customers, particularly those who live alone, a brief chat with a cashier is a valued part of the shopping trip. Partly for these reasons, several supermarket chains that once rushed to install the machines have recently begun removing some of them and reopening staffed lanes.',
    'Read the passage and summarize it in your own words as far as possible.')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'Summarize the passage above in 60-70 words. Use your own words as far as possible.',
    '{"task":"summary","min_words":60,"max_words":70,"reference":"Summary task (EIKEN Pre-1 要約). The source passage makes these key points, all of which a full-credit summary should cover in compressed form: (1) Many supermarkets have introduced self-checkout machines in place of staffed counters. (2) Benefits: shoppers with few items save time, and stores cut labor costs / redeploy staff. (3) Problems: shoppers unfamiliar with the technology (e.g. the elderly) still need staff help; unpaid or unscanned items (mistakes and theft) increase, offsetting the savings; the loss of brief human contact matters to some customers. (4) As a result, some chains have started removing machines and bringing back staffed lanes. Award full Content credit only if the advantages, the disadvantages, and the recent reversal are all represented. The summary must be 60-70 words, in the writer''s own words (long phrases copied verbatim from the passage lose Content/Vocabulary credit), neutral in tone (no personal opinion), and organised logically with appropriate linking (e.g. however, as a result)."}'::jsonb,
    v_rub_w, 16) RETURNING id INTO v_q;

  -- ── Task 2: 意見文 (120–150 words, TOPIC + 4 POINTS, use TWO) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt',
    'Write an essay on the given TOPIC. Use TWO of the POINTS below to support your answer. Structure: introduction, main body, and conclusion.')
  RETURNING id INTO v_grp;
  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_rubric',
    'TOPIC: Agree or disagree: Governments should spend more money on space exploration' || chr(10) || chr(10) ||
    'POINTS:' || chr(10) ||
    '● Cost' || chr(10) ||
    '● Technology' || chr(10) ||
    '● International cooperation' || chr(10) ||
    '● The environment' || chr(10) || chr(10) ||
    'Write 120-150 words. Use TWO of the points above. Include an introduction, a main body, and a conclusion.',
    '{"task":"opinion_essay","min_words":120,"max_words":150,"points":["Cost","Technology","International cooperation","The environment"],"reference":"EIKEN Pre-1 opinion essay. TOPIC: Agree or disagree — governments should spend more money on space exploration. A full-credit essay (1) states a clear agree/disagree position in the introduction, (2) develops TWO of the four printed POINTS (Cost / Technology / International cooperation / The environment) in the body — e.g. AGREE: Technology (space research produces inventions such as satellite communications, weather forecasting and new materials that benefit everyday life) and International cooperation (joint missions build peaceful ties between countries); or DISAGREE: Cost (the enormous budgets would help more people if spent on welfare, education or healthcare) and The environment (rocket launches pollute, and the money is needed for climate measures on Earth) — and (3) restates the position in a conclusion. Either position is acceptable. Deduct Content credit if fewer than two of the printed points are clearly used; deduct Coherence credit if the introduction-body-conclusion structure is missing. Length 120-150 words; B2-level range and accuracy expected, with appropriate connectors (e.g. furthermore, in addition, therefore)."}'::jsonb,
    v_rub_w, 16) RETURNING id INTO v_q;

  -- ═══════════════════════════ SPEAKING ═══════════════════════════
  -- Interview format: four-panel cartoon narration card + No.1 (hypothetical,
  -- about the 4th panel) + No.2-No.4 (opinion questions, no card). Untimed
  -- (self-paced interview). The single 2x2 panel image is attached later via
  -- scripts/attach-eiken-pre1-images.mjs — see supabase/EIKEN-PRE1-IMAGES.md.
  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published,
                          set_slug, set_title, set_title_ja, set_order)
  VALUES (v_track, 'eiken-pre1-speaking-mock-01', 'EIKEN Grade Pre-1 — Speaking Mock Test 1',
          '英検準1級 スピーキング模試1', 'full_mock', NULL, false,
          'eiken-pre1-mock-01', 'EIKEN Grade Pre-1 — Mock Test 1', '英検準1級 模試1', 3)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'speaking', 'Interview', 'Narration & Questions',
          'Look at the four-panel cartoon and narrate the story, beginning with the printed sentence. Then answer the questions by speaking in English. Tap Record / Stop for each task.', 0)
  RETURNING id INTO v_sec;

  -- ── Group 0: narration card (4-panel cartoon) — narration + No.1 ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, passage_text, prompt)
  VALUES (v_sec, 0, 'image',
    'You have one minute to prepare.' || chr(10) ||
    'This is a story about a woman who wanted her family to spend less time looking at screens.' || chr(10) ||
    'You have two minutes to narrate the story.' || chr(10) ||
    'Your story should begin with the following sentence:' || chr(10) ||
    'One day, a woman was unhappy that her family spent the whole weekend looking at screens.',
    'Look at the four pictures. Prepare for one minute, then narrate the story in two minutes.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'Now, please begin your narration. Start with the printed sentence: "One day, a woman was unhappy that her family spent the whole weekend looking at screens."',
    '{"subtask":"narration","prep_seconds":60,"speak_seconds":120,"reference":"Four-panel cartoon (2x2 grid, panels numbered 1-4). Panel 1: in a living room, a woman stands with her hands on her hips, looking annoyed at her husband and teenage son, who are slumped on the sofa, the husband staring at his smartphone and the son at a tablet, with the TV on in the background. Panel 2: the woman holds up a leaflet showing a picture of a sunny park with people cycling; she points at it enthusiastically while the husband and son look up reluctantly. Panel 3: that weekend, the three of them are cycling together along a path in the park, all smiling, with trees and a pond around them — the plan seems to be a success. Panel 4 (the ironic twist): the husband and son stand beside their parked bicycles looking annoyed, because the woman is now sitting on a park bench absorbed in her own smartphone, taking and posting photos, exactly like the behavior she complained about. A full-credit narration (a) begins with the printed opening sentence, (b) covers all four panels in order with correct past tenses and clear sequencing (e.g. the next weekend, later that day), (c) describes the woman''s complaint and suggestion, the family''s reluctant agreement, the enjoyable bike ride, and the twist that the woman herself ended up glued to her phone while the others waited, and (d) fills roughly the full two minutes. Reasonable wording variations are fine, but the twist in panel 4 must be conveyed."}'::jsonb,
    v_rub_s, 15) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'No. 1 — Please look at the fourth picture. If you were the woman, what would you be thinking?',
    '{"subtask":"hypothetical_qa","reference":"Hypothetical question about panel 4: the woman is sitting on the bench using her smartphone while her husband and son wait by the bicycles, annoyed. The candidate should answer in the first person with appropriate hypothetical/modal language (I would be thinking that... / I''d probably feel...). Any plausible thought earns credit, e.g. self-aware: ''Oh no, I''m doing exactly what I told my family not to do — I should put my phone away and enjoy the park with them,'' or defensive: ''I only wanted to take a few photos of our family day; I''ll just post these and then join them.'' Full marks need a first-person perspective, at least one or two well-formed B2-level sentences, and a clear connection to the situation in the fourth panel."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  -- ── Group 1: No.2–No.4 (opinion questions, no card) ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'Now, please turn the card over. I am going to ask you some questions about social topics.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'speaking_response', 'ai_rubric',
    'No. 2 — Do you think people today rely too much on their smartphones?',
    '{"subtask":"opinion_qa","reference":"Opinion question on a social theme related to the card (screen dependence). Either Yes or No is acceptable. Full marks for a clear position supported by one or two developed reasons or examples at B2 level, e.g. Yes — people check their phones constantly, cannot concentrate, and lose face-to-face conversation; or No — smartphones are simply useful tools for maps, payments and keeping in touch, and most people manage them sensibly. Answers should be two to four sentences; a bare yes/no without support loses points."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 1, 'speaking_response', 'ai_rubric',
    'No. 3 — Should parents limit the amount of time their children spend online?',
    '{"subtask":"opinion_qa","reference":"Opinion question. Either position is acceptable. Full marks for a clear stance plus one or two developed reasons, e.g. Yes — children need sleep, exercise and homework time, and they cannot yet control their own use; or No — strict limits cause conflict, and it is better to teach children to manage their own time because the internet is also where they learn and socialize. Expect two to four well-formed B2-level sentences with appropriate modals (should, need to, allow)."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 2, 'speaking_response', 'ai_rubric',
    'No. 4 — Do you think the government should do more to encourage people to spend time outdoors?',
    '{"subtask":"opinion_qa","reference":"Broader societal opinion question. Either position is acceptable. Full marks for a clear stance plus developed support, e.g. Yes — outdoor activity improves physical and mental health and reduces medical costs, so governments should build parks and promote outdoor events; or No — how people spend their free time is a personal choice, and public money is better spent on schools or hospitals. Expect two to four well-formed B2-level sentences with a societal (not purely personal) perspective."}'::jsonb,
    v_rub_s, 5) RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded EIKEN Grade Pre-1 Mock 1 (reading: 31 Q, writing: 2 tasks, speaking: 5 tasks incl. narration) — UNPUBLISHED.';
  RAISE NOTICE 'Listening (29 Q): run scripts/seed-eiken-pre1-listening-mock.mjs. Speaking panels image: see supabase/EIKEN-PRE1-IMAGES.md.';
END $$;
