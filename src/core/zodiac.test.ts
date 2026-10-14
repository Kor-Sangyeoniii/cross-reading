import { describe, expect, it } from 'vitest'
import { computeSaju } from './saju'
import { zodiacPersona } from './zodiac'

describe('day-pillar guardian', () => {
  it('covers 60 actual consecutive pillars and twelve animals', () => {
    const pillars = new Set<string>(),
      animals = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const date = new Date(Date.UTC(1992, 0, 1 + i))
      const chart = computeSaju({
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        time: null,
        calendar: 'solar',
      })
      const p = zodiacPersona(chart)
      pillars.add(chart.pillars.day)
      animals.add(p.animal)
      expect(p.distribution.base).toBe(chart.dayMaster.element)
      if (chart.pillars.day === '병신') {
        expect(p.title).toBe('불꽃 원숭이')
        expect(p.fireMonkey).toBe(true)
      }
    }
    expect(pillars.size).toBe(60)
    expect(animals.size).toBe(12)
  })
  it('does not change the day animal or base form when only element counts change', () => {
    const chart = computeSaju({
      year: 1992,
      month: 1,
      day: 1,
      time: null,
      calendar: 'solar',
    })
    const before = zodiacPersona(chart)
    chart.elements = { 목: 1, 화: 2, 토: 1, 금: 1, 수: 1 }
    const after = zodiacPersona(chart)
    expect(after.title).toBe(before.title)
    expect(after.distribution.accent).toBe('화')
  })
})
