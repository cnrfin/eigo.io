-- ============================================================
--  In-house classroom (phase 0): see classroom-implementation-plan.md
-- ============================================================
--  Everything here is additive. Existing Whereby lessons, bookings and the
--  exam mini-course tables (courses / lessons / lesson_progress / assets) are
--  untouched: the new tables use the slide_ and classroom_ prefixes.
--
--  New tables are service-role only (RLS on, no policies), the same pattern as
--  user_permissions: all reads and writes go through API routes. The one
--  exception is Realtime: the private channel `classroom:<bookingId>` is
--  authorised by the policies at the bottom.
--
--  Applied to EIGO-WEB on 2026-10-06. Idempotent.
--  (The no_show booking status is in add-booking-no-show.sql.)

-- ---------- 1. Pilot flag --------------------------------------------------
-- NOTE: unlike the other flags, this one is OPT-IN. A missing user_permissions
-- row means "classroom off" (handled in src/lib/user-permissions.ts).
ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS classroom_enabled BOOLEAN NOT NULL DEFAULT false;

-- ---------- 2. Student's native language (chat translation, word lookups) --
-- The UI language stays profiles.preferred_language. Don't use
-- teacup_settings.native_language (that belongs to CUPS).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS native_language TEXT NOT NULL DEFAULT 'ja';

