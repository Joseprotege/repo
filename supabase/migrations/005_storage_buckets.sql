-- ─────────────────────────────────────────────────────────────────────────────
-- Storage buckets for user-uploaded images.
-- Run this from the Supabase SQL Editor.
--
-- Two buckets:
--   - avatars:        profile photos (public read, owner-only write)
--   - listing-photos: photos attached to task listings (public read, owner-only write)
-- ─────────────────────────────────────────────────────────────────────────────

-- Create buckets (idempotent)
insert into storage.buckets (id, name, public)
values
  ('avatars',        'avatars',        true),
  ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- ─── Policies ────────────────────────────────────────────────────────────────
-- Public read on both buckets (so anyone can view profile pics + listing photos).
-- Authenticated users can upload to paths prefixed with their own user id.

-- avatars: anyone can read
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- avatars: signed-in users can upload to their own folder
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- avatars: signed-in users can update/replace their own avatar
drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- avatars: signed-in users can delete their own avatar
drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- listing-photos: anyone can read
drop policy if exists "Listing photos are publicly readable" on storage.objects;
create policy "Listing photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

-- listing-photos: signed-in users can upload to their own folder
drop policy if exists "Users can upload their own listing photos" on storage.objects;
create policy "Users can upload their own listing photos"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- listing-photos: signed-in users can delete their own listing photos
drop policy if exists "Users can delete their own listing photos" on storage.objects;
create policy "Users can delete their own listing photos"
  on storage.objects for delete
  using (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
