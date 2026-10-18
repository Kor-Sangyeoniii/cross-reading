import type { TenGod } from 'manseryeok'
import type { SajuChart } from './saju'
import { natalGodSources, type PeriodReading } from './readingNarrative'
import { GOD_CONTENT } from './readingContent'

export type LifeArea = 'career' | 'love' | 'money' | 'growth'
// Editorial topic weights, not validated fortune probabilities or strength analysis.
export const LIFE_AREAS: Record<
  LifeArea,
  {
    title: string
    icon: string
    question: string
    gods: TenGod[]
    action: string
    example: string
  }
> = {
  career: {
    title: '직업운',
    icon: '💼',
    question: '어떤 방식으로 일할 때 내 힘을 쓰기 편할까?',
    gods: ['정관', '편관', '정인', '식신'],
    action:
      '직업명보다 일의 조건을 비교해요. 혼자 깊게 파는 일인지, 사람들과 조율하는 일인지, 일정과 역할이 분명한지부터 적어보세요.',
    example:
      '이직을 고민한다면 연봉만 보지 말고 “첫 3개월에 맡을 일과 평가 기준이 무엇인가요?”라고 물어봐요. 실제 경험·역량·근무 조건을 함께 비교해야 해요.',
  },
  love: {
    title: '연애운',
    icon: '💗',
    question: '가까워질 때 무엇을 편하게 느끼고 어디서 오해할까?',
    gods: ['비견', '식신', '정재', '정인'],
    action:
      '연락 빈도, 혼자 쉬는 시간, 고민을 들을 때 원하는 반응을 서로 말해봐요. 끌림과 오래 편하게 지내는 조건은 따로 살펴볼 수 있어요.',
    example:
      '답장이 늦어 서운하다면 “왜 관심이 없어?”보다 “바쁜 날에는 저녁에 한 번 안부를 나누면 좋겠어. 너는 어때?”처럼 필요한 것을 말해요.',
  },
  money: {
    title: '금전운',
    icon: '🪙',
    question: '돈을 벌고 쓰고 나눌 때 어떤 습관을 살펴볼까?',
    gods: ['정재', '편재', '겁재', '식신'],
    action:
      '기회에 눈이 가는지, 꾸준히 쌓는 게 편한지, 부탁을 거절하기 어려운지 돌아봐요. 실제 수입과 고정 지출을 먼저 확인하세요.',
    example:
      '친구와 프로젝트를 시작한다면 비용·역할·정산일을 먼저 써둬요. “좋은 사이니까 괜찮겠지”로 넘기지 않고 감당 가능한 범위를 정하는 연습이에요.',
  },
  growth: {
    title: '성공·성취운',
    icon: '🌱',
    question: '내가 원하는 성공을 어떤 과정으로 만들어갈까?',
    gods: ['상관', '편인', '편관', '비견'],
    action:
      '성공을 합격·승진 같은 결과 하나로만 두지 말고, 익힐 기술·완성할 결과물·지킬 생활 조건으로 나눠보세요.',
    example:
      '새 일을 준비한다면 “올해 반드시 성공” 대신 “이번 달 작은 결과물 하나를 만들고 두 사람에게 피드백 받기”처럼 조절 가능한 행동으로 바꿔요.',
  },
}
export function topicWeight(god: TenGod, area: LifeArea): number {
  return LIFE_AREAS[area].gods.includes(god) ? 2 : 1
}
export function lifeReading(chart: SajuChart, period?: PeriodReading) {
  const sources = natalGodSources(chart)
  return (Object.keys(LIFE_AREAS) as LifeArea[]).map((id) => {
    const area = LIFE_AREAS[id]
    const base =
      (sources.reduce((n, s) => n + topicWeight(s.god, id), 0) /
        (2 * sources.length)) *
      100
    const transit = period
      ? ((topicWeight(period.stemGod, id) + topicWeight(period.branchGod, id)) /
          4) *
        100
      : null
    const score = Math.round(
      transit === null ? base : base * 0.7 + transit * 0.3,
    )
    const month = sources.find(
      (s) => s.position === 'month' && s.source.includes('천간'),
    )!
    const source =
      id === 'love'
        ? sources.find((s) => s.position === 'day')!
        : id === 'money'
          ? (sources.find((s) => s.god === '정재' || s.god === '편재') ?? month)
          : id === 'growth'
            ? (sources.find((s) => s.god === '식신' || s.god === '상관') ??
              sources.find(
                (s) => s.position === 'hour' && s.source.includes('천간'),
              ) ??
              month)
            : month
    const selection =
      id === 'love'
        ? '가까운 생활을 보는 일지의 관계를 읽었어요.'
        : id === 'career'
          ? '사회생활을 보는 월주 천간의 관계를 읽었어요.'
          : id === 'money'
            ? source.god === '정재' || source.god === '편재'
              ? '확인된 재성 자리 중 화면 순서상 첫 자리를 골라 자원 관리의 관점으로 읽었어요.'
              : '확인된 재성이 없어 월주 천간의 일하는 방식을 자원 관리에 연결했어요. 재성이 없다고 돈을 못 버는 뜻은 아니에요.'
            : source.god === '식신' || source.god === '상관'
              ? '표현과 결과물을 보는 식상 자리 중 화면 순서상 첫 자리를 읽었어요.'
              : source.position === 'hour'
                ? '확인된 식상이 없어 계획을 보는 시주 천간을 읽었어요.'
                : '식상·시주를 사용할 수 없어 월주 천간의 일하는 방식을 읽었어요.'
    return {
      id,
      ...area,
      score,
      base: Math.round(base),
      transit,
      source,
      selection,
      explanation:
        id === 'love'
          ? GOD_CONTENT[source.god].relationship
          : id === 'career'
            ? GOD_CONTENT[source.god].work
            : id === 'money'
              ? GOD_CONTENT[source.god].balance
              : GOD_CONTENT[source.god].process,
      periodExplanation: period
        ? id === 'love'
          ? GOD_CONTENT[period.branchGod].relationship
          : GOD_CONTENT[period.stemGod].process
        : null,
      contributions: sources.map((s) => ({
        ...s,
        weight: topicWeight(s.god, id),
      })),
    }
  })
}
