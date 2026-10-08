import { useState } from 'react'
import { startLogin, type LoginProvider } from '../../lib/auth'
import { stripBase } from '../../lib/basePath'

// 01 시작 + 07 로그인 (처음부터 로그인 — 확정). 초대 링크로 들어온 경우 같은 화면에서 초대 안내를 먼저 보여준다.

export function StartScreen({ invited }: { invited?: boolean }) {
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<LoginProvider | null>(null)

  async function login(provider: LoginProvider) {
    setNotice('')
    setBusy(provider)
    const result = await startLogin(provider, stripBase(window.location.pathname) + window.location.search)
    if (result.kind === 'open-external') {
      if (result.url) window.location.href = result.url
      setNotice('구글 로그인은 카카오톡 안에서 열 수 없어요. 오른쪽 위 메뉴에서 ‘다른 브라우저로 열기’를 눌러 주세요.')
      setBusy(null)
    } else if (result.kind === 'error') {
      setNotice('로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.')
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

      {!invited && (
        <div className="card example stack" style={{ marginBottom: 24 }}>
          <p className="muted small">우리 모임 궁합</p>
          <p style={{ fontWeight: 700 }}>우리 모임은 불(화) 기운이 가장 많아요.</p>
          <p className="muted small">대화 질문 · 여행 갈 때 계획을 세우는 편이야, 즉흥적인 편이야?</p>
        </div>
      )}

      <div className="stack">
        <button className="btn kakao" type="button" disabled={busy !== null} onClick={() => login('kakao')}>
          {busy === 'kakao' ? '카카오로 이동 중…' : '카카오로 시작하기'}
        </button>
        <button className="btn google" type="button" disabled={busy !== null} onClick={() => login('google')}>
          {busy === 'google' ? '구글로 이동 중…' : '구글로 시작하기'}
        </button>
        {notice && <p className="notice" role="status">{notice}</p>}
        <p className="muted small" style={{ textAlign: 'center' }}>
          로그인만으로는 어떤 동의도 처리되지 않아요. 다음 화면에서 직접 확인해요.
        </p>
      </div>
    </main>
  )
}
