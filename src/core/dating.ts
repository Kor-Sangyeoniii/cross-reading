/** Dating pilot rules. All demo identities are fictional; no provider/API calls here. */
import type { CharacterKind } from './chemistry'
export const CONNECTION_PRICE = 3000
export const PAYMENT_WINDOW = 24 * 60 * 60 * 1000
export const ACTIVITY_WINDOW = 7 * PAYMENT_WINDOW
export type PersonaId = 'mori' | 'tao' | 'dodo' | 'mong'
export type MemberStatus = 'active' | 'paused' | 'restricted'
export interface DatingPersona {
  id: PersonaId
  name: string
  age: number
  gender: 'woman' | 'man'
  seeks: 'woman' | 'man'
  area: string
  slots: string[]
  intent: string
  style: string
  opener: string
  character: CharacterKind
  adultVerified: boolean
  photoReviewed: boolean
  status: MemberStatus
  confirmedAt: number
}
export type PaymentStatus =
  | 'unpaid'
  | 'paid'
  | 'refund_pending'
  | 'refund_failed'
  | 'refunded'
export interface Connection {
  id: string
  members: [PersonaId, PersonaId]
  likes: PersonaId[]
  payments: Record<string, PaymentStatus>
  expiresAt: number | null
  status: 'interest' | 'mutual' | 'waiting' | 'open' | 'closed'
  closedReason?: string
  openedAt?: number
}
export interface DatingMessage {
  id: number
  connectionId: string
  sender: PersonaId
  body: string
  at: number
}
export type ReportReason = 'money' | 'identity' | 'harassment' | 'other'
export interface DatingReport {
  id: number
  reporter: PersonaId
  target: PersonaId
  reason: ReportReason
  status: 'pending' | 'dismissed' | 'restricted'
  appeal: boolean
}
export interface DatingState {
  now: number
  people: DatingPersona[]
  connections: Connection[]
  messages: DatingMessage[]
  blocks: [PersonaId, PersonaId][]
  reports: DatingReport[]
}
export type DatingAction =
  | {
      type: 'interest' | 'pay' | 'cancel' | 'block'
      actor: PersonaId
      target: PersonaId
    }
  | { type: 'message'; actor: PersonaId; target: PersonaId; body: string }
  | {
      type: 'report'
      actor: PersonaId
      target: PersonaId
      reason: ReportReason
    }
  | { type: 'activity'; actor: PersonaId; active: boolean }
  | { type: 'advance'; milliseconds: number }
  | {
      type: 'refund'
      connectionId: string
      actor: PersonaId
      outcome: 'success' | 'failure'
    }
  | { type: 'review'; reportId: number; decision: 'dismissed' | 'restricted' }
  | { type: 'appeal'; actor: PersonaId; reportId: number }
  | { type: 'restore'; actor: PersonaId }

