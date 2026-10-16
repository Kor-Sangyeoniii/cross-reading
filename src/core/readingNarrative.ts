import {
  getHeavenlyStemElement,
  getHeavenlyStemYinYang,
  type FiveElement,
  type Pillar,
  type TenGod,
} from 'manseryeok'
import type { PillarKey, SajuChart } from './saju'
import { TEN_GOD_READING, type readPillar } from './personalReading'
import {
  analyzeShinsal,
  PILLAR_CONTEXT,
  type PillarConnection,
} from './shinsal'
import { GOD_CONTENT, withParticle } from './readingContent'

export interface ReadingChapter {
  title: string
  paragraphs: string[]
}
export interface ReadingReport {
  title: string
  lead: string[]
  chapters: ReadingChapter[]
}
export type PeriodKind = 'day' | 'month' | 'year' | 'luck'
export type PeriodReading = ReturnType<typeof readPillar>
const ELEMENT_LENS: Record<FiveElement, string> = {
  목: '목은 뻗어가고 자라는 모습에 빗대어 시작, 방향, 성장의 관점으로 읽어요. 내게 필요한 변화가 무엇인지 정하고 그것을 이어갈 조건까지 살피는 방식으로 활용할 수 있어요. 시작하는 일이 많다는 사실과 실제로 끝까지 이어갈 여건은 따로 확인해야 해요.',
  화: '화는 빛과 온기가 바깥으로 드러나는 모습에 빗대어 표현, 교류, 몰입의 관점으로 읽어요. 내 생각을 상대가 알아볼 수 있게 전하는 것과 상대의 반응을 받아들이는 과정을 함께 살펴볼 수 있어요. 표현을 잘하고 싶은 마음과 지금 사용할 수 있는 에너지를 나누어 생각해 보세요.',
  토: '토는 여러 것을 받아들이고 자리를 잡게 하는 모습에 빗대어 조율, 지속, 생활의 기반으로 읽어요. 서로 다른 요구를 연결하는 역할을 떠올릴 수 있지만, 모두를 만족시키려다 내 필요를 뒤로 미루고 있지는 않은지도 확인해 보세요.',
  금: '금은 형태를 다듬고 경계를 세우는 모습에 빗대어 기준, 선택, 정리의 관점으로 읽어요. 무엇을 유지하고 무엇을 줄일지 판단하는 데 적용해 볼 수 있어요. 기준을 세우는 일과 상황에 맞게 기준을 수정하는 일을 함께 놓고 살펴보면 해석이 한쪽으로 치우치지 않아요.',
  수: '수는 흐르고 모이는 모습에 빗대어 관찰, 생각, 유연한 대응의 관점으로 읽어요. 바로 반응하기 전에 정보를 모으는 태도와 상황이 바뀌면 방향을 조정하는 태도를 함께 살펴볼 수 있어요. 생각을 충분히 하는 것과 결정을 끝없이 미루는 것은 구분해 보세요.',
}
const POSITION_LENS: Record<PillarKey, string> = {
  year: '연주는 성장 배경과 바깥 관계를 돌아보는 자리로 읽을 수 있어요. 이미 주어진 환경에서 익힌 기준이 지금도 내게 필요한지, 처음 만난 사람 앞에서 어떤 역할을 맡는지 떠올려 보세요. 이 자리로 가족의 실제 성격이나 관계를 확정하지는 않아요.',
  month:
    '월주는 일, 사회생활, 반복되는 역할을 살펴보는 자리로 읽을 수 있어요. 조직에 속했을 때 어떤 기대를 받고 어떻게 대응하는지, 일상에서 책임과 자율성을 어떻게 나누는지 연결해 볼 수 있어요. 직업을 하나로 정하거나 적성을 판정하는 자리는 아니에요.',
  day: '일주는 나를 읽는 기준인 일간과 가까운 생활의 자리를 함께 두고 보는 기둥이에요. 특히 일지는 친밀한 관계와 일상에서 편안함을 느끼는 방식을 돌아보는 관점으로 활용해요. 상대방의 인격이나 배우자의 모습을 이 한 글자로 확정할 수는 없어요.',
  hour: '시주는 앞으로 만들고 싶은 일과 그 일을 마무리하는 방식에 연결해 볼 수 있어요. 장기적으로 남기고 싶은 결과, 혼자 세운 계획, 다음 단계의 준비를 떠올리며 읽어보세요. 이 자리만으로 자녀나 노후의 실제 사건을 예측하지 않아요.',
}

