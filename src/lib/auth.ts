import type { Session } from '@supabase/supabase-js'
import { detectInAppBrowser, kakaoOpenExternalUrl } from './inapp'
import { rememberReturnTo } from './redirect'
import { supabase } from './supabase'

// 로그인 (CR-003). 제공자: 카카오 + 구글 (DECISIONS.md 2026-10-08).

export type LoginProvider = 'kakao' | 'google'

export type LoginStart =
  | { kind: 'redirecting' }
  /** 구글 + 인앱 브라우저: 외부 브라우저로 열어야 한다. url이 있으면 그 주소로 이동시키고, 없으면 안내만 한다. */
  | { kind: 'open-external'; url: string | null }
  | { kind: 'error'; message: string }

function requireClient() {
  if (!supabase) throw new Error('Supabase 설정이 없습니다. .env.local을 확인하세요.')
  return supabase
}

/**
 * 로그인 시작. returnTo는 로그인 후 돌아올 같은 사이트 경로(예: '/invite/abc').
 * 사용자 버튼 클릭 핸들러 안에서 바로 호출해야 한다(외부 브라우저 전환이 사용자 동작을 요구함).
 */
export async function startLogin(
  provider: LoginProvider,
  returnTo: string,
  userAgent: string = navigator.userAgent,
): Promise<LoginStart> {
  const inApp = detectInAppBrowser(userAgent)
  if (provider === 'google' && inApp) {
    const here = window.location.href
    return { kind: 'open-external', url: inApp === 'kakaotalk' ? kakaoOpenExternalUrl(here) : null }
  }

  rememberReturnTo(returnTo)
  const { error } = await requireClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) return { kind: 'error', message: error.message }
  return { kind: 'redirecting' }
}

export async function getSession(): Promise<Session | null> {
  const { data } = await requireClient().auth.getSession()
  return data.session
}

export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = requireClient().auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function signOut(): Promise<void> {
  await requireClient().auth.signOut()
}
