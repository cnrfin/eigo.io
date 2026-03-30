-- ════════════════════════════════════════════════════════════
-- notification_preferences — per-user push notification settings
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true NOT NULL,
  lesson_reminders BOOLEAN DEFAULT true NOT NULL,
  review_reminders BOOLEAN DEFAULT true NOT NULL,
  news_updates BOOLEAN DEFAULT true NOT NULL,
  promotional BOOLEAN DEFAULT false NOT NULL,
  review_reminder_time TEXT DEFAULT '09:00' NOT NULL,  -- "HH:mm" in user's local time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON notification_preferences(user_id);

-- Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role has full access (for server-side operations)
CREATE POLICY "Service role full access to notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
