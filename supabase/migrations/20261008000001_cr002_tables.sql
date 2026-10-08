-- CR-002 핵심 스키마: 프로필, 그룹방(2~4명), 초대, 메시지, 차단, 신고, 푸시 구독
-- 원칙 (AGENTS.md P1·P2, DECISIONS.md 2026-10-08):
--  * 모든 테이블 RLS 켬. 출생정보는 본인만 읽는다. 다른 구성원은 RPC로 공개 동의한 항목만 본다.
--  * 계정 삭제 시 auth.users 삭제 → 프로필·구성원·보낸 메시지·푸시 구독까지 CASCADE 삭제.
--  * 그룹방은 최대 4명. 2명 이상이면 대화 가능(별도 상태 컬럼 없음).

-- ───────────────────────── 프로필 ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  birth_year smallint not null check (birth_year between 1900 and 2100),
  birth_month smallint not null check (birth_month between 1 and 12),
  birth_day smallint not null check (birth_day between 1 and 31),
  calendar text not null check (calendar in ('solar', 'lunar')),
  is_leap_month boolean not null default false,
  -- 출생시간 모름이면 둘 다 null
  birth_hour smallint check (birth_hour between 0 and 23),
  birth_minute smallint check (birth_minute between 0 and 59),
  -- MBTI 모름이면 null (사용자가 스스로 아는 유형만)
  mbti text check (mbti ~ '^[EI][SN][TF][JP]$'),
  age_14_confirmed boolean not null check (age_14_confirmed),
  terms_agreed_at timestamptz not null,
  privacy_agreed_at timestamptz not null,
  marketing_agreed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((birth_hour is null) = (birth_minute is null)),
  check (calendar = 'lunar' or not is_leap_month)
);

alter table public.profiles enable row level security;

create policy "profiles: 본인만 조회" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: 본인만 생성" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: 본인만 수정" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- 삭제는 계정 삭제(CR-009 Edge Function, auth.users 삭제 CASCADE)로만 한다.

-- ───────────────────────── 그룹방 ─────────────────────────
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 궁합 계산에 내 정보를 쓰는 데 동의 (수락 필수)
  calc_consent_at timestamptz not null,
  -- 상대에게 보여줄 항목 (기본 비공개)
  share_mbti boolean not null default false,
  share_summary boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index room_members_user_idx on public.room_members (user_id);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

-- RLS 재귀를 피하기 위한 구성원 확인 함수
create function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room and m.user_id = (select auth.uid())
  );
$$;

create policy "rooms: 구성원만 조회" on public.rooms
  for select to authenticated using (public.is_room_member(id));

create policy "room_members: 같은 방 구성원만 조회" on public.room_members
  for select to authenticated using (public.is_room_member(room_id));
create policy "room_members: 본인 공개 범위 수정" on public.room_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "room_members: 본인 나가기" on public.room_members
  for delete to authenticated using (user_id = (select auth.uid()));
-- 방 생성·참여는 아래 RPC(create_room, accept_invite)로만 한다.

-- 최대 4명 제한
create function public.enforce_room_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.rooms where id = new.room_id for update;
  if (select count(*) from public.room_members where room_id = new.room_id) >= 4 then
    raise exception 'room_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger room_capacity before insert on public.room_members
  for each row execute function public.enforce_room_capacity();

-- ───────────────────────── 초대 ─────────────────────────
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_by uuid references auth.users (id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

create policy "invites: 같은 방 구성원만 조회" on public.invites
  for select to authenticated using (public.is_room_member(room_id));
create policy "invites: 만든 사람만 취소" on public.invites
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

-- ───────────────────────── 메시지 ─────────────────────────
create table public.messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms (id) on delete cascade,
  -- 계정 삭제 시 보낸 메시지까지 삭제 (DECISIONS 2026-10-08)
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_room_created_idx on public.messages (room_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

alter table public.messages enable row level security;

-- ───────────────────────── 차단·신고 ─────────────────────────
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "blocks: 본인 것만 조회" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "blocks: 본인 것만 추가" on public.blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "blocks: 본인 것만 해제" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

create policy "messages: 구성원만 조회, 내가 차단한 사람 제외" on public.messages
  for select to authenticated using (
    public.is_room_member(room_id)
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = messages.sender_id
    )
  );
create policy "messages: 구성원 본인 명의로만 작성" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid()) and public.is_room_member(room_id)
  );
-- 메시지 수정·개별 삭제는 첫 버전 범위 밖.

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  -- 신고 대상이 탈퇴하면 대상 정보는 비우고 신고 기록만 남긴다 (보관 범위는 법령 확인 후 확정)
  reported_user_id uuid references auth.users (id) on delete set null,
  room_id uuid references public.rooms (id) on delete set null,
  message_id bigint references public.messages (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create index reports_reporter_idx on public.reports (reporter_id);
create index reports_reported_user_idx on public.reports (reported_user_id);
create index reports_room_idx on public.reports (room_id);
create index reports_message_idx on public.reports (message_id);

alter table public.reports enable row level security;

create policy "reports: 본인 신고만 조회" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy "reports: 같은 방 구성원만 신고" on public.reports
  for insert to authenticated with check (
    reporter_id = (select auth.uid()) and room_id is not null and public.is_room_member(room_id)
  );

-- ───────────────────────── 웹 푸시 구독 (CR-008용) ─────────────────────────
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push: 본인 것만 조회" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push: 본인 것만 추가" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push: 본인 것만 삭제" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));