export function createDatingDemo(now = Date.now()): DatingState {
  const common = {
    area: '서울 서북권',
    intent: '천천히 알아가는 연애',
    adultVerified: true,
    photoReviewed: true,
    status: 'active' as const,
    confirmedAt: now,
  }
  return {
    now,
    connections: [],
    messages: [],
    blocks: [],
    reports: [],
    people: [
      {
        ...common,
        id: 'mori',
        name: '모리',
        age: 29,
        gender: 'woman',
        seeks: 'man',
        slots: ['토요일 오후', '평일 저녁'],
        style: '산책하며 편하게 이야기해요',
        opener: '최근에 걷다가 발견한 좋아하는 곳이 있나요?',
        character: 'sprout',
      },
      {
        ...common,
        id: 'tao',
        name: '타오',
        age: 30,
        gender: 'man',
        seeks: 'woman',
        slots: ['토요일 오후', '일요일 오후'],
        style: '작은 전시와 새로운 카페를 좋아해요',
        opener: '다음 주말에 같이 보고 싶은 전시가 있나요?',
        character: 'flame',
      },
      {
        ...common,
        id: 'dodo',
        name: '도담',
        age: 32,
        gender: 'woman',
        seeks: 'man',
        slots: ['일요일 오후'],
        style: '서두르지 않고 약속을 지켜요',
        opener: '쉬는 날 가장 편하게 느끼는 순간은 언제예요?',
        character: 'sun',
      },
      {
        ...common,
        id: 'mong',
        name: '몽울',
        age: 31,
        gender: 'man',
        seeks: 'woman',
        slots: ['평일 저녁', '일요일 오후'],
        style: '답장을 재촉하지 않고 들어줘요',
        opener: '요즘 푹 빠져 있는 작은 취미가 있나요?',
        character: 'cloud',
      },
    ],
  }
}
export function person(state: DatingState, id: PersonaId) {
  const p = state.people.find((p) => p.id === id)
  if (!p) throw new Error('참여자를 찾지 못했어요.')
  return p
}
export function pairId(a: PersonaId, b: PersonaId) {
  return [a, b].sort().join(':')
}
export function connectionFor(state: DatingState, a: PersonaId, b: PersonaId) {
  return state.connections.find((c) => c.id === pairId(a, b))
}
export function isBlocked(state: DatingState, a: PersonaId, b: PersonaId) {
  return state.blocks.some((pair) => pair.includes(a) && pair.includes(b))
}
export function eligible(state: DatingState, id: PersonaId) {
  const p = person(state, id)
  return (
    p.adultVerified &&
    p.age >= 19 &&
    p.photoReviewed &&
    p.status === 'active' &&
    state.now - p.confirmedAt < ACTIVITY_WINDOW
  )
}
export function matchReasons(a: DatingPersona, b: DatingPersona): string[] {
  if (
    a.id === b.id ||
    a.seeks !== b.gender ||
    b.seeks !== a.gender ||
    a.area !== b.area ||
    a.intent !== b.intent
  )
    return []
  const common = a.slots.filter((s) => b.slots.includes(s))
  return common.length
    ? [
        `${a.area}에서 만날 수 있어요`,
        `${common.join(' · ')} 시간이 겹쳐요`,
        `${a.intent}를 원해요`,
      ]
    : []
}
export function recommendations(state: DatingState, actor: PersonaId) {
  if (!eligible(state, actor)) return []
  return state.people.filter(
    (p) =>
      eligible(state, p.id) &&
      !isBlocked(state, actor, p.id) &&
      matchReasons(person(state, actor), p).length &&
      connectionFor(state, actor, p.id)?.status !== 'closed',
  )
}
export function canChat(state: DatingState, c: Connection, actor: PersonaId) {
  return (
    c.members.includes(actor) &&
    c.status === 'open' &&
    !isBlocked(state, ...c.members) &&
    c.members.every((id) => person(state, id).status !== 'restricted') &&
    c.members.every((id) => c.payments[id] === 'paid')
  )
}
export function messageWarnings(body: string): string[] {
  const result = []
  if (/(송금|입금|계좌|투자|코인|대출|수익|상품권)/i.test(body))
    result.push(
      '금전·투자 권유가 있으면 송금하지 말고 대화를 멈춰 확인해 주세요.',
    )
  if (/(카톡|카카오톡|텔레그램|라인\s*아이디|whatsapp|telegram)/i.test(body))
    result.push(
      '앱 밖에서는 신고 자료를 확인하기 어려워요. 충분히 알아가기 전에는 앱 안에서 대화해 주세요.',
    )
  return result
}
export function hasExternalLink(body: string) {
  return /(https?:|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|io|me|kr)\b)/i.test(
    body,
  )
}
function close(c: Connection, reason: string, forceRefund = false) {
  c.status = 'closed'
  c.closedReason = reason
  for (const id of c.members)
    if (c.payments[id] === 'paid' && (c.openedAt === undefined || forceRefund))
      c.payments[id] = 'refund_pending'
}
/** Simulator authority only: review/refund actions are never sent to a live backend. */
export function transition(
  state: DatingState,
  action: DatingAction,
): DatingState {
  const next = structuredClone(state)
  if (action.type === 'advance') {
    if (!Number.isFinite(action.milliseconds) || action.milliseconds < 0)
      throw new Error('시간 이동이 올바르지 않아요.')
    next.now += action.milliseconds
  }
  for (const c of next.connections)
    if (
      c.status === 'waiting' &&
      c.expiresAt !== null &&
      next.now >= c.expiresAt
    )
      close(c, '상대 결제 기한이 끝났어요.')
  if (action.type === 'advance') return next
  if (action.type === 'refund') {
    const c = next.connections.find((c) => c.id === action.connectionId)
    if (!c || !c.members.includes(action.actor))
      throw new Error('결제 내역이 없어요.')
    if (c.payments[action.actor] === 'refunded') return next
    if (!['refund_pending', 'refund_failed'].includes(c.payments[action.actor]))
      throw new Error('환불 대상이 아니에요.')
    c.payments[action.actor] =
      action.outcome === 'success' ? 'refunded' : 'refund_failed'
    return next
  }
  if (action.type === 'review') {
    const r = next.reports.find((r) => r.id === action.reportId)
    if (!r || r.status !== 'pending') throw new Error('검토할 신고가 없어요.')
    r.status = action.decision
    if (r.status === 'restricted') {
      person(next, r.target).status = 'restricted'
      for (const c of next.connections.filter((c) =>
        c.members.includes(r.target),
      ))
        close(c, '운영 검토로 연결이 중지됐어요.', true)
    }
    return next
  }
  const actor = person(next, action.actor)
  if (action.type === 'restore') {
    actor.status = 'paused'
    return next
  }
  if (action.type === 'appeal') {
    const r = next.reports.find(
      (r) =>
        r.id === action.reportId &&
        r.target === actor.id &&
        r.status === 'restricted',
    )
    if (!r) throw new Error('이의제기할 조치가 없어요.')
    r.appeal = true
    return next
  }
  if (action.type === 'activity') {
    if (actor.status === 'restricted')
      throw new Error('운영 검토 중이에요. 이의제기를 이용해 주세요.')
    actor.status = action.active ? 'active' : 'paused'
    if (action.active) actor.confirmedAt = next.now
    return next
  }
  if (action.target === action.actor)
    throw new Error('자신에게 요청할 수 없어요.')
  person(next, action.target)
  let c = connectionFor(next, action.actor, action.target)
  if (action.type === 'report') {
    if (!c) throw new Error('소개받은 상대만 신고할 수 있어요.')
    if (!['money', 'identity', 'harassment', 'other'].includes(action.reason))
      throw new Error('신고 사유를 확인해 주세요.')
    if (
      !next.reports.some(
        (r) =>
          r.reporter === actor.id &&
          r.target === action.target &&
          r.status === 'pending',
      )
    )
      next.reports.push({
        id: next.reports.length + 1,
        reporter: actor.id,
        target: action.target,
        reason: action.reason,
        status: 'pending',
        appeal: false,
      })
    return next
  }
  if (action.type === 'block') {
    if (!isBlocked(next, actor.id, action.target))
      next.blocks.push([actor.id, action.target])
    if (c) {
      if (c.status === 'open') {
        c.status = 'closed'
        c.closedReason =
          '차단으로 대화가 중지됐어요. 개설 후 환불은 운영 검토 대상이에요.'
      } else close(c, '차단으로 연결이 끝났어요.')
    }
    return next
  }
  if (action.type === 'cancel') {
    if (!c || c.openedAt !== undefined)
      throw new Error('대화 개설 후 환불은 신고·운영 검토를 이용해 주세요.')
    close(c, '연결을 취소했어요.')
    return next
  }
  if (action.type === 'message') {
    if (!c || !canChat(next, c, actor.id))
      throw new Error('지금은 대화를 보낼 수 없어요.')
    const body = action.body.trim()
    if (!body || body.length > 1000)
      throw new Error('메시지는 1~1,000자로 입력해 주세요.')
    if (hasExternalLink(body))
      throw new Error('처음에는 외부 링크 없이 앱 안에서 대화해 주세요.')
    next.messages.push({
      id: next.messages.length + 1,
      connectionId: c.id,
      sender: actor.id,
      body,
      at: next.now,
    })
    return next
  }
  if (
    !eligible(next, actor.id) ||
    !eligible(next, action.target) ||
    isBlocked(next, actor.id, action.target)
  )
    throw new Error('지금은 소개에 참여할 수 없어요.')
  if (action.type === 'interest') {
    if (!matchReasons(actor, person(next, action.target)).length)
      throw new Error('서로 맞는 소개 조건이 없어요.')
    if (!c) {
      c = {
        id: pairId(actor.id, action.target),
        members: [actor.id, action.target].sort() as [PersonaId, PersonaId],
        likes: [],
        payments: { [actor.id]: 'unpaid', [action.target]: 'unpaid' },
        expiresAt: null,
        status: 'interest',
      }
      next.connections.push(c)
    }
    if (c.status === 'closed') throw new Error('종료된 소개예요.')
    if (!c.likes.includes(actor.id)) c.likes.push(actor.id)
    if (c.status === 'interest' && c.likes.length === 2) c.status = 'mutual'
    return next
  }
  if (!c || !['mutual', 'waiting', 'open'].includes(c.status))
    throw new Error('두 사람의 관심이 확인된 뒤에 결제할 수 있어요.')
  if (c.payments[actor.id] === 'paid') return next
  if (c.status === 'open') throw new Error('이미 열린 대화예요.')
  c.payments[actor.id] = 'paid'
  c.expiresAt ??= next.now + PAYMENT_WINDOW
  c.status = c.members.every((id) => c!.payments[id] === 'paid')
    ? 'open'
    : 'waiting'
  if (c.status === 'open') c.openedAt = next.now
  return next
}
export const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: '결제 전',
  paid: '결제 완료',
  refund_pending: '전액 환불 처리 중',
  refund_failed: '환불 재처리 필요',
  refunded: '전액 환불 완료',
}
