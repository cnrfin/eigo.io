-- Migration: guest funnel rate limiting
-- Run this in the Supabase SQL editor.
--
-- The landing funnel lets non-logged-in visitors try things (level check,
-- pronunciation) by minting an ANONYMOUS Supabase user on the first card tap.
-- Anonymous sign-in is throttled by hCaptcha, but nothing throttles the calls
-- that come AFTER: the pronunciation grader in particular runs a paid Azure
-- assessment (plus, for good/retry verdicts, an LLM coaching call) on every
-- POST, with no per-user or per-IP cap. A single anonymous user — or a script
-- rotating captcha-solved anon users behind one IP — could rack up real cost.
--
-- This adds a generic fixed-window counter keyed on an arbitrary "subject"
-- (user id or IP) and "action", and an atomic RPC that increments and reports
-- whether the caller is still under the limit. Same shape/philosophy as
-- add-sayafterme-usage.sql: the RPC owns atomicity, callers just ask.

-- 1. Fixed-window counter — one row per (subject, action, window bucket).
--    A "window bucket" is the epoch second floored to the window size, so all
--    hits in the same window share a row and increment the same counter.
CREATE TABLE IF NOT EXISTS guest_rate_limit (
  subject      TEXT        NOT NULL,             -- 'user:<uuid>' or 'ip:<addr>'
  action       TEXT        NOT NULL,             -- e.g. 'pron_attempt', 'test_attempt'
  window_start TIMESTAMPTZ NOT NULL,             -- start of the fixed window bucket
  count        INTEGER     NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (subject, action, window_start),
  CHECK (count >= 0)
);

-- Helps the prune below (delete everything older than a cutoff) scan by time.
CREATE INDEX IF NOT EXISTS idx_guest_rate_limit_window
  ON guest_rate_limit(window_start);

-- 2. RPC: guest_rate_limit_hit
--
-- Atomically records one hit for (subject, action) in the current fixed window
-- and returns TRUE when the caller is still AT OR UNDER p_limit, FALSE when this
-- hit pushed them over. Callers check BEFORE doing the expensive work and reject
-- with 429 on FALSE.
--
-- The window bucket is floor(now_epoch / window) * window, so a p_window_seconds
-- of 3600 gives clean hourly buckets. Over-limit hits still increment (which
-- keeps a hammering client blocked for the rest of the window) but the row rolls
-- over to a fresh count when the next window begins.
CREATE OR REPLACE FUNCTION guest_rate_limit_hit(
  p_subject        TEXT,
  p_action         TEXT,
  p_limit          INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_epoch  BIGINT      := floor(extract(epoch FROM NOW()))::BIGINT;
  v_window TIMESTAMPTZ := to_timestamp(v_epoch - (v_epoch % p_window_seconds));
  v_count  INTEGER;
BEGIN
  INSERT INTO guest_rate_limit (subject, action, window_start, count)
  VALUES (p_subject, p_action, v_window, 1)
  ON CONFLICT (subject, action, window_start)
  DO UPDATE
    SET count      = guest_rate_limit.count + 1,
        updated_at = NOW()
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. RPC: guest_rate_limit_prune
--
-- Deletes counter rows whose window is older than p_older_than_seconds. Buckets
-- are only useful for the duration of their window; anything older is dead
-- weight. Call this from a scheduled job (or opportunistically) to keep the
-- table small. Returns the number of rows removed.
CREATE OR REPLACE FUNCTION guest_rate_limit_prune(
  p_older_than_seconds INTEGER DEFAULT 86400
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM guest_rate_limit
    WHERE window_start < NOW() - make_interval(secs => p_older_than_seconds);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- 4. RLS — service role only.
--
-- All access goes through the supabase-admin (service role) client inside the
-- API routes; the table is never touched from the browser. Lock it down so a
-- leaked anon key can't read or tamper with the counters.
ALTER TABLE guest_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access guest_rate_limit"
  ON guest_rate_limit FOR ALL
  USING (auth.role() = 'service_role');
