-- ============================================================
--  Sample content: EIKEN Grade 3 writing practice (AI-graded)
-- ============================================================
--  Exercises the AI rubric grading path end to end:
--    Q1  scoring_method 'ai_rubric'     -> graded immediately by the
--                                          multi-sample AI grader, band/feedback
--                                          shown in results.
--    Q2  scoring_method 'ai_plus_human' -> AI gives a provisional score AND the
--                                          response is flagged for the tutor
--                                          grading queue (/api/admin/tests/grading).
--
--  Attaches the EIKEN Writing rubric if present (run seed-test-scales-rubrics.sql
--  first for best results; otherwise the grader falls back to a generic rubric).
--  skill_practice form, so results show raw % + per-question AI feedback (no CSE).
--  Idempotent. Run AFTER add-practice-tests.sql.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_rubric uuid;
  v_form   uuid;
  v_sec    uuid;
  v_grp    uuid;
  v_q      uuid;
BEGIN
  DELETE FROM test_forms WHERE slug = 'eiken-g3-writing-practice-01';  -- refresh on re-run

  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'eiken-grade-3';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Track eiken-grade-3 not found — run add-practice-tests.sql first.';
  END IF;

  SELECT id INTO v_rubric
  FROM rubrics WHERE track_id = v_track AND skill = 'writing' AND name = 'EIKEN Writing'
  LIMIT 1;  -- may be NULL; grader falls back to a generic rubric

  INSERT INTO test_forms (track_id, slug, title, title_ja, mode, time_limit_seconds, published)
  VALUES (v_track, 'eiken-g3-writing-practice-01', 'EIKEN Grade 3 — Writing Practice 1',
          '英検3級 ライティング練習1', 'skill_practice', 1200, true)
  RETURNING id INTO v_form;

  INSERT INTO sections (form_id, skill, part_label, title, instructions, order_index)
  VALUES (v_form, 'writing', 'Writing', 'E-mail & Opinion',
          'Two tasks, as in the EIKEN Grade 3 writing section: an e-mail reply and an opinion.', 0)
  RETURNING id INTO v_sec;

  -- ── Task 1: E-mail reply (15-25 words) — the 2024 renewal task ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 0, 'prompt',
    'You received an e-mail from your friend. Reply, answering the underlined question.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'email_response', 'ai_rubric',
          'Your friend writes: "I watched a great movie last weekend! What did YOU do last weekend?" Write a reply (15-25 words).',
          '{"min_words":15,"max_words":25,"task":"email"}'::jsonb, v_rubric, 16)
  RETURNING id INTO v_q;

  -- ── Task 2: Opinion (25-35 words) — flagged for tutor confirmation ──
  INSERT INTO question_groups (section_id, order_index, stimulus_type, prompt)
  VALUES (v_sec, 1, 'prompt', 'Write your opinion. Give two reasons.')
  RETURNING id INTO v_grp;

  INSERT INTO questions (group_id, order_index, question_type, scoring_method, prompt, payload, rubric_id, max_score)
  VALUES (v_grp, 0, 'essay', 'ai_plus_human',
          'QUESTION: Which do you like better, summer or winter? Write your opinion and two reasons. (25-35 words)',
          '{"min_words":25,"max_words":35,"task":"opinion"}'::jsonb, v_rubric, 16)
  RETURNING id INTO v_q;

  RAISE NOTICE 'Seeded writing form eiken-g3-writing-practice-01 (rubric: %).', COALESCE(v_rubric::text, 'generic fallback');
END $$;
