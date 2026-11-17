# Production Readiness Audit — Collabify Growth

**Audit Date:** 2026-11-12  
**Scope:** Full-stack Next.js App Router codebase (`src/`), Supabase migrations (`supabase/migrations/`), configuration (`src/config/env.ts`, `next.config.ts`), external integrations (Supabase Auth/Postgres/Storage/Realtime, Razorpay, Resend, Cloudflare Turnstile, Anthropic API), SEO/performance/accessibility, error handling, and QA test coverage.  
**UI Preservation Mandate:** Verified intact. All visual styling (`src/styles/tokens.css`, `src/styles/prototype.css`), layouts, breakpoints, themes, components, and copy remain strictly faithful to `website-prototype/index.html`. Zero design system replacements were introduced.

---

## Executive Summary

The initial migration from `website-prototype/index.html` cleanly reproduced all 31 routes/views, 101 services, integrated programmes, 4 free browser/share tools, blog CMS, community chat, affiliate portal, white-label portal, and admin console, backed by unit tests (`15/15` passing) and zero-error `tsc` + `next build`.

However, deep production readiness inspection identified **3 Critical**, **5 High**, **4 Medium**, and **3 Low** engineering gaps that must be resolved before accepting real customers, live Razorpay payments, and public traffic.

---

## 1. Architecture & Subsystem Audit

