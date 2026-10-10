import { describe, expect, it } from 'vitest'
import { computeSaju, toSolarDate, type BirthInput } from './saju'
import { natalReadings, personalLuck, personalPeriods, readPillar, TEN_GOD_READING } from './personalReading'

// Synthetic dates only. No account data or operational calls.
const birth: BirthInput = { year: 1990, month: 6, day: 15, calendar: 'solar', time: { hour: 5, minute: 30 } }
const chart = computeSaju(birth)

describe('personal readings', () => {
  it('explains all ten gods with concrete prompts', () => {
    expect(Object.keys(TEN_GOD_READING)).toHaveLength(10)
    for (const reading of Object.values(TEN_GOD_READING)) {
      expect(reading.meaning).toContain('관계예요')
      expect(reading.example.length).toBeGreaterThan(30)
      expect(reading.example).not.toMatch(/점수|반드시|확실히|대박/)
    }
  })
  it('uses natal day master rather than the transit day master', () => {
    const target = { heavenlyStem: '갑', earthlyBranch: '인' } as const
    expect(readPillar({ ...chart, dayMaster: { ...chart.dayMaster, stem: '갑' } }, target)).toEqual({ label: '갑인', stemGod: '비견', branchGod: '비견' })
    expect(readPillar({ ...chart, dayMaster: { ...chart.dayMaster, stem: '을' } }, target)).toEqual({ label: '갑인', stemGod: '겁재', branchGod: '겁재' })
  })
  it('omits the day stem and unknown hour from natal interpretation', () => {
    expect(natalReadings(chart)).toHaveLength(7)
    const unknown = natalReadings(computeSaju({ ...birth, time: null }))
    expect(unknown).toHaveLength(5)
    expect(unknown.some((r) => r.source.startsWith('시주') || r.source === '일주 천간')).toBe(false)
  })
  it('uses solar terms for year/month, and changes day at midnight', () => {
    const before = personalPeriods(chart, '2024-02-03'), after = personalPeriods(chart, '2024-02-05')
    expect(before.year.label).toBe('계묘')
    expect(after.year.label).toBe('갑진')
    expect(before.month.label).not.toBe(after.month.label)
    expect(personalPeriods(chart, '2024-02-04').yearBoundary).toBe(true)
    expect(personalPeriods(chart, '2024-02-04').monthBoundary).toBe(true)
    expect(personalPeriods(chart, '2024-02-05').yearBoundary).toBe(false)
    expect(personalPeriods(chart, '2024-02-06').day.label).not.toBe(after.day.label)
  })
  it('accepts future period dates but rejects impossible or out-of-range dates safely', () => {
    expect(personalPeriods(chart, '2099-06-15').day.label).toHaveLength(2)
    for (const date of ['2024-02-30', '', '1899-01-01', '2101-01-01']) {
      expect(() => personalPeriods(chart, date)).toThrow()
      try { personalPeriods(chart, date) } catch (e) { expect((e as Error).message).not.toContain(date || 'undefined') }
    }
  })
  it('does not infer direction convention or unknown birth time', () => {
    expect(personalLuck(birth, null, '2026-10-10').available).toBe(false)
    const missingTime = personalLuck({ ...birth, time: null }, 'male', '2026-10-10')
    expect(missingTime.available).toBe(false)
    if (!missingTime.available) expect(missingTime.reason).toContain('출생시간')
  })
  it('uses opposite directions for the two traditional conventions and ten cycles', () => {
    const male = personalLuck(birth, 'male', '2026-10-10'), female = personalLuck(birth, 'female', '2026-10-10')
    expect(male.available && female.available).toBe(true)
    if (!male.available || !female.available) throw new Error('Expected synthetic luck calculation')
    expect(male.forward).toBe(true)
    expect(female.forward).toBe(false)
    expect(male.pillars).toHaveLength(10)
    expect(male.pillars[1].age - male.pillars[0].age).toBe(10)
    expect(male.pillars[0].endAge - male.pillars[0].age).toBe(9)
    expect(male.approximateCurrent).toBeGreaterThanOrEqual(0)
    const beforeBirth = personalLuck(birth, 'male', '1989-06-15')
    expect(beforeBirth.available && beforeBirth.approximateCurrent).toBe(-1)
  })
  it('converts lunar input consistently before calculating the current age', () => {
    const lunar: BirthInput = { ...birth, year: 1992, month: 9, day: 29, calendar: 'lunar' }
    const [year, month, day] = toSolarDate(lunar).split('-').map(Number)
    expect(personalLuck(lunar, 'female', '2026-10-10')).toEqual(personalLuck({ ...lunar, year, month, day, calendar: 'solar' }, 'female', '2026-10-10'))
  })
})
