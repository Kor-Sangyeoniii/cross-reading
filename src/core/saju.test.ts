import { describe, expect, it } from 'vitest'
import { computeSaju, SajuInputError, type BirthInput } from './saju'

// 모든 날짜는 라이브러리 문서 예시 또는 임의의 가짜 값이다 (AGENTS.md P1).
const NOW = new Date(2026, 9, 8)
const solar = (y: number, m: number, d: number, time: BirthInput['time']): BirthInput => ({
  year: y, month: m, day: d, calendar: 'solar', time,
})

describe('computeSaju', () => {
  it('알려진 날짜의 원국 (manseryeok 문서 예시)', () => {
    const r = computeSaju(solar(1992, 10, 24, { hour: 5, minute: 30 }), NOW)
    expect(r.pillars).toEqual({ year: '임신', month: '경술', day: '계유', hour: '을묘' })
    expect(r.dayMaster).toEqual({ stem: '계', element: '수', yinYang: '음', hanja: '癸水', label: '계수(癸水)' })
    expect(r.pillarsHanja).toEqual({ year: '壬申', month: '庚戌', day: '癸酉', hour: '乙卯' })
    expect(r.tenGods.year).toEqual({ stem: '겁재', branch: '정인' })
    expect(r.tenGods.day).toEqual({ branch: '편인' })
    expect(r.tenGods.hour).toEqual({ stem: '식신', branch: '식신' })
    expect(r.hourKnown).toBe(true)
    expect(Object.values(r.elements).reduce((a, b) => a + b, 0)).toBe(8)
    expect(r.cells.map((c) => c.title)).toEqual(['시주', '일주', '월주', '연주'])
    expect(r.cells[1].stem).toEqual({ ko: '계', hanja: '癸', element: '수', yinYang: '음', tenGod: '일간' })
    expect(r.cells[0].stem).toEqual({ ko: '을', hanja: '乙', element: '목', yinYang: '음', tenGod: '식신' })
    expect(r.cells[3].branch).toEqual({ ko: '신', hanja: '申', element: '금', yinYang: '양', tenGod: '정인' })
  })

  it('lunar-javascript 교차 검증 사례와 일치', () => {
    const r = computeSaju(solar(1990, 5, 15, { hour: 14, minute: 30 }), NOW)
    expect(r.pillars).toEqual({ year: '경오', month: '신사', day: '경진', hour: '계미' })
  })

  it('음력 입력은 같은 양력 날짜와 결과가 같다', () => {
    const lunar = computeSaju({ year: 1992, month: 9, day: 29, calendar: 'lunar', time: { hour: 5, minute: 30 } }, NOW)
    expect(lunar.pillars).toEqual({ year: '임신', month: '경술', day: '계유', hour: '을묘' })
  })

  it('윤달 입력을 지원하고, 없는 윤달은 오류', () => {
    const leap = computeSaju({ year: 2023, month: 2, day: 1, calendar: 'lunar', isLeapMonth: true, time: null }, NOW)
    expect(leap.pillars.day).toBe('기묘')
    expect(() =>
      computeSaju({ year: 2024, month: 2, day: 1, calendar: 'lunar', isLeapMonth: true, time: null }, NOW),
    ).toThrow(SajuInputError)
  })

  it('출생시간을 모르면 시주 없이 6글자로 센다', () => {
    const r = computeSaju(solar(1992, 10, 24, null), NOW)
    expect(r.pillars.hour).toBeNull()
    expect(r.pillarsHanja.hour).toBeNull()
    expect(r.tenGods.hour).toBeNull()
    expect(r.cells.map((c) => c.pillar)).toEqual(['day', 'month', 'year'])
    expect(r.hourKnown).toBe(false)
    expect(Object.values(r.elements).reduce((a, b) => a + b, 0)).toBe(6)
    expect(r.yearMonthUncertain).toBe(false)
  })

  it('입춘 당일·시간 모름이면 연·월주 불확실 표시', () => {
    expect(computeSaju(solar(2024, 2, 4, null), NOW).yearMonthUncertain).toBe(true)
  })

  it('절기(경칩) 당일·시간 모름이면 월주 불확실 표시', () => {
    expect(computeSaju(solar(2024, 3, 5, null), NOW).yearMonthUncertain).toBe(true)
  })

  it('시간을 알면 경계일이어도 불확실 표시 없음', () => {
    expect(computeSaju(solar(2024, 2, 4, { hour: 9, minute: 0 }), NOW).yearMonthUncertain).toBe(false)
  })

  it('존재하지 않는 날짜·미래 날짜·잘못된 시간은 오류', () => {
    expect(() => computeSaju(solar(2023, 2, 30, null), NOW)).toThrow(SajuInputError)
    expect(() => computeSaju(solar(2027, 1, 1, null), NOW)).toThrow(SajuInputError)
    expect(() => computeSaju(solar(2026, 12, 1, null), NOW)).toThrow(SajuInputError)
    expect(() => computeSaju(solar(1990, 1, 1, { hour: 24, minute: 0 }), NOW)).toThrow(SajuInputError)
  })
})
