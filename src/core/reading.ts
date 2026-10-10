import { calculateFourPillars, getHeavenlyStemElement, type FiveElement } from 'manseryeok'
import type { SajuChart } from './saju'

export const ELEMENTS: FiveElement[] = ['목', '화', '토', '금', '수']
export const GENERATES: Record<FiveElement, FiveElement> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
export const CONTROLS: Record<FiveElement, FiveElement> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }
export const ELEMENT_READING: Record<FiveElement, { name: string; meaning: string; example: string; question: string }> = {
  목: { name: '나무 · 시작과 성장', meaning: '새싹이 자라는 모습을 새로운 시도에 빗대어요.', example: '미뤄 둔 취미를 10분만 해 보거나, 모임에서 다음 만남의 아이디어 하나를 제안해 보세요.', question: '지금 작게 시작해 보고 싶은 일이 있나요?' },
  화: { name: '불 · 표현과 나눔', meaning: '불이 밝히는 모습을 생각과 감정을 드러내는 일에 빗대어요.', example: '친구에게 “지난번 내 이야기를 들어줘서 고마웠어”처럼 이유를 붙여 마음을 표현해 보세요.', question: '오늘 말로 전하고 싶은 마음이 있나요?' },
  토: { name: '흙 · 돌봄과 안정', meaning: '흙이 받쳐 주는 모습을 일상의 기반을 챙기는 일에 빗대어요.', example: '모임 시간을 정할 때 모두의 식사 시간과 이동 여유를 먼저 확인해 보세요.', question: '함께 편해지려면 무엇을 챙기면 좋을까요?' },
  금: { name: '쇠 · 정리와 기준', meaning: '도구로 다듬는 모습을 선택의 기준을 세우는 일에 빗대어요.', example: '여행 계획에서 꼭 할 일 하나와 생략해도 되는 일을 나눠 적어 보세요.', question: '지금 정리하거나 합의할 기준이 있나요?' },
  수: { name: '물 · 관찰과 쉼', meaning: '물이 흐르는 모습을 잠시 멈춰 살피는 일에 빗대어요.', example: '답장이 늦어 걱정될 때 이유를 짐작하기보다 “편할 때 답해줘”라고 말하고 쉬어 보세요.', question: '내 생각을 정리할 여유가 필요한가요?' },
}
export const READING_LIMIT = '전통 오행의 비유를 활용한 참고용 풀이예요. 성격이나 실제 하루의 사건을 예측하는 근거는 아니에요.'

export interface ReadingDetail { basis: string; example: string }
export function elementDetail(element: FiveElement, elements: SajuChart['elements'], hourKnown?: boolean): ReadingDetail {
  const total = Object.values(elements).reduce((a, b) => a + b, 0)
  return {
    basis: `천간·지지를 오행으로 분류한 ${total}글자 중 ${element}은 ${elements[element]}글자예요. ${hourKnown === false ? '출생시간을 몰라 시주 두 글자는 제외했어요. ' : ''}개수는 세력이나 성격의 강도를 뜻하지 않으며, 계절·지장간·용신은 반영하지 않았어요. 없는 오행도 능력 부족을 뜻하지 않아요.`,
    example: ELEMENT_READING[element].example,
  }
}

export type ElementRelation = 'same' | 'generates' | 'receives' | 'controls' | 'controlled'
export function elementRelation(a: FiveElement, b: FiveElement): ElementRelation {
  if (a === b) return 'same'
  if (GENERATES[a] === b) return 'generates'
  if (GENERATES[b] === a) return 'receives'
  if (CONTROLS[a] === b) return 'controls'
  return 'controlled'
}
const RELATION_TEXT: Record<ElementRelation, string> = {
  same: '같은 오행을 반복하는 날로 읽어요. 익숙한 방식을 돌아보는 질문으로 활용해 보세요.',
  generates: '내 일간에서 날짜의 오행으로 이어지는 상생으로 읽어요. 생각을 작은 행동으로 옮기는 질문으로 활용해 보세요.',
  receives: '날짜의 오행에서 내 일간으로 이어지는 상생으로 읽어요. 도움을 요청하거나 쉼을 챙기는 질문으로 활용해 보세요.',
  controls: '내 일간이 날짜의 오행을 조절하는 상극으로 읽어요. 감당할 범위를 정하는 질문으로 활용해 보세요.',
  controlled: '날짜의 오행이 내 일간을 조절하는 상극으로 읽어요. 상대와 기준을 맞추는 질문으로 활용해 보세요.',
}

