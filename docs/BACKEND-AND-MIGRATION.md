# Backend Schema & Production Migration Guide

This document analyzes [`backend/database-schema.sql`](../backend/database-schema.sql), [`backend/.env.example`](../backend/.env.example), and the migration path from the prototype's `window.claude.use(...)` collections in [`website-prototype/index.html`](../website-prototype/index.html) to the target Next.js + Supabase + Razorpay production architecture specified in [`01-DEVELOPER-HANDOFF.md`](../01-DEVELOPER-HANDOFF.md).

---

## 1. PostgreSQL Schema Overview (`backend/database-schema.sql`)

Target engine: **PostgreSQL 15+** (written for Supabase, portable to standard Postgres) with `pgcrypto` enabled (`L8`).

- **Enum Types:** `7`
- **Tables:** `24`
- **Secondary Indexes:** `6`
- **Seed Data:** `7` community channels in `channels` (`L319–326`)

### 1.1 Enum Types

| Enum | Values | Used By |
| --- | --- | --- |
| `user_role` | `'owner'`, `'admin'`, `'editor'`, `'user'` | `profiles.role` |
| `pipeline_stage` | `'New'`, `'Contacted'`, `'Proposal sent'`, `'Won'`, `'Lost'` | `enquiries.stage` |
| `post_status` | `'draft'`, `'published'` | `posts.status` |
| `application_status` | `'pending'`, `'approved'`, `'declined'`, `'removed'` | `community_applications.status`, `affiliates.status`, `wl_applications.status` |
| `membership_status` | `'active'`, `'past_due'`, `'cancelled'`, `'expired'` | `memberships.status` |
| `referral_status` | `'Lead'`, `'Proposal sent'`, `'Won'`, `'Commission paid'`, `'Not converted'` | `referrals.status` |
| `brief_status` | `'Received'`, `'Scoping'`, `'Quoted'`, `'In progress'`, `'Delivered'`, `'On hold'` | `wl_briefs.status` |

### 1.2 Tables by Domain

#### Users & DPDP Compliance
- **`profiles`**: `id` (`uuid PK`), `email` (`unique`), `full_name`, `phone`, `role` (`user_role`, default `'user'`), `created_at`.
- **`consent_log`**: Audit trail for India's DPDP Act, 2023 (`id` `bigserial PK`, `email`, `purpose`, `granted`, `source`, `policy_version`, `ip_hash`, `created_at`).

#### Lead Capture, Pipeline & Network Forms
- **`enquiries`**: `id` (`text PK`, e.g., `CG-K3F9QX2`), contact & company fields, `needs[]`, `shortlist[]`, `programme`, `description`, `timeline`, `budget`, `source`, `partner_ref`, `utm` (`jsonb`), `consent_updates`, `consent_whatsapp`, `stage` (`pipeline_stage`), `value_inr` (`integer`), `owner_id` (`FK -> profiles.id`), `created_at`, `updated_at`.
  - *Indexes:* `(created_at desc)`, `(stage)`, `(partner_ref)`.
- **`enquiry_notes`**: Internal team notes (`id`, `enquiry_id FK -> enquiries(id) on delete cascade`, `author_id FK -> profiles(id)`, `body`, `created_at`).
- **`specialist_applications`**: Vendor/freelancer applications (`id`, contact/location, `partner_type`, `availability`, `capabilities[]`, `portfolio`, `rate`, `audience`, `status` default `'new'`, `created_at`).
- **`marketplace_interest`**: Waitlist for service #100 (`id`, `name`, `email`, `company`, `role`, `audiences`, `created_at`).

#### Blog & URL Redirects
- **`posts`**: `slug` (`text PK`, locked after publish), `title`, `category`, `author_name`, `author_id FK -> profiles(id)`, `focus_keyword`, `seo_title`, `seo_description`, `body_md`, `read_mins`, `status` (`post_status`), `published_at`, `created_at`, `updated_at`.
  - *Index:* `(status, published_at desc)`.
- **`redirects`**: `from_path` (`text PK`), `to_path`, `created_at`.

