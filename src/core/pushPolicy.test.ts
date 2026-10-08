import { describe, expect, it } from 'vitest'
import { isFreshMessage, newMessagePayload, pushRecipients, pushSupport, urlBase64ToUint8Array } from './pushPolicy'

// 가짜 값만 쓴다 (AGENTS.md P1).
describe('pushPolicy', () => {
  it('알림 내용에 메시지 본문이 없고 같은 사이트 경로로 연다', () => {
    const p = newMessagePayload('11111111-1111-1111-1111-111111111111')
    expect(p).toEqual({
      title: 'Cross Reading',
      body: '새 메시지가 왔어요',
      url: '/rooms/11111111-1111-1111-1111-111111111111',
      tag: 'room-11111111-1111-1111-1111-111111111111',
    })
  })

  it('받는 사람: 보낸 사람과 보낸 사람을 차단한 사람 제외', () => {
    expect(pushRecipients({ memberIds: ['a', 'b', 'c', 'd'], senderId: 'a', blockedSenderBy: ['c', 'z'] })).toEqual(['b', 'd'])
  })

  it('방금(2분 안) 보낸 메시지만 알림', () => {
    const now = new Date('2026-10-08T12:00:00Z')
    expect(isFreshMessage('2026-10-08T11:59:00Z', now)).toBe(true)
    expect(isFreshMessage('2026-10-08T11:57:00Z', now)).toBe(false)
    expect(isFreshMessage('2026-10-08T12:01:00Z', now)).toBe(false)
    expect(isFreshMessage('nope', now)).toBe(false)
  })

  it('VAPID 공개키 base64url 변환', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID_-8'))).toEqual([1, 2, 3, 255, 239])
  })

  it('아이폰은 홈 화면 설치 후에만, 기능 없는 브라우저는 미지원', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
    expect(pushSupport({ userAgent: iphone, standalone: false, hasPushManager: true, hasNotification: true })).toBe('install_required')
    expect(pushSupport({ userAgent: iphone, standalone: true, hasPushManager: true, hasNotification: true })).toBe('supported')
    expect(pushSupport({ userAgent: 'Android Chrome', standalone: false, hasPushManager: false, hasNotification: true })).toBe('unsupported')
    expect(pushSupport({ userAgent: 'Android Chrome', standalone: false, hasPushManager: true, hasNotification: true })).toBe('supported')
  })
})
