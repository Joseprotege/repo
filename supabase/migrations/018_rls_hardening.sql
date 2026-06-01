-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 018: RLS hardening — Phase 2
--
-- Closes five over-permissive policies identified in the pre-launch audit:
--
-- 1. payment_requests UPDATE — helpers could directly edit payment records
--    (amounts, status) via the Supabase client. All payment mutations go through
--    Edge Functions with the service-role key (RLS bypassed), so client-side
--    UPDATE by the helper is never legitimate. Restrict to requester_id only.
--
-- 2. reliability_scores UPDATE — users could self-inflate their score by
--    directly calling .update({ overall: 5 }). The recompute_reliability()
--    function is SECURITY DEFINER and is the only legitimate writer.
--    Remove the user-facing UPDATE policy entirely.
--
-- 3. offers UPDATE — the combined policy let helpers self-accept or self-complete
--    their own offer, bypassing the lister's decision. Split into:
--      - offers_update_lister: listing owner can update status + step progress
--      - offers_update_helper: helper can ONLY update a COMPLETED offer (for
--        post-completion rating submission) and cannot change status.
--
-- 4. profiles UPDATE — column-level restriction prevents authenticated users from
--    directly setting stripe_account_id, stripe_onboarded, stripe_charges_enabled,
--    stripe_payouts_enabled, verified_email, or verified_id. Those columns are
--    exclusively written by the stripe-webhook Edge Function (service_role) and
--    future admin/verification flows. service_role bypasses column grants (it has
--    GRANT ALL from Supabase's default setup) so Edge Functions are unaffected.
--
-- 5. notifications UPDATE — column-level restriction locks authenticated writes
--    to the `read` column only. Users marking their own notifications as read is
--    the only legitimate client-side update; other fields should be immutable
--    once the trigger inserts them.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. payment_requests: remove helper write access ──────────────────────────

DROP POLICY IF EXISTS "pay_update" ON public.payment_requests;

CREATE POLICY "pay_update"
  ON public.payment_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id)
  WITH CHECK (auth.uid() = requester_id);


-- ── 2. reliability_scores: remove user self-update ───────────────────────────
-- recompute_reliability() is SECURITY DEFINER — it bypasses RLS and is the
-- only path that should write to this table.

DROP POLICY IF EXISTS "reliability_update_own" ON public.reliability_scores;


-- ── 3. offers: split update policy to prevent self-accept / self-complete ─────

DROP POLICY IF EXISTS "offers_update" ON public.offers;

-- Listing owner may update status (accept/decline), step progress, and ratings
-- on any offer attached to their listing.
CREATE POLICY "offers_update_lister"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM public.listings WHERE id = listing_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.listings WHERE id = listing_id)
  );

-- Helper may ONLY update their own offer once it is already in 'completed'
-- state — the sole legitimate use is post-completion rating submission.
-- The USING clause blocks access to pending/accepted rows, and the WITH CHECK
-- keeps status locked at 'completed' so they cannot change it.
CREATE POLICY "offers_update_helper"
  ON public.offers FOR UPDATE
  TO authenticated
  USING  (auth.uid() = user_id AND status = 'completed')
  WITH CHECK (auth.uid() = user_id AND status = 'completed');


-- ── 4. profiles: lock Stripe + verification columns from client writes ─────────
-- Revoke broad UPDATE then grant only the columns users legitimately edit.
-- service_role (Edge Functions + webhook) retains full access via GRANT ALL.

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  username,
  display_name,
  bio,
  avatar_seed,
  avatar_url,
  city,
  state,
  neighborhood,
  lat,
  lng,
  skills,
  is_online
) ON public.profiles TO authenticated;


-- ── 5. notifications: lock to `read` column only ──────────────────────────────
-- Users can only mark their own notifications as read; all other fields are
-- written by SECURITY DEFINER trigger functions and must not be mutable by clients.

REVOKE UPDATE ON public.notifications FROM authenticated;

GRANT UPDATE (read) ON public.notifications TO authenticated;
