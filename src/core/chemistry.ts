import type { PairCompat, CompatFact } from './compat'

export type CharacterKind = 'sprout' | 'sun' | 'cloud' | 'star' | 'flame'
export type ChemistryKind = 'resonance' | 'boost' | 'rhythm' | 'puzzle' | 'discovery'
export const CHEMISTRY_STORIES: Record<ChemistryKind, { title: string; subtitle: string; tag: string; characters: [CharacterKind, CharacterKind]; color: string }> = {
  resonance: { title: '닮은꼴 메이트', subtitle: '비슷한 포인트에서\n대화의 실마리를 찾아봐요.', tag: '같은 결, 다른 매력', characters: ['cloud', 'cloud'], color: '#d9d9ff' },
  boost: { title: '서로의 부스터', subtitle: '서로를 북돋는 포인트를\n우리 편으로 만들어봐요.', tag: '네가 있으면 한 걸음 더', characters: ['sprout', 'sun'], color: '#d9efab' },
  rhythm: { title: '다른 박자 듀오', subtitle: '서로 다른 속도,\n맞춰볼 포인트가 보여요.', tag: '다름을 알면 대화가 쉬워져요', characters: ['flame', 'cloud'], color: '#ffd3ba' },
  puzzle: { title: '뜻밖의 퍼즐', subtitle: '서로 다른 조각에서\n함께할 힌트를 찾아봐요.', tag: '다른 조각이 만나는 순간', characters: ['star', 'sprout'], color: '#f2d9ee' },
  discovery: { title: '알아가는 메이트', subtitle: '아직 빈칸이 있는 우리,\n한 가지씩 알아가 볼까요?', tag: '우리만의 조합을 찾는 중', characters: ['star', 'cloud'], color: '#d3e8f6' },
}
const SIGNALS: Record<string, [string, string]> = {
  'same-element': ['생각의 출발점이 비슷해요', '결론이 같아도 이유는 서로 물어보기'],
  generates: ['서로에게 힘을 보태는 관계', '도움이 필요한 순간부터 물어보기'],
  'stem-combine': ['서로 끌리는 지점을 찾아봐요', '첫인상과 지금의 인상 비교하기'],
  'branch-combine': ['편안한 생활 리듬의 힌트', '함께 편했던 시간을 떠올려보기'],
  'branch-clash': ['약속과 생활 리듬 조율하기', '약속 시간과 쉬는 방식 먼저 정하기'],
  controls: ['일을 풀어가는 속도가 달라요', '빠르게 할 일과 천천히 할 일 나누기'],
  complement: ['서로 다른 면에서 배울 힌트', '상대에게 배우고 싶은 점 하나 말하기'],
  'mbti-EI': ['에너지를 채우는 방식', '혼자 쉬는 시간과 함께할 시간 나누기'],
  'mbti-SN': ['이야기를 바라보는 관점', '구체적인 계획과 큰 그림 함께 말하기'],
  'mbti-TF': ['고민을 들을 때 중요한 것', '공감이 필요한지 해결책이 필요한지 물어보기'],
  'mbti-JP': ['계획을 세우는 스타일', '미리 정할 것과 자유롭게 둘 것 나누기'],
}
export function chemistrySignal(fact: CompatFact) {
  const copy = SIGNALS[fact.code]
  return { code: fact.code, title: copy?.[0] ?? '함께 살펴볼 관계 포인트', tip: copy?.[1] ?? '서로의 생각을 한 가지씩 이야기해 보세요.', source: fact.code.startsWith('mbti-') ? 'MBTI' : '사주', kind: fact.kind }
}
export function chemistryStory(pair: PairCompat) {
  const has = (code: string, kind?: string) => pair.facts.some((f) => f.code === code && (!kind || f.kind === kind))
  // Categories are narrative motifs, never an aggregate score or a ranking.
  const kind: ChemistryKind = has('branch-clash') || has('controls') ? 'rhythm'
    : has('generates') ? 'boost'
    : has('same-element') || has('stem-combine') || has('branch-combine') ? 'resonance'
    : has('complement') ? 'puzzle' : 'discovery'
  const unique = pair.facts.filter((f, i, all) => all.findIndex((x) => x.code === f.code && x.kind === f.kind) === i)
  const matches = unique.filter((f) => f.kind === 'match').map(chemistrySignal)
  const differences = unique.filter((f) => f.kind === 'difference').map(chemistrySignal)
  return { kind, ...CHEMISTRY_STORIES[kind], matches, differences }
}
export const CHARACTER_PROFILES: Record<string, { kind: CharacterKind; name: string; line: string }> = {
  목: { kind: 'sprout', name: '새싹 탐험가', line: '새로운 시작을 떠올리게 하는 나무의 이미지' },
  화: { kind: 'flame', name: '반짝 불꽃', line: '마음을 표현하는 장면을 떠올리는 불의 이미지' },
  토: { kind: 'sun', name: '포근한 중심', line: '곁을 든든하게 채우는 흙의 이미지' },
  금: { kind: 'star', name: '또렷한 별', line: '필요한 것을 고르는 쇠의 이미지' },
  수: { kind: 'cloud', name: '몽글 사색가', line: '생각과 쉼을 떠올리게 하는 물의 이미지' },
}
