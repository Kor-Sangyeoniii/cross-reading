import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { SessionContext as Ctx } from './useSession'
import { getSession, onSessionChange } from '../lib/auth'
import { getMyProfile, type MyProfile } from '../lib/profile'
import { takeReturnTo } from '../lib/redirect'
import { supabase } from '../lib/supabase'
import { stripBase } from '../lib/basePath'
import { navigate } from './router'

// 로그인 상태와 내 프로필을 화면 전체에서 같이 쓴다.

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [loaded, setLoaded] = useState<{ userId: string; profile: MyProfile | null } | null>(null)
  const [errorFor, setErrorFor] = useState<string | null>(null)
  const request = useRef(0)
  const invalidateRequest = useCallback(() => { request.current++ }, [])
  const userId = session?.user.id
  // A signed-out null profile is not evidence that the next signed-in user needs onboarding.
  const profile = session === null ? null : loaded?.userId === userId ? loaded?.profile : undefined
  const profileError = Boolean(userId && errorFor === userId)

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const version = ++request.current
    setErrorFor(null)
    try {
      const next = await getMyProfile()
      if (version === request.current) setLoaded({ userId, profile: next })
    } catch {
      if (version === request.current) setErrorFor(userId)
    }
  }, [userId])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    getSession().then((s) => alive && setSession(s))
    const stop = onSessionChange((s, event) => {
      setSession(s)
      // 로그인 후 /auth/callback 으로 돌아오면 원래 보던 곳(예: 초대 링크)으로 보낸다.
      if (s && event === 'PASSWORD_RECOVERY') navigate('/auth/reset-password', { replace: true })
      else if (s && stripBase(window.location.pathname) === '/auth/callback') navigate(takeReturnTo(), { replace: true })
    })
    return () => {
      alive = false
      stop()
    }
  }, [])

  // 토큰이 갱신될 때마다(세션 객체가 바뀔 때마다) 다시 불러오지 않도록 사용자 ID 기준으로만 불러온다.
  useEffect(() => {
    setLoaded(null)
    setErrorFor(null)
    if (userId) void refreshProfile()
    return invalidateRequest
  }, [userId, refreshProfile, invalidateRequest])

  return <Ctx.Provider value={{ session, profile, profileError, refreshProfile }}>{children}</Ctx.Provider>
}
