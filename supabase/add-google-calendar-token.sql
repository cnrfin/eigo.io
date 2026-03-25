-- Add Google Calendar refresh token to profiles table
-- This stores the OAuth refresh token for students who connect their Google Calendar
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT DEFAULT NULL;
-- Track whether the student has connected their Google Calendar
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE;
