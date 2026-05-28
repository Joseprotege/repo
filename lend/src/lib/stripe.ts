/**
 * Stripe.js singleton + helpers for invoking Foster's Stripe Edge Functions.
 *
 * STRIPE_CONFIGURED is true when VITE_STRIPE_PUBLISHABLE_KEY is set; if false,
 * the app falls back to the mock escrow flow (direct DB update without real
 * money movement). This lets us ship the UI before Stripe is fully configured.
 */
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

export const STRIPE_CONFIGURED = SUPABASE_CONFIGURED && !!publishableKey;

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!STRIPE_CONFIGURED) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(publishableKey!);
  return stripePromise;
}

/**
 * Invoke a Supabase Edge Function under our project URL. The Supabase JS
 * client automatically attaches the user's JWT in the Authorization header,
 * which our Edge Functions verify via requireUser().
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  if (!SUPABASE_CONFIGURED) {
    return { data: null, error: 'Supabase not configured' };
  }
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) return { data: null, error: error.message };
    return { data: data as T, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: null, error: msg };
  }
}
