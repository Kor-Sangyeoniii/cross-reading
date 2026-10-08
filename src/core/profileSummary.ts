import type { FiveElement } from 'manseryeok'
import type { SajuChart } from './saju.ts'

// 내 프로필 해석 (CR-011). 와이어프레임 06 "내 프로필": 한 줄 요약, 키워드 3개, 나의 특징, 관계에서 편한 점, 대화할 때 참고할 점.
// 기준: 일간(日干) 10가지에 대해 전통 명리에서 흔히 쓰는 자연물 비유와 오행 분포. 과학적 근거가 아니며 참고용 (AGENTS.md P4).
// 표현 원칙: 단정하지 않는다("~할 수 있어요", "~하는 편으로 봐요"). 점수·등급 없음.

export interface ProfileSummary {
  /** 예: '큰 나무처럼 곧게 뻗어가는 사람' */
  headline: string
  /** 일간 이미지. 예: '갑목(甲木) · 큰 나무' */
  dayMasterImage: string
  keywords: [string, string, string]
  traits: string[]
  relationshipEase: string[]
  conversationTips: string[]
  notes: string[]
  disclaimer: string
}

interface DayMasterText {
  image: string
  headline: string
  keywords: [string, string, string]
  traits: string[]
  ease: string
  tip: string
}

// 일간별 전통 비유 (예: 갑목=큰 나무, 병화=태양, 계수=빗물·이슬)
const DAY_MASTER: Record<string, DayMasterText> = {
  갑: {
    image: '큰 나무', headline: '큰 나무처럼 곧게 뻗어가는 사람', keywords: ['곧음', '시작하는 힘', '책임감'],
    traits: ['목표를 정하면 꾸준히 밀고 나가는 편으로 봐요.', '앞에 서서 방향을 잡는 역할이 어울릴 수 있어요.'],
    ease: '주변에 든든한 느낌을 주는 편으로 봐요.', tip: '고집으로 보일 때가 있어, 상대 의견을 먼저 물어보면 대화가 부드러워져요.',
  },
  을: {
    image: '풀과 꽃', headline: '풀과 꽃처럼 유연하게 어울리는 사람', keywords: ['유연함', '적응력', '섬세함'],
    traits: ['환경에 맞춰 자연스럽게 자리를 찾는 편으로 봐요.', '사람 사이의 분위기에 신경을 쓰는 편일 수 있어요.'],
    ease: '상대에게 맞춰 주려는 편이라 함께 있으면 편하게 느껴질 수 있어요.', tip: '속마음을 늦게 꺼내는 편이라, 편하게 말할 시간을 주면 좋아요.',
  },
  병: {
    image: '태양', headline: '태양처럼 주변을 밝히는 사람', keywords: ['밝음', '열정', '솔직함'],
    traits: ['감정과 생각을 숨김없이 드러내는 편으로 봐요.', '모임에 활기를 불어넣는 역할이 어울릴 수 있어요.'],
    ease: '모임 분위기를 밝게 만드는 편으로 봐요.', tip: '말이 앞설 때가 있어, 상대의 이야기를 끝까지 들어주면 더 가까워져요.',
  },
  정: {
    image: '촛불', headline: '촛불처럼 은은하게 따뜻한 사람', keywords: ['따뜻함', '집중력', '배려'],
    traits: ['한 사람 한 사람을 세심하게 챙기는 편으로 봐요.', '관심 있는 일에 깊이 빠져드는 편일 수 있어요.'],
    ease: '작은 것까지 챙기려는 편일 수 있어요.', tip: '서운함을 쌓아두기 쉬워, 그때그때 가볍게 이야기하면 좋아요.',
  },
  무: {
    image: '큰 산', headline: '큰 산처럼 묵직하게 곁을 지키는 사람', keywords: ['듬직함', '포용', '신뢰'],
    traits: ['쉽게 흔들리지 않고 중심을 지키는 편으로 봐요.', '여러 사람의 의견을 두루 들으려는 편일 수 있어요.'],
    ease: '이야기를 차분히 들어주는 편으로 봐요.', tip: '변화를 천천히 받아들이는 편이라, 새로운 제안은 여유를 두고 꺼내면 좋아요.',
  },
  기: {
    image: '논밭', headline: '논밭처럼 사람을 키우고 돌보는 사람', keywords: ['현실감', '돌봄', '꼼꼼함'],
    traits: ['실제로 필요한 것을 챙기는 현실적인 편으로 봐요.', '주변 사람이 자라도록 돕는 역할이 어울릴 수 있어요.'],
    ease: '필요한 것을 먼저 챙기려는 편일 수 있어요.', tip: '걱정이 많아질 때가 있어, 고민을 나눌 수 있게 먼저 물어봐 주면 좋아요.',
  },
  경: {
    image: '바위와 쇠', headline: '단단한 쇠처럼 결단력 있는 사람', keywords: ['결단력', '의리', '추진력'],
    traits: ['옳다고 생각하면 빠르게 결정하는 편으로 봐요.', '한번 맺은 관계를 오래 이어가려는 편일 수 있어요.'],
    ease: '약속을 중요하게 여기는 편으로 봐요.', tip: '말투가 단호하게 들릴 수 있어, 이유를 함께 설명하면 오해가 줄어요.',
  },
  신: {
    image: '보석', headline: '보석처럼 섬세하게 빛나는 사람', keywords: ['섬세함', '감각', '기준'],
    traits: ['자기만의 기준과 감각이 뚜렷한 편으로 봐요.', '작은 부분까지 살피는 편일 수 있어요.'],
    ease: '말과 선물에 마음을 담아 표현하는 편일 수 있어요.', tip: '작은 말에도 상처받을 수 있어, 칭찬을 구체적으로 해주면 좋아요.',
  },
  임: {
    image: '큰 바다', headline: '큰 바다처럼 넓게 품는 사람', keywords: ['포용력', '자유로움', '지혜'],
    traits: ['생각의 폭이 넓고 새로운 것에 열려 있는 편으로 봐요.', '여러 사람을 이어주는 역할이 어울릴 수 있어요.'],
    ease: '여러 주제를 편하게 받아들이는 편으로 봐요.', tip: '얽매이는 걸 답답해할 수 있어, 각자의 시간을 존중해 주면 좋아요.',
  },
  계: {
    image: '빗물과 이슬', headline: '빗물처럼 조용히 스며드는 사람', keywords: ['지혜', '감성', '공감'],
    traits: ['겉으로 드러내기보다 깊이 생각하는 편으로 봐요.', '다른 사람의 마음에 공감하려는 편으로 봐요.'],
    ease: '상대의 마음을 헤아리려는 편일 수 있어요.', tip: '혼자 생각을 정리하는 시간이 필요할 수 있어, 답을 재촉하지 않으면 좋아요.',
  },
}

