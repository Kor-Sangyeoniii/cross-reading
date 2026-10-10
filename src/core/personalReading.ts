import { calculateFourPillars, getTenGod, getBranchTenGod, type TenGod, type Pillar, type Gender } from 'manseryeok'
import { computeSaju, toSolarDate, type BirthInput, type SajuChart } from './saju'
import { dailyReading } from './reading'

export const TEN_GOD_READING: Record<TenGod, { theme: string; meaning: string; example: string }> = {
  비견: { theme: '내 기준과 동료', meaning: '일간과 오행·음양이 같은 관계예요. 나의 기준과 동등한 관계를 돌아보는 비유로 읽어요.', example: '함께 일할 때 내가 원하는 방식부터 말하고, 상대가 원하는 방식도 한 가지씩 들어 보세요.' },
  겁재: { theme: '경쟁과 역할 나누기', meaning: '일간과 오행은 같고 음양이 다른 관계예요. 자원을 나누거나 내 몫을 정하는 질문으로 읽어요. 손해가 생긴다는 예측은 아니에요.', example: '모임의 비용·시간·역할을 미리 나누고, 무리해서 맡고 있는 일이 없는지 확인해 보세요.' },
  식신: { theme: '꾸준한 표현과 돌봄', meaning: '일간이 생하는 오행이고 음양이 같은 관계예요. 일상의 작은 표현과 지속을 돌아보는 비유예요.', example: '관심 있는 일을 10분만 이어 가거나, 가까운 사람에게 식사 안부를 물어보세요.' },
  상관: { theme: '새로운 표현과 질문', meaning: '일간이 생하는 오행이고 음양이 다른 관계예요. 익숙한 방식을 바꾸는 질문으로 읽어요.', example: '다른 방법을 제안할 때 “이 방식도 한번 비교해 볼까?”라고 이유와 함께 이야기해 보세요.' },
  편재: { theme: '기회 탐색과 자원 배분', meaning: '일간이 극하는 오행이고 음양이 같은 관계예요. 사람·시간·자원을 넓게 살피는 비유예요. 금전 수익을 예측하지 않아요.', example: '새 제안을 받으면 흥미로운 점과 필요한 시간·비용을 따로 적고 감당할 범위를 정해 보세요.' },
  정재: { theme: '생활 관리와 약속', meaning: '일간이 극하는 오행이고 음양이 다른 관계예요. 구체적인 관리와 지속할 약속을 돌아보는 비유예요.', example: '이번 주 일정과 지출을 정리하고, 이미 한 약속에 필요한 여유를 챙겨 보세요.' },
  편관: { theme: '도전과 경계 설정', meaning: '일간을 극하는 오행이고 음양이 같은 관계예요. 부담과 책임의 범위를 살피는 비유예요. 위험이 닥친다는 판정은 아니에요.', example: '급한 요청을 받았을 때 바로 수락하기보다 기한·도움받을 사람·할 수 없는 일을 확인해 보세요.' },
  정관: { theme: '책임과 함께 정한 기준', meaning: '일간을 극하는 오행이고 음양이 다른 관계예요. 규칙과 책임을 돌아보는 비유예요.', example: '함께 정한 시간이나 역할이 지금도 가능한지 확인하고, 바꿀 부분은 미리 이야기해 보세요.' },
  편인: { theme: '관점 전환과 혼자 살피기', meaning: '일간을 생하는 오행이고 음양이 같은 관계예요. 익숙하지 않은 관점과 정리 시간을 살피는 비유예요.', example: '막히는 일이 있으면 다른 사람의 접근을 하나 찾아보고, 혼자 정리할 시간을 짧게 확보해 보세요.' },
  정인: { theme: '배움과 도움받기', meaning: '일간을 생하는 오행이고 음양이 다른 관계예요. 배움·돌봄·도움을 돌아보는 비유예요.', example: '모르는 부분을 혼자 버티기보다 구체적인 질문 하나를 준비해 도움을 요청해 보세요.' },
}
export const PERSONAL_LIMIT = '전통 명리의 관계를 자기이해를 위한 질문으로 풀었어요. 실제 사건·재물·건강·관계의 결과를 예측하거나 판정하지 않아요.'

