// 계정 삭제 정책 (CR-009). 브라우저와 서버 함수가 같이 쓴다.
// 계정 삭제는 되돌릴 수 없으므로: 사용자가 확인 문구를 보내고, 최근에 다시 로그인한 상태여야 한다.

export const DELETE_CONFIRM = 'DELETE_MY_ACCOUNT'
/** 마지막 로그인 후 이 시간(분) 안에만 삭제할 수 있다 */
export const REAUTH_WINDOW_MINUTES = 15

export type DeleteCheck = 'ok' | 'confirm_required' | 'reauth_required'

export function checkDeleteRequest(input: {
  confirm: unknown
  lastSignInAt: string | null | undefined
  now?: Date
}): DeleteCheck {
  if (input.confirm !== DELETE_CONFIRM) return 'confirm_required'
  if (!input.lastSignInAt) return 'reauth_required'
  const last = Date.parse(input.lastSignInAt)
  if (Number.isNaN(last)) return 'reauth_required'
  const now = (input.now ?? new Date()).getTime()
  const ageMinutes = (now - last) / 60000
  // 시계 오차로 미래 시각이 오는 경우도 1분까지만 허용
  if (ageMinutes < -1 || ageMinutes > REAUTH_WINDOW_MINUTES) return 'reauth_required'
  return 'ok'
}
