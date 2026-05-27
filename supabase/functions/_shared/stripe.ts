/**
 * Shared Stripe + Supabase clients for Foster Edge Functions.
 */
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.224.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/** Stripe client — secret key from Supabase Edge Function secret. */
export function getStripe(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured in Supabase secrets');
  }
  return new Stripe(key, {
    apiVersion: '2024-06-20',
    // Required for Deno (Stripe SDK default uses node http)
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Supabase admin client — bypasses RLS for Edge Function operations.
 * Uses the service-role key from Supabase secrets.
 */
export function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Extract & verify the calling user from an Authorization: Bearer <jwt> header.
 * Throws if the JWT is missing or invalid.
 */
export async function requireUser(req: Request): Promise<{ id: string; email?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) throw new Error('Supabase URL or anon key missing');

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error('Invalid auth token');
  return { id: data.user.id, email: data.user.email ?? undefined };
}
