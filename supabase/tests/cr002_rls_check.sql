-- CR-002 RLS 검증 스크립트. 가짜 사용자만 쓰고 마지막에 ROLLBACK 한다 (AGENTS.md P1).
-- 실패하면 예외가 나며, 모두 통과하면 마지막 select가 'CR-002 RLS OK'를 돌려준다.
begin;

-- 가짜 사용자 5명
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'rls-test-' || n || '@example.invalid', now(), now()
from generate_series(1, 5) n;

insert into public.profiles (id, nickname, birth_year, birth_month, birth_day, calendar, age_14_confirmed, terms_agreed_at, privacy_agreed_at, mbti)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'tester' || n, 2000, 1, n, 'solar', true, now(), now(),
       case when n = 2 then 'ENFP' end
from generate_series(1, 5) n;

create temporary table t_ctx (room uuid, token text) on commit drop;
grant all on t_ctx to authenticated;

create or replace function pg_temp.as_user(n int) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000' || n, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- 1) 사용자1이 방을 만든다
select pg_temp.as_user(1);
insert into t_ctx select room_id, invite_token from public.create_room(false, false);

-- 2) 사용자2: 계산 동의 없이 수락 → 거부
select pg_temp.as_user(2);
do $$ begin
  perform public.accept_invite((select token from t_ctx), false, true, false);
  raise exception 'FAIL: 계산 동의 없이 수락됨';
exception when others then
  if sqlerrm not like '%calc_consent_required%' then raise; end if;
end $$;

-- 3) 사용자2~4 수락 (MBTI 공개는 사용자2만)
select public.accept_invite((select token from t_ctx), true, true, false);
select pg_temp.as_user(3);
select public.accept_invite((select token from t_ctx), true, false, false);
select pg_temp.as_user(4);
select public.accept_invite((select token from t_ctx), true, false, false);

-- 4) 사용자5: 5번째 참여 → 거부 (최대 4명)
select pg_temp.as_user(5);
do $$ begin
  perform public.accept_invite((select token from t_ctx), true, false, false);
  raise exception 'FAIL: 5번째 참여가 허용됨';
exception when others then
  if sqlerrm not like '%room_full%' then raise; end if;
end $$;

-- 5) 사용자5(방 밖): 메시지 작성·조회·구성원 조회 불가, 남의 프로필 조회 불가
do $$ begin
  insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), (select auth.uid()), 'x');
  raise exception 'FAIL: 방 밖 사용자가 메시지를 씀';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  if (select count(*) from public.room_members) <> 0 then raise exception 'FAIL: 방 밖 사용자가 구성원을 봄'; end if;
  if (select count(*) from public.get_room_members((select room from t_ctx))) <> 0 then raise exception 'FAIL: 방 밖 사용자가 RPC로 구성원을 봄'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: 남의 프로필(출생정보)이 보임'; end if;
end $$;

-- 6) 사용자1: 메시지 작성, 남의 명의 작성 불가, 남의 출생정보 불가, 공개 동의한 MBTI만 보임
select pg_temp.as_user(1);
insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), (select auth.uid()), '안녕');
do $$ begin
  insert into public.messages (room_id, sender_id, body)
    values ((select room from t_ctx), '00000000-0000-0000-0000-000000000002', '사칭');
  raise exception 'FAIL: 남의 명의로 메시지 작성됨';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: 같은 방이어도 남의 출생정보가 보이면 안 됨'; end if;
  if (select count(*) from public.get_room_members((select room from t_ctx))) <> 4 then raise exception 'FAIL: 구성원 4명이 보여야 함'; end if;
  if (select mbti from public.get_room_members((select room from t_ctx)) where nickname = 'tester2') is distinct from 'ENFP' then
    raise exception 'FAIL: 공개 동의한 MBTI가 안 보임';
  end if;
end $$;

-- 7) 사용자2: 메시지 작성 후, 사용자3이 사용자2를 차단하면 사용자2 메시지가 안 보임
select pg_temp.as_user(2);
insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), (select auth.uid()), '반가워');
select pg_temp.as_user(3);
do $$ begin
  if (select count(*) from public.messages) <> 2 then raise exception 'FAIL: 구성원은 메시지 2개를 봐야 함'; end if;
end $$;
insert into public.blocks (blocker_id, blocked_id) values ((select auth.uid()), '00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.messages) <> 1 then raise exception 'FAIL: 차단한 사람의 메시지가 보임'; end if;
end $$;

-- 8) [MCP로 실행 시 생략 — auth.users 삭제가 확인 대기로 멈춤. 외래키 정의로 대신 확인함]
--    사용자2 계정 삭제(auth.users 삭제) → 프로필·구성원·보낸 메시지까지 CASCADE 삭제
--    실제 앱에서는 CR-009 Edge Function이 auth.admin.deleteUser로 같은 삭제를 한다.
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-000000000002';
do $$ begin
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000002') then raise exception 'FAIL: 프로필 남음'; end if;
  if exists (select 1 from public.room_members where user_id = '00000000-0000-0000-0000-000000000002') then raise exception 'FAIL: 구성원 남음'; end if;
  if exists (select 1 from public.messages where sender_id = '00000000-0000-0000-0000-000000000002') then raise exception 'FAIL: 보낸 메시지 남음'; end if;
end $$;

select 'CR-002 RLS OK' as result;
rollback;
