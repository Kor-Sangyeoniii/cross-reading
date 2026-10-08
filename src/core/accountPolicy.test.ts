import { describe, expect, it } from 'vitest'
import { checkDeleteRequest, DELETE_CONFIRM, sessionAuthTime } from './accountPolicy'

const NOW = new Date('2026-10-08T12:00:00Z')
const ago = (min: number) => new Date(NOW.getTime() - min * 60000)
// 서명 없는 가짜 토큰 (형식만) — 실제 토큰 아님
const fakeJwt = (payload: object) =>
  ['e30', btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'), 'sig'].join('.')

describe('sessionAuthTime', () => {
  it('amr의 가장 최근 인증 시각을 읽는다', () => {
    const t = Math.floor(ago(3).getTime() / 1000)
    expect(sessionAuthTime(fakeJwt({ amr: [{ method: 'oauth', timestamp: t - 100 }, { method: 'oauth', timestamp: t }] }))?.getTime()).toBe(t * 1000)
  })
  it('amr이 없거나 형식이 틀리면 null', () => {
    expect(sessionAuthTime(fakeJwt({ sub: 'x' }))).toBeNull()
    expect(sessionAuthTime('not-a-jwt')).toBeNull()
  })
})

describe('checkDeleteRequest', () => {
  it('확인 문구 + 이 세션이 15분 안에 인증됐으면 허용', () => {
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, sessionAuthAt: ago(5), now: NOW })).toBe('ok')
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, sessionAuthAt: ago(15), now: NOW })).toBe('ok')
  })
  it('확인 문구가 없거나 다르면 거부', () => {
    expect(checkDeleteRequest({ confirm: undefined, sessionAuthAt: ago(1), now: NOW })).toBe('confirm_required')
    expect(checkDeleteRequest({ confirm: 'yes', sessionAuthAt: ago(1), now: NOW })).toBe('confirm_required')
  })
  it('오래된 세션·정보 없음·미래 시각은 다시 로그인 요구', () => {
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, sessionAuthAt: ago(16), now: NOW })).toBe('reauth_required')
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, sessionAuthAt: null, now: NOW })).toBe('reauth_required')
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, sessionAuthAt: ago(-10), now: NOW })).toBe('reauth_required')
  })
})
