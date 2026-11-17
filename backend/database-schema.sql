-- =====================================================================
-- Collabify Growth: production database schema (PostgreSQL 15+)
-- Derived from the working prototype's data collections.
-- Written for Supabase/Postgres, but portable to any Postgres host.
-- Add row-level security (RLS) policies as described in the handoff doc.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Users and roles ----------
create type user_role as enum ('owner', 'admin', 'editor', 'user');

create table profiles (
  id            uuid primary key,                 -- = auth provider user id
  email         text unique not null,
  full_name     text,
  phone         text,
  role          user_role not null default 'user',
  created_at    timestamptz not null default now()
);

-- ---------- Consent log (DPDP Act: record what was agreed, when, where) ----------
create table consent_log (
  id            bigserial primary key,
  email         text not null,
  purpose       text not null,                    -- 'enquiry_reply' | 'email_updates' | 'whatsapp_contact' | 'community' | 'affiliate' | 'partner'
  granted       boolean not null,
  source        text not null,                    -- form or page that captured it
  policy_version text not null,                   -- privacy policy version shown
  ip_hash       text,
  created_at    timestamptz not null default now()
);

-- ---------- Enquiries and sales pipeline ----------
create type pipeline_stage as enum ('New', 'Contacted', 'Proposal sent', 'Won', 'Lost');

