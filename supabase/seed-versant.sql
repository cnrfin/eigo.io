-- ============================================================
--  Versant by Pearson — exam, track, GSE scale + rubric
-- ============================================================
--  Models the CURRENT "Versant by Pearson English Speaking and Listening
--  Test" (VESLT, 2024 spec): six machine-paced item types, ~37 items,
--  ~20 minutes, fully automated scoring.
--
--  Score report (per Pearson's validation report):
--    - Overall on the Global Scale of English (GSE), 10-90, with CEFR level
--    - Subscores: Listening (50% of Overall), Speaking (50% of Overall,
--      of which half is Manner of Speaking) -> content 75% / manner 25%
--
--  Our scores are an AI APPROXIMATION of Pearson's proprietary engine:
--  per-item content accuracy (vs. a reference) + a manner-of-speaking
--  estimate from the audio, mapped linearly onto GSE 10-90. The structure,
--  weights and CEFR bands are the published ones; the equating is not.
--
--  The track's scoring_model stays 'raw' (CHECK constraint); the engine
--  detects Versant via the overall score_scales row model='versant_gse'
--  (same pattern as EIKEN's eiken_cse).
--
--  Idempotent (self-healing DELETE + INSERT). Run AFTER add-practice-tests.sql.
--  Then generate the actual test:  node --env-file=.env.local scripts/seed-versant.mjs
-- ============================================================

DO $$
DECLARE
  v_exam  uuid;
  v_track uuid;
BEGIN
  -- ── Exam ──
  SELECT id INTO v_exam FROM exams WHERE slug = 'versant';
  IF v_exam IS NULL THEN
    INSERT INTO exams (slug, name, name_ja, description, trademark_notice, order_index)
    VALUES ('versant', 'Versant', 'Versant（ヴァーサント）',
            'Automated English speaking & listening assessment, widely used in hiring.',
            'Versant is a trademark of Pearson Education, Inc. This practice material is original and unaffiliated.',
            4)
    RETURNING id INTO v_exam;
  END IF;

  -- ── Track: English Speaking and Listening Test ──
  SELECT id INTO v_track FROM exam_tracks WHERE slug = 'versant-eslt';
  IF v_track IS NULL THEN
    INSERT INTO exam_tracks (exam_id, slug, name, name_ja, level_label, scoring_model, order_index)
    VALUES (v_exam, 'versant-eslt', 'English Speaking and Listening Test',
            '英語スピーキング＆リスニングテスト', 'GSE 10-90', 'raw', 0)
    RETURNING id INTO v_track;
  END IF;

  -- ── Overall score scale (GSE 10-90 + CEFR bands; official weights) ──
  DELETE FROM score_scales WHERE track_id = v_track;
  INSERT INTO score_scales (track_id, skill, scale) VALUES (v_track, NULL, '{
    "model": "versant_gse",
    "min": 10,
    "max": 90,
    "weights": { "listening": 0.5, "speaking_content": 0.25, "manner": 0.25 },
    "cefr": [
      { "min": 85, "level": "C2" },
      { "min": 76, "level": "C1" },
      { "min": 67, "level": "B2+" },
      { "min": 59, "level": "B2" },
      { "min": 51, "level": "B1+" },
      { "min": 43, "level": "B1" },
      { "min": 36, "level": "A2+" },
      { "min": 30, "level": "A2" },
      { "min": 22, "level": "A1" },
      { "min": 10, "level": "<A1" }
    ]
  }'::jsonb);

  -- ── Rubric (per-item AI grading instructions) ──
  DELETE FROM rubrics WHERE track_id = v_track AND skill = 'speaking' AND name = 'Versant Speaking & Listening';
  INSERT INTO rubrics (track_id, skill, name, criteria, max_score) VALUES (v_track, 'speaking', 'Versant Speaking & Listening', '{
    "style": "versant",
    "instructions": "Versant-style item: score CONTENT ACCURACY against the EXPECTED CONTENT reference, strictly and mechanically.",
    "content_scoring": {
      "short_answer": "Full marks if the answer matches the expected answer in meaning (synonyms fine, articles/plurals fine). 0 if wrong, off-topic, or silent.",
      "repeat": "Score by how much of the sentence was repeated verbatim and intelligibly: all or nearly all = full marks; about half the words in order = half marks; few/no words = 0. Do NOT reward paraphrase.",
      "retell": "Score coverage of the passage''s actors, actions and sequence retold in the candidate''s own words, plus grammar/vocabulary accuracy.",
      "opinion": "Score task fulfilment (addresses every part of the question), idea development with reasons, and grammar/vocabulary accuracy."
    },
    "manner": "ALWAYS also rate manner_score 0-5: pronunciation, fluency, rhythm and intelligibility ONLY, independent of whether the content was correct. 5 = effortless and clear at a conversational pace; 3 = noticeably non-native pacing/pronunciation but fully intelligible; 1 = frequent breakdowns; 0 = unintelligible or silent."
  }'::jsonb, 5);

  RAISE NOTICE 'Seeded Versant exam/track/scale/rubric (track versant-eslt). Now run: node --env-file=.env.local scripts/seed-versant.mjs';
END $$;
