import { describe, expect, it } from 'vitest'
import { comparePair, DISCLAIMER, groupCompat, type CompatMember, type Mbti } from './compat'
import { computeSaju } from './saju'

// 모든 날짜·닉네임은 가짜 데이터다 (AGENTS.md P1). 일주는 manseryeok으로 확인한 값.
const NOW = new Date(2026, 9, 8)
const member = (id: string, date: string, mbti: Mbti | null = null, time = true): CompatMember => {
  const [year, month, day] = date.split('-').map(Number)
  return {
    id,
    nickname: id,
    mbti,
    chart: computeSaju({ year, month, day, calendar: 'solar', time: time ? { hour: 12, minute: 0 } : null }, NOW),
  }
}
const codes = (facts: { code: string }[]) => facts.map((f) => f.code)

describe('comparePair', () => {
  it('천간합(갑·기) + 목극토 차이 — 2000-01-07 갑자 / 2000-01-02 기미', () => {
    const r = comparePair(member('가', '2000-01-07'), member('나', '2000-01-02'))
    expect(codes(r.facts)).toContain('stem-combine')
    expect(codes(r.facts)).toContain('controls')
    expect(codes(r.facts)).not.toContain('branch-clash')
  })

  it('일지 충(자·오) — 2000-01-07 갑자 / 2000-01-01 무오', () => {
    const r = comparePair(member('가', '2000-01-07'), member('나', '2000-01-01'))
    expect(codes(r.facts)).toContain('branch-clash')
    expect(r.facts.find((f) => f.code === 'branch-clash')?.kind).toBe('difference')
  })

  it('일지 육합(묘·술) + 목생화 — 2000-03-10 정묘 / 2000-01-17 갑술', () => {
    const r = comparePair(member('가', '2000-03-10'), member('나', '2000-01-17'))
    expect(codes(r.facts)).toContain('branch-combine')
    const gen = r.facts.find((f) => f.code === 'generates')
    expect(gen?.text).toBe('나님의 나무(목) 기운이 가님의 불(화) 기운을 북돋는 관계예요.')
  })

  it('같은 오행 일간 — 2000-01-11 무진 / 2000-01-01 무오', () => {
    expect(codes(comparePair(member('가', '2000-01-11'), member('나', '2000-01-01')).facts)).toContain('same-element')
  })

  it('MBTI는 두 사람 모두 공개했을 때만 쓴다', () => {
    const both = comparePair(member('가', '2000-01-07', 'ENFP'), member('나', '2000-01-02', 'ISFJ'))
    expect(codes(both.facts)).toEqual(expect.arrayContaining(['mbti-EI', 'mbti-SN', 'mbti-TF', 'mbti-JP']))
    expect(both.facts.find((f) => f.code === 'mbti-EI')?.kind).toBe('difference')
    expect(both.facts.find((f) => f.code === 'mbti-TF')?.kind).toBe('match')
    expect(both.questions[0]).toBe('같이 뭘 할 때 서로 속도가 다르다고 느낀 적 있어?')

    const one = comparePair(member('가', '2000-01-07', 'ENFP'), member('나', '2000-01-02', null))
    expect(codes(one.facts).some((c) => c.startsWith('mbti-'))).toBe(false)
    expect(one.notes).toContain('MBTI 정보가 없는 분이 있어 사주만으로 봤어요.')
  })

  it('출생시간을 모르면 안내 문구를 붙인다', () => {
    const r = comparePair(member('가', '2000-01-07', null, false), member('나', '2000-01-02'))
    expect(r.notes).toContain('가님은 출생시간 없이 봤어요.')
  })

  it('질문은 최대 3개, 중복 없음', () => {
    const r = comparePair(member('가', '2000-01-07', 'ENFP'), member('나', '2000-01-01', 'ISTJ'))
    expect(r.questions.length).toBeLessThanOrEqual(3)
    expect(new Set(r.questions).size).toBe(r.questions.length)
  })
})

describe('groupCompat', () => {
  const four = [member('가', '2000-01-07'), member('나', '2000-01-02'), member('다', '2000-03-10'), member('라', '2000-01-17')]

  it('4명이면 6쌍을 비교하고 모임 질문을 먼저 준다', () => {
    const g = groupCompat(four)
    expect(g.memberCount).toBe(4)
    expect(g.pairs).toHaveLength(6)
    expect(g.questions[0]).toBe('우리 모임에서 각자 맡고 있는 역할이 뭐라고 생각해?')
    expect(Object.values(g.elements).reduce((a, b) => a + b, 0)).toBe(32)
    expect(g.facts[0].code).toBe('group-strong')
    expect(g.disclaimer).toBe(DISCLAIMER)
  })

  it('2명도 가능, 1명·5명은 거부', () => {
    expect(groupCompat(four.slice(0, 2)).pairs).toHaveLength(1)
    expect(() => groupCompat(four.slice(0, 1))).toThrow()
    expect(() => groupCompat([...four, member('마', '2000-01-06')])).toThrow()
  })

  it('결과에 점수·출생정보(간지·날짜)가 들어가지 않는다', () => {
    const json = JSON.stringify(groupCompat(four))
    expect(json).not.toMatch(/점수|score|\d+점/)
    for (const m of four) {
      expect(json).not.toContain(m.chart.pillars.day)
      expect(json).not.toContain(m.chart.pillarsHanja.day)
    }
    expect(json).not.toMatch(/2000/)
  })
})
