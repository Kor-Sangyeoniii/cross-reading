import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { SessionContext as Ctx } from './useSession'
import { getSession, onSessionChange } from '../lib/auth'
import { getMyProfile, type MyProfile } from '../lib/profile'
import { takeReturnTo } from '../lib/redirect'
import { supabase } from '../lib/supabase'
import { navigate } from './router'

// 로그인 상태와 내 프로필을 화면 전체에서 같이 쓴다.

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [profile, setProfile] = useState<MyProfile | null | undefined>(undefined)
  const [profileError, setProfileError] = useState(false)

  const refreshProfile = useCallback(async () => {
    setProfileError(false)
    try {
      setProfile(await getMyProfile())
    } catch {
      setProfileError(true)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    getSession().then((s) => alive && setSession(s))
    const stop = onSessionChange((s) => {
      setSession(s)
      // 로그인 후 /auth/callback 으로 돌아오면 원래 보던 곳(예: 초대 링크)으로 보낸다.
      if (s && window.location.pathname === '/auth/callback') navigate(takeReturnTo(), { replace: true })
    })
    return () => {
      alive = false
      stop()
    }
  }, [])

  // 토큰이 갱신될 때마다(세션 객체가 바뀔 때마다) 다시 불러오지 않도록 사용자 ID 기준으로만 불러온다.
  const userId = session?.user.id
  const signedOut = session === null
  useEffect(() => {
    if (!userId) {
      setProfile(signedOut ? null : undefined)
      return
    }
    setProfile(undefined)
    void refreshProfile()
  }, [userId, signedOut, refreshProfile])

  return <Ctx.Provider value={{ session, profile, profileError, refreshProfile }}>{children}</Ctx.Provider>
}
