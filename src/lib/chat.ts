import type { RealtimeChannel } from '@supabase/supabase-js'
import { AppError, toAppError } from './errors'
import { notifyRoom } from './push'
import { supabase } from './supabase'

// 그룹 채팅·차단·신고 데이터 계층 (CR-010).
// 차단(상연님 결정 2026-10-08, 1번): 내가 차단한 사람의 메시지는 내 화면에서만 숨긴다. DB(RLS)가 조회에서 걸러준다.

export const MAX_MESSAGE_LENGTH = 2000

export interface ChatMessage {
  id: number
  roomId: string
  senderId: string
  body: string
  /** 보낼 당시 방 인원 (H2 집계용) */
  memberCountAtSend: number
  createdAt: string
}

type MessageRow = {
  id: number
  room_id: string
  sender_id: string
  body: string
  member_count_at_send: number
  created_at: string
}

const toMessage = (r: MessageRow): ChatMessage => ({
  id: r.id,
  roomId: r.room_id,
  senderId: r.sender_id,
  body: r.body,
  memberCountAtSend: r.member_count_at_send,
  createdAt: r.created_at,
})

function client() {
  if (!supabase) throw new AppError('unknown')
  return supabase
}

/** 보낼 메시지 정리·검사. 앞뒤 공백 제거 후 1~2000자. */
export function normalizeMessage(body: string): string {
  const text = body.trim()
  if (text.length === 0) throw new AppError('message_empty')
  if (text.length > MAX_MESSAGE_LENGTH) throw new AppError('message_too_long')
  return text
}

/** 최근 메시지부터 limit개를 가져와 오래된 순으로 돌려준다. beforeId를 주면 그 이전 메시지. */
export async function listMessages(roomId: string, opts: { beforeId?: number; limit?: number } = {}): Promise<ChatMessage[]> {
  let q = client()
    .from('messages')
    .select('id, room_id, sender_id, body, member_count_at_send, created_at')
    .eq('room_id', roomId)
    .order('id', { ascending: false })
    .limit(opts.limit ?? 50)
  if (opts.beforeId !== undefined) q = q.lt('id', opts.beforeId)
  const { data, error } = await q
  if (error) throw toAppError(error)
  return (data as MessageRow[]).map(toMessage).reverse()
}

/** 메시지 보내기. 사용자가 직접 누를 때만 호출한다(자동 전송 없음). 보낸 뒤 같은 방 사람들에게 알림을 요청한다. */
export async function sendMessage(roomId: string, senderId: string, body: string, onPushFailure?: () => void): Promise<number> {
  const text = normalizeMessage(body)
  const { data, error } = await client()
    .from('messages')
    .insert({ room_id: roomId, sender_id: senderId, body: text })
    .select('id')
    .single()
  if (error || !data) throw toAppError(error)
  void notifyRoom(data.id).then((ok) => { if (!ok) onPushFailure?.() })
  return data.id
}

/**
 * 메시지 실시간 수신. RLS가 적용되어 구성원이 아니거나 내가 차단한 사람의 메시지는 오지 않는다.
 * - onDelete: 메시지가 지워지면(작성자 계정 삭제 등) 그 id가 온다 → 화면 목록·캐시에서 제거.
 *   (Supabase는 삭제 이벤트를 방 필터로 거를 수 없고 id만 보내므로, 내 화면에 있는 id만 지우면 된다)
 * - onResync: 연결이 끊겼다 다시 이어지면 호출 → listMessages로 다시 불러와 빠진·지워진 메시지를 맞춘다.
 * 반환값으로 구독 해제.
 */
export function subscribeMessages(
  roomId: string,
  onMessage: (m: ChatMessage) => void,
  handlers: { onDelete?: (messageId: number) => void; onResync?: () => void } = {},
): () => void {
  const channel: RealtimeChannel = client()
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) =>
      onMessage(toMessage(payload.new as MessageRow)),
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
      const id = (payload.old as { id?: number }).id
      if (typeof id === 'number') handlers.onDelete?.(id)
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        handlers.onResync?.()
      }
    })
  return () => {
    void client().removeChannel(channel)
  }
}

/** 화면 목록에서 지워진 메시지를 뺀다 (onDelete와 함께 사용) */
export function removeMessage(list: ChatMessage[], messageId: number): ChatMessage[] {
  return list.filter((m) => m.id !== messageId)
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await client().from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId })
  if (error && !String(error.code).startsWith('23505')) throw toAppError(error) // 이미 차단됨은 성공으로 본다
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await client().from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId)
  if (error) throw toAppError(error)
}

export async function reportUser(input: {
  reporterId: string
  reportedUserId: string
  roomId: string
  messageId?: number
  reason: string
}): Promise<void> {
  const reason = input.reason.trim()
  if (reason.length === 0) throw new AppError('report_reason_required')
  const { error } = await client().from('reports').insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    room_id: input.roomId,
    message_id: input.messageId ?? null,
    reason: reason.slice(0, 500),
  })
  if (error) throw toAppError(error)
}
