-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 024: Moderation — admin role + enforcement
--
-- Adds the "who can moderate" layer (is_admin) and the "what they can do" layer
-- (remove listings, suspend users). All privileged mutations are performed by
-- the admin-actions Edge Function using the service-role key — this migration
-- only adds the columns, the visibility/insert guards, and read helpers.
--
-- To grant yourself admin after applying:
--   UPDATE public.profiles SET is_admin = true WHERE id = '<your-auth-user-id>';
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. New columns ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin         boolean    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suspended     boolean    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at     timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS removed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removal_reason text;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text;

-- is_admin / is_suspended are written ONLY by the service-role Edge Function.
-- The column-level GRANT from migration 018 already excludes them, so
-- authenticated clients cannot set them directly. Nothing to grant here.

-- ── 2. Read helpers (SECURITY DEFINER — bypass RLS, no recursion) ──────────────

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = uid), false);
$$;

CREATE OR REPLACE FUNCTION public.is_suspended(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_suspended FROM public.profiles WHERE id = uid), false);
$$;

-- ── 3. Hide removed listings from the public ──────────────────────────────────
-- Removed listings stay visible to their owner (so they understand what happened)
-- and to admins (for review), but disappear from browse/search for everyone else.

DROP POLICY IF EXISTS "listings_select_all" ON public.listings;
CREATE POLICY "listings_select_visible" ON public.listings
  FOR SELECT
  USING (
    status <> 'removed'
    OR auth.uid() = user_id
    OR public.is_admin()
  );

-- ── 4. Block suspended users from creating content ────────────────────────────
-- Suspended users keep read access but cannot post listings, make offers, or
-- broadcast. Enforced at the database so it can't be bypassed client-side.

DROP POLICY IF EXISTS "listings_insert_auth" ON public.listings;
CREATE POLICY "listings_insert_auth" ON public.listings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended());

DROP POLICY IF EXISTS "offers_insert" ON public.offers;
CREATE POLICY "offers_insert" ON public.offers
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() != (SELECT user_id FROM public.listings WHERE id = listing_id)
    AND NOT public.is_suspended()
  );

DROP POLICY IF EXISTS "broadcasts_insert_auth" ON public.community_broadcasts;
CREATE POLICY "broadcasts_insert_auth" ON public.community_broadcasts
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND NOT public.is_suspended());
