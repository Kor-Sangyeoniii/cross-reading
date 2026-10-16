import type { TenGod } from 'manseryeok'
import type { SajuChart } from './saju'
import { GOD_CONTENT, withParticle } from './readingContent'
import {
  natalGodSources,
  type PeriodKind,
  type PeriodReading,
} from './readingNarrative'
import { TEN_GOD_READING } from './personalReading'

export type LifeScene = 'work' | 'relationship' | 'plan'
export const LIFE_SCENES: {
  id: LifeScene
  label: string
  place: string
  symbol: string
}[] = [
  { id: 'work', label: '일·공부할 때', place: '작업실', symbol: '✏️' },
  {
    id: 'relationship',
    label: '가까운 사람과',
    place: '약속 장소',
    symbol: '☕',
  },
  { id: 'plan', label: '앞으로의 계획', place: '나의 작은 서재', symbol: '🌱' },
]
interface Choice {
  label: string
  reply: string
  next: string
}
interface Motif {
  title: string
  invitation: string
  work: string
  relationship: string
  plan: string
  lens: string
  choices: [Choice, Choice]
  mission: string
}
const MOTIFS: Record<TenGod, Motif> = {
  비견: {
    title: '같이 가도, 내 방식은 있어',
    invitation:
      '같은 목표여도 각자 편한 방법은 다를 수 있어. 네 몫과 함께할 몫을 나눠보자.',
    work: '같이 맡은 과제. 친구가 “이 방법으로 통일하자”고 해. 너는 다른 방법이 더 편해 보여.',
    relationship:
      '쉬는 날을 같이 보내기로 했어. 상대는 하루 종일 함께 있고 싶고, 너는 혼자 쓸 시간도 필요해.',
    plan: '같은 목표를 시작한 친구가 자기 계획표를 보내줬어. 너는 네 속도로 가고 싶은 마음도 있어.',
    lens: '내 기준을 지키는 것과 상대의 기준을 듣는 건 같이 할 수 있어. 무엇을 함께 정하고 어디부터 각자 선택할지 나누는 장면이야.',
    choices: [
      {
        label: '내가 편한 방식을 먼저 말할래',
        reply:
          '내가 원하는 걸 말해줘야 상대도 알 수 있지. 이번에는 이유와 함께 바꿔도 괜찮은 부분도 하나 알려줘.',
        next: '“이 부분은 이렇게 하면 편해. 나머지는 같이 정해볼까?”',
      },
      {
        label: '상대가 원하는 이유부터 들어볼래',
        reply:
          '먼저 들으면 서로 중요하게 생각하는 게 보일 수 있어. 다 듣고 난 뒤에는 네가 필요한 조건도 한 가지 말해줘.',
        next: '“네가 그 방식을 고른 이유를 알겠어. 나는 이 조건도 챙기고 싶어.”',
      },
    ],
    mission:
      '다음 공동 결정에서 꼭 지키고 싶은 것 하나와 조율할 수 있는 것 하나를 나눠 말하기.',
  },
  겁재: {
    title: '좋은 사이에도, 나눌 건 나누자',
    invitation:
      '마음이 좋다고 역할이 저절로 정해지진 않지. 함께 쓰는 시간과 부담을 들여다보자.',
    work: '함께하는 일이 점점 커졌어. 처음엔 작은 부탁이었는데 어느새 네가 맡은 부분이 많아졌어.',
    relationship:
      '둘이 정한 약속인데 장소 찾기, 예약, 이동까지 한쪽에 몰렸어. 어떻게 꺼내볼까?',
    plan: '친구와 새 활동을 시작하려고 해. 시간도 비용도 함께 쓰게 될 것 같아.',
    lens: '서로의 몫을 말하는 건 관계를 계산적으로 만드는 일만은 아니야. 어느 정도까지 편하게 나눌 수 있는지 알아가는 대화야.',
    choices: [
      {
        label: '이번에 나눌 역할부터 정할래',
        reply:
          '좋아. 누가 더 많이 했는지부터 따지기보다 지금 남은 일과 가능한 시간을 같이 보면 이야기하기 쉬워.',
        next: '“나는 여기까지 할 수 있어. 이 부분은 나눠서 맡아줄 수 있을까?”',
      },
      {
        label: '내가 부담스러운 부분부터 말할래',
        reply:
          '말하지 않으면 상대는 네가 괜찮다고 생각할 수도 있어. 부담을 느낀 장면과 바라는 조정을 함께 알려줘.',
        next: '“예약까지 매번 맡으니 조금 부담돼. 다음에는 역할을 바꿔볼래?”',
      },
    ],
    mission: '함께 맡은 일 하나의 범위와 기한을 서로 확인하기.',
  },
  식신: {
    title: '작은 걸 이어가는 힘',
    invitation:
      '크게 결심하지 않아도 괜찮아. 손으로 해볼 수 있는 작은 한 조각부터 찾아보자.',
    work: '하고 싶은 공부는 있는데 시작이 커 보여. 완벽한 준비를 기다리다 오늘도 시간이 지나가고 있어.',
    relationship:
      '마음을 표현하고 싶은데 거창한 말은 어색해. 상대가 요즘 바쁘다는 건 알고 있어.',
    plan: '새 습관을 만들고 싶어. 첫날부터 많이 하려니 벌써 부담이 돼.',
    lens: '생각을 작은 행동으로 바꾸는 장면이야. 오래 이어가고 싶다면 여유 있는 날의 최대치보다 바쁜 날에도 가능한 크기를 찾아보자.',
    choices: [
      {
        label: '오늘 할 수 있는 만큼 작게 할래',
        reply:
          '작게 시작하면 실제로 얼마나 걸리는지 알 수 있어. 이번에는 끝낸 흔적 하나만 남겨보자.',
        next: '“오늘은 딱 한 문단만 읽고, 기억할 한 줄을 적어둘래.”',
      },
      {
        label: '편하게 반복할 시간을 정할래',
        reply:
          '시간을 정해두는 것도 좋은 시작이야. 다만 못한 날이 생기면 처음부터 실패라고 생각하지 않아도 돼.',
        next: '“저녁을 먹은 뒤 잠깐 해볼게. 바쁜 날에는 분량을 줄여도 괜찮아.”',
      },
    ],
    mission: '부담 없이 반복할 수 있는 작은 행동 하나를 정하기.',
  },
  상관: {
    title: '다른 방법, 꺼내도 괜찮아',
    invitation:
      '불편한 걸 발견했다면 바꿔볼 실마리도 있는 거야. 네 생각이 잘 전달되는 순서를 찾아보자.',
    work: '늘 하던 방식이 너무 번거로워 보여. 바꾸고 싶은데 그냥 비판하는 말처럼 들릴까 고민돼.',
    relationship:
      '상대가 고민을 이야기해. 더 쉬운 방법이 떠올랐지만 지금 바로 말해도 될지 모르겠어.',
    plan: '새 계획을 세우다 기존 방법의 불편한 점을 발견했어. 조금 다르게 해보고 싶어.',
    lens: '생각을 표현하는 것과 상대가 받아들일 수 있게 전하는 건 다른 과정이야. 관찰한 점, 이유, 작은 대안을 나눠 말해보자.',
    choices: [
      {
        label: '불편했던 부분을 구체적으로 말할래',
        reply:
          '구체적인 장면이 있으면 사람이 아니라 방법을 이야기할 수 있어. 그다음 시험해 볼 작은 대안도 붙여보자.',
        next: '“이 단계에서 같은 내용을 두 번 적게 돼. 한 번만 적는 방법을 시험해 볼까?”',
      },
      {
        label: '지금 의견을 들어도 괜찮은지 물을래',
        reply:
          '상대가 필요한 게 조언인지 공감인지 먼저 알 수 있겠네. 의견을 원한다면 네 이유를 차분히 설명해 줘.',
        next: '“내 생각도 이야기해 봐도 될까? 아니면 먼저 조금 더 들어줄까?”',
      },
    ],
    mission: '바꾸고 싶은 일을 상황·이유·대안 세 문장으로 적기.',
  },
  편재: {
    title: '하고 싶은 건 많은데',
    invitation:
      '재미있어 보이는 기회가 여러 개네. 눈길이 가는 것과 지금 감당할 수 있는 걸 함께 놓아보자.',
    work: '새로운 제안이 두 개나 왔어. 둘 다 흥미롭지만 이미 맡은 일도 남아 있어.',
    relationship:
      '가보고 싶은 곳과 만나고 싶은 사람이 많아. 이미 잡은 약속도 함께 챙기고 싶어.',
    plan: '새 취미를 발견했어. 지금 바로 시작하고 싶지만 시간과 준비가 얼마나 필요한지 아직 몰라.',
    lens: '가능성을 넓게 보는 것과 모두 약속하는 건 달라. 시작하기 전에 필요한 시간과 이미 약속한 일을 같이 확인하는 장면이야.',
    choices: [
      {
        label: '작게 먼저 경험해 볼래',
        reply:
          '작게 해보면 기대했던 모습과 실제로 필요한 시간을 비교할 수 있어. 계속할지 정하는 시점도 남겨두자.',
        next: '“짧게 한 번 해보고 나에게 맞는지 확인한 다음 결정할래.”',
      },
      {
        label: '기존 일정과 자원을 먼저 볼래',
        reply:
          '관심이 있어도 지금 여유가 없을 수 있지. 이번에 하지 않는다고 앞으로의 기회가 전부 사라지는 건 아니야.',
        next: '“이미 약속한 일을 지키면서 가능한 범위가 어디까지인지 먼저 볼게.”',
      },
    ],
    mission: '관심 있는 일을 지금 할 것·작게 알아볼 것·넘길 것으로 나눠보기.',
  },
  정재: {
    title: '약속을 지키는 작은 여유',
    invitation:
      '마음이 편하려면 무엇이 정해져 있어야 할까? 계획과 여유를 같이 챙겨보자.',
    work: '일정표는 잘 만들었는데 예상보다 오래 걸리는 일이 생겼어. 뒤의 일들도 조금씩 밀리고 있어.',
    relationship:
      '미리 정한 약속이 갑자기 바뀌었어. 아쉬운 마음도 있고 다음 일정을 다시 잡아야 해.',
    plan: '새 목표를 세웠어. 계속하려면 어느 정도 시간과 비용이 필요한지 알고 싶어.',
    lens: '구체적으로 관리하는 관점이야. 계획을 지키는 것뿐 아니라 상황이 바뀌었을 때 무엇을 조정할지도 함께 정할 수 있어.',
    choices: [
      {
        label: '꼭 지킬 부분부터 남길래',
        reply:
          '모든 것을 처음 계획대로 해야 하는 건 아니지. 지금 중요한 약속과 바꿀 수 있는 순서를 나눠보자.',
        next: '“이 부분은 지키고 싶어. 나머지 일정은 다시 맞춰볼 수 있을까?”',
      },
      {
        label: '변경할 조건을 먼저 이야기할래',
        reply:
          '일찍 알리면 상대도 준비할 여유가 생겨. 바뀌는 이유와 가능한 대안을 함께 말해보자.',
        next: '“예상보다 시간이 더 필요해. 여기까지 먼저 하고 나머지는 이때 확인할래?”',
      },
    ],
    mission: '약속 하나에 필요한 준비와 여유 시간을 확인하기.',
  },
  편관: {
    title: '급할수록, 혼자 다 안 해도 돼',
    invitation:
      '바로 해결해야 할 것처럼 느껴지는 순간이 있지. 할 수 있는 범위와 필요한 도움부터 살펴보자.',
    work: '갑자기 급한 일이 들어왔어. 빨리 끝내 달라는 말만 있고 범위는 아직 분명하지 않아.',
    relationship:
      '가까운 사람이 힘든 일을 이야기해. 바로 해결해 주고 싶지만 어디까지 도울 수 있을지 고민돼.',
    plan: '큰 목표를 세웠더니 해야 할 일이 한꺼번에 보여. 어디부터 책임져야 할지 막막해.',
    lens: '부담과 도전을 다루는 장면이야. 힘을 내는 것뿐 아니라 범위를 정하고 필요한 지원을 말하는 것도 해결의 일부야.',
    choices: [
      {
        label: '마감과 범위를 먼저 확인할래',
        reply:
          '무엇을 언제까지 해야 하는지 알면 막연한 압박이 조금 구체적으로 바뀔 수 있어. 줄일 수 있는 부분도 물어보자.',
        next: '“가장 먼저 필요한 결과가 뭐야? 이 시간 안에는 여기까지 가능해.”',
      },
      {
        label: '도움을 받을 부분부터 찾을래',
        reply:
          '혼자 해야만 책임지는 건 아니야. 네가 할 일과 다른 지원이 필요한 일을 구분해서 부탁해 보자.',
        next: '“이 부분은 내가 할게. 이 조건은 함께 확인해 줄 사람이 필요해.”',
      },
    ],
    mission: '부담스러운 요청의 마감·범위·도움받을 곳을 적기.',
  },
  정관: {
    title: '당연한 줄 알았던 약속',
    invitation:
      '서로 같은 규칙을 생각하고 있을까? 말하지 않았던 기대를 대화로 꺼내보자.',
    work: '팀에서는 익숙한 방식인데 새로 온 사람은 다르게 이해했어. 어디서 설명이 빠졌을까?',
    relationship:
      '답장을 기다리다 서운해졌어. 너는 빠른 답이 당연했지만 상대는 몰랐을 수 있어.',
    plan: '꾸준히 하고 싶은 일이 있어. 무리하지 않고 지킬 수 있는 나만의 기준을 만들고 싶어.',
    lens: '함께 정한 기준과 책임을 살펴보는 장면이야. 내가 당연하다고 여긴 것과 실제로 합의한 것을 구분해 볼 수 있어.',
    choices: [
      {
        label: '내가 기대했던 것을 말할래',
        reply:
          '바람이 구체적이면 상대도 가능한지 이야기하기 쉬워. 규칙처럼 통보하기보다 함께 정하자는 말로 꺼내보자.',
        next: '“나는 이 정도로 연락하면 편해. 너는 어떤 방식이 괜찮아?”',
      },
      {
        label: '상대가 이해한 약속부터 물을래',
        reply:
          '같은 말을 다르게 받아들였을 수도 있겠네. 서로의 이해를 확인한 다음 지금 가능한 기준을 정해보자.',
        next: '“우리가 정한 게 서로 같게 이해됐는지 확인하고 싶어.”',
      },
    ],
    mission: '암묵적으로 기대한 행동 한 가지를 말로 확인하기.',
  },
  편인: {
    title: '잠깐, 다른 각도로 볼까?',
    invitation:
      '머릿속에서 설명이 계속 늘어날 때가 있지. 생각할 시간과 확인할 질문을 나눠보자.',
    work: '같은 자료를 여러 번 봐도 잘 안 풀려. 다른 접근이 필요한지 고민하고 있어.',
    relationship:
      '짧은 메시지를 받았어. 무슨 뜻일지 여러 생각이 떠오르지만 실제 이유는 아직 몰라.',
    plan: '계획을 충분히 알아보고 시작하고 싶어. 그런데 자료가 늘수록 결정이 더 어려워져.',
    lens: '다른 관점으로 이해하는 장면이야. 생각을 많이 하는 것에서 끝내지 않고 직접 확인할 작은 질문으로 연결해 볼 수 있어.',
    choices: [
      {
        label: '다른 설명을 하나 찾아볼래',
        reply:
          '지금 떠오른 해석 말고 다른 가능성도 있을 수 있지. 어느 쪽이 맞는지 확인할 방법까지 같이 생각해 보자.',
        next: '“내가 이렇게 이해했는데 맞아? 다른 사정이 있었는지도 듣고 싶어.”',
      },
      {
        label: '정리할 시간을 정해둘래',
        reply:
          '잠깐 혼자 생각하는 것도 괜찮아. 상대가 기다리는 상황이라면 언제 다시 이야기할지 알려주자.',
        next: '“조금 생각을 정리하고 오늘 저녁에 다시 이야기하고 싶어.”',
      },
    ],
    mission: '현재 생각과 다른 설명 하나, 확인할 질문 하나를 적기.',
  },
  정인: {
    title: '잘 물어보는 것도 실력이야',
    invitation:
      '혼자 답을 찾아야만 하는 건 아니야. 지금 필요한 도움을 작게 말해보자.',
    work: '처음 맡은 일에서 막혔어. 질문하고 싶지만 무엇부터 말해야 할지 모르겠어.',
    relationship:
      '힘든 이야기를 나누고 있어. 조언이 필요한지 그냥 들어줬으면 하는지 서로 아직 몰라.',
    plan: '새로운 일을 배우고 싶어. 준비만 하다가 시작을 미루고 있는 건 아닌지도 궁금해.',
    lens: '배움과 도움을 받아들이는 장면이야. 무엇을 원하는지 분명히 하고, 들은 내용을 내 행동으로 옮기는 것까지 함께 생각해 보자.',
    choices: [
      {
        label: '막힌 지점을 구체적으로 물을래',
        reply:
          '무엇을 해봤고 어디에서 멈췄는지 말하면 상대도 도울 지점을 찾기 쉬워. 답을 들은 뒤 작게 직접 해보자.',
        next: '“여기까지는 해봤어. 이 다음 단계가 이해되지 않아. 같이 확인해 줄래?”',
      },
      {
        label: '원하는 도움의 방식을 말할래',
        reply:
          '위로와 해결책 중 무엇이 필요한지는 상황마다 다를 수 있어. 상대가 알아서 맞히길 기다리지 않아도 돼.',
        next: '“지금은 먼저 들어주면 좋겠어. 정리되면 방법도 같이 찾아보자.”',
      },
    ],
    mission: '도움받고 싶은 질문 하나와 답을 들은 뒤 해볼 행동 하나를 정하기.',
  },
}
export interface StoryContext {
  mode: 'natal' | PeriodKind
  reading?: PeriodReading
  label?: string
  uncertain?: boolean
}
const FRAMES = {
  natal: {
    title: '내 이야기 탐험',
    time: '익숙한 일상',
    invitation: '네 일상에서 닮은 장면이 있는지 같이 찾아보자.',
  },
  day: {
    title: '하루의 작은 선택',
    time: '선택한 날',
    invitation: '하루에 한 가지 대화나 선택만 떠올려도 괜찮아.',
  },
  month: {
    title: '한 달의 생활 이야기',
    time: '반복되는 생활',
    invitation: '하루의 기분보다 요즘 반복되는 장면을 함께 살펴보자.',
  },
  year: {
    title: '한 해의 방향 찾기',
    time: '오래 가져갈 방향',
    invitation: '한 해에 지키고 싶은 것과 바꾸고 싶은 것을 생각해 보자.',
  },
  luck: {
    title: '긴 흐름의 다음 장',
    time: '선택한 긴 구간',
    invitation: '지난 경험과 앞으로의 선택을 천천히 나눠 생각해 보자.',
  },
}

