import type { PillarKey, SajuChart } from './saju'

// Traditional lookup facts, independently implemented. Scope and research: docs/dating/08-pillars-shinsal.md.
export const SHINSAL = {
  천을귀인: {
    theme: '도움을 구하는 연결',
    meaning: '어려운 일을 혼자 떠안기보다 조언과 협력을 떠올리는 상징이에요.',
    example:
      '답이 안 나오는 일을 만났다면 상황과 시도한 방법을 적어 믿을 만한 사람에게 구체적으로 물어보세요.',
  },
  문창귀인: {
    theme: '배우고 표현하는 시간',
    meaning: '생각을 글이나 말로 정리하고 배우는 모습에 붙이는 이름이에요.',
    example:
      '회의 전에 핵심을 세 문장으로 써보세요. 전달하려던 뜻과 상대가 이해한 뜻을 비교해 볼 수 있어요.',
  },
  천덕귀인: {
    theme: '넓게 살펴보는 여유',
    meaning:
      '배려와 도움의 여지를 살피는 상징이에요. 어려움을 없애 준다는 보장은 아니에요.',
    example:
      '의견이 부딪힐 때 바로 결론을 내리기보다 상대의 사정을 한 가지 더 물어보세요.',
  },
  월덕귀인: {
    theme: '관계를 조율하는 도움',
    meaning: '주변 사람과 조율하고 협력할 가능성을 돌아보는 이름이에요.',
    example:
      '일정이 밀렸다면 책임을 따지기 전에 각자 가능한 시간을 확인하고 역할을 다시 나눠보세요.',
  },
  양인살: {
    theme: '힘을 쓰는 방식',
    meaning:
      '강한 추진력과 자기 기준을 상징해요. 공격적인 사람이라는 판정은 아니에요.',
    example:
      '급히 밀어붙이고 싶을 때 내가 결정할 부분과 상대의 동의가 필요한 부분을 나눠보세요.',
  },
  백호대살: {
    theme: '몰입의 속도를 살피기',
    meaning:
      '강한 집중과 결단을 돌아보는 상징으로 읽어요. 이름으로 사고·질병·폭력을 예측할 수 없어요.',
    example:
      '마감에 몰입해 속도가 붙었다면 중간 점검 시간을 먼저 잡아보세요. 중요한 결정은 한 번 더 확인해도 좋아요.',
  },
  괴강살: {
    theme: '뚜렷한 기준과 유연함',
    meaning:
      '원칙과 결단을 상징하는 간지 묶음이에요. 타고난 인격을 단정하지 않아요.',
    example:
      '내 방식이 분명할수록 함께 일하는 사람에게 바꿀 수 있는 조건도 알려주세요.',
  },
  겁살: {
    theme: '경계와 자원 점검',
    meaning: '내 시간과 자원을 어디까지 내어줄지 돌아보는 상징이에요.',
    example:
      '갑자기 부탁을 받았다면 가능한 범위와 기한부터 말해보세요. 손실이 생긴다는 예고는 아니에요.',
  },
  재살: {
    theme: '제약 속에서 방법 찾기',
    meaning: '규칙이나 제약에 어떻게 대응하는지 살피는 이름이에요.',
    example:
      '진행이 막혔다면 필요한 절차와 도움을 받을 담당자를 적어보세요. 처벌이나 범죄를 뜻하지 않아요.',
  },
  천살: {
    theme: '내가 바꿀 수 있는 것',
    meaning: '내 힘 밖의 조건과 조절할 수 있는 행동을 나눠보는 상징이에요.',
    example:
      '날씨 때문에 약속이 걱정된다면 실내 대안을 정해두세요. 재난을 예고하는 표시는 아니에요.',
  },
  지살: {
    theme: '새 환경에 적응하기',
    meaning: '낯선 환경을 경험하고 생활 반경을 넓히는 모습으로 읽어요.',
    example:
      '새 모임에 간다면 첫날부터 잘하려 하기보다 장소와 분위기를 익히는 작은 목표를 잡아보세요.',
  },
  연살: {
    theme: '눈길과 표현 · 도화',
    meaning:
      '사람들의 관심과 나를 드러내는 방식을 돌아보는 상징이에요. 도화살이라고도 불러요.',
    example:
      '소개 자리에서 잘 보이려 애쓰기보다 좋아하는 것 한 가지를 구체적으로 이야기해 보세요.',
  },
  월살: {
    theme: '잠시 멈추고 재정비',
    meaning: '답답함을 느낄 때 정리와 휴식을 떠올리는 이름이에요.',
    example:
      '할 일이 손에 안 잡힌다면 오늘 끝낼 한 가지와 내일로 미룰 일을 구분해 보세요.',
  },
  망신살: {
    theme: '보여지는 말과 행동',
    meaning: '말과 행동이 다른 사람에게 어떻게 전달되는지 돌아보는 상징이에요.',
    example:
      '여럿이 보는 대화방에서는 보내기 전에 표현을 한 번 읽어보세요. 실제 망신을 당한다는 뜻은 아니에요.',
  },
  장성살: {
    theme: '주도할 때의 책임',
    meaning: '중심을 잡고 일을 이끄는 역할을 살펴보는 이름이에요.',
    example:
      '모임을 주도한다면 정답부터 말하기보다 각자의 선호를 먼저 묻고 선택지를 정리해 보세요.',
  },
  반안살: {
    theme: '자리 잡고 다음 준비',
    meaning: '익숙한 기반을 활용해 다음 단계를 준비하는 상징이에요.',
    example:
      '잘 되고 있는 습관 하나를 고르고, 새 목표를 그 습관 뒤에 작게 붙여보세요.',
  },
  역마살: {
    theme: '이동과 변화의 리듬',
    meaning: '장소·역할·활동이 달라질 때의 적응을 돌아보는 상징이에요.',
    example:
      '새 활동을 시작하고 싶다면 짧게 체험해 본 뒤 계속할지 정해보세요. 이사나 이별이 예정됐다는 뜻은 아니에요.',
  },
  육해살: {
    theme: '부담을 나누는 방식',
    meaning: '쌓인 부담과 서로 기대는 방식을 점검하는 이름이에요.',
    example:
      '부탁이 겹쳤다면 혼자 해결하지 말고 누구와 무엇을 나눌 수 있을지 적어보세요. 질병을 판단하지 않아요.',
  },
  화개살: {
    theme: '혼자 깊이 익히기',
    meaning: '생각을 모으고 취향이나 배움을 깊게 다루는 상징이에요.',
    example:
      '혼자 정리하는 시간이 필요하다면 상대에게 언제 다시 이야기할지 알려주세요. 고립될 운명이라는 뜻은 아니에요.',
  },
} as const
export type ShinsalName = keyof typeof SHINSAL
export interface ShinsalOptions {
  twelveBase: 'year' | 'day'
  baekhoScope: 'all' | 'day'
}
export const DEFAULT_SHINSAL_OPTIONS: ShinsalOptions = {
  twelveBase: 'year',
  baekhoScope: 'all',
}
export interface TransitPillar {
  label: string
  title: string
  uncertain?: boolean
}
export interface ShinsalHit {
  id: string
  name: ShinsalName
  position: PillarKey | 'transit'
  title: string
  label: string
  basis: string
  uncertain: boolean
}
interface Target {
  position: ShinsalHit['position']
  title: string
  label: string
  uncertain: boolean
}
export interface PillarConnection {
  id: string
  title: string
  basis: string
  meaning: string
  example: string
  uncertain: boolean
  transit: boolean
}
const BRANCHES = '자축인묘진사오미신유술해'
const STEMS = '갑을병정무기경신임계'
const NOBLE: Record<string, string> = {
  갑: '축미',
  을: '자신',
  병: '해유',
  정: '해유',
  무: '축미',
  기: '자신',
  경: '축미',
  신: '인오',
  임: '묘사',
  계: '묘사',
}
const LITERARY: Record<string, string> = {
  갑: '사',
  을: '오',
  병: '신',
  정: '유',
  무: '신',
  기: '유',
  경: '해',
  신: '자',
  임: '인',
  계: '묘',
}
const BLADE: Record<string, string> = {
  갑: '묘',
  병: '오',
  무: '오',
  경: '유',
  임: '자',
}
// Mixed stem/branch table: 辛(천간 신) must never be confused with 申(지지 신).
const HEAVEN: Record<string, readonly ['천간' | '지지', string]> = {
  인: ['천간', '정'],
  묘: ['지지', '신'],
  진: ['천간', '임'],
  사: ['천간', '신'],
  오: ['지지', '해'],
  미: ['천간', '갑'],
  신: ['천간', '계'],
  유: ['지지', '인'],
  술: ['천간', '병'],
  해: ['천간', '을'],
  자: ['지지', '사'],
  축: ['천간', '경'],
}
const WHITE_TIGER = ['갑진', '을미', '병술', '정축', '무진', '임술', '계축']
const STRONG = ['경진', '경술', '임진', '무술']
const TWELVE: ShinsalName[] = [
  '겁살',
  '재살',
  '천살',
  '지살',
  '연살',
  '월살',
  '망신살',
  '장성살',
  '반안살',
  '역마살',
  '육해살',
  '화개살',
]
const GROUPS = [
  { branches: '인오술', start: '해', moon: '병' },
  { branches: '사유축', start: '인', moon: '경' },
  { branches: '신자진', start: '사', moon: '임' },
  { branches: '해묘미', start: '신', moon: '갑' },
]
export const PILLAR_CONTEXT: Record<PillarKey, string> = {
  year: '성장 배경과 바깥 관계',
  month: '일과 사회생활의 역할',
  day: '내 선택과 가까운 관계',
  hour: '앞으로의 계획과 마무리',
}
const validLabel = (label: string) =>
  label.length === 2 &&
  STEMS.includes(label[0]) &&
  BRANCHES.includes(label[1]) &&
  STEMS.indexOf(label[0]) % 2 === BRANCHES.indexOf(label[1]) % 2

