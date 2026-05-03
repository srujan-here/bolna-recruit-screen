-- Bolna Recruit Screen — schema
-- Run this in Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company_name text not null,
  jd_summary text,
  location text,
  target_min_years numeric default 3,
  max_budget_lakhs numeric default 30,
  created_at timestamptz default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  name text not null,
  phone text not null,
  status text not null default 'pending',
    -- pending | calling | completed | failed | no_answer
  bolna_execution_id text,
  created_at timestamptz default now()
);

create index if not exists candidates_role_idx on candidates(role_id);
create index if not exists candidates_execution_idx on candidates(bolna_execution_id);

create table if not exists screenings (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  years_experience numeric,
  current_ctc_lakhs numeric,
  expected_ctc_lakhs numeric,
  notice_period_days int,
  relocation text,
  is_interested boolean,
  call_outcome text,
  transcript jsonb,
  duration_seconds int,
  rank_score numeric,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create unique index if not exists screenings_candidate_unique on screenings(candidate_id);

-- Enable Realtime (publication is created by Supabase by default)
alter publication supabase_realtime add table candidates;
alter publication supabase_realtime add table screenings;

-- For the demo we run without auth and use the service role for writes.
-- If you turn on RLS, add policies that scope by an `owner_id` column.
alter table roles disable row level security;
alter table candidates disable row level security;
alter table screenings disable row level security;
