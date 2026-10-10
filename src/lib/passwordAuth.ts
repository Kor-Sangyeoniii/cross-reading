import { withBase } from './basePath'
import { supabase } from './supabase'

export type PasswordAction = 'login' | 'signup' | 'recover'
export const PASSWORD_MIN_LENGTH = 8
export class PasswordInputError extends Error {}

export function normalizeEmail(email: string): string {
  const value = email.trim()
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new PasswordInputError('이메일 형식의 아이디를 입력해 주세요.')
  }
  return value
}
export function checkPassword(password: string, confirmation: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) throw new PasswordInputError('비밀번호는 8자 이상으로 입력해 주세요.')
  if (password !== confirmation) throw new PasswordInputError('비밀번호 확인이 일치하지 않아요.')
}
function client() {
  if (!supabase) throw new Error('인증 서비스를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
  return supabase
}
// SDK error descriptions can contain identifiers; only fixed messages leave this module.
class PasswordRequestError extends Error {}
function failure(code?: string): Error {
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return new PasswordRequestError('요청이 많아요. 잠시 기다린 뒤 다시 시도해 주세요.')
  if (code === 'weak_password') return new PasswordRequestError('더 긴 비밀번호에 문자·숫자·기호를 조합해 주세요.')
  if (code === 'email_not_confirmed') return new PasswordRequestError('가입 확인 메일의 링크를 먼저 열어 주세요.')
  return new PasswordRequestError('인증하지 못했어요. 입력한 정보와 가입 확인 메일을 확인하거나 잠시 후 다시 시도해 주세요.')
}
export async function passwordAuth(action: PasswordAction, email: string, password = '', confirmation = '') {
  const normalized = normalizeEmail(email)
  if (action === 'signup') checkPassword(password, confirmation)
  if (action === 'login' && !password) throw new PasswordInputError('비밀번호를 입력해 주세요.')
  try {
    if (action === 'recover') {
      const { error } = await client().auth.resetPasswordForEmail(normalized, { redirectTo: window.location.origin + withBase('/auth/reset-password') })
      if (error) throw failure(error.code)
      return { kind: 'recovery-requested' as const }
    }
    const response = action === 'signup'
      ? await client().auth.signUp({ email: normalized, password, options: { emailRedirectTo: window.location.origin + withBase('/auth/callback') } })
      : await client().auth.signInWithPassword({ email: normalized, password })
    if (response.error) throw failure(response.error.code)
    if (response.data.session) return { kind: 'signed-in' as const }
    if (action === 'signup') return { kind: 'confirmation-needed' as const }
    throw failure()
  } catch (e) {
    // Only our fixed messages are propagated, never provider error objects.
    if (e instanceof PasswordRequestError) throw e
    throw failure()
  }
}
export async function changePassword(password: string, confirmation: string): Promise<void> {
  checkPassword(password, confirmation)
  try {
    const { error } = await client().auth.updateUser({ password })
    if (error) throw failure(error.code)
  } catch { throw new Error('비밀번호를 변경하지 못했어요. 더 긴 비밀번호를 사용하거나 재설정 링크를 다시 받아 주세요.') }
}
