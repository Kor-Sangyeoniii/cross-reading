import { DELETE_CONFIRM } from '../core/accountPolicy'
import { AppError, toAppError } from './errors'
import { supabase } from './supabase'

// 계정 삭제 (CR-009). 화면에서 최종 확인("되돌릴 수 없어요")을 받은 뒤에만 호출한다.
// 최근 15분 안에 로그인하지 않았으면 'reauth_required' → 화면은 다시 로그인하게 한 뒤 재시도한다.

export async function deleteMyAccount(): Promise<void> {
  if (!supabase) throw new AppError('unknown')
  const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: DELETE_CONFIRM } })
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw toAppError(body ?? error)
  }
  // 서버에서 계정이 지워졌으므로 이 기기의 세션도 정리한다.
  await supabase.auth.signOut({ scope: 'local' })
}
