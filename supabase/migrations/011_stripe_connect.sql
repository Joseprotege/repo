-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011: Stripe Connect support for helpers
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helper Stripe Connect account ID + onboarded flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id  text,
  ADD COLUMN IF NOT EXISTS stripe_onboarded   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean DEFAULT false;

-- 2. Add Stripe client secret to payment_requests so the lister can confirm
--    the PaymentIntent client-side via Stripe.js Elements.
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS stripe_client_secret    text,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_cents int DEFAULT 0;

-- 3. Index for fast lookup by Stripe account ID (used by webhook handler)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account
  ON public.profiles (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- 4. Index for fast lookup of payment requests by PaymentIntent ID (webhook)
CREATE INDEX IF NOT EXISTS idx_payment_requests_stripe_pi
  ON public.payment_requests (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
