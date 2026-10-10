import { useRef, useState, type FormEvent } from 'react'
import { passwordAuth, type PasswordAction } from '../lib/passwordAuth'
import { stripBase } from '../lib/basePath'
import { rememberReturnTo } from '../lib/redirect'

export function PasswordAuth({ mode, disabled, onBusy }: { mode: 'login' | 'signup'; disabled: boolean; onBusy: (busy: boolean) => void }) {
  const [recover, setRecover] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const pending = useRef(false)
  const action: PasswordAction = recover ? 'recover' : mode
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pending.current || disabled) return
    pending.current = true
    onBusy(true)
    setError('')
    setNotice('')
    try {
      rememberReturnTo(stripBase(window.location.pathname) + window.location.search)
      const result = await passwordAuth(action, email, password, confirmation)
      setPassword('')
      setConfirmation('')
      if (result.kind === 'confirmation-needed') setNotice('가입 요청을 처리했어요. 확인 메일이 도착하면 메일을 요청한 브라우저에서 링크를 열어 주세요. 이미 가입한 계정이면 로그인이나 비밀번호 찾기를 이용해 주세요.')
      if (result.kind === 'recovery-requested') setNotice('가입된 이메일이면 재설정 안내를 보냈어요. 받은편지함과 스팸함을 확인하고, 메일을 요청한 브라우저에서 링크를 열어 주세요.')
    } catch (e) {
      setError((e as Error).message)
      setPassword('')
      setConfirmation('')
    } finally {
      pending.current = false
      onBusy(false)
    }
  }
  return <form className="card stack" onSubmit={submit} aria-label={recover ? '비밀번호 찾기' : '아이디·비밀번호 인증'}>
    <h3>{recover ? '비밀번호 찾기' : '아이디·비밀번호로 ' + (mode === 'login' ? '로그인' : '회원가입')}</h3>
    <label className="field">아이디 (이메일)<input className="input" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} disabled={disabled} onChange={(e) => setEmail(e.target.value)} /></label>
    {!recover && <label className="field">비밀번호<input className="input" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : undefined} value={password} disabled={disabled} onChange={(e) => setPassword(e.target.value)} /></label>}
    {!recover && mode === 'signup' && <><p className="muted small">비밀번호는 8자 이상으로 입력해 주세요. 가입 후 이메일 확인이 필요해요.</p><label className="field">비밀번호 확인<input className="input" type="password" autoComplete="new-password" required value={confirmation} disabled={disabled} onChange={(e) => setConfirmation(e.target.value)} /></label></>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <button className="btn" type="submit" disabled={disabled}>{disabled ? '처리 중…' : recover ? '재설정 메일 받기' : mode === 'signup' ? '아이디·비밀번호로 회원가입' : '아이디·비밀번호로 로그인'}</button>
    {mode === 'login' && <button className="btn secondary" type="button" disabled={disabled} onClick={() => {setRecover(!recover);setNotice('');setError('');setPassword('');setConfirmation('')}}>{recover ? '비밀번호 로그인으로 돌아가기' : '비밀번호를 잊으셨나요?'}</button>}
  </form>
}
