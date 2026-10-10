/** Only message IDs and room IDs are retained; no message bodies, names or birth input. */
export type ReadCursors = Record<string, number>
export interface MessageNotice { roomId: string; latestId: number }
export function hasUnread(notice: MessageNotice, cursors: ReadCursors): boolean {
  return notice.latestId > (cursors[notice.roomId] ?? 0)
}
export function markRead(cursors: ReadCursors, roomId: string, messageId: number): ReadCursors {
  if (!Number.isSafeInteger(messageId) || messageId < 0) return cursors
  return { ...cursors, [roomId]: Math.max(cursors[roomId] ?? 0, messageId) }
}
export function parseReadCursors(raw: string | null): ReadCursors {
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([key, id]) => /^[0-9a-f-]{36}$/i.test(key) && Number.isSafeInteger(id) && id >= 0))
  } catch { return {} }
}
