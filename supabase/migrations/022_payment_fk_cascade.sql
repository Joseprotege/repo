-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 022: payment_requests profile FKs block account deletion
--
-- requester_id and helper_id were created without an ON DELETE action
-- (010_payments.sql), which can block deleting a profile that has payment
-- history. Recreate both FKs with ON DELETE CASCADE — the payment rows are
-- already transitively owned by the user via listing/offer cascades.
--
-- Run this from the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_requester_id_fkey;
ALTER TABLE payment_requests
  ADD CONSTRAINT payment_requests_requester_id_fkey
  FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_helper_id_fkey;
ALTER TABLE payment_requests
  ADD CONSTRAINT payment_requests_helper_id_fkey
  FOREIGN KEY (helper_id) REFERENCES profiles(id) ON DELETE CASCADE;
