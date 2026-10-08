-- CR-002 RLS·권한 검증 스크립트 v2 (보완 마이그레이션 0004 반영). 가짜 사용자만 쓰고 마지막에 ROLLBACK 한다 (AGENTS.md P1).
-- 모두 통과하면 마지막 select가 'CR-002 RLS v2 OK'를 돌려준다. 실패하면 'FAIL: …' 예외.
-- 주의: Supabase MCP로 실행할 때는 auth.users 삭제가 확인 대기로 멈추므로 계정 삭제 CASCADE는 외래키 정의로 확인한다(tasks/CR-002.md).
begin;

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'rls-test-' || n || '@example.invalid', now(), now()
from generate_series(1, 6) n;

insert into public.profiles (id, nickname, birth_year, birth_month, birth_day, solar_birth_date, calendar, age_14_confirmed, terms_agreed_at, privacy_agreed_at, mbti)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'tester' || n, 2000, 1, n, make_date(2000, 1, n), 'solar', true, now(), now(),
       case when n = 2 then 'ENFP' end
from generate_series(1, 5) n;

create temporary table t_ctx (room uuid, token text) on commit drop;
grant all on t_ctx to authenticated;
create or replace function pg_temp.as_user(n int) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000' || n, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- 0) 만 14세 미만 프로필 거부 (사용자6)
select pg_temp.as_user(6);
do $$ begin
  insert into public.profiles (id, nickname, birth_year, birth_month, birth_day, solar_birth_date, calendar, age_14_confirmed, terms_agreed_at, privacy_agreed_at)
    values ((select auth.uid()), 'young', 2015, 1, 1, '2015-01-01', 'solar', true, now(), now());
  raise exception 'FAIL: 만 14세 미만 저장됨';
exception when check_violation then
  if sqlerrm not like '%age_under_14%' then raise; end if;
end $$;

-- 1) 사용자1 방 생성: 원문 토큰은 64자리, DB에는 해시만
select pg_temp.as_user(1);
insert into t_ctx select room_id, invite_token from public.create_room(false, false);
do $$ begin
  if (select token from t_ctx) !~ '^[a-f0-9]{64}$' then raise exception 'FAIL: 토큰 형식'; end if;
  if exists (select 1 from public.invites where token_hash = (select token from t_ctx)) then raise exception 'FAIL: 원문 토큰이 DB에 저장됨'; end if;
  if (select member_count from public.rooms where id = (select room from t_ctx)) <> 1 then raise exception 'FAIL: 인원 1이어야 함'; end if;
end $$;

-- 2) 1명 방에서는 메시지 전송 불가
do $$ begin
  insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), (select auth.uid()), '혼자');
  raise exception 'FAIL: 1명 방 전송됨';
exception when check_violation then
  if sqlerrm not like '%room_not_open%' then raise; end if;
end $$;

-- 3) 사용자2: 미리보기는 원문 토큰으로만, 해시로는 안 됨. 계산 동의 없이 수락 거부
select pg_temp.as_user(2);
do $$ begin
  if (select count(*) from public.preview_invite((select token from t_ctx))) <> 1 then raise exception 'FAIL: 미리보기 실패'; end if;
  if (select count(*) from public.preview_invite(encode(extensions.digest((select token from t_ctx), 'sha256'), 'hex'))) <> 0 then
    raise exception 'FAIL: 해시값으로 미리보기 됨';
  end if;
  perform public.accept_invite((select token from t_ctx), false, true, false);
  raise exception 'FAIL: 계산 동의 없이 수락됨';
exception when others then
  if sqlerrm not like '%calc_consent_required%' then raise; end if;
end $$;

-- 4) 사용자2~4 수락 → 4명, 사용자5는 room_full
select public.accept_invite((select token from t_ctx), true, true, false);
select pg_temp.as_user(3);
select public.accept_invite((select token from t_ctx), true, false, false);
select pg_temp.as_user(4);
select public.accept_invite((select token from t_ctx), true, false, false);
select pg_temp.as_user(5);
do $$ begin
  perform public.accept_invite((select token from t_ctx), true, false, false);
  raise exception 'FAIL: 5번째 참여 허용';
exception when others then
  if sqlerrm not like '%room_full%' then raise; end if;
end $$;

