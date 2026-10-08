import type { BirthInput } from '../core/saju'
import type { Mbti } from '../lib/profile'

// 출생정보·MBTI 입력 화면의 상태와 검사 (03·04·19·정보 수정이 같이 쓴다).

export const MBTI_TYPES: Mbti[] = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

export interface ProfileForm {
  nickname: string
  year: string
  month: string
  day: string
  calendar: 'solar' | 'lunar'
  isLeapMonth: boolean
  /** 출생시간을 모르면 true */
  timeUnknown: boolean
  /** 'HH:MM' */
  time: string
  /** 아직 고르지 않음(null)과 '아직 몰라요'('unknown')를 구분한다 */
  mbti: Mbti | 'unknown' | null
}

export const EMPTY_FORM: ProfileForm = {
  nickname: '',
  year: '',
  month: '',
  day: '',
  calendar: 'solar',
  isLeapMonth: false,
  timeUnknown: false,
  time: '',
  mbti: null,
}

export type FormErrors = Partial<Record<'nickname' | 'date' | 'time' | 'mbti', string>>

const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN)

/** 칸이 비었거나 형식이 틀린 것만 여기서 본다. 없는 날짜·미래·만 14세는 저장할 때 계산 모듈이 확인한다. */
export function checkForm(f: ProfileForm, opts: { needMbti: boolean }): FormErrors {
  const errors: FormErrors = {}
  const nick = f.nickname.trim()
  if (nick.length < 1 || nick.length > 20) errors.nickname = '닉네임은 1~20자로 입력해 주세요.'
  const y = int(f.year)
  const m = int(f.month)
  const d = int(f.day)
  if (!(y >= 1900 && y <= 2100) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) errors.date = '생년월일을 숫자로 입력해 주세요. (예: 1995 / 3 / 21)'
  if (!f.timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time)) errors.time = '출생시간을 고르거나 ‘시간을 몰라요’를 눌러 주세요.'
  if (opts.needMbti && f.mbti === null) errors.mbti = 'MBTI 유형을 고르거나 ‘아직 몰라요’를 눌러 주세요.'
  return errors
}

export function toBirthInput(f: ProfileForm): BirthInput {
  const [hh, mm] = f.time.split(':').map(Number)
  return {
    year: int(f.year),
    month: int(f.month),
    day: int(f.day),
    calendar: f.calendar,
    isLeapMonth: f.calendar === 'lunar' && f.isLeapMonth,
    time: f.timeUnknown ? null : { hour: hh, minute: mm },
  }
}

export function toMbti(f: ProfileForm): Mbti | null {
  return f.mbti === 'unknown' ? null : f.mbti
}

export function fromProfile(p: { nickname: string; birth: BirthInput; mbti: Mbti | null }): ProfileForm {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    nickname: p.nickname,
    year: String(p.birth.year),
    month: String(p.birth.month),
    day: String(p.birth.day),
    calendar: p.birth.calendar,
    isLeapMonth: Boolean(p.birth.isLeapMonth),
    timeUnknown: p.birth.time === null,
    time: p.birth.time ? `${pad(p.birth.time.hour)}:${pad(p.birth.time.minute)}` : '',
    mbti: p.mbti ?? 'unknown',
  }
}

/** 저장 실패를 어느 칸에 보여줄지 정한다. message는 이미 쉬운 문장(messageOf)이어야 한다. */
export function placeSaveError(message: string, code?: string): { field: keyof FormErrors | 'consent' | null; message: string } {
  if (/닉네임/.test(message)) return { field: 'nickname', message }
  if (/필수 동의/.test(message)) return { field: 'consent', message }
  if (/출생시간/.test(message)) return { field: 'time', message }
  if (/날짜|윤달|생년월일|14세/.test(message) || code === 'invalid_birth_date' || code === 'age_under_14') return { field: 'date', message }
  if (/MBTI/.test(message)) return { field: 'mbti', message }
  return { field: null, message }
}
