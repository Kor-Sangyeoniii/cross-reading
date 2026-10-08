// 로그인 후 돌아갈 위치(예: 초대 링크)를 안전하게 다룬다 (CR-003).
// 외부 주소로 보내는 오픈 리다이렉트를 막기 위해 같은 사이트의 상대 경로만 허용한다.

const RETURN_KEY = 'cr.returnTo'

export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value) return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  if (/[\r\n]/.test(value)) return '/'
  return value
}

export function rememberReturnTo(path: string, storage: Pick<Storage, 'setItem'> = sessionStorage): void {
  try {
    storage.setItem(RETURN_KEY, sanitizeReturnTo(path))
  } catch {
    // 저장소를 못 쓰면(사생활 보호 모드 등) 첫 화면으로 돌아간다.
  }
}

export function takeReturnTo(storage: Pick<Storage, 'getItem' | 'removeItem'> = sessionStorage): string {
  try {
    const value = storage.getItem(RETURN_KEY)
    storage.removeItem(RETURN_KEY)
    return sanitizeReturnTo(value)
  } catch {
    return '/'
  }
}
