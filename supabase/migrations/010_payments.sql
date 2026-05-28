-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010: Escrow payment requests + platform fee schedule
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Payment requests (one per accepted offer, optional — $0 volunteer tasks skip this)
CREATE TABLE IF NOT EXISTS payment_requests (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id                uuid         UNIQUE REFERENCES offers(id) ON DELETE CASCADE,
  listing_id              uuid         REFERENCES listings(id) ON DELETE CASCADE,
  requester_id            uuid         REFERENCES profiles(id),
  helper_id               uuid         REFERENCES profiles(id),
  amount_cents            int          NOT NULL DEFAULT 0,
  currency                text         NOT NULL DEFAULT 'usd',
  -- platform fee at the time the request was created
  platform_fee_pct        numeric(5,2) NOT NULL DEFAULT 0,
  platform_fee_cents      int          NOT NULL DEFAULT 0,
  helper_payout_cents     int          NOT NULL DEFAULT 0,
  -- lifecycle: pending → held (funded) → released (paid out) | refunded | cancelled
  status                  text         NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','held','released','refunded','cancelled')),
  -- Stripe identifiers (populated when Stripe Connect is wired in)
  stripe_payment_intent_id text,
  stripe_transfer_id       text,
  notes                   text,
  created_at              timestamptz  NOT NULL DEFAULT now(),
  funded_at               timestamptz,
  released_at             timestamptz
);

-- 2. RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pay_select" ON payment_requests;
CREATE POLICY "pay_select"
  ON payment_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = helper_id);

DROP POLICY IF EXISTS "pay_insert" ON payment_requests;
CREATE POLICY "pay_insert"
  ON payment_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "pay_update" ON payment_requests;
CREATE POLICY "pay_update"
  ON payment_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = helper_id);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_payment_requests_offer ON payment_requests (offer_id);
