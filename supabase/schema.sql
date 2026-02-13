-- Minimal, deadpan schema.
-- Run this in Supabase SQL editor.

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- PASSES
create table if not exists public.passes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_id uuid not null,
  user_id uuid null,

  type text not null check (type in ('meme', 'streak', 'club')),
  title text not null default '',
  subtitle text not null default '',

  -- streak
  start_date date null,
  streak_last_day integer null,

  -- club
  club_slug text null,
  status text null check (status is null or status in ('pending', 'active', 'expired')),

  -- background image (storage object path)
  upload_path text null,
  upload_ephemeral boolean not null default true,

  -- Apple Wallet glue (kept inside passes table on purpose)
  apple_auth_token text null,
  apple_devices jsonb not null default '[]'::jsonb,

  -- Google Wallet glue
  google_object_id text null
);

create index if not exists passes_client_id_idx on public.passes (client_id);
create index if not exists passes_user_id_idx on public.passes (user_id);
create index if not exists passes_type_idx on public.passes (type);
create index if not exists passes_club_slug_idx on public.passes (club_slug);

alter table public.passes enable row level security;
do $$ begin
  create policy "no access" on public.passes
    for all using (false) with check (false);
exception when duplicate_object then null;
end $$;

-- CLUBS
create table if not exists public.clubs (
  slug text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  expiry_date date not null,
  activation_code_hash text not null
);

alter table public.clubs enable row level security;
do $$ begin
  create policy "no access" on public.clubs
    for all using (false) with check (false);
exception when duplicate_object then null;
end $$;

-- UPLOADS (optional, but used in v0)
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  client_id uuid not null,
  user_id uuid null,

  path text not null,
  content_type text not null,
  bytes integer not null,

  ephemeral boolean not null default true,
  expires_at timestamptz null
);

create index if not exists uploads_client_id_idx on public.uploads (client_id);
create index if not exists uploads_user_id_idx on public.uploads (user_id);
create index if not exists uploads_expires_at_idx on public.uploads (expires_at);

alter table public.uploads enable row level security;
do $$ begin
  create policy "no access" on public.uploads
    for all using (false) with check (false);
exception when duplicate_object then null;
end $$;

-- Updated-at trigger (tiny, no abstractions).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger passes_set_updated_at
  before update on public.passes
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

