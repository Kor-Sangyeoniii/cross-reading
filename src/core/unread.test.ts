import { describe, expect, it } from 'vitest'
import { hasUnread, markRead, parseReadCursors } from './unread'
const room = '00000000-0000-0000-0000-000000000001'
describe('새 메시지 읽음 표시', () => {
  it('확인한 메시지까지만 읽음 처리하고 늦게 도착한 메시지는 남긴다', () => {
    const cursors = markRead({}, room, 10)
    expect(hasUnread({ roomId: room, latestId: 10 }, cursors)).toBe(false)
    expect(hasUnread({ roomId: room, latestId: 11 }, cursors)).toBe(true)
    expect(markRead(cursors, room, 9)[room]).toBe(10)
    expect(hasUnread({ roomId: room, latestId: 0 }, {})).toBe(false)
    expect(hasUnread({ roomId: 'other', latestId: 2 }, cursors)).toBe(true)
  })
  it('손상된 저장값과 개인정보 필드를 버리고 유효한 ID만 읽는다', () => {
    expect(parseReadCursors('{bad')).toEqual({})
    expect(parseReadCursors('null')).toEqual({})
    expect(parseReadCursors('[1]')).toEqual({})
    expect(parseReadCursors(JSON.stringify({ [room]: 3, body: 'fake', another: 2 }))).toEqual({ [room]: 3 })
    expect(parseReadCursors(JSON.stringify({ [room]: -1 }))).toEqual({})
    expect(markRead({}, room, NaN)).toEqual({})
  })
})
