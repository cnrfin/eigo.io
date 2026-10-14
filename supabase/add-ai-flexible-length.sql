-- AI lessons can be any length from 5 to 30 minutes, so a student can use the month's last plan minutes
-- (minutes don't roll over). Lessons with the teacher keep the fixed lengths.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_duration_minutes_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_duration_minutes_check
  CHECK (
    duration_minutes IN (15, 30, 45, 60, 75)
    OR (lesson_kind = 'ai' AND duration_minutes BETWEEN 5 AND 30)
  );
