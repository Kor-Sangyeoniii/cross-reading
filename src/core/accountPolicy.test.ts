import { describe, expect, it } from 'vitest'
import { checkDeleteRequest, DELETE_CONFIRM } from './accountPolicy'

const NOW = new Date('2026-10-08T12:00:00Z')
const ago = (min: number) => new Date(NOW.getTime() - min * 60000).toISOString()

describe('checkDeleteRequest', () => {
  it('확인 문구 + 15분 안 로그인이면 허용', () => {
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, lastSignInAt: ago(5), now: NOW })).toBe('ok')
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, lastSignInAt: ago(15), now: NOW })).toBe('ok')
  })
  it('확인 문구가 없거나 다르면 거부', () => {
    expect(checkDeleteRequest({ confirm: undefined, lastSignInAt: ago(1), now: NOW })).toBe('confirm_required')
    expect(checkDeleteRequest({ confirm: 'yes', lastSignInAt: ago(1), now: NOW })).toBe('confirm_required')
  })
  it('오래된 로그인·정보 없음·이상한 값은 다시 로그인 요구', () => {
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, lastSignInAt: ago(16), now: NOW })).toBe('reauth_required')
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, lastSignInAt: null, now: NOW })).toBe('reauth_required')
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, lastSignInAt: 'not-a-date', now: NOW })).toBe('reauth_required')
    expect(checkDeleteRequest({ confirm: DELETE_CONFIRM, lastSignInAt: ago(-10), now: NOW })).toBe('reauth_required')
  })
})
