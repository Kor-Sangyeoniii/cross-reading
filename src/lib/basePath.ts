// 앱이 사이트의 하위 경로(예: GitHub Pages의 /cross-reading/)에 올라가도 주소가 맞도록 한다.
// 빌드할 때 VITE_BASE로 정한 값이 import.meta.env.BASE_URL에 들어온다. 기본은 '/'.

export const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '')

/** 앱 안 경로('/me') → 실제 주소 경로('/cross-reading/me') */
export function withBase(path: string, base: string = BASE): string {
  return base + (path.startsWith('/') ? path : `/${path}`)
}

/** 실제 주소 경로 → 앱 안 경로. 하위 경로 밖이면 그대로 둔다. */
export function stripBase(pathname: string, base: string = BASE): string {
  if (!base) return pathname || '/'
  if (pathname === base) return '/'
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname
}