#### Paid Community & Payments
- **`community_applications`**: `user_id` (`uuid PK FK -> profiles(id) on delete cascade`), profile/company fields, `working_on`, `interests[]`, `plan` (`'monthly' | 'annual'`), `status` (`application_status`), `created_at`.
- **`memberships`**: `user_id` (`uuid PK FK -> profiles(id) on delete cascade`), `plan`, `status` (`membership_status`), `razorpay_subscription_id` (`unique`), `current_period_end`, `started_at`, `cancelled_at`, plus public directory fields (`display_name`, `role`, `company`, `city`, `linkedin`, `interests[]`, `working_on`).
- **`channels`**: `id` (`text PK`), `name`, `description`, `sort_order`.
  - *Seeded Channels:* `introductions`, `general`, `growth`, `tech`, `hiring`, `collabs`, `events`.
- **`messages`**: `id` (`uuid PK default gen_random_uuid()`), `channel_id FK -> channels(id)`, `user_id FK -> profiles(id)`, `body` (`check (char_length(body) between 1 and 1000)`), `created_at`, `deleted_at` (soft delete), `deleted_by FK -> profiles(id)`.
  - *Index:* `(channel_id, created_at desc)`.
- **`message_reports`**: Moderation queue (`id`, `message_id FK -> messages(id) on delete cascade`, `reporter_id FK -> profiles(id)`, `reason`, `created_at`).
- **`payments`**: Written by Razorpay webhook only (`id` Razorpay payment id `PK`, `user_id FK -> profiles(id)`, `purpose`, `amount_paise`, `currency` default `'INR'`, `status`, `razorpay_subscription_id`, `raw jsonb`, `created_at`).

#### Affiliate Program
- **`affiliates`**: `user_id` (`uuid PK FK -> profiles(id) on delete cascade`), contact fields, `share_channels[]`, `audience`, `link`, `status` (`application_status`), `code` (`unique`), `payout_details` (`jsonb`, encrypt at rest in production), `approved_at`, `created_at`.
- **`referral_clicks`**: Analytics for `/r/[code]` (`id`, `code`, `landing_path`, `ip_hash`, `user_agent`, `created_at`).
  - *Index:* `(code, created_at desc)`.
- **`referrals`**: Attribution & commission ledger (`enquiry_id PK FK -> enquiries(id) on delete cascade`, `code FK -> affiliates(code)`, `status referral_status`, `commission_inr`, `updated_at`).
- **`payouts`**: Commission disbursement records (`id`, `affiliate_id FK -> affiliates(user_id)`, `amount_inr`, `method` `'UPI' | 'Bank transfer'`, `reference`, `paid_at`).

#### White-Label Agency Program
- **`wl_applications`**: `user_id` (`uuid PK FK -> profiles(id) on delete cascade`), `company`, contact fields, `capabilities[]`, `volume`, `notes`, `status` (`application_status`), `created_at`.
- **`wl_partners`**: `user_id` (`uuid PK FK -> profiles(id) on delete cascade`), `company`, `status` default `'active'`, `pricing_notes`, `nda_signed_at`, `manager_id FK -> profiles(id)`, `created_at`.
- **`wl_briefs`**: `id` (`text PK`), `partner_id FK -> wl_partners(user_id) on delete cascade`, `title`, `industry`, `capability`, `services`, `due_date`, `budget`, `details`, `branding`, `status` (`brief_status`), `created_at`, `updated_at`.
- **`wl_brief_files`**: Private storage object references (`id`, `brief_id FK -> wl_briefs(id) on delete cascade`, `storage_path`, `uploaded_by FK -> profiles(id)`, `created_at`).

#### Free Tools (Optional Server Persistence)
- **`share_links`**: Short links for Media Kits (`/c/[id]`) and Event Invites (`/i/[id]`) (`id PK`, `kind` `'mediakit' | 'invite'`, `payload jsonb`, `created_at`).
- **`health_check_results`**: Saved only when a visitor submits an enquiry from the Health Check (`id`, `enquiry_id FK -> enquiries(id) on delete set null`, `answers smallint[]`, `total_score smallint`, `created_at`).

---

## 2. Prototype-to-Production Data Mapping

In `website-prototype/index.html`, `window.claude.use('db')` uses NoSQL document/subcollection paths. When porting to PostgreSQL:

| Prototype Path (`index.html`) | Production Table(s) | Key Structural Changes |
| --- | --- | --- |
| `enquiries/{ref}` | `enquiries`, `enquiry_notes`, `consent_log` | Extract `consentPrivacy`/`consentUpdates`/`consentWhatsApp` into `consent_log`; store integer `value_inr` instead of string `value`; add `owner_id` & `utm`. |
| `partners/{ref}` | `specialist_applications` | Rename collection from `partners` to `specialist_applications` (`partnerType` -> `partner_type`). |
| `interest/{ref}` | `marketplace_interest` | Direct 1:1 mapping + server consent logging. |
| `posts/{slug}` & `drafts/{slug}` | `posts` + `redirects` | Prototype uses two separate collections; production unifies them via `status post_status ('draft' \| 'published')`. |
| `applications/{uid}` | `community_applications` | Keyed by `user_id`; `working` -> `working_on`. |
| `members/{uid}` | `memberships` + `payments` | Prototype activates membership manually; production ties `memberships.status` to Razorpay webhook events recorded in `payments`. |
| `channels/{ch}/messages/{id}` | `channels` + `messages` + `message_reports` | Subcollection becomes `messages.channel_id` FK; hard `.delete()` becomes soft-delete (`deleted_at`, `deleted_by`). |
| `affiliates/{uid}` & `affcodes/{uid}` | `affiliates`, `referrals`, `payouts`, `referral_clicks` | Prototype duplicates code status and embeds `leads[]` inside `affcodes/{uid}`. Production normalizes `referrals` per `enquiry_id` and tracks payouts separately. |
| `wlapps/{uid}`, `wlpartners/{uid}`, `wlbriefs/{uid}/items/{id}` | `wl_applications`, `wl_partners`, `wl_briefs`, `wl_brief_files` | Subcollection becomes `wl_briefs.partner_id` FK; add NDA timestamp, manager assignment, and private file uploads. |
| `localStorage` (`cg-ref`) | First-party HTTP cookie + `referral_clicks` | Prototype uses `localStorage`; production sets a 90-day first-party cookie via `/r/[code]` so server endpoints read attribution safely. |
| `#/c/:code`, `#/i/:code` (URL base64) | `share_links` | Production adds short IDs while maintaining legacy long base64 decode compatibility (`01-DEVELOPER-HANDOFF.md` section 5). |

---

## 3. Environment Variables (`backend/.env.example`)

| Group | Variables | Exposure |
| --- | --- | --- |
| **Site & Alerts** | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `TEAM_NOTIFY_EMAIL` | Public (URL/Name) / Server (`TEAM_NOTIFY_EMAIL`) |
| **Supabase / DB** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | `SERVICE_ROLE_KEY` & `DATABASE_URL` server-only |
| **Email** | `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` | Server-only |
| **Razorpay** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_ID_MONTHLY`, `RAZORPAY_PLAN_ID_ANNUAL` | Secret & Webhook Secret server-only |
| **Anthropic AI** | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (template default: `claude-haiku-5-5`), `ASSISTANT_RATE_LIMIT_PER_HOUR` (`30`) | Server-only (`POST /api/assistant`) |
| **Spam Protection** | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Secret server-only |
| **WhatsApp (Phase 2)** | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Server-only |
| **Analytics & Monitoring** | `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `SENTRY_DSN` | GA4 loaded strictly after cookie consent |
| **Affiliates** | `AFFILIATE_COOKIE_DAYS` (`90`), `AFFILIATE_ATTRIBUTION` (`first_touch`) | Server-side cookie & attribution config |

---

## 4. Required Production API Routes & Access Controls

From [`01-DEVELOPER-HANDOFF.md`](../01-DEVELOPER-HANDOFF.md) (sections 3, 5, 6, and 7):

### Key API Endpoints
- `POST /api/enquiries` — Turnstile + IP rate-limit + server validation + read `partner_ref` cookie + insert `enquiries` / `consent_log` / `referrals` (if code active) / optional `health_check_results` + send team & visitor confirmation emails.
- `POST /api/partners` & `POST /api/marketplace-interest` — Validated public form submissions + team email notifications.
- `POST /api/assistant` — Accepts max 12 conversation turns (`<= 600` chars/message), injects server-side `askKnowledge()` prompt, streams Anthropic Messages API response, enforces per-visitor hourly rate limit, falls back to `askLocal()` on errors.
- `GET /r/[code]` — Validates affiliate code, sets 90-day first-touch cookie if unset, logs to `referral_clicks`, redirects to `to` query parameter.
- `POST /api/webhooks/razorpay` — Verifies HMAC signature (`RAZORPAY_WEBHOOK_SECRET`), logs to `payments`, updates `memberships` (`subscription.activated`, `subscription.charged`, cancellation, or payment failure).
- `/api/admin/*` — Role-guarded (`owner`, `admin`) with mandatory 2FA for enquiry pipeline updates, CSV exports, internal notes, affiliate/white-label/community approvals (with automated notification emails), and audit logging.

