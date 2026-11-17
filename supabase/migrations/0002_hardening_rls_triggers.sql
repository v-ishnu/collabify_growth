-- =====================================================================
-- Collabify Growth: Hardening, Triggers, Audit Log, Webhooks, RLS, Storage
-- =====================================================================

-- ---------- 1. Additive schema refinements on base tables ----------
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

do $$ begin
  alter table share_links
    add constraint share_links_kind_chk check (kind in ('mediakit', 'invite'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table payouts
    add constraint payouts_amount_positive_chk check (amount_inr > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table payments
    add constraint payments_amount_nonneg_chk check (amount_paise >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table wl_brief_files
    add constraint wl_brief_files_size_chk check (byte_size is null or (byte_size > 0 and byte_size <= 10485760));
exception when duplicate_object then null; end $$;

-- ---------- 2. Additional query performance indexes ----------
create index if not exists enquiries_email_idx on enquiries (email);
create index if not exists enquiries_updated_idx on enquiries (updated_at desc);
create index if not exists enquiry_notes_enquiry_idx on enquiry_notes (enquiry_id, created_at asc);
create index if not exists posts_category_idx on posts (category);
create index if not exists community_apps_status_idx on community_applications (status, created_at desc);
create index if not exists memberships_status_idx on memberships (status);
create index if not exists payments_user_idx on payments (user_id, created_at desc);
create index if not exists payments_sub_idx on payments (razorpay_subscription_id);
create index if not exists affiliates_status_code_idx on affiliates (status, code);
create index if not exists referrals_code_status_idx on referrals (code, status);
create index if not exists payouts_affiliate_paid_idx on payouts (affiliate_id, paid_at desc);
create index if not exists wl_apps_status_idx on wl_applications (status, created_at desc);
create index if not exists wl_briefs_partner_updated_idx on wl_briefs (partner_id, updated_at desc);
create index if not exists wl_brief_files_brief_idx on wl_brief_files (brief_id);

-- ---------- 3. Audit log & Idempotent Webhook events ----------
create table if not exists audit_logs (
  id          bigserial primary key,
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);

create table if not exists webhook_events (
  id           bigserial primary key,
  provider     text not null,
  event_id     text not null,
  event_type   text not null,
  payload      jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- ---------- 4. Updated-at triggers & Auth profile sync ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_enquiries_updated_at on enquiries;
create trigger trg_enquiries_updated_at
  before update on enquiries
  for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on posts;
create trigger trg_posts_updated_at
  before update on posts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_referrals_updated_at on referrals;
create trigger trg_referrals_updated_at
  before update on referrals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wl_briefs_updated_at on wl_briefs;
create trigger trg_wl_briefs_updated_at
  before update on wl_briefs
  for each row execute function public.set_updated_at();

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

-- ---------- 5. Security-definer role & membership helpers ----------
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('owner', 'admin', 'editor'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('owner', 'admin'), false);
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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
  select exists (
    select 1 from public.wl_partners p
    where p.user_id = auth.uid()
      and p.status = 'active'
  );
$$;

-- ---------- 6. Enable RLS on all 26 tables ----------
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

-- ---------- 7. Explicit RLS policies ----------

-- profiles: user can read/update own name & phone (not role); staff can read all; admin manages roles
drop policy if exists profiles_select_own_or_staff on profiles;
create policy profiles_select_own_or_staff on profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_own_safe on profiles;
create policy profiles_update_own_safe on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_user_role()
  );

drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- consent_log: insert by API/service_role or anon via API; staff read
drop policy if exists consent_log_staff_read on consent_log;
create policy consent_log_staff_read on consent_log
  for select using (public.is_staff());

-- enquiries & notes: staff read/update; admin delete
drop policy if exists enquiries_staff_read_update on enquiries;
create policy enquiries_staff_read_update on enquiries
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

-- specialist_applications & marketplace_interest: staff read/update
drop policy if exists specialists_staff_all on specialist_applications;
create policy specialists_staff_all on specialist_applications
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists marketplace_staff_all on marketplace_interest;
create policy marketplace_staff_all on marketplace_interest
  for all using (public.is_staff()) with check (public.is_staff());

-- posts & redirects: public read published posts & redirects; staff manage all
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

-- community_applications: own read/insert; staff read/update
drop policy if exists comm_apps_own_select on community_applications;
create policy comm_apps_own_select on community_applications
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists comm_apps_own_insert on community_applications;
create policy comm_apps_own_insert on community_applications
  for insert with check (user_id = auth.uid());

drop policy if exists comm_apps_staff_update on community_applications;
create policy comm_apps_staff_update on community_applications
  for update using (public.is_staff()) with check (public.is_staff());

-- memberships: active members see directory; user sees own; staff sees/updates
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

-- channels: active members or staff can read
drop policy if exists channels_member_read on channels;
create policy channels_member_read on channels
  for select using (public.is_active_member() or public.is_staff());

-- messages: active members read non-deleted & insert own; author or staff soft-delete
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

-- message_reports: active members insert own; staff manage
drop policy if exists message_reports_member_insert on message_reports;
create policy message_reports_member_insert on message_reports
  for insert with check (reporter_id = auth.uid() and public.is_active_member());

drop policy if exists message_reports_staff_all on message_reports;
create policy message_reports_staff_all on message_reports
  for all using (public.is_staff()) with check (public.is_staff());

-- payments: user sees own; admin sees all (mutations only via service_role webhooks)
drop policy if exists payments_own_or_admin_read on payments;
create policy payments_own_or_admin_read on payments
  for select using (user_id = auth.uid() or public.is_admin());

-- affiliates, clicks, referrals, payouts
drop policy if exists affiliates_own_or_staff_read on affiliates;
create policy affiliates_own_or_staff_read on affiliates
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists affiliates_own_insert on affiliates;
create policy affiliates_own_insert on affiliates
  for insert with check (user_id = auth.uid());

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
  for insert with check (user_id = auth.uid());

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

-- free tools: share_links readable publicly (opaque ID), health_check_results staff only
drop policy if exists share_links_public_read on share_links;
create policy share_links_public_read on share_links
  for select using (true);

drop policy if exists health_check_staff_read on health_check_results;
create policy health_check_staff_read on health_check_results
  for select using (public.is_staff());

-- audit_logs: admin read only (writes via service_role)
drop policy if exists audit_logs_admin_read on audit_logs;
create policy audit_logs_admin_read on audit_logs
  for select using (public.is_admin());

-- webhook_events: service_role only (no client policies)

-- ---------- 8. Supabase Realtime publication for community chat ----------
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
          when undefined_object then null;
end $$;

-- ---------- 9. Supabase Storage buckets & policies ----------
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
