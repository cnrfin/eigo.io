-- ════════════════════════════════════════════════════════════
-- support_tickets — user-submitted problem reports
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT,
  category TEXT NOT NULL CHECK (category IN ('bug', 'booking', 'payment', 'lesson', 'feature', 'other')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  device_info JSONB,            -- { model, os, app_version, device_name }
  status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,             -- internal notes from support staff
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Row Level Security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own support tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create support tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for admin dashboard, Resend email triggers, etc.)
CREATE POLICY "Service role full access to support tickets"
  ON support_tickets FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