export function natalGodSources(chart: SajuChart) {
  return chart.cells.flatMap((cell) =>
    (
      [
        ['천간', cell.stem],
        ['지지', cell.branch],
      ] as const
    ).flatMap(([kind, character]) =>
      character.tenGod === '일간'
        ? []
        : [
            {
              position: cell.pillar,
              source: `${cell.title} ${kind}`,
              god: character.tenGod,
              character: character.ko,
              basis:
                kind === '천간'
                  ? `${cell.title} 천간 ${character.ko}(${character.hanja})의 오행·음양은 ${character.yinYang}${character.element}, 내 일간 ${withParticle(chart.dayMaster.stem, '은/는')} ${chart.dayMaster.yinYang}${withParticle(chart.dayMaster.element, '이에요/예요')}. 두 천간의 오행·음양 관계를 비교해 ${withParticle(character.tenGod, '으로/로')} 표시했어요.`
                  : `${cell.title} 지지 ${character.ko}(${character.hanja})의 대표 지장간을 내 일간 ${chart.dayMaster.label}에 대조한 관계가 ${withParticle(character.tenGod, '이에요/예요')}. 지장간은 지지 안에 담긴 천간을 뜻하고, 여기서는 그중 대표 글자만 사용해요. 나머지 지장간까지 종합한 결과는 아니에요.`,
            },
          ],
    ),
  )
}

export function tenGodChapters(
  chart: SajuChart,
  god: TenGod,
  source: string,
  basis: string,
  position?: PillarKey,
): ReadingChapter[] {
  const content = GOD_CONTENT[god]
  const matches = natalGodSources(chart).filter((s) => s.god === god)
  return [
    {
      title: '이 이름이 붙은 이유',
      paragraphs: [
        basis +
          (chart.yearMonthUncertain &&
          (position === 'year' || position === 'month')
            ? ' 이 자리는 출생일의 절기 경계 때문에 확인이 필요해요.'
            : ''),
        content.principle,
      ],
    },
    {
      title: `${source}에서 읽는 의미`,
      paragraphs: [
        position
          ? POSITION_LENS[position]
          : '지금 고른 운의 글자를 내 원국의 일간에 대조한 관계예요. 원국 자체가 바뀌거나 이 이름이 성격으로 새겨진다는 뜻은 아니에요. 선택한 기간에 돌아볼 관점으로 원국의 자리들과 함께 읽어보세요.',
        content.process,
      ],
    },
    { title: '일·공부에서 구체적으로', paragraphs: [content.work] },
    {
      title: '친한 사람·연인과의 관계에서',
      paragraphs: [content.relationship],
    },
    {
      title: '한쪽으로 치우칠 때 살펴볼 점',
      paragraphs: [content.balance, content.practice],
    },
    {
      title: '내 원국의 다른 자리와 함께 보기',
      paragraphs: [
        matches.length
          ? `내 원국에서 같은 ${god} 관계로 표시된 자리는 ${matches.map((s) => `${s.source} ${s.character}`).join(', ')}예요. 이름이 반복되어도 그 횟수를 성격의 강도나 운의 크기로 읽지는 않아요. 각 자리가 다루는 생활 맥락을 구분해서 비교해 보세요.`
          : `현재 표시된 원국의 천간과 지지 대표 관계에는 ${withParticle(god, '이/가')} 없어요. 이 관점이 내 삶에 없거나 해당 능력이 부족하다는 뜻은 아니에요. 선택한 운을 통해 살펴볼 질문으로 읽을 수 있어요.`,
        '이 글자 하나만으로 원국 전체를 결론 내리기보다, 실제 경험에 맞는 부분과 맞지 않는 부분을 구분해 보세요. 경험과 어긋난다면 설명에 나를 억지로 맞출 필요는 없어요.',
      ],
    },
  ]
}

