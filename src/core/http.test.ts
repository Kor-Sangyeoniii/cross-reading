import { describe, expect, it } from 'vitest'
import { corsHeaders, DEFAULT_ALLOWED_ORIGINS, parseAllowedOrigins } from './http'

describe('CORS', () => {
  it('허용 목록의 출처에만 Allow-Origin을 준다', () => {
    const allowed = parseAllowedOrigins('https://app.example.invalid, http://localhost:5173')
    expect(corsHeaders('https://app.example.invalid', allowed)['Access-Control-Allow-Origin']).toBe('https://app.example.invalid')
    expect(corsHeaders('https://evil.example', allowed)['Access-Control-Allow-Origin']).toBeUndefined()
    expect(corsHeaders(null, allowed)['Access-Control-Allow-Origin']).toBeUndefined()
    expect(corsHeaders('https://evil.example', allowed)['Access-Control-Allow-Methods']).toBe('POST, OPTIONS')
  })
  it('설정이 비었거나 형식이 틀리면 개발용 기본값', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(DEFAULT_ALLOWED_ORIGINS)
    expect(parseAllowedOrigins('*, javascript:alert(1)')).toEqual(DEFAULT_ALLOWED_ORIGINS)
  })
})
