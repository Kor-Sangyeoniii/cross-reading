-- CR-002 보완 (2026-10-08) — GPT PR #3 리뷰에서 가져온 장점 반영 + 상연님 결정(차단: 내 화면에서만 숨김)
-- 1) 초대 토큰은 SHA-256 해시만 저장한다. 원문 토큰은 create_room이 한 번만 돌려준다.
-- 2) 테이블 권한을 명시적으로 준다 (Supabase 기본 권한에 기대지 않음). anon은 접근 불가.
--    room_members는 공개 항목(share_*)만, invites는 revoked_at만 수정 가능하게 칼럼 단위로 제한한다.
-- 3) 만 14세 검사를 DB에서 양력 생년월일(한국 날짜 기준)로 한다.
-- 4) 방 인원 카운터(rooms.member_count, 0~4)를 트리거로 원자적으로 관리한다. 5번째 입장은 CHECK가 막는다.
--    메시지에는 보낼 당시 인원(member_count_at_send)을 기록한다 → H2는 4명일 때 보낸 메시지만 집계.
--    방이 2명 이상일 때만 메시지를 보낼 수 있다.
-- 5) 동의 문서 버전을 기록한다 (문서 확정 전에는 '2026-10-draft').
-- 6) 신고 대상은 그 방의 현재 구성원이거나 그 방에 메시지를 쓴 사람이어야 한다 (나간 사람도 신고 가능).
-- 차단 정책(상연님 결정 1번): 차단한 사람의 메시지는 내 화면에서만 숨기고, 전송은 막지 않는다 — 기존 정책 유지.

-- ── 1) 초대 토큰 해시 ──
-- (Supabase MCP는 drop을 확인 대기로 멈추므로 이름 변경 방식 사용. 기존 행 없음)
alter table public.invites rename column token to token_hash;
alter table public.invites alter column token_hash drop default;
alter table public.invites add constraint invites_token_hash_format check (token_hash ~ '^[a-f0-9]{64}$');

create function private.hash_token(p_token text)
returns text language sql immutable set search_path = ''
as $$ select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex') $$;
revoke execute on function private.hash_token(text) from public, anon, authenticated;

-- ── 3) 생년월일·만 14세 ──
alter table public.profiles add column solar_birth_date date not null;
alter table public.profiles add constraint profiles_solar_matches
  check (calendar <> 'solar' or solar_birth_date = make_date(birth_year, birth_month, birth_day));

create function private.check_profile_age()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.solar_birth_date > ((now() at time zone 'Asia/Seoul')::date - interval '14 years')::date then
    raise exception 'age_under_14' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger profiles_age before insert or update on public.profiles
  for each row execute function private.check_profile_age();

-- ── 5) 동의 버전 ──
alter table public.profiles add column terms_version text not null default '2026-10-draft' check (char_length(terms_version) between 1 and 50);
alter table public.profiles add column privacy_version text not null default '2026-10-draft' check (char_length(privacy_version) between 1 and 50);
alter table public.room_members add column calc_consent_version text not null default '2026-10-draft' check (char_length(calc_consent_version) between 1 and 50);

-- ── 4) 인원 카운터 ──
-- 기존 인원 제한 트리거는 끄고(카운터 CHECK가 대신함), 함수는 아무것도 안 하게 바꾼다.
alter table public.room_members disable trigger room_capacity;
create or replace function public.enforce_room_capacity()
returns trigger language plpgsql set search_path = ''
as $$ begin return new; end; $$;

alter table public.rooms add column member_count smallint not null default 0 check (member_count between 0 and 4);

create function private.track_member_count()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- 같은 방 행을 갱신하므로 동시 입장은 직렬화되고, 5번째는 CHECK 위반으로 실패한다.
    update public.rooms set member_count = member_count + 1 where id = new.room_id;
    return new;
  else
    update public.rooms set member_count = member_count - 1 where id = old.room_id;
    return old;
  end if;
end;
$$;
revoke execute on function private.track_member_count() from public, anon, authenticated;
create trigger room_member_count after insert or delete on public.room_members
  for each row execute function private.track_member_count();

alter table public.messages add column member_count_at_send smallint not null check (member_count_at_send between 2 and 4);

create function private.stamp_message()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- 구성원 변경과 같은 방 행을 잠가, 보낼 당시 인원이 나가기·입장과 엇갈리지 않게 한다.
  select member_count into new.member_count_at_send from public.rooms where id = new.room_id for update;
  if new.member_count_at_send is null or new.member_count_at_send < 2 then
    raise exception 'room_not_open' using errcode = '23514';
  end if;
  new.created_at := now();
  return new;
