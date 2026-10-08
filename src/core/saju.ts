import {
  calculateFourPillars,
  getEarthlyBranchElement,
  getHeavenlyStemElement,
  lunarToSolar,
  type BirthInfo,
  type FiveElement,
  type FourPillarsDetail,
  type Pillar,
  type TenGod,
  type YinYang,
} from 'manseryeok'

// 사주 계산 모듈 (CR-004). 해석 문구·점수는 만들지 않고 원국과 오행 분포만 돌려준다.
// 기본값(DECISIONS.md): 진태양시 보정 끔, 자시 처리 'midnight'.

export interface BirthTime {
  hour: number
  minute: number
}

export interface BirthInput {
  year: number
  month: number
  day: number
  calendar: 'solar' | 'lunar'
  /** 음력 윤달 여부. 양력이면 무시한다. */
  isLeapMonth?: boolean
  /** 출생시간을 모르면 null */
  time: BirthTime | null
}

export interface SajuChart {
  /** 한글 간지 두 글자. 시주는 출생시간을 모르면 null */
  pillars: { year: string; month: string; day: string; hour: string | null }
  /** 한자 간지. 시주는 출생시간을 모르면 null */
  pillarsHanja: { year: string; month: string; day: string; hour: string | null }
  /** 일간(日干). label 예: '계수(癸水)' */
  dayMaster: { stem: string; element: FiveElement; yinYang: YinYang; hanja: string; label: string }
  /** 십신(十神). 일간 자리는 '일간'. 시주는 시간을 모르면 null */
  tenGods: {
    year: { stem: TenGod; branch: TenGod }
    month: { stem: TenGod; branch: TenGod }
    day: { branch: TenGod }
    hour: { stem: TenGod; branch: TenGod } | null
  }
  /** 원국 글자별 오행 개수. 시간을 모르면 6글자, 알면 8글자 기준 */
  elements: Record<FiveElement, number>
  hourKnown: boolean
  /**
   * 시간을 모르는데 출생일이 입춘·절기 경계일이라 연주·월주가 하루 안에서 바뀌는 경우 true.
   * 이때 표시된 연주·월주는 정오 기준이며 화면에서 "확인 필요"로 안내한다.
   */
  yearMonthUncertain: boolean
}

export class SajuInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SajuInputError'
  }
}

const NOON: BirthTime = { hour: 12, minute: 0 }
const ELEMENT_HANJA: Record<FiveElement, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

function toInfo(input: BirthInput, time: BirthTime): BirthInfo {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: time.hour,
    minute: time.minute,
    isLunar: input.calendar === 'lunar',
    isLeapMonth: input.calendar === 'lunar' ? Boolean(input.isLeapMonth) : false,
    dayBoundary: 'midnight',
  }
}

function calc(input: BirthInput, time: BirthTime): FourPillarsDetail {
  try {
    return calculateFourPillars(toInfo(input, time))
  } catch (e) {
    if (e instanceof RangeError) throw new SajuInputError(e.message)
    throw e
  }
}

const label = (p: Pillar) => p.heavenlyStem + p.earthlyBranch
const sameLabel = (a: Pillar, b: Pillar) => label(a) === label(b)

function validateTime(time: BirthTime | null) {
  if (!time) return
  const { hour, minute } = time
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new SajuInputError('출생시간이 올바르지 않습니다.')
  }
}

/** 입력(양력·음력)을 양력 날짜 'YYYY-MM-DD'로 바꾼다. 없는 날짜·윤달은 SajuInputError. */
export function toSolarDate(input: BirthInput): string {
  let solar: { year: number; month: number; day: number }
  try {
    solar =
      input.calendar === 'lunar'
        ? lunarToSolar(input.year, input.month, input.day, Boolean(input.isLeapMonth))
        : { year: input.year, month: input.month, day: input.day }
  } catch (e) {
    if (e instanceof RangeError) throw new SajuInputError(e.message)
    throw e
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${solar.year}-${pad(solar.month)}-${pad(solar.day)}`
}

export function computeSaju(input: BirthInput, now: Date = new Date()): SajuChart {
  validateTime(input.time)
  const main = calc(input, input.time ?? NOON)

  let yearMonthUncertain = false
  if (!input.time) {
    const start = calc(input, { hour: 0, minute: 0 })
    const end = calc(input, { hour: 23, minute: 59 })
    yearMonthUncertain = !sameLabel(start.year, end.year) || !sameLabel(start.month, end.month)
  }

  const [sy, sm, sd] = toSolarDate(input).split('-').map(Number)
  if (new Date(sy, sm - 1, sd).getTime() > now.getTime()) {
    throw new SajuInputError('미래 날짜는 입력할 수 없습니다.')
  }

  const used: Pillar[] = [main.year, main.month, main.day]
  if (input.time) used.push(main.hour)
  const elements: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of used) {
    elements[getHeavenlyStemElement(p.heavenlyStem)] += 1
    elements[getEarthlyBranchElement(p.earthlyBranch)] += 1
  }

  return {
    pillars: {
      year: label(main.year),
      month: label(main.month),
      day: label(main.day),
      hour: input.time ? label(main.hour) : null,
    },
    pillarsHanja: {
      year: main.yearHanja,
      month: main.monthHanja,
      day: main.dayHanja,
      hour: input.time ? main.hourHanja : null,
    },
    dayMaster: {
      stem: main.day.heavenlyStem,
      element: getHeavenlyStemElement(main.day.heavenlyStem),
      yinYang: main.dayYinYang.stem,
      hanja: main.dayHanja[0] + ELEMENT_HANJA[getHeavenlyStemElement(main.day.heavenlyStem)],
      label: `${main.day.heavenlyStem}${getHeavenlyStemElement(main.day.heavenlyStem)}(${main.dayHanja[0]}${ELEMENT_HANJA[getHeavenlyStemElement(main.day.heavenlyStem)]})`,
    },
    tenGods: {
      year: main.tenGods.year as { stem: TenGod; branch: TenGod },
      month: main.tenGods.month as { stem: TenGod; branch: TenGod },
      day: { branch: main.tenGods.day.branch as TenGod },
      hour: input.time ? (main.tenGods.hour as { stem: TenGod; branch: TenGod }) : null,
    },
    elements,
    hourKnown: input.time !== null,
    yearMonthUncertain,
  }
}
