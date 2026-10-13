-- CR-022. Review-only migration: do NOT apply to production until independent review.
-- Live matching starts CLOSED. Provider secrets/identity documents never enter these rows.
create table public.dating_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  amount integer not null default 3000 check (amount between 1000 and 100000),
  deadline_hours integer not null default 24 check (deadline_hours between 1 and 48)
);
insert into public.dating_config(singleton) values(true);
create table public.dating_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  area text not null check (area in ('서울 서북권','서울 동북권','서울 서남권','서울 동남권')),
  slots text[] not null check (cardinality(slots) between 1 and 3 and slots <@ array['평일 저녁','토요일 오후','일요일 오후']::text[]),
  intent text not null check (intent in ('천천히 알아가는 연애','장기적인 관계')),
  gender text not null check (gender in ('woman','man')),
  seeks text not null check (seeks in ('woman','man')),
  adult_verified boolean not null default false,
  photo_reviewed boolean not null default false,
  verified_until timestamptz,
  status text not null default 'paused' check (status in ('active','paused','restricted')),
  confirmed_at timestamptz not null default now(),
  consent_version text not null check (consent_version = 'pilot-2026-10-13'),
  created_at timestamptz not null default now()
);
create table public.dating_connections (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.dating_members(user_id),
  b uuid not null references public.dating_members(user_id),
  likes uuid[] not null default '{}',
  status text not null default 'interest' check (status in ('interest','mutual','waiting','open','closed')),
  amount integer not null check (amount between 1000 and 100000),
  deadline_hours integer not null check (deadline_hours between 1 and 48),
  expires_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  unique(a,b), check (a < b), check (likes <@ array[a,b])
);
-- Connections deliberately prevent hard deletion until retention/refunds are resolved.
-- Existing delete-account must be updated after legal retention policy review before live launch.
create table public.dating_orders (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.dating_connections(id),
  user_id uuid not null references public.dating_members(user_id),
  amount integer not null check (amount between 1000 and 100000),
  currency text not null default 'KRW' check (currency = 'KRW'),
  status text not null default 'created' check (status in ('created','paid','refund_pending','refund_failed','refunded')),
  provider_payment_id text unique,
  updated_at timestamptz not null default now(),
  unique(connection_id,user_id)
);
create table public.dating_messages (
  id bigint generated always as identity primary key,
  connection_id uuid not null references public.dating_connections(id),
  sender_id uuid not null references public.dating_members(user_id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index dating_messages_connection_idx on public.dating_messages(connection_id,id);
create table public.dating_blocks (
  blocker uuid not null references public.dating_members(user_id),
  blocked uuid not null references public.dating_members(user_id),
  primary key(blocker,blocked), check(blocker <> blocked)
);
create table public.dating_reports (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.dating_connections(id),
  reporter uuid not null references public.dating_members(user_id),
  target uuid not null references public.dating_members(user_id),
  reason text not null check (reason in ('money','identity','harassment','other')),
  status text not null default 'pending' check (status in ('pending','reviewed')),
  created_at timestamptz not null default now(), check(reporter <> target)
);
create unique index dating_reports_pending_idx on public.dating_reports(connection_id,reporter) where status='pending';
create table public.dating_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dating_members(user_id),
  public_reason text not null check (char_length(public_reason) between 1 and 300),
  action text not null check (action in ('restricted','restored')),
  appealed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.dating_review_audit (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.dating_reports(id),
  review_id uuid references public.dating_reviews(id),
  operator_id uuid not null,
  evidence_note text not null check (char_length(evidence_note) between 10 and 1000),
  created_at timestamptz not null default now()
);

alter table public.dating_config enable row level security;
alter table public.dating_members enable row level security;
alter table public.dating_connections enable row level security;
alter table public.dating_orders enable row level security;
alter table public.dating_messages enable row level security;
alter table public.dating_blocks enable row level security;
alter table public.dating_reports enable row level security;
alter table public.dating_reviews enable row level security;
alter table public.dating_review_audit enable row level security;
-- Supabase defaults may grant broad privileges: revoke explicitly. No direct client writes.
revoke all on public.dating_config,public.dating_members,public.dating_connections,public.dating_orders,public.dating_messages,public.dating_blocks,public.dating_reports,public.dating_reviews,public.dating_review_audit from anon,authenticated;
grant all on public.dating_config,public.dating_members,public.dating_connections,public.dating_orders,public.dating_messages,public.dating_blocks,public.dating_reports,public.dating_reviews,public.dating_review_audit to service_role;
grant usage,select on sequence public.dating_messages_id_seq to service_role;
grant select on public.dating_members,public.dating_messages,public.dating_reports,public.dating_reviews to authenticated;
create policy dating_members_self on public.dating_members for select to authenticated using (user_id=(select auth.uid()));
create policy dating_reports_self on public.dating_reports for select to authenticated using (reporter=(select auth.uid()));
create policy dating_reviews_self on public.dating_reviews for select to authenticated using (user_id=(select auth.uid()));

create function public.dating_is_participant(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.dating_connections where id=p_id and (a=auth.uid() or b=auth.uid()));
$$;
create policy dating_messages_members on public.dating_messages for select to authenticated using (public.dating_is_participant(connection_id));
create function public.dating_eligible(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.dating_members where user_id=p_id and status='active' and adult_verified and photo_reviewed and verified_until>now() and confirmed_at>now()-interval '7 days');
$$;
create function public.dating_blocked(p_a uuid,p_b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.dating_blocks where (blocker=p_a and blocked=p_b) or (blocker=p_b and blocked=p_a));
$$;
create function public.dating_close(p_id uuid,p_refund_open boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare c public.dating_connections;
begin
 select * into c from public.dating_connections where id=p_id for update;
 if c.id is null then return; end if;
 update public.dating_connections set status='closed' where id=p_id;
 if c.opened_at is null or p_refund_open then
  update public.dating_orders set status='refund_pending',updated_at=now() where connection_id=p_id and status='paid';
 end if;
end $$;
create function public.dating_save_profile(p_nickname text,p_area text,p_slots text[],p_intent text,p_gender text,p_seeks text,p_consent text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 insert into public.dating_members(user_id,nickname,area,slots,intent,gender,seeks,consent_version)
 values(auth.uid(),btrim(p_nickname),p_area,p_slots,p_intent,p_gender,p_seeks,p_consent)
 on conflict(user_id) do update set nickname=excluded.nickname,area=excluded.area,slots=excluded.slots,intent=excluded.intent,gender=excluded.gender,seeks=excluded.seeks,consent_version=excluded.consent_version;
end $$;
create function public.dating_activity(p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 update public.dating_members set status=case when p_active then 'active' else 'paused' end,confirmed_at=case when p_active then now() else confirmed_at end where user_id=auth.uid() and status<>'restricted';
 if not found then raise exception 'not_available'; end if;
end $$;
create function public.dating_catalog() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not coalesce((select enabled from public.dating_config where singleton),false) or not public.dating_eligible(auth.uid()) then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(row_to_json(x)),'[]'::jsonb) into result from (
 select p.user_id,p.nickname,p.area,p.slots,p.intent from public.dating_members p join public.dating_members me on me.user_id=auth.uid()
 where p.user_id<>me.user_id and p.area=me.area and p.slots && me.slots and p.intent=me.intent and p.gender=me.seeks and p.seeks=me.gender and public.dating_eligible(p.user_id) and not public.dating_blocked(p.user_id,me.user_id)
 and not exists(select 1 from public.dating_connections c where c.a=least(p.user_id,me.user_id) and c.b=greatest(p.user_id,me.user_id) and c.status='closed')
 order by p.confirmed_at desc,p.user_id limit 5) x;
 return result;
end $$;
create function public.dating_interest(p_target uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.dating_connections; me uuid:=auth.uid(); cfg public.dating_config;
begin
 select * into cfg from public.dating_config where singleton;
 if not coalesce(cfg.enabled,false) or me is null or p_target=me or not public.dating_eligible(me) or not public.dating_eligible(p_target) or public.dating_blocked(me,p_target) then raise exception 'not_available'; end if;
 if not exists(select 1 from public.dating_members x join public.dating_members y on y.user_id=p_target where x.user_id=me and x.area=y.area and x.slots && y.slots and x.intent=y.intent and x.gender=y.seeks and x.seeks=y.gender) then raise exception 'not_compatible'; end if;
 insert into public.dating_connections(a,b,amount,deadline_hours) values(least(me,p_target),greatest(me,p_target),cfg.amount,cfg.deadline_hours) on conflict(a,b) do nothing;
 select * into c from public.dating_connections where a=least(me,p_target) and b=greatest(me,p_target) for update;
 if c.status='closed' then raise exception 'connection_closed'; end if;
 if not me=any(c.likes) then c.likes:=array_append(c.likes,me); end if;
 update public.dating_connections set likes=c.likes,status=case when c.status='interest' and cardinality(c.likes)=2 then 'mutual' else c.status end where id=c.id;
 return c.id;
end $$;
create function public.dating_create_order(p_connection uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.dating_connections; o public.dating_orders;
begin
 select * into c from public.dating_connections where id=p_connection for update;
 if auth.uid() is null or c.id is null or not (auth.uid()=c.a or auth.uid()=c.b) then raise exception 'not_available'; end if;
 if c.status='waiting' and c.expires_at<=now() then perform public.dating_close(c.id); return jsonb_build_object('status','expired'); end if;
 if not coalesce((select enabled from public.dating_config where singleton),false) or c.status not in ('mutual','waiting') or not public.dating_eligible(c.a) or not public.dating_eligible(c.b) or public.dating_blocked(c.a,c.b) then raise exception 'not_available'; end if;
 insert into public.dating_orders(connection_id,user_id,amount) values(c.id,auth.uid(),c.amount) on conflict(connection_id,user_id) do nothing;
 select * into o from public.dating_orders where connection_id=c.id and user_id=auth.uid();
 return jsonb_build_object('orderId',o.id,'amount',o.amount,'currency',o.currency,'status',o.status);
end $$;
-- SERVER ONLY. Caller must authenticate webhook, retrieve provider receipt and bind orderId/userId/storeId.
-- No browser callback may invoke this function. An authoritative late payment becomes refund_pending.
create function public.dating_record_payment(p_order uuid,p_payment text,p_amount integer,p_currency text) returns text language plpgsql security definer set search_path='' as $$
declare c public.dating_connections; o public.dating_orders; blocked boolean;
begin
 select * into o from public.dating_orders where id=p_order;
 if o.id is null then raise exception 'unknown_order'; end if;
 select * into c from public.dating_connections where id=o.connection_id for update;
 select * into o from public.dating_orders where id=p_order for update;
 if p_amount is distinct from o.amount or p_currency is distinct from o.currency or p_payment is null or char_length(p_payment) not between 1 and 200 then raise exception 'receipt_mismatch'; end if;
 if o.status<>'created' then
  if o.provider_payment_id is distinct from p_payment then raise exception 'receipt_mismatch'; end if;
  return o.status;
 end if;
 blocked:=not coalesce((select enabled from public.dating_config where singleton),false) or c.status not in ('mutual','waiting') or (c.expires_at is not null and c.expires_at<=now()) or not public.dating_eligible(c.a) or not public.dating_eligible(c.b) or public.dating_blocked(c.a,c.b);
 if blocked then
  perform public.dating_close(c.id);
  update public.dating_orders set provider_payment_id=p_payment,status='refund_pending',updated_at=now() where id=p_order;
  return 'refund_pending';
 end if;
 update public.dating_orders set provider_payment_id=p_payment,status='paid',updated_at=now() where id=p_order;
 update public.dating_connections set expires_at=coalesce(expires_at,now()+make_interval(hours=>c.deadline_hours)),status=case when (select count(*) from public.dating_orders where connection_id=c.id and status='paid')=2 then 'open' else 'waiting' end,opened_at=case when (select count(*) from public.dating_orders where connection_id=c.id and status='paid')=2 then now() else null end where id=c.id;
 return 'paid';
end $$;
create function public.dating_expire() returns integer language plpgsql security definer set search_path='' as $$
declare c record; n integer:=0;
begin
 for c in select id from public.dating_connections where status='waiting' and expires_at<=now() order by id for update skip locked loop
  perform public.dating_close(c.id); n:=n+1;
 end loop;
 return n;
end $$;
create function public.dating_settle_refund(p_order uuid,p_payment text,p_success boolean) returns void language plpgsql security definer set search_path='' as $$
declare o public.dating_orders;
begin
 select * into o from public.dating_orders where id=p_order for update;
 if o.id is null or o.provider_payment_id is distinct from p_payment or o.status not in ('refund_pending','refund_failed','refunded') or p_success is null then raise exception 'not_refundable'; end if;
 if o.status='refunded' then return; end if;
 update public.dating_orders set status=case when p_success then 'refunded' else 'refund_failed' end,updated_at=now() where id=p_order;
end $$;
create function public.dating_cancel(p_connection uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.dating_connections;
begin
 select * into c from public.dating_connections where id=p_connection for update;
 if not public.dating_is_participant(c.id) then raise exception 'not_available'; end if;
 if c.opened_at is not null then raise exception 'review_required'; end if;
 perform public.dating_close(c.id);
end $$;
create function public.dating_block(p_target uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.dating_connections;
begin
 select * into c from public.dating_connections where a=least(auth.uid(),p_target) and b=greatest(auth.uid(),p_target) for update;
 if auth.uid() is null or c.id is null or auth.uid()=p_target then raise exception 'not_available'; end if;
 insert into public.dating_blocks(blocker,blocked) values(auth.uid(),p_target) on conflict do nothing;
 perform public.dating_close(c.id);
end $$;
create function public.dating_send(p_connection uuid,p_body text) returns bigint language plpgsql security definer set search_path='' as $$
declare c public.dating_connections; result bigint;
begin
 select * into c from public.dating_connections where id=p_connection for update;
 if not public.dating_is_participant(c.id) or c.status<>'open' or public.dating_blocked(c.a,c.b) or exists(select 1 from public.dating_members where user_id in (c.a,c.b) and status='restricted') then raise exception 'chat_unavailable'; end if;
 if not coalesce((select enabled from public.dating_config where singleton),false) then raise exception 'service_paused'; end if;
 if btrim(p_body) ~* '(https?:|www\.|([a-z0-9-]+\.)+(com|net|org|io|me|kr)\M)' then raise exception 'external_link_not_allowed'; end if;
 insert into public.dating_messages(connection_id,sender_id,body) values(c.id,auth.uid(),btrim(p_body)) returning id into result;
 return result;
end $$;
create function public.dating_report(p_connection uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.dating_connections; result uuid;
begin
 select * into c from public.dating_connections where id=p_connection;
 if not public.dating_is_participant(c.id) then raise exception 'not_available'; end if;
 insert into public.dating_reports(connection_id,reporter,target,reason) values(c.id,auth.uid(),case when auth.uid()=c.a then c.b else c.a end,p_reason)
 on conflict(connection_id,reporter) where status='pending' do update set reason=public.dating_reports.reason returning id into result;
 return result;
end $$;
-- Reviewed action is explicit, audited, and separate from filing a report.
create function public.dating_review(p_report uuid,p_restrict boolean,p_reason text,p_operator uuid,p_evidence text) returns void language plpgsql security definer set search_path='' as $$
declare r public.dating_reports; rid uuid; c record;
begin
 select * into r from public.dating_reports where id=p_report for update;
 if r.id is null or r.status<>'pending' then raise exception 'not_pending'; end if;
 if p_restrict then
  -- Lock connection before member, in the same order as message/payment processing.
  for c in select id from public.dating_connections where a=r.target or b=r.target order by id for update loop perform public.dating_close(c.id,true); end loop;
  update public.dating_members set status='restricted' where user_id=r.target;
  insert into public.dating_reviews(user_id,public_reason,action) values(r.target,p_reason,'restricted') returning id into rid;
 end if;
 insert into public.dating_review_audit(report_id,review_id,operator_id,evidence_note) values(r.id,rid,p_operator,p_evidence);
 update public.dating_reports set status='reviewed' where id=r.id;
end $$;
create function public.dating_appeal(p_review uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.dating_reviews set appealed_at=coalesce(appealed_at,now()) where id=p_review and user_id=auth.uid() and action='restricted';
 if not found then raise exception 'not_available'; end if;
end $$;
create function public.dating_restore(p_user uuid,p_operator uuid,p_evidence text) returns void language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 update public.dating_members set status='paused' where user_id=p_user and status='restricted';
 if not found then raise exception 'not_restricted'; end if;
 insert into public.dating_reviews(user_id,public_reason,action) values(p_user,'재검토 후 제한을 해제했습니다. 활동 의사를 다시 확인해 주세요.','restored') returning id into rid;
 insert into public.dating_review_audit(review_id,operator_id,evidence_note) values(rid,p_operator,p_evidence);
end $$;
create function public.dating_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'status',c.status,'expiresAt',c.expires_at,'amount',c.amount,'myInterest',auth.uid()=any(c.likes),'mutual',cardinality(c.likes)=2,'other',jsonb_build_object('id',p.user_id,'nickname',p.nickname,'area',p.area,'slots',p.slots,'intent',p.intent),'myPayment',coalesce(o.status,'created'))),'[]'::jsonb) into result
 from public.dating_connections c join public.dating_members p on p.user_id=case when c.a=auth.uid() then c.b else c.a end left join public.dating_orders o on o.connection_id=c.id and o.user_id=auth.uid() where c.a=auth.uid() or c.b=auth.uid();
 return result;
end $$;
-- Revoke default PUBLIC execution for EVERY new function, including internal helpers.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'dating_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
grant execute on function public.dating_is_participant(uuid),public.dating_save_profile(text,text,text[],text,text,text,text),public.dating_activity(boolean),public.dating_catalog(),public.dating_interest(uuid),public.dating_create_order(uuid),public.dating_cancel(uuid),public.dating_block(uuid),public.dating_send(uuid,text),public.dating_report(uuid,text),public.dating_appeal(uuid),public.dating_dashboard() to authenticated;
