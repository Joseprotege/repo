/**
 * stripe-webhook
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives webhook events from Stripe and updates Foster's database state
 * accordingly.
 *
 * Events handled:
 *   - payment_intent.amount_capturable_updated  →  payment_requests.status = 'held'
 *   - payment_intent.succeeded                  →  payment_requests.status = 'released'
 *   - payment_intent.canceled                   →  payment_requests.status = 'cancelled'
 *   - charge.refunded                           →  payment_requests.status = 'refunded'
 *   - account.updated                           →  profiles.stripe_charges_enabled etc.
 *
 * Setup:
 *   In Stripe Dashboard → Developers → Webhooks, create an endpoint pointing
 *   at <project_ref>.supabase.co/functions/v1/stripe-webhook and copy the
 *   signing secret into the STRIPE_WEBHOOK_SECRET Supabase secret.
 */
import { jsonResponse } from '../_shared/cors.ts';
import { getStripe, getSupabaseAdmin } from '../_shared/stripe.ts';
import type Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.224.0';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!signature || !webhookSecret) {
    return new Response('Missing signature or secret', { status: 400 });
  }

  const stripe = getStripe();
  const supabase = getSupabaseAdmin();
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[stripe-webhook] signature verification failed:', msg);
    return new Response(`Webhook signature error: ${msg}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        // Funds authorized — flip the payment_request to 'held'
        const pi = event.data.object as Stripe.PaymentIntent;
        const prId = pi.metadata?.payment_request_id;
        if (prId) {
          await supabase
            .from('payment_requests')
            .update({ status: 'held', funded_at: new Date().toISOString() })
            .eq('id', prId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Funds captured + transferred to helper — flip to 'released'
        const pi = event.data.object as Stripe.PaymentIntent;
        const prId = pi.metadata?.payment_request_id;
        if (prId) {
          const transferId = (pi.charges?.data?.[0]?.transfer as string | undefined) ?? null;
          await supabase
            .from('payment_requests')
            .update({
              status: 'released',
              released_at: new Date().toISOString(),
              stripe_transfer_id: transferId,
            })
            .eq('id', prId);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const prId = pi.metadata?.payment_request_id;
        if (prId) {
          await supabase
            .from('payment_requests')
            .update({ status: 'cancelled' })
            .eq('id', prId);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (piId) {
          await supabase
            .from('payment_requests')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', piId);
        }
        break;
      }

      case 'account.updated': {
        // Helper finished onboarding — record capability flags
        const account = event.data.object as Stripe.Account;
        const fosterUserId = account.metadata?.foster_user_id;
        if (fosterUserId) {
          const detailsSubmitted = account.details_submitted ?? false;
          const chargesEnabled   = account.charges_enabled ?? false;
          const payoutsEnabled   = account.payouts_enabled ?? false;
          await supabase
            .from('profiles')
            .update({
              stripe_onboarded:        detailsSubmitted,
              stripe_charges_enabled:  chargesEnabled,
              stripe_payouts_enabled:  payoutsEnabled,
            })
            .eq('id', fosterUserId);
        }
        break;
      }

      default:
        // Ignore irrelevant events — Stripe sends many
        break;
    }

    return jsonResponse({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[stripe-webhook] handler error for ${event.type}:`, msg);
    return new Response(msg, { status: 500 });
  }
});
