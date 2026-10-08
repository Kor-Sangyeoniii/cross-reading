import { useEffect, useState } from 'react'
import { stripBase, withBase } from '../lib/basePath'

// 아주 작은 주소 이동 도구 (라이브러리 없이 history API만 사용).
// 화면 주소: / · /me · /rooms · /rooms/:id · /invite/:token · /settings · /onboarding

const EVENT = 'cr:navigate'

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) window.history.replaceState(null, '', withBase(path))
  else window.history.pushState(null, '', withBase(path))
  window.dispatchEvent(new Event(EVENT))
  window.scrollTo(0, 0)
}

export function usePath(): string {
  const [path, setPath] = useState(() => stripBase(window.location.pathname))
  useEffect(() => {
    const update = () => setPath(stripBase(window.location.pathname))
    window.addEventListener('popstate', update)
    window.addEventListener(EVENT, update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener(EVENT, update)
    }
  }, [])
  return path
}

export type Route =
  | { name: 'home' }
  | { name: 'me' }
  | { name: 'rooms' }
  | { name: 'room'; roomId: string }
  | { name: 'invite'; token: string }
  | { name: 'settings' }
  | { name: 'onboarding' }
  | { name: 'callback' }
  | { name: 'notFound' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function matchRoute(path: string): Route {
  const p = path.replace(/\/+$/, '') || '/'
  if (p === '/') return { name: 'home' }
  if (p === '/me') return { name: 'me' }
  if (p === '/rooms') return { name: 'rooms' }
  if (p === '/settings') return { name: 'settings' }
  if (p === '/onboarding') return { name: 'onboarding' }
  if (p === '/auth/callback') return { name: 'callback' }
  const room = /^\/rooms\/([^/]+)$/.exec(p)
  if (room && UUID.test(room[1])) return { name: 'room', roomId: room[1] }
  const invite = /^\/invite\/([a-f0-9]{64})$/.exec(p)
  if (invite) return { name: 'invite', token: invite[1] }
  return { name: 'notFound' }
}
