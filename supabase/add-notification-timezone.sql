-- Add timezone column to notification_preferences
-- Stores the IANA timezone string (e.g. 'Asia/Tokyo', 'Europe/London')
-- Defaults to 'Asia/Tokyo' for existing users since the app targets Japanese learners.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Tokyo' NOT NULL;
