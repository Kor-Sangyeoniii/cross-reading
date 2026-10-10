import { describe, expect, it } from 'vitest'
import { matchRoute } from './router'

describe('matchRoute', () => {
  it('기본 화면 주소', () => {
    expect(matchRoute('/')).toEqual({ name: 'home' })
    expect(matchRoute('/me/')).toEqual({ name: 'me' })
    expect(matchRoute('/rooms')).toEqual({ name: 'rooms' })
    expect(matchRoute('/settings')).toEqual({ name: 'settings' })
    expect(matchRoute('/auth/reset-password')).toEqual({ name: 'resetPassword' })
    expect(matchRoute('/auth/callback')).toEqual({ name: 'callback' })
  })
  it('방 주소는 UUID만', () => {
    expect(matchRoute('/rooms/123e4567-e89b-12d3-a456-426614174000')).toEqual({ name: 'room', roomId: '123e4567-e89b-12d3-a456-426614174000' })
    expect(matchRoute('/rooms/abc')).toEqual({ name: 'notFound' })
  })
  it('선택한 풀이 주소만 허용한다', () => {
    for (const topic of ['day', 'month', 'year', 'temperament', 'luck', 'natal', 'elements']) {
      expect(matchRoute(`/readings/${topic}/`)).toEqual({ name: 'reading', topic })
    }
    expect(matchRoute('/readings/unknown')).toEqual({ name: 'notFound' })
    expect(matchRoute('/readings/day/extra')).toEqual({ name: 'notFound' })
  })
  it('초대 주소는 64자리 토큰만', () => {
    const t = 'a'.repeat(64)
    expect(matchRoute(`/invite/${t}`)).toEqual({ name: 'invite', token: t })
    expect(matchRoute('/invite/short')).toEqual({ name: 'notFound' })
  })
})
