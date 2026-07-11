-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cost_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  description text not null,
  total_amount numeric(12,2) not null,
  paid_by uuid references people(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- One row per (cost_item, person) who has a nonzero portion of that item.
-- People not involved in an item simply have no row here.
create table if not exists cost_shares (
  id uuid primary key default gen_random_uuid(),
  cost_item_id uuid not null references cost_items(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  portion numeric(12,4) not null default 0,
  unique (cost_item_id, person_id)
);

create index if not exists idx_people_trip on people(trip_id);
create index if not exists idx_items_trip on cost_items(trip_id);
create index if not exists idx_shares_item on cost_shares(cost_item_id);

-- RLS: locked down. All access goes through the Next.js API routes using the
-- service-role key (server-side only), never the anon key, so we simply deny
-- anon/public access at the database level as a second layer of protection.
alter table trips enable row level security;
alter table people enable row level security;
alter table cost_items enable row level security;
alter table cost_shares enable row level security;
-- (No policies created => no anon access. Service role bypasses RLS by default.)
