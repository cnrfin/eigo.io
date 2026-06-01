-- ============================================================
--  Seed: score_scales + rubrics for IELTS / TOEIC / EIKEN
-- ============================================================
--  Makes server-side grading return REPORTED scores (bands /
--  scaled scores / pass-fail) and gives the AI grader rubric
--  criteria for writing & speaking.
--
--  Idempotent: every INSERT is guarded with NOT EXISTS, so this
--  file can be re-run safely. Run AFTER add-practice-tests.sql.
--
--  NOTE on accuracy:
--   - EIKEN uses the OFFICIAL CSE 2.0 two-stage structure, per-skill CSE
--     maxima, and stage cut-scores. Only the raw->CSE mapping is approximated
--     (linear), since the official equating is not public.
--   - IELTS band tables and TOEIC scaled tables are APPROXIMATE practice
--     references (no official public conversion exists for either). Adjust as needed.
-- ============================================================


-- ============================================================
--  1. SCORE SCALES
-- ============================================================

-- ---- IELTS Academic: Reading + Listening band tables (raw out of 40) ----
INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, 'reading', '{"raw_basis":40,"bands":[
  {"min_raw":39,"band":9.0},{"min_raw":37,"band":8.5},{"min_raw":35,"band":8.0},
  {"min_raw":33,"band":7.5},{"min_raw":30,"band":7.0},{"min_raw":27,"band":6.5},
  {"min_raw":23,"band":6.0},{"min_raw":19,"band":5.5},{"min_raw":15,"band":5.0},
  {"min_raw":13,"band":4.5},{"min_raw":10,"band":4.0},{"min_raw":8,"band":3.5},
  {"min_raw":6,"band":3.0},{"min_raw":4,"band":2.5},{"min_raw":0,"band":0.0}]}'::jsonb
FROM exam_tracks t
WHERE t.slug = 'ielts-academic'
  AND NOT EXISTS (SELECT 1 FROM score_scales s WHERE s.track_id = t.id AND s.skill = 'reading');

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, 'listening', '{"raw_basis":40,"bands":[
  {"min_raw":39,"band":9.0},{"min_raw":37,"band":8.5},{"min_raw":35,"band":8.0},
  {"min_raw":32,"band":7.5},{"min_raw":30,"band":7.0},{"min_raw":26,"band":6.5},
  {"min_raw":23,"band":6.0},{"min_raw":18,"band":5.5},{"min_raw":16,"band":5.0},
  {"min_raw":13,"band":4.5},{"min_raw":11,"band":4.0},{"min_raw":8,"band":3.5},
  {"min_raw":6,"band":3.0},{"min_raw":4,"band":2.5},{"min_raw":0,"band":0.0}]}'::jsonb
FROM exam_tracks t
WHERE t.slug = 'ielts-academic'
  AND NOT EXISTS (SELECT 1 FROM score_scales s WHERE s.track_id = t.id AND s.skill = 'listening');

-- ---- IELTS General Training: Reading (stricter table) + Listening (same as Academic) ----
INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, 'reading', '{"raw_basis":40,"bands":[
  {"min_raw":40,"band":9.0},{"min_raw":39,"band":8.5},{"min_raw":38,"band":8.0},
  {"min_raw":36,"band":7.5},{"min_raw":34,"band":7.0},{"min_raw":32,"band":6.5},
  {"min_raw":30,"band":6.0},{"min_raw":27,"band":5.5},{"min_raw":23,"band":5.0},
  {"min_raw":19,"band":4.5},{"min_raw":15,"band":4.0},{"min_raw":12,"band":3.5},
  {"min_raw":9,"band":3.0},{"min_raw":6,"band":2.5},{"min_raw":0,"band":0.0}]}'::jsonb
FROM exam_tracks t
WHERE t.slug = 'ielts-general'
  AND NOT EXISTS (SELECT 1 FROM score_scales s WHERE s.track_id = t.id AND s.skill = 'reading');

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, 'listening', '{"raw_basis":40,"bands":[
  {"min_raw":39,"band":9.0},{"min_raw":37,"band":8.5},{"min_raw":35,"band":8.0},
  {"min_raw":32,"band":7.5},{"min_raw":30,"band":7.0},{"min_raw":26,"band":6.5},
  {"min_raw":23,"band":6.0},{"min_raw":18,"band":5.5},{"min_raw":16,"band":5.0},
  {"min_raw":13,"band":4.5},{"min_raw":11,"band":4.0},{"min_raw":8,"band":3.5},
  {"min_raw":6,"band":3.0},{"min_raw":4,"band":2.5},{"min_raw":0,"band":0.0}]}'::jsonb
