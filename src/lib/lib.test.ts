import { describe, expect, it } from 'vitest'
import { detectInAppBrowser, kakaoOpenExternalUrl } from './inapp'
import { isAtLeast14, ProfileInputError, toProfileEdit, toProfileRow, type ProfileInput } from './profile'
import { rememberReturnTo, sanitizeReturnTo, takeReturnTo } from './redirect'
import { SajuInputError } from '../core/saju'

// 모든 값은 가짜 데이터다 (AGENTS.md P1).
const NOW = new Date(2026, 9, 8)

describe('detectInAppBrowser', () => {
  it('카카오톡 인앱 브라우저', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0'
    expect(detectInAppBrowser(ua)).toBe('kakaotalk')
  })
  it('인스타그램·안드로이드 웹뷰는 기타 인앱', () => {
    expect(detectInAppBrowser('Mozilla/5.0 ... Instagram 300.0')).toBe('other')
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36')).toBe('other')
  })
  it('일반 사파리·크롬은 null', () => {
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1')).toBeNull()
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36')).toBeNull()
  })
  it('외부 브라우저 스킴은 주소를 인코딩한다', () => {
    expect(kakaoOpenExternalUrl('https://example.com/invite/a?b=1')).toBe(
      'kakaotalk://web/openExternal?url=https%3A%2F%2Fexample.com%2Finvite%2Fa%3Fb%3D1',
    )
  })
})

describe('returnTo', () => {
  it('같은 사이트 상대 경로만 허용', () => {
    expect(sanitizeReturnTo('/invite/abc')).toBe('/invite/abc')
    expect(sanitizeReturnTo('https://evil.example')).toBe('/')
    expect(sanitizeReturnTo('//evil.example')).toBe('/')
    expect(sanitizeReturnTo('/\\evil.example')).toBe('/')
    expect(sanitizeReturnTo('/a\nb')).toBe('/')
    expect(sanitizeReturnTo(null)).toBe('/')
  })
  it('저장 후 한 번만 꺼낸다', () => {
    const map = new Map<string, string>()
    const storage = {
      setItem: (k: string, v: string) => void map.set(k, v),
      getItem: (k: string) => map.get(k) ?? null,
      removeItem: (k: string) => void map.delete(k),
    }
    rememberReturnTo('/invite/abc', storage)
    expect(takeReturnTo(storage)).toBe('/invite/abc')
    expect(takeReturnTo(storage)).toBe('/')
  })
})

describe('toProfileRow', () => {
  const base: ProfileInput = {
    nickname: ' 지민 ',
    birth: { year: 1995, month: 3, day: 14, calendar: 'solar', time: null },
    mbti: null,
    consents: { age14OrOlder: true, terms: true, privacy: true, marketing: false },
  }

  it('정상 입력을 DB 행으로 바꾼다', () => {
    const row = toProfileRow('user-1', base, NOW)
    expect(row).toMatchObject({
      id: 'user-1', nickname: '지민', birth_hour: null, birth_minute: null, mbti: null,
      is_leap_month: false, age_14_confirmed: true, marketing_agreed_at: null, solar_birth_date: '1995-03-14',
    })
  })

  it('양력이면 윤달 표시를 무시한다', () => {
    const row = toProfileRow('u', { ...base, birth: { ...base.birth, isLeapMonth: true } }, NOW)
    expect(row.is_leap_month).toBe(false)
  })

  it('만 14세 미만·필수 동의 누락·잘못된 MBTI·빈 닉네임은 거부', () => {
    expect(() => toProfileRow('u', { ...base, consents: { ...base.consents, age14OrOlder: false } }, NOW)).toThrow(ProfileInputError)
    expect(() => toProfileRow('u', { ...base, consents: { ...base.consents, privacy: false } }, NOW)).toThrow(ProfileInputError)
    expect(() => toProfileRow('u', { ...base, mbti: 'XXXX' as never }, NOW)).toThrow(ProfileInputError)
    expect(() => toProfileRow('u', { ...base, nickname: '   ' }, NOW)).toThrow(ProfileInputError)
  })

  it('없는 날짜는 사주 검사에서 거부', () => {
    expect(() => toProfileRow('u', { ...base, birth: { ...base.birth, month: 2, day: 30 } }, NOW)).toThrow(SajuInputError)
  })
})

describe('양력 날짜·만 14세', () => {
  it('음력 입력은 양력 날짜로 저장한다 (manseryeok 문서 예시: 음력 1992-09-29 = 양력 1992-10-24)', () => {
    const row = toProfileRow('u', {
      nickname: '지민', mbti: null,
      birth: { year: 1992, month: 9, day: 29, calendar: 'lunar', time: null },
      consents: { age14OrOlder: true, terms: true, privacy: true, marketing: false },
    }, NOW)
    expect(row.solar_birth_date).toBe('1992-10-24')
  })
  it('한국 날짜 기준 생일 당일부터 만 14세', () => {
    const now = new Date('2026-10-08T00:30:00+09:00')
    expect(isAtLeast14('2012-10-08', now)).toBe(true)
    expect(isAtLeast14('2012-10-09', now)).toBe(false)
  })
  it('만 14세 미만 생년월일은 체크를 해도 거부', () => {
    expect(() => toProfileRow('u', {
      nickname: '지민', mbti: null,
      birth: { year: 2015, month: 1, day: 1, calendar: 'solar', time: null },
      consents: { age14OrOlder: true, terms: true, privacy: true, marketing: false },
    }, NOW)).toThrow(ProfileInputError)
  })
})

describe('toProfileEdit (정보 수정)', () => {
  const edit = { nickname: '새이름', birth: { year: 1995, month: 3, day: 14, calendar: 'solar' as const, time: null }, mbti: null }
  it('필수 동의 시각·연령 확인 칼럼을 보내지 않는다', () => {
    const row = toProfileEdit(edit, NOW)
    expect(row).not.toHaveProperty('terms_agreed_at')
    expect(row).not.toHaveProperty('privacy_agreed_at')
    expect(row).not.toHaveProperty('age_14_confirmed')
    expect(row).not.toHaveProperty('marketing_agreed_at')
    expect(row.nickname).toBe('새이름')
  })
  it('선택 동의는 지정했을 때만 바꾼다', () => {
    expect(toProfileEdit({ ...edit, marketing: false }, NOW).marketing_agreed_at).toBeNull()
    expect(toProfileEdit({ ...edit, marketing: true }, NOW).marketing_agreed_at).toBe(NOW.toISOString())
  })
  it('수정에서도 만 14세 미만 생년월일은 거부', () => {
    expect(() => toProfileEdit({ ...edit, birth: { ...edit.birth, year: 2015 } }, NOW)).toThrow(ProfileInputError)
  })
})
