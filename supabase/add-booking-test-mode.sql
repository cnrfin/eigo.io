-- ============================================================
--  Booking test mode (for test accounts)
-- ============================================================
--  booking_test_mode — OPT-IN (default false; no row = off). When true the
--  account can book any duration, at any time of day, without a subscription
--  or minutes:
--    - /api/calendar/available returns every 15-minute slot for the day
--      (from 15 minutes ago onwards), ignoring opening hours and the calendar
--    - /api/calendar/book skips the subscription, minute, slot and trial logic
--  Everything else about the booking is real (Whereby room, calendar event,
--  notifications). Toggled in Admin → Permissions.
--  Applied to EIGO-WEB on 2026-10-06. Idempotent.

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS booking_test_mode BOOLEAN NOT NULL DEFAULT false;

-- Test account used for the classroom pilot:
UPDATE user_permissions SET booking_test_mode = true, updated_at = NOW(), updated_by = 'cnrfin93@gmail.com'
 WHERE user_id = (SELECT id FROM profiles WHERE email = 'cnr.webdev@gmail.com');
