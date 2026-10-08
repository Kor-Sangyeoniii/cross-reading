-- CR-002 보안·성능 보강 (Supabase advisors 결과 반영, 2026-10-08)
-- 1) 내부 도우미 is_room_member를 API에 노출되지 않는 private 스키마로 옮긴다.
--    RLS 정책은 함수 OID로 참조하므로 그대로 동작한다. SQL 함수 본문은 이름으로 참조하므로 다시 만든다.
-- 2) 인덱스 없는 외래키 3개에 인덱스 추가.
-- 남는 경고(의도됨): create_room / accept_invite / preview_invite / get_room_members 는
-- 로그인 사용자가 앱에서 호출해야 하는 RPC다. 각 함수 안에서 auth.uid()·구성원 여부를 검사한다.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_room_member(uuid) set schema private;

create or replace function public.get_room_members(p_room uuid)
returns table (user_id uuid, nickname text, mbti text, share_summary boolean, joined_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, p.nickname, case when m.share_mbti then p.mbti end, m.share_summary, m.joined_at
  from public.room_members m
  join public.profiles p on p.id = m.user_id
  where m.room_id = p_room and private.is_room_member(p_room)
  order by m.joined_at;
$$;

create index invites_room_idx on public.invites (room_id);
create index invites_created_by_idx on public.invites (created_by);
create index rooms_created_by_idx on public.rooms (created_by);
