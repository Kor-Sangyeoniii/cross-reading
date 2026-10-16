import { describe, expect, it } from 'vitest'
import { computeSaju } from './saju'
import { readPillar } from './personalReading'
import { readingStory } from './readingStory'
import { zodiacPersona } from './zodiac'

const birth = {
  year: 1992,
  month: 1,
  day: 12,
  calendar: 'solar' as const,
  time: { hour: 8, minute: 0 },
}
const chart = computeSaju(birth)
describe('story reading without replacing calculated facts', () => {
  it('chooses the actual month stem, day branch and hour stem for each natal scene', () => {
    const work = readingStory(chart, { mode: 'natal' }, 'work')!
    const relation = readingStory(chart, { mode: 'natal' }, 'relationship')!
    const plan = readingStory(chart, { mode: 'natal' }, 'plan')!
    expect(work.god).toBe('편재')
    expect(work.personal).toContain('월주 천간 신')
    expect(relation.god).toBe('정관')
    expect(relation.personal).toContain('일주 지지 해')
    expect(plan.god).toBe('정인')
    expect(plan.personal).toContain('시주 천간 갑')
    expect(work.setting).not.toBe(relation.setting)
    expect(work.basis).toContain('음금')
  })
  it('has a complete, distinct two-choice story for all ten gods without using choices as a new calculation', () => {
    const original = structuredClone(chart)
    const gods = new Set(),
      settings = new Set()
    for (const stem of [
      '갑',
      '을',
      '병',
      '정',
      '무',
      '기',
      '경',
      '신',
      '임',
      '계',
    ] as const) {
      const reading = readPillar(chart, {
        heavenlyStem: stem,
        earthlyBranch: '자',
      })
      const s = readingStory(
        chart,
        { mode: 'day', reading, label: '2026-10-16' },
        'work',
      )!
      gods.add(s.god)
      settings.add(s.setting)
      expect(s.choices).toHaveLength(2)
      expect(s.choices[0].reply).not.toBe(s.choices[1].reply)
      expect(s.choices[0].label).not.toBe(s.choices[1].label)
      expect(s.personal).toContain('내 일간 정화')
      expect(JSON.stringify(s)).not.toMatch(/undefined|NaN/)
    }
    expect(gods.size).toBe(10)
    expect(settings.size).toBe(10)
    expect(chart).toEqual(original)
  })
  it('uses different context for daily, monthly, annual and decade stories', () => {
    const reading = readPillar(chart, {
      heavenlyStem: '갑',
      earthlyBranch: '자',
    })
    const stories = (['day', 'month', 'year', 'luck'] as const).map(
      (mode) =>
        readingStory(
          chart,
          { mode, reading, label: '합성 기간' },
          'relationship',
        )!,
    )
    expect(stories.every((s) => s.god === reading.branchGod)).toBe(true)
    expect(new Set(stories.map((s) => s.frame.invitation)).size).toBe(4)
    expect(new Set(stories.map((s) => s.basis)).size).toBe(4)
  })
  it('does not invent an unknown hour or an uncalculated period', () => {
    const unknown = computeSaju({ ...birth, time: null })
    expect(readingStory(unknown, { mode: 'natal' }, 'plan')).toBeNull()
    expect(
      readingStory(unknown, { mode: 'natal' }, 'relationship'),
    ).not.toBeNull()
    for (const mode of ['day', 'month', 'year', 'luck'] as const)
      expect(readingStory(chart, { mode }, 'work')).toBeNull()
  })
  it('marks uncertain inputs and changes the actual guide animal with the day branch', () => {
    const boundary = computeSaju({
      ...birth,
      year: 2024,
      month: 2,
      day: 4,
      time: null,
    })
    expect(readingStory(boundary, { mode: 'natal' }, 'work')?.note).toContain(
      '시간 경계',
    )
    const reading = readPillar(chart, {
      heavenlyStem: '갑',
      earthlyBranch: '자',
    })
    expect(
      readingStory(
        chart,
        { mode: 'month', reading, uncertain: true },
        'relationship',
      )?.uncertain,
    ).toBe(true)
    expect(zodiacPersona(chart).animal).toBe('돼지')
    expect(zodiacPersona(computeSaju({ ...birth, day: 13 })).animal).toBe('쥐')
  })
})
