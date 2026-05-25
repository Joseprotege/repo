import { supabase } from '../lib/supabase';

export interface NotificationRow {
  id: string; user_id: string; title: string; body: string;
  type: string; link_to: string; read: boolean; created_at: string;
}

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) { console.error('[notifications] fetchNotifications:', error.message); return []; }
  return (data ?? []) as NotificationRow[];
}

export async function markAllRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true } as never)
    .eq('user_id', userId)
    .eq('read', false);
  if (error) { console.error('[notifications] markAllRead:', error.message); return false; }
  return true;
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: NotificationRow[]) => void
) {
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      async () => { const notifs = await fetchNotifications(userId); callback(notifs); }
    )
    .subscribe();
}
