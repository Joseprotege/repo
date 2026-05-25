import { supabase } from '../lib/supabase';

export interface OfferRow {
  id: string; listing_id: string; user_id: string; message: string;
  confidence_ability: number; confidence_availability: number;
  status: string; created_at: string;
}

export interface OfferInsert {
  listing_id: string; user_id: string; message: string;
  confidence_ability: number; confidence_availability: number;
  id?: string; status?: string;
}

/** Fetch all offers for a listing */
export async function fetchOffersForListing(listingId: string): Promise<OfferRow[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) { console.error('[offers] fetchOffersForListing:', error.message); return []; }
  return (data ?? []) as OfferRow[];
}

/** Fetch all offers made by a user */
export async function fetchUserOffers(userId: string): Promise<OfferRow[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.error('[offers] fetchUserOffers:', error.message); return []; }
  return (data ?? []) as OfferRow[];
}

/** Submit a new offer */
export async function createOffer(offer: OfferInsert): Promise<OfferRow | null> {
  const { data, error } = await supabase
    .from('offers')
    .insert(offer as never)
    .select()
    .single();

  if (error) { console.error('[offers] createOffer:', error.message); return null; }
  return data as OfferRow;
}

/** Accept an offer (listing owner action) */
export async function acceptOffer(offerId: string, listingId: string): Promise<boolean> {
  const { error: e1 } = await supabase
    .from('offers')
    .update({ status: 'accepted' } as never)
    .eq('id', offerId);

  const { error: e2 } = await supabase
    .from('offers')
    .update({ status: 'declined' } as never)
    .eq('listing_id', listingId)
    .eq('status', 'pending')
    .neq('id', offerId);

  const { error: e3 } = await supabase
    .from('listings')
    .update({ status: 'in_progress' } as never)
    .eq('id', listingId);

  if (e1 || e2 || e3) {
    console.error('[offers] acceptOffer errors:', e1?.message, e2?.message, e3?.message);
    return false;
  }
  return true;
}

/** Mark an offer as completed */
export async function completeOffer(offerId: string, listingId: string): Promise<boolean> {
  const { error: e1 } = await supabase
    .from('offers').update({ status: 'completed' } as never).eq('id', offerId);
  const { error: e2 } = await supabase
    .from('listings').update({ status: 'completed' } as never).eq('id', listingId);

  if (e1 || e2) { console.error('[offers] completeOffer:', e1?.message, e2?.message); return false; }
  return true;
}
