-- Applied 2026-11-20. Used by the IELTS course page (a claude.ai artifact) through the Supabase connector:
-- a student and booking picker, saving lesson notes to a student, and saving "Make it better" phrases
-- to the student's Phrases deck (vocabulary_phrases + vocabulary_cards, source 'lesson', course 'ielts-gt').
-- The "teacher" schema is not exposed through the API, and app users cannot execute these functions.

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  course_id text not null default 'ielts-gt',
  lesson_id text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists lesson_notes_one_per_lesson
  on public.lesson_notes (user_id, booking_id, course_id, lesson_id) nulls not distinct;
create index if not exists lesson_notes_user on public.lesson_notes (user_id, created_at desc);
alter table public.lesson_notes enable row level security;
create policy "students read own lesson notes" on public.lesson_notes for select using (user_id = auth.uid());

create schema if not exists teacher;
revoke all on schema teacher from public, anon, authenticated;

create or replace function teacher.students()
returns table (id uuid, name text, next_date date, last_date date)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(p.english_name,''), nullif(p.display_name,''), split_part(p.email,'@',1), 'Student') as name,
         min(b.date) filter (where b.date >= current_date) as next_date,
         max(b.date) filter (where b.date < current_date) as last_date
  from profiles p join bookings b on b.user_id = p.id
  where b.lesson_kind = 'human' and coalesce(b.status,'') <> 'cancelled'
    and b.date between current_date - 120 and current_date + 60
  group by p.id
  order by (min(b.date) filter (where b.date >= current_date)) nulls last, name;
$$;

create or replace function teacher.bookings(p_user uuid)
returns table (id uuid, date date, start_time time, duration_minutes int, status text)
language sql stable security definer set search_path = public as $$
  select b.id, b.date, b.start_time, b.duration_minutes, b.status
  from bookings b
  where b.user_id = p_user and b.lesson_kind = 'human' and coalesce(b.status,'') <> 'cancelled'
    and b.date between current_date - 60 and current_date + 30
  order by b.date desc, b.start_time desc;
$$;

