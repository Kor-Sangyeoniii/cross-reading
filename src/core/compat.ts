import type { FiveElement } from 'manseryeok'
import type { SajuChart } from './saju.ts'

// 궁합 계산 (CR-007). 전통 사주 해석의 "관계"만 찾아 문장으로 돌려준다.
// 원칙 (AGENTS.md P4): 점수·등급·확정 판정 없음. 모든 문장은 참고용. 출생정보 원문(생년월일·간지)은 결과에 넣지 않는다.
// 기준(전통 명리 해석, 과학적 근거 아님):
//   오행 상생 목→화→토→금→수→목 / 상극 목→토→수→화→금→목
//   천간합 갑기·을경·병신·정임·무계 / 지지 육합 자축·인해·묘술·진유·사신·오미 / 지지 충 자오·축미·인신·묘유·진술·사해

export type Mbti = `${'E' | 'I'}${'S' | 'N'}${'T' | 'F'}${'J' | 'P'}`

export interface CompatMember {
  id: string
  nickname: string
  chart: SajuChart
  /** 본인이 공개에 동의한 경우에만 넣는다. 아니면 null */
  mbti: Mbti | null
}

export type FactKind = 'match' | 'difference'

export interface CompatFact {
  kind: FactKind
  code: string
  text: string
}

export interface PairCompat {
  a: string
  b: string
  facts: CompatFact[]
  questions: string[]
  notes: string[]
}

export interface GroupCompat {
  memberCount: number
  pairs: PairCompat[]
  /** 모임 전체 원국 글자의 오행 합계 */
  elements: Record<FiveElement, number>
  facts: CompatFact[]
  questions: string[]
  notes: string[]
  disclaimer: string
}

export const DISCLAIMER = '이 해석은 전통 사주 풀이를 바탕으로 한 참고용이에요. 관계를 판정하지 않아요.'

const ELEMENT_NAME: Record<FiveElement, string> = { 목: '나무(목)', 화: '불(화)', 토: '흙(토)', 금: '쇠(금)', 수: '물(수)' }
const ELEMENTS: FiveElement[] = ['목', '화', '토', '금', '수']
const GENERATES: Record<FiveElement, FiveElement> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CONTROLS: Record<FiveElement, FiveElement> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const STEM_COMBINE = ['갑기', '을경', '병신', '정임', '무계']
const BRANCH_COMBINE = ['자축', '인해', '묘술', '진유', '사신', '오미']
const BRANCH_CLASH = ['자오', '축미', '인신', '묘유', '진술', '사해']

const isPair = (list: string[], x: string, y: string) => list.includes(x + y) || list.includes(y + x)

const QUESTIONS: Record<string, string> = {
  'stem-combine': '처음 만났을 때 서로 어떤 인상이었어?',
  'same-element': '요즘 둘 다 비슷하게 신경 쓰이는 게 있어?',
  generates: '서로에게 힘이 됐던 순간 하나씩 말해볼까?',
  controls: '같이 뭘 할 때 서로 속도가 다르다고 느낀 적 있어?',
  'branch-combine': '같이 있을 때 제일 편한 순간은 언제야?',
  'branch-clash': '약속 잡을 때 각자 선호하는 스타일은 어때?',
  complement: '서로 닮고 싶은 점 하나씩 말해볼까?',
  'mbti-EI': '쉬는 날 혼자 보내는 시간과 함께 보내는 시간 중 어떤 게 더 좋아?',
  'mbti-SN': '요즘 자주 상상하는 일이 있어, 아니면 지금 눈앞의 일이 더 중요해?',
  'mbti-TF': '고민을 말할 때 해결책과 공감 중 뭐가 더 듣고 싶어?',
  'mbti-JP': '여행 갈 때 계획을 세우는 편이야, 즉흥적인 편이야?',
}

const MBTI_DIMS: { index: number; code: string; name: string }[] = [
  { index: 0, code: 'EI', name: '에너지를 얻는 방식' },
  { index: 1, code: 'SN', name: '정보를 받아들이는 방식' },
  { index: 2, code: 'TF', name: '결정할 때 중요하게 보는 것' },
  { index: 3, code: 'JP', name: '계획을 세우는 스타일' },
]

function memberNotes(m: CompatMember): string[] {
  const notes: string[] = []
  if (!m.chart.hourKnown) notes.push(`${m.nickname}님은 출생시간 없이 봤어요.`)
  if (m.chart.yearMonthUncertain) notes.push(`${m.nickname}님은 절기가 바뀌는 날에 태어나 일부 해석이 달라질 수 있어요.`)
  return notes
}

