-- Estimated CEFR level from the CEFR Level Check (e.g. 'B2').
-- Written by finalizeAttempt whenever a CEFR check is scored — the latest
-- scored attempt wins. This is an ESTIMATE, not an official certification.
alter table public.profiles
  add column if not exists cefr_level text,
  add column if not exists cefr_level_updated_at timestamptz;
