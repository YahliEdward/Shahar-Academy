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
  is_override boolean not null default false,
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
  price integer,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Migration for databases created with the old schema (PK on id only).
-- Safe to re-run: it just recreates the same composite key.
-- ════════════════════════════════════════════════════════════════════════════

alter table slots drop constraint if exists slots_pkey;
alter table slots add constraint slots_pkey primary key (id, week_key);

-- ════════════════════════════════════════════════════════════════════════════
-- Migration: allow admin-created bookings with only a student name
-- ════════════════════════════════════════════════════════════════════════════
-- Previously every field was required because the only way to create a
-- booking was the public self-registration form. Admins can now create a
-- booking with just a student name, so these three columns must accept NULL.
-- student_name, slot_id and group_preference stay NOT NULL. Safe to re-run.

alter table bookings alter column parent_name drop not null;
alter table bookings alter column phone drop not null;
alter table bookings alter column grade drop not null;

-- ════════════════════════════════════════════════════════════════════════════
-- Migration: template edits flow into booking-materialised weeks
-- ════════════════════════════════════════════════════════════════════════════
-- A week gets its own slot rows in two ways: automatically (the first booking
-- copies the template so the capacity update has a real row to target) or
-- deliberately (the admin edits that week in "שבוע ספציפי" mode). Only the
-- second should freeze the week against later template changes, so the two are
-- distinguished with is_override: template saves re-sync every current/future
-- week where is_override = false, preserving each slot's enrolled count.
-- Rows that predate this column default to false, so the next template save
-- brings those weeks back in line with the template. Safe to re-run.

alter table slots add column if not exists is_override boolean not null default false;

-- The template holds the default schedule, never real seats. Stale enrolled
-- counts left on template rows would surface as phantom students in every week
-- that follows the template.

update slots set enrolled = 0 where week_key = 'template';

-- ════════════════════════════════════════════════════════════════════════════
-- Migration: standing (recurring) students
-- ════════════════════════════════════════════════════════════════════════════
-- A student added from "לוח קבוע" is a standing enrollment: one master booking
-- row with week_key = 'template', cloned into every current/future week that
-- follows the template. template_id links a week's clone back to its master
-- row so removing the master can find and remove every clone. Safe to re-run.

alter table bookings add column if not exists template_id text;

-- A master can have at most one clone per week — without this, two
-- overlapping syncs (e.g. React's dev-mode double effect, or two admin tabs)
-- can each pass the "not already cloned" check before either has committed,
-- doubling up a student's seat in that week.
create unique index if not exists bookings_template_clone_uq
  on bookings (template_id, week_key) where template_id is not null;

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

-- ════════════════════════════════════════════════════════════════════════════
-- Push notifications
-- ════════════════════════════════════════════════════════════════════════════
-- Devices registered for booking notifications (Shahar's phone). Written and
-- read only by the server with the service_role key; no anon policies.

create table if not exists push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- Migration: bookings.price becomes a real integer (₪, whole shekels)
-- ════════════════════════════════════════════════════════════════════════════
-- price used to be freeform text typed by hand (e.g. "350₪ לחודש"), which the
-- revenue reports can't sum. It's now a plain integer. Existing values are
-- cleared (not parsed) — a handful of historical rows, safe to re-enter from
-- the booking card. Guarded so re-running this file after the column is
-- already integer is a no-op, same as the other migrations in this file.

do $$
begin
  if (select data_type from information_schema.columns
      where table_name = 'bookings' and column_name = 'price') = 'text' then
    alter table bookings alter column price type integer using null::integer;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Testimonials
-- ════════════════════════════════════════════════════════════════════════════
-- Public visitors submit a review (name + stars + text), which lands as
-- 'pending'. Only rows the admin flips to 'approved' are shown on the public
-- site. No anon policies: all access (public submit + admin read/moderate)
-- goes through server route handlers using the service_role key, same as
-- bookings.

create table if not exists testimonials (
  id text primary key,
  name text not null,
  stars smallint not null,
  text text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table testimonials enable row level security;

-- Preserve the 4 existing placeholder testimonials as pre-approved rows so the
-- public site isn't blank the moment this migration runs. Safe to re-run.
insert into testimonials (id, name, stars, text, status) values
  ('seed-1', 'מיכל ר.', 5, 'יובל עלה מ-62 ל-91 בתוך שלושה חודשים. שחר מסביר בסבלנות ויודע בדיוק איפה הילד תקוע. ממליצה בחום!', 'approved'),
  ('seed-2', 'אבי כ.', 5, 'ניסינו מורים פרטיים רבים לפני שחר. הקבוצה הקטנה עושה הבדל עצום — נועה סוף סוף מרגישה בנוח לשאול שאלות.', 'approved'),
  ('seed-3', 'דנה מ.', 5, 'הגעתי לשחר עם 54 בבגרות. היום אני יודעת שאני יכולה להגיש על 5 יחידות. האווירה בקבוצה מדהימה.', 'approved'),
  ('seed-4', 'רותי ש.', 5, 'תאיר פחדה ממתמטיקה שנים. שחר הצליח להפוך אותה לאחת הטובות בכיתה. לא יאמן.', 'approved')
on conflict (id) do nothing;
