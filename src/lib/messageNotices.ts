import type { MessageNotice } from '../core/unread'
import { listMyRooms } from './rooms'
import { supabase } from './supabase'
import { toAppError } from './errors'

/** Fetch only metadata for newest incoming message per accessible room; existing RLS excludes blocked senders. */
export async function listMessageNotices(userId: string): Promise<MessageNotice[]> {
  if (!supabase) return []
  const client = supabase
  const rooms = await listMyRooms()
  return Promise.all(rooms.map(async (room) => {
    const { data, error } = await client.from('messages').select('id').eq('room_id', room.id).neq('sender_id', userId).order('id', { ascending: false }).limit(1)
    if (error) throw toAppError(error)
    return { roomId: room.id, latestId: data?.[0]?.id ?? 0 }
  }))
}

export function subscribeMessageNotices(onRefresh: () => void, onOffline: () => void): () => void {
  if (!supabase) return () => {}
  const client = supabase
  const channel = client.channel('incoming-message-notices')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onRefresh)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onRefresh()
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onOffline()
    })
  return () => { void client.removeChannel(channel) }
}
