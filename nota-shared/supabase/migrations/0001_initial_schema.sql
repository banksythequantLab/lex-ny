-- ============================================================
--  Nota.Lawyer platform — Supabase schema
--  Migration 0001: initial schema
--
--  Run this in the Supabase SQL editor:
--    Project → SQL Editor → New Query → paste this whole file → Run
--
--  Or via the Supabase CLI:
--    supabase db push
-- ============================================================

-- ------------------------------------------------------------
--  Enums
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('customer', 'attorney', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'filing_kind') then
    create type filing_kind as enum (
      'copyright_visual_art',
      'copyright_photographs',
      'copyright_literary',
      'trademark'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'filing_status') then
    create type filing_status as enum (
      'draft',
      'pending_payment',
      'pending_review',
      'reviewed',
      'submission_ready',
      'submitted',
      'registered',
      'cancelled'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'filing_tier') then
    create type filing_tier as enum ('free', 'counsel');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_kind') then
    create type payment_kind as enum ('counsel_review', 'swag');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type review_status as enum ('pending', 'in_progress', 'completed', 'needs_revision');
  end if;
end$$;

-- ------------------------------------------------------------
--  users — extends Supabase's auth.users with our role/name fields
-- ------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);

-- Auto-create a users row when someone signs up via magic link.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- ------------------------------------------------------------
--  filings — the central record. One row per copyright or trademark filing.
-- ------------------------------------------------------------
create table if not exists public.filings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind filing_kind not null,
  tier filing_tier not null default 'free',
  status filing_status not null default 'draft',
  wizard_data jsonb not null default '{}'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  conflict_report jsonb,
  stripe_session_id text,
  attorney_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists filings_user_id_idx on public.filings(user_id);
create index if not exists filings_status_idx on public.filings(status);
create index if not exists filings_kind_idx on public.filings(kind);
create index if not exists filings_created_at_idx on public.filings(created_at desc);

-- Keep updated_at fresh on any change
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_filings_updated_at on public.filings;
create trigger touch_filings_updated_at
  before update on public.filings
  for each row
  execute function public.touch_updated_at();

-- ------------------------------------------------------------
--  payments — Stripe Checkout records
-- ------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  filing_id uuid references public.filings(id) on delete set null,
  kind payment_kind not null,
  stripe_session_id text unique not null,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status payment_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_filing_id_idx on public.payments(filing_id);
create index if not exists payments_stripe_session_idx on public.payments(stripe_session_id);

-- ------------------------------------------------------------
--  reviews — attorney review queue
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid not null references public.filings(id) on delete cascade,
  reviewer_user_id uuid not null references public.users(id),
  status review_status not null default 'pending',
  notes text,
  recommendations jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reviews_filing_id_idx on public.reviews(filing_id);
create index if not exists reviews_reviewer_idx on public.reviews(reviewer_user_id);
create index if not exists reviews_status_idx on public.reviews(status);

-- ------------------------------------------------------------
--  Storage bucket for filing artifacts (deposit copies, specimen images, generated PDFs)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('filings', 'filings', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
--  Row Level Security (RLS) — enforces tenant isolation
-- ------------------------------------------------------------
alter table public.users enable row level security;
alter table public.filings enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;

-- users: each user can read/update their own row; staff can read all
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (
    auth.uid() = id
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('attorney', 'admin'))
  );

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- filings: customers see their own; staff see all
drop policy if exists "filings_select_own_or_staff" on public.filings;
create policy "filings_select_own_or_staff" on public.filings
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('attorney', 'admin'))
  );

drop policy if exists "filings_insert_own" on public.filings;
create policy "filings_insert_own" on public.filings
  for insert with check (auth.uid() = user_id);

drop policy if exists "filings_update_own_or_staff" on public.filings;
create policy "filings_update_own_or_staff" on public.filings
  for update using (
    auth.uid() = user_id
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('attorney', 'admin'))
  );

drop policy if exists "filings_delete_own" on public.filings;
create policy "filings_delete_own" on public.filings
  for delete using (auth.uid() = user_id);

-- payments: customers see their own; staff see all
drop policy if exists "payments_select_own_or_staff" on public.payments;
create policy "payments_select_own_or_staff" on public.payments
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('attorney', 'admin'))
  );

-- reviews: staff only
drop policy if exists "reviews_staff_only" on public.reviews;
create policy "reviews_staff_only" on public.reviews
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('attorney', 'admin'))
  );

-- Storage RLS for filings bucket
-- Note: storage.objects is in the storage schema; policies use storage.foldername()
drop policy if exists "filing_artifacts_own_or_staff_read" on storage.objects;
create policy "filing_artifacts_own_or_staff_read" on storage.objects
  for select using (
    bucket_id = 'filings'
    and (
      -- Path convention: filings/<user_id>/<filing_id>/<filename>
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('attorney', 'admin'))
    )
  );

drop policy if exists "filing_artifacts_own_upload" on storage.objects;
create policy "filing_artifacts_own_upload" on storage.objects
  for insert with check (
    bucket_id = 'filings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
--  Seed: at least one admin user. After signup, run this manually:
--    update public.users set role = 'admin' where email = 'derek@nota.lawyer';
-- ------------------------------------------------------------

-- Done. Verify:
--   select count(*) from public.users;
--   select count(*) from public.filings;
--   select count(*) from public.payments;
--   select count(*) from public.reviews;
