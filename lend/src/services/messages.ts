/**
 * Task messaging service — persists step responses, DMs, and system messages
 * for an accepted offer. Uses Supabase Realtime for live updates.
 */
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { adaptTaskMessage } from '../lib/adapters';
import type { TaskMessage, TaskMessageType } from '../types';

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchMessages(offerId: string): Promise<TaskMessage[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from('task_messages')
    .select('*')
    .eq('offer_id', offerId)
    .order('created_at', { ascending: true });
  if (error) { console.error('[messages] fetchMessages error:', error); return []; }
  return (data ?? []).map(r => adaptTaskMessage(r as unknown as Record<string, unknown>));
}

// ── Send ──────────────────────────────────────────────────────────────────────

export interface SendMessageInput {
  listingId: string;
  offerId: string;
  senderId: string;
  type: TaskMessageType;
  content: string;
  stepIndex?: number;
}

export async function sendMessage(input: SendMessageInput): Promise<TaskMessage | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from('task_messages')
    .insert({
      listing_id: input.listingId,
      offer_id: input.offerId,
      sender_id: input.senderId,
      type: input.type,
      content: input.content,
      step_index: input.stepIndex ?? null,
    })
    .select()
    .single();
  if (error) { console.error('[messages] sendMessage error:', error); return null; }
  return adaptTaskMessage(data as unknown as Record<string, unknown>);
}

// ── Step progress ─────────────────────────────────────────────────────────────

/** Advance an offer's step index after the helper responds. */
export async function advanceStep(
  offerId: string,
  nextIndex: number,
  totalSteps: number,
): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return true;
  const { error } = await supabase
    .from('offers')
    .update({
      current_step_index: nextIndex,
      steps_completed: nextIndex >= totalSteps,
    })
    .eq('id', offerId);
  if (error) { console.error('[messages] advanceStep error:', error); return false; }
  return true;
}

// ── Per-offer Realtime subscription ──────────────────────────────────────────

export function subscribeToMessages(
  offerId: string,
  onMessage: (msg: TaskMessage) => void,
) {
  if (!SUPABASE_CONFIGURED) {
    return { unsubscribe: () => {} };
  }
  const channel = supabase
    .channel(`task_messages:${offerId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'task_messages',
        filter: `offer_id=eq.${offerId}`,
      },
      payload => {
        onMessage(adaptTaskMessage(payload.new as unknown as Record<string, unknown>));
      },
    )
    .subscribe();

  return {
    unsubscribe: () => { supabase.removeChannel(channel); },
  };
}

/**
 * Subscribe to voice_request messages across ALL the current user's chats.
 * RLS ensures only messages for offers the user participates in are delivered.
 * Used by GlobalVoiceListener to surface incoming call notifications even when
 * the user is not on the chat page.
 */
export function subscribeToVoiceRequests(
  onVoiceRequest: (msg: TaskMessage) => void,
) {
  if (!SUPABASE_CONFIGURED) return { unsubscribe: () => {} };
  const channel = supabase
    .channel('global_voice_requests')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'task_messages',
        filter: 'type=eq.voice_request',
      },
      payload => {
        onVoiceRequest(adaptTaskMessage(payload.new as unknown as Record<string, unknown>));
      },
    )
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}

// ── Voice signaling (ephemeral broadcast channel) ─────────────────────────────

export type VoiceSignal =
  | { type: 'offer'; sdp: string; from: string }
  | { type: 'answer'; sdp: string; from: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; from: string }
  | { type: 'hangup'; from: string }
  /** Sent by the receiver when they join the channel — prompts the initiator
   *  to re-send the offer SDP so late-joining receivers don't miss it. */
  | { type: 'ready'; from: string };

/** Returns a Supabase Realtime broadcast channel for WebRTC signaling.
 *  Signals are ephemeral — they are not stored in the database. */
export function getVoiceChannel(offerId: string) {
  if (!SUPABASE_CONFIGURED) return null;
  return supabase.channel(`voice:${offerId}`);
}
