// 서버 함수 공통: CORS 사전 요청(OPTIONS) 처리와 JSON 응답. 허용 주소는 시크릿 ALLOWED_ORIGINS(쉼표 구분).
import { corsHeaders, parseAllowedOrigins } from '../../../src/core/http.ts'

export function responder(req: Request) {
  const headers = corsHeaders(req.headers.get('Origin'), parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')))
  return {
    /** OPTIONS 사전 요청이면 응답을 돌려주고, 아니면 null */
    preflight(): Response | null {
      return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers }) : null
    },
    json(status: number, body: unknown): Response {
      return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
    },
  }
}
