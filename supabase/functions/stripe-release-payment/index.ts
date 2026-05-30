// PASTE THIS into Supabase Dashboard → Edge Functions → "stripe-release-payment"
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.224.0';
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
    if (pr.status !== 'held') return err(`Cannot release from status '${pr.status}'`, 409);
    if (!pr.stripe_payment_intent_id) return err('No PaymentIntent to capture', 409);

    const pi = await stripe.paymentIntents.capture(pr.stripe_payment_intent_id);

    await db.from('payment_requests').update({
      status: 'released',
      released_at: new Date().toISOString(),
      stripe_transfer_id: pi.charges?.data?.[0]?.transfer as string ?? null,
    }).eq('id', pr.id);

    return json({ ok: true, status: 'released' });
  } catch (e) {
    // Log full detail server-side; never leak internal/DB errors to the client.
    console.error('[stripe-release-payment]', e instanceof Error ? e.stack ?? e.message : String(e));
    return err('Something went wrong releasing the payment. Please try again.', 500);
  }
});
