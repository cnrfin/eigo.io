-- News table
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  content_ja TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site settings (single-row config table)
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- ensures single row
  opening_hour INTEGER NOT NULL DEFAULT 16,           -- JST hour (0-23)
  closing_hour INTEGER NOT NULL DEFAULT 2,            -- JST hour (0-23, wraps past midnight)
  booking_buffer_hours INTEGER NOT NULL DEFAULT 6,    -- minimum hours before lesson start
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS for news: everyone can read published, only service role writes
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published news"
  ON news FOR SELECT
  USING (published = true);

-- RLS for settings: everyone can read
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON site_settings FOR SELECT
  USING (true);

-- Index for news ordering
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date DESC);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);
