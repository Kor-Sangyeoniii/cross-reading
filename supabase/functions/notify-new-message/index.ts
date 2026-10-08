// CR-008 새 메시지 알림 Edge Function (Supabase, Deno).
// 흐름: 호출자 JWT 확인 → 그 메시지를 호출자가 "방금" 보냈는지 확인 → 같은 방 구성원(본인·차단자 제외)의 구독으로 웹 푸시.
// 알림 내용에는 메시지 본문을 넣지 않는다. 만료된 구독(404/410)은 지운다.
// 비밀값: VAPID_PRIVATE_KEY는 Supabase Edge Function 시크릿에만 둔다 (AGENTS.md P3).
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { isFreshMessage, newMessagePayload, pushRecipients } from '../../../src/core/pushPolicy.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const auth = req.headers.get('Authorization')
  if (!auth) return json(401, { error: 'not_authenticated' })

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return json(503, { error: 'push_not_configured' })

  let messageId: number
  try {
    messageId = Number((await req.json()).messageId)
    if (!Number.isInteger(messageId) || messageId <= 0) throw new Error()
  } catch {
    return json(400, { error: 'invalid_message' })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: userData } = await asUser.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return json(401, { error: 'not_authenticated' })

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: msg } = await admin.from('messages').select('room_id, sender_id, created_at').eq('id', messageId).maybeSingle()
  // 본인이 방금 보낸 메시지에 대해서만 알림을 보낸다.
  if (!msg || msg.sender_id !== uid || !isFreshMessage(msg.created_at)) return json(403, { error: 'not_allowed' })

  const [{ data: members }, { data: blockers }] = await Promise.all([
    admin.from('room_members').select('user_id').eq('room_id', msg.room_id),
    admin.from('blocks').select('blocker_id').eq('blocked_id', uid),
  ])
  const recipients = pushRecipients({
    memberIds: (members ?? []).map((m: { user_id: string }) => m.user_id),
    senderId: uid,
    blockedSenderBy: (blockers ?? []).map((b: { blocker_id: string }) => b.blocker_id),
  })
  if (recipients.length === 0) return json(200, { sent: 0 })

  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', recipients)

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  const payload = JSON.stringify(newMessagePayload(msg.room_id))
  let sent = 0
  const expired: number[] = []
  await Promise.all(
    (subs ?? []).map(async (s: { id: number; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 })
        sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) expired.push(s.id)
      }
    }),
  )
  if (expired.length > 0) await admin.from('push_subscriptions').delete().in('id', expired)

  return json(200, { sent })
})
