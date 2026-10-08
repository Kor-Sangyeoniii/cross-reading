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

/** 알림 켜기. 버튼 클릭 핸들러 안에서 호출해야 한다(브라우저 권한 정책). */
export async function enablePush(userId: string): Promise<void> {
  const support = currentPushSupport()
  if (support !== 'supported') throw new AppError(support === 'install_required' ? 'push_install_required' : 'push_unsupported')
  if (!VAPID_PUBLIC_KEY || !supabase) throw new AppError('push_unsupported')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new AppError('push_denied')

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }))
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new AppError('push_unsupported')

  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
  // 같은 기기가 이미 등록돼 있으면(unique 위반) 성공으로 본다.
  if (error && !String(error.code).startsWith('23505')) throw toAppError(error)
}

/** 알림 끄기: 이 기기의 구독을 브라우저와 DB에서 모두 지운다. */
export async function disablePush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !supabase) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw toAppError(error)
}

/** 메시지를 보낸 직후 호출: 같은 방 다른 사람들에게 알림. 실패해도 메시지 전송은 이미 끝났으므로 조용히 넘어간다. */
export async function notifyRoom(messageId: number): Promise<void> {
  if (!supabase) return
  try {
    await supabase.functions.invoke('notify-new-message', { body: { messageId } })
  } catch {
    // 알림 실패는 사용자에게 오류로 보이지 않는다.
  }
}