const ELEMENT_NAME: Record<FiveElement, string> = { 목: '나무(목)', 화: '불(화)', 토: '흙(토)', 금: '쇠(금)', 수: '물(수)' }
const ELEMENT_TRAIT: Record<FiveElement, string> = {
  목: '새로운 것을 시작하고 성장하려는 기운',
  화: '드러내고 표현하려는 기운',
  토: '중심을 잡고 안정시키려는 기운',
  금: '정리하고 결단하려는 기운',
  수: '생각하고 흐름을 읽으려는 기운',
}
const ELEMENTS: FiveElement[] = ['목', '화', '토', '금', '수']

export const PROFILE_DISCLAIMER = '이 해석은 자기이해와 대화를 위한 참고예요. 성격을 판정하지 않으니, 나와 맞는 부분이 있는지 스스로 확인해 보세요.'

export function summarizeProfile(chart: SajuChart): ProfileSummary {
  const dm = DAY_MASTER[chart.dayMaster.stem]
  if (!dm) throw new Error('알 수 없는 일간')

  const traits = [...dm.traits]
  const max = Math.max(...ELEMENTS.map((el) => chart.elements[el]))
  const strongest = ELEMENTS.filter((el) => chart.elements[el] === max)
  const missing = ELEMENTS.filter((el) => chart.elements[el] === 0)
  traits.push(`원국에서 ${strongest.map((el) => ELEMENT_NAME[el]).join('·')} 기운이 가장 많아, ${ELEMENT_TRAIT[strongest[0]]}이 두드러질 수 있어요.`)

  const relationshipEase = [dm.ease]
  const conversationTips = [dm.tip]
  if (missing.length > 0) {
    conversationTips.push(
      `${missing.map((el) => ELEMENT_NAME[el]).join('·')} 기운이 적은 편이라, 그 기운이 많은 친구와 함께 있으면 서로 채워줄 수 있어요.`,
    )
  }

  const notes: string[] = []
  if (!chart.hourKnown) notes.push('출생시간 없이 봤어요. 시간을 알면 해석이 조금 달라질 수 있어요.')
  if (chart.yearMonthUncertain) notes.push('절기가 바뀌는 날에 태어나 일부 해석이 달라질 수 있어요.')

  return {
    headline: dm.headline,
    dayMasterImage: `${chart.dayMaster.label} · ${dm.image}`,
    keywords: dm.keywords,
    traits,
    relationshipEase,
    conversationTips,
    notes,
    disclaimer: PROFILE_DISCLAIMER,
  }
}