export function readPillar(chart: SajuChart, pillar: Pillar) {
  const stemGod = getTenGod(chart.dayMaster.stem as Pillar['heavenlyStem'], pillar.heavenlyStem)
  const branchGod = getBranchTenGod(chart.dayMaster.stem as Pillar['heavenlyStem'], pillar.earthlyBranch)
  return { label: pillar.heavenlyStem + pillar.earthlyBranch, stemGod, branchGod }
}

export function natalReadings(chart: SajuChart) {
  return chart.cells.flatMap((cell) => [
    ...(cell.stem.tenGod === '일간' ? [] : [{ source: `${cell.title} 천간`, god: cell.stem.tenGod }]),
    ...(cell.branch.tenGod === '일간' ? [] : [{ source: `${cell.title} 지지`, god: cell.branch.tenGod }]),
  ])
}

/** Civil date in Korea, at noon. Annual/monthly boundaries are the library's solar terms. */
export function personalPeriods(chart: SajuChart, date: string) {
  dailyReading(chart, date) // Strict date/range check, without persisting birth input.
  const [year, month, day] = date.split('-').map(Number)
  const at = (hour: number, minute: number) => calculateFourPillars({ year, month, day, hour, minute, isLunar: false, dayBoundary: 'midnight' })
  try {
    const middle = at(12, 0), start = at(0, 0), end = at(23, 59)
    return {
      date,
      year: readPillar(chart, middle.year), month: readPillar(chart, middle.month), day: readPillar(chart, middle.day),
      yearBoundary: middle.yearString !== start.yearString || middle.yearString !== end.yearString,
      monthBoundary: middle.monthString !== start.monthString || middle.monthString !== end.monthString,
    }
  } catch { throw new Error('선택한 날짜의 흐름을 계산하지 못했어요.') }
}

/** Never silently substitute noon or infer the convention used for luck direction. */
export function personalLuck(birth: BirthInput, convention: Gender | null, date: string) {
  const chart = computeSaju(birth)
  dailyReading(chart, date)
  if (!convention) return { available: false as const, reason: '대운 순·역행에 사용할 전통 계산 기준을 골라 주세요.' }
  if (!birth.time) return { available: false as const, reason: '대운의 시작 시점을 계산하려면 출생시간이 필요해요. 시간을 모르는 상태에서 임의로 정하지 않아요.' }
  if (!['male', 'female'].includes(convention)) throw new Error('대운 계산 기준을 다시 확인해 주세요.')
  try {
    const info = calculateFourPillars({ year: birth.year, month: birth.month, day: birth.day, hour: birth.time.hour, minute: birth.time.minute, isLunar: birth.calendar === 'lunar', isLeapMonth: birth.calendar === 'lunar' && Boolean(birth.isLeapMonth), dayBoundary: 'midnight', gender: convention }).luckPillars
    if (!info) throw new Error()
    const solar = toSolarDate(birth), [by, bm, bd] = solar.split('-').map(Number), [year, month, day] = date.split('-').map(Number)
    const age = year - by - (month < bm || (month === bm && day < bd) ? 1 : 0)
    const pillars = info.pillars.map((p) => ({ ...readPillar(chart, p.pillar), age: p.age, endAge: p.age + 9 }))
    return { available: true as const, forward: info.forward, startYears: info.startYears, startMonths: info.startMonths, startDays: info.startDays, pillars, approximateCurrent: pillars.findIndex((p) => age >= p.age && age <= p.endAge) }
  } catch { throw new Error('대운을 계산하지 못했어요. 출생정보와 계산 기준을 확인해 주세요.') }
}