export function comparePair(a: CompatMember, b: CompatMember): PairCompat {
  const facts: CompatFact[] = []
  const ea = a.chart.dayMaster.element
  const eb = b.chart.dayMaster.element
  const A = `${a.nickname}님`
  const B = `${b.nickname}님`

  if (isPair(STEM_COMBINE, a.chart.dayMaster.stem, b.chart.dayMaster.stem)) {
    facts.push({ kind: 'match', code: 'stem-combine', text: `${A}과 ${B}은 일간이 합을 이루는 사이예요. 전통 해석에서는 서로 끌리는 조합으로 봐요.` })
  }
  if (ea === eb) {
    facts.push({ kind: 'match', code: 'same-element', text: `두 분 모두 ${ELEMENT_NAME[ea]} 기운이 중심이라 생각하는 방식이 비슷할 수 있어요.` })
  } else if (GENERATES[ea] === eb) {
    facts.push({ kind: 'match', code: 'generates', text: `${A}의 ${ELEMENT_NAME[ea]} 기운이 ${B}의 ${ELEMENT_NAME[eb]} 기운을 북돋는 관계예요.` })
  } else if (GENERATES[eb] === ea) {
    facts.push({ kind: 'match', code: 'generates', text: `${B}의 ${ELEMENT_NAME[eb]} 기운이 ${A}의 ${ELEMENT_NAME[ea]} 기운을 북돋는 관계예요.` })
  } else if (CONTROLS[ea] === eb || CONTROLS[eb] === ea) {
    facts.push({ kind: 'difference', code: 'controls', text: `${A}의 ${ELEMENT_NAME[ea]} 기운과 ${B}의 ${ELEMENT_NAME[eb]} 기운은 서로를 조절하는 관계라, 일을 처리하는 속도나 방식이 다르게 느껴질 수 있어요.` })
  }

  const ba = a.chart.pillars.day[1]
  const bb = b.chart.pillars.day[1]
  if (isPair(BRANCH_COMBINE, ba, bb)) {
    facts.push({ kind: 'match', code: 'branch-combine', text: '생활 리듬을 보는 자리(일지)가 합을 이뤄, 함께 있을 때 편하게 지낼 수 있는 조합으로 봐요.' })
  } else if (isPair(BRANCH_CLASH, ba, bb)) {
    facts.push({ kind: 'difference', code: 'branch-clash', text: '생활 리듬을 보는 자리(일지)가 부딪히는 조합이라, 약속이나 일정 스타일을 미리 이야기해 보면 좋아요.' })
  }

  for (const el of ELEMENTS) {
    if (a.chart.elements[el] === 0 && b.chart.elements[el] >= 2) {
      facts.push({ kind: 'match', code: 'complement', text: `전통 해석에서는 ${B}에게 많은 ${ELEMENT_NAME[el]} 기운이 ${A}에게 적은 부분을 채워주는 관계로 봐요.` })
    } else if (b.chart.elements[el] === 0 && a.chart.elements[el] >= 2) {
      facts.push({ kind: 'match', code: 'complement', text: `전통 해석에서는 ${A}에게 많은 ${ELEMENT_NAME[el]} 기운이 ${B}에게 적은 부분을 채워주는 관계로 봐요.` })
    }
  }

  const notes = [...memberNotes(a), ...memberNotes(b)]
  if (a.mbti && b.mbti) {
    for (const d of MBTI_DIMS) {
      const same = a.mbti[d.index] === b.mbti[d.index]
      facts.push({
        kind: same ? 'match' : 'difference',
        code: `mbti-${d.code}`,
        text: same ? `MBTI로 보면 ${d.name}이 비슷해요.` : `MBTI로 보면 ${d.name}이 달라요.`,
      })
    }
  } else {
    notes.push('MBTI 정보가 없는 분이 있어 사주만으로 봤어요.')
  }

  return { a: a.id, b: b.id, facts, questions: pickQuestions(facts, 3), notes }
}

function pickQuestions(facts: CompatFact[], max: number): string[] {
  // 다른 점에서 나온 질문을 먼저: 대화로 이어지기 쉽다.
  const ordered = [...facts.filter((f) => f.kind === 'difference'), ...facts.filter((f) => f.kind === 'match')]
  const out: string[] = []
  for (const f of ordered) {
    const q = QUESTIONS[f.code]
    if (q && !out.includes(q)) out.push(q)
    if (out.length >= max) break
  }
  if (out.length === 0) out.push('요즘 제일 재미있게 하고 있는 게 뭐야?')
  return out
}

/** 2~4명 모임의 궁합. 모든 짝을 비교하고 모임 전체 오행 분포를 요약한다. */
export function groupCompat(members: CompatMember[]): GroupCompat {
  if (members.length < 2 || members.length > 4) throw new Error('궁합은 2~4명일 때만 볼 수 있어요.')

  const pairs: PairCompat[] = []
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) pairs.push(comparePair(members[i], members[j]))
  }

  const elements: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const m of members) for (const el of ELEMENTS) elements[el] += m.chart.elements[el]

  const facts: CompatFact[] = []
  const max = Math.max(...ELEMENTS.map((el) => elements[el]))
  const strongest = ELEMENTS.filter((el) => elements[el] === max)
  const missing = ELEMENTS.filter((el) => elements[el] === 0)
  facts.push({ kind: 'match', code: 'group-strong', text: `우리 모임은 ${strongest.map((el) => ELEMENT_NAME[el]).join('·')} 기운이 가장 많아요.` })
  if (missing.length > 0) {
    facts.push({ kind: 'difference', code: 'group-missing', text: `${missing.map((el) => ELEMENT_NAME[el]).join('·')} 기운은 모임에 없어요. 그 부분은 서로 의식해서 챙겨보면 좋아요.` })
  }

  const questions = members.length >= 3
    ? ['우리 모임에서 각자 맡고 있는 역할이 뭐라고 생각해?', ...pickQuestions(pairs.flatMap((p) => p.facts), 2)]
    : pickQuestions(pairs[0].facts, 3)

  const notes = Array.from(new Set(pairs.flatMap((p) => p.notes)))
  return { memberCount: members.length, pairs, elements, facts, questions, notes, disclaimer: DISCLAIMER }
}