/** Selected civil date is interpreted at noon in Korea; never mix it with birth input or invent a birth time. */
export function dailyReading(chart: SajuChart, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('날짜를 다시 확인해 주세요.')
  const [year, month, day] = date.split('-').map(Number)
  const check = new Date(Date.UTC(year, month - 1, day))
  if (year < 1900 || year > 2100 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error('1900~2100년의 올바른 날짜를 골라 주세요.')
  let element: FiveElement
  try {
    const pillars = calculateFourPillars({ year, month, day, hour: 12, minute: 0, isLunar: false, dayBoundary: 'midnight' })
    element = getHeavenlyStemElement(pillars.day.heavenlyStem)
  } catch {
    throw new Error('이 날짜의 풀이를 계산하지 못했어요. 다른 날짜를 골라 주세요.')
  }
  const relation = elementRelation(chart.dayMaster.element, element)
  return {
    date, element, relation,
    headline: `${ELEMENT_READING[element].name}을 돌아보는 날`,
    basis: `한국 시간의 양력 날짜·자정 경계 기준으로 계산한 일진의 천간 오행(${element})과 내 일간 오행(${chart.dayMaster.element})만 비교했어요. 대운·세운·월운이나 하루 전체의 길흉을 계산한 풀이가 아니에요.`,
    text: RELATION_TEXT[relation], example: ELEMENT_READING[element].example, question: ELEMENT_READING[element].question,
    notes: [!chart.hourKnown && '출생시간을 몰라 시주는 제외했어요.', chart.yearMonthUncertain && '출생일이 절기 경계일이라 원국 일부는 확인이 필요해요.'].filter((v): v is string => Boolean(v)),
    disclaimer: READING_LIMIT,
  }
}

const COMPAT_DETAILS: Record<string, ReadingDetail> = {
  'stem-combine': { basis: '두 일간이 전통 천간합 조합에 해당하는지 비교했어요. 실제 끌림이나 합화 성립을 판정하지 않아요.', example: '처음 편하게 느꼈던 대화 주제를 서로 하나씩 말해 보고 지금도 같은지 확인해 보세요.' },
  'same-element': { basis: '두 일간을 같은 오행으로 분류했어요. 같은 오행이라고 취향과 성격까지 같다는 뜻은 아니에요.', example: '둘 다 여행을 좋아해도 휴식과 관광 중 무엇을 더 원하는지 따로 물어보세요.' },
  generates: { basis: '일간 오행이 목→화→토→금→수→목의 상생 순서로 이어져요. 자연물의 비유이며 누가 상대를 돕는지 정하는 규칙은 아니에요.', example: '한 사람이 아이디어를 내면 다른 사람이 일정 후보를 정리해 보는 식으로 역할을 바꿔 맡아 보세요.' },
  controls: { basis: '일간 오행이 목→토→수→화→금→목의 상극 순서에 해당해요. 상극은 조절의 비유이며 나쁜 관계를 뜻하지 않아요.', example: '한 사람은 바로 예약하고 싶고 다른 사람은 더 비교하고 싶다면, 후보 두 개와 결정 시간을 함께 정해 보세요.' },
  'branch-combine': { basis: '두 일지가 전통 육합 조합에 해당해요. 생활 리듬을 떠올리는 비유이며 실제 생활 습관은 대화로 확인해야 해요.', example: '주말에 함께 쉬는 시간과 각자 쉬는 시간을 구체적으로 이야기해 보세요.' },
  'branch-clash': { basis: '두 일지가 전통 충 조합에 해당해요. 갈등이 생긴다는 예측이 아니라 서로의 방식을 묻기 위한 단서예요.', example: '약속에 늦을 때 언제 연락하면 편한지, 일정 변경은 어느 정도 전에 알려 주면 좋을지 합의해 보세요.' },
  complement: { basis: '한 원국에 없는 오행이 다른 원국에는 두 글자 이상 있을 때 표시해요. 글자 개수만 비교하며 결핍이나 관계의 필요성을 판정하지 않아요.', example: '상대가 잘하는 일을 짐작하기보다 “계획 정리와 장소 찾기 중 어떤 역할이 편해?”라고 물어보세요.' },
  'group-strong': { basis: '동의한 구성원의 원국 글자 개수를 합산해 가장 많이 나온 오행을 표시했어요. 인원과 출생시간 정보에 따라 달라지며 모임의 성격 판정은 아니에요.', example: '모임을 준비할 때 아이디어·연락·일정·정리·휴식 역할을 원하는 사람에게 나눠 보세요.' },
  'group-missing': { basis: '합산한 원국 글자에 나타나지 않는 오행을 표시했어요. 그와 관련된 능력이나 성격이 없다는 뜻은 아니에요.', example: '놓친 준비가 있는지 장소·시간·예산·쉬는 시간을 체크리스트로 함께 확인해 보세요.' },
  'mbti-EI': { basis: '서로 공개에 동의한 유형의 E/I 글자를 비교했어요. 자기보고한 선호이며 행동을 고정하지 않아요.', example: '모임 뒤 바로 다음 약속을 잡기보다 혼자 쉬는 시간이 필요한지 먼저 물어보세요.' },
  'mbti-SN': { basis: '공개한 유형의 S/N 글자를 비교했어요. 정보를 다루는 선호를 이야기하기 위한 참고예요.', example: '여행 이야기에서 구체적인 교통편과 해 보고 싶은 경험을 모두 적어 보세요.' },
  'mbti-TF': { basis: '공개한 유형의 T/F 글자를 비교했어요. 공감 능력이나 논리력의 크기를 판단하지 않아요.', example: '친구가 고민을 꺼내면 “지금은 들어줄까, 해결 방법을 같이 찾아볼까?”라고 먼저 물어보세요.' },
  'mbti-JP': { basis: '공개한 유형의 J/P 글자를 비교했어요. 계획 선호가 모든 상황에 그대로 적용되는 것은 아니에요.', example: '여행에서 예약이 필요한 한 가지는 미리 정하고, 나머지 시간은 자유롭게 두는 방식을 의논해 보세요.' },
}
export function explainCompatFact(code: string): ReadingDetail | undefined { return COMPAT_DETAILS[code] }
