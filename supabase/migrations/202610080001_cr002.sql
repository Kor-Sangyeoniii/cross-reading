-- REVIEW DRAFT: do not apply to a remote database without independent review + owner approval.
begin;
create schema if not exists cr_private;
revoke all on schema cr_private from public, anon, authenticated;
grant usage on schema cr_private to authenticated;

-- Raw birth data is owner-readable only. Writes require a trusted, validated server path.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_year integer not null check (birth_year between 1800 and 2300),
  birth_month integer not null check (birth_month between 1 and 12),
  birth_day integer not null check (birth_day between 1 and 31),
  calendar text not null check (calendar in ('solar','lunar')),
  is_leap_month boolean not null default false,
  solar_birth_date date not null,
  birth_time time(0), -- NULL means unknown, not midnight.
  mbti text check (mbti ~ '^[IE][NS][TF][JP]$'), -- NULL means unknown.
  age_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (calendar = 'lunar' or not is_leap_month),
  check (calendar <> 'lunar' or birth_day <= 30),
  check (calendar <> 'solar' or solar_birth_date = make_date(birth_year,birth_month,birth_day)),
  check (birth_time is null or (birth_time < time '24:00:00' and extract(second from birth_time) = 0))
);
create table public.display_profiles (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 30)
);
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  terms_version text not null check (length(terms_version) between 1 and 100),
  privacy_version text not null check (length(privacy_version) between 1 and 100),
  age_14_confirmed boolean not null check (age_14_confirmed),
  accepted_at timestamptz not null default now()
);
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(user_id) on delete set null,
  member_count smallint not null default 0 check (member_count between 0 and 4),
  is_open boolean generated always as (member_count >= 2) stored,
  created_at timestamptz not null default now()
);
create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  calculation_consent_version text not null check (length(calculation_consent_version) between 1 and 100),
  calculation_consented_at timestamptz not null default now(),
  show_mbti boolean not null default false,
  show_birth_date boolean not null default false,
  show_birth_time boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id,user_id)
);
create index room_members_user on public.room_members(user_id,room_id);
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null, -- No default expiry: product policy still undecided.
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index invites_room on public.invites(room_id);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  member_count_at_send smallint not null check (member_count_at_send between 2 and 4),
  sent_at timestamptz not null default now()
);
create index messages_room_time on public.messages(room_id,sent_at,id);
create index messages_sender on public.messages(sender_id);
create table public.blocks (
  blocker_id uuid not null references public.profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id,blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_target on public.blocks(blocked_id);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(user_id) on delete cascade,
  reported_user_id uuid not null references public.profiles(user_id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);
create index reports_reporter on public.reports(reporter_id);
create index reports_target on public.reports(reported_user_id);
create index reports_message on public.reports(message_id);

-- Fixed search_path, fully qualified relations, narrow signatures; no caller-selected user id.
create function cr_private.is_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.room_members where room_id=p_room and user_id=auth.uid())
$$;
create function cr_private.blocked_with(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.blocks where
 (blocker_id=auth.uid() and blocked_id=p_user) or (blocker_id=p_user and blocked_id=auth.uid()))
$$;
create function cr_private.shares_room(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.room_members a join public.room_members b using(room_id)
 where a.user_id=auth.uid() and b.user_id=p_user)
