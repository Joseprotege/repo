/**
 * stripe-release-payment
 * ─────────────────────────────────────────────────────────────────────────────
 * Captures a previously-authorized PaymentIntent, releasing the escrowed funds
 * to the helper (minus the application_fee_amount which goes to Foster's
 * platform account).
 *
 * Inputs (JSON body):
 *   - payment_request_id: uuid of the payment_requests row
 *
 * Returns: { ok: true, status: 'released' }
 *
 * Notes:
 *   - Caller MUST be the requester (lister) of this payment_request.
 *   - payment_request.status MUST be 'held'.
 *   - The corresponding listing's task SHOULD be marked complete (UI enforces).
 */
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getStripe, getSupabaseAdmin, requireUser } from '../_shared/stripe.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return errorResponse('Method not allowed', 405);

  try {
    const user = await requireUser(req);
    const { payment_request_id } = await req.json();
    if (!payment_request_id) return errorResponse('payment_request_id required');

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    const { data: pr, error: prError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', payment_request_id)
      .single();
    if (prError || !pr) return errorResponse(prError?.message ?? 'Not found', 404);

    if (pr.requester_id !== user.id) {
      return errorResponse('Only the requester can release this payment', 403);
    }
    if (pr.status !== 'held') {
      return errorResponse(`Cannot release a payment in status '${pr.status}'`, 409);
    }
    if (!pr.stripe_payment_intent_id) {
      return errorResponse('Payment was never funded — no PaymentIntent to capture', 409);
    }

    // Capture the PaymentIntent — this transfers funds to the helper's account
    // (minus the application_fee_amount that goes to Foster's balance).
    const pi = await stripe.paymentIntents.capture(pr.stripe_payment_intent_id);

    // Find the transfer ID if Stripe created one (it usually does for
    // transfer_data destinations).
    const transferId = (pi.charges?.data?.[0]?.transfer as string | undefined)
      ?? (pi.latest_charge as string | null)
      ?? null;

    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        stripe_transfer_id: transferId,
      })
      .eq('id', pr.id);
    if (updateError) return errorResponse(updateError.message, 500);

    return jsonResponse({ ok: true, status: 'released' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[stripe-release-payment] error:', msg);
    return errorResponse(msg, 500);
  }
});
