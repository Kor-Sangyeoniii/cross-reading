// 서버 함수 공통 응답 규칙 (GPT 리뷰 반영: 웹앱 호출에 필요한 CORS 처리).
// 허용 헤더는 supabase-js 2.117의 corsHeaders 목록과 같게 맞춘다.
// 허용 주소 목록에 있는 출처(origin)에만 Access-Control-Allow-Origin을 돌려준다. '*'는 쓰지 않는다.

// 시크릿 ALLOWED_ORIGINS가 없을 때 쓰는 기본 허용 주소: 개발 서버 + GitHub Pages 배포 주소
export const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'https://kor-sangyeoniii.github.io']

export function parseAllowedOrigins(value: string | undefined): string[] {
  const list = (value ?? '').split(',').map((s) => s.trim()).filter((s) => /^https?:\/\/[^/]+$/.test(s))
  return list.length > 0 ? list : DEFAULT_ALLOWED_ORIGINS
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}
