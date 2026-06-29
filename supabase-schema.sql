create table slots (
  id text primary key,
  day smallint not null,
  time text not null,
  end_time text not null,
  group_type text not null,
  enrolled smallint not null default 0,
  week_key text not null
);

create index on slots (week_key);

create table bookings (
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
