import { supabase } from '../lib/supabase';
import { notify } from '../lib/notify';
import { friendlyError } from '../lib/errors';

export interface ProfileRow {
  id: string; username: string; display_name: string; bio: string;
  avatar_seed: string; city: string; state: string; neighborhood: string;
  lat: number; lng: number; skills: string[]; is_online: boolean; created_at: string;
}

export interface ReliabilityRow {
  user_id: string; total_offers: number; completed: number; positive_outcomes: number;
  self_assessed_ability_avg: number; self_assessed_availability_avg: number;
  actual_score: number; overall: number; updated_at: string;
}

/** Fetch a single user profile */
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) { console.error('[profiles] fetchProfile:', error.message); return null; }
  return data as ProfileRow;
}

/** Fetch a profile by username */
export async function fetchProfileByUsername(username: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) { console.error('[profiles] fetchProfileByUsername:', error.message); return null; }
  return data as ProfileRow;
}

/** Fetch top helpers */
export async function fetchTopHelpers(limit = 4): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(limit);

  if (error) { console.error('[profiles] fetchTopHelpers:', error.message); return []; }
  return (data ?? []) as ProfileRow[];
}

/** Update profile fields */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<ProfileRow, 'id' | 'created_at'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates as never)
    .eq('id', userId);

  if (error) {
    console.error('[profiles] updateProfile:', error.message);
    notify.error(friendlyError(error, "Couldn't save your profile. Please try again."));
    return false;
  }
  return true;
}

/** Fetch reliability score for a user */
export async function fetchReliability(userId: string): Promise<ReliabilityRow | null> {
  const { data, error } = await supabase
    .from('reliability_scores')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) { console.error('[profiles] fetchReliability:', error.message); return null; }
  return data as ReliabilityRow;
}

/**
 * Permanently delete the current user's account via the delete-account
 * Edge Function. Cascades through profiles, listings, offers, etc.
 * Fails with a friendly message if a payment is still held in escrow.
 */
export async function deleteAccount(): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error) {
      // supabase-js wraps 4xx/5xx as FunctionsHttpError; .context is the raw Response
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx instanceof Response) {
        try {
          const body = await ctx.json();
          if (typeof body?.error === 'string') return { ok: false, error: body.error };
        } catch { /* non-JSON or already-consumed body */ }
      }
      return { ok: false, error: 'Could not delete your account. Please try again.' };
    }
    return { ok: !!(data as { ok?: boolean })?.ok, error: null };
  } catch (e) {
    return { ok: false, error: 'Could not delete your account. Please try again.' };
  }
}
