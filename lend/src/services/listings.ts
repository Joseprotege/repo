/**
 * Listings service — wraps all Supabase calls for listings.
 * Components import from here, never directly from supabase client.
 */
import { supabase } from '../lib/supabase';
import { notify } from '../lib/notify';
import { friendlyError } from '../lib/errors';

export interface ListingRow {
  id: string; user_id: string; title: string; description: string;
  category: string; urgency: string; status: string; image_url: string;
  city: string; state: string; neighborhood: string;
  lat: number; lng: number; created_at: string; updated_at: string;
}

export interface ListingInsert {
  user_id: string; title: string; description: string; category: string;
  id?: string; urgency?: string; status?: string; image_url?: string;
  city?: string; state?: string; neighborhood?: string;
  lat?: number; lng?: number;
}

/** Fetch all open listings, newest first */
export async function fetchOpenListings(): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) { console.error('[listings] fetchOpenListings:', error.message); return []; }
  return (data ?? []) as ListingRow[];
}

/** Fetch a single listing by ID */
export async function fetchListing(id: string): Promise<ListingRow | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) { console.error('[listings] fetchListing:', error.message); return null; }
  return data as ListingRow;
}

/** Fetch all listings created by a specific user */
export async function fetchUserListings(userId: string): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.error('[listings] fetchUserListings:', error.message); return []; }
  return (data ?? []) as ListingRow[];
}

/** Create a new listing */
export async function createListing(listing: ListingInsert): Promise<ListingRow | null> {
  const { data, error } = await supabase
    .from('listings')
    .insert(listing as never)
    .select()
    .single();

  if (error) {
    console.error('[listings] createListing:', error.message);
    notify.error(friendlyError(error, "Couldn't post your task. Please try again."));
    return null;
  }
  return data as ListingRow;
}

/** Update listing status */
export async function updateListingStatus(
  id: string,
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
): Promise<boolean> {
  const { error } = await supabase
    .from('listings')
    .update({ status } as never)
    .eq('id', id);

  if (error) { console.error('[listings] updateListingStatus:', error.message); return false; }
  return true;
}

/** Delete a listing */
export async function deleteListing(id: string): Promise<boolean> {
  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) { console.error('[listings] deleteListing:', error.message); return false; }
  return true;
}

/** Subscribe to real-time listing changes.
 *  Emits the single changed row + event type so the caller can merge it into
 *  state. (The old behaviour refetched open-listings-only and replaced the
 *  whole array, which wiped any in-progress/completed listing the user was
 *  actively viewing.) */
export function subscribeToListings(
  onChange: (change: { row: ListingRow; event: 'INSERT' | 'UPDATE' | 'DELETE' }) => void,
) {
  return supabase
    .channel('listings-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, (payload) => {
      const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
      const row = (event === 'DELETE' ? payload.old : payload.new) as ListingRow;
      if (row && row.id) onChange({ row, event });
    })
    .subscribe();
}
