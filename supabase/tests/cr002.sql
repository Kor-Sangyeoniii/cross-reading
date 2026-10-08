\set ON_ERROR_STOP on
-- LOCAL ONLY. Fresh disposable PostgreSQL database; never a Supabase project.
do $$ begin
 if current_database() <> 'cr002_test' or to_regnamespace('auth') is not null then
  raise exception 'Requires a fresh disposable cr002_test database';
 end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth, public to authenticated,anon,service_role;
grant execute on function auth.uid() to authenticated,anon,service_role;
\ir ../migrations/202610080001_cr002.sql

-- All fixtures are synthetic. No people, production IDs or real records.
insert into auth.users select ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,6) i;
insert into public.profiles(user_id,birth_year,birth_month,birth_day,calendar,solar_birth_date)
 select id,2000,1,1,'solar','2000-01-01' from auth.users;
insert into public.display_profiles select id,'fixture-'||right(id::text,1) from auth.users;
insert into public.consent_records(user_id,terms_version,privacy_version,age_14_confirmed)
 select id,'fixture-v1','fixture-v1',true from auth.users;
insert into public.rooms(id,created_by) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005');
insert into public.room_members(room_id,user_id,calculation_consent_version)
 select '10000000-0000-0000-0000-000000000001',id,'fixture-v1' from auth.users where right(id::text,1) in ('1','2','3','4');
insert into public.room_members values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','fixture-v1',now(),false,false,false,now());
create function pg_temp.assert_true(value boolean,label text) returns void language plpgsql as $$
 begin if value is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
select pg_temp.assert_true((select count(*)=9 and bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),'All 9 tables have RLS');
select pg_temp.assert_true((select member_count=4 and is_open from rooms where id='10000000-0000-0000-0000-000000000001'),'4 members open');
do $$ begin
 begin
 insert into room_members(room_id,user_id,calculation_consent_version) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','fixture-v1');
 raise exception 'Fifth member accepted'; exception when check_violation then null; end;
 begin
 update profiles set solar_birth_date=current_date,birth_year=extract(year from current_date),birth_month=extract(month from current_date),birth_day=extract(day from current_date) where user_id='00000000-0000-0000-0000-000000000006';
 raise exception 'Under 14 accepted'; exception when check_violation then null; end;
 begin
 update profiles set birth_time='24:00:00' where user_id='00000000-0000-0000-0000-000000000006';
 raise exception '24:00 accepted'; exception when check_violation then null; end;
end $$;
-- The service role used by future server endpoints still runs DB constraints.
set role service_role;
insert into invites(room_id,created_by,token_hash,expires_at)
values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',repeat('a',64),now()+interval '1 day');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select pg_temp.assert_true((select count(*)=1 from profiles),'Raw data owner only');
select pg_temp.assert_true((select count(*)=4 from display_profiles),'Only shared nicknames');
select pg_temp.assert_true((select count(*)=1 from rooms),'Only member rooms');
select pg_temp.assert_true((select count(*)=4 from room_members),'Only own room members');
insert into messages(room_id,sender_id,body) values('10000000-0000-0000-0000-000000000001',auth.uid(),'synthetic message');
select pg_temp.assert_true((select member_count_at_send=4 from messages limit 1),'H2 count captured');
do $$ begin
 begin
 insert into messages(room_id,sender_id,body) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','forged sender');
 raise exception 'Forged sender accepted'; exception when insufficient_privilege then null; end;
 begin
 insert into messages(room_id,sender_id,body,member_count_at_send) values('10000000-0000-0000-0000-000000000001',auth.uid(),'forged count',2);
 raise exception 'Forged count accepted'; exception when insufficient_privilege then null; end;
 begin perform * from invites; raise exception 'Invite exposed'; exception when insufficient_privilege then null; end;
 begin update profiles set mbti='INTJ'; raise exception 'Direct profile mutation'; exception when insufficient_privilege then null; end;
 begin insert into room_members(room_id,user_id,calculation_consent_version) values('10000000-0000-0000-0000-000000000002',auth.uid(),'x'); raise exception 'Direct join'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
select pg_temp.assert_true((select count(*)=0 from messages),'Outsider cannot read');
do $$ begin
 begin
 insert into messages(room_id,sender_id,body) values('10000000-0000-0000-0000-000000000002',auth.uid(),'one-member room');
 raise exception 'One member room accepted'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
insert into messages(room_id,sender_id,body) values('10000000-0000-0000-0000-000000000001',auth.uid(),'synthetic reply');
insert into blocks(blocker_id,blocked_id) values(auth.uid(),'00000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select count(*)=1 from messages),'Block hides other sender');
insert into reports(reporter_id,reported_user_id,room_id,reason)
 values(auth.uid(),'00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','synthetic report');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select pg_temp.assert_true((select count(*)=1 from messages),'Block works in both directions');
select pg_temp.assert_true((select count(*)=0 from blocks),'Other block list private');
select pg_temp.assert_true((select count(*)=0 from reports),'Other report private');
do $$ begin
 begin insert into messages(room_id,sender_id,body) values('10000000-0000-0000-0000-000000000001',auth.uid(),'blocked send');
 raise exception 'Blocked send accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Delete an account, retaining other participants' messages and room.
delete from auth.users where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select count(*)=0 from profiles where user_id='00000000-0000-0000-0000-000000000001'),'Profile cascade');
select pg_temp.assert_true((select count(*)=0 from invites),'Invite cascade');
select pg_temp.assert_true((select count(*)=0 from consent_records where user_id='00000000-0000-0000-0000-000000000001'),'Consent cascade');
select pg_temp.assert_true((select count(*)=0 from messages where sender_id='00000000-0000-0000-0000-000000000001'),'Sent messages cascade');
select pg_temp.assert_true((select count(*)=1 from messages),'Other messages retained');
select pg_temp.assert_true((select member_count=3 and is_open and created_by is null from rooms where id='10000000-0000-0000-0000-000000000001'),'Creator deletion retains 3-person room');
delete from room_members where user_id='00000000-0000-0000-0000-000000000004';
select pg_temp.assert_true((select member_count=2 and is_open from rooms where id='10000000-0000-0000-0000-000000000001'),'2-person room opens');
delete from room_members where user_id='00000000-0000-0000-0000-000000000003';
select pg_temp.assert_true((select member_count=1 and not is_open from rooms where id='10000000-0000-0000-0000-000000000001'),'1-person room closes');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select pg_temp.assert_true((select count(*)=0 from messages),'Former member loses history access');
reset role;
set role anon;
do $$ begin
 begin perform * from public.rooms; raise exception 'Anonymous room read'; exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'PASS: RLS, spoofing, blocks, reports, age, capacities, cascade, former member, anon'
