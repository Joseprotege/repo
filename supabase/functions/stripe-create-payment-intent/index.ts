/**
 * stripe-create-payment-intent
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a Stripe PaymentIntent for a payment_request, with
 * `transfer_data[destination]=<helper_stripe_account>` and
 * `application_fee_amount=<platform_fee_cents>`, then returns the
 * client_secret so the lister can confirm payment via Stripe.js Elements.
 *
 * Inputs (JSON body):
 *   - payment_request_id: uuid of the payment_requests row
 *
 * Returns: { client_secret: string, payment_intent_id: string }
 *
 * Notes:
 *   - Caller MUST be the requester (lister) of this payment_request.
 *   - Helper MUST have stripe_onboarded = true.
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

    // 1. Load the payment request
    const { data: pr, error: prError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', payment_request_id)
      .single();
    if (prError || !pr) return errorResponse(prError?.message ?? 'Not found', 404);

    // 2. Authorize: caller must be the requester (lister)
    if (pr.requester_id !== user.id) {
      return errorResponse('Only the requester can fund this payment', 403);
    }
    if (pr.status !== 'pending') {
      return errorResponse(`Payment is already in status '${pr.status}'`, 409);
    }

    // 3. Load helper's Stripe account
    const { data: helper, error: helperError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_charges_enabled')
      .eq('id', pr.helper_id)
      .single();
    if (helperError || !helper?.stripe_account_id) {
      return errorResponse(
        'Helper has not connected a Stripe account. Ask them to set one up before funding.',
        409,
      );
    }

    // 4. Reuse existing PaymentIntent if one was already created for this PR
    if (pr.stripe_payment_intent_id && pr.stripe_client_secret) {
      return jsonResponse({
        client_secret: pr.stripe_client_secret,
        payment_intent_id: pr.stripe_payment_intent_id,
      });
    }

    // 5. Create the PaymentIntent.
    //    - capture_method: 'manual' so funds are authorized but NOT captured
    //      until the lister marks the task complete (true escrow behavior).
    //    - transfer_data.destination + application_fee_amount routes the net
    //      payout to the helper's connected account at capture time.
    const pi = await stripe.paymentIntents.create({
      amount: pr.amount_cents,
      currency: pr.currency ?? 'usd',
      capture_method: 'manual',
      application_fee_amount: pr.platform_fee_cents,
      transfer_data: { destination: helper.stripe_account_id },
      metadata: {
        payment_request_id: pr.id,
        offer_id: pr.offer_id,
        listing_id: pr.listing_id,
        foster_requester_id: pr.requester_id,
        foster_helper_id: pr.helper_id,
      },
    });

    // 6. Persist PI ID + client secret + actual app fee
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        stripe_payment_intent_id: pi.id,
        stripe_client_secret: pi.client_secret,
        stripe_application_fee_cents: pr.platform_fee_cents,
      })
      .eq('id', pr.id);
    if (updateError) return errorResponse(updateError.message, 500);

    return jsonResponse({
      client_secret: pi.client_secret,
      payment_intent_id: pi.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[stripe-create-payment-intent] error:', msg);
    return errorResponse(msg, 500);
  }
});
