// CR-007 그룹 궁합 Edge Function (Supabase, Deno).
// 흐름: 호출자 JWT 확인 → (서버 권한) 계산 동의한 현재 구성원 조회, 호출자 포함 여부 확인 → 출생정보 조회·계산
//       → 응답 직전에 호출자가 여전히 동의한 구성원인지 다시 확인 → 해석 문장만 반환.
// 원칙: 다른 사람의 출생정보·간지는 응답·로그에 넣지 않는다 (AGENTS.md P1). service_role 키는 Supabase 환경변수만 쓴다 (P3).
// GPT 리뷰 반영: CORS(OPTIONS 포함), 계산 중 방을 나간 호출자에게 결과를 주지 않음.
import { createClient } from '@supabase/supabase-js'
import { computeSaju } from '../../../src/core/saju.ts'
import { groupCompat, type CompatMember, type Mbti } from '../../../src/core/compat.ts'
import { responder } from '../_shared/respond.ts'

type ProfileRow = {
  id: string; birth_year: number; birth_month: number; birth_day: number; calendar: 'solar' | 'lunar'
  is_leap_month: boolean; birth_hour: number | null; birth_minute: number | null
}

Deno.serve(async (req: Request) => {
  const res = responder(req)
  const pre = res.preflight()
  if (pre) return pre
  if (req.method !== 'POST') return res.json(405, { error: 'method_not_allowed' })
  const auth = req.headers.get('Authorization')
  if (!auth) return res.json(401, { error: 'not_authenticated' })

  let roomId: string
  try {
    roomId = (await req.json()).roomId
    if (typeof roomId !== 'string' || !/^[0-9a-f-]{36}$/i.test(roomId)) throw new Error()
  } catch {
    return res.json(400, { error: 'invalid_room' })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: userData } = await asUser.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return res.json(401, { error: 'not_authenticated' })

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const consentedNow = async (): Promise<string[] | null> => {
    const { data, error } = await admin
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
      .not('calc_consent_at', 'is', null)
    return error || !data ? null : data.map((r: { user_id: string }) => r.user_id)
  }

  // 1) 계산 동의한 현재 구성원 — 호출자가 포함돼야 한다.
  const consented = await consentedNow()
  if (!consented) return res.json(500, { error: 'lookup_failed' })
  if (!consented.includes(uid)) return res.json(403, { error: 'not_a_member' })
  if (consented.length < 2) return res.json(409, { error: 'room_not_open' })

  // 2) 닉네임·공개 동의한 MBTI는 호출자 권한의 RPC로 (공개 범위 규칙을 그대로 따름)
  const { data: visible, error: visErr } = await asUser.rpc('get_room_members', { p_room: roomId })
  if (visErr || !visible) return res.json(500, { error: 'lookup_failed' })

  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, birth_year, birth_month, birth_day, calendar, is_leap_month, birth_hour, birth_minute')
    .in('id', consented)
  if (pErr || !profiles) return res.json(500, { error: 'lookup_failed' })

  const members: CompatMember[] = []
  try {
    for (const v of visible as { user_id: string; nickname: string; mbti: Mbti | null }[]) {
      if (!consented.includes(v.user_id)) continue
      const p = (profiles as ProfileRow[]).find((r) => r.id === v.user_id)
      if (!p) continue
      members.push({
        id: v.user_id,
        nickname: v.nickname,
        mbti: v.mbti, // get_room_members가 공개 동의한 경우에만 값을 준다
        chart: computeSaju({
          year: p.birth_year,
          month: p.birth_month,
          day: p.birth_day,
          calendar: p.calendar,
          isLeapMonth: p.is_leap_month,
          time: p.birth_hour === null ? null : { hour: p.birth_hour, minute: p.birth_minute ?? 0 },
        }),
      })
    }
  } catch {
    // 입력 원문을 로그·응답에 남기지 않는다.
    return res.json(500, { error: 'calc_failed' })
  }
  if (members.length < 2) return res.json(409, { error: 'room_not_open' })
  const result = groupCompat(members)

  // 3) 응답 직전 재확인: 계산 도중 나간 호출자에게는 남은 사람들의 궁합을 주지 않는다.
  const stillIn = await consentedNow()
  if (!stillIn || !stillIn.includes(uid)) return res.json(403, { error: 'not_a_member' })
  // 계산 도중 나간 사람이 있으면 그 사람이 포함된 결과는 버리고 다시 요청하게 한다.
  if (members.some((m) => !stillIn.includes(m.id))) return res.json(409, { error: 'members_changed' })

  return res.json(200, result)
})
