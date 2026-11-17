-- =====================================================================
-- Collabify Growth: Complete Production PostgreSQL Schema & Hardening
-- Single-file consolidated idempotent migration for Supabase / PostgreSQL 15+
--
-- How to apply:
-- 1. Open Supabase Dashboard -> Project -> SQL Editor -> New Query
-- 2. Paste this entire file and click "Run"
--
-- This script is 100% idempotent and safe to run on blank or existing databases.
-- =====================================================================

-- ---------- 0. EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ---------- 1. ENUM TYPES ----------
do $$ begin
  create type user_role as enum ('owner', 'admin', 'editor', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pipeline_stage as enum ('New', 'Contacted', 'Proposal sent', 'Won', 'Lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('pending', 'approved', 'declined', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type membership_status as enum ('active', 'past_due', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type referral_status as enum ('Lead', 'Proposal sent', 'Won', 'Commission paid', 'Not converted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type brief_status as enum ('Received', 'Scoping', 'Quoted', 'In progress', 'Delivered', 'On hold');
exception when duplicate_object then null; end $$;

-- ---------- 2. TABLES DEFINITIONS ----------

-- 1. profiles: auth user profile & RBAC
create table if not exists profiles (
  id                uuid primary key,
  email             text unique not null,
  full_name         text,
  phone             text,
  role              user_role not null default 'user',
  is_suspended      boolean not null default false,
  suspended_at      timestamptz,
  suspended_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 2. consent_log: DPDP Act compliance audit
create table if not exists consent_log (
  id                bigserial primary key,
  email             text not null,
  purpose           text not null,
  granted           boolean not null,
  source            text not null,
  policy_version    text not null,
  ip_hash           text,
  created_at        timestamptz not null default now()
);

-- 3. enquiries: project intake & sales pipeline
create table if not exists enquiries (
  id                text primary key,
  name              text not null,
  email             text not null,
  phone             text,
  company           text not null,
  role              text not null,
  website           text,
  needs             text[] not null default '{}',
  shortlist         text[] not null default '{}',
  programme         text,
  description       text not null,
  timeline          text not null,
  budget            text not null,
  source            text,
  partner_ref       text,
  utm               jsonb,
  consent_updates   boolean not null default false,
  consent_whatsapp  boolean not null default false,
  stage             pipeline_stage not null default 'New',
  value_inr         integer,
  owner_id          uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 4. enquiry_notes: internal team notes on deals
create table if not exists enquiry_notes (
  id                bigserial primary key,
  enquiry_id        text not null references enquiries(id) on delete cascade,
  author_id         uuid references profiles(id),
  body              text not null,
  created_at        timestamptz not null default now()
);

-- 5. specialist_applications: partner network ("Partner With Us")
create table if not exists specialist_applications (
  id                text primary key,
  name              text not null,
  email             text not null,
  phone             text,
  city              text not null,
  partner_type      text not null,
  availability      text not null,
  capabilities      text[] not null default '{}',
  portfolio         text not null,
  rate              text,
  audience          text,
  status            text not null default 'new',
  created_at        timestamptz not null default now()
);

-- 6. marketplace_interest: waitlist registrations
create table if not exists marketplace_interest (
  id                text primary key,
  name              text not null,
  email             text not null,
  company           text,
  role              text not null,
  audiences         text,
  status            text not null default 'new',
  created_at        timestamptz not null default now()
);

-- 7. posts: editorial insights & blog
create table if not exists posts (
  slug              text primary key,
  title             text not null,
  category          text,
  author_name       text not null default 'Collabify Growth team',
  author_id         uuid references profiles(id),
  focus_keyword     text,
  seo_title         text,
  seo_description   text,
  body_md           text not null,
  read_mins         integer not null default 1,
  status            post_status not null default 'draft',
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 8. redirects: 301/302 URL redirects
create table if not exists redirects (
  from_path         text primary key,
  to_path           text not null,
  status            smallint not null default 301,
  created_at        timestamptz not null default now()
);

-- 9. community_applications: founder community review intake
create table if not exists community_applications (
  user_id           uuid primary key references profiles(id) on delete cascade,
  name              text not null,
  email             text not null,
  role              text not null,
  company           text not null,
  city              text not null,
  linkedin          text,
  working_on        text not null,
  interests         text[] not null default '{}',
  plan              text not null,
  status            application_status not null default 'pending',
  created_at        timestamptz not null default now()
);

-- 10. memberships: active founder community subscriptions
create table if not exists memberships (
  user_id                   uuid primary key references profiles(id) on delete cascade,
  plan                      text not null,
  status                    membership_status not null,
  razorpay_subscription_id text unique,
  current_period_end        timestamptz,
  started_at                timestamptz not null default now(),
  cancelled_at              timestamptz,
  display_name              text not null,
  role                      text,
  company                   text,
  city                      text,
  linkedin                  text,
  interests                 text[] not null default '{}',
  working_on                text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- 11. channels: community discussion spaces
create table if not exists channels (
  id                text primary key,
  name              text not null,
  description       text not null,
  sort_order        integer not null default 0
);

-- 12. messages: community chat stream
create table if not exists messages (
  id                uuid primary key default gen_random_uuid(),
  channel_id        text not null references channels(id),
  user_id           uuid not null references profiles(id),
  body              text not null check (char_length(body) between 1 and 1000),
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  deleted_by        uuid references profiles(id)
);

-- 13. message_reports: moderation reporting
create table if not exists message_reports (
  id                bigserial primary key,
  message_id        uuid not null references messages(id) on delete cascade,
  reporter_id       uuid not null references profiles(id),
  reason            text,
  resolved          boolean not null default false,
  resolved_by       uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

-- 14. payments: Razorpay transaction ledger
create table if not exists payments (
  id                        text primary key,
  user_id                   uuid references profiles(id),
  purpose                   text not null,
  amount_paise              integer not null check (amount_paise >= 0),
  currency                  text not null default 'INR',
  status                    text not null,
  razorpay_subscription_id text,
  raw                       jsonb not null,
  created_at                timestamptz not null default now()
);

-- 15. affiliates: partner affiliate program
create table if not exists affiliates (
  user_id           uuid primary key references profiles(id) on delete cascade,
  name              text not null,
  email             text not null,
  phone             text,
  city              text not null,
  share_channels    text[] not null default '{}',
  audience          text not null,
  link              text,
  status            application_status not null default 'pending',
  code              text unique,
  payout_details    jsonb,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 16. referral_clicks: affiliate traffic telemetry
create table if not exists referral_clicks (
  id                bigserial primary key,
  code              text not null,
  landing_path      text not null,
  ip_hash           text,
  user_agent        text,
  created_at        timestamptz not null default now()
);

-- 17. referrals: affiliate referral conversions
create table if not exists referrals (
  enquiry_id        text primary key references enquiries(id) on delete cascade,
  code              text not null references affiliates(code),
  status            referral_status not null default 'Lead',
  commission_inr    integer,
  updated_at        timestamptz not null default now()
);

-- 18. payouts: affiliate payout records
create table if not exists payouts (
  id                bigserial primary key,
  affiliate_id      uuid not null references affiliates(user_id),
  amount_inr        integer not null check (amount_inr > 0),
  method            text not null,
  reference         text,
  paid_at           timestamptz not null default now()
);

-- 19. wl_applications: white-label agency partner applications
create table if not exists wl_applications (
  user_id           uuid primary key references profiles(id) on delete cascade,
  company           text not null,
  name              text not null,
  email             text not null,
  phone             text,
  website           text,
  city              text not null,
  capabilities      text[] not null default '{}',
  volume            text not null,
  notes             text,
  nda_agreed        boolean not null default false,
  nda_agreed_at     timestamptz,
  status            application_status not null default 'pending',
  created_at        timestamptz not null default now()
);

-- 20. wl_partners: active approved white-label agency accounts
create table if not exists wl_partners (
  user_id           uuid primary key references profiles(id) on delete cascade,
  company           text not null,
  status            text not null default 'active',
  pricing_notes     text,
  nda_signed_at     timestamptz,
  manager_id        uuid references profiles(id),
  created_at        timestamptz not null default now()
);

-- 21. wl_briefs: white-label client briefs
create table if not exists wl_briefs (
  id                text primary key,
  partner_id        uuid not null references wl_partners(user_id) on delete cascade,
  title             text not null,
  industry          text not null,
  capability        text not null,
  services          text not null,
  due_date          date,
  budget            text not null,
  details           text not null,
  branding          text,
  status            brief_status not null default 'Received',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 22. wl_brief_files: client assets uploaded for briefs
create table if not exists wl_brief_files (
  id                bigserial primary key,
  brief_id          text not null references wl_briefs(id) on delete cascade,
  storage_path      text not null,
  uploaded_by       uuid references profiles(id),
  file_name         text,
  mime_type         text,
  byte_size         integer check (byte_size is null or (byte_size > 0 and byte_size <= 10485760)),
  created_at        timestamptz not null default now()
);

-- 23. share_links: public links for tools (Media Kits, Invites)
create table if not exists share_links (
  id                text primary key,
  kind              text not null check (kind in ('mediakit', 'invite')),
  payload           jsonb not null,
  created_at        timestamptz not null default now()
);

-- 24. health_check_results: growth quiz responses
create table if not exists health_check_results (
  id                bigserial primary key,
  enquiry_id        text references enquiries(id) on delete set null,
  answers           integer[] not null,
  total_score       integer not null,
  created_at        timestamptz not null default now()
);

-- 25. audit_logs: administrative security audit trail
create table if not exists audit_logs (
  id                bigserial primary key,
  actor_id          uuid references profiles(id) on delete set null,
  action            text not null,
  entity_type       text not null,
  entity_id         text,
  details           jsonb not null default '{}'::jsonb,
  ip_hash           text,
  created_at        timestamptz not null default now()
);

-- 26. webhook_events: two-phase webhook idempotency records
create table if not exists webhook_events (
  id                bigserial primary key,
  provider          text not null,
  event_id          text not null,
  event_type        text not null,
  payload           jsonb not null default '{}'::jsonb,
  processed_at      timestamptz not null default now(),
  status            text not null default 'processed' check (status in ('processing', 'processed', 'failed')),
  error_message     text,
  unique (provider, event_id)
);

-- ---------- 3. COLUMN REFINEMENTS ON EXISTING TABLES ----------
alter table profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table redirects
  add column if not exists status smallint not null default 301;

alter table message_reports
  add column if not exists resolved boolean not null default false,
  add column if not exists resolved_by uuid references profiles(id) on delete set null;

alter table wl_applications
  add column if not exists nda_agreed boolean not null default false,
  add column if not exists nda_agreed_at timestamptz;

alter table wl_brief_files
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists byte_size integer;

alter table marketplace_interest
  add column if not exists status text not null default 'new';

alter table webhook_events
  add column if not exists status text not null default 'processed',
  add column if not exists error_message text;

alter table memberships
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table affiliates
  add column if not exists updated_at timestamptz not null default now();

-- ---------- 4. PERFORMANCE & QUERY INDEXES ----------
create index if not exists profiles_suspended_idx on profiles (is_suspended) where is_suspended = true;
create index if not exists enquiries_created_idx on enquiries (created_at desc);
create index if not exists enquiries_email_idx on enquiries (email);
create index if not exists enquiries_stage_idx on enquiries (stage);
create index if not exists enquiries_partner_idx on enquiries (partner_ref);
create index if not exists enquiries_updated_idx on enquiries (updated_at desc);
create index if not exists enquiry_notes_enquiry_idx on enquiry_notes (enquiry_id, created_at asc);
create index if not exists posts_status_pub_idx on posts (status, published_at desc);
create index if not exists posts_category_idx on posts (category);
create index if not exists community_apps_status_idx on community_applications (status, created_at desc);
create index if not exists memberships_status_idx on memberships (status);
create index if not exists messages_channel_created_idx on messages (channel_id, created_at desc);
create index if not exists payments_user_idx on payments (user_id, created_at desc);
create index if not exists payments_sub_idx on payments (razorpay_subscription_id);
create index if not exists affiliates_status_code_idx on affiliates (status, code);
create index if not exists referral_clicks_code_idx on referral_clicks (code, created_at desc);
create index if not exists referrals_code_status_idx on referrals (code, status);
create index if not exists payouts_affiliate_paid_idx on payouts (affiliate_id, paid_at desc);
create index if not exists wl_apps_status_idx on wl_applications (status, created_at desc);
create index if not exists wl_briefs_partner_updated_idx on wl_briefs (partner_id, updated_at desc);
create index if not exists wl_brief_files_brief_idx on wl_brief_files (brief_id);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);
create index if not exists webhook_events_status_idx on webhook_events (provider, status, processed_at desc);

-- ---------- 5. TRIGGERS & AUTOMATION ----------

-- Automatic updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_enquiries_updated_at on enquiries;
create trigger trg_enquiries_updated_at
  before update on enquiries
  for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on posts;
create trigger trg_posts_updated_at
  before update on posts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_memberships_updated_at on memberships;
create trigger trg_memberships_updated_at
  before update on memberships
  for each row execute function public.set_updated_at();

drop trigger if exists trg_affiliates_updated_at on affiliates;
create trigger trg_affiliates_updated_at
  before update on affiliates
  for each row execute function public.set_updated_at();

drop trigger if exists trg_referrals_updated_at on referrals;
create trigger trg_referrals_updated_at
  before update on referrals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wl_briefs_updated_at on wl_briefs;
create trigger trg_wl_briefs_updated_at
  before update on wl_briefs
  for each row execute function public.set_updated_at();

-- Supabase auth.users profile sync trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', null),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
exception when others then null; end $$;

-- ---------- 6. SECURITY-DEFINER ROLE & MEMBERSHIP HELPERS ----------

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_suspended_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_suspended from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('owner', 'admin', 'editor'), false)
     and not public.is_suspended_user();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('owner', 'admin'), false)
     and not public.is_suspended_user();
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.is_suspended_user()
     and exists (
       select 1 from public.memberships m
       where m.user_id = auth.uid()
         and m.status = 'active'
         and (m.current_period_end is null or m.current_period_end > now())
     );
$$;

create or replace function public.is_active_wl_partner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.is_suspended_user()
     and exists (
       select 1 from public.wl_partners p
       where p.user_id = auth.uid()
         and p.status = 'active'
     );
$$;

-- ---------- 7. ROW LEVEL SECURITY POLICIES ----------

alter table profiles enable row level security;
alter table consent_log enable row level security;
alter table enquiries enable row level security;
alter table enquiry_notes enable row level security;
alter table specialist_applications enable row level security;
alter table marketplace_interest enable row level security;
alter table posts enable row level security;
alter table redirects enable row level security;
alter table community_applications enable row level security;
alter table memberships enable row level security;
alter table channels enable row level security;
alter table messages enable row level security;
alter table message_reports enable row level security;
alter table payments enable row level security;
alter table affiliates enable row level security;
alter table referral_clicks enable row level security;
alter table referrals enable row level security;
alter table payouts enable row level security;
alter table wl_applications enable row level security;
alter table wl_partners enable row level security;
alter table wl_briefs enable row level security;
alter table wl_brief_files enable row level security;
alter table share_links enable row level security;
alter table health_check_results enable row level security;
alter table audit_logs enable row level security;
alter table webhook_events enable row level security;

-- profiles
drop policy if exists profiles_select_own_or_staff on profiles;
create policy profiles_select_own_or_staff on profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_own_safe on profiles;
create policy profiles_update_own_safe on profiles
  for update using (id = auth.uid() and not public.is_suspended_user())
  with check (
    id = auth.uid()
    and role = public.current_user_role()
    and is_suspended = public.is_suspended_user()
    and suspended_at is not distinct from (select p.suspended_at from public.profiles p where p.id = auth.uid())
    and suspended_reason is not distinct from (select p.suspended_reason from public.profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- consent_log
drop policy if exists consent_log_staff_read on consent_log;
create policy consent_log_staff_read on consent_log
  for select using (public.is_staff());

-- enquiries & notes
drop policy if exists enquiries_staff_read on enquiries;
create policy enquiries_staff_read on enquiries
  for select using (public.is_staff());

drop policy if exists enquiries_staff_update on enquiries;
create policy enquiries_staff_update on enquiries
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists enquiries_admin_delete on enquiries;
create policy enquiries_admin_delete on enquiries
  for delete using (public.is_admin());

drop policy if exists enquiry_notes_staff_all on enquiry_notes;
create policy enquiry_notes_staff_all on enquiry_notes
  for all using (public.is_staff()) with check (public.is_staff());

-- specialist_applications & marketplace_interest
drop policy if exists specialists_staff_all on specialist_applications;
create policy specialists_staff_all on specialist_applications
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists marketplace_staff_all on marketplace_interest;
create policy marketplace_staff_all on marketplace_interest
  for all using (public.is_staff()) with check (public.is_staff());

-- posts & redirects
drop policy if exists posts_public_published on posts;
create policy posts_public_published on posts
  for select using (status = 'published' or public.is_staff());

drop policy if exists posts_staff_manage on posts;
create policy posts_staff_manage on posts
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists redirects_public_read on redirects;
create policy redirects_public_read on redirects
  for select using (true);

drop policy if exists redirects_staff_manage on redirects;
create policy redirects_staff_manage on redirects
  for all using (public.is_staff()) with check (public.is_staff());

-- community_applications
drop policy if exists comm_apps_own_select on community_applications;
create policy comm_apps_own_select on community_applications
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists comm_apps_own_insert on community_applications;
create policy comm_apps_own_insert on community_applications
  for insert with check (user_id = auth.uid() and not public.is_suspended_user());

drop policy if exists comm_apps_staff_update on community_applications;
create policy comm_apps_staff_update on community_applications
  for update using (public.is_staff()) with check (public.is_staff());

-- memberships
drop policy if exists memberships_select_active_or_own on memberships;
create policy memberships_select_active_or_own on memberships
  for select using (
    user_id = auth.uid()
    or (status = 'active' and public.is_active_member())
    or public.is_staff()
  );

drop policy if exists memberships_staff_update on memberships;
create policy memberships_staff_update on memberships
  for update using (public.is_staff()) with check (public.is_staff());

-- channels
drop policy if exists channels_member_read on channels;
create policy channels_member_read on channels
  for select using (public.is_active_member() or public.is_staff());

-- messages
drop policy if exists messages_member_read on messages;
create policy messages_member_read on messages
  for select using (
    (deleted_at is null and public.is_active_member())
    or public.is_staff()
  );

drop policy if exists messages_member_insert on messages;
create policy messages_member_insert on messages
  for insert with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists messages_author_or_staff_update on messages;
create policy messages_author_or_staff_update on messages
  for update using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

-- message_reports
drop policy if exists message_reports_member_insert on message_reports;
create policy message_reports_member_insert on message_reports
  for insert with check (reporter_id = auth.uid() and public.is_active_member());

drop policy if exists message_reports_staff_all on message_reports;
create policy message_reports_staff_all on message_reports
  for all using (public.is_staff()) with check (public.is_staff());

-- payments
drop policy if exists payments_own_or_admin_read on payments;
create policy payments_own_or_admin_read on payments
  for select using (user_id = auth.uid() or public.is_admin());

-- affiliates, clicks, referrals, payouts
drop policy if exists affiliates_own_or_staff_read on affiliates;
create policy affiliates_own_or_staff_read on affiliates
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists affiliates_own_insert on affiliates;
create policy affiliates_own_insert on affiliates
  for insert with check (user_id = auth.uid() and not public.is_suspended_user());

drop policy if exists affiliates_staff_update on affiliates;
create policy affiliates_staff_update on affiliates
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists referral_clicks_own_or_staff_read on referral_clicks;
create policy referral_clicks_own_or_staff_read on referral_clicks
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.affiliates a
      where a.user_id = auth.uid() and a.code = referral_clicks.code
    )
  );

drop policy if exists referrals_own_or_staff_read on referrals;
create policy referrals_own_or_staff_read on referrals
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.affiliates a
      where a.user_id = auth.uid() and a.code = referrals.code
    )
  );

drop policy if exists referrals_staff_manage on referrals;
create policy referrals_staff_manage on referrals
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists payouts_own_or_staff_read on payouts;
create policy payouts_own_or_staff_read on payouts
  for select using (affiliate_id = auth.uid() or public.is_staff());

drop policy if exists payouts_admin_insert on payouts;
create policy payouts_admin_insert on payouts
  for insert with check (public.is_admin());

-- white-label tables
drop policy if exists wl_apps_own_or_staff_read on wl_applications;
create policy wl_apps_own_or_staff_read on wl_applications
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists wl_apps_own_insert on wl_applications;
create policy wl_apps_own_insert on wl_applications
  for insert with check (user_id = auth.uid() and not public.is_suspended_user());

drop policy if exists wl_apps_staff_update on wl_applications;
create policy wl_apps_staff_update on wl_applications
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists wl_partners_own_or_staff_read on wl_partners;
create policy wl_partners_own_or_staff_read on wl_partners
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists wl_partners_staff_manage on wl_partners;
create policy wl_partners_staff_manage on wl_partners
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists wl_briefs_partner_or_staff_read on wl_briefs;
create policy wl_briefs_partner_or_staff_read on wl_briefs
  for select using (partner_id = auth.uid() or public.is_staff());

drop policy if exists wl_briefs_partner_insert on wl_briefs;
create policy wl_briefs_partner_insert on wl_briefs
  for insert with check (partner_id = auth.uid() and public.is_active_wl_partner());

drop policy if exists wl_briefs_staff_update on wl_briefs;
create policy wl_briefs_staff_update on wl_briefs
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists wl_brief_files_partner_or_staff_read on wl_brief_files;
create policy wl_brief_files_partner_or_staff_read on wl_brief_files
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.wl_briefs b
      where b.id = wl_brief_files.brief_id and b.partner_id = auth.uid()
    )
  );

drop policy if exists wl_brief_files_partner_insert on wl_brief_files;
create policy wl_brief_files_partner_insert on wl_brief_files
  for insert with check (
    uploaded_by = auth.uid()
    and public.is_active_wl_partner()
    and exists (
      select 1 from public.wl_briefs b
      where b.id = wl_brief_files.brief_id and b.partner_id = auth.uid()
    )
  );

-- free tools
drop policy if exists share_links_public_read on share_links;
create policy share_links_public_read on share_links
  for select using (true);

drop policy if exists health_check_staff_read on health_check_results;
create policy health_check_staff_read on health_check_results
  for select using (public.is_staff());

-- audit_logs
drop policy if exists audit_logs_admin_read on audit_logs;
create policy audit_logs_admin_read on audit_logs
  for select using (public.is_admin());

-- ---------- 8. ATOMIC ENQUIRY TRANSACTION RPC ----------

create or replace function public.create_enquiry_atomic(
  p_id text,
  p_name text,
  p_email text,
  p_phone text,
  p_company text,
  p_role text,
  p_website text,
  p_needs text[],
  p_shortlist text[],
  p_programme text,
  p_description text,
  p_timeline text,
  p_budget text,
  p_source text,
  p_partner_ref text,
  p_utm jsonb,
  p_consent_updates boolean,
  p_consent_whatsapp boolean,
  p_policy_version text,
  p_ip_hash text,
  p_health_check_answers int[] default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_aff_code text;
  v_total_score int;
begin
  -- 1. Insert enquiry deal row
  insert into public.enquiries (
    id, name, email, phone, company, role, website,
    needs, shortlist, programme, description, timeline, budget,
    source, partner_ref, utm, consent_updates, consent_whatsapp, stage
  ) values (
    p_id, p_name, v_email, p_phone, p_company, p_role, p_website,
    coalesce(p_needs, '{}'), coalesce(p_shortlist, '{}'), p_programme,
    p_description, p_timeline, p_budget, p_source, p_partner_ref,
    p_utm, coalesce(p_consent_updates, false), coalesce(p_consent_whatsapp, false), 'New'
  );

  -- 2. Insert primary consent record
  insert into public.consent_log (email, purpose, granted, source, policy_version, ip_hash)
  values (v_email, 'enquiry_reply', true, '/start-a-project', p_policy_version, p_ip_hash);

  -- 3. Insert optional email updates consent
  if coalesce(p_consent_updates, false) then
    insert into public.consent_log (email, purpose, granted, source, policy_version, ip_hash)
    values (v_email, 'email_updates', true, '/start-a-project', p_policy_version, p_ip_hash);
  end if;

  -- 4. Insert optional WhatsApp contact consent
  if coalesce(p_consent_whatsapp, false) then
    insert into public.consent_log (email, purpose, granted, source, policy_version, ip_hash)
    values (v_email, 'whatsapp_contact', true, '/start-a-project', p_policy_version, p_ip_hash);
  end if;

  -- 5. Link affiliate referral if valid approved code provided
  if p_partner_ref is not null and length(trim(p_partner_ref)) > 0 then
    select a.code into v_aff_code
    from public.affiliates a
    where a.code = upper(trim(p_partner_ref))
      and a.status = 'approved'
    limit 1;

    if v_aff_code is not null then
      insert into public.referrals (enquiry_id, code, status)
      values (p_id, v_aff_code, 'Lead')
      on conflict (enquiry_id) do nothing;
    end if;
  end if;

  -- 6. Link growth health check quiz results if provided
  if p_health_check_answers is not null and cardinality(p_health_check_answers) > 0 then
    select coalesce(sum(val), 0)::int into v_total_score
    from unnest(p_health_check_answers) as val;

    insert into public.health_check_results (enquiry_id, answers, total_score)
    values (p_id, p_health_check_answers, v_total_score);
  end if;

  return p_id;
end;
$$;

revoke execute on function public.create_enquiry_atomic(
  text, text, text, text, text, text, text, text[], text[], text,
  text, text, text, text, text, jsonb, boolean, boolean, text, text, int[]
) from public, anon, authenticated;

grant execute on function public.create_enquiry_atomic(
  text, text, text, text, text, text, text, text[], text[], text,
  text, text, text, text, text, jsonb, boolean, boolean, text, text, int[]
) to service_role, postgres;

-- ---------- 9. REALTIME PUBLICATION ----------
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
          when undefined_object then null;
end $$;

-- ---------- 10. STORAGE BUCKETS & POLICIES ----------
do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('blog-media', 'blog-media', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']),
    ('wl-briefs', 'wl-briefs', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/zip'])
  on conflict (id) do nothing;

  drop policy if exists blog_media_public_read on storage.objects;
  create policy blog_media_public_read on storage.objects
    for select using (bucket_id = 'blog-media');

  drop policy if exists blog_media_staff_insert on storage.objects;
  create policy blog_media_staff_insert on storage.objects
    for insert with check (bucket_id = 'blog-media' and public.is_staff());

  drop policy if exists wl_briefs_partner_or_staff_read on storage.objects;
  create policy wl_briefs_partner_or_staff_read on storage.objects
    for select using (
      bucket_id = 'wl-briefs'
      and (public.is_staff() or (storage.foldername(name))[1] = auth.uid()::text)
    );

  drop policy if exists wl_briefs_partner_insert on storage.objects;
  create policy wl_briefs_partner_insert on storage.objects
    for insert with check (
      bucket_id = 'wl-briefs'
      and public.is_active_wl_partner()
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when undefined_table then null;
          when others then null;
end $$;

-- ---------- 11. SEED DATA ----------
insert into channels (id, name, description, sort_order) values
  ('introductions', 'Introductions', 'Say hello: who you are, what you’re building and what you need.', 1),
  ('general', 'General', 'Anything that doesn’t fit somewhere else.', 2),
  ('growth', 'Marketing & growth', 'Brand, campaigns, content and distribution.', 3),
  ('tech', 'Tech & product', 'Websites, apps, AI and the tools you use.', 4),
  ('hiring', 'Hiring & talent', 'Open roles, referrals and freelancers.', 5),
  ('collabs', 'Collaborations', 'Partnerships, co-marketing and joint projects.', 6),
  ('events', 'Events & meetups', 'Meetups, conferences and things worth attending.', 7)
on conflict (id) do nothing;

-- =====================================================================
-- End of Complete Production Schema
-- =====================================================================

