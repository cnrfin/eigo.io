-- Add dark mode preference to profiles table
-- Supports 'light', 'dark', or 'auto' (follows system)
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dark_mode_preference TEXT DEFAULT 'auto'
CHECK (dark_mode_preference IN ('light', 'dark', 'auto'));
