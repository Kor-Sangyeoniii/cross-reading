-- GPT 리뷰 반영 2 (2026-10-08)
-- [중간 #2:109] 차단한 사람의 메시지를 첨부한 신고가 RLS에 막힘(메시지가 신고자에게 숨겨져 있어서)
--   → 메시지를 보여주지 않고 "그 방·그 작성자의 메시지인지"만 확인하는 보안 함수로 검사
create function private.message_matches(p_message bigint, p_room uuid, p_sender uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.messages where id = p_message and room_id = p_room and sender_id = p_sender);
$$;
revoke execute on function private.message_matches(bigint, uuid, uuid) from public, anon;
grant execute on function private.message_matches(bigint, uuid, uuid) to authenticated;

alter policy "reports: 같은 방 구성원이 그 방 관련자만 신고" on public.reports
  with check (
    reporter_id = (select auth.uid())
    and reporter_id <> reported_user_id
    and room_id is not null
    and private.is_room_member(room_id)
    and private.was_in_room(room_id, reported_user_id)
    and (message_id is null or private.message_matches(message_id, room_id, reported_user_id))
  );

-- [중간 #2:81] 동시에 나가기·전송하면 이미 나간 사람의 메시지가 저장될 수 있음
--   → 방 행을 잠근 뒤(나가기 트리거와 같은 행) 작성자 소속을 새로 확인한다.
create or replace function private.stamp_message()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  select member_count into new.member_count_at_send from public.rooms where id = new.room_id for update;
  if new.member_count_at_send is null or new.member_count_at_send < 2 then
    raise exception 'room_not_open' using errcode = '23514';
  end if;
  if not exists (select 1 from public.room_members where room_id = new.room_id and user_id = new.sender_id) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  new.created_at := now();
  return new;
end;
$$;

-- [중간 #4:66,90] 프로필 수정 때 동의 시각이 덮어써짐
--   → 수정 권한을 정보 칼럼과 선택 동의(마케팅)로만 제한. 필수 동의 시각·연령 확인은 가입 때만 기록.
revoke update on public.profiles from authenticated;
grant update (nickname, birth_year, birth_month, birth_day, solar_birth_date, calendar, is_leap_month,
              birth_hour, birth_minute, mbti, marketing_agreed_at) on public.profiles to authenticated;

-- [중간 #6:53] 초대 링크 원문을 잃으면 다시 받을 방법이 없음
--   → 구성원이 기존 방의 새 초대 링크를 발급 (정원이 차면 거부). 원문은 한 번만 돌려주고 DB에는 해시만.
create function public.create_invite(p_room uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not private.is_room_member(p_room) then raise exception 'not_a_member' using errcode = '42501'; end if;
  if (select member_count from public.rooms where id = p_room) >= 4 then raise exception 'room_full' using errcode = 'P0001'; end if;
  insert into public.invites (room_id, created_by, token_hash) values (p_room, v_uid, private.hash_token(v_token));
  return v_token;
end;
$$;
revoke execute on function public.create_invite(uuid) from public, anon;
grant execute on function public.create_invite(uuid) to authenticated;
