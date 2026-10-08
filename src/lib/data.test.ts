import { describe, expect, it } from 'vitest'
import { AppError, toAppError } from './errors'
import { inviteUrl, parseInvitePath } from './rooms'
import { MAX_MESSAGE_LENGTH, normalizeMessage, removeMessage, type ChatMessage } from './chat'

// 모든 값은 가짜 데이터다 (AGENTS.md P1).
const TOKEN = 'a'.repeat(64)

describe('toAppError', () => {
  it('DB 오류 메시지 속 코드를 쉬운 문장으로 바꾼다', () => {
    expect(toAppError({ message: 'room_full', code: 'P0001' }).message).toBe('이 모임은 이미 4명이 모두 모였어요.')
    expect(toAppError({ message: 'calc_consent_required' }).code).toBe('calc_consent_required')
    expect(toAppError({ error: 'not_a_member' }).code).toBe('not_a_member')
    expect(toAppError('age_under_14').code).toBe('age_under_14')
  })
  it('모르는 오류는 내부 원문을 숨기고 기본 문장', () => {
    const e = toAppError({ message: 'duplicate key value violates unique constraint "x"' })
    expect(e).toBeInstanceOf(AppError)
    expect(e.code).toBe('unknown')
    expect(e.message).toBe('잠시 후 다시 시도해 주세요.')
    expect(toAppError(null).code).toBe('unknown')
  })
})

describe('초대 링크', () => {
  it('주소를 만들고 다시 토큰을 꺼낸다', () => {
    const url = inviteUrl(TOKEN, 'https://example.invalid')
    expect(url).toBe(`https://example.invalid/invite/${TOKEN}`)
    expect(parseInvitePath(new URL(url).pathname)).toBe(TOKEN)
  })
  it('형식이 다른 경로는 null', () => {
    expect(parseInvitePath('/invite/abc')).toBeNull()
    expect(parseInvitePath(`/invite/${TOKEN}/extra`)).toBeNull()
    expect(parseInvitePath(`/invite/${'G'.repeat(64)}`)).toBeNull()
    expect(parseInvitePath('/')).toBeNull()
  })
})

describe('normalizeMessage', () => {
  it('앞뒤 공백을 지우고 1~2000자만 허용', () => {
    expect(normalizeMessage('  안녕  ')).toBe('안녕')
    expect(() => normalizeMessage('   ')).toThrow('메시지를 입력해 주세요.')
    expect(normalizeMessage('가'.repeat(MAX_MESSAGE_LENGTH))).toHaveLength(MAX_MESSAGE_LENGTH)
    expect(() => normalizeMessage('가'.repeat(MAX_MESSAGE_LENGTH + 1))).toThrow('메시지는 2000자까지 보낼 수 있어요.')
  })
})

describe('removeMessage', () => {
  it('지워진 메시지만 목록에서 뺀다', () => {
    const m = (id: number): ChatMessage => ({ id, roomId: 'r', senderId: 's', body: 'b', memberCountAtSend: 2, createdAt: '' })
    expect(removeMessage([m(1), m(2), m(3)], 2).map((x) => x.id)).toEqual([1, 3])
    expect(removeMessage([m(1)], 99)).toHaveLength(1)
  })
})
