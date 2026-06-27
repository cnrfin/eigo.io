-- Add 75-minute lesson duration option
-- Run this in Supabase SQL Editor to update the live database constraint

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_duration_minutes_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_duration_minutes_check
  CHECK (duration_minutes IN (15, 30, 45, 60, 75));