function pairPerspective(first: TenGod, second: TenGod) {
  return first === second
    ? `두 자리 모두 ${withParticle(first, '으로/로')} 읽히지만 같은 설명을 두 번 붙이는 의미는 아니에요. ‘${TEN_GOD_READING[first].theme}’라는 관점을 서로 다른 생활 장면에 놓고 비교해 볼 수 있어요. 일할 때 편한 방식이 가까운 관계에서도 편한지, 상황에 따라 달라지는지 살펴보세요.`
    : `여기서는 ‘${TEN_GOD_READING[first].theme}’와 ‘${TEN_GOD_READING[second].theme}’라는 두 관점이 함께 등장해요. 한쪽이 다른 쪽을 없애는 관계로 읽지 않고, 어떤 상황에서 어느 요구가 앞서는지 살펴볼 수 있어요. 일을 처리할 때의 방식과 마음이 편해지는 조건이 다를 수도 있다는 질문으로 연결해 보세요.`
}
export function connectionChapters(
  connection: PillarConnection,
  chart: SajuChart,
): ReadingChapter[] {
  const positions = chart.cells.filter((c) =>
    connection.id.split('-').slice(0, 2).includes(c.pillar),
  )
  const clash = connection.title.endsWith('지지충')
  return [
    {
      title: '어느 자리끼리 연결되나요?',
      paragraphs: [
        connection.basis,
        positions
          .map(
            (c) =>
              `${c.title} ${c.stem.ko}${withParticle(c.branch.ko, '은/는')} 이 화면에서 ‘${PILLAR_CONTEXT[c.pillar]}’에 연결해 읽어요.`,
          )
          .join(' ') +
          (connection.transit
            ? ' 여기에 선택한 운의 글자를 대조하고 있어요. 운의 글자는 원국에 새로 추가된 출생 글자가 아니에요.'
            : ''),
      ],
    },
    {
      title: clash ? '다른 요구를 조율하는 방식' : '함께 놓고 살펴보는 방식',
      paragraphs: [
        connection.meaning,
        clash
          ? '예를 들어 맡은 일을 끝내고 싶은 요구와 가까운 사람과 약속한 시간을 지키고 싶은 요구가 동시에 있을 수 있어요. 어느 쪽이 잘못됐다고 판단하기 전에 각각 꼭 지켜야 할 조건을 확인해 보세요. 두 글자가 충이라는 사실만으로 실제 다툼이 발생한다고 볼 수는 없어요.'
          : '예를 들어 계획을 세우는 방식과 상대에게 설명하는 방식이 연결될 때, 혼자 정한 기준을 함께 실행할 수 있는 약속으로 바꿔볼 수 있어요. 합으로 묶이는 글자라도 실제 생활에서는 서로 다른 요구가 있을 수 있으므로 합의 과정은 따로 필요해요.',
      ],
    },
    {
      title: '생활에 옮겨보는 순서',
      paragraphs: [
        connection.example,
        clash
          ? '먼저 바꿀 수 없는 조건과 조정할 수 있는 조건을 나눠 적어보세요. 그다음 상대와 우선순위를 확인하고 작은 변경부터 시도해 보세요. 조율한 뒤 실제 부담이 줄었는지 살펴보는 과정까지 포함하면 단순한 주의 문구보다 도움이 될 수 있어요.'
          : '먼저 두 상황에서 공통으로 원하는 결과를 한 문장으로 정해보세요. 그다음 누가 무엇을 맡고 언제 다시 확인할지 이야기해 보세요. 글자 사이의 합 자체보다 실제로 만든 합의가 생활에 어떤 차이를 냈는지를 확인하는 것이 중요해요.',
        connection.uncertain
          ? '이 관계에는 절기 경계의 영향을 받는 기둥이 포함돼요. 출생시간이나 조회 시점을 확인하면 글자와 연결 관계가 달라질 수 있어요.'
          : '여기서는 성립한 글자 쌍만 확인했어요. 합화, 세력의 변화, 용신이나 신강·신약까지 계산한 설명은 아니에요.',
      ],
    },
  ]
}

