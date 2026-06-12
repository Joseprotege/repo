/**
 * Payment service — creates and manages escrow-style payment requests.
 * Actual payment processing uses Stripe Connect (configured separately).
 * Until Stripe is wired in, this manages the payment_requests table state.
 */
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { invokeEdgeFunction, STRIPE_CONFIGURED } from '../lib/stripe';
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

/**
 * Re-open a cancelled payment so the requester can fund it again.
 * The Stripe PI fields were already cleared on cancel, so flipping the status
 * back to 'pending' re-enters the normal flow — funding will create a fresh
 * PaymentIntent. The status guard prevents re-opening released/refunded rows.
 */
export async function reactivatePayment(paymentId: string): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return true;
  const { error } = await supabase
    .from('payment_requests')
    .update({ status: 'pending', funded_at: null })
    .eq('id', paymentId)
    .eq('status', 'cancelled');
  if (error) { console.error('[payments] reactivatePayment error:', error); return false; }
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

// ── Earnings (helper side) ──────────────────────────────────────────────────────

export interface HelperEarnings {
  /** Money already paid out (status released), in cents. */
  releasedCents: number;
  /** Money currently held in escrow, not yet released, in cents. */
  pendingCents: number;
  /** Count of paid tasks completed (released). */
  completedCount: number;
  /** Full payout history, newest first. */
  payouts: PaymentRequest[];
}

/**
 * Fetch everything a helper has earned: total released, total currently held in
 * escrow, and the full list of payment requests where they are the helper.
 * RLS already restricts payment_requests to the requester/helper, but we also
 * filter by helper_id so a helper only sees their own earnings.
 */
export async function fetchHelperEarnings(userId: string): Promise<HelperEarnings> {
  const empty: HelperEarnings = { releasedCents: 0, pendingCents: 0, completedCount: 0, payouts: [] };
  if (!SUPABASE_CONFIGURED) return empty;

  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('helper_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.error('[payments] fetchHelperEarnings error:', error); return empty; }

  const payouts = (data ?? []).map(r => adaptPaymentRequest(r as unknown as Record<string, unknown>));

  let releasedCents = 0;
  let pendingCents = 0;
  let completedCount = 0;
  for (const p of payouts) {
    if (p.status === 'released') { releasedCents += p.helperPayoutCents; completedCount += 1; }
    else if (p.status === 'held') { pendingCents += p.helperPayoutCents; }
  }

  return { releasedCents, pendingCents, completedCount, payouts };
}

// ── Stripe Connect ────────────────────────────────────────────────────────────

/**
 * Kicks off Stripe Connect Express onboarding for the current helper.
 * Returns the onboarding URL the caller should redirect to.
 */
export async function startHelperOnboarding(opts: {
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ url: string | null; error: string | null }> {
  if (!STRIPE_CONFIGURED) {
    return { url: null, error: 'Stripe is not configured yet.' };
  }
  const res = await invokeEdgeFunction<{ url: string }>(
    'stripe-onboard-helper',
    { return_url: opts.returnUrl, refresh_url: opts.refreshUrl },
  );
  if (res.error || !res.data) return { url: null, error: res.error };
  return { url: res.data.url, error: null };
}

/**
 * Creates a Stripe PaymentIntent for an existing payment_request.
 * Returns the client_secret the lister will use to confirm payment.
 */
export async function createPaymentIntent(
  paymentRequestId: string,
): Promise<{ clientSecret: string | null; error: string | null }> {
  if (!STRIPE_CONFIGURED) {
    return { clientSecret: null, error: 'Stripe is not configured yet.' };
  }
  const res = await invokeEdgeFunction<{ client_secret: string }>(
    'stripe-create-payment-intent',
    { payment_request_id: paymentRequestId },
  );
  if (res.error || !res.data) return { clientSecret: null, error: res.error };
  return { clientSecret: res.data.client_secret, error: null };
}

/**
 * Captures the held PaymentIntent, releasing escrow to the helper.
 * Returns true on success.
 */
export async function releasePaymentViaStripe(
  paymentRequestId: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!STRIPE_CONFIGURED) {
    return { ok: false, error: 'Stripe is not configured yet.' };
  }
  const res = await invokeEdgeFunction<{ ok: boolean }>(
    'stripe-release-payment',
    { payment_request_id: paymentRequestId },
  );
  if (res.error || !res.data) return { ok: false, error: res.error };
  return { ok: !!res.data.ok, error: null };
}

/**
 * Cancels a pending/held payment via the Edge Function — voids the uncaptured
 * Stripe authorization (releasing the hold on the lister's card) and marks
 * the payment_request cancelled. Only the requester can cancel.
 */
export async function cancelPaymentViaStripe(
  paymentRequestId: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!STRIPE_CONFIGURED) {
    return { ok: false, error: 'Stripe is not configured yet.' };
  }
  const res = await invokeEdgeFunction<{ ok: boolean }>(
    'stripe-cancel-payment',
    { payment_request_id: paymentRequestId },
  );
  if (res.error || !res.data) return { ok: false, error: res.error };
  return { ok: !!res.data.ok, error: null };
}

/** True if any payment on this listing is currently held in escrow. */
export async function listingHasHeldPayment(listingId: string): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return false;
  const { count, error } = await supabase
    .from('payment_requests')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('status', 'held');
  if (error) { console.error('[payments] listingHasHeldPayment:', error.message); return false; }
  return (count ?? 0) > 0;
}

// ── Profile-side helpers ──────────────────────────────────────────────────────

export interface StripeAccountStatus {
  accountId: string | null;
  onboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

/** Fetch the current user's Stripe Connect account status (if any). */
export async function fetchStripeStatus(userId: string): Promise<StripeAccountStatus> {
  const empty: StripeAccountStatus = {
    accountId: null,
    onboarded: false,
    chargesEnabled: false,
    payoutsEnabled: false,
  };
  if (!SUPABASE_CONFIGURED) return empty;
  const { data, error } = await supabase
    .from('profiles')
    .select('stripe_account_id, stripe_onboarded, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return empty;
  return {
    accountId:       (data.stripe_account_id as string | null) ?? null,
    onboarded:        !!data.stripe_onboarded,
    chargesEnabled:   !!data.stripe_charges_enabled,
    payoutsEnabled:   !!data.stripe_payouts_enabled,
  };
}
