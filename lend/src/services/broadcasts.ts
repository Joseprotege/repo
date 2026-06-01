import { supabase } from '../lib/supabase';
import { notify } from '../lib/notify';
import { friendlyError } from '../lib/errors';

export interface BroadcastRow {
  id: string; sender_id: string | null; area_label: string; category: string;
  message: string; note: string; reactions_heart: number;
  reactions_clap: number; reactions_spark: number; created_at: string;
}

export interface BroadcastInsert {
  area_label: string; category: string; message: string;
  sender_id?: string | null; note?: string;
  reactions_heart?: number; reactions_clap?: number; reactions_spark?: number;
}

/** Fetch recent broadcasts — public, no auth required */
export async function fetchBroadcasts(limit = 20): Promise<BroadcastRow[]> {
  const { data, error } = await supabase
    .from('community_broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('[broadcasts] fetchBroadcasts:', error.message); return []; }
  return (data ?? []) as BroadcastRow[];
}

/** Send a new anonymous broadcast */
export async function sendBroadcast(broadcast: BroadcastInsert): Promise<BroadcastRow | null> {
  const { data, error } = await supabase
    .from('community_broadcasts')
    .insert(broadcast as never)
    .select()
    .single();

  if (error) {
    console.error('[broadcasts] sendBroadcast:', error.message);
    notify.error(friendlyError(error, "Couldn't send your broadcast. Please try again."));
    return null;
  }
  return data as BroadcastRow;
}

/** React to a broadcast — one reaction per user, null removes it */
export async function reactToBroadcast(
  broadcastId: string,
  userId: string,
  reactionType: 'heart' | 'clap' | 'spark' | null
): Promise<boolean> {
  if (reactionType === null) {
    const { error } = await supabase
      .from('broadcast_reactions')
      .delete()
      .eq('broadcast_id', broadcastId)
      .eq('user_id', userId);
    return !error;
  }

  const { error } = await supabase
    .from('broadcast_reactions')
    .upsert({ broadcast_id: broadcastId, user_id: userId, reaction_type: reactionType } as never);

  return !error;
}

/** Subscribe to real-time new broadcasts */
export function subscribeToBroadcasts(callback: (broadcasts: BroadcastRow[]) => void) {
  return supabase
    .channel('broadcasts-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_broadcasts' }, async () => {
      const broadcasts = await fetchBroadcasts();
      callback(broadcasts);
    })
    .subscribe();
}
