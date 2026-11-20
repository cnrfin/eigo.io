-- Applied 2026-11-20. The photo "memories" feature from cups-app is no longer used.
-- A copy of the data is kept in the archive schema (not exposed to the API).
-- To restore: create table public.<name> as table archive.<name>; then re-add keys and RLS from add-memories.sql.
-- Left in place: cups-app functions that read these tables (_owned_terms, log_word_used, review_due_count,
-- and their callers get_level_coverage, get_gap_words, complete_review_session). Neither eigo app calls them.
create schema if not exists archive;
revoke all on schema archive from anon, authenticated;
create table archive.memories as table public.memories;
create table archive.memory_words as table public.memory_words;
create table archive.memory_sentences as table public.memory_sentences;
create table archive.memory_triage_decisions as table public.memory_triage_decisions;
drop table public.memory_words;
drop table public.memory_sentences;
drop table public.memory_triage_decisions;
drop table public.memories;
