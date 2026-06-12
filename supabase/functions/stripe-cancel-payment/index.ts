// PASTE THIS into Supabase Dashboard → Edge Functions → "stripe-cancel-payment"
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno&deno-std=0.224.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(b), {
    ...init, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
const err = (msg: string, status = 400) => json({ error: msg }, { status });

function getStripe() {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
}
function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
async function getUser(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth) throw new Error('Missing auth header');
  const c = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await c.auth.getUser();
  if (error || !data.user) throw new Error('Invalid token');
  return { id: data.user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return err('Method not allowed', 405);
  try {
    const user = await getUser(req);
    const { payment_request_id } = await req.json();
    if (!payment_request_id) return err('payment_request_id required');

    const stripe = getStripe();
    const db = admin();

    const { data: pr } = await db
      .from('payment_requests').select('*').eq('id', payment_request_id).single();
    if (!pr) return err('Not found', 404);
    if (pr.requester_id !== user.id) return err('Forbidden', 403);
    if (pr.status === 'released') {
      return err('This payment was already released to the helper and cannot be cancelled.', 409);
    }
    if (pr.status === 'cancelled' || pr.status === 'refunded') {
      return json({ ok: true, status: pr.status });
    }

    // Cancel the uncaptured PaymentIntent if one exists — this releases the
    // authorization hold on the lister's card immediately.
    if (pr.stripe_payment_intent_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(pr.stripe_payment_intent_id);
        // Only attempt cancel on states that allow it
        if (pi.status !== 'canceled' && pi.status !== 'succeeded') {
          await stripe.paymentIntents.cancel(pr.stripe_payment_intent_id);
        }
      } catch (e) {
        console.error('[stripe-cancel-payment] PI cancel:', e instanceof Error ? e.message : String(e));
        // Continue — a missing/expired PI shouldn't block clearing our DB state
      }
    }

    await db.from('payment_requests').update({
      status: 'cancelled',
      stripe_payment_intent_id: null,
      stripe_client_secret: null,
    }).eq('id', pr.id);

    return json({ ok: true, status: 'cancelled' });
  } catch (e) {
    console.error('[stripe-cancel-payment]', e instanceof Error ? e.stack ?? e.message : String(e));
    return err('Something went wrong cancelling the payment. Please try again.', 500);
  }
});
