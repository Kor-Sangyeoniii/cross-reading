-- CR-002 RPC·권한·Realtime (20261008000001_cr002_tables.sql 다음에 적용)
-- ───────────────────────── RPC ─────────────────────────
-- 방 만들기: 만든 사람을 구성원으로 넣고 초대 링크 토큰을 돌려준다.
create function public.create_room(p_share_mbti boolean default false, p_share_summary boolean default false)
returns table (room_id uuid, invite_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room uuid;
  v_token text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_required' using errcode = 'P0001';
  end if;
  insert into public.rooms (created_by) values (v_uid) returning id into v_room;
  insert into public.room_members (room_id, user_id, calc_consent_at, share_mbti, share_summary)
    values (v_room, v_uid, now(), p_share_mbti, p_share_summary);
  insert into public.invites (room_id, created_by) values (v_room, v_uid) returning token into v_token;
  return query select v_room, v_token;
end;
$$;

-- 초대 미리보기: 로그인한 사람에게 초대한 사람 닉네임·현재 인원만 보여준다 (결과·출생정보 없음).
create function public.preview_invite(p_token text)
returns table (inviter_nickname text, member_count int, is_full boolean, is_valid boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nickname,
         (select count(*)::int from public.room_members m where m.room_id = i.room_id),
         (select count(*) from public.room_members m where m.room_id = i.room_id) >= 4,
         i.revoked_at is null and (i.expires_at is null or i.expires_at > now())
  from public.invites i
  left join public.profiles p on p.id = i.created_by
  where i.token = p_token and (select auth.uid()) is not null;
$$;

-- 초대 수락: 계산 사용 동의는 필수, 공개 항목은 선택.
create function public.accept_invite(
  p_token text,
  p_calc_consent boolean,
  p_share_mbti boolean default false,
  p_share_summary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.invites;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not coalesce(p_calc_consent, false) then raise exception 'calc_consent_required' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_required' using errcode = 'P0001';
  end if;
  select * into v_inv from public.invites where token = p_token;
  if not found or v_inv.revoked_at is not null or (v_inv.expires_at is not null and v_inv.expires_at <= now()) then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.room_members where room_id = v_inv.room_id and user_id = v_uid) then
    return v_inv.room_id; -- 이미 수락함
  end if;
  insert into public.room_members (room_id, user_id, calc_consent_at, share_mbti, share_summary)
    values (v_inv.room_id, v_uid, now(), p_share_mbti, p_share_summary);
  return v_inv.room_id;
end;
$$;

-- 같은 방 구성원 목록: 닉네임과 공개 동의한 MBTI만.
create function public.get_room_members(p_room uuid)
returns table (user_id uuid, nickname text, mbti text, share_summary boolean, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, p.nickname,
         case when m.share_mbti then p.mbti end,
         m.share_summary, m.joined_at
  from public.room_members m
  join public.profiles p on p.id = m.user_id
  where m.room_id = p_room and public.is_room_member(p_room)
  order by m.joined_at;
$$;

-- 계정 삭제는 CR-009에서 Edge Function(auth.admin.deleteUser)으로 구현한다.
-- (SQL 함수 안의 auth.users 삭제는 Supabase MCP 적용 시 확인 대기로 멈춤 — 2026-10-08 실측)

-- 함수 실행 권한: 로그인 사용자만
revoke execute on function public.is_room_member(uuid) from public, anon;
revoke execute on function public.create_room(boolean, boolean) from public, anon;
revoke execute on function public.preview_invite(text) from public, anon;
revoke execute on function public.accept_invite(text, boolean, boolean, boolean) from public, anon;
revoke execute on function public.get_room_members(uuid) from public, anon;
revoke execute on function public.enforce_room_capacity() from public, anon, authenticated;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.create_room(boolean, boolean) to authenticated;
grant execute on function public.preview_invite(text) to authenticated;
grant execute on function public.accept_invite(text, boolean, boolean, boolean) to authenticated;
grant execute on function public.get_room_members(uuid) to authenticated;

-- updated_at 자동 갱신
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 실시간 채팅: 메시지 테이블을 Realtime에 등록 (RLS가 그대로 적용됨)
alter publication supabase_realtime add table public.messages;
