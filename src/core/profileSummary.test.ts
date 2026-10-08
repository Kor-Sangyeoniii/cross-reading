import { describe, expect, it } from 'vitest'
import { HEAVENLY_STEMS } from 'manseryeok'
import { computeSaju, type SajuChart } from './saju'
import { PROFILE_DISCLAIMER, summarizeProfile } from './profileSummary'

// 가짜 생년월일만 쓴다 (AGENTS.md P1).
const NOW = new Date(2026, 9, 8)

describe('summarizeProfile', () => {
  it('1992-10-24 05:30 (계수 일간) 예시', () => {
    const s = summarizeProfile(computeSaju({ year: 1992, month: 10, day: 24, calendar: 'solar', time: { hour: 5, minute: 30 } }, NOW))
    expect(s.headline).toBe('빗물처럼 조용히 스며드는 사람')
    expect(s.dayMasterImage).toBe('계수(癸水) · 빗물과 이슬')
    expect(s.keywords).toEqual(['지혜', '감성', '공감'])
    expect(s.traits[s.traits.length - 1]).toContain('쇠(금) 기운이 가장 많아')
    expect(s.conversationTips.some((t) => t.includes('불(화) 기운이 적은 편'))).toBe(true)
    expect(s.notes).toEqual([])
    expect(s.disclaimer).toBe(PROFILE_DISCLAIMER)
  })

  it('10가지 일간 모두 문구가 있고, 키워드는 3개', () => {
    for (const stem of HEAVENLY_STEMS) {
      const fake = { dayMaster: { stem, label: stem }, elements: { 목: 2, 화: 2, 토: 2, 금: 1, 수: 1 }, hourKnown: true, yearMonthUncertain: false } as unknown as SajuChart
      const s = summarizeProfile(fake)
      expect(s.keywords).toHaveLength(3)
      expect(s.headline.length).toBeGreaterThan(0)
    }
  })

  it('시간 모름·절기 경계일 안내', () => {
    const s = summarizeProfile(computeSaju({ year: 2024, month: 2, day: 4, calendar: 'solar', time: null }, NOW))
    expect(s.notes).toHaveLength(2)
  })

  it('단정·점수 표현이 없다', () => {
    for (const stem of HEAVENLY_STEMS) {
      const fake = { dayMaster: { stem, label: stem }, elements: { 목: 0, 화: 3, 토: 2, 금: 1, 수: 2 }, hourKnown: true, yearMonthUncertain: false } as unknown as SajuChart
      const text = JSON.stringify(summarizeProfile(fake))
      expect(text).not.toMatch(/\d+점|점수|반드시|무조건|운명/)
    }
  })
})
