// 계정 삭제 정책 (CR-009). 브라우저와 서버 함수가 같이 쓴다.
// 계정 삭제는 되돌릴 수 없으므로: 사용자가 확인 문구를 보내고, 최근에 다시 로그인한 상태여야 한다.

export const DELETE_CONFIRM = 'DELETE_MY_ACCOUNT'
/** 마지막 로그인 후 이 시간(분) 안에만 삭제할 수 있다 */
export const REAUTH_WINDOW_MINUTES = 15

export type DeleteCheck = 'ok' | 'confirm_required' | 'reauth_required'

/**
 * 현재 세션이 로그인(인증)된 시각. Supabase 액세스 토큰의 amr 클레임 [{method, timestamp(초)}]에서 가장 최근 값.
 * 토큰 서명은 서버 함수가 auth.getUser()로 먼저 검증한 뒤에만 이 함수를 쓴다.
 * (GPT 리뷰 반영: 계정 전체의 마지막 로그인 시각이 아니라 "이 세션"의 인증 시각으로 재인증을 판단)
 */
export function sessionAuthTime(accessToken: string): Date | null {
  try {
    const part = accessToken.split('.')[1]
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4)))
    const times = Array.isArray(json.amr)
      ? json.amr.map((a: { timestamp?: unknown }) => a?.timestamp).filter((t: unknown): t is number => typeof t === 'number')
      : []
    return times.length > 0 ? new Date(Math.max(...times) * 1000) : null
  } catch {
    return null
  }
}

export function checkDeleteRequest(input: {
  confirm: unknown
  /** 현재 세션의 인증 시각 (sessionAuthTime) */
  sessionAuthAt: Date | null
  now?: Date
}): DeleteCheck {
  if (input.confirm !== DELETE_CONFIRM) return 'confirm_required'
  if (!input.sessionAuthAt || Number.isNaN(input.sessionAuthAt.getTime())) return 'reauth_required'
  const now = (input.now ?? new Date()).getTime()
  const ageMinutes = (now - input.sessionAuthAt.getTime()) / 60000
  // 시계 오차로 미래 시각이 오는 경우도 1분까지만 허용
  if (ageMinutes < -1 || ageMinutes > REAUTH_WINDOW_MINUTES) return 'reauth_required'
  return 'ok'
}
