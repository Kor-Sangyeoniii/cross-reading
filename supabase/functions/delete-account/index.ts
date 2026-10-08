// CR-009 계정 삭제 Edge Function (Supabase, Deno).
// 흐름: 호출자 JWT 검증 → 확인 문구 + "이 세션"이 최근 15분 안에 인증됐는지 검사 → auth.admin.deleteUser(본인)
//       → DB CASCADE로 프로필·출생정보·구성원·보낸 메시지·푸시 구독·차단·본인 신고 기록 삭제 (DECISIONS 2026-10-08).
// 원칙: 사용자 ID는 요청 본문이 아니라 검증된 JWT에서만 얻는다. service_role 키는 Supabase 환경변수만 쓴다 (AGENTS.md P3).
// GPT 리뷰 반영: CORS(OPTIONS 포함), 재인증은 계정의 마지막 로그인이 아니라 현재 세션의 인증 시각(amr)으로 판단.
import { createClient } from '@supabase/supabase-js'
import { checkDeleteRequest, sessionAuthTime } from '../../../src/core/accountPolicy.ts'
import { responder } from '../_shared/respond.ts'

Deno.serve(async (req: Request) => {
  const res = responder(req)
  const pre = res.preflight()
  if (pre) return pre
  if (req.method !== 'POST') return res.json(405, { error: 'method_not_allowed' })
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return res.json(401, { error: 'not_authenticated' })

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  // getUser가 토큰 서명·만료를 서버에서 검증한다. 검증된 뒤에만 토큰 내용(amr)을 읽는다.
  const { data: userData, error: userErr } = await asUser.auth.getUser()
  if (userErr || !userData.user) return res.json(401, { error: 'not_authenticated' })

  let confirm: unknown = null
  try {
    confirm = (await req.json()).confirm
  } catch {
    // 본문이 없으면 확인 문구 없음으로 처리
  }
  const check = checkDeleteRequest({ confirm, sessionAuthAt: sessionAuthTime(auth.slice('Bearer '.length)) })
  if (check !== 'ok') return res.json(check === 'confirm_required' ? 400 : 401, { error: check })

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // shouldSoftDelete=false: 완전 삭제 → 외래키 CASCADE로 개인 데이터 삭제
  const { error: delErr } = await admin.auth.admin.deleteUser(userData.user.id, false)
  if (delErr) return res.json(500, { error: 'delete_failed' })

  return res.json(200, { deleted: true })
})
