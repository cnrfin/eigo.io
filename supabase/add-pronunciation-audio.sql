-- ============================================================
--  Pronunciation attempt audio (funnel only)
-- ============================================================
--  Anonymous (free-funnel) pronunciation attempts upload their recording to the
--  private `pronunciation-audio` storage bucket so the post-sign-up results
--  screen can play it back (the recording is otherwise just a local blob that
--  dies on page reload). Regular accounts do NOT upload — their in-lesson
--  playback uses the local blob. Objects are pruned after 24h by
--  /api/cron/prune-pron-audio, so this column usually points at a live object
--  only briefly. Run once in the SQL editor. Idempotent.

ALTER TABLE pronunciation_attempts
  ADD COLUMN IF NOT EXISTS audio_path TEXT;   -- object path in the pronunciation-audio bucket (NULL for non-funnel attempts)

-- Storage bucket (create in the dashboard, or via SQL):
--   insert into storage.buckets (id, name, public) values
--     ('pronunciation-audio', 'pronunciation-audio', false)
--   on conflict (id) do nothing;
-- No storage RLS policies needed: all reads/writes go through the API with the
-- service role (signed URLs are minted server-side for playback).