-- ---------- 3. Published slide courses (from the studio) -------------------
CREATE TABLE IF NOT EXISTS slide_courses (
  id            TEXT PRIMARY KEY,                 -- Course.id, e.g. 'c_greatbritain'
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  title_ja      TEXT,
  description   TEXT,
  level         TEXT,                             -- CEFR, e.g. 'A2'
  category      TEXT,
  cover_image   TEXT,                             -- path inside the course's asset folder
  published     BOOLEAN NOT NULL DEFAULT false,   -- shown in the classroom library
  version       INTEGER NOT NULL DEFAULT 0,       -- +1 on every completed publish
  course        JSONB NOT NULL,                   -- full Course JSON (units → lessons → slides)
  published_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE slide_courses ENABLE ROW LEVEL SECURITY;

-- Assets: public bucket, objects at <courseId>/<path from course.json>
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('slide-courses', 'slide-courses', true, 52428800)            -- 50 MB (videos)
ON CONFLICT (id) DO NOTHING;

-- ---------- 4. Bookings: chosen course + lesson chat -----------------------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slide_course_id TEXT REFERENCES slide_courses(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slide_lesson_id TEXT;   -- Lesson.id inside the course JSON; NULL = free talk

-- Lesson chat (about 10 messages a lesson). Each item:
--   { id, from: 'teacher'|'student', text?, file?: { path, name, size, type }, at: ISO }
-- The chat download is built from this array (end of lesson, and later from the summary).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS chat_log JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Atomic append, so two messages sent at the same moment can't overwrite each other.
CREATE OR REPLACE FUNCTION append_lesson_chat(p_booking UUID, p_msg JSONB)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE bookings
     SET chat_log = chat_log || jsonb_build_array(p_msg), updated_at = NOW()
   WHERE id = p_booking AND jsonb_array_length(chat_log) < 500;
$$;
REVOKE EXECUTE ON FUNCTION append_lesson_chat(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION append_lesson_chat(UUID, JSONB) TO service_role;

-- Chat attachments: private bucket, objects at <bookingId>/<uuid>-<name>.
-- Downloads use signed URLs. Pruned after 30 days by a cron (phase 1).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('classroom-files', 'classroom-files', false, 20971520, ARRAY[   -- 20 MB
  'image/jpeg','image/png','image/gif','image/webp','image/heic',
  'application/pdf','text/plain',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm'
])
ON CONFLICT (id) DO NOTHING;

-- ---------- 5. Live lesson state (survives refreshes and drop-outs) --------
CREATE TABLE IF NOT EXISTS classroom_sessions (
  booking_id            UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  student_joined_at     TIMESTAMPTZ,              -- first time the student entered (no-show check)
  started_at            TIMESTAMPTZ,              -- lesson clock: first moment both people were in
  ended_at              TIMESTAMPTZ,              -- teacher pressed "End lesson for everyone"
  recording_stopped_at  TIMESTAMPTZ,
  course_id             TEXT REFERENCES slide_courses(id) ON DELETE SET NULL,
  lesson_id             TEXT,
  used_course           BOOLEAN NOT NULL DEFAULT false,   -- any course opened → lesson-complete layout F
  state                 JSONB NOT NULL DEFAULT '{}'::jsonb, -- { slideId, whiteboard, mode, studentDraw }
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE classroom_sessions ENABLE ROW LEVEL SECURITY;

-- Drawings per slide, plus the one-per-lesson whiteboard (surface = 'board')
CREATE TABLE IF NOT EXISTS classroom_ink (
  booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE,
  surface     TEXT NOT NULL,
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- stroke / line / shape / text items, in slide-stage coords
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (booking_id, surface)
);
ALTER TABLE classroom_ink ENABLE ROW LEVEL SECURITY;

-- True/false + matching answers, per block
CREATE TABLE IF NOT EXISTS classroom_activity (
  booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE,
  block_id    TEXT NOT NULL,
  state       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (booking_id, block_id)
);
ALTER TABLE classroom_activity ENABLE ROW LEVEL SECURITY;

-- ---------- 6. Lesson ratings (admin-only) ---------------------------------
CREATE TABLE IF NOT EXISTS lesson_ratings (
  booking_id  UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars       SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE lesson_ratings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS lesson_ratings_created_idx ON lesson_ratings (created_at DESC);

-- ---------- 7. Course progress ("pick up where we left off") ---------------
CREATE TABLE IF NOT EXISTS slide_course_progress (
  user_id               UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id             TEXT REFERENCES slide_courses(id) ON DELETE CASCADE,
  lesson_id             TEXT,                       -- last lesson used
  slide_id              TEXT,                       -- last slide reached (id, not index)
  completed_lesson_ids  TEXT[] NOT NULL DEFAULT '{}',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);
ALTER TABLE slide_course_progress ENABLE ROW LEVEL SECURITY;

-- ---------- 8. AI cache: word lookups + chat translation -------------------
CREATE TABLE IF NOT EXISTS ai_lookup_cache (
  kind        TEXT NOT NULL CHECK (kind IN ('word','chat')),
  lang        TEXT NOT NULL,                        -- target language, e.g. 'ja'
  key         TEXT NOT NULL,                        -- sha256 of the normalised input
  result      JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kind, lang, key)
);
ALTER TABLE ai_lookup_cache ENABLE ROW LEVEL SECURITY;

-- ---------- 9. Saving words from courses, lookups and chat -----------------
-- (src/lib/slides/VOCAB-SAVE.md). Existing rows are all source = 'lesson'.
ALTER TABLE vocabulary_phrases ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE vocabulary_phrases ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'lesson';
DO $$ BEGIN
  ALTER TABLE vocabulary_phrases ADD CONSTRAINT vocabulary_phrases_source_check
    CHECK (source IN ('lesson','course','lookup','chat'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE vocabulary_phrases ADD COLUMN IF NOT EXISTS source_course_id TEXT;
ALTER TABLE vocabulary_phrases ADD COLUMN IF NOT EXISTS source_item_id TEXT;   -- VocabItem.id, 'lk:<term>' or 'chat:<hash>'
CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_phrases_source_uniq
  ON vocabulary_phrases (user_id, source_course_id, source_item_id)
  WHERE source_item_id IS NOT NULL;

-- ---------- 10. Schema drift: columns already in the DB, missing from files --
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_30min_sent BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS summary_nudge_sent BOOLEAN DEFAULT false;

-- ---------- 11. Realtime authorisation for classroom:<bookingId> -----------
-- Keep in sync with ADMIN_EMAILS in src/lib/admin.ts / admin-redirect.ts.
CREATE OR REPLACE FUNCTION is_eigo_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') = ANY (ARRAY['cnrfin93@gmail.com']);
$$;

CREATE OR REPLACE FUNCTION can_join_classroom(p_topic TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_topic LIKE 'classroom:%' AND EXISTS (
    SELECT 1 FROM bookings b
     WHERE b.id::text = substr(p_topic, 11)
       AND b.status <> 'cancelled'
       AND (b.user_id = auth.uid() OR is_eigo_admin())
  );
$$;
REVOKE EXECUTE ON FUNCTION can_join_classroom(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_join_classroom(TEXT) TO authenticated;

DROP POLICY IF EXISTS "classroom members can receive" ON realtime.messages;
CREATE POLICY "classroom members can receive" ON realtime.messages
  FOR SELECT TO authenticated
  USING (realtime.messages.extension IN ('broadcast','presence') AND can_join_classroom(realtime.topic()));

DROP POLICY IF EXISTS "classroom members can send" ON realtime.messages;
CREATE POLICY "classroom members can send" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (realtime.messages.extension IN ('broadcast','presence') AND can_join_classroom(realtime.topic()));
