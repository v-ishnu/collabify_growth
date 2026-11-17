# Production Engineering Roadmap — Collabify Growth

This roadmap sequences the resolution of all Critical, High, and Medium issues identified in `PRODUCTION-AUDIT.md` and `SECURITY-AUDIT.md`, while preserving the existing UI (`website-prototype/index.html` fidelity) byte-for-byte in layout, typography, colors, and responsive behavior.

---

## Phase 1: Database & Schema Hardening (`supabase/migrations/0003_production_hardening.sql` & `src/types/database.ts`)

**Goals:**
1. Add account suspension & update-tracking columns to `public.profiles`: `is_suspended boolean not null default false`, `suspended_at timestamptz`, `suspended_reason text`, `updated_at timestamptz not null default now()` (+ `set_updated_at` trigger and partial index on `is_suspended`).
2. Add helper function `public.is_suspended_user()` and update `is_staff()`, `is_admin()`, `is_active_member()`, and `is_active_wl_partner()` (with fixed `search_path = public`) so suspended users immediately lose RLS privileges across every table and storage bucket.
3. Add retry-safe status fields to `public.webhook_events`: `status text not null default 'processed' check (status in ('processing','processed','failed'))` and `error_message text`.
4. Add transactional PostgreSQL RPC `public.create_enquiry_atomic(...)` wrapping `enquiries`, `consent_log`, conditional approved `referrals`, and optional `health_check_results` inside an atomic database transaction.
5. Synchronize `src/types/database.ts` (`ProfileRow`, `AuditLogRow`, `WebhookEventRow`) with Postgres columns (`entity_type`, `entity_id`, `details` + optional joined `actor_email`).

**Acceptance Criteria:** Migration SQL applies cleanly over `0001` & `0002`; TypeScript types accurately match schema column names; `tsc --noEmit` passes.

---

## Phase 2: Standardized API Layer, CSRF Guard & Auth / Session Hardening

**Goals:**
1. Introduce `src/lib/api/response.ts` providing structured response helpers (`apiOk`, `apiError` with standardized codes `VALIDATION_ERROR`, `UNAUTHORIZED`, `ACCOUNT_SUSPENDED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`), `assertSameOrigin(request)`, and hardened `safeRedirectTarget(raw)`.
2. Enforce `is_suspended === false` inside `getSessionUserAndProfile()` and `requireStaffSession()`, returning explicit suspension state/rejection (`403 ACCOUNT_SUSPENDED`).
3. Create `POST /api/auth/signout` for server-side Supabase session termination and expose a subtle existing-styled Sign out control in authenticated portal/admin contexts without disrupting header navigation geometry.
4. Upgrade `src/app/auth/callback/route.ts` to support email OTP/recovery (`token_hash` + `type` via `verifyOtp`) alongside OAuth/PKCE (`code`), plus backslash-safe redirect filtering.
5. Upgrade `src/middleware.ts` to validate staff privileges (`editor`, `admin`, `owner`) and non-suspended status on `/admin` and `/blog/write` when Supabase is configured.

**Acceptance Criteria:** Unauthenticated `/admin` or `/blog/write` redirects safely; non-staff users attempting `/admin` or `/api/admin/*` receive `403`; suspended users are blocked at session, middleware, API, and RLS layers.

---

## Phase 3: Critical API Reliability, Atomic Transactions & Razorpay Hardening

**Goals:**
1. Upgrade `src/app/api/webhooks/razorpay/route.ts` to **two-phase idempotency**:
   - Insert `webhook_events` with `status = 'processing'`.
   - On unique collision (`23505`): inspect existing row — if `status === 'processed'`, return `{ ok: true, duplicate: true }`; if `status === 'failed'` (or stale processing lock), transition back to `'processing'` and re-run cleanly.
   - Support `subscription.paused` alongside `halted`/`pending`/`expired`/`cancelled`, marking row `'processed'` on success or `'failed'` with truncated diagnostic on failure before returning `500`.
2. Prevent duplicate active subscriptions in `POST /api/payments/razorpay/subscription` (`409 CONFLICT` if active non-expired membership exists).
3. Enforce `current_period_end > now()` consistency on `src/app/community/chat/page.tsx` SSR gating to match `is_active_member()` & `/api/community/messages`.
4. Replace sequential REST writes in `POST /api/enquiries` with atomic `create_enquiry_atomic` RPC execution; enforce fail-closed `503 SERVICE_UNAVAILABLE` when Supabase admin client is unconfigured across `/api/enquiries`, `/api/partners`, and `/api/marketplace-interest`.
5. Enforce `assertSameOrigin` and user/IP rate-limiting uniformly across all mutation endpoints (`/api/blog/*`, `/api/whitelabel/*`, `/api/community/*`, `/api/affiliates/*`, `/api/payments/*`, `/api/admin/*`).

**Acceptance Criteria:** No silent fake `201` on DB outage; no lost webhooks on retry; zero double-charge subscription creation.

---

## Phase 4: Portal Data Wiring, Admin Suspension Controls, Error Boundaries & Analytics

**Goals:**
1. Fix `loadAdminDashboardBundle()` and `AdminDashboardClient.tsx` so `auditLogs` resolve `actor_email` cleanly and display `entity_type` / `entity_id` accurately.
2. Add user account suspension/reactivation support (`is_suspended`, `suspended_reason`) in `PATCH /api/admin/users/[userId]` and existing `.btn-secondary.btn-sm` controls in the Admin Users tab (preserving last-owner protection & audit logging).
3. Hydrate `wl_brief_files` in `src/app/white-label/page.tsx` and `loadAdminDashboardBundle()`, wiring signed download links (`GET /api/whitelabel/briefs/[id]/files`) cleanly into both `WhiteLabelPortalClient.tsx` and `AdminDashboardClient.tsx`.
4. Add `src/app/error.tsx` and `src/app/global-error.tsx` preserving exact Collabify styling (`.hero-sub`, `.notice`, `.btn-primary`).
5. Add consent-gated Google Analytics loader (`NEXT_PUBLIC_GA4_ID`) inside `SiteOverlayWidgets.tsx` so telemetry scripts load strictly after `consent.analytics === true`.

**Acceptance Criteria:** Brief attachments open via short-lived signed URLs; Admin Audit tab renders real actor emails & entity identifiers; Admin Users tab supports safe suspension; uncaught errors display branded recovery UI.

---

## Phase 5: Verification, Expanded Test Suite & Final Production Sign-Off

**Goals:**
1. Expand Vitest automated test suite (`src/__tests__/`) covering:
   - Structured API response helpers & `assertSameOrigin` CSRF enforcement
   - `safeRedirectTarget` traversal / backslash bypass rejection
   - Webhook two-phase idempotency & signature validation
   - Suspension & RBAC logic in `isStaffRole` / `requireStaffSession`
   - Audit log typing & formatting alignment
2. Run complete verification suite cleanly: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
3. Boot production Next.js server (`next start`) and smoke-test live HTTP status codes across SSR portals, API auth/validation boundaries, redirects, and compiled static assets.

