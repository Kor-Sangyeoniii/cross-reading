/** Future live client. Never creates verification results or payment/refund receipts. */
import { supabase } from './supabase'
export interface DatingProfileInput {
  nickname: string
  area: string
  slots: string[]
  intent: string
  gender: 'woman' | 'man'
  seeks: 'woman' | 'man'
  consentVersion: 'pilot-2026-10-13'
}
async function rpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error('서비스 연결을 준비하고 있어요.')
  const { data, error } = await supabase.rpc(name, args)
  if (error)
    throw new Error(
      '요청을 완료하지 못했어요. 연결 상태와 참여 조건을 확인해 주세요.',
    )
  return data as T
}
export const datingClient = {
  saveProfile: (p: DatingProfileInput) =>
    rpc<void>('dating_save_profile', {
      p_nickname: p.nickname,
      p_area: p.area,
      p_slots: p.slots,
      p_intent: p.intent,
      p_gender: p.gender,
      p_seeks: p.seeks,
      p_consent: p.consentVersion,
    }),
  activity: (active: boolean) =>
    rpc<void>('dating_activity', { p_active: active }),
  catalog: () => rpc<unknown[]>('dating_catalog'),
  dashboard: () => rpc<unknown[]>('dating_dashboard'),
  interest: (target: string) =>
    rpc<string>('dating_interest', { p_target: target }),
  createOrder: (connection: string) =>
    rpc<
      | { orderId: string; amount: number; currency: 'KRW'; status: string }
      | { status: 'expired' }
    >('dating_create_order', { p_connection: connection }),
  cancel: (connection: string) =>
    rpc<void>('dating_cancel', { p_connection: connection }),
  block: (target: string) => rpc<void>('dating_block', { p_target: target }),
  send: (connection: string, body: string) =>
    rpc<number>('dating_send', { p_connection: connection, p_body: body }),
  report: (
    connection: string,
    reason: 'money' | 'identity' | 'harassment' | 'other',
  ) =>
    rpc<string>('dating_report', {
      p_connection: connection,
      p_reason: reason,
    }),
  appeal: (review: string) => rpc<void>('dating_appeal', { p_review: review }),
}
