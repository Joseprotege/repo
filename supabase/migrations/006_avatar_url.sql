-- ─────────────────────────────────────────────────────────────────────────────
-- Add avatar_url column for real uploaded avatars (vs the generated DiceBear URL
-- derived from avatar_seed). When avatar_url is set, the app uses it directly;
-- otherwise it falls back to the seed-based generated avatar.
--
-- Also adds image_urls (text[]) to listings so a task can have multiple photos.
-- The existing image_url single-string column is kept for backwards compatibility
-- and is used as the first element when image_urls is empty.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.listings
  add column if not exists image_urls text[] default '{}';
