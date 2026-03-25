-- Add transcription_id column to bookings table
-- Stores the Whereby transcription ID for on-demand transcript requests
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transcription_id TEXT DEFAULT NULL;
