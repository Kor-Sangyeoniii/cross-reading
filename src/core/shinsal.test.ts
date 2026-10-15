import { describe, expect, it } from 'vitest'
import { computeSaju, type PillarKey, type SajuChart } from './saju'
import {
  analyzeShinsal,
  DEFAULT_SHINSAL_OPTIONS,
  SHINSAL,
  togetherReadings,
} from './shinsal'
import { personalPeriods } from './personalReading'

// Synthetic births and deliberately constructed rule fixtures; never account data.
const birth = {
  year: 1992,
  month: 1,
  day: 12,
  calendar: 'solar' as const,
  time: { hour: 8, minute: 0 },
}
const base = computeSaju(birth)
function fixture(pillars: Partial<SajuChart['pillars']>) {
  const result = structuredClone(base)
  result.pillars = { ...result.pillars, ...pillars }
  result.dayMaster.stem = result.pillars.day[0]
  result.cells = result.cells.map((c) => ({
    ...c,
    stem: { ...c.stem, ko: result.pillars[c.pillar]![0] },
    branch: { ...c.branch, ko: result.pillars[c.pillar]![1] },
  }))
  return result
}
const namesAt = (chart: SajuChart, position: PillarKey) =>
  analyzeShinsal(chart)
    .natalHits.filter((h) => h.position === position)
    .map((h) => h.name)