FROM exam_tracks t
WHERE t.slug = 'ielts-general'
  AND NOT EXISTS (SELECT 1 FROM score_scales s WHERE s.track_id = t.id AND s.skill = 'listening');

-- ---- TOEIC L&R: raw correct (0-100 per skill) -> scaled (5-495), nearest-raw lookup ----
INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, 'listening', '{"raw_basis":100,"table":[
  {"raw":0,"scaled":5},{"raw":10,"scaled":60},{"raw":20,"scaled":125},
  {"raw":30,"scaled":215},{"raw":40,"scaled":290},{"raw":50,"scaled":345},
  {"raw":60,"scaled":400},{"raw":70,"scaled":435},{"raw":80,"scaled":470},
  {"raw":90,"scaled":490},{"raw":100,"scaled":495}]}'::jsonb
FROM exam_tracks t
WHERE t.slug = 'toeic-lr'
  AND NOT EXISTS (SELECT 1 FROM score_scales s WHERE s.track_id = t.id AND s.skill = 'listening');

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, 'reading', '{"raw_basis":100,"table":[
  {"raw":0,"scaled":5},{"raw":10,"scaled":55},{"raw":20,"scaled":115},
  {"raw":30,"scaled":195},{"raw":40,"scaled":265},{"raw":50,"scaled":320},
  {"raw":60,"scaled":375},{"raw":70,"scaled":420},{"raw":80,"scaled":460},
  {"raw":90,"scaled":485},{"raw":100,"scaled":495}]}'::jsonb
FROM exam_tracks t
WHERE t.slug = 'toeic-lr'
  AND NOT EXISTS (SELECT 1 FROM score_scales s WHERE s.track_id = t.id AND s.skill = 'reading');

-- ---- EIKEN: official CSE 2.0 two-stage model per grade ----
-- Self-healing: clear any prior EIKEN overall scale rows (e.g. an earlier
-- pass_mark version) so re-running this seed installs the correct config.
DELETE FROM score_scales s
USING exam_tracks t, exams e
WHERE s.track_id = t.id AND t.exam_id = e.id AND e.slug = 'eiken' AND s.skill IS NULL;

-- Grades 5 & 4: first stage only (Reading/Listening; no writing, no interview).
INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, NULL, '{"model":"eiken_cse","per_skill_cse_max":425,
  "skills":{"reading":{"stage":1},"listening":{"stage":1}},
  "stages":{"1":{"label":"First Stage (Reading/Listening)","cut":419,"max":850}}}'::jsonb
FROM exam_tracks t WHERE t.slug = 'eiken-grade-5';

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, NULL, '{"model":"eiken_cse","per_skill_cse_max":500,
  "skills":{"reading":{"stage":1},"listening":{"stage":1}},
  "stages":{"1":{"label":"First Stage (Reading/Listening)","cut":622,"max":1000}}}'::jsonb
FROM exam_tracks t WHERE t.slug = 'eiken-grade-4';

-- Grades 3 and above: Stage 1 = Reading/Listening/Writing, Stage 2 = Speaking interview.
INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, NULL, '{"model":"eiken_cse","per_skill_cse_max":550,
  "skills":{"reading":{"stage":1},"listening":{"stage":1},"writing":{"stage":1},"speaking":{"stage":2}},
  "stages":{"1":{"label":"First Stage (Reading/Listening/Writing)","cut":1103,"max":1650},
            "2":{"label":"Second Stage (Speaking interview)","cut":353,"max":550}}}'::jsonb
FROM exam_tracks t WHERE t.slug = 'eiken-grade-3';

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, NULL, '{"model":"eiken_cse","per_skill_cse_max":600,
  "skills":{"reading":{"stage":1},"listening":{"stage":1},"writing":{"stage":1},"speaking":{"stage":2}},
  "stages":{"1":{"label":"First Stage (Reading/Listening/Writing)","cut":1322,"max":1800},
            "2":{"label":"Second Stage (Speaking interview)","cut":406,"max":600}}}'::jsonb
