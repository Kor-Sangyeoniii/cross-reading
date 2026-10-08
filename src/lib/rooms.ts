import type { GroupCompat } from '../core/compat'
import { AppError, toAppError } from './errors'
import { supabase } from './supabase'

// 그룹방·초대 데이터 계층 (CR-010). 방은 2~4명 (DECISIONS 2026-10-08).
// 방 만들기·초대 수락은 DB의 RPC(create_room/accept_invite)로만 한다 — 4명 제한·동의 검사는 DB가 강제한다.

export interface ShareChoice {
  /** 상대에게 내 MBTI를 보여줄지 */
  shareMbti: boolean
  /** 상대에게 내 프로필 요약을 보여줄지 */
  shareSummary: boolean
}

export interface InvitePreview {
  inviterNickname: string | null
  memberCount: number
  isFull: boolean
  isValid: boolean
}

export interface RoomMember {
  userId: string
  nickname: string
  /** 본인이 공개에 동의했을 때만 값이 있다 */
  mbti: string | null
  shareSummary: boolean
  joinedAt: string
}

export interface MyRoom {
  id: string
  memberCount: number
  createdAt: string
}

function client() {
  if (!supabase) throw new AppError('unknown')
  return supabase
}

/** 초대 링크 주소. 토큰은 이 주소에만 담기고 DB에는 해시만 남는다. */
export function inviteUrl(token: string, origin: string = window.location.origin): string {
  return `${origin}/invite/${encodeURIComponent(token)}`
}

/** 초대 링크 경로에서 토큰을 꺼낸다. 형식이 맞지 않으면 null. */
export function parseInvitePath(pathname: string): string | null {
  const m = /^\/invite\/([a-f0-9]{64})\/?$/.exec(pathname)
  return m ? m[1] : null
}

export async function createRoom(share: ShareChoice): Promise<{ roomId: string; inviteToken: string }> {
  const { data, error } = await client().rpc('create_room', {
    p_share_mbti: share.shareMbti,
    p_share_summary: share.shareSummary,
  })
  if (error || !data?.[0]) throw toAppError(error)
  return { roomId: data[0].room_id, inviteToken: data[0].invite_token }
}

/** 기존 방의 새 초대 링크 토큰 (구성원만, 4명이 차면 거부). 원문 토큰은 이때 한 번만 받는다. */
export async function createInvite(roomId: string): Promise<string> {
  const { data, error } = await client().rpc('create_invite', { p_room: roomId })
  if (error || !data) throw toAppError(error)
  return data as string
}

export async function previewInvite(token: string): Promise<InvitePreview | null> {
  const { data, error } = await client().rpc('preview_invite', { p_token: token })
  if (error) throw toAppError(error)
  const row = data?.[0]
  if (!row) return null
  return { inviterNickname: row.inviter_nickname, memberCount: row.member_count, isFull: row.is_full, isValid: row.is_valid }
}

/** 초대 수락. calcConsent(궁합 계산 사용 동의)는 필수이며, 공개 항목 선택과 별개다. */
export async function acceptInvite(token: string, calcConsent: boolean, share: ShareChoice): Promise<string> {
  if (!calcConsent) throw new AppError('calc_consent_required')
  const { data, error } = await client().rpc('accept_invite', {
    p_token: token,
    p_calc_consent: calcConsent,
    p_share_mbti: share.shareMbti,
    p_share_summary: share.shareSummary,
  })
  if (error || !data) throw toAppError(error)
  return data as string
}

export async function listMyRooms(): Promise<MyRoom[]> {
  const { data, error } = await client().from('rooms').select('id, member_count, created_at').order('created_at', { ascending: false })
  if (error) throw toAppError(error)
  return (data ?? []).map((r) => ({ id: r.id, memberCount: r.member_count, createdAt: r.created_at }))
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await client().rpc('get_room_members', { p_room: roomId })
  if (error) throw toAppError(error)
  return (data ?? []).map((m: { user_id: string; nickname: string; mbti: string | null; share_summary: boolean; joined_at: string }) => ({
    userId: m.user_id,
    nickname: m.nickname,
    mbti: m.mbti,
    shareSummary: m.share_summary,
    joinedAt: m.joined_at,
  }))
}

/** 내 공개 항목 바꾸기 (DB 권한상 share_mbti·share_summary만 바뀐다) */
export async function updateMyShare(roomId: string, userId: string, share: ShareChoice): Promise<void> {
  const { error } = await client()
    .from('room_members')
    .update({ share_mbti: share.shareMbti, share_summary: share.shareSummary })
    .eq('room_id', roomId)
    .eq('user_id', userId)
  if (error) throw toAppError(error)
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const { error } = await client().from('room_members').delete().eq('room_id', roomId).eq('user_id', userId)
  if (error) throw toAppError(error)
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await client().from('invites').update({ revoked_at: new Date().toISOString() }).eq('id', inviteId)
  if (error) throw toAppError(error)
}

/** 모임 궁합 (서버 함수 room-compat). 다른 사람의 출생정보는 받지 않고 해석 문장만 받는다. */
export async function getRoomCompat(roomId: string): Promise<GroupCompat> {
  const { data, error } = await client().functions.invoke('room-compat', { body: { roomId } })
  if (error) {
    // Edge Function 오류 응답 본문의 { error: 'code' }를 읽는다.
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw toAppError(body ?? error)
  }
  return data as GroupCompat
}
