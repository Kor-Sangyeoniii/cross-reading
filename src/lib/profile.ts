import { computeSaju, seoulToday, toSolarDate, type BirthInput } from '../core/saju'
import { AppError, toAppError } from './errors'
import { supabase } from './supabase'

// 내 프로필 저장·조회 (CR-003). 출생정보는 RLS로 본인만 읽는다 (CR-002).

export type Mbti = `${'E' | 'I'}${'S' | 'N'}${'T' | 'F'}${'J' | 'P'}`

export interface Consents {
  age14OrOlder: boolean
  terms: boolean
  privacy: boolean
  marketing: boolean
}

export interface ProfileInput {
  nickname: string
  birth: BirthInput
  /** 모르면 null */
  mbti: Mbti | null
  consents: Consents
}

export interface MyProfile {
  nickname: string
  birth: BirthInput
  mbti: Mbti | null
}

export class ProfileInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProfileInputError'
  }
}

const MBTI_RE = /^[EI][SN][TF][JP]$/

/** 저장 전 검사. 통과하면 DB 행을 돌려준다(테스트 가능하도록 분리). */
export function toProfileRow(userId: string, input: ProfileInput, now: Date = new Date()) {
  const nickname = input.nickname.trim()
  if (nickname.length < 1 || nickname.length > 20) throw new ProfileInputError('닉네임은 1~20자로 입력해 주세요.')
  if (!input.consents.age14OrOlder) throw new ProfileInputError('만 14세 이상만 이용할 수 있어요.')
  if (!input.consents.terms || !input.consents.privacy) throw new ProfileInputError('필수 동의가 필요해요.')
  if (input.mbti !== null && !MBTI_RE.test(input.mbti)) throw new ProfileInputError('MBTI 유형이 올바르지 않아요.')

  // 없는 날짜·미래 날짜·없는 윤달을 여기서 걸러낸다 (SajuInputError).
  computeSaju(input.birth, now)
  const solarBirthDate = toSolarDate(input.birth)
  // DB도 같은 검사를 한다(만 14세, 한국 날짜 기준). 여기서는 화면에 먼저 알려주기 위한 검사다.
  if (!isAtLeast14(solarBirthDate, now)) throw new ProfileInputError('만 14세 이상만 이용할 수 있어요.')

  const at = now.toISOString()
  return {
    id: userId,
    nickname,
    birth_year: input.birth.year,
    birth_month: input.birth.month,
    birth_day: input.birth.day,
    solar_birth_date: solarBirthDate,
    calendar: input.birth.calendar,
    is_leap_month: input.birth.calendar === 'lunar' && Boolean(input.birth.isLeapMonth),
    birth_hour: input.birth.time?.hour ?? null,
    birth_minute: input.birth.time?.minute ?? null,
    mbti: input.mbti,
    age_14_confirmed: true,
    terms_agreed_at: at,
    privacy_agreed_at: at,
    marketing_agreed_at: input.consents.marketing ? at : null,
  }
}

/** 한국 날짜 기준 만 14세 이상인지. solar는 'YYYY-MM-DD'. */
export function isAtLeast14(solar: string, now: Date = new Date()): boolean {
  const today = seoulToday(now)
  const [ty, tm, td] = today.split('-').map(Number)
  const [by, bm, bd] = solar.split('-').map(Number)
  const age = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
  return age >= 14
}

function client() {
  if (!supabase) throw new Error('Supabase 설정이 없습니다.')
  return supabase
}

/** 처음 가입할 때만: 프로필 + 필수 동의·연령 확인 기록 */
export async function createMyProfile(input: ProfileInput): Promise<void> {
  const { data } = await client().auth.getUser()
  if (!data.user) throw new AppError('not_authenticated')
  const row = toProfileRow(data.user.id, input)
  const { error } = await client().from('profiles').insert(row)
  if (error) throw toAppError(error)
}

export interface ProfileEdit {
  nickname: string
  birth: BirthInput
  mbti: Mbti | null
  /** 선택 동의(소식·혜택) 변경. undefined면 그대로 둔다 */
  marketing?: boolean
}

/** 정보 수정용 행. 필수 동의 시각·연령 확인은 포함하지 않는다(가입 때 기록한 값 유지). */
export function toProfileEdit(edit: ProfileEdit, now: Date = new Date()) {
  const nickname = edit.nickname.trim()
  if (nickname.length < 1 || nickname.length > 20) throw new ProfileInputError('닉네임은 1~20자로 입력해 주세요.')
  if (edit.mbti !== null && !MBTI_RE.test(edit.mbti)) throw new ProfileInputError('MBTI 유형이 올바르지 않아요.')
  computeSaju(edit.birth, now)
  const solarBirthDate = toSolarDate(edit.birth)
  if (!isAtLeast14(solarBirthDate, now)) throw new ProfileInputError('만 14세 이상만 이용할 수 있어요.')
  return {
    nickname,
    birth_year: edit.birth.year,
    birth_month: edit.birth.month,
    birth_day: edit.birth.day,
    solar_birth_date: solarBirthDate, // DB가 다시 계산해 덮어쓴다 (CR-002 보완 2)
    calendar: edit.birth.calendar,
    is_leap_month: edit.birth.calendar === 'lunar' && Boolean(edit.birth.isLeapMonth),
    birth_hour: edit.birth.time?.hour ?? null,
    birth_minute: edit.birth.time?.minute ?? null,
    mbti: edit.mbti,
    ...(edit.marketing === undefined ? {} : { marketing_agreed_at: edit.marketing ? now.toISOString() : null }),
  }
}

/** 정보 수정 (닉네임·생년월일·MBTI·선택 동의). DB 권한상 다른 칼럼은 바뀌지 않는다. */
export async function updateMyProfile(edit: ProfileEdit): Promise<void> {
  const { data } = await client().auth.getUser()
  if (!data.user) throw new AppError('not_authenticated')
  const { error } = await client().from('profiles').update(toProfileEdit(edit)).eq('id', data.user.id)
  if (error) throw toAppError(error)
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data } = await client().auth.getUser()
  if (!data.user) return null
  const { data: row, error } = await client().from('profiles').select('*').eq('id', data.user.id).maybeSingle()
  if (error) throw toAppError(error)
  if (!row) return null
  return {
    nickname: row.nickname,
    birth: {
      year: row.birth_year,
      month: row.birth_month,
      day: row.birth_day,
      calendar: row.calendar,
      isLeapMonth: row.is_leap_month,
      time: row.birth_hour === null ? null : { hour: row.birth_hour, minute: row.birth_minute },
    },
    mbti: row.mbti,
  }
}
