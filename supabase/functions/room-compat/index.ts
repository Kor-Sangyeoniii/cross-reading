// CR-007 그룹 궁합 Edge Function (Supabase, Deno).
// 흐름: 호출자 JWT로 같은 방 구성원인지 확인 → 서버 권한으로 구성원 출생정보 조회 → 궁합 계산 → 해석 문장만 반환.
// 원칙: 다른 사람의 출생정보·간지는 응답·로그에 넣지 않는다 (AGENTS.md P1). service_role 키는 Supabase가 주입하는 환경변수만 쓴다 (P3).
import { createClient } from '@supabase/supabase-js'
import { computeSaju } from '../../../src/core/saju.ts'
import { groupCompat, type CompatMember, type Mbti } from '../../../src/core/compat.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const auth = req.headers.get('Authorization')
  if (!auth) return json(401, { error: 'not_authenticated' })

  let roomId: string
  try {
    roomId = (await req.json()).roomId
    if (typeof roomId !== 'string' || !/^[0-9a-f-]{36}$/i.test(roomId)) throw new Error()
  } catch {
    return json(400, { error: 'invalid_room' })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  // 1) 호출자 권한으로: 구성원이 아니면 get_room_members가 빈 목록을 돌려준다 (RLS·RPC 검사).
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: visible, error: visErr } = await asUser.rpc('get_room_members', { p_room: roomId })
  if (visErr) return json(500, { error: 'lookup_failed' })
  if (!visible || visible.length === 0) return json(403, { error: 'not_a_member' })
  if (visible.length < 2) return json(409, { error: 'room_not_open' })

  // 2) 서버 권한으로: 계산 동의(calc_consent_at)가 있는 현재 구성원의 출생정보만.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const ids = visible.map((m: { user_id: string }) => m.user_id)
  const { data: consented, error: cErr } = await admin
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .in('user_id', ids)
    .not('calc_consent_at', 'is', null)
  if (cErr || !consented) return json(500, { error: 'lookup_failed' })
  const consentedIds = consented.map((r: { user_id: string }) => r.user_id)
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, birth_year, birth_month, birth_day, calendar, is_leap_month, birth_hour, birth_minute')
    .in('id', consentedIds)
  if (pErr || !profiles) return json(500, { error: 'lookup_failed' })

  type ProfileRow = {
    id: string; birth_year: number; birth_month: number; birth_day: number; calendar: 'solar' | 'lunar'
    is_leap_month: boolean; birth_hour: number | null; birth_minute: number | null
  }
  const members: CompatMember[] = []
  try {
    for (const v of visible as { user_id: string; nickname: string; mbti: Mbti | null }[]) {
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
    return json(500, { error: 'calc_failed' })
  }
  if (members.length < 2) return json(409, { error: 'room_not_open' })

  return json(200, groupCompat(members))
})
