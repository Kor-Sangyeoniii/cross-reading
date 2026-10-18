import { describe, expect, it } from 'vitest'
import { computeSaju } from './saju'
import { lifeReading, topicWeight } from './lifeReading'
import { personalPeriods } from './personalReading'
const birth = {
  year: 1992,
  month: 1,
  day: 21,
  calendar: 'solar' as const,
  time: { hour: 12, minute: 0 },
}
describe('transparent topic indices', () => {
  it('calculates published weights, rounds only the final blend, and preserves chart', () => {
    const chart = computeSaju(birth),
      before = JSON.stringify(chart)
    const period = personalPeriods(chart, '2026-10-18').day
    for (const area of lifeReading(chart, period)) {
      const sum = area.contributions.reduce(
        (n, s) => n + topicWeight(s.god, area.id),
        0,
      )
      const base = (sum / (2 * area.contributions.length)) * 100
      const transit =
        ((topicWeight(period.stemGod, area.id) +
          topicWeight(period.branchGod, area.id)) /
          4) *
        100
      expect(area.score).toBe(Math.round(base * 0.7 + transit * 0.3))
      expect(area.contributions).toHaveLength(7)
      expect(area.score).toBeGreaterThanOrEqual(50)
      expect(area.score).toBeLessThanOrEqual(100)
    }
    expect(JSON.stringify(chart)).toBe(before)
  })
  it('uses actual month stem and day branch, omitting unknown hour', () => {
    const chart = computeSaju({ ...birth, time: null })
    const areas = lifeReading(chart)
    expect(areas.find((a) => a.id === 'career')?.source.god).toBe(
      chart.tenGods.month.stem,
    )
    expect(areas.find((a) => a.id === 'love')?.source.god).toBe(
      chart.tenGods.day.branch,
    )
    for (const area of areas) {
      expect(area.contributions).toHaveLength(5)
      expect(area.contributions.some((s) => s.position === 'hour')).toBe(false)
      expect(area.transit).toBeNull()
      expect(area.periodExplanation).toBeNull()
    }
  })
  it('changes period context and indices for different actual dates', () => {
    const chart = computeSaju(birth)
    const results = Array.from({ length: 10 }, (_, i) =>
      lifeReading(
        chart,
        personalPeriods(chart, `2026-10-${String(i + 10)}`).day,
      )
        .map((a) => a.score)
        .join(','),
    )
    expect(new Set(results).size).toBeGreaterThan(1)
  })
})
