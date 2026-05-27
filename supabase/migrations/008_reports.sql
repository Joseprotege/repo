-- ─────────────────────────────────────────────────────────────────────────────
-- User reports — for flagging listings, profiles, broadcasts, or offers.
-- Submissions are insert-only from the public; reading is restricted to the
-- reporter (so reviewers will use the service-role key via the admin dashboard
-- or a future moderation UI).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid references auth.users(id) on delete set null,
  target_type     text not null check (target_type in ('listing', 'profile', 'broadcast', 'offer')),
  target_id       uuid not null,
  reason          text not null check (reason in (
    'spam', 'scam', 'harassment', 'inappropriate', 'unsafe', 'impersonation', 'other'
  )),
  details         text default '',
  status          text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_reports_target on public.reports (target_type, target_id);
create index if not exists idx_reports_status on public.reports (status);

alter table public.reports enable row level security;

-- Authenticated users can file reports
drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated" on public.reports
  for insert
  with check (auth.uid() = reporter_id);

-- Reporters can see their own reports
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select
  using (auth.uid() = reporter_id);
