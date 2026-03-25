-- Replace single opening/closing hour with a flexible time_windows JSON array
-- Each window: { "open": 6, "close": 9 } or { "open": 16, "close": 2 }
-- close < open means it wraps past midnight

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS time_windows JSONB NOT NULL DEFAULT '[{"open":6,"close":9},{"open":16,"close":2}]';

-- Keep old columns for now (backward compat), but they'll be ignored
