-- ════════════════════════════════════════════════════════════════════════════
-- Tables
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists slots (
  id text primary key,
  day smallint not null,
  time text not null,
  end_time text not null,
  group_type text not null,
  enrolled smallint not null default 0,
  week_key text not null
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

-- Drop old policies if re-running this script.
drop policy if exists "public can read slots" on slots;
drop policy if exists "no anon access to bookings" on bookings;

-- Anyone may read the schedule (needed to render the public booking grid).
create policy "public can read slots"
  on slots for select
  to anon
  using (true);

-- No anon policies on bookings → the anon key cannot select/insert/update/delete
-- bookings at all. All booking access happens server-side via service_role.
