// PASTE THIS into Supabase Dashboard → Edge Functions → "delete-account"
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
    const db = admin();

    // Refuse deletion while money is in escrow — a held payment means an
    // in-flight task where one side would lose funds or payout.
    const { count: heldCount } = await db
      .from('payment_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'held')
      .or(`requester_id.eq.${user.id},helper_id.eq.${user.id}`);
    if ((heldCount ?? 0) > 0) {
      return err(
        'You have a payment held in escrow. Complete or cancel the task first, then try again.',
        409,
      );
    }

    // Deleting the auth user cascades: auth.users → profiles → listings,
    // offers, notifications, reliability_scores, etc. (ON DELETE CASCADE).
    const { error: delError } = await db.auth.admin.deleteUser(user.id);
    if (delError) throw delError;

    return json({ ok: true });
  } catch (e) {
    console.error('[delete-account]', e instanceof Error ? e.stack ?? e.message : String(e));
    return err('Something went wrong deleting your account. Please try again.', 500);
  }
});