export function readingStory(
  chart: SajuChart,
  context: StoryContext,
  scene: LifeScene,
) {
  if (context.mode !== 'natal' && !context.reading) return null
  if (scene === 'plan' && !chart.hourKnown && context.mode === 'natal')
    return null
  const position =
    scene === 'relationship' ? 'day' : scene === 'plan' ? 'hour' : 'month'
  const source = natalGodSources(chart).find(
    (s) =>
      s.position === position &&
      s.source.endsWith(scene === 'relationship' ? '지지' : '천간'),
  )
  const god =
    context.mode === 'natal'
      ? source?.god
      : scene === 'relationship'
        ? context.reading?.branchGod
        : context.reading?.stemGod
  if (!god) return null
  const motif = MOTIFS[god]
  const frame = FRAMES[context.mode]
  const reading = GOD_CONTENT[god]
  const uncertain =
    !!context.uncertain ||
    (context.mode === 'natal' &&
      chart.yearMonthUncertain &&
      position === 'month')
  return {
    frame,
    scene,
    god,
    title: motif.title,
    setting: motif[scene],
    invitation: motif.invitation,
    lens: motif.lens,
    choices: motif.choices,
    mission: motif.mission,
    personal:
      context.mode === 'natal'
        ? `${source!.source} ${withParticle(source!.character, '은/는')} 내 일간 ${chart.dayMaster.label}과 비교하면 ${withParticle(god, '이에요/예요')}. 그래서 ‘${TEN_GOD_READING[god].theme}’를 ${scene === 'relationship' ? '가까운 관계' : scene === 'plan' ? '앞으로의 계획' : '일·공부'} 장면으로 풀었어요.`
        : `${context.label ?? ''}의 ${context.reading!.label} 중 ${scene === 'relationship' ? '지지의 대표 글자' : '천간'}를 내 일간 ${chart.dayMaster.label}과 비교하면 ${withParticle(god, '이에요/예요')}. 그래서 ‘${TEN_GOD_READING[god].theme}’를 함께 살펴보고 있어요.`,
    basis:
      context.mode === 'natal'
        ? source!.basis
        : `원국은 ${chart.pillars.day}이고 선택한 운은 ${context.reading!.label}이에요. ${context.mode === 'day' ? '하루의 선택' : context.mode === 'month' ? '반복되는 생활 방식' : context.mode === 'year' ? '한 해의 방향' : '선택한 대운 구간'}을 돌아보는 이야기예요. 원국의 글자가 바뀌는 것은 아니에요.`,
    depth:
      scene === 'relationship'
        ? reading.relationship
        : scene === 'plan'
          ? reading.balance
          : reading.work,
    uncertain,
    note: uncertain
      ? '시간 경계에 걸려 있어 참고로 읽어주세요. 정확한 시간을 확인하면 근거가 달라질 수 있어요.'
      : null,
  }
}
