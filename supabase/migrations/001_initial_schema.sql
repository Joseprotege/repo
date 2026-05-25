-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── PROFILES ────────────────────────────────────────────────────────────────
-- One row per user, extends Supabase auth.users
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique not null,
  display_name     text not null,
  bio              text default '',
  avatar_seed      text default '',
  city             text default '',
  state            text default '',
  neighborhood     text default '',
  lat              double precision default 0,
  lng              double precision default 0,
  skills           text[] default '{}',
  is_online        boolean default false,
  created_at       timestamptz default now()
);

-- ── LISTINGS ────────────────────────────────────────────────────────────────
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text not null,
  category     text not null,
  urgency      text not null default 'medium',
  status       text not null default 'open',
  image_url    text default '',
  city         text default '',
  state        text default '',
  neighborhood text default '',
  lat          double precision default 0,
  lng          double precision default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── OFFERS ──────────────────────────────────────────────────────────────────
create table public.offers (
  id                          uuid primary key default gen_random_uuid(),
  listing_id                  uuid not null references public.listings(id) on delete cascade,
  user_id                     uuid not null references public.profiles(id) on delete cascade,
  message                     text not null,
  confidence_ability          int not null check (confidence_ability between 1 and 5),
  confidence_availability     int not null check (confidence_availability between 1 and 5),
  status                      text not null default 'pending',
  created_at                  timestamptz default now(),
  unique (listing_id, user_id)
);

-- ── RELIABILITY SCORES ──────────────────────────────────────────────────────
create table public.reliability_scores (
  user_id                      uuid primary key references public.profiles(id) on delete cascade,
  total_offers                 int default 0,
  completed                    int default 0,
  positive_outcomes            int default 0,
  self_assessed_ability_avg    double precision default 0,
  self_assessed_availability_avg double precision default 0,
  actual_score                 double precision default 0,
  overall                      double precision default 0,
  updated_at                   timestamptz default now()
);

-- ── NOTIFICATIONS ───────────────────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text not null,
  type       text not null default 'info',
  link_to    text default '',
  read       boolean default false,
  created_at timestamptz default now()
);

-- ── COMMUNITY BROADCASTS ────────────────────────────────────────────────────
create table public.community_broadcasts (
  id               uuid primary key default gen_random_uuid(),
  sender_id        uuid references public.profiles(id) on delete set null,
  area_label       text not null,
  category         text not null,
  message          text not null,
  note             text default '',
  reactions_heart  int default 0,
  reactions_clap   int default 0,
  reactions_spark  int default 0,
  created_at       timestamptz default now()
);

-- ── BROADCAST REACTIONS ─────────────────────────────────────────────────────
create table public.broadcast_reactions (
  id            uuid primary key default gen_random_uuid(),
  broadcast_id  uuid not null references public.community_broadcasts(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('heart','clap','spark')),
  created_at    timestamptz default now(),
  unique (broadcast_id, user_id)
);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger listings_updated_at before update on public.listings
  for each row execute procedure update_updated_at();
