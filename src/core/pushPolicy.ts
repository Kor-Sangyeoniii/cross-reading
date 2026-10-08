// 새 메시지 알림 규칙 (CR-008). 브라우저·서비스워커·서버 함수가 같이 쓴다.
// 원칙: 알림 미리보기에 메시지 본문·사주 정보를 넣지 않는다 (와이어프레임 17, AGENTS.md P1).

export interface PushPayload {
  title: string
  body: string
  /** 알림을 누르면 열 같은 사이트 경로 */
  url: string
  /** 같은 방 알림은 하나로 합친다 */
  tag: string
}

export function newMessagePayload(roomId: string): PushPayload {
  return {
    title: 'Cross Reading',
    body: '새 메시지가 왔어요',
    url: `/rooms/${roomId}`,
    tag: `room-${roomId}`,
  }
}

/** 알림 받을 사람: 같은 방 구성원 중 보낸 사람 본인과, 보낸 사람을 차단한 사람은 제외 */
export function pushRecipients(input: { memberIds: string[]; senderId: string; blockedSenderBy: string[] }): string[] {
  const blocked = new Set(input.blockedSenderBy)
  return input.memberIds.filter((id) => id !== input.senderId && !blocked.has(id))
}

/** 메시지가 방금 보낸 것인지 (오래된 메시지로 알림을 다시 보내는 남용 방지) */
export function isFreshMessage(createdAt: string, now: Date = new Date(), maxSeconds = 120): boolean {
  const t = Date.parse(createdAt)
  if (Number.isNaN(t)) return false
  const age = (now.getTime() - t) / 1000
  return age >= -5 && age <= maxSeconds
}

/** VAPID 공개키(base64url) → 구독에 쓰는 바이트 배열 */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export type PushSupport = 'supported' | 'install_required' | 'unsupported'

/**
 * 이 기기에서 웹 푸시를 쓸 수 있는지.
 * 아이폰·아이패드는 홈 화면에 설치한 웹앱에서만 웹 푸시가 된다 (iOS 16.4+, WebKit 공지).
 */
export function pushSupport(env: { userAgent: string; standalone: boolean; hasPushManager: boolean; hasNotification: boolean }): PushSupport {
  const isIOS = /iPhone|iPad|iPod/i.test(env.userAgent)
  if (isIOS && !env.standalone) return 'install_required'
  if (!env.hasPushManager || !env.hasNotification) return 'unsupported'
  return 'supported'
}
