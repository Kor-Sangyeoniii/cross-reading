import { pushSupport, urlBase64ToUint8Array, type PushSupport } from '../core/pushPolicy'
import { AppError, toAppError } from './errors'
import { supabase } from './supabase'

// 새 메시지 알림 켜기·끄기 (CR-008). 알림 권한은 사용자가 버튼을 눌렀을 때만 묻는다.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function currentPushSupport(): PushSupport {
  return pushSupport({
    userAgent: navigator.userAgent,
    standalone:
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    hasPushManager: 'serviceWorker' in navigator && 'PushManager' in window,
    hasNotification: 'Notification' in window,
  })
}

export type PushState = 'enabled' | 'disabled' | 'unconfigured'
export function pushConfigured(): boolean { return Boolean(VAPID_PUBLIC_KEY && supabase) }

async function registration(): Promise<ServiceWorkerRegistration> {
  // Development builds do not register a service worker. Avoid waiting forever on ready.
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg?.active) throw new AppError('push_unsupported')
  return reg
}

/** Browser permission alone does not demonstrate that this account is registered on the server. */
export async function currentPushState(userId: string): Promise<PushState> {
  if (!pushConfigured()) return 'unconfigured'
  if (Notification.permission !== 'granted') return 'disabled'
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return 'disabled'
  const { data, error } = await supabase!.from('push_subscriptions').select('id').eq('user_id', userId).eq('endpoint', sub.endpoint).maybeSingle()
  if (error) throw toAppError(error)
  return data ? 'enabled' : 'disabled'
}

/** Called only from a user gesture. Recheck server ownership instead of swallowing uniqueness failures. */
export async function enablePush(userId: string): Promise<void> {
  const support = currentPushSupport()
  if (support !== 'supported') throw new AppError(support === 'install_required' ? 'push_install_required' : 'push_unsupported')
  if (!pushConfigured()) throw new AppError('push_unsupported')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new AppError('push_denied')
  const reg = await registration()
  const existing = await reg.pushManager.getSubscription()
  const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) })
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  try {
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new AppError('push_unsupported')
    const { error } = await supabase!.from('push_subscriptions').insert({ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
    if (error && error.code !== '23505') throw toAppError(error)
    if (await currentPushState(userId) !== 'enabled') throw new AppError('unknown')
  } catch (error) {
    if (!existing) await sub.unsubscribe().catch(() => false)
    throw error
  }
}

/** Delete server binding before browser subscription, so a failed DB operation remains retryable. */
export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !supabase) return
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  if (error) throw toAppError(error)
  if (!(await sub.unsubscribe())) throw new AppError('unknown')
}

/** Notification failure does not invalidate a message already stored in the database. */
export async function notifyRoom(messageId: number): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error, data } = await supabase.functions.invoke('notify-new-message', { body: { messageId } })
    return !error && typeof data?.sent === 'number'
  } catch { return false }
}