-- 5) 방 밖 사용자5: 메시지 작성·구성원·남의 프로필 조회 불가
do $$ begin
  insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), (select auth.uid()), 'x');
  raise exception 'FAIL: 방 밖 전송';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  if (select count(*) from public.room_members) <> 0 then raise exception 'FAIL: 방 밖에서 구성원 보임'; end if;
  if (select count(*) from public.get_room_members((select room from t_ctx))) <> 0 then raise exception 'FAIL: 방 밖 RPC 구성원 보임'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: 남의 프로필 보임'; end if;
end $$;

-- 6) 사용자1: 메시지 → 보낸 당시 인원 4 기록, 사칭 불가, 출생정보 비공개, 공개 동의 MBTI만
select pg_temp.as_user(1);
insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), (select auth.uid()), '안녕');
do $$ begin
  if (select member_count_at_send from public.messages order by id desc limit 1) <> 4 then raise exception 'FAIL: 보낸 당시 인원 4 아님'; end if;
  insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), '00000000-0000-0000-0000-000000000002', '사칭');
  raise exception 'FAIL: 사칭 전송';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: 같은 방 남의 출생정보 보임'; end if;
  if (select mbti from public.get_room_members((select room from t_ctx)) where nickname = 'tester2') is distinct from 'ENFP' then raise exception 'FAIL: 공개 MBTI 안 보임'; end if;
  if (select mbti from public.get_room_members((select room from t_ctx)) where nickname = 'tester3') is not null then raise exception 'FAIL: 비공개 MBTI 보임'; end if;
end $$;

-- 7) 구성원은 공개 항목만 수정 가능, 방·동의 시각 변경 불가
do $$ begin
  update public.room_members set share_mbti = true where user_id = (select auth.uid());
  update public.room_members set calc_consent_at = now() - interval '1 year' where user_id = (select auth.uid());
  raise exception 'FAIL: 동의 시각 변경됨';
exception when insufficient_privilege then null;
end $$;

-- 8) 차단(상연님 결정 1번): 사용자3이 사용자2를 차단 → 사용자3 화면에서만 숨김, 사용자2는 계속 전송, 사용자4는 그대로 봄
select pg_temp.as_user(2);
insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), (select auth.uid()), '반가워');
select pg_temp.as_user(3);
insert into public.blocks (blocker_id, blocked_id) values ((select auth.uid()), '00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.messages) <> 1 then raise exception 'FAIL: 차단한 사람 메시지 보임'; end if;
end $$;
select pg_temp.as_user(2);
insert into public.messages (room_id, sender_id, body) values ((select room from t_ctx), (select auth.uid()), '차단돼도 전송됨');
select pg_temp.as_user(4);
do $$ begin
  if (select count(*) from public.messages) <> 3 then raise exception 'FAIL: 제3자는 모든 메시지를 봐야 함'; end if;
end $$;

-- 9) 신고: 방을 나간 사람도(메시지가 있으면) 신고 가능, 관계없는 사람은 불가
--    [MCP 실행 시 '나가기(delete)' 줄은 확인 대기로 멈춰 생략 — 나가기 후 인원 감소·신고는 코드 리뷰로 확인, 2026-10-08]
select pg_temp.as_user(2);
delete from public.room_members where user_id = (select auth.uid());
select pg_temp.as_user(4);
do $$ begin
  if (select member_count from public.rooms where id = (select room from t_ctx)) <> 3 then raise exception 'FAIL: 나간 뒤 인원 3이어야 함'; end if;
end $$;
insert into public.reports (reporter_id, reported_user_id, room_id, reason)
  values ((select auth.uid()), '00000000-0000-0000-0000-000000000002', (select room from t_ctx), '테스트 신고');
do $$ begin
  insert into public.reports (reporter_id, reported_user_id, room_id, reason)
    values ((select auth.uid()), '00000000-0000-0000-0000-000000000005', (select room from t_ctx), '관계없는 사람');
  raise exception 'FAIL: 방과 관계없는 사람 신고됨';
exception when insufficient_privilege then null;
end $$;

-- 10) 비로그인(anon)은 아무 테이블도 못 읽음
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  perform 1 from public.profiles limit 1;
  raise exception 'FAIL: anon이 profiles 접근';
exception when insufficient_privilege then null;
end $$;

reset role;
select 'CR-002 RLS v2 OK' as result;
rollback;
