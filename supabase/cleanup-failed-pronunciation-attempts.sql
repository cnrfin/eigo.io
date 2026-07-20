-- Remove pronunciation scores that were never real.
--
-- Until the fix in src/lib/pronunciation.ts, an Azure `Canceled` result (invalid
-- key, exhausted quota, throttling, network) resolved as a valid assessment of
-- all zeros instead of raising. That zero flowed through the route and was
-- written to pronunciation_attempts as a genuine 0/100, so every service
-- outage silently recorded a failing score against whoever was practising.
--
-- The signature of one of these is a completely empty assessment: score 0 AND
-- overall 0. A real bad attempt almost always still recognises something, so it
-- carries a non-zero overall or partial word scores. Rows where `details` is
-- present make this certain — a genuine attempt has words in the grade payload,
-- a cancelled one has an empty array.
--
-- Run the SELECTs first and eyeball the numbers before deleting anything.

-- 1. How much is affected, and over what period?
SELECT
  count(*)                                   AS suspect_rows,
  count(DISTINCT user_id)                    AS students_affected,
  min(created_at)                            AS first_seen,
  max(created_at)                            AS last_seen
FROM pronunciation_attempts
WHERE score = 0
  AND coalesce(overall, 0) = 0;

-- 2. Split by whether we can prove it from the stored breakdown. `empty_grade`
--    rows are certain (no words came back at all); `no_details` rows are the
--    same shape but predate the details column, so they're inferred.
SELECT
  CASE
    WHEN details IS NULL THEN 'no_details (inferred)'
    WHEN jsonb_array_length(coalesce(details->'grade'->'words', '[]'::jsonb)) = 0 THEN 'empty_grade (certain)'
    ELSE 'has_words (probably genuine — keep)'
  END AS classification,
  count(*)
FROM pronunciation_attempts
WHERE score = 0 AND coalesce(overall, 0) = 0
GROUP BY 1
ORDER BY 2 DESC;

-- 3. Per-student view, so you can tell whether anyone's lesson score is skewed.
SELECT p.email, count(*) AS zero_rows, max(a.created_at) AS most_recent
FROM pronunciation_attempts a
JOIN profiles p ON p.id = a.user_id
WHERE a.score = 0 AND coalesce(a.overall, 0) = 0
GROUP BY p.email
ORDER BY zero_rows DESC
LIMIT 50;

-- 4. Delete — SCOPED TO THIS OUTAGE ONLY.
--
--    The zero rows fall into two groups. The June 2026 ones (cnrfin93,
--    miwa.kanto) predate the expired Azure trial and are not from this bug, so
--    they are deliberately left alone. Only rows from July 2026 onward were
--    caused by the key being rejected; one student is affected.
--
--    Check the cutoff against `first_seen` in query 1 and widen or narrow it if
--    the outage started earlier than you think.
--
--    Deleting (rather than flagging) is the kinder option: these rows only feed
--    the "best score" per lesson, so removing them restores the learner's real
--    best, and a missing attempt reads as "not tried yet" rather than "failed".

-- Preview exactly what would go:
SELECT p.email, a.created_at, a.reference_text, a.score, a.overall
FROM pronunciation_attempts a
JOIN profiles p ON p.id = a.user_id
WHERE a.score = 0
  AND coalesce(a.overall, 0) = 0
  AND a.created_at >= '2026-07-01'
ORDER BY a.created_at;

-- BEGIN;
-- DELETE FROM pronunciation_attempts
-- WHERE score = 0
--   AND coalesce(overall, 0) = 0
--   AND created_at >= '2026-07-01'
--   AND (
--     details IS NULL
--     OR jsonb_array_length(coalesce(details->'grade'->'words', '[]'::jsonb)) = 0
--   );
-- -- expect ~14 rows (hachi4.6kg@gmail.com); then COMMIT; or ROLLBACK;
-- COMMIT;
