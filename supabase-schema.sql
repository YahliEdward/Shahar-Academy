-- ════════════════════════════════════════════════════════════════════════════
-- Tables
-- ════════════════════════════════════════════════════════════════════════════
-- NOTE: slot ids repeat across weeks (a week override copies the template's
-- deterministic ids like "slot-0-1400"), so the primary key must be composite:
-- (id, week_key). A plain PK on id makes the second week's override collide
-- with the first and silently fail to save.

create table if not exists slots (
  id text not null,
  day smallint not null,
  time text not null,
  end_time text not null,
  group_type text not null,
  enrolled smallint not null default 0,
  week_key text not null,
  primary key (id, week_key)
);

create index if not exists slots_week_key_idx on slots (week_key);

create table if not exists bookings (
  id text primary key,
  slot_id text not null,
  week_key text,
  slot_label text,
  student_name text not null,
  parent_name text not null,
  phone text not null,
  grade text not null,
  group_preference text not null,
  status text not null default 'pending',
  price text,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Migration for databases created with the old schema (PK on id only).
-- Safe to re-run: it just recreates the same composite key.
-- ════════════════════════════════════════════════════════════════════════════

alter table slots drop constraint if exists slots_pkey;
alter table slots add constraint slots_pkey primary key (id, week_key);

-- ════════════════════════════════════════════════════════════════════════════
-- Atomic capacity updates
-- ════════════════════════════════════════════════════════════════════════════
-- Single conditional UPDATE so two parallel bookings can never both take the
-- last seat. Returns false when the slot is full (or doesn't exist).
-- Called only from the server with the service_role key.

create or replace function adjust_enrolled(
  p_slot_id text,
  p_week_key text,
  p_delta int,
  p_max int
) returns boolean
language plpgsql
as $$
begin
  update slots
  set enrolled = greatest(enrolled + p_delta, 0)
  where id = p_slot_id
    and week_key = p_week_key
    and enrolled + p_delta <= p_max;
  return found;
end
$$;

-- Functions are executable by everyone by default — make sure the anon key
-- can't call this and inflate/deflate enrollment counts from the browser.
revoke execute on function adjust_enrolled(text, text, int, int) from public;
revoke execute on function adjust_enrolled(text, text, int, int) from anon;
revoke execute on function adjust_enrolled(text, text, int, int) from authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════════
-- Without this, the public anon key can read every booking (student names,
-- parent names, phone numbers) and rewrite the whole schedule.
--
-- Policy: the browser (anon key) may ONLY read the schedule. Everything else —
-- creating bookings, reading/editing bookings, editing the schedule — goes
-- through the server route handlers using the service_role key, which bypasses
-- RLS. So the anon key needs no write access at all.

alter table slots enable row level security;
alter table bookings enable row level security;

-- Drop old policies if re-running this script — including the dangerous
-- early-development "anon full access" policies, in case they were ever run.
drop policy if exists "anon full access slots" on slots;
drop policy if exists "anon full access bookings" on bookings;
drop policy if exists "public can read slots" on slots;
drop policy if exists "no anon access to bookings" on bookings;

-- Anyone may read the schedule (needed to render the public booking grid).
create policy "public can read slots"
  on slots for select
  to anon
  using (true);

-- No anon policies on bookings → the anon key cannot select/insert/update/delete
-- bookings at all. All booking access happens server-side via service_role.
