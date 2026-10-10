import { useRef, useState, type FormEvent } from 'react'
import { changePassword } from '../../lib/passwordAuth'
import { takeReturnTo } from '../../lib/redirect'
import { navigate } from '../router'
import { useSession } from '../useSession'
import { Loading, TopBar } from '../kit'

export function ResetPasswordScreen() {
  const { session } = useSession()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const invalid = new URLSearchParams(window.location.search).has('error') || new URLSearchParams(window.location.hash.slice(1)).has('error')
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pending.current || !session || invalid) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await changePassword(password, confirmation)
      setDone(true)
    } catch (e) { setError((e as Error).message) }
    finally { setPassword('');setConfirmation('');setBusy(false);pending.current = false }
  }
  if (session === undefined) return <Loading text="재설정 링크를 확인하고 있어요." />
  return <main className="screen"><TopBar title="비밀번호 재설정" />
    {!session || invalid ? <div className="stack"><p className="notice" role="alert">재설정 링크를 확인할 수 없어요. 메일을 요청한 브라우저에서 링크를 열거나 새 링크를 받아 주세요.</p><button className="btn" type="button" onClick={() => navigate('/', { replace: true })}>로그인 화면으로</button></div>
    : done ? <div className="stack"><p className="notice" role="status">비밀번호를 변경했어요.</p><button className="btn" type="button" onClick={() => navigate(takeReturnTo(), { replace: true })}>앱으로 돌아가기</button></div>
    : <form className="stack" onSubmit={submit} aria-label="새 비밀번호 설정"><p>새 비밀번호는 8자 이상으로 입력해 주세요.</p><label className="field">새 비밀번호<input className="input" type="password" autoComplete="new-password" required minLength={8} value={password} disabled={busy} onChange={(e) => setPassword(e.target.value)} /></label><label className="field">새 비밀번호 확인<input className="input" type="password" autoComplete="new-password" required value={confirmation} disabled={busy} onChange={(e) => setConfirmation(e.target.value)} /></label>{error && <p className="notice error" role="alert">{error}</p>}<button className="btn" type="submit" disabled={busy}>{busy ? '변경 중…' : '비밀번호 변경'}</button></form>}
  </main>
}