FROM exam_tracks t WHERE t.slug = 'eiken-grade-pre2';

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, NULL, '{"model":"eiken_cse","per_skill_cse_max":625,
  "skills":{"reading":{"stage":1},"listening":{"stage":1},"writing":{"stage":1},"speaking":{"stage":2}},
  "stages":{"1":{"label":"First Stage (Reading/Listening/Writing)","cut":1402,"max":1875},
            "2":{"label":"Second Stage (Speaking interview)","cut":427,"max":625}}}'::jsonb
FROM exam_tracks t WHERE t.slug = 'eiken-grade-pre2plus';

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, NULL, '{"model":"eiken_cse","per_skill_cse_max":650,
  "skills":{"reading":{"stage":1},"listening":{"stage":1},"writing":{"stage":1},"speaking":{"stage":2}},
  "stages":{"1":{"label":"First Stage (Reading/Listening/Writing)","cut":1520,"max":1950},
            "2":{"label":"Second Stage (Speaking interview)","cut":460,"max":650}}}'::jsonb
FROM exam_tracks t WHERE t.slug = 'eiken-grade-2';

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, NULL, '{"model":"eiken_cse","per_skill_cse_max":750,
  "skills":{"reading":{"stage":1},"listening":{"stage":1},"writing":{"stage":1},"speaking":{"stage":2}},
  "stages":{"1":{"label":"First Stage (Reading/Listening/Writing)","cut":1792,"max":2250},
            "2":{"label":"Second Stage (Speaking interview)","cut":512,"max":750}}}'::jsonb
FROM exam_tracks t WHERE t.slug = 'eiken-grade-pre1';

INSERT INTO score_scales (track_id, skill, scale)
SELECT t.id, NULL, '{"model":"eiken_cse","per_skill_cse_max":850,
  "skills":{"reading":{"stage":1},"listening":{"stage":1},"writing":{"stage":1},"speaking":{"stage":2}},
  "stages":{"1":{"label":"First Stage (Reading/Listening/Writing)","cut":2028,"max":2550},
            "2":{"label":"Second Stage (Speaking interview)","cut":602,"max":850}}}'::jsonb
FROM exam_tracks t WHERE t.slug = 'eiken-grade-1';


-- ============================================================
--  2. RUBRICS (writing + speaking)
-- ============================================================

-- ---- IELTS Writing + Speaking (band 0-9, half bands) for both tracks ----
INSERT INTO rubrics (track_id, skill, name, criteria, max_score)
SELECT t.id, 'writing', 'IELTS Writing', '{
  "band_scale": "0-9 in half-band steps",
  "criteria": [
    {"name":"Task Achievement/Response","description":"Fully addresses all parts of the task with a clear, well-developed position and relevant, extended, supported ideas."},
    {"name":"Coherence and Cohesion","description":"Logical organisation, clear progression, skilful paragraphing, and accurate, natural use of cohesive devices."},
    {"name":"Lexical Resource","description":"Wide range of vocabulary used naturally and precisely, with rare minor errors."},
    {"name":"Grammatical Range and Accuracy","description":"Wide range of structures used flexibly and accurately, with rare minor errors."}
  ]
}'::jsonb, 9
FROM exam_tracks t
WHERE t.slug IN ('ielts-academic','ielts-general')
  AND NOT EXISTS (SELECT 1 FROM rubrics r WHERE r.track_id = t.id AND r.skill = 'writing' AND r.name = 'IELTS Writing');

INSERT INTO rubrics (track_id, skill, name, criteria, max_score)
SELECT t.id, 'speaking', 'IELTS Speaking', '{
  "band_scale": "0-9 in half-band steps",
  "criteria": [
    {"name":"Fluency and Coherence","description":"Speaks at length without noticeable effort, coherent with fully appropriate cohesive features and topic development."},
    {"name":"Lexical Resource","description":"Uses vocabulary with full flexibility and precision, including idiomatic language naturally."},
    {"name":"Grammatical Range and Accuracy","description":"Uses a full range of structures naturally with consistent accuracy."},
    {"name":"Pronunciation","description":"Uses a full range of pronunciation features with precision; effortless to understand."}
  ]
}'::jsonb, 9
FROM exam_tracks t
WHERE t.slug IN ('ielts-academic','ielts-general')
  AND NOT EXISTS (SELECT 1 FROM rubrics r WHERE r.track_id = t.id AND r.skill = 'speaking' AND r.name = 'IELTS Speaking');

