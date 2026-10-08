import type { RealtimeChannel } from '@supabase/supabase-js'
import { AppError, toAppError } from './errors'
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

/** 메시지 보내기. 사용자가 직접 누를 때만 호출한다(자동 전송 없음). */
export async function sendMessage(roomId: string, senderId: string, body: string): Promise<void> {
  const text = normalizeMessage(body)
  const { error } = await client().from('messages').insert({ room_id: roomId, sender_id: senderId, body: text })
  if (error) throw toAppError(error)
}

/** 새 메시지 실시간 수신. RLS가 적용되어 구성원이 아니거나 내가 차단한 사람의 메시지는 오지 않는다. 반환값으로 구독 해제. */
export function subscribeMessages(roomId: string, onMessage: (m: ChatMessage) => void): () => void {
  const channel: RealtimeChannel = client()
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) =>
      onMessage(toMessage(payload.new as MessageRow)),
    )
    .subscribe()
  return () => {
    void client().removeChannel(channel)
  }
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
