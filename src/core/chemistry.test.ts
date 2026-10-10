import { describe, expect, it } from 'vitest'
import type { PairCompat, CompatFact } from './compat'
import { chemistryStory, CHARACTER_PROFILES } from './chemistry'
const fact = (code: string, kind: CompatFact['kind'] = 'match'): CompatFact => ({ code, kind, text: '가상 원문' })
const pair = (facts: CompatFact[]): PairCompat => ({ a: 'fake-a', b: 'fake-b', facts, questions: [], notes: [] })
describe('chemistry narratives', () => {
  it('keeps differences visible even alongside attraction and support', () => {
    const result = chemistryStory(pair([fact('generates'), fact('stem-combine'), fact('branch-clash', 'difference')]))
    expect(result.kind).toBe('rhythm')
    expect(result.matches).toHaveLength(2)
    expect(result.differences[0].code).toBe('branch-clash')
  })
  it('uses a relationship motif, never match counts or a ranking', () => {
    expect(chemistryStory(pair([fact('same-element')])).kind).toBe('resonance')
    expect(chemistryStory(pair([fact('generates')])).kind).toBe('boost')
    expect(chemistryStory(pair([fact('complement')])).kind).toBe('puzzle')
    expect(chemistryStory(pair([fact('controls', 'difference')])).kind).toBe('rhythm')
    expect(chemistryStory(pair(Array(20).fill(fact('generates')))).kind).toBe('boost')
    expect(chemistryStory(pair(Array(20).fill(fact('generates')))).matches).toHaveLength(1)
  })
  it('does not invent a good or bad outcome when information is missing', () => {
    const empty = chemistryStory(pair([]))
    expect(empty.kind).toBe('discovery')
    expect(empty.matches).toEqual([])
    expect(empty.differences).toEqual([])
  })
  it('keeps MBTI source separate from saju and does not infer hidden types', () => {
    const result = chemistryStory(pair([fact('mbti-EI'), fact('mbti-JP', 'difference')]))
    expect(result.matches[0].source).toBe('MBTI')
    expect(result.differences[0].source).toBe('MBTI')
    expect(result.kind).toBe('discovery')
    expect(chemistryStory(pair([fact('generates')])).matches[0].source).toBe('사주')
  })
  it('uses five original character metaphors for own chart elements', () => {
    expect(Object.keys(CHARACTER_PROFILES)).toEqual(['목', '화', '토', '금', '수'])
    expect(new Set(Object.values(CHARACTER_PROFILES).map((p) => p.kind)).size).toBe(5)
  })
})
