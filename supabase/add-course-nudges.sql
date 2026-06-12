-- ============================================================
--  Course nudge flags (pronunciation gating / upsell / announce)
-- ============================================================
--  pron_upsell_dismissed_at — the "Need a teacher?" modal on the course track
--    was dismissed (it never shows again once set).
--  pron_announce_seen_at — the one-time "How's your L & R?" course
--    announcement modal on the dashboard was seen/dismissed.
--  Run once in the SQL editor. Idempotent.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pron_upsell_dismissed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pron_announce_seen_at TIMESTAMPTZ;
