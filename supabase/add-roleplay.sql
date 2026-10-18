-- Role-plays (ai-panel-implementation-plan.md, phase 3): the student's progress per scene.
-- cleared = how many levels they've completed in their main role (0 = never played; 1 = 初級 done, …; 3 = all).
-- The level they play next is min(cleared, 2): the first time 初級, then 中級, then 上級.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS roleplay_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id TEXT NOT NULL,
  cleared SMALLINT NOT NULL DEFAULT 0 CHECK (cleared BETWEEN 0 AND 3),
  plays INT NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, scene_id)
);

ALTER TABLE roleplay_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "roleplay_progress: read own" ON roleplay_progress FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- writes go through the server (service role)
