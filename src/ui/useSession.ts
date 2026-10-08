import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { MyProfile } from '../lib/profile'

// 로그인 상태와 내 프로필을 화면 전체에서 같이 쓴다 (값은 session.tsx의 SessionProvider가 채운다).

export interface SessionState {
  /** undefined = 아직 확인 중 */
  session: Session | null | undefined
  /** undefined = 아직 확인 중, null = 프로필 없음 */
  profile: MyProfile | null | undefined
  profileError: boolean
  refreshProfile: () => Promise<void>
}

export const SessionContext = createContext<SessionState | null>(null)

export function useSession(): SessionState {
  const v = useContext(SessionContext)
  if (!v) throw new Error('SessionProvider 밖에서 사용')
  return v
}

/** 로그인된 화면에서만 쓴다 */
export function useUserId(): string {
  const { session } = useSession()
  if (!session) throw new Error('로그인 필요')
  return session.user.id
}
