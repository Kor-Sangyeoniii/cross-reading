import { describe, expect, it } from 'vitest'
import {
  comparePair,
  type CompatMember,
  type Mbti,
  type PairCompat,
} from './compat'
import { computeSaju } from './saju'
import { practicalCompat } from './practicalCompat'

function member(
  id: string,
  date: string,
  mbti: Mbti | null = null,
  known = true,
): CompatMember {
  const [year, month, day] = date.split('-').map(Number)
  return {
    id,
    nickname: id,
    mbti,
    chart: computeSaju({
      year,
      month,
      day,
      calendar: 'solar',
      time: known ? { hour: 12, minute: 0 } : null,
    }),
  }
}
const pair = (a: CompatMember, b: CompatMember) => comparePair(a, b)
describe('practical explanations from actual compatibility facts', () => {
  it('shows actual clash and control without deleting the simultaneous attraction or inventing roles', () => {
    const source = pair(
      member('가상 가', '2000-01-07'),
      member('가상 나', '2000-01-01'),
    )
    const before = JSON.stringify(source)
    const report = practicalCompat(source)
    expect(report.adjustments.map((c) => c.key)).toContain(
      'branch-clash:difference',
    )
    expect(report.adjustments.map((c) => c.key)).toContain(
      'controls:difference',
    )
    expect(report.cards[0].kind).toBe('difference')
    expect(
      report.cards.find((c) => c.key === 'branch-clash:difference')?.bases,
    ).toEqual(
      source.facts.filter((f) => f.code === 'branch-clash').map((f) => f.text),
    )
    const attractive = practicalCompat(
      pair(member('가상 가', '2000-01-07'), member('가상 나', '2000-01-02')),
    )
    expect(attractive.strengths.map((c) => c.key)).toContain(
      'stem-combine:match',
    )
    expect(attractive.adjustments.map((c) => c.key)).toContain(
      'controls:difference',
    )
    expect(JSON.stringify(source)).toBe(before)
  })
  it('changes scenes when the selected birth changes and never adds an absent clash', () => {
    const source = pair(
      member('가상 가', '2000-03-10'),
      member('가상 나', '2000-01-17'),
    )
    const report = practicalCompat(source)
    expect(report.cards.map((c) => c.key)).toContain('branch-combine:match')
    expect(report.cards.map((c) => c.key)).toContain('generates:match')
    expect(report.cards.map((c) => c.key)).not.toContain(
      'branch-clash:difference',
    )
    expect(
      report.cards.find((c) => c.key === 'generates:match')?.bad,
    ).toContain('떠맡')
  })
  it('uses different content for all four matching vs different MBTI dimensions, without inferring a particular letter', () => {
    const same = practicalCompat(
      pair(
        member('가', '2000-01-07', 'ENTJ'),
        member('나', '2000-01-01', 'ENTJ'),
      ),
    )
    const other = practicalCompat(
      pair(
        member('가', '2000-01-07', 'ENTJ'),
        member('나', '2000-01-01', 'ISFP'),
      ),
    )
    for (const dim of ['EI', 'SN', 'TF', 'JP']) {
      const a = same.cards.find((c) => c.key === `mbti-${dim}:match`)!
      const b = other.cards.find((c) => c.key === `mbti-${dim}:difference`)!
      expect(a).toBeDefined()
      expect(b).toBeDefined()
      expect(a.scene).not.toBe(b.scene)
      expect(a.better).not.toBe(b.better)
      expect(b.source).toBe('직접 공개한 MBTI')
    }
    const absent = practicalCompat(
      pair(
        member('가', '2000-01-07', 'ENTJ'),
        member('나', '2000-01-01', null),
      ),
    )
    expect(absent.cards.some((c) => c.key.startsWith('mbti-'))).toBe(false)
  })
  it('combines repeated complement narratives while retaining every distinct factual basis and direction', () => {
    const input: PairCompat = {
      a: '가',
      b: '나',
      facts: [
        { code: 'complement', kind: 'match', text: '가상 가의 목 보완 근거' },
        { code: 'complement', kind: 'match', text: '가상 나의 수 보완 근거' },
        { code: 'complement', kind: 'match', text: '가상 가의 목 보완 근거' },
      ],
      notes: [],
      questions: [],
    }
    const report = practicalCompat(input)
    expect(report.cards).toHaveLength(1)
    expect(report.cards[0].bases).toEqual([
      '가상 가의 목 보완 근거',
      '가상 나의 수 보완 근거',
    ])
    expect(input.facts).toHaveLength(3)
  })
  it('does not invent scenes for empty, unknown or incompatible facts', () => {
    const source: PairCompat = {
      a: '가',
      b: '나',
      facts: [],
      questions: [],
      notes: [],
    }
    expect(practicalCompat(source).cards).toEqual([])
    source.facts = [
      { code: 'future-rule', kind: 'match', text: '새 근거' },
      { code: 'branch-clash', kind: 'match', text: '잘못된 조합' },
      { code: '__proto__', kind: 'difference', text: '알 수 없는 근거' },
    ]
    const report = practicalCompat(source)
    expect(report.cards).toEqual([])
    expect(report.extra).toEqual(source.facts)
  })
  it('preserves missing-time notes and source text instead of claiming a complete chart', () => {
    const source = pair(
      member('가', '2000-01-07', null, false),
      member('나', '2000-01-01'),
    )
    const before = JSON.stringify(source)
    const report = practicalCompat(source)
    expect(source.notes.some((n) => n.includes('출생시간 없이'))).toBe(true)
    expect(
      report.cards.every((c) =>
        c.bases.every((b) => source.facts.some((f) => f.text === b)),
      ),
    ).toBe(true)
    expect(JSON.stringify(source)).toBe(before)
  })
})