end;
$$;
revoke execute on function private.stamp_message() from public, anon, authenticated;
create trigger messages_stamp before insert on public.messages
  for each row execute function private.stamp_message();

-- ── 6) 신고 대상 제한 ──
create function private.was_in_room(p_room uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.room_members where room_id = p_room and user_id = p_user)
      or exists (select 1 from public.messages where room_id = p_room and sender_id = p_user);
$$;
revoke execute on function private.was_in_room(uuid, uuid) from public, anon;
grant execute on function private.was_in_room(uuid, uuid) to authenticated;
alter policy "reports: 같은 방 구성원만 신고" on public.reports
  with check (
    reporter_id = (select auth.uid())
    and reporter_id <> reported_user_id
    and room_id is not null
    and private.is_room_member(room_id)
    and private.was_in_room(room_id, reported_user_id)
    and (message_id is null or exists (
      select 1 from public.messages m
      where m.id = message_id and m.room_id = reports.room_id and m.sender_id = reports.reported_user_id))
  );
alter policy "reports: 같은 방 구성원만 신고" on public.reports rename to "reports: 같은 방 구성원이 그 방 관련자만 신고";

-- ── 1) 초대 RPC를 해시 토큰 방식으로 교체 ──
create or replace function public.create_room(p_share_mbti boolean default false, p_share_summary boolean default false)
returns table (room_id uuid, invite_token text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room uuid;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_required' using errcode = 'P0001';
  end if;
  insert into public.rooms (created_by) values (v_uid) returning id into v_room;
  insert into public.room_members (room_id, user_id, calc_consent_at, share_mbti, share_summary)
    values (v_room, v_uid, now(), p_share_mbti, p_share_summary);
  insert into public.invites (room_id, created_by, token_hash) values (v_room, v_uid, private.hash_token(v_token));
  -- 원문 토큰은 여기서 한 번만 돌려주고 DB에는 남기지 않는다.
  return query select v_room, v_token;
end;
$$;

create or replace function public.preview_invite(p_token text)
returns table (inviter_nickname text, member_count int, is_full boolean, is_valid boolean)
language sql stable security definer set search_path = ''
as $$
  select p.nickname,
         r.member_count::int,
         r.member_count >= 4,
         i.revoked_at is null and (i.expires_at is null or i.expires_at > now())
  from public.invites i
  join public.rooms r on r.id = i.room_id
  left join public.profiles p on p.id = i.created_by
  where i.token_hash = private.hash_token(p_token) and (select auth.uid()) is not null;
$$;

create or replace function public.accept_invite(p_token text, p_calc_consent boolean, p_share_mbti boolean default false, p_share_summary boolean default false)
returns uuid
language plpgsql security definer set search_path = ''
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
  select * into v_inv from public.invites where token_hash = private.hash_token(p_token);
  if not found or v_inv.revoked_at is not null or (v_inv.expires_at is not null and v_inv.expires_at <= now()) then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.room_members where room_id = v_inv.room_id and user_id = v_uid) then
    return v_inv.room_id;
  end if;
  begin
    insert into public.room_members (room_id, user_id, calc_consent_at, share_mbti, share_summary)
      values (v_inv.room_id, v_uid, now(), p_share_mbti, p_share_summary);
  exception when check_violation then
    raise exception 'room_full' using errcode = 'P0001';
  end;
  return v_inv.room_id;
end;
$$;

revoke execute on function public.create_room(boolean, boolean) from public, anon;
revoke execute on function public.preview_invite(text) from public, anon;
revoke execute on function public.accept_invite(text, boolean, boolean, boolean) from public, anon;
grant execute on function public.create_room(boolean, boolean) to authenticated;
grant execute on function public.preview_invite(text) to authenticated;
grant execute on function public.accept_invite(text, boolean, boolean, boolean) to authenticated;

-- ── 2) 테이블 권한 명시 (RLS와 함께 이중 방어) ──
revoke all on public.profiles, public.rooms, public.room_members, public.invites, public.messages,
  public.blocks, public.reports, public.push_subscriptions from public, anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.rooms to authenticated;
grant select, delete on public.room_members to authenticated;
grant update (share_mbti, share_summary) on public.room_members to authenticated;
grant select on public.invites to authenticated;
grant update (revoked_at) on public.invites to authenticated;
grant select on public.messages to authenticated;
grant insert (room_id, sender_id, body) on public.messages to authenticated;
grant select, delete on public.blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, reported_user_id, room_id, message_id, reason) on public.reports to authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth) on public.push_subscriptions to authenticated;
