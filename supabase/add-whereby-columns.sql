-- Add Whereby room columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS whereby_meeting_id TEXT,
  ADD COLUMN IF NOT EXISTS whereby_room_url TEXT,
  ADD COLUMN IF NOT EXISTS whereby_host_url TEXT;
