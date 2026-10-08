import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSession, onSessionChange, signOut, startLogin, type LoginProvider } from './lib/auth'
import { takeReturnTo } from './lib/redirect'
import { supabase } from './lib/supabase'

// 임시 확인 화면 (CR-003). 로그인 연결만 확인한다.
// 실제 화면은 src/ui/ (GPT 담당, 와이어프레임 v0.5 기준)에서 만들고 이 파일은 그때 교체한다.
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) return
    getSession().then(setSession)
    const stop = onSessionChange((s) => {
      setSession(s)
      // 로그인 후 /auth/callback 으로 돌아오면 원래 보던 곳(예: 초대 링크)으로 보낸다.
      if (s && window.location.pathname === '/auth/callback') {
        window.history.replaceState(null, '', takeReturnTo())
      }
    })
    return stop
  }, [])

  async function login(provider: LoginProvider) {
    const result = await startLogin(provider, window.location.pathname + window.location.search)
    if (result.kind === 'open-external') {
      if (result.url) window.location.href = result.url
      setNotice('구글 로그인은 카카오톡 안에서 열 수 없어요. 오른쪽 위 메뉴에서 "다른 브라우저로 열기"를 눌러 주세요.')
    } else if (result.kind === 'error') {
      setNotice(`로그인을 시작하지 못했어요: ${result.message}`)
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h1>Cross Reading</h1>
      <p>나를 알아보고, 서로를 더 이해해요.</p>
      {!supabase && <p>개발 설정(.env.local)이 없습니다.</p>}
      {supabase && !session && (
        <div style={{ display: 'grid', gap: 12 }}>
          <button onClick={() => login('kakao')} style={{ minHeight: 48 }}>카카오로 시작하기</button>
          <button onClick={() => login('google')} style={{ minHeight: 48 }}>구글로 시작하기</button>
        </div>
      )}
      {session && (
        <div>
          <p>로그인됨 ({session.user.app_metadata.provider})</p>
          <button onClick={() => signOut()} style={{ minHeight: 44 }}>로그아웃</button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <p style={{ color: '#566371', fontSize: 14 }}>개발 중인 화면입니다.</p>
    </main>
  )
}
