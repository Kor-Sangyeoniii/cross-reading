/// <reference lib="webworker" />
// 서비스워커 (CR-008): 앱 파일 캐시(PWA) + 새 메시지 알림 표시·클릭 처리.
import { precacheAndRoute } from 'workbox-precaching'
import type { PushPayload } from './core/pushPolicy'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => {
  void self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const FALLBACK: PushPayload = { title: 'Cross Reading', body: '새 소식이 있어요', url: '/', tag: 'cross-reading' }

self.addEventListener('push', (event) => {
  let payload = FALLBACK
  try {
    const data = event.data?.json() as Partial<PushPayload> | undefined
    // 같은 사이트 경로만 허용한다.
    if (data && typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')) {
      payload = { ...FALLBACK, ...data }
    }
  } catch {
    // 형식이 다르면 기본 문구로 보여준다.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/icon.svg',
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data as { url?: string } | undefined)?.url ?? '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => w.url.startsWith(self.location.origin))
      if (open) {
        await open.focus()
        await open.navigate(url)
      } else {
        await self.clients.openWindow(url)
      }
    })(),
  )
})