export function analyzeShinsal(
  chart: SajuChart,
  options: ShinsalOptions = DEFAULT_SHINSAL_OPTIONS,
  transit?: TransitPillar,
) {
  if (
    !chart.cells.every((c) => validLabel(c.stem.ko + c.branch.ko)) ||
    !validLabel(chart.pillars.day) ||
    !validLabel(chart.pillars.month) ||
    !validLabel(chart.pillars.year) ||
    (transit && !validLabel(transit.label))
  )
    throw new Error('간지 정보를 확인해 주세요.')
  const dayStem = chart.pillars.day[0],
    monthBranch = chart.pillars.month[1]
  const anchor = chart.pillars[options.twelveBase][1]
  const group = GROUPS.find((g) => g.branches.includes(anchor))!
  const monthGroup = GROUPS.find((g) => g.branches.includes(monthBranch))!
  const targets: Target[] = chart.cells
    .filter((c) => c.pillar !== 'hour' || chart.hourKnown)
    .map((c) => ({
      position: c.pillar,
      title: c.title,
      label: c.stem.ko + c.branch.ko,
      uncertain:
        chart.yearMonthUncertain &&
        (c.pillar === 'year' || c.pillar === 'month'),
    }))
  if (transit)
    targets.push({
      position: 'transit',
      title: transit.title,
      label: transit.label,
      uncertain: !!transit.uncertain,
    })
  const hits: ShinsalHit[] = []
  for (const t of targets) {
    const stem = t.label[0],
      branch = t.label[1]
    const add = (name: ShinsalName, basis: string, anchorUncertain = false) =>
      hits.push({
        ...t,
        id: `${t.position}-${name}`,
        name,
        basis,
        uncertain: t.uncertain || anchorUncertain,
      })
    if (NOBLE[dayStem].includes(branch))
      add(
        '천을귀인',
        `내 일간 ${dayStem} → ${NOBLE[dayStem].split('').join('·')} 지지 중 ${t.title}의 ${branch}에 해당해요.`,
      )
    if (LITERARY[dayStem] === branch)
      add(
        '문창귀인',
        `내 일간 ${dayStem} → 문창 지지 ${branch}, ${t.title} 지지와 같아요.`,
      )
    if (BLADE[dayStem] === branch)
      add(
        '양인살',
        `양간 일간 ${dayStem} → ${branch} 지지 기준이에요. 음간의 양인은 이 방식에서 산출하지 않아요.`,
      )
    const [kind, expected] = HEAVEN[monthBranch]
    if ((kind === '천간' ? stem : branch) === expected)
      add(
        '천덕귀인',
        `내 월지 ${monthBranch} → ${kind} ${expected}, ${t.title} ${kind}과 같아요.`,
        chart.yearMonthUncertain,
      )
    if (stem === monthGroup.moon)
      add(
        '월덕귀인',
        `내 월지 ${monthBranch}의 ${monthGroup.branches.split('').join('·')} 묶음 → 천간 ${stem}, ${t.title} 천간과 같아요.`,
        chart.yearMonthUncertain,
      )
    if (
      (options.baekhoScope === 'all' || t.position === 'day') &&
      WHITE_TIGER.includes(t.label)
    )
      add(
        '백호대살',
        `${t.title} ${t.label}이 백호의 일곱 간지(갑진·을미·병술·정축·무진·임술·계축)에 해당해요. ${options.baekhoScope === 'all' ? '네 기둥·운의 간지까지 대조하는 확장 방식이에요.' : '원국 일주만 대조했어요.'}`,
      )
    if (t.position === 'day' && STRONG.includes(t.label))
      add(
        '괴강살',
        `일주 ${t.label}을 경진·경술·임진·무술 네 간지 기준으로 대조했어요. 다른 학파의 목록과 다를 수 있어요.`,
      )
    const sal =
      TWELVE[
        (BRANCHES.indexOf(branch) - BRANCHES.indexOf(group.start) + 12) % 12
      ]
    add(
      sal,
      `내 ${options.twelveBase === 'year' ? '연지' : '일지'} ${anchor}의 ${group.branches.split('').join('·')} 묶음에서 겁살은 ${group.start}부터 시작해요. ${t.title} 지지 ${branch}의 순서가 ${sal}이에요.`,
      options.twelveBase === 'year' && chart.yearMonthUncertain,
    )
  }
  const connections: PillarConnection[] = []
  for (let i = 0; i < targets.length; i++)
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i],
        b = targets[j]
      for (const rule of [
        {
          kind: '천간합',
          index: 0,
          pairs: ['갑기', '을경', '병신', '정임', '무계'],
          meaning:
            '서로 다른 방식을 연결해 보는 관점이에요. 다른 오행으로 변했다거나 좋은 결과가 보장된다는 뜻은 아니에요.',
          example:
            '함께 결정할 일이 있다면 각자 원하는 것을 적고 공통으로 지킬 조건 한 가지를 정해보세요.',
        },
        {
          kind: '지지육합',
          index: 1,
          pairs: ['자축', '인해', '묘술', '진유', '사신', '오미'],
          meaning:
            '함께 묶어 살피는 지지 조합이에요. 관계가 무조건 잘 맞는다는 판정은 아니에요.',
          example:
            '생활 리듬을 맞출 때 서로 편한 시간과 쉬고 싶은 시간을 먼저 확인해 보세요.',
        },
        {
          kind: '지지충',
          index: 1,
          pairs: ['자오', '축미', '인신', '묘유', '진술', '사해'],
          meaning:
            '다른 방향의 요구를 조율하는 관점이에요. 갈등이나 이별이 일어난다는 예언은 아니에요.',
          example:
            '하고 싶은 일과 이미 잡힌 약속이 겹친다면 우선순위와 바꿀 수 있는 시간을 미리 이야기해 보세요.',
        },
      ]) {
        const pair = a.label[rule.index] + b.label[rule.index]
        if (
          rule.pairs.includes(pair) ||
          rule.pairs.includes([...pair].reverse().join(''))
        )
          connections.push({
            id: `${a.position}-${b.position}-${rule.kind}`,
            title: `${a.title} ↔ ${b.title} · ${rule.kind}`,
            basis: `${a.title} ${a.label}의 ${pair[0]}과 ${b.title} ${b.label}의 ${pair[1]}을 대조했어요.`,
            meaning: rule.meaning,
            example: rule.example,
            uncertain: a.uncertain || b.uncertain,
            transit: b.position === 'transit',
          })
      }
    }
  return {
    natalHits: hits.filter((h) => h.position !== 'transit'),
    transitHits: hits.filter((h) => h.position === 'transit'),
    connections,
    together: togetherReadings(hits),
  }
}

