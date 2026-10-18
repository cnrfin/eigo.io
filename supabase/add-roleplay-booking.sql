-- Role-plays chosen for an AI lesson (ai-panel-implementation-plan.md, phase 3c): picked in the dashboard
-- (book ahead, or start now) instead of a course. The lesson opens straight into it.
--   roleplay_scene_id  a scene id from src/lib/roleplay/scenes/ (null = no role-play)
--   roleplay_level     0 初級 · 1 中級 · 2 上級 (the level the student chose, up to the one they're due)
alter table public.bookings
  add column if not exists roleplay_scene_id text,
  add column if not exists roleplay_level smallint check (roleplay_level is null or roleplay_level between 0 and 2);
