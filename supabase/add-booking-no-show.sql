-- Adds the 'no_show' booking status (student hasn't joined 15 minutes after the start).
-- Applied to EIGO-WEB on 2026-10-06.
-- Nothing writes it yet: the classroom's no-show route will (see classroom-implementation-plan.md, phase 6).
-- Minutes are deducted at booking ('booked' in minute_usage) and a no-show doesn't refund them,
-- so no minute_usage row is needed.

alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status = any (array['confirmed'::text, 'cancelled'::text, 'completed'::text, 'no_show'::text]));
