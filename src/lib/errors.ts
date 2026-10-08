// DB·서버 오류 코드를 사용자에게 보여줄 쉬운 문장으로 바꾼다 (CR-010).
// 오류 원문(내부 메시지)은 화면에 그대로 보여주지 않는다.

const MESSAGES: Record<string, string> = {
  not_authenticated: '로그인이 필요해요.',
  profile_required: '먼저 내 프로필을 만들어 주세요.',
  calc_consent_required: '궁합 계산에 내 정보를 쓰는 데 동의해야 초대를 수락할 수 있어요.',
  invite_invalid: '초대 링크가 만료되었거나 취소되었어요. 친구에게 새 링크를 요청해 주세요.',
  room_full: '이 모임은 이미 4명이 모두 모였어요.',
  room_not_open: '친구가 한 명 이상 들어와야 대화할 수 있어요.',
  age_under_14: '만 14세 이상만 이용할 수 있어요.',
  not_a_member: '이 모임의 구성원만 볼 수 있어요.',
  message_empty: '메시지를 입력해 주세요.',
  message_too_long: '메시지는 2000자까지 보낼 수 있어요.',
  report_reason_required: '신고 이유를 입력해 주세요.',
  confirm_required: '계정 삭제를 한 번 더 확인해 주세요.',
  reauth_required: '안전을 위해 다시 로그인한 뒤 삭제해 주세요.',
  delete_failed: '계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
  push_install_required: '아이폰은 홈 화면에 추가한 뒤에 알림을 받을 수 있어요.',
  push_unsupported: '이 브라우저에서는 알림을 받을 수 없어요.',
  push_denied: '알림이 꺼져 있어요. 휴대폰 설정에서 알림을 허용해 주세요.',
}

const DEFAULT_MESSAGE = '잠시 후 다시 시도해 주세요.'

export class AppError extends Error {
  readonly code: string
  constructor(code: string) {
    super(MESSAGES[code] ?? DEFAULT_MESSAGE)
    this.name = 'AppError'
    this.code = code
  }
}

/** Supabase/PostgREST 오류나 Edge Function 응답에서 알려진 코드를 찾아 AppError로 바꾼다. */
export function toAppError(error: unknown): AppError {
  const text =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object'
        ? [
            (error as { message?: unknown }).message,
            (error as { code?: unknown }).code,
            (error as { error?: unknown }).error,
          ].filter((v) => typeof v === 'string').join(' ')
        : ''
  const code = Object.keys(MESSAGES).find((k) => text.includes(k))
  return new AppError(code ?? 'unknown')
}
