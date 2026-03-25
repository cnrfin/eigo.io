-- Track the student's Google Calendar event ID so we can delete it on cancel/reschedule
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS student_gcal_event_id TEXT DEFAULT NULL;