describe('position-aware shinsal calculation', () => {
  it('finds the actual day noble + hour white tiger combination and explains both bases', () => {
    expect(base.pillars.day).toBe('정해')
    expect(base.pillars.hour).toBe('갑진')
    const result = analyzeShinsal(base)
    const pair = result.together.find(
      (p) => p.a === '천을귀인' && p.b === '백호대살',
    )!
    expect(pair.left.position).toBe('day')
    expect(pair.right.position).toBe('hour')
    expect(pair.left.basis).toContain('내 일간 정')
    expect(pair.right.basis).toContain('시주 갑진')
    expect(pair.right.basis).toContain('확장 방식')
    const dayOnly = analyzeShinsal(base, {
      ...DEFAULT_SHINSAL_OPTIONS,
      baekhoScope: 'day',
    })
    expect(dayOnly.natalHits.some((h) => h.name === '백호대살')).toBe(false)
    expect(dayOnly.together.some((p) => p.b === '백호대살')).toBe(false)
  })
  it.each([
    ['갑자', '정축', '기미'],
    ['을축', '갑자', '경신'],
    ['병인', '을해', '정유'],
    ['정묘', '을해', '정유'],
    ['무진', '정축', '기미'],
    ['기사', '갑자', '경신'],
    ['경오', '정축', '기미'],
    ['신미', '갑인', '병오'],
    ['임신', '을묘', '정사'],
    ['계유', '을묘', '정사'],
  ])('checks both noble branches for day %s', (day, first, second) => {
    const c = fixture({ day, hour: first, year: second })
    expect(namesAt(c, 'hour')).toContain('천을귀인')
    expect(namesAt(c, 'year')).toContain('천을귀인')
  })
  it.each([
    ['갑자', '기사'],
    ['을축', '경오'],
    ['병인', '경신'],
    ['정묘', '신유'],
    ['무진', '경신'],
    ['기사', '신유'],
    ['경오', '을해'],
    ['신미', '갑자'],
    ['임신', '갑인'],
    ['계유', '을묘'],
  ])('checks literary branch for %s', (day, hour) => {
    expect(namesAt(fixture({ day, hour }), 'hour')).toContain('문창귀인')
  })
  it('distinguishes branch 申 from stem 辛 in heavenly virtue', () => {
    expect(namesAt(fixture({ month: '정묘', hour: '갑신' }), 'hour')).toContain(
      '천덕귀인',
    )
    expect(
      namesAt(fixture({ month: '정묘', hour: '신유' }), 'hour'),
    ).not.toContain('천덕귀인')
    expect(namesAt(fixture({ month: '기사', hour: '신유' }), 'hour')).toContain(
      '천덕귀인',
    )
    expect(
      namesAt(fixture({ month: '기사', hour: '갑신' }), 'hour'),
    ).not.toContain('천덕귀인')
  })
  it.each([
    ['갑인', '정축'],
    ['정묘', '갑신'],
    ['무진', '임자'],
    ['기사', '신유'],
    ['경오', '을해'],
    ['신미', '갑자'],
    ['임신', '계축'],
    ['계유', '갑인'],
    ['갑술', '병자'],
    ['을해', '을축'],
    ['병자', '기사'],
    ['정축', '경자'],
  ])('checks mixed heavenly virtue month %s', (month, hour) => {
    expect(namesAt(fixture({ month, hour }), 'hour')).toContain('천덕귀인')
  })
  it.each([
    ['갑인', '병자'],
    ['경오', '병자'],
    ['갑술', '병자'],
    ['기사', '경자'],
    ['계유', '경자'],
    ['정축', '경자'],
    ['임신', '임자'],
    ['병자', '임자'],
    ['무진', '임자'],
    ['을해', '갑자'],
    ['정묘', '갑자'],
    ['신미', '갑자'],
  ])('checks month virtue for %s', (month, hour) => {
    expect(namesAt(fixture({ month, hour }), 'hour')).toContain('월덕귀인')
  })
  it.each(['갑진', '을미', '병술', '정축', '무진', '임술', '계축'])(
    'recognizes white tiger %s without generalizing to other pillars',
    (label) => {
      const result = analyzeShinsal(fixture({ hour: label, day: '갑자' }))
      expect(
        result.natalHits.some(
          (h) => h.name === '백호대살' && h.position === 'hour',
        ),
      ).toBe(true)
      expect(
        result.natalHits.some(
          (h) => h.name === '백호대살' && h.position === 'day',
        ),
      ).toBe(false)
    },
  )
  it('applies stated four-day strong and yang-only blade conventions', () => {
    for (const day of ['경진', '경술', '임진', '무술'])
      expect(namesAt(fixture({ day }), 'day')).toContain('괴강살')
    expect(namesAt(fixture({ day: '임술' }), 'day')).not.toContain('괴강살')
    expect(
      namesAt(fixture({ day: '을축', hour: '병인' }), 'hour'),
    ).not.toContain('양인살')
    for (const [day, hour] of [
      ['갑자', '을묘'],
      ['병인', '병오'],
      ['무진', '병오'],
      ['경오', '정유'],
      ['임신', '갑자'],
    ])
      expect(namesAt(fixture({ day, hour }), 'hour')).toContain('양인살')
  })
  it('uses the chosen natal year/day branch as the twelve-spirit anchor', () => {
    const c = fixture({
      year: '임신',
      day: '정해',
      hour: '병인',
      month: '기사',
    })
    const year = analyzeShinsal(c)
    expect(year.natalHits.find((h) => h.name === '역마살')?.position).toBe(
      'hour',
    )
    expect(year.natalHits.find((h) => h.name === '겁살')?.position).toBe(
      'month',
    )
    const day = analyzeShinsal(c, {
      ...DEFAULT_SHINSAL_OPTIONS,
      twelveBase: 'day',
    })
    expect(day.natalHits.find((h) => h.name === '역마살')?.position).toBe(
      'month',
    )
    expect(day.natalHits.find((h) => h.name === '겁살')?.position).toBe('year')
  })
  it('has all 12 cyclic placements for each of the four anchors', () => {
    for (const year of ['갑인', '기사', '임신', '을해']) {
      const names = new Set<string>()
      for (const label of [
        '갑자',
        '을축',
        '병인',
        '정묘',
        '무진',
        '기사',
        '경오',
        '신미',
        '임신',
        '계유',
        '갑술',
        '을해',
      ]) {
        const hits = analyzeShinsal(
          fixture({ year, hour: label }),
        ).natalHits.filter(
          (h) => h.position === 'hour' && h.basis.startsWith('내 연지'),
        )
        expect(hits).toHaveLength(1)
        names.add(hits[0].name)
      }
      expect(names.size).toBe(12)
    }
  })
  it('does not invent an unknown hour and marks uncertain anchors and targets', () => {
    const unknown = computeSaju({ ...birth, time: null })
    expect(
      analyzeShinsal(unknown).natalHits.some((h) => h.position === 'hour'),
    ).toBe(false)
    const boundary = computeSaju({
      ...birth,
      year: 2024,
      month: 2,
      day: 4,
      time: null,
    })
    expect(boundary.yearMonthUncertain).toBe(true)
    const hits = analyzeShinsal(boundary).natalHits
    expect(
      hits
        .filter((h) => h.position === 'month' || h.position === 'year')
        .every((h) => h.uncertain),
    ).toBe(true)
    expect(
      hits
        .filter((h) => h.basis.startsWith('내 연지'))
        .every((h) => h.uncertain),
    ).toBe(true)
    expect(
      hits
        .filter((h) => h.position === 'day' && h.basis.startsWith('내 일간'))
        .every((h) => !h.uncertain),
    ).toBe(true)
  })
  it('retains natal hits across dates and anchors transit lookup in birth data', () => {
    const original = structuredClone(base)
    const first = analyzeShinsal(base, undefined, {
      label: '을유',
      title: '일운',
    })
    const second = analyzeShinsal(base, undefined, {
      label: '병술',
      title: '일운',
      uncertain: true,
    })
    expect(first.natalHits).toEqual(second.natalHits)
    expect(
      first.transitHits.find((h) => h.name === '천을귀인')?.basis,
    ).toContain('내 일간 정')
    expect(second.transitHits.some((h) => h.name === '천을귀인')).toBe(false)
    expect(second.transitHits.every((h) => h.uncertain)).toBe(true)
    expect(base).toEqual(original)
    for (const date of ['2026-10-10', '2026-10-11']) {
      const periods = personalPeriods(base, date)
      for (const mode of ['day', 'month', 'year'] as const)
        expect(
          analyzeShinsal(base, undefined, {
            label: periods[mode].label,
            title: mode,
          }).natalHits,
        ).toEqual(first.natalHits)
    }
  })
  it('finds real stem/branch relations, without treating shinsal co-occurrence as a relation', () => {
    const c = fixture({
      day: '정해',
      hour: '갑진',
      month: '을사',
      year: '임신',
    })
    const r = analyzeShinsal(c)
    expect(r.connections.some((x) => x.title === '일주 ↔ 연주 · 천간합')).toBe(
      true,
    )
    expect(r.connections.some((x) => x.title === '일주 ↔ 월주 · 지지충')).toBe(
      true,
    )
    expect(r.connections.some((x) => x.title.startsWith('시주 ↔ 일주'))).toBe(
      false,
    )
    const transit = analyzeShinsal(c, undefined, {
      label: '기유',
      title: '일운',
    })
    expect(
      transit.connections
        .filter((x) => x.transit)
        .some((x) => x.title === '시주 ↔ 일운 · 천간합'),
    ).toBe(true)
    expect(
      transit.connections
        .filter((x) => x.transit)
        .some((x) => x.title === '시주 ↔ 일운 · 지지육합'),
    ).toBe(true)
    expect(togetherReadings([])).toEqual([])
    expect(
      togetherReadings(r.natalHits.filter((h) => h.name === '천을귀인')),
    ).toEqual([])
  })
  it('rejects invalid transit data with a fixed error and describes all 19 supported names', () => {
    for (const label of ['private-input', '', '갑축'])
      expect(() =>
        analyzeShinsal(base, undefined, { label, title: '일운' }),
      ).toThrow('간지 정보를 확인해 주세요.')
    expect(Object.keys(SHINSAL)).toHaveLength(19)
    for (const entry of Object.values(SHINSAL)) {
      expect(entry.meaning.length).toBeGreaterThan(20)
      expect(entry.example.length).toBeGreaterThan(30)
      expect(JSON.stringify(entry)).not.toMatch(/점수|반드시|확실히/)
    }
  })
})
