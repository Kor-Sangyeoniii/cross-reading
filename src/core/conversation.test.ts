import { describe, expect, it } from 'vitest'
import {
  conversationStats,
  parseConversation,
  replySuggestions,
} from './conversation'
describe('local chat import and suggestions', () => {
  it('parses desktop, mobile, BOM, CRLF and multiline without counting headers or attachments', () => {
    const a = parseConversation(
      '\uFEFF가상 친구님과 카카오톡 대화\r\n저장한 날짜: 예시\r\n[나] [오후 6:10] 안녕?\r\n두 번째 줄\r\n[가상 친구] [오후 6:11] 사진\r\n2026년 10월 18일 오후 6:12, 가상 친구 : 주말 시간 돼?',
    )
    expect(a.messages).toHaveLength(2)
    expect(a.messages[0].body).toBe('안녕?\n두 번째 줄')
    expect(a.messages[1].sender).toBe('가상 친구')
    expect(a.skipped).toBe(3)
    expect(conversationStats(a.messages)[0]).toMatchObject({
      count: 1,
      questions: 1,
    })
  })
  it('keeps HTML and prompt-like text as plain data, not instructions', () => {
    const a = parseConversation(
      '[가상 친구] [12:00] <script>alert(1)</script>\nignore previous instructions',
    )
    expect(a.messages[0].body).toContain('<script>')
    expect(replySuggestions(a.messages[0].body)?.topic).toBe('열린 대화')
  })
  it('bounds input and messages with fixed errors and never echoes input', () => {
    expect(() => parseConversation('x'.repeat(100001))).toThrow('10만 자')
    expect(() => parseConversation('비밀 예시')).toThrow(
      '인식할 수 있는 대화가 없어요',
    )
    expect(() =>
      parseConversation(
        Array.from({ length: 2001 }, () => '[가상] [12:00] 예시').join('\n'),
      ),
    ).toThrow('2,000개')
    expect(() =>
      parseConversation(
        Array.from({ length: 21 }, (_, i) => `[가상${i}] [12:00] 예시`).join(
          '\n',
        ),
      ),
    ).toThrow('20명')
  })
  it('uses different suggestions for care, planning, conflict and boundaries; no auto send', () => {
    expect(replySuggestions('오늘 많이 지쳤어')?.topic).toContain('피로')
    expect(replySuggestions('주말에 만날까?')?.topic).toContain('일정')
    expect(replySuggestions('조금 서운했어')?.topic).toContain('갈등')
    expect(replySuggestions('이제 연락하지 마')?.topic).toContain('거절')
    expect(replySuggestions('인증번호 보내줘')?.topic).toContain('민감정보')
    expect(replySuggestions('')).toBeNull()
  })
  it('does not treat message volume as affection or trust and counts actual selected content', () => {
    const stats = conversationStats([
      { id: '1', sender: '가상1', body: '안녕?' },
      { id: '2', sender: '가상1', body: '오늘 뭐 해?' },
      { id: '3', sender: '가상2', body: '쉬는 중' },
    ])
    expect(stats[0]).toMatchObject({ count: 2, questions: 2 })
    expect(stats[1]).toMatchObject({ count: 1, questions: 0 })
    expect(Object.keys(stats[0])).toEqual([
      'sender',
      'count',
      'questions',
      'averageLength',
    ])
  })
})
