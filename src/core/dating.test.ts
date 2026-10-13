import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_WINDOW,
  PAYMENT_WINDOW,
  canChat,
  connectionFor,
  createDatingDemo,
  matchReasons,
  recommendations,
  transition,
  messageWarnings,
} from './dating'
const start = () => createDatingDemo(Date.UTC(2026, 9, 13))
function mutual() {
  let s = start()
  s = transition(s, { type: 'interest', actor: 'mori', target: 'tao' })
  return transition(s, { type: 'interest', actor: 'tao', target: 'mori' })
}
function paid() {
  return transition(mutual(), { type: 'pay', actor: 'mori', target: 'tao' })
}
describe('dating eligibility and matching', () => {
  it('explains common schedules without a score', () => {
    const s = start()
    expect(recommendations(s, 'mori').map((p) => p.id)).toEqual(['tao', 'mong'])
    expect(matchReasons(s.people[0], s.people[1])).toHaveLength(3)
  })
  it('excludes missing verification, minors, stale members and wrong preferences', () => {
    const s = start()
    s.people[1].adultVerified = false
    s.people[3].age = 18
    expect(recommendations(s, 'mori')).toEqual([])
    expect(
      recommendations(
        transition(start(), { type: 'advance', milliseconds: ACTIVITY_WINDOW }),
        'mori',
      ),
    ).toEqual([])
  })
  it('does not resume a restricted account from activity confirmation', () => {
    const s = start()
    s.people[0].status = 'restricted'
    expect(() =>
      transition(s, { type: 'activity', actor: 'mori', active: true }),
    ).toThrow()
  })
})
describe('mutual payment state machine', () => {
  it('rejects one-sided payment and pre-payment chat', () => {
    expect(() =>
      transition(start(), { type: 'pay', actor: 'mori', target: 'tao' }),
    ).toThrow()
    expect(() =>
      transition(paid(), {
        type: 'message',
        actor: 'mori',
        target: 'tao',
        body: '안녕',
      }),
    ).toThrow()
  })
  it('opens only for two payments and duplicate callbacks do not extend deadline', () => {
    const s = paid()
    const twice = transition(s, { type: 'pay', actor: 'mori', target: 'tao' })
    expect(twice).toEqual(s)
    const open = transition(s, { type: 'pay', actor: 'tao', target: 'mori' })
    expect(canChat(open, open.connections[0], 'mori')).toBe(true)
    expect(canChat(open, open.connections[0], 'dodo')).toBe(false)
  })
  it('expires at the exact deadline and rejects a late payment', () => {
    const s = transition(paid(), {
      type: 'advance',
      milliseconds: PAYMENT_WINDOW,
    })
    expect(s.connections[0].status).toBe('closed')
    expect(s.connections[0].payments.mori).toBe('refund_pending')
    expect(() =>
      transition(s, { type: 'pay', actor: 'tao', target: 'mori' }),
    ).toThrow()
  })
  it('distinguishes failed cancellation from completed refund and can retry', () => {
    let s = transition(paid(), { type: 'cancel', actor: 'mori', target: 'tao' })
    s = transition(s, {
      type: 'refund',
      connectionId: 'mori:tao',
      actor: 'mori',
      outcome: 'failure',
    })
    expect(s.connections[0].payments.mori).toBe('refund_failed')
    s = transition(s, {
      type: 'refund',
      connectionId: 'mori:tao',
      actor: 'mori',
      outcome: 'success',
    })
    expect(s.connections[0].payments.mori).toBe('refunded')
  })
  it('cannot refund someone who never paid', () => {
    const s = transition(paid(), {
      type: 'advance',
      milliseconds: PAYMENT_WINDOW,
    })
    expect(() =>
      transition(s, {
        type: 'refund',
        connectionId: 'mori:tao',
        actor: 'tao',
        outcome: 'success',
      }),
    ).toThrow()
  })
  it('opened conversations do not expire with payment deadline', () => {
    let s = transition(paid(), { type: 'pay', actor: 'tao', target: 'mori' })
    s = transition(s, { type: 'advance', milliseconds: PAYMENT_WINDOW })
    expect(s.connections[0].status).toBe('open')
  })
})
describe('safety and review', () => {
  it('blocks further matches/chat, refunds unopened paid connections', () => {
    const s = transition(paid(), {
      type: 'block',
      actor: 'tao',
      target: 'mori',
    })
    expect(s.connections[0].payments.mori).toBe('refund_pending')
    expect(recommendations(s, 'mori').some((p) => p.id === 'tao')).toBe(false)
  })
  it('reports do not auto-restrict; review supports appeal and restore', () => {
    let s = transition(paid(), {
      type: 'report',
      actor: 'mori',
      target: 'tao',
      reason: 'money',
    })
    expect(s.people[1].status).toBe('active')
    s = transition(s, { type: 'review', reportId: 1, decision: 'restricted' })
    expect(s.people[1].status).toBe('restricted')
    s = transition(s, { type: 'appeal', actor: 'tao', reportId: 1 })
    expect(s.reports[0].appeal).toBe(true)
    s = transition(s, { type: 'restore', actor: 'tao' })
    expect(s.people[1].status).toBe('paused')
  })
  it('limits links, warns on money without declaring fraud', () => {
    let s = transition(paid(), { type: 'pay', actor: 'tao', target: 'mori' })
    expect(() =>
      transition(s, {
        type: 'message',
        actor: 'tao',
        target: 'mori',
        body: 'https://example.com',
      }),
    ).toThrow()
    s = transition(s, {
      type: 'message',
      actor: 'tao',
      target: 'mori',
      body: '투자 이야기는 하지 말아요',
    })
    expect(messageWarnings(s.messages[0].body)).toHaveLength(1)
    expect(s.people[1].status).toBe('active')
  })
  it('never mutates prior state', () => {
    const s = start()
    transition(s, { type: 'interest', actor: 'mori', target: 'tao' })
    expect(connectionFor(s, 'mori', 'tao')).toBeUndefined()
  })
})

describe('post-opening refund policy', () => {
  it('blocking an opened conversation cannot turn into automatic refund by cancelling again', () => {
    let s = transition(paid(), { type: 'pay', actor: 'tao', target: 'mori' })
    s = transition(s, { type: 'block', actor: 'mori', target: 'tao' })
    expect(s.connections[0].payments.mori).toBe('paid')
    expect(() =>
      transition(s, { type: 'cancel', actor: 'mori', target: 'tao' }),
    ).toThrow('운영 검토')
    s = transition(s, { type: 'block', actor: 'mori', target: 'tao' })
    expect(s.connections[0].payments.mori).toBe('paid')
  })
})
