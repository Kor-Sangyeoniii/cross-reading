import type { SajuChart } from './saju'
import { CHARACTER_PROFILES } from './chemistry'
export const PERSONA_ELEMENTS = ['목', '화', '토', '금', '수'] as const
export type PersonaElement = (typeof PERSONA_ELEMENTS)[number]
export const ELEMENT_MOTIFS: Record<
  PersonaElement,
  { label: string; symbol: string; color: string; phrase: string }
> = {
  목: { label: '새싹', symbol: '❧', color: '#8ba968', phrase: '숲을 품은' },
  화: { label: '불꽃', symbol: '♨', color: '#dd775b', phrase: '불꽃을 두른' },
  토: { label: '대지', symbol: '◆', color: '#c7a060', phrase: '대지에 기대는' },
  금: { label: '별빛', symbol: '✧', color: '#a398cc', phrase: '별빛을 품은' },
  수: { label: '물결', symbol: '≈', color: '#72a9ce', phrase: '물결을 타는' },
}
export interface ElementPersona {
  base: PersonaElement
  accent: PersonaElement | null
  leaders: PersonaElement[]
  title: string
  line: string
  question: string
  counts: Record<PersonaElement, number>
  total: number
  hourKnown: boolean
  uncertain: boolean
  dayLabel: string
}
const SAME: Record<PersonaElement, string> = {
  목: '겹겹이 자라는 목',
  화: '타오르는 화',
  토: '뿌리내린 토',
  금: '또렷이 빛나는 금',
  수: '깊게 흐르는 수',
}
export function elementPersona(
  chart: Pick<
    SajuChart,
    'dayMaster' | 'elements' | 'hourKnown' | 'yearMonthUncertain'
  >,
): ElementPersona {
  const base = chart.dayMaster.element
  const counts = { ...chart.elements }
  const total = PERSONA_ELEMENTS.reduce((sum, e) => sum + counts[e], 0)
  if (
    !PERSONA_ELEMENTS.includes(base) ||
    PERSONA_ELEMENTS.some(
      (e) => !Number.isSafeInteger(counts[e]) || counts[e] < 0,
    ) ||
    total !== (chart.hourKnown ? 8 : 6) ||
    counts[base] < 1
  )
    throw new Error('캐릭터의 계산 근거를 확인하지 못했어요.')
  const max = Math.max(...PERSONA_ELEMENTS.map((e) => counts[e]))
  const leaders = PERSONA_ELEMENTS.filter((e) => counts[e] === max)
  const accent = leaders.length === 1 ? leaders[0] : null
  const title = accent
    ? accent === base
      ? SAME[base]
      : `${ELEMENT_MOTIFS[accent].phrase} ${base}`
    : `여러 빛을 품은 ${base}`
  const line =
    base === '금' && accent === '화'
      ? '은빛 바탕에 불꽃을 두른 모습. 차분함과 뜨거움을 함께 떠올리는 캐릭터예요.'
      : `${CHARACTER_PROFILES[base].name.split(' · ')[0]}의 모습에 ${accent ? ELEMENT_MOTIFS[accent].label : '여러 오행'} 장식을 더한 캐릭터예요.`
  return {
    base,
    accent,
    leaders,
    title,
    line,
    question:
      accent === '화'
        ? '평소에는 차분하다가도, 어떤 이야기 앞에서 신나나요?'
        : accent === '수'
          ? '조용히 생각을 정리할 때 나만의 방식이 있나요?'
          : '내 모습과 닮은 점, 다른 점을 하나씩 골라볼까요?',
    counts,
    total,
    hourKnown: chart.hourKnown,
    uncertain: chart.yearMonthUncertain,
    dayLabel: chart.dayMaster.label,
  }
}
/** Fictional visual combination, not a birth chart or a fabricated personal reading. */
export function examplePersona(
  base: PersonaElement,
  accent: PersonaElement,
): ElementPersona {
  const counts = { 목: 1, 화: 1, 토: 1, 금: 1, 수: 1 }
  counts[accent] += 3
  return elementPersona({
    dayMaster: {
      element: base,
      stem: '',
      label: `${base} 일간 · 가상 예시`,
      hanja: '',
      yinYang: '양',
    },
    elements: counts,
    hourKnown: true,
    yearMonthUncertain: false,
  })
}