$$;
create function cr_private.can_send(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select cr_private.is_member(p_room)
 and exists(select 1 from public.rooms where id=p_room and is_open)
 and not exists(select 1 from public.room_members m where m.room_id=p_room and cr_private.blocked_with(m.user_id))
$$;
create function cr_private.can_report(p_room uuid,p_target uuid,p_message uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select cr_private.is_member(p_room)
 and exists(select 1 from public.room_members where room_id=p_room and user_id=p_target)
 and (p_message is null or exists(select 1 from public.messages where id=p_message and room_id=p_room and sender_id=p_target))
$$;

create function cr_private.validate_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.solar_birth_date > ((now() at time zone 'Asia/Seoul')::date - interval '14 years')::date then
   raise exception 'Age requirement not met' using errcode='23514';
 end if;
 return new;
end $$;
create trigger profile_age before insert or update on public.profiles
for each row execute function cr_private.validate_profile();

-- Atomic UPDATE serializes concurrent joins to a room; CHECK aborts the fifth join.
create function cr_private.membership_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='INSERT' then
   if not exists(select 1 from public.consent_records where user_id=new.user_id) then
     raise exception 'Service consent required' using errcode='23514';
   end if;
   update public.rooms set member_count=member_count+1 where id=new.room_id;
   return new;
 elsif tg_op='DELETE' then
   update public.rooms set member_count=member_count-1 where id=old.room_id;
   return old;
 end if;
 raise exception 'Membership is immutable; leave and rejoin' using errcode='23514';
end $$;
create trigger membership_count after insert or delete or update on public.room_members
for each row execute function cr_private.membership_count();

create function cr_private.prepare_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 -- Lock the same parent row as membership changes, so count-at-send cannot race a leave.
 select member_count into new.member_count_at_send from public.rooms where id=new.room_id for update;
 if new.member_count_at_send is null or new.member_count_at_send < 2
 or not exists(select 1 from public.room_members where room_id=new.room_id and user_id=new.sender_id) then
   raise exception 'Room is not open to sender' using errcode='23514';
 end if;
 new.sent_at := now();
 return new;
end $$;
create trigger prepare_message before insert on public.messages
for each row execute function cr_private.prepare_message();

alter table public.profiles enable row level security;
alter table public.display_profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.invites enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Explicit table allowlist: no dependence on Supabase's default grants.
revoke all on public.profiles,public.display_profiles,public.consent_records,public.rooms,
 public.room_members,public.invites,public.messages,public.blocks,public.reports from public,anon,authenticated;
grant select on public.profiles,public.display_profiles,public.consent_records,public.rooms,
 public.room_members,public.messages,public.blocks,public.reports to authenticated;
grant insert(room_id,sender_id,body) on public.messages to authenticated;
grant insert(blocker_id,blocked_id) on public.blocks to authenticated;
grant delete on public.blocks to authenticated;
grant insert(reporter_id,reported_user_id,room_id,message_id,reason) on public.reports to authenticated;
grant all on public.profiles,public.display_profiles,public.consent_records,public.rooms,
 public.room_members,public.invites,public.messages,public.blocks,public.reports to service_role;

create policy profiles_self on public.profiles for select to authenticated using(user_id=auth.uid());
create policy consent_self on public.consent_records for select to authenticated using(user_id=auth.uid());
create policy display_visible on public.display_profiles for select to authenticated using(
 user_id=auth.uid() or (cr_private.shares_room(user_id) and not cr_private.blocked_with(user_id)));
create policy rooms_member on public.rooms for select to authenticated using(cr_private.is_member(id));
create policy members_member on public.room_members for select to authenticated using(cr_private.is_member(room_id));
-- Invites deliberately have no client policy: only a server can inspect a hash or admit a member.
create policy messages_member on public.messages for select to authenticated using(
 cr_private.is_member(room_id) and not cr_private.blocked_with(sender_id));
create policy messages_send on public.messages for insert to authenticated with check(
 sender_id=auth.uid() and cr_private.can_send(room_id));
create policy blocks_self on public.blocks for select to authenticated using(blocker_id=auth.uid());
create policy blocks_add on public.blocks for insert to authenticated with check(
 blocker_id=auth.uid() and cr_private.shares_room(blocked_id));
create policy blocks_remove on public.blocks for delete to authenticated using(blocker_id=auth.uid());
create policy reports_self on public.reports for select to authenticated using(reporter_id=auth.uid());
create policy reports_add on public.reports for insert to authenticated with check(
 reporter_id=auth.uid() and cr_private.can_report(room_id,reported_user_id,message_id));

revoke all on all functions in schema cr_private from public,anon,authenticated;
grant execute on function cr_private.is_member(uuid),cr_private.blocked_with(uuid),
 cr_private.shares_room(uuid),cr_private.can_send(uuid),cr_private.can_report(uuid,uuid,uuid) to authenticated;
-- Do not add these security-definer helpers to an exposed PostgREST schema.
commit;
