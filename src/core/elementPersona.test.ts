import { describe, expect, it } from 'vitest'
import {
  elementPersona,
  examplePersona,
  PERSONA_ELEMENTS,
} from './elementPersona'
import { computeSaju } from './saju'
describe('element persona uses day master and visible counts separately', () => {
  it('shows metal body with fire motif', () => {
    const p = examplePersona('금', '화')
    expect(p.base).toBe('금')
    expect(p.accent).toBe('화')
    expect(p.title).toBe('불꽃을 두른 금')
    expect(p.counts.화).toBe(4)
  })
  it('supports all five bases and 25 distinct pair names', () => {
    const names = new Set()
    for (const base of PERSONA_ELEMENTS)
      for (const accent of PERSONA_ELEMENTS)
        names.add(examplePersona(base, accent).title)
    expect(names.size).toBe(25)
  })
  it('does not invent a winner for tied counts', () => {
    const c = computeSaju({
      year: 1990,
      month: 6,
      day: 15,
      calendar: 'solar',
      time: null,
    })
    c.dayMaster.element = '금'
    c.elements = { 목: 1, 화: 2, 토: 0, 금: 2, 수: 1 }
    const p = elementPersona(c)
    expect(p.accent).toBeNull()
    expect(p.leaders).toEqual(['화', '금'])
    expect(p.total).toBe(6)
    expect(p.hourKnown).toBe(false)
  })
  it('retains uncertain boundary caveat and rejects invalid totals', () => {
    const c = computeSaju({
      year: 1990,
      month: 6,
      day: 15,
      calendar: 'solar',
      time: null,
    })
    c.yearMonthUncertain = true
    expect(elementPersona(c).uncertain).toBe(true)
    c.elements.화 += 1
    expect(() => elementPersona(c)).toThrow()
  })
  it('uses actual calculated day element, not most frequent as the body', () => {
    const c = computeSaju({
      year: 1990,
      month: 6,
      day: 15,
      calendar: 'solar',
      time: { hour: 12, minute: 0 },
    })
    const p = elementPersona(c)
    expect(p.base).toBe(c.dayMaster.element)
    expect(p.counts).toEqual(c.elements)
  })
})
