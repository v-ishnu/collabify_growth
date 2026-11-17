-- =====================================================================
-- Collabify Growth: Production Hardening
-- Account Suspension, Self-Update Guards, Two-Phase Webhook Idempotency,
-- and Atomic Multi-Table Transactions
-- =====================================================================

-- ---------- 1. Account suspension & profile update tracking ----------
alter table profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_suspended_idx
  on profiles (is_suspended)
  where is_suspended = true;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_suspended_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_suspended from public.profiles p where p.id = auth.uid()), false);
$$;

-- Tighten RLS helper functions so suspended users lose all privileged & portal access immediately
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

-- Prevent a user from unsuspending themselves or altering suspension metadata directly
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

-- ---------- 2. Two-phase Webhook Idempotency status tracking ----------
alter table webhook_events
  add column if not exists status text not null default 'processed',
  add column if not exists error_message text;

do $$ begin
  alter table webhook_events
    add constraint webhook_events_status_chk
    check (status in ('processing', 'processed', 'failed'));
exception when duplicate_object then null; end $$;

create index if not exists webhook_events_status_idx
  on webhook_events (provider, status, processed_at desc);

-- ---------- 3. Atomic multi-table enquiry transaction RPC ----------
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

  insert into public.consent_log (email, purpose, granted, source, policy_version, ip_hash)
  values (v_email, 'enquiry_reply', true, '/start-a-project', p_policy_version, p_ip_hash);

  if coalesce(p_consent_updates, false) then
    insert into public.consent_log (email, purpose, granted, source, policy_version, ip_hash)
    values (v_email, 'email_updates', true, '/start-a-project', p_policy_version, p_ip_hash);
  end if;

  if coalesce(p_consent_whatsapp, false) then
    insert into public.consent_log (email, purpose, granted, source, policy_version, ip_hash)
    values (v_email, 'whatsapp_contact', true, '/start-a-project', p_policy_version, p_ip_hash);
  end if;

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

