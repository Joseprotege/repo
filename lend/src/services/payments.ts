/**
 * Payment service — creates and manages escrow-style payment requests.
 * Actual payment processing uses Stripe Connect (configured separately).
 * Until Stripe is wired in, this manages the payment_requests table state.
 */
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { adaptPaymentRequest } from '../lib/adapters';
import { FEE_TIERS } from '../types';
import type { PaymentRequest, FeeTier } from '../types';

// ── Fee calculation ────────────────────────────────────────────────────────────

/** Get the active fee tier based on current platform user count. */
export async function getActiveFeePercent(): Promise<number> {
  if (!SUPABASE_CONFIGURED) return 0;
  try {
    // Count all profiles to determine the current tier
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    const userCount = count ?? 0;
    const tier = FEE_TIERS.find(
      t => userCount >= t.minUsers && (t.maxUsers === null || userCount <= t.maxUsers),
    );
    return tier?.feePct ?? 10;
  } catch {
    return 0;
  }
}

/** Compute fee breakdown given an amount and percentage. */
export function computeFeeBreakdown(
  amountCents: number,
  feePct: number,
): { platformFeeCents: number; helperPayoutCents: number } {
  const platformFeeCents = Math.round(amountCents * (feePct / 100));
  return {
    platformFeeCents,
    helperPayoutCents: amountCents - platformFeeCents,
  };
}

/** Returns the fee tier object matching a given user count. */
export function getTierForCount(userCount: number): FeeTier {
  return (
    FEE_TIERS.find(
      t => userCount >= t.minUsers && (t.maxUsers === null || userCount <= t.maxUsers),
    ) ?? FEE_TIERS[FEE_TIERS.length - 1]
  );
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export interface CreatePaymentInput {
  offerId: string;
  listingId: string;
  requesterId: string;
  helperId: string;
  amountCents: number;
  feePct: number;
}

export async function createPaymentRequest(
  input: CreatePaymentInput,
): Promise<PaymentRequest | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { platformFeeCents, helperPayoutCents } = computeFeeBreakdown(
    input.amountCents,
    input.feePct,
  );
  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      offer_id: input.offerId,
      listing_id: input.listingId,
      requester_id: input.requesterId,
      helper_id: input.helperId,
      amount_cents: input.amountCents,
      currency: 'usd',
      platform_fee_pct: input.feePct,
      platform_fee_cents: platformFeeCents,
      helper_payout_cents: helperPayoutCents,
      status: 'pending',
    })
    .select()
    .single();
  if (error) { console.error('[payments] createPaymentRequest error:', error); return null; }
  return adaptPaymentRequest(data as unknown as Record<string, unknown>);
}

export async function fetchPaymentRequest(
  offerId: string,
): Promise<PaymentRequest | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('offer_id', offerId)
    .maybeSingle();
  if (error) { console.error('[payments] fetchPaymentRequest error:', error); return null; }
  if (!data) return null;
  return adaptPaymentRequest(data as unknown as Record<string, unknown>);
}

/** Mark a payment request as "held" (funds received from payer). */
export async function holdPayment(paymentId: string): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return true;
  const { error } = await supabase
    .from('payment_requests')
    .update({ status: 'held', funded_at: new Date().toISOString() })
    .eq('id', paymentId);
  if (error) { console.error('[payments] holdPayment error:', error); return false; }
  return true;
}

/** Release escrowed payment to helper (called when task is verified complete). */
export async function releasePayment(paymentId: string): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return true;
  const { error } = await supabase
    .from('payment_requests')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', paymentId);
  if (error) { console.error('[payments] releasePayment error:', error); return false; }
  return true;
}

/** Cancel / refund a payment request. */
export async function cancelPayment(
  paymentId: string,
  refund = false,
): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return true;
  const { error } = await supabase
    .from('payment_requests')
    .update({ status: refund ? 'refunded' : 'cancelled' })
    .eq('id', paymentId);
  if (error) { console.error('[payments] cancelPayment error:', error); return false; }
  return true;
}
