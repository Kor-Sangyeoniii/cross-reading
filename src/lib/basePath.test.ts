import { describe, expect, it } from 'vitest'
import { stripBase, withBase } from './basePath'

describe('basePath', () => {
  it('하위 경로가 없을 때는 그대로', () => {
    expect(withBase('/me', '')).toBe('/me')
    expect(stripBase('/me', '')).toBe('/me')
  })
  it('하위 경로를 붙이고 뗀다', () => {
    expect(withBase('/invite/abc', '/cross-reading')).toBe('/cross-reading/invite/abc')
    expect(stripBase('/cross-reading/rooms', '/cross-reading')).toBe('/rooms')
    expect(stripBase('/cross-reading', '/cross-reading')).toBe('/')
    expect(stripBase('/cross-reading/', '/cross-reading')).toBe('/')
    expect(stripBase('/other', '/cross-reading')).toBe('/other')
  })
})
