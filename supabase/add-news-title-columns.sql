-- Add title columns to news table for JA/EN titles
ALTER TABLE news
  ADD COLUMN IF NOT EXISTS title_ja TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_en TEXT NOT NULL DEFAULT '';
