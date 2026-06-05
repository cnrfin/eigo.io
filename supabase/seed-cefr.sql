-- ============================================================
--  CEFR Level Check — exam, track, scale + rubrics
-- ============================================================
--  A ~20-minute level estimate built on CEFR principles without the weight
--  of a full proficiency exam:
--    - Objective core (vocab / grammar / reading / listening) as a GRADED
--      LADDER: every item is tagged payload.cefr ('A1'..'C1'). Scoring is
--      criterion-referenced (DIALANG-style "baskets"): your receptive level
--      is the highest level whose basket you clear (>= pass_fraction),
--      walking up from A1 — NOT a flat percentage.
--    - One short writing task + two short speaking prompts, AI-graded
--      directly against the CEFR global descriptors on a 1-6 scale
--      (1=A1 .. 6=C2).
--    - Overall = 50% receptive ladder + 25% writing + 25% speaking,
--      reported as a standard CEFR band with strength (low/mid/high) and
--      the matching CEFR-J sub-level as a secondary label (hybrid display).
--
--  This is an ESTIMATE and is labelled as such in the results UI.
--
--  Idempotent. Run AFTER add-practice-tests.sql.
--  Then generate the test:  node --env-file=.env.local scripts/seed-cefr.mjs
-- ============================================================

DO $$
DECLARE
  v_exam  uuid;
  v_track uuid;
BEGIN
  -- ── Exam ──
  SELECT id INTO v_exam FROM exams WHERE slug = 'cefr';
  IF v_exam IS NULL THEN
    INSERT INTO exams (slug, name, name_ja, description, trademark_notice, order_index)
    VALUES ('cefr', 'CEFR Level Check', 'CEFR レベルチェック',
            'A quick four-skill estimate of your CEFR level (A1-C2).',
            '', 0)
    RETURNING id INTO v_exam;
  END IF;

  -- ── Track ──
  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'cefr-check';
  IF v_track IS NULL THEN
    INSERT INTO exam_tracks (exam_id, slug, name, name_ja, level_label, scoring_model, order_index)
    VALUES (v_exam, 'cefr-check', 'CEFR Level Check', 'CEFR レベルチェック', 'A1-C2', 'raw', 0)
    RETURNING id INTO v_track;
  END IF;

  -- ── Overall scale (basket walk + band fusion + CEFR-J hybrid labels) ──
  DELETE FROM score_scales WHERE track_id = v_track;
  INSERT INTO score_scales (track_id, skill, scale) VALUES (v_track, NULL, '{
    "model": "cefr_level",
    "levels": ["A1", "A2", "B1", "B2", "C1"],
    "pass_fraction": 0.6,
    "weights": { "objective": 0.5, "writing": 0.25, "speaking": 0.25 },
    "estimate": true
  }'::jsonb);

  -- ── Rubrics: grade the PERFORMANCE LEVEL (1-6), not task completion ──
  DELETE FROM rubrics WHERE track_id = v_track;
  INSERT INTO rubrics (track_id, skill, name, criteria, max_score) VALUES (v_track, 'writing', 'CEFR Writing Level', '{
    "style": "cefr_level",
    "instructions": "Place this writing sample on the CEFR scale. overall_score MUST be the CEFR level number: 1=A1, 2=A2, 3=B1, 4=B2, 5=C1, 6=C2 (half values allowed, e.g. 2.5 = between A2 and B1). Judge the LANGUAGE LEVEL demonstrated, not effort or task completion. A short but accurate and natural sample can still show a high level; length alone never raises the level.",
    "descriptors": {
      "1_A1": "Isolated simple phrases and memorised expressions; very basic vocabulary; frequent basic errors.",
      "2_A2": "Simple sentences linked with and/but/because on familiar topics; routine vocabulary; errors frequent but message clear.",
      "3_B1": "Connected text on familiar topics; can describe experiences and give brief reasons and opinions; errors do not block meaning.",
      "4_B2": "Clear, detailed text; develops an argument with appropriate connectors; good grammatical control, occasional slips.",
      "5_C1": "Well-structured, flexible text; wide vocabulary range used precisely; rare, hard-to-spot errors.",
      "6_C2": "Precise, nuanced, effortless writing; style adapted naturally; near-perfect control."
    }
  }'::jsonb, 6);

  INSERT INTO rubrics (track_id, skill, name, criteria, max_score) VALUES (v_track, 'speaking', 'CEFR Speaking Level', '{
    "style": "cefr_level",
    "instructions": "Place this spoken sample on the CEFR scale. overall_score MUST be the CEFR level number: 1=A1, 2=A2, 3=B1, 4=B2, 5=C1, 6=C2 (half values allowed). Judge the LANGUAGE LEVEL demonstrated across fluency, pronunciation, vocabulary range, and grammatical control - not effort or accent. Silence or non-English: score 0.",
    "descriptors": {
      "1_A1": "Isolated words and memorised phrases; long pauses; pronunciation often hard to follow.",
      "2_A2": "Short simple sentences about familiar things; noticeable pausing and searching for words; intelligible with effort.",
      "3_B1": "Keeps going comprehensibly on familiar topics; gives reasons and opinions; pauses for grammatical and lexical planning are evident.",
      "4_B2": "Speaks at length with a fairly even tempo; develops ideas clearly; few errors, generally self-corrects.",
      "5_C1": "Fluent and spontaneous, almost effortless; smooth, natural delivery; wide range used flexibly.",
      "6_C2": "Effortless, precise, natural speech with nuanced expression; native-like ease (accent irrelevant)."
    }
  }'::jsonb, 6);

  RAISE NOTICE 'Seeded CEFR exam/track/scale/rubrics (track cefr-check). Now run: node --env-file=.env.local scripts/seed-cefr.mjs';
END $$;
