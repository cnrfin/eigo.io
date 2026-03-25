-- Add reminder tracking columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE;

-- Index for efficient cron queries (find unsent reminders for confirmed bookings)
CREATE INDEX IF NOT EXISTS idx_bookings_reminders
  ON bookings (date, start_time, status)
  WHERE status = 'confirmed' AND (reminder_24h_sent = FALSE OR reminder_1h_sent = FALSE);
