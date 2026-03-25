-- Add poster name and avatar URL to news table
-- Run this in your Supabase SQL Editor
ALTER TABLE news
  ADD COLUMN IF NOT EXISTS poster_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS poster_avatar_url TEXT DEFAULT '';