| Subsystem | Current Implementation | Audit Status | Key Findings |
| :--- | :--- | :--- | :--- |
| **Frontend & UI** | Next.js App Router (`src/app/`), Server Components by default, Client Components isolated to `src/features/`, `src/components/forms/`, `src/components/tools/` | Pass w/ minor gaps | Missing root `src/app/error.tsx` & `src/app/global-error.tsx`; no consent-gated GA4 loader wiring `NEXT_PUBLIC_GA4_ID`; white-label brief attachment download UI incomplete. |
| **Environment Config** | `src/config/env.ts` (Zod schemas) | Pass | Clean separation of `publicEnv` vs `getServerEnv()`. No secrets leaked via `NEXT_PUBLIC_*`. |
| **Database Schema & Migrations** | `supabase/migrations/0001_initial_schema.sql`, `0002_hardening_rls_triggers.sql` | Needs Upgrade | Schema mismatch between `audit_logs` (`entity_type`, `entity_id`, `details`) and TypeScript (`AuditLogRow` & `AdminDashboardClient.tsx`); `profiles` lacks suspension columns (`is_suspended`, `suspended_at`, `suspended_reason`, `updated_at`); `webhook_events` lacks retry `status` tracking; `/api/enquiries` multi-table write is non-atomic. |
| **Auth & Session** | Supabase SSR cookies, `src/lib/supabase/server.ts`, `src/middleware.ts`, `src/app/auth/callback/route.ts` | Needs Upgrade | `getSessionUserAndProfile()` does not reject suspended accounts; no `POST /api/auth/signout` route or sign-out UI action; `auth/callback` lacks `token_hash` + `type` `verifyOtp` flow and backslash (`\`) redirect sanitization; `middleware.ts` checks session presence only (no staff check on `/admin` or `/blog/write`). |
| **API Layer** | `src/app/api/*` route handlers | Needs Upgrade | Ad-hoc response shapes (`{ ok: true }` vs `{ error }`) rather than structured envelopes with machine-readable codes; missing `Origin` CSRF guard on state-changing routes; inconsistent rate limiting on `/api/blog/*`, `/api/whitelabel/briefs/[id]/files`, `/api/community/messages/[id]`, `/api/admin/*`. |
| **Intake & Lead Capture** | `/api/enquiries`, `/api/partners`, `/api/marketplace-interest`, `/api/tools/health-check` | **Critical Gap** | When `getSupabaseAdminClient()` is `null` (misconfigured production env), `/api/enquiries`, `/api/partners`, and `/api/marketplace-interest` still return `201 { ok: true }`, silently losing customer leads without persistence. |
| **Razorpay Billing & Webhooks** | `/api/payments/razorpay/subscription`, `/api/payments/razorpay/verify`, `/api/webhooks/razorpay` | **Critical Gap** | Webhook inserts into `webhook_events` *before* processing membership activation; transient errors leave permanent `'23505'` duplicate blockers so Razorpay retries silently drop paid activations. Subscription checkout also lacks an active-membership duplicate guard, and `src/app/community/chat/page.tsx` omits `current_period_end` expiration check. |
| **Email (Resend)** | `src/lib/email/resend.ts` | Pass | Server-side only; escapes HTML values via `escapeHtml`; gracefully logs warning if `RESEND_API_KEY` absent. |
| **File Storage** | `/api/blog/upload` (`blog-media`), `/api/whitelabel/briefs/[id]/files` (`wl-briefs`) | Minor Gap | Magic-byte inspection + filename sanitization + size limits present in `src/lib/upload/validate.ts`. However, signed file downloads were never hydrated in `src/app/white-label/page.tsx` or rendered as download actions in `WhiteLabelPortalClient.tsx` / `AdminDashboardClient.tsx`. |
| **AI Assistant** | `/api/assistant`, `src/lib/anthropic/assistant.ts` | Minor Gap | Rate-limited per IP and validated with Zod; uses in-memory limiter (single-instance caveat documented) and lacks structured error response / origin guard consistency. |
| **SEO & Metadata** | `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, JSON-LD | Pass | Clean canonical metadata, `BlogPosting` & `FAQPage` JSON-LD, dynamic sitemap including published Supabase posts. |
| **Testing** | Vitest (`src/__tests__/`) | Minor Gap | 15 tests cover services, markdown, tools, assistant fallback, and upload magic bytes, but API contracts, webhook idempotency, auth redirect safety, CSRF checks, and admin/suspension logic have 0 automated tests. |

---

## 2. Detailed Issue Register (Prioritized)

### CRITICAL Severity

1. **`audit_logs` Schema vs. TypeScript/UI Drift (`src/types/database.ts`, `src/features/admin/AdminDashboardClient.tsx`, `src/lib/admin/bundle.ts`)**
   - `0002_hardening_rls_triggers.sql` defines `audit_logs(id, actor_id, action, entity_type, entity_id, details, ip_hash, created_at)` and `src/lib/audit/index.ts` inserts `{ actor_id, action, entity_type, entity_id, details, ip_hash }`.
   - `src/types/database.ts` (`L310-320`) mismatches with `{ actor_email, resource_type, resource_id, metadata }` and `AdminDashboardClient.tsx` (`L1391-1396`) reads `log.actor_email`, `log.resource_type`, `log.resource_id`, rendering blank/undefined values on every audit row.

2. **Razorpay Webhook Idempotency Race (`src/app/api/webhooks/razorpay/route.ts`)**
   - Lines `64-77` insert the webhook row into `webhook_events` *before* running `payments.upsert()` and `memberships.upsert()`.
   - If the database connection blips or an unhandled exception occurs mid-handler (lines `102-200`), subsequent Razorpay webhook retries hit Postgres unique violation `23505` on `(provider, event_id)` and immediately receive HTTP `200 { ok: true, duplicate: true }` — **permanently failing to activate paid user memberships**.

3. **Silent Data Loss on Misconfigured Production DB (`src/app/api/enquiries/route.ts`, `src/app/api/partners/route.ts`, `src/app/api/marketplace-interest/route.ts`)**
   - Currently gated via `if (admin) { ... }` and return HTTP `201 { ok: true }` even when `getSupabaseAdminClient()` is `null`. In production, a missing/invalid Supabase env key silently drops real business leads while telling customers their submission succeeded.

### HIGH Severity

4. **Non-Atomic Multi-Table Enquiry Submission (`src/app/api/enquiries/route.ts`)**
   - Performs four independent REST inserts/lookups (`enquiries`, `consent_log`, `referrals`, `health_check_results`) lines `63-153`. A failure after `enquiries` leaves missing DPDP `consent_log` rows or dropped affiliate attribution. Must execute inside a single PostgreSQL `create_enquiry_atomic` transaction.

5. **Missing Account Suspension, Revocation & Explicit Sign-Out (`supabase/migrations/`, `src/lib/supabase/server.ts`, `src/app/api/admin/users/[userId]/route.ts`)**
   - `profiles` table has no `is_suspended`, `suspended_at`, `suspended_reason`, or `updated_at` columns.
   - `getSessionUserAndProfile()` does not reject suspended users, nor do RLS helpers (`is_staff()`, `is_admin()`, `is_active_member()`, `is_active_wl_partner()`).
   - No `POST /api/auth/signout` handler exists anywhere in `src/`.

6. **Auth Callback & Middleware Edge Cases (`src/app/auth/callback/route.ts`, `src/middleware.ts`)**
   - `/auth/callback` only exchanges `?code=` (`exchangeCodeForSession`) and drops email OTP / password-recovery `?token_hash=&type=` links (`verifyOtp`).
   - `safeRedirectTarget` checks `raw.startsWith('/') && !raw.startsWith('//')` but does not reject backslash `/\` tricks.
   - `src/middleware.ts` checks cookie user existence on `/admin` and `/blog/write` without enforcing staff role authorization before page render.

7. **Duplicate Subscription Creation & Community Expiry Drift (`src/app/api/payments/razorpay/subscription/route.ts`, `src/app/community/chat/page.tsx`)**
   - Users with an already `active` (non-expired) membership can repeatedly call `POST /api/payments/razorpay/subscription` and create overlapping Razorpay subscriptions.
   - `src/app/community/chat/page.tsx` (`L35-42`) checks `ownMem?.status === 'active'` without validating `current_period_end > now()`, allowing access to expired memberships on SSR even though `/api/community/messages` rejects them.

8. **Inconsistent API Contracts, Missing CSRF Origin Checks & Incomplete Rate Limiting**
   - Handlers return ad-hoc JSON formats without uniform `{ success, error: { code, message } }` contracts, lack `Origin`/`Host` validation on cookie-authenticated mutations, and miss rate-limiting on `/api/blog/*`, `/api/whitelabel/briefs/[id]/files`, `/api/community/messages/[id]`, and `/api/admin/*`.

### MEDIUM Severity

9. **Disconnected White-Label Brief Attachments (`src/app/white-label/page.tsx`, `src/features/whitelabel/WhiteLabelPortalClient.tsx`, `src/lib/admin/bundle.ts`, `src/features/admin/AdminDashboardClient.tsx`)**
   - Server page does not load `wl_brief_files` for existing briefs; partner portal shows file counts with no signed URL download triggers (`GET /api/whitelabel/briefs/[id]/files`); admin dashboard briefs tab similarly omits file downloads.

10. **Missing App Router Error Boundaries (`src/app/error.tsx`, `src/app/global-error.tsx`)**
    - Runtime server/client exceptions fall back to unstyled generic Next.js error screens rather than Collabify-branded recovery views matching `not-found.tsx`.

11. **Consent-Gated Analytics Stub (`src/components/chrome/SiteOverlayWidgets.tsx`, `src/config/env.ts`)**
    - `NEXT_PUBLIC_GA4_ID` and cookie consent state (`cg_consent`) exist, but analytics scripts never mount when `consent.analytics === true`.

12. **Payout Ledger / Paid Status & Refund Reconciliation Readiness (`src/app/api/webhooks/razorpay/route.ts`)**
    - `payment.failed` sets membership `past_due`, while Razorpay `subscription.paused` is not explicitly handled in membership state sync.

### LOW Severity

13. **In-Memory Rate Limiter Limitation (`src/lib/rate-limit.ts`)**: Currently uses process-local `Map`; acceptable for single-node Node deployments, should be documented and interface-ready for Upstash/Redis across serverless replicas.
14. **Admin Bundle Fetch Volume (`src/lib/admin/bundle.ts`)**: Loads up to 200 rows per table upfront; works well for launch scale, benefits from explicit `actor_email` resolution on `auditLogs`.
15. **Expanded Regression Suite (`src/__tests__/`)**: Needs coverage for API envelopes, CSRF guards, redirect safety, webhook state transitions, and admin permission guards.

