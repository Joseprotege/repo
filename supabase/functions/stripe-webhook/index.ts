// PASTE THIS into Supabase Dashboard → Edge Functions → "stripe-webhook"
// NOTE: When creating this function in the dashboard, disable JWT verification
//       (there's a toggle in the function settings — Stripe signs its own requests).
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.224.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const sig = req.headers.get('stripe-signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!sig || !secret) return new Response('Missing signature', { status: 400 });

  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return new Response('STRIPE_SECRET_KEY not set', { status: 500 });
  const stripe = new Stripe(key, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch (e) {
    return new Response(`Signature error: ${e instanceof Error ? e.message : e}`, { status: 400 });
  }

  const db = admin();

  try {
    if (event.type === 'payment_intent.amount_capturable_updated') {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.payment_request_id) {
        await db.from('payment_requests')
          .update({ status: 'held', funded_at: new Date().toISOString() })
          .eq('id', pi.metadata.payment_request_id);
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.payment_request_id) {
        await db.from('payment_requests').update({
          status: 'released',
          released_at: new Date().toISOString(),
          stripe_transfer_id: pi.charges?.data?.[0]?.transfer as string ?? null,
        }).eq('id', pi.metadata.payment_request_id);
      }
    } else if (event.type === 'payment_intent.canceled') {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.payment_request_id) {
        await db.from('payment_requests').update({ status: 'cancelled' })
          .eq('id', pi.metadata.payment_request_id);
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (piId) {
        await db.from('payment_requests').update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', piId);
      }
    } else if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      if (account.metadata?.foster_user_id) {
        await db.from('profiles').update({
          stripe_onboarded:       account.details_submitted ?? false,
          stripe_charges_enabled: account.charges_enabled ?? false,
          stripe_payouts_enabled: account.payouts_enabled ?? false,
        }).eq('id', account.metadata.foster_user_id);
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : String(e), { status: 500 });
  }
});