create or replace function teacher.get_note(p_user uuid, p_booking uuid, p_lesson text)
returns table (body text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select n.body, n.updated_at from lesson_notes n
  where n.user_id = p_user and n.booking_id is not distinct from p_booking
    and n.course_id = 'ielts-gt' and n.lesson_id = p_lesson;
$$;

create or replace function teacher.save_note(p_user uuid, p_booking uuid, p_lesson text, p_body text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  insert into lesson_notes (user_id, booking_id, course_id, lesson_id, body)
  values (p_user, p_booking, 'ielts-gt', p_lesson, left(coalesce(p_body,''), 50000))
  on conflict (user_id, booking_id, course_id, lesson_id)
  do update set body = excluded.body, updated_at = now()
  returning updated_at into t;
  return t;
end $$;

create or replace function teacher.save_phrase(p_user uuid, p_booking uuid, p_lesson text,
  p_phrase text, p_example text, p_ja text, p_why_ja text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if coalesce(trim(p_phrase),'') = '' then raise exception 'phrase required'; end if;
  insert into vocabulary_phrases (user_id, booking_id, source, source_course_id, source_item_id,
    phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category)
  values (p_user, p_booking, 'lesson', 'ielts-gt', p_lesson || ':' || md5(lower(trim(p_phrase))),
    left(trim(p_phrase),300), left(coalesce(p_example,''),500), left(coalesce(p_ja,''),300),
    left(coalesce(p_why_ja,''),500), '', 'general')
  on conflict (user_id, source_course_id, source_item_id) where source_item_id is not null
  do update set example_en = excluded.example_en, translation_ja = excluded.translation_ja,
    explanation_ja = excluded.explanation_ja
  returning id into pid;
  insert into vocabulary_cards (user_id, phrase_id) values (p_user, pid)
  on conflict (user_id, phrase_id) do nothing;
  return pid;
end $$;

revoke all on all functions in schema teacher from public, anon, authenticated;

-- 2026-11-20 (later): titles for the student Notes page, and an unread marker.
alter table public.lesson_notes
  add column if not exists course_name text not null default '',
  add column if not exists lesson_title text not null default '',
  add column if not exists seen_at timestamptz;

drop function if exists teacher.save_note(uuid, uuid, text, text);
create or replace function teacher.save_note(p_user uuid, p_booking uuid, p_lesson text, p_body text,
  p_course_name text default '', p_lesson_title text default '')
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  insert into lesson_notes (user_id, booking_id, course_id, lesson_id, body, course_name, lesson_title)
  values (p_user, p_booking, 'ielts-gt', p_lesson, left(coalesce(p_body,''), 50000),
    left(coalesce(p_course_name,''),80), left(coalesce(p_lesson_title,''),160))
  on conflict (user_id, booking_id, course_id, lesson_id)
  do update set body = excluded.body, course_name = excluded.course_name, lesson_title = excluded.lesson_title,
    updated_at = now(), seen_at = null
  returning updated_at into t;
  return t;
end $$;
revoke all on function teacher.save_note(uuid, uuid, text, text, text, text) from public, anon, authenticated;

-- 2026-11-20 (later still): a course id on notes and phrases, so the Engoo lessons page can save
-- under 'engoo'. Defaults keep the IELTS page's existing calls working.
drop function if exists teacher.get_note(uuid, uuid, text);
create function teacher.get_note(p_user uuid, p_booking uuid, p_lesson text, p_course text default 'ielts-gt')
returns table(body text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select n.body, n.updated_at from lesson_notes n
  where n.user_id = p_user and n.booking_id is not distinct from p_booking
    and n.course_id = p_course and n.lesson_id = p_lesson;
$$;

drop function if exists teacher.save_note(uuid, uuid, text, text, text, text);
create function teacher.save_note(p_user uuid, p_booking uuid, p_lesson text, p_body text,
  p_course_name text default '', p_lesson_title text default '', p_course text default 'ielts-gt')
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  insert into lesson_notes (user_id, booking_id, course_id, lesson_id, body, course_name, lesson_title)
  values (p_user, p_booking, left(coalesce(nullif(trim(p_course),''),'ielts-gt'),40), p_lesson, left(coalesce(p_body,''), 50000),
    left(coalesce(p_course_name,''),80), left(coalesce(p_lesson_title,''),160))
  on conflict (user_id, booking_id, course_id, lesson_id)
  do update set body = excluded.body, course_name = excluded.course_name, lesson_title = excluded.lesson_title,
    updated_at = now(), seen_at = null
  returning updated_at into t;
  return t;
end $$;

drop function if exists teacher.save_phrase(uuid, uuid, text, text, text, text, text);
create function teacher.save_phrase(p_user uuid, p_booking uuid, p_lesson text,
  p_phrase text, p_example text, p_ja text, p_why_ja text, p_course text default 'ielts-gt')
returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if coalesce(trim(p_phrase),'') = '' then raise exception 'phrase required'; end if;
  insert into vocabulary_phrases (user_id, booking_id, source, source_course_id, source_item_id,
    phrase_en, example_en, translation_ja, explanation_ja, explanation_en, category)
  values (p_user, p_booking, 'lesson', left(coalesce(nullif(trim(p_course),''),'ielts-gt'),40), p_lesson || ':' || md5(lower(trim(p_phrase))),
    left(trim(p_phrase),300), left(coalesce(p_example,''),500), left(coalesce(p_ja,''),300),
    left(coalesce(p_why_ja,''),500), '', 'general')
  on conflict (user_id, source_course_id, source_item_id) where source_item_id is not null
  do update set example_en = excluded.example_en, translation_ja = excluded.translation_ja,
    explanation_ja = excluded.explanation_ja
  returning id into pid;
  insert into vocabulary_cards (user_id, phrase_id) values (p_user, pid)
  on conflict (user_id, phrase_id) do nothing;
  return pid;
end $$;

revoke all on all functions in schema teacher from public, anon, authenticated;
