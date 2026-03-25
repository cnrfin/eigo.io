-- Add theme preference to profiles table
-- Run this in your Supabase SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light'));