export function togetherReadings(hits: ShinsalHit[]) {
  const pairs: {
    a: ShinsalName
    b: ShinsalName
    meaning: string
    example: string
  }[] = [
    {
      a: '천을귀인',
      b: '백호대살',
      meaning:
        '도움을 구하는 관점과 몰입의 속도를 살피는 관점을 함께 놓아볼 수 있어요.',
      example:
        '중요한 일을 끝내고 싶어 서두를 때, 신뢰하는 사람에게 중간 결과를 보여주고 빠뜨린 조건이 없는지 함께 확인해 보세요.',
    },
    {
      a: '문창귀인',
      b: '역마살',
      meaning:
        '생각을 정리하는 방식과 새로운 환경에 적응하는 방식을 함께 살펴볼 수 있어요.',
      example:
        '새 업무나 모임을 시작했다면 낯설었던 점을 짧게 기록하고 다음에 물어볼 질문을 하나 정해보세요.',
    },
    {
      a: '연살',
      b: '화개살',
      meaning:
        '사람들과 표현을 나누는 시간과 혼자 깊이 생각하는 시간의 균형을 살펴볼 수 있어요.',
      example:
        '약속이 많은 주에는 혼자 쉬는 시간을 먼저 남겨두고, 연락이 늦어질 때는 상대에게 알려주세요.',
    },
    {
      a: '월덕귀인',
      b: '양인살',
      meaning:
        '함께 조율하는 관점과 내 기준대로 추진하는 관점을 나란히 살펴볼 수 있어요.',
      example:
        '일을 주도하고 싶다면 초안을 먼저 제안하되 상대가 수정할 수 있는 부분을 열어두세요.',
    },
  ]
  return pairs.flatMap((p) => {
    const left = hits.filter((h) => h.name === p.a),
      right = hits.filter((h) => h.name === p.b)
    // Prefer a selected transit pair when present, otherwise retain actual natal positions.
    const a = left.find((h) => h.position === 'transit') ?? left[0]
    const b = right.find((h) => h.position === 'transit') ?? right[0]
    return a && b
      ? [{ ...p, left: a, right: b, uncertain: a.uncertain || b.uncertain }]
      : []
  })
}
