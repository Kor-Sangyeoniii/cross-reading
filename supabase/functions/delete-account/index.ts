// CR-009 계정 삭제 Edge Function (Supabase, Deno).
// 흐름: 호출자 JWT 확인 → 확인 문구·최근 로그인 검사 → auth.admin.deleteUser(본인) → DB CASCADE로
//       프로필·출생정보·구성원·보낸 메시지·푸시 구독·차단·본인 신고 기록 삭제 (DECISIONS 2026-10-08: 메시지까지 전부 삭제).
// 원칙: 사용자 ID는 요청 본문이 아니라 검증된 JWT에서만 얻는다. service_role 키는 Supabase 환경변수만 쓴다 (AGENTS.md P3).
import { createClient } from '@supabase/supabase-js'
import { checkDeleteRequest } from '../../../src/core/accountPolicy.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const auth = req.headers.get('Authorization')
  if (!auth) return json(401, { error: 'not_authenticated' })

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userErr } = await asUser.auth.getUser()
  if (userErr || !userData.user) return json(401, { error: 'not_authenticated' })

  let confirm: unknown = null
  try {
    confirm = (await req.json()).confirm
  } catch {
    // 본문이 없으면 확인 문구 없음으로 처리
  }
  const check = checkDeleteRequest({ confirm, lastSignInAt: userData.user.last_sign_in_at })
  if (check !== 'ok') return json(check === 'confirm_required' ? 400 : 401, { error: check })

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // shouldSoftDelete=false: 완전 삭제 → 외래키 CASCADE로 개인 데이터 삭제
  const { error: delErr } = await admin.auth.admin.deleteUser(userData.user.id, false)
  if (delErr) return json(500, { error: 'delete_failed' })

  return json(200, { deleted: true })
})
