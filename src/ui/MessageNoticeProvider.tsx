import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { hasUnread, markRead, parseReadCursors, type MessageNotice, type ReadCursors } from '../core/unread'
import { listMessageNotices, subscribeMessageNotices } from '../lib/messageNotices'
import { MessageNoticesContext } from './notices'
import { useSession } from './useSession'
import { navigate } from './router'

export function MessageNoticeProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useSession()
  // Remount on account change to prevent even a frame of another account's notice state.
  const userId = session?.user.id
  return userId && profile ? <AccountNotices key={userId} userId={userId}>{children}</AccountNotices> : children
}

function AccountNotices({ userId, children }: { userId: string; children: ReactNode }) {
  const storageKey = `cr:read:${userId}`
  const [cursors, setCursors] = useState<ReadCursors>(() => {
    try { return parseReadCursors(sessionStorage.getItem(storageKey)) } catch { return {} }
  })
  const [notices, setNotices] = useState<MessageNotice[]>([])
  const [unavailable, setUnavailable] = useState(false)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((r) => r + 1), [])

  useEffect(() => {
    let alive = true
    let generation = 0
    const load = async () => {
      if (document.visibilityState === 'hidden') return
      const current = ++generation
      try {
        const next = await listMessageNotices(userId)
        if (alive && current === generation) { setNotices(next); setUnavailable(false) }
      } catch { if (alive && current === generation) setUnavailable(true) }
    }
    void load()
    // Realtime plus visible-page polling catches missed events and newly joined rooms.
    const unsubscribe = subscribeMessageNotices(() => void load(), () => alive && setUnavailable(true))
    const interval = window.setInterval(() => void load(), 30000)
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', load)
    return () => {
      alive = false; generation++; unsubscribe(); clearInterval(interval)
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', load)
    }
  }, [userId, revision])

  const markRoomRead = useCallback((roomId: string, messageId: number) => {
    setCursors((prev) => {
      const next = markRead(prev, roomId, messageId)
      try { sessionStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* In-memory fallback. */ }
      return next
    })
  }, [storageKey])

  const unreadRooms = notices.filter((n) => hasUnread(n, cursors)).map((n) => n.roomId)
  return <MessageNoticesContext.Provider value={{
    unreadRooms,
    latestByRoom: Object.fromEntries(notices.map((n) => [n.roomId, n.latestId])),
    markRoomRead, refresh, unavailable,
  }}>
    {unreadRooms.length > 0 && <div role="status" style={{ maxWidth: 480, margin: '0 auto', padding: '8px 16px' }}><button className="btn small secondary" type="button" onClick={() => navigate('/rooms')}>새 메시지가 있는 모임 {unreadRooms.length}개 · 확인하기</button></div>}
    {children}
  </MessageNoticesContext.Provider>
}