-- ---- TOEIC Speaking & Writing (scaled 0-200 each) ----
INSERT INTO rubrics (track_id, skill, name, criteria, max_score)
SELECT t.id, 'writing', 'TOEIC Writing', '{
  "scale": "0-200 scaled",
  "criteria": [
    {"name":"Task Completion","description":"Fully addresses the prompt with relevant, well-supported content appropriate to the task."},
    {"name":"Organization","description":"Clear structure and logical connection of ideas with effective transitions."},
    {"name":"Grammar","description":"Variety of structures used accurately with few errors."},
    {"name":"Vocabulary","description":"Precise, varied vocabulary appropriate to register and context."}
  ]
}'::jsonb, 200
FROM exam_tracks t
WHERE t.slug = 'toeic-sw'
  AND NOT EXISTS (SELECT 1 FROM rubrics r WHERE r.track_id = t.id AND r.skill = 'writing' AND r.name = 'TOEIC Writing');

INSERT INTO rubrics (track_id, skill, name, criteria, max_score)
SELECT t.id, 'speaking', 'TOEIC Speaking', '{
  "scale": "0-200 scaled",
  "criteria": [
    {"name":"Pronunciation","description":"Highly intelligible; stress, intonation and rhythm support meaning."},
    {"name":"Grammar & Vocabulary","description":"Accurate, varied language appropriate to the task."},
    {"name":"Cohesion","description":"Ideas connected logically and smoothly."},
    {"name":"Relevance & Completeness","description":"Responses fully address the task with sufficient, relevant detail."}
  ]
}'::jsonb, 200
FROM exam_tracks t
WHERE t.slug = 'toeic-sw'
  AND NOT EXISTS (SELECT 1 FROM rubrics r WHERE r.track_id = t.id AND r.skill = 'speaking' AND r.name = 'TOEIC Speaking');

-- ---- EIKEN Writing (criteria scored 0-4 each; grades with a writing section) ----
INSERT INTO rubrics (track_id, skill, name, criteria, max_score)
SELECT t.id, 'writing', 'EIKEN Writing', '{
  "criterion_scale": "each criterion scored 0-4",
  "criteria": [
    {"name":"Content","description":"Response addresses the question with relevant, on-topic ideas and adequate support."},
    {"name":"Structure","description":"Clear organisation with logical flow and appropriate connecting expressions."},
    {"name":"Vocabulary","description":"Appropriate, varied word choice for the level."},
    {"name":"Grammar","description":"Accurate, varied sentence structures for the level."}
  ]
}'::jsonb, 16
FROM exam_tracks t
WHERE t.slug IN ('eiken-grade-3','eiken-grade-pre2','eiken-grade-pre2plus','eiken-grade-2','eiken-grade-pre1','eiken-grade-1')
  AND NOT EXISTS (SELECT 1 FROM rubrics r WHERE r.track_id = t.id AND r.skill = 'writing' AND r.name = 'EIKEN Writing');

-- ---- EIKEN Speaking (interview; grades 3 and above) ----
INSERT INTO rubrics (track_id, skill, name, criteria, max_score)
SELECT t.id, 'speaking', 'EIKEN Speaking', '{
  "criterion_scale": "each criterion scored 0-5 (varies by grade)",
  "criteria": [
    {"name":"Reading Aloud","description":"Reads the passage clearly with appropriate pronunciation and phrasing."},
    {"name":"Q&A Responses","description":"Answers questions about the passage and topic relevantly and accurately."},
    {"name":"Interaction & Attitude","description":"Communicates actively, with appropriate eye contact and willingness to respond."}
  ]
}'::jsonb, 33
FROM exam_tracks t
WHERE t.slug IN ('eiken-grade-3','eiken-grade-pre2','eiken-grade-pre2plus','eiken-grade-2','eiken-grade-pre1','eiken-grade-1')
  AND NOT EXISTS (SELECT 1 FROM rubrics r WHERE r.track_id = t.id AND r.skill = 'speaking' AND r.name = 'EIKEN Speaking');