export function natalNarrative(chart: SajuChart): ReadingReport {
  const day = chart.cells.find((c) => c.pillar === 'day')!
  const month = chart.cells.find((c) => c.pillar === 'month')!
  const hour = chart.cells.find((c) => c.pillar === 'hour')
  const monthGod = month.stem.tenGod as TenGod
  const dayGod = day.branch.tenGod as TenGod
  const elements = Object.entries(chart.elements) as [FiveElement, number][]
  const total = elements.reduce((sum, [, n]) => sum + n, 0)
  const max = Math.max(...elements.map(([, n]) => n))
  const frequent = elements.filter(([, n]) => n === max).map(([e]) => e)
  const missing = elements.filter(([, n]) => n === 0).map(([e]) => e)
  const connections = analyzeShinsal(chart).connections
  return {
    title: '내 사주, 근거부터 깊이 읽기',
    lead: [
      ...(!chart.hourKnown
        ? [
            '출생시간이 없어 시주는 미상이에요. 시주의 성향이나 다른 자리와의 연결을 임의로 만들지 않고 확인된 여섯 글자부터 읽어요.',
          ]
        : []),
      ...(chart.yearMonthUncertain
        ? [
            '출생일이 절기 경계여서 정오 기준으로 표시한 연주·월주는 확인이 필요해요. 그 자리의 십성, 오행 분포, 연결 설명도 출생시간에 따라 달라질 수 있어요.',
          ]
        : []),
      `이 풀이의 출발점은 일주 ${chart.pillars.day}의 위 글자인 ${withParticle(chart.dayMaster.label, '이에요/예요')}. 같은 ${chart.dayMaster.element} 일간이라도 나머지 글자와 자리가 다르면 함께 읽는 내용이 달라져요. 아래에서는 월주 ${chart.pillars.month}, 일지 ${day.branch.ko}${hour ? `, 시주 ${chart.pillars.hour}` : ''}를 실제 계산된 관계에 따라 차례로 연결해 볼게요.`,
      `먼저 일·사회생활을 읽는 월주 천간의 ${monthGod}, 가까운 생활을 읽는 일지의 ${withParticle(dayGod, '을/를')} 구분해 보세요. ${pairPerspective(monthGod, dayGod)}`,
    ],
    chapters: [
      {
        title: '1. 나를 읽는 기준: 일간과 일주',
        paragraphs: [
          `내 일간은 ${chart.dayMaster.yinYang}의 ${chart.dayMaster.element}인 ${withParticle(chart.dayMaster.label, '이에요/예요')}. 일간은 사주 안에서 다른 글자의 관계를 비교하는 기준점이고, 일주는 이 일간과 지지 ${withParticle(day.branch.ko, '을/를')} 합친 ${withParticle(chart.pillars.day, '을/를')} 말해요. 그래서 일간의 이미지와 일주 전체의 설명은 구분해서 읽어야 해요.`,
          ELEMENT_LENS[chart.dayMaster.element],
          `일지 ${withParticle(day.branch.ko, '은/는')} 대표 지장간을 기준으로 ${dayGod}에 해당해요. ‘${TEN_GOD_READING[dayGod].theme}’라는 관점을 가까운 생활에 연결해 볼 수 있어요. ${GOD_CONTENT[dayGod].process}`,
        ],
      },
      {
        title: '2. 일할 때의 나와 가까운 관계의 나',
        paragraphs: [
          `월주 ${chart.pillars.month}의 천간 ${withParticle(month.stem.ko, '은/는')} 내 일간과 비교하면 ${withParticle(monthGod, '이에요/예요')}. 월주를 일·사회생활의 역할로 읽을 때 이 관계를 참고할 수 있어요. ${chart.yearMonthUncertain ? '출생시간 미상인 절기 경계일이므로 이 월주 해석은 확인이 필요해요.' : ''}`,
          GOD_CONTENT[monthGod].work,
          `반면 일지 ${day.branch.ko}의 ${withParticle(dayGod, '은/는')} 친밀한 관계를 돌아보는 관점으로 읽어볼 수 있어요. ${GOD_CONTENT[dayGod].relationship}`,
          pairPerspective(monthGod, dayGod),
        ],
      },
      {
        title: '3. 네 기둥은 서로 다른 질문을 담아요',
        paragraphs: chart.cells.map(
          (c) =>
            `${c.title} ${c.stem.ko}${c.branch.ko} · ${POSITION_LENS[c.pillar]} ${c.pillar === 'day' ? '천간은 나를 비교하는 기준인 일간이고' : `천간은 ${c.stem.tenGod}이고`}, 지지 대표 관계는 ${withParticle(c.branch.tenGod, '이에요/예요')}. 이 둘을 같은 자리 안에서 따로 읽은 뒤 실제 경험에 대조해 보세요.${chart.yearMonthUncertain && (c.pillar === 'month' || c.pillar === 'year') ? ' 이 기둥은 절기 경계로 확인이 필요해요.' : ''}`,
        ),
      },
      {
        title: '4. 계획을 세우고 마무리하는 모습',
        paragraphs: hour
          ? [
              `시주 ${chart.pillars.hour}의 천간 ${withParticle(hour.stem.ko, '은/는')} ${hour.stem.tenGod}, 지지 ${hour.branch.ko}의 대표 관계는 ${withParticle(hour.branch.tenGod, '이에요/예요')}. ${POSITION_LENS.hour}`,
              GOD_CONTENT[hour.stem.tenGod as TenGod].work,
              `계획이 길어질 때는 다음 관점도 함께 살펴보세요. ${GOD_CONTENT[hour.branch.tenGod as TenGod].balance}`,
            ]
          : [
              '출생시간이 없어 시주의 천간·지지와 그 관계를 산출하지 않았어요. 다른 기둥으로 시주를 대신 채우거나 정오에 태어났다고 가정해 계획·말년의 풀이를 만들지 않아요.',
              '지금은 월주의 일·사회생활 관점과 일지의 친밀한 생활 관점을 먼저 읽어보세요. 나중에 출생시간을 확인하면 네 기둥의 연결을 다시 살펴볼 수 있어요. 시간이 없다고 삶의 계획이나 가능성이 부족하다는 뜻은 아니에요.',
            ],
      },
      {
        title: '5. 오행 개수와 실제 해석을 구별하기',
        paragraphs: [
          `현재 보이는 ${total}글자는 ${elements.map(([e, n]) => `${e} ${n}개`).join(', ')}예요. ${withParticle(frequent.join('·'), '이/가')} ${max}개씩으로 가장 많이 보여요.${frequent.length > 1 ? ' 가장 많은 오행이 여러 개여서 모두 함께 표시했어요.' : ''} 이 수는 천간·지지에 보이는 글자를 센 값으로, 오행의 실제 세력이나 능력 점수가 아니에요.`,
          `내 기준인 ${chart.dayMaster.element}과 눈에 많이 보이는 ${withParticle(frequent.join('·'), '은/는')} 서로 다른 정보예요. 일간은 비교의 기준이고, 분포는 전체 글자의 구성이에요. 계절의 작용, 지장간 전체, 통근과 조후 등을 종합하지 않았기 때문에 이 개수로 신강·신약이나 용신을 정하지 않아요.`,
          missing.length
            ? `${withParticle(missing.join('·'), '은/는')} 현재 보이는 글자에 없어요. 그렇다고 그 오행에 빗댄 성향이나 능력이 없다는 뜻은 아니에요. 생활에서 해당 역할을 어떻게 배우고 실천하는지 보는 질문으로만 활용해 보세요.${!chart.hourKnown ? ' 시주가 미상이므로 시간을 알면 이 분포도 달라질 수 있어요.' : ''}`
            : '현재 보이는 글자에 다섯 오행이 모두 있어요. 모두 있다는 사실이 자동으로 균형 잡힌 사주라는 결론을 뜻하지는 않아요. 실제 생활의 균형은 행동, 환경, 관계를 함께 살펴야 해요.',
        ],
      },
      {
        title: '6. 다른 기둥과 연결해서 읽는 순서',
        paragraphs: connections.length
          ? [
              `원국에서 확인된 연결은 ${withParticle(connections.map((c) => c.title).join(', '), '이에요/예요')}. 합·충은 어떤 두 글자가 대응표에 해당하는지 확인한 결과예요. 신살이 함께 있다는 사실과는 계산 근거가 달라요.`,
              connections[0].basis,
              connections[0].meaning,
              `이 연결부터 살펴볼 때는 이렇게 적용해 보세요. ${connections[0].example} 나머지 연결의 실제 위치와 근거는 아래 만세력의 ‘기둥 사이의 연결’에서 각각 펼쳐볼 수 있어요.`,
            ]
          : [
              '현재 원국의 글자 쌍에서는 이 서비스가 계산하는 천간합·지지육합·지지충이 확인되지 않았어요. 관계가 단순하다거나 다른 작용이 없다는 뜻은 아니에요. 형·파·해·삼합 등을 모두 종합한 계산은 하지 않았어요.',
              '관계를 억지로 만들어 설명하기보다 지금 확인되는 각 기둥의 십성부터 읽어보세요. 서로 다른 자리에서 어떤 관점이 반복되고 어떤 관점이 달라지는지 실제 경험에 대조하는 방식으로 연결할 수 있어요.',
            ],
      },
    ],
  }
}

