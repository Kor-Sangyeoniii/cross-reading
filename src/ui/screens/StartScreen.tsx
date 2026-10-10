import { useState } from 'react'
import { startLogin, type LoginProvider } from '../../lib/auth'
import { stripBase } from '../../lib/basePath'

// 01 시작 + 07 로그인 (처음부터 로그인 — 확정). 초대 링크로 들어온 경우 같은 화면에서 초대 안내를 먼저 보여준다.

export function StartScreen({ invited }: { invited?: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<LoginProvider | null>(null)

  async function login(provider: LoginProvider) {
    setNotice('')
    setBusy(provider)
    try {
      const result = await startLogin(provider, stripBase(window.location.pathname) + window.location.search)
      if (result.kind === 'open-external') {
        if (result.url) window.location.href = result.url
        setNotice('구글 로그인은 카카오톡 안에서 열 수 없어요. 오른쪽 위 메뉴에서 ‘다른 브라우저로 열기’를 눌러 주세요.')
        setBusy(null)
      } else if (result.kind === 'error') {
        setNotice('인증을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.')
        setBusy(null)
      }
    } catch {
      setNotice('인증을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setBusy(null)
    }
  }

  return (
    <main className="screen">
      <div className="hero">
        <h1>Cross Reading</h1>
        {invited ? (
          <p>친구가 함께 궁합을 보고 싶어 해요.<br />로그인하면 초대를 확인할 수 있어요.</p>
        ) : (
          <p>나를 알아보고, 서로를 더 이해해요.<br />사주와 MBTI로 시작하는 우리 이야기</p>
        )}
      </div>

      <section className="stack" aria-labelledby="auth-title">
        <h2 id="auth-title">{mode === 'login' ? '로그인' : '회원가입'}</h2>
        <p className="muted small">
          {mode === 'login'
            ? '가입할 때 사용한 계정으로 로그인해 주세요. 처음 이용하는 계정은 인증 후 가입 절차로 안내해요.'
            : '계정 인증 후 이용 동의와 내 프로필을 입력해요. 이미 가입한 계정이면 바로 앱으로 연결돼요.'}
        </p>
        <button className="btn kakao" type="button" disabled={busy !== null} onClick={() => login('kakao')}>
          {busy === 'kakao' ? '카카오로 이동 중…' : mode === 'login' ? '카카오 계정으로 로그인' : '카카오 계정으로 회원가입'}
        </button>
        <button className="btn google" type="button" disabled={busy !== null} onClick={() => login('google')}>
          {busy === 'google' ? '구글로 이동 중…' : mode === 'login' ? '구글 계정으로 로그인' : '구글 계정으로 회원가입'}
        </button>
        <p className="muted small" style={{ textAlign: 'center' }}>
          {mode === 'login' ? '계정이 없으신가요?' : '이미 가입하셨나요?'}
        </p>
        <button className="btn secondary" type="button" disabled={busy !== null} onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login')
          setNotice('')
        }}>
          {mode === 'login' ? '회원가입' : '로그인으로 돌아가기'}
        </button>
        {notice && <p className="notice" role="status">{notice}</p>}
        <p className="muted small" style={{ textAlign: 'center' }}>
          계정 인증만으로 이용 동의나 친구 초대 수락이 처리되지 않아요.
        </p>
      </section>
    </main>
  )
}
