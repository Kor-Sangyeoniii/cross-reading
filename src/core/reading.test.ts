import { describe, expect, it } from 'vitest'
import { HEAVENLY_STEMS } from 'manseryeok'
import { computeSaju } from './saju'
import { CONTROLS, dailyReading, ELEMENTS, elementDetail, elementRelation, explainCompatFact, GENERATES } from './reading'
import { comparePair } from './compat'
import { summarizeProfile } from './profileSummary'
const chart = computeSaju({ year: 1990, month: 6, day: 15, calendar: 'solar', time: null }, new Date('2026-10-10T00:00:00Z'))

describe('오행 흐름과 날짜별 풀이', () => {
  it('상생·상극의 25가지 방향을 구별한다', () => {
    for (const a of ELEMENTS) for (const b of ELEMENTS) {
      const expected = a === b ? 'same' : GENERATES[a] === b ? 'generates' : GENERATES[b] === a ? 'receives' : CONTROLS[a] === b ? 'controls' : 'controlled'
      expect(elementRelation(a, b)).toBe(expected)
    }
    expect(ELEMENTS.map((e) => GENERATES[e])).toEqual(['화', '토', '금', '수', '목'])
    expect(ELEMENTS.map((e) => CONTROLS[e])).toEqual(['토', '금', '수', '목', '화'])
  })
  it('실제 날짜 일진을 계산하고 날짜 선택에 따라 바뀐다', () => {
    const today = dailyReading(chart, '2026-10-10')
    const reference = computeSaju({ year: 2026, month: 10, day: 10, calendar: 'solar', time: { hour: 12, minute: 0 } }, new Date('2026-10-11T00:00:00Z'))
    expect(today.element).toBe(reference.dayMaster.element)
    expect(today.relation).toBe(elementRelation(chart.dayMaster.element, today.element))
    expect(new Set(Array.from({ length: 10 }, (_, i) => dailyReading(chart, `2026-10-${10 + i}`).element)).size).toBe(5)
    expect(today.notes).toContain('출생시간을 몰라 시주는 제외했어요.')
    expect(dailyReading(chart, '2027-01-01').date).toBe('2027-01-01')
  })
  it('잘못된 날짜·범위·형식과 윤일을 검사하며 원문 입력을 오류에 넣지 않는다', () => {
    for (const date of ['2026-02-29', '2026-13-01', '1899-01-01', '2101-01-01', '2026-1-1', 'private-input']) {
      expect(() => dailyReading(chart, date)).toThrow()
      try { dailyReading(chart, date) } catch (e) { expect((e as Error).message).not.toContain(date) }
    }
    expect(dailyReading(chart, '2024-02-29').date).toBe('2024-02-29')
  })
  it('개수를 성격 강도로 쓰지 않고 모르는 시주를 안내한다', () => {
    const detail = elementDetail('목', { 목: 0, 화: 2, 토: 2, 금: 1, 수: 1 }, false)
    expect(detail.basis).toContain('6글자 중 목은 0글자')
    expect(detail.basis).toContain('시주 두 글자는 제외')
    expect(detail.basis).toContain('능력 부족을 뜻하지 않아요')
    expect(detail.example).toContain('10분')
  })
  it('모든 일간·궁합 규칙에 근거와 구체적인 예시가 있다', () => {
    for (const stem of HEAVENLY_STEMS) {
      const summary = summarizeProfile({ ...chart, dayMaster: { ...chart.dayMaster, stem } })
      for (const detail of Object.values(summary.details)) {
        expect(detail.basis.length).toBeGreaterThan(30)
        expect(detail.example.length).toBeGreaterThan(30)
      }
    }
    const codes = ['stem-combine', 'same-element', 'generates', 'controls', 'branch-combine', 'branch-clash', 'complement', 'group-strong', 'group-missing', 'mbti-EI', 'mbti-SN', 'mbti-TF', 'mbti-JP']
    for (const code of codes) expect(explainCompatFact(code)?.example.length).toBeGreaterThan(30)
    const pair = comparePair({ id: 'fake-a', nickname: '가상 A', chart, mbti: 'ENTJ' }, { id: 'fake-b', nickname: '가상 B', chart, mbti: 'ISFP' })
    for (const fact of pair.facts) expect(explainCompatFact(fact.code)).toBeDefined()
    expect(explainCompatFact('unknown')).toBeUndefined()
  })
  it('동률 오행을 모두 설명하고 결핍·확정 판정·점수를 만들지 않는다', () => {
    const summary = summarizeProfile({ ...chart, elements: { 목: 2, 화: 2, 토: 1, 금: 1, 수: 0 } })
    expect(summary.traits[summary.traits.length - 1]).toContain('시작하고 성장')
    expect(summary.traits[summary.traits.length - 1]).toContain('드러내고 표현')
    const text = JSON.stringify({ summary, daily: dailyReading(chart, '2026-10-10') })
    expect(text).not.toMatch(/\d+점|점수|반드시|무조건|운명|MBTI (테스트|검사|결과)/)
  })
})
