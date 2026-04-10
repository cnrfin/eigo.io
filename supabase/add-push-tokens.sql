-- ════════════════════════════════════════════════════════════
-- push_tokens — stores Expo push tokens for each user/device
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,                     -- Expo push token (ExponentPushToken[...])
  device_id TEXT,                          -- optional device identifier for dedup
  platform TEXT DEFAULT 'ios' NOT NULL,    -- 'ios' or 'android'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one token per user+device (upsert-friendly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_user_token
  ON push_tokens(user_id, token);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
  ON push_tokens(user_id);

-- Row Level Security
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tokens (e.g. on sign-out)
CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access (for server-side sending)
CREATE POLICY "Service role full access to push tokens"
  ON push_tokens FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
