import { computeSaju, type BirthInput } from '../core/saju'
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

  const at = now.toISOString()
  return {
    id: userId,
    nickname,
    birth_year: input.birth.year,
    birth_month: input.birth.month,
    birth_day: input.birth.day,
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

function client() {
  if (!supabase) throw new Error('Supabase 설정이 없습니다.')
  return supabase
}

export async function saveMyProfile(input: ProfileInput): Promise<void> {
  const { data } = await client().auth.getUser()
  if (!data.user) throw new Error('로그인이 필요합니다.')
  const row = toProfileRow(data.user.id, input)
  const { error } = await client().from('profiles').upsert(row)
  if (error) throw new Error(`프로필 저장 실패: ${error.message}`)
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data } = await client().auth.getUser()
  if (!data.user) return null
  const { data: row, error } = await client().from('profiles').select('*').eq('id', data.user.id).maybeSingle()
  if (error) throw new Error(`프로필 조회 실패: ${error.message}`)
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
