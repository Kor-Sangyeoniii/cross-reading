import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ from: vi.fn(), invoke: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { from: mock.from, functions: { invoke: mock.invoke } } }))

const query = (data: unknown, error: unknown = null) => {
  const q = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error }), then: (resolve: (v: unknown) => void) => Promise.resolve({ data, error }).then(resolve) }
  q.select.mockReturnValue(q); q.eq.mockReturnValue(q)
  return q
}
let sub: { endpoint: string; toJSON: ReturnType<typeof vi.fn>; unsubscribe: ReturnType<typeof vi.fn> }
let getSubscription: ReturnType<typeof vi.fn>
let insert: ReturnType<typeof vi.fn>
let permission: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks()
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID')
  sub = { endpoint: 'https://push.example.invalid/fake', toJSON: vi.fn(() => ({ endpoint: 'https://push.example.invalid/fake', keys: { auth: 'fake-auth', p256dh: 'fake-key' } })), unsubscribe: vi.fn().mockResolvedValue(true) }
  getSubscription = vi.fn().mockResolvedValue(sub)
  insert = vi.fn().mockResolvedValue({ error: null })
  permission = vi.fn().mockResolvedValue('granted')
  const reg = { active: {}, pushManager: { getSubscription, subscribe: vi.fn().mockResolvedValue(sub) } }
  vi.stubGlobal('navigator', { userAgent: 'Synthetic Browser', serviceWorker: { getRegistration: vi.fn().mockResolvedValue(reg) } })
  vi.stubGlobal('window', { PushManager: {}, matchMedia: () => ({ matches: false }) })
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: permission })
  // currentPushSupport requires property presence on window too.
  Object.assign(window, { Notification: {} })
  mock.from.mockReturnValue({ insert, select: () => query({ id: 1 }), delete: () => query(null) })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('웹 푸시 등록·실패 상태', () => {
  it('브라우저 구독만 있고 현재 계정의 DB 등록이 없으면 꺼짐이다', async () => {
    mock.from.mockReturnValue({ select: () => query(null) })
    expect(await (await import('./push')).currentPushState('fake-user')).toBe('disabled')
  })
  it('중복 endpoint 오류를 본인 DB 등록 확인 없이 성공으로 삼지 않는다', async () => {
    insert.mockResolvedValue({ error: { code: '23505' } })
    mock.from.mockReturnValue({ insert, select: () => query(null) })
    await expect((await import('./push')).enablePush('fake-user')).rejects.toThrow()
    expect(sub.unsubscribe).not.toHaveBeenCalled()
  })
  it('본인 등록이 확인되는 반복 켜기는 성공한다', async () => {
    insert.mockResolvedValue({ error: { code: '23505' } })
    await (await import('./push')).enablePush('fake-user')
    expect(permission).toHaveBeenCalledOnce()
  })
  it('DB 해제 실패 때 브라우저 구독을 보존하여 다시 시도할 수 있다', async () => {
    mock.from.mockReturnValue({ delete: () => query(null, { code: 'unknown' }) })
    await expect((await import('./push')).disablePush()).rejects.toThrow()
    expect(sub.unsubscribe).not.toHaveBeenCalled()
  })
  it('새 구독의 DB 저장 실패 때 구독을 되돌린다', async () => {
    getSubscription.mockResolvedValue(null)
    insert.mockResolvedValue({ error: { code: 'unknown' } })
    await expect((await import('./push')).enablePush('fake-user')).rejects.toThrow()
    expect(sub.unsubscribe).toHaveBeenCalledOnce()
  })
  it('권한 거절과 서비스워커 미등록을 끝나지 않는 대기 없이 처리한다', async () => {
    permission.mockResolvedValue('denied')
    await expect((await import('./push')).enablePush('fake-user')).rejects.toMatchObject({ code: 'push_denied' })
    permission.mockResolvedValue('granted')
    vi.mocked(navigator.serviceWorker.getRegistration).mockResolvedValue(undefined)
    await expect((await import('./push')).enablePush('fake-user')).rejects.toThrow()
  })
  it('Edge Function의 반환 오류와 전송 수를 확인한다', async () => {
    const { notifyRoom } = await import('./push')
    mock.invoke.mockResolvedValue({ error: new Error('fake'), data: null })
    expect(await notifyRoom(1)).toBe(false)
    mock.invoke.mockResolvedValue({ error: null, data: { sent: 0 } })
    expect(await notifyRoom(1)).toBe(true)
    mock.invoke.mockRejectedValue(new Error('fake'))
    expect(await notifyRoom(1)).toBe(false)
  })
})