const PERIOD_CONTEXT: Record<
  PeriodKind,
  {
    title: string
    frame: string
    work: string
    relationship: string
    review: string
  }
> = {
  day: {
    title: '일운',
    frame:
      '하루는 연락 한 번, 일정 하나, 오늘 마무리할 일처럼 작고 가까운 선택을 살펴보는 단위예요. 장기적인 인생 방향을 하루의 글자로 정하지 않고 오늘 실제로 마주한 상황에 적용해 보세요.',
    work: '오늘 이미 잡힌 일 중 하나에만 적용해 보세요. 새 계획을 크게 벌이기보다 지금 진행하는 일의 방식이나 순서를 조금 바꾸고, 끝난 뒤 그 변화가 도움이 됐는지 확인하는 편이 좋아요.',
    relationship:
      '오늘 나눌 대화 하나를 떠올려 보세요. 상대의 반응을 운세에 맞춰 예상하기보다 내가 어떤 말로 시작하고 어떤 질문을 할지 구체화해 보세요.',
    review:
      '하루를 마칠 때 실제로 있었던 상황, 내가 한 행동, 상대나 환경의 반응을 구분해 적어보세요. 설명과 다른 일이 생겼다고 특별한 이유를 붙일 필요는 없어요.',
  },
  month: {
    title: '월운',
    frame:
      '월운은 하루의 기분보다 반복되는 생활 방식과 업무 흐름을 살펴보는 단위로 읽어요. 이 달력 달 전체에 하나의 간지가 고정되는 것은 아니고, 선택한 날짜가 속한 절기 구간의 월주를 사용해요.',
    work: '같은 어려움이 여러 번 반복되는지 살펴보세요. 이번 주에 한 가지 방식을 정해 시도하고 다음 주에 실제 부담과 결과를 확인하는 식으로 적용할 수 있어요. 달이 바뀌었다는 이유로 모든 계획을 바꿀 필요는 없어요.',
    relationship:
      '한 번의 답장보다 반복되는 약속 방식과 연락 기대를 돌아보세요. 자주 서운해지는 장면이 있다면 서로 어떤 기준을 당연하게 생각했는지 이야기해 보고, 잠시 적용할 합의를 정해볼 수 있어요.',
    review:
      '주별로 무엇을 시도했고 무엇이 달라졌는지 기록해 보세요. 생활 조건이 바뀐 영향과 내가 바꾼 행동의 영향을 구분하면 다음 달에도 유지할 습관을 고르기 쉬워져요.',
  },
  year: {
    title: '연운',
    frame:
      '연운은 한 해 동안 중요하게 두고 싶은 방향과 우선순위를 돌아보는 단위로 읽어요. 계산상 새해는 양력 1월 1일이 아니라 입춘에서 바뀌어요. 한 해의 모든 사건이 이 한 기둥으로 설명되는 것은 아니에요.',
    work: '지속할 목표와 줄일 부담을 함께 정리해 보세요. 큰 목표를 분기나 월 단위로 나누고 실제 시간과 자원을 확인하면서 수정할 수 있어요. 이 글자만으로 이직, 투자, 중요한 계약의 성패를 결정하지 않아요.',
    relationship:
      '한 해에 관계에서 지키고 싶은 원칙과 바꾸고 싶은 습관을 각각 하나씩 골라보세요. 특정한 만남이 예정됐다고 생각하기보다 내가 유지할 연락, 약속, 대화의 방식을 계획하는 데 활용해 볼 수 있어요.',
    review:
      '몇 달 간격으로 우선순위를 다시 확인해 보세요. 환경이나 마음이 바뀌었다면 계획을 수정할 수 있어요. 처음 읽은 설명을 증명하려고 실제 경험을 한 방향으로 해석하지 않는 것이 중요해요.',
  },
  luck: {
    title: '선택한 대운',
    frame:
      '대운은 전통 계산에서 약 10년 간격의 간지를 살펴보는 틀이에요. 여기서는 선택한 구간의 글자를 원국과 비교하며, 시작 나이 표시는 반올림된 근사 구간이에요. 열 해 내내 같은 경험을 하거나 같은 성격으로 지낸다는 의미는 아니에요.',
    work: '장기적으로 쌓고 싶은 역량과 유지하고 싶은 생활 조건을 나눠 생각해 보세요. 과거 구간을 고르면 실제 경험과 비교하고, 미래 구간을 고르면 다양한 선택지를 점검하는 질문으로 읽을 수 있어요. 직업이나 성과가 예정됐다고 해석하지 않아요.',
    relationship:
      '긴 기간의 관계를 볼 때는 특정 사람과 만날지보다 내가 반복하는 소통 방식과 기대가 어떻게 달라졌는지 살펴보세요. 실제로 겪지 않은 구간은 사건 예측 대신 어떤 관계를 만들고 싶은지 생각하는 계기로 활용해 보세요.',
    review:
      '표에 표시된 나이는 계산상의 근사치예요. 전환 시점에 가까우면 정확한 시작 시각과 실제 생활의 변화를 구분해서 확인해야 해요. 대운 하나로 원국이나 선택한 날짜의 모든 의미를 덮어쓰지 않아요.',
  },
}
export function periodNarrative(
  chart: SajuChart,
  reading: PeriodReading,
  kind: PeriodKind,
  contextLabel: string,
  uncertain = false,
): ReadingReport {
  const context = PERIOD_CONTEXT[kind]
  const stem = reading.label[0] as Pillar['heavenlyStem']
  const a = GOD_CONTENT[reading.stemGod],
    b = GOD_CONTENT[reading.branchGod]
  const matches = natalGodSources(chart).filter(
    (s) => s.god === reading.stemGod || s.god === reading.branchGod,
  )
  const connections = analyzeShinsal(chart, undefined, {
    label: reading.label,
    title: context.title,
    uncertain,
  }).connections.filter((c) => c.transit)
  return {
    title: `${context.title}, 내 원국과 자세히 읽기`,
    lead: [
      ...(chart.yearMonthUncertain
        ? [
            '출생 원국의 연주·월주가 절기 경계에 걸려 있어 확인이 필요해요. 그 기둥과 비교하는 위치·합충도 정확한 출생시간에 따라 달라질 수 있어요.',
          ]
        : []),
      `${contextLabel}에 살펴보는 ${withParticle(context.title, '은/는')} ${withParticle(reading.label, '이에요/예요')}. 내 일간 ${withParticle(chart.dayMaster.label, '을/를')} 기준으로 천간 ${withParticle(stem, '은/는')} ${reading.stemGod}, 지지 ${reading.label[1]}의 대표 관계는 ${withParticle(reading.branchGod, '으로/로')} 읽어요. 원국 ${withParticle(chart.pillars.day, '이/가')} 바뀐 것이 아니라 바깥의 시간 글자를 내 원국에 대조한 결과예요.`,
      `${pairPerspective(reading.stemGod, reading.branchGod)} ${uncertain ? '선택한 날이 절기 경계여서 아래 글자와 연결은 정오 기준의 참고값이에요. 절입 전후에는 달라질 수 있어요.' : ''}`,
    ],
    chapters: [
      {
        title: '1. 이 기간을 읽는 범위',
        paragraphs: [context.frame, context.work, context.review],
      },
      {
        title: `2. 천간 ${stem}의 ${reading.stemGod}: 왜 이런 설명인가요?`,
        paragraphs: [
          `내 일간 ${withParticle(chart.dayMaster.stem, '은/는')} ${chart.dayMaster.yinYang}${chart.dayMaster.element}, 선택한 운의 천간 ${withParticle(stem, '은/는')} ${getHeavenlyStemYinYang(stem)}${withParticle(getHeavenlyStemElement(stem), '이에요/예요')}. 이 오행·음양 관계에 붙인 이름이 ${withParticle(reading.stemGod, '이에요/예요')}.`,
          a.principle,
          a.process,
        ],
      },
      {
        title: `3. 지지 ${reading.label[1]}의 ${reading.branchGod}까지 함께 읽기`,
        paragraphs: [
          `지지 안에는 지장간이라고 부르는 천간들이 담긴 것으로 해석해요. 여기서는 ${reading.label[1]}의 대표 지장간과 내 일간을 비교해 ${withParticle(reading.branchGod, '으로/로')} 표시했어요. 천간의 ${reading.stemGod}과 지지의 ${withParticle(reading.branchGod, '은/는')} 서로 다른 비교에서 나온 것이므로 한쪽만 보고 기간 전체를 결론 내리지 않아요.`,
          b.principle,
          b.balance,
          pairPerspective(reading.stemGod, reading.branchGod),
        ],
      },
      {
        title: '4. 일·공부·관계에서 어떻게 적용하나요?',
        paragraphs: [
          a.work,
          context.relationship,
          b.relationship,
          `작게 실행해 보기 · ${a.practice}`,
        ],
      },
      {
        title: '5. 내 원국의 어느 자리와 연결되나요?',
        paragraphs: [
          matches.length
            ? `내 원국에서 이번 운과 같은 십성 이름을 찾으면 ${matches.map((s) => `${s.source} ${s.character}의 ${s.god}`).join(', ')}가 있어요. 같은 이름이 있다는 것은 비교할 관점이 겹친다는 뜻이지, 효과가 배가되거나 특정 사건이 생긴다는 의미는 아니에요.`
            : '현재 보이는 원국의 천간·지지 대표 관계에서는 이번 운과 같은 십성 이름이 없어요. 새로운 운의 글자를 비교해 볼 수 있다는 뜻이며, 원국에 어떤 능력이 빠져 있다는 결론은 아니에요.',
          connections.length
            ? `글자 쌍을 직접 비교하면 ${withParticle(connections.map((c) => c.title).join(', '), '이/가')} 성립해요. ${connections[0].basis} ${connections[0].meaning}`
            : '이번 운과 원국 사이에서 이 서비스가 계산하는 천간합·지지육합·지지충은 확인되지 않았어요. 확인되지 않은 관계를 만들어 풀이하지 않아요. 다른 모든 관계가 없다는 뜻도 아니에요.',
          connections.length
            ? `첫 연결을 생활에 옮겨보면: ${connections[0].example} 각각의 다른 연결과 신살은 아래 표에서 따로 눌러 근거를 확인할 수 있어요.`
            : `글자 사이의 합충이 없더라도 ${reading.stemGod}과 ${reading.branchGod}의 두 관점을 실제 생활에 각각 대조해 볼 수 있어요.`,
          chart.yearMonthUncertain
            ? '내 출생 원국의 연주·월주도 절기 경계로 확인이 필요한 상태예요. 그 기둥에서 나온 같은 십성 위치와 연결은 정확한 출생시간에 따라 달라질 수 있어요.'
            : '원국의 자리는 출생정보에서, 운의 자리는 조회한 기간에서 나온 값이에요. 실제로 발생한 사건의 원인을 이 대응표만으로 설명할 수는 없어요.',
        ],
      },
      {
        title: '6. 지나간 뒤 무엇을 돌아보면 좋을까요?',
        paragraphs: [
          a.balance,
          context.review,
          '기록할 때는 맞았던 사례만 모으기보다 맞지 않았던 부분도 함께 남겨보세요. 사주 해석을 확인받으려는 기록보다 내가 어떤 선택을 했고 무엇을 배웠는지 알아보는 기록이 자기이해에 도움이 될 수 있어요.',
        ],
      },
    ],
  }
}
