import { useEffect, useRef, type ReactNode } from 'react'
import { navigate } from './router'
import { LoadingMark } from './LoadingMark'

// 화면 공통 부품: 머리글, 아래 탭, 아래에서 열리는 패널, 로딩·오류.

export function TopBar({ title, back, right }: { title: string; back?: string | (() => void); right?: ReactNode }) {
  const onBack = () => {
    if (typeof back === 'function') back()
    else if (back) navigate(back)
  }
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" type="button" onClick={onBack} aria-label="뒤로">
          ←
        </button>
      ) : (
        <span className="spacer" />
      )}
      <h1>{title}</h1>
      {right ?? <span className="spacer" />}
    </header>
  )
}

export function Tabs({ current }: { current: 'rooms' | 'me' }) {
  return (
    <nav className="tabs" aria-label="주요 메뉴">
      <button className="tab" type="button" aria-current={current === 'rooms' ? 'page' : undefined} onClick={() => navigate('/rooms')}>
        <span aria-hidden="true">💬</span>
        <span>관계</span>
      </button>
      <button className="tab" type="button" aria-current={current === 'me' ? 'page' : undefined} onClick={() => navigate('/me')}>
        <span aria-hidden="true">🙂</span>
        <span>내 프로필</span>
      </button>
    </nav>
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Loading({ text }: { text: string }) {
  return (
    <div className="center" role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
      <LoadingMark />
      <p className="muted">{text}</p>
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button className="btn small secondary" type="button" onClick={onRetry} style={{ marginTop: 8 }}>
          다시 시도
        </button>
      )}
    </div>
  )
}