create table enquiries (
  id              text primary key,               -- human reference, e.g. 'CG-K3F9QX2'
  name            text not null,
  email           text not null,
  phone           text,
  company         text not null,
  role            text not null,
  website         text,
  needs           text[] not null default '{}',   -- capability names, 'An integrated programme', 'Not sure yet'
  shortlist       text[] not null default '{}',   -- service names added with the shortlist
  programme       text,                           -- programme chosen in the composer, if any
  description     text not null,
  timeline        text not null,
  budget          text not null,
  source          text,                           -- 'How did you hear about us?'
  partner_ref     text,                           -- affiliate code (first touch, 90 days)
  utm             jsonb,                          -- utm_source, utm_medium, utm_campaign, landing page
  consent_updates boolean not null default false,
  consent_whatsapp boolean not null default false,
  stage           pipeline_stage not null default 'New',
  value_inr       integer,                        -- deal value set by the team
  owner_id        uuid references profiles(id),   -- team member handling it
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on enquiries (created_at desc);
create index on enquiries (stage);
create index on enquiries (partner_ref);

create table enquiry_notes (
  id            bigserial primary key,
  enquiry_id    text not null references enquiries(id) on delete cascade,
  author_id     uuid references profiles(id),
  body          text not null,
  created_at    timestamptz not null default now()
);

-- ---------- Specialist and vendor network ("Partner With Us") ----------
create table specialist_applications (
  id            text primary key,
  name          text not null,
  email         text not null,
  phone         text,
  city          text not null,
  partner_type  text not null,
  availability  text not null,
  capabilities  text[] not null default '{}',
  portfolio     text not null,
  rate          text,
  audience      text,
  status        text not null default 'new',      -- new | contacted | approved | declined
  created_at    timestamptz not null default now()
);

-- ---------- Marketplace interest (#100, planned) ----------
create table marketplace_interest (
  id            text primary key,
  name          text not null,
  email         text not null,
  company       text,
  role          text not null,
  audiences     text,
  created_at    timestamptz not null default now()
);

-- ---------- Blog ----------
create type post_status as enum ('draft', 'published');

create table posts (
  slug            text primary key,               -- locked once published
  title           text not null,
  category        text,
  author_name     text not null default 'Collabify Growth team',
  author_id       uuid references profiles(id),
  focus_keyword   text,
  seo_title       text,
  seo_description text,
  body_md         text not null,
  read_mins       integer not null default 1,
  status          post_status not null default 'draft',
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on posts (status, published_at desc);

create table redirects (                          -- keep old URLs working when slugs change
  from_path     text primary key,
  to_path       text not null,
  created_at    timestamptz not null default now()
);

-- ---------- Community (paid membership) ----------
create type application_status as enum ('pending', 'approved', 'declined', 'removed');
create type membership_status as enum ('active', 'past_due', 'cancelled', 'expired');

create table community_applications (
  user_id       uuid primary key references profiles(id) on delete cascade,
  name          text not null,
  email         text not null,
  role          text not null,
  company       text not null,
  city          text not null,
  linkedin      text,
  working_on    text not null,
  interests     text[] not null default '{}',
  plan          text not null,                    -- 'monthly' | 'annual'
  status        application_status not null default 'pending',
  created_at    timestamptz not null default now()
);

create table memberships (
  user_id               uuid primary key references profiles(id) on delete cascade,
  plan                  text not null,
  status                membership_status not null,
  razorpay_subscription_id text unique,
  current_period_end    timestamptz,
  started_at            timestamptz not null default now(),
  cancelled_at          timestamptz,
  -- public directory fields (visible to active members only)
  display_name          text not null,
  role                  text,
  company               text,
  city                  text,
  linkedin              text,
  interests             text[] not null default '{}',
  working_on            text
);

create table channels (
  id            text primary key,                 -- 'introductions', 'general', 'growth', 'tech', 'hiring', 'collabs', 'events'
  name          text not null,
  description   text not null,
  sort_order    integer not null default 0
);

create table messages (
  id            uuid primary key default gen_random_uuid(),
  channel_id    text not null references channels(id),
  user_id       uuid not null references profiles(id),
  body          text not null check (char_length(body) between 1 and 1000),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references profiles(id)
);
create index on messages (channel_id, created_at desc);

create table message_reports (                    -- members can report a message to moderators
  id            bigserial primary key,
  message_id    uuid not null references messages(id) on delete cascade,
  reporter_id   uuid not null references profiles(id),
  reason        text,
  created_at    timestamptz not null default now()
);

create table payments (                           -- written by the Razorpay webhook only
  id                    text primary key,         -- Razorpay payment id
  user_id               uuid references profiles(id),
  purpose               text not null,            -- 'community_membership'
  amount_paise          integer not null,
  currency              text not null default 'INR',
  status                text not null,
  razorpay_subscription_id text,
  raw                   jsonb not null,
  created_at            timestamptz not null default now()
);

-- ---------- Affiliate program ----------
create table affiliates (
  user_id       uuid primary key references profiles(id) on delete cascade,
  name          text not null,
  email         text not null,
  phone         text,
  city          text not null,
  share_channels text[] not null default '{}',
  audience      text not null,
  link          text,
  status        application_status not null default 'pending',
  code          text unique,                      -- set on approval, e.g. 'ROHANM829'
  payout_details jsonb,                           -- UPI or bank, collected after approval, encrypted at rest
  approved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table referral_clicks (                    -- optional analytics
  id            bigserial primary key,
  code          text not null,
  landing_path  text not null,
  ip_hash       text,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index on referral_clicks (code, created_at desc);

create type referral_status as enum ('Lead', 'Proposal sent', 'Won', 'Commission paid', 'Not converted');

create table referrals (
  enquiry_id    text primary key references enquiries(id) on delete cascade,
  code          text not null references affiliates(code),
  status        referral_status not null default 'Lead',
  commission_inr integer,
  updated_at    timestamptz not null default now()
);

create table payouts (
  id            bigserial primary key,
  affiliate_id  uuid not null references affiliates(user_id),
  amount_inr    integer not null,
  method        text not null,                    -- 'UPI' | 'Bank transfer'
  reference     text,
  paid_at       timestamptz not null default now()
);

-- ---------- White-label program ----------
create table wl_applications (
  user_id       uuid primary key references profiles(id) on delete cascade,
  company       text not null,
  name          text not null,
  email         text not null,
  phone         text,
  website       text,
  city          text not null,
  capabilities  text[] not null default '{}',
  volume        text not null,
  notes         text,
  status        application_status not null default 'pending',
  created_at    timestamptz not null default now()
);

create table wl_partners (
  user_id       uuid primary key references profiles(id) on delete cascade,
  company       text not null,
  status        text not null default 'active',   -- active | paused
  pricing_notes text,
  nda_signed_at timestamptz,
  manager_id    uuid references profiles(id),     -- Collabify partner manager
  created_at    timestamptz not null default now()
);

create type brief_status as enum ('Received', 'Scoping', 'Quoted', 'In progress', 'Delivered', 'On hold');

create table wl_briefs (
  id            text primary key,
  partner_id    uuid not null references wl_partners(user_id) on delete cascade,
  title         text not null,
  industry      text not null,
  capability    text not null,
  services      text not null,
  due_date      date,
  budget        text not null,
  details       text not null,
  branding      text,
  status        brief_status not null default 'Received',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table wl_brief_files (
  id            bigserial primary key,
  brief_id      text not null references wl_briefs(id) on delete cascade,
  storage_path  text not null,
  uploaded_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ---------- Free tools (optional server features) ----------
create table share_links (                        -- short links for media kits and invites, e.g. /c/ab12cd
  id            text primary key,
  kind          text not null,                    -- 'mediakit' | 'invite'
  payload       jsonb not null,
  created_at    timestamptz not null default now()
);

create table health_check_results (               -- saved only when a visitor asks to discuss results
  id            bigserial primary key,
  enquiry_id    text references enquiries(id) on delete set null,
  answers       smallint[] not null,
  total_score   smallint not null,
  created_at    timestamptz not null default now()
);

-- ---------- Seed data ----------
insert into channels (id, name, description, sort_order) values
  ('introductions', 'Introductions', 'Say hello: who you are, what you’re building and what you need.', 1),
  ('general', 'General', 'Anything that doesn’t fit somewhere else.', 2),
  ('growth', 'Marketing & growth', 'Brand, campaigns, content and distribution.', 3),
  ('tech', 'Tech & product', 'Websites, apps, AI and the tools you use.', 4),
  ('hiring', 'Hiring & talent', 'Open roles, referrals and freelancers.', 5),
  ('collabs', 'Collaborations', 'Partnerships, co-marketing and joint projects.', 6),
  ('events', 'Events & meetups', 'Meetups, conferences and things worth attending.', 7);
