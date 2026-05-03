-- Migration: Say After Me — AI generation usage tracking
-- Run this in the Supabase SQL editor.
--
-- The Say After Me iOS app lets Pro subscribers generate custom phrases
-- (translation + ElevenLabs TTS) up to 100 times per calendar month. The
-- app is anonymous — there is no Supabase user behind a generation
-- request. Identity comes from the RevenueCat App User ID, which we
-- verify against RevenueCat's REST API at request time.
--
-- This table tracks the per-user, per-month counter. The atomic
-- try-increment RPC enforces the cap server-side without any
-- application-level read-then-write race.
--
-- Why per-(rc_user_id, period_month) instead of one row per generation:
--   We don't need a generation log right now. A simple counter is enough
--   to enforce the cap. If we ever want analytics ("how many phrases did
--   this user generate"), we can add an event table later — the counter
--   is the only thing that needs to be transactional.

-- 1. Usage counter table — one row per (RC user, calendar month) bucket.
CREATE TABLE IF NOT EXISTS sayafterme_usage (
  rc_user_id    TEXT      NOT NULL,                 -- RevenueCat App User ID
  period_month  TEXT      NOT NULL,                 -- 'YYYY-MM' (UTC calendar month)
  count         INTEGER   NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (rc_user_id, period_month),
  CHECK (count >= 0)
);

-- Index for lookups by RC user (e.g. usage history view in admin).
-- The composite PK already covers (rc_user_id, period_month) lookups,
-- but a standalone rc_user_id index helps "all months for this user"
-- queries which scan only the leading column.
CREATE INDEX IF NOT EXISTS idx_sayafterme_usage_rc_user
  ON sayafterme_usage(rc_user_id);

-- 2. RPC: sayafterme_try_increment
--
-- Atomically increments the current-month counter for the given RC user,
-- subject to a hard cap (passed as parameter so we can change tiers
-- without a migration). Returns the NEW count on success, or NULL when
-- the cap has been reached and the row was not updated.
--
-- Why ON CONFLICT ... WHERE:
--   When the row exists and `count < p_limit`, the UPDATE runs and
--   RETURNING yields the new count. When `count >= p_limit`, the WHERE
--   on the UPDATE evaluates false, no UPDATE happens, and RETURNING
--   yields nothing — which the caller reads as "over limit". Postgres
--   serialises the row lock so two concurrent calls cannot both bypass
--   the cap.
--
-- Why VALUES(...,1) for the insert path:
--   First-ever generation in a month creates the row with count = 1
--   (i.e. THIS request counts toward the cap). Calling this RPC always
--   represents a real generation attempt.
CREATE OR REPLACE FUNCTION sayafterme_try_increment(
  p_rc_user_id TEXT,
  p_limit      INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_period TEXT := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');
  v_count  INTEGER;
BEGIN
  INSERT INTO sayafterme_usage (rc_user_id, period_month, count)
  VALUES (p_rc_user_id, v_period, 1)
  ON CONFLICT (rc_user_id, period_month)
  DO UPDATE
    SET count      = sayafterme_usage.count + 1,
        updated_at = NOW()
    WHERE sayafterme_usage.count < p_limit
  RETURNING count INTO v_count;

  -- v_count is NULL when the conflict path's WHERE failed (over limit).
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 3. RPC: sayafterme_refund
--
-- Decrements the current-month counter by 1 if it is > 0. Used when a
-- generation attempt fails after the increment (translation or TTS
-- error), so the user isn't charged for work we couldn't deliver.
-- Returns the NEW count, or NULL if no row existed for this period
-- (which would only happen if the API route is buggy — refund without
-- a prior increment shouldn't be possible, but the guard is cheap).
CREATE OR REPLACE FUNCTION sayafterme_refund(
  p_rc_user_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_period TEXT := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');
  v_count  INTEGER;
BEGIN
  UPDATE sayafterme_usage
    SET count      = count - 1,
        updated_at = NOW()
    WHERE rc_user_id   = p_rc_user_id
      AND period_month = v_period
      AND count > 0
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 4. RLS — service role only.
--
-- The Say After Me app talks to its own /api/sayafterme/* routes, never
-- to Supabase directly. All access goes through the supabase-admin
-- client (service role). Locking the table down means a leaked anon key
-- can't read or modify usage counters.
ALTER TABLE sayafterme_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access sayafterme_usage"
  ON sayafterme_usage FOR ALL
  USING (auth.role() = 'service_role');