### Row-Level Security (RLS) Target Matrix

| Table(s) | Read Access | Write Access |
| --- | --- | --- |
| `enquiries`, `enquiry_notes`, `specialist_applications`, `marketplace_interest`, `consent_log` | `owner`, `admin` | Server/API only (public submissions validated & Turnstile-checked via service role) |
| `posts` | Public (`status = 'published'`); `editor`/`admin`/`owner` (all) | `editor`, `admin`, `owner` |
| `community_applications` | Applicant (own `user_id`), `admin`/`owner` | Applicant (own `user_id`), `admin`/`owner` |
| `memberships` | Active members (directory fields only), `admin`/`owner` | Razorpay webhook & `admin`/`owner` |
| `messages`, `channels` | Active members (`deleted_at is null`), `admin`/`owner` | Active members (insert own `user_id`, soft-delete own); `admin`/`owner` delete any |
| `affiliates` | Affiliate (own `user_id`), `admin`/`owner` | Affiliate (application insert & payout detail update after approval), `admin`/`owner` (approval/code) |
| `referrals`, `payouts`, `referral_clicks` | Affiliate (own `code` / `affiliate_id`), `admin`/`owner` | Server / `admin` / `owner` only |
| `wl_applications`, `wl_partners` | Partner (own `user_id`), `admin`/`owner` | Partner (application), `admin`/`owner` (approval/manager/NDA) |
| `wl_briefs`, `wl_brief_files` | Partner (own `partner_id`), `admin`/`owner` | Partner (create), `admin`/`owner` (status updates) |

---

## 5. Technical Audit Findings & Implementation Notes

During analysis of the repository, the following actionable gaps were identified for the engineering team:

1. **No RLS Policies or Triggers Written Yet in SQL:** [`backend/database-schema.sql`](../backend/database-schema.sql) contains schema DDL only—developers must add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, all RLS `CREATE POLICY` rules, and `updated_at` triggers (`enquiries`, `posts`, `referrals`, `wl_briefs`) before running migrations in Supabase.
2. **Missing Foreign Key on `enquiries.partner_ref` / `referral_clicks.code`:** Deliberately or implicitly, only `referrals.code` has a FK to `affiliates(code)`. That allows an enquiry with an unrecognized `partner_ref` to still save cleanly; server logic must validate active codes before inserting a `referrals` row and perform fraud checks (blocking self-referrals by email/phone and flagging repeated IP submissions).
3. **Payout Details Encryption:** `affiliates.payout_details` is `jsonb`; encrypt sensitive UPI/bank fields at the application layer or via database vault before storing, and mask all but the last 4 characters in `/admin`.
4. **Blog Image & Markdown Support:** `mdToHtml()` in the prototype supports headings (`#`–`###`), bold, italic, inline code, links, blockquotes, and lists, but **not** images (`![]()`). Production requires Supabase Storage image uploads with mandatory alt text (`01-DEVELOPER-HANDOFF.md` section 6.5).
5. **Client Font & Library Self-Hosting:** Production should replace the Google Fonts `<link>` with `next/font` (preloading `Bricolage Grotesque`) and bundle `qrcode-generator@1.4.4` locally instead of relying on `cdnjs.cloudflare.com`.
6. **Anthropic Model ID Check:** `backend/.env.example` lists `ANTHROPIC_MODEL=claude-haiku-5-5`; confirm the exact production model identifier against Anthropic's API docs at deployment time.
7. **Brand SVG Optimization:** `brand/collabify-logo-dark-text.svg` and `brand/collabify-logo-white-text.svg` are 506 KB each due to an embedded raster `<image>` mark. Request pure vector artwork for the mark from the designer if available (tracked in [`02-OWNER-CONTENT-CHECKLIST.md`](../02-OWNER-CONTENT-CHECKLIST.md)).

