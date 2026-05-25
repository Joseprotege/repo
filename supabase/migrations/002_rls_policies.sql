-- Enable Row Level Security on every table
alter table public.profiles              enable row level security;
alter table public.listings              enable row level security;
alter table public.offers                enable row level security;
alter table public.reliability_scores    enable row level security;
alter table public.notifications         enable row level security;
alter table public.community_broadcasts  enable row level security;
alter table public.broadcast_reactions   enable row level security;

-- ── PROFILES ────────────────────────────────────────────────────────────────
-- Anyone can read profiles (needed for listing pages, helper cards)
create policy "profiles_select_all" on public.profiles
  for select using (true);

-- Only the owner can update their own profile
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Insert is handled by the on-signup trigger
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ── LISTINGS ────────────────────────────────────────────────────────────────
-- Anyone can read listings
create policy "listings_select_all" on public.listings
  for select using (true);

-- Only authenticated users can create listings
create policy "listings_insert_auth" on public.listings
  for insert with check (auth.uid() = user_id);

-- Only the owner can update or delete
create policy "listings_update_own" on public.listings
  for update using (auth.uid() = user_id);

create policy "listings_delete_own" on public.listings
  for delete using (auth.uid() = user_id);

-- ── OFFERS ──────────────────────────────────────────────────────────────────
-- Offer owner and listing owner can see offers
create policy "offers_select" on public.offers
  for select using (
    auth.uid() = user_id or
    auth.uid() = (select user_id from public.listings where id = listing_id)
  );

-- Authenticated users can create offers (not on their own listing)
create policy "offers_insert" on public.offers
  for insert with check (
    auth.uid() = user_id and
    auth.uid() != (select user_id from public.listings where id = listing_id)
  );

-- Offer owner can update their offer; listing owner can accept/decline
create policy "offers_update" on public.offers
  for update using (
    auth.uid() = user_id or
    auth.uid() = (select user_id from public.listings where id = listing_id)
  );

-- ── RELIABILITY SCORES ──────────────────────────────────────────────────────
create policy "reliability_select_all" on public.reliability_scores
  for select using (true);

create policy "reliability_update_own" on public.reliability_scores
  for update using (auth.uid() = user_id);

-- ── NOTIFICATIONS ───────────────────────────────────────────────────────────
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- ── COMMUNITY BROADCASTS ────────────────────────────────────────────────────
-- Anyone (even logged out) can read broadcasts — public community pulse
create policy "broadcasts_select_all" on public.community_broadcasts
  for select using (true);

-- Only authenticated users can send broadcasts
create policy "broadcasts_insert_auth" on public.community_broadcasts
  for insert with check (auth.uid() = sender_id);

-- ── BROADCAST REACTIONS ─────────────────────────────────────────────────────
create policy "reactions_select_all" on public.broadcast_reactions
  for select using (true);

create policy "reactions_insert_own" on public.broadcast_reactions
  for insert with check (auth.uid() = user_id);

create policy "reactions_update_own" on public.broadcast_reactions
  for update using (auth.uid() = user_id);

create policy "reactions_delete_own" on public.broadcast_reactions
  for delete using (auth.uid() = user_id);
