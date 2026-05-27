// PASTE THIS into Supabase Dashboard → Edge Functions → "stripe-onboard-helper"
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
  return { id: data.user.id, email: data.user.email ?? '' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return err('Method not allowed', 405);
  try {
    const user = await getUser(req);
    const { return_url, refresh_url } = await req.json();
    if (!return_url || !refresh_url) return err('return_url and refresh_url required');

    const stripe = getStripe();
    const db = admin();

    const { data: profile } = await db
      .from('profiles').select('stripe_account_id').eq('id', user.id).single();

    let accountId: string = profile?.stripe_account_id ?? '';

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: 'individual',
        metadata: { foster_user_id: user.id },
      });
      accountId = account.id;
      await db.from('profiles').update({ stripe_account_id: accountId }).eq('id', user.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId, return_url, refresh_url, type: 'account_onboarding',
    });

    return json({ url: link.url, account_id: accountId });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
