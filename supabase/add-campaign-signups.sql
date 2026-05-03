-- Campaign signups tracking table
-- Stores extra campaign-specific data (recording pref, consent, english level)
-- The actual user account lives in auth.users + profiles as normal

CREATE TABLE IF NOT EXISTS campaign_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  campaign TEXT NOT NULL DEFAULT '50hours-2026',
  english_level TEXT CHECK (english_level IN ('beginner', 'intermediate', 'advanced')),
  recording_preference TEXT CHECK (recording_preference IN ('video', 'audio')),
  notes TEXT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add campaign_source to profiles so we can filter/track campaign users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS campaign_source TEXT;

-- RLS
ALTER TABLE campaign_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign signup"
  ON campaign_signups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage campaign signups"
  ON campaign_signups FOR ALL
  USING (auth.role() = 'service_role');

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_campaign_signups_campaign ON campaign_signups(campaign);
CREATE INDEX IF NOT EXISTS idx_campaign_signups_user_id ON campaign_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_campaign_source ON profiles(campaign_source);
