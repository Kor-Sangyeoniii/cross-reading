import { describe, expect, it } from 'vitest'
import { checkForm, EMPTY_FORM, fromProfile, toBirthInput, toMbti, type ProfileForm } from './form'

// 가짜 값만 사용 (AGENTS.md P1)
const filled: ProfileForm = { ...EMPTY_FORM, nickname: '가상닉', year: '2000', month: '1', day: '15', time: '09:30', mbti: 'INFP' }

describe('profile form', () => {
  it('빈 칸은 칸별 안내', () => {
    const e = checkForm(EMPTY_FORM, { needMbti: true })
    expect(Object.keys(e).sort()).toEqual(['date', 'mbti', 'nickname', 'time'])
  })
  it('채운 값은 통과, 시간 모름이면 시간 검사 생략', () => {
    expect(checkForm(filled, { needMbti: true })).toEqual({})
    expect(checkForm({ ...filled, time: '', timeUnknown: true }, { needMbti: true })).toEqual({})
  })
  it('MBTI 미선택과 모름을 구분', () => {
    expect(checkForm({ ...filled, mbti: null }, { needMbti: true }).mbti).toBeDefined()
    expect(checkForm({ ...filled, mbti: 'unknown' }, { needMbti: true })).toEqual({})
    expect(toMbti({ ...filled, mbti: 'unknown' })).toBeNull()
  })
  it('입력값 변환과 되돌리기', () => {
    const b = toBirthInput(filled)
    expect(b).toEqual({ year: 2000, month: 1, day: 15, calendar: 'solar', isLeapMonth: false, time: { hour: 9, minute: 30 } })
    expect(fromProfile({ nickname: '가상닉', birth: b, mbti: 'INFP' })).toEqual(filled)
  })
  it('양력이면 윤달 표시는 무시', () => {
    expect(toBirthInput({ ...filled, isLeapMonth: true }).isLeapMonth).toBe(false)
    expect(toBirthInput({ ...filled, calendar: 'lunar', isLeapMonth: true }).isLeapMonth).toBe(true)
  })
})

describe('placeSaveError', () => {
  it('오류 문장을 알맞은 칸으로', async () => {
    const { placeSaveError } = await import('./form')
    expect(placeSaveError('닉네임은 1~20자로 입력해 주세요.').field).toBe('nickname')
    expect(placeSaveError('미래 날짜는 입력할 수 없습니다.').field).toBe('date')
    expect(placeSaveError('그 해에는 해당 윤달이 없어요.').field).toBe('date')
    expect(placeSaveError('만 14세 이상만 이용할 수 있어요.').field).toBe('date')
    expect(placeSaveError('출생시간이 올바르지 않습니다.').field).toBe('time')
    expect(placeSaveError('필수 동의가 필요해요.').field).toBe('consent')
    expect(placeSaveError('잠시 후 다시 시도해 주세요.').field).toBeNull()
  })
})
