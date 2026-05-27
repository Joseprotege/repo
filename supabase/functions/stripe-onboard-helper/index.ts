/**
 * stripe-onboard-helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates (or reuses) a Stripe Connect Express account for the calling helper
 * and returns an onboarding URL the frontend can redirect to.
 *
 * Inputs (JSON body):
 *   - return_url:  where Stripe sends the user after onboarding completes
 *   - refresh_url: where Stripe sends the user if the link expires before
 *                  they finish
 *
 * Returns: { url: string, account_id: string }
 */
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getStripe, getSupabaseAdmin, requireUser } from '../_shared/stripe.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return errorResponse('Method not allowed', 405);

  try {
    const user = await requireUser(req);
    const { return_url, refresh_url } = await req.json();
    if (!return_url || !refresh_url) {
      return errorResponse('return_url and refresh_url are required');
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // 1. Load existing profile to see if we already created an account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarded')
      .eq('id', user.id)
      .single();
    if (profileError) return errorResponse(profileError.message, 500);

    let accountId = profile?.stripe_account_id as string | null;

    // 2. Create a new Express account if needed
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_type: 'individual',
        metadata: { foster_user_id: user.id },
      });
      accountId = account.id;

      // Persist the new account ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);
      if (updateError) return errorResponse(updateError.message, 500);
    }

    // 3. Generate the onboarding link
    const link = await stripe.accountLinks.create({
      account: accountId,
      return_url,
      refresh_url,
      type: 'account_onboarding',
    });

    return jsonResponse({ url: link.url, account_id: accountId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[stripe-onboard-helper] error:', msg);
    return errorResponse(msg, 500);
  }
});
