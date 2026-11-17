# Security Audit & Database Permission Matrix — Collabify Growth

**Audit Date:** 2026-11-12  
**Framework:** OWASP ASVS / Next.js App Router + Supabase PostgreSQL RLS Security Model

---

## 1. Threat Model & Vulnerability Findings

| ID | Severity | Vulnerability / Gap | Affected Locations | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **High** | **No Account Suspension Enforcement**: Suspended or compromised users retain active Supabase JWT cookies across portal pages, APIs, and Postgres RLS helper functions (`is_staff`, `is_active_member`, `is_active_wl_partner`). | `0002_hardening_rls_triggers.sql`, `src/lib/supabase/server.ts`, `src/lib/admin/auth.ts`, `src/app/api/auth/me/route.ts` | Add `profiles.is_suspended`, `suspended_at`, `suspended_reason`; check `is_suspended = false` in all Postgres RLS helper functions AND in `getSessionUserAndProfile()` + `requireStaffSession()`; add Owner/Admin suspension endpoint + UI toggle. |
| **SEC-02** | **High** | **Missing Origin CSRF Validation on Cookie-Authenticated Mutations**: Relying solely on `SameSite=Lax` leaves state-changing JSON/multipart POST/PATCH/DELETE handlers vulnerable to cross-site form/fetch edge cases across subdomains. | `src/app/api/admin/*`, `/api/blog/*`, `/api/community/*`, `/api/whitelabel/*`, `/api/affiliates/*`, `/api/payments/*` | Enforce shared `assertSameOrigin(request)` verification comparing `Origin`/`Referer` against allowed site host (`NEXT_PUBLIC_SITE_URL` + request `Host`) on all browser mutation endpoints (excluding third-party server webhooks using HMAC signatures). |
| **SEC-03** | **High** | **Webhook Idempotency Lockout on Failure**: Recording `webhook_events` unconditionally as final prior to processing causes transient errors to permanently block legitimate signed Razorpay retries (`23505`). | `src/app/api/webhooks/razorpay/route.ts`, `0002_hardening_rls_triggers.sql` | Add `webhook_events.status` (`'processing' | 'processed' | 'failed'`) & `error_message`; acquire `'processing'` row, allow retry if `'failed'`, and mark `'processed'` upon commit. |
| **SEC-04** | **High** | **Backslash Open Redirect Vector in Auth Callback**: `safeRedirectTarget` checks `startsWith('/') && !startsWith('//')` without rejecting `\` (`/\\evil.com` normalized by some browsers). | `src/app/auth/callback/route.ts` | Move redirect sanitizer to shared tested utility (`safeRedirectTarget` in `src/lib/api/response.ts`) rejecting `\\`, protocol schemes, control chars, and `//`. |
| **SEC-05** | **High** | **No Server-Side Sign-Out Endpoint & Stale Session Termination**: Users lacked an explicit `POST /api/auth/signout` handler to clear HTTP-only Supabase auth cookies cleanly. | `src/app/api/auth/`, `src/components/chrome/`, portal UIs | Add `POST /api/auth/signout` calling `supabase.auth.signOut()` with same-origin check + cache eviction, and expose subtle sign-out action in authenticated panels. |
| **SEC-06** | **Medium** | **Missing Edge Staff Role Guard & Direct DB Dependency Leak Risk**: Middleware checked only user login on `/admin` and `/blog/write`; silent `201` fallbacks on intake routes could mask DB downtime or misconfiguration. | `src/middleware.ts`, `/api/enquiries`, `/api/partners`, `/api/marketplace-interest` | Query profile `role` and `is_suspended` in `src/middleware.ts` on `/admin` & `/blog/write` when authenticated; fail closed (`503 SERVICE_UNAVAILABLE`) on unconfigured DB in persistence endpoints. |
| **SEC-07** | **Medium** | **Unthrottled Authenticated Endpoints**: `/api/blog/*`, `/api/whitelabel/briefs/[id]/files`, `/api/community/messages/[id]`, and `/api/admin/*` lacked per-user rate limits. | Multiple `src/app/api/*` routes | Apply tiered `checkRateLimit` limits per user ID + IP hash on upload, mutation, and download endpoints. |
| **SEC-08** | **Low** | **Payout Details Storage & Redaction Check**: Verified AES-256-GCM encryption (`encryptSensitiveJson` in `src/lib/crypto.ts`) and admin bundle stripping (`payout_details: null` in `bundle.ts`). | `src/lib/crypto.ts`, `/api/affiliates/payout-details` | Retain strict redaction; add unit tests covering key derivation and ciphertext integrity. |

---

## 2. Verified Controls (Passing)

- **Secret Isolation:** `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, and `APP_ENCRYPTION_SECRET` are strictly accessed inside server-only helpers and excluded from `NEXT_PUBLIC_*` exports.
- **HMAC & Timing-Safe Comparisons:** `verifyRazorpayWebhookSignature`, `verifyRazorpaySubscriptionSignature`, and IP HMAC hashing (`hashIp`) use `crypto.timingSafeEqual`.
- **File Upload Validation:** `src/lib/upload/validate.ts` verifies binary magic bytes (PNG, JPEG, WEBP, GIF, PDF, ZIP/OOXML DOCX, legacy OLE DOC) against file extensions and enforces byte limits (`25MB` docs, `10MB` blog images).
- **Turnstile Anti-Spam:** Public lead forms enforce Cloudflare Turnstile server-side when configured, failing closed when misconfigured in production.
- **Role Escalation Prevention:** `PATCH /api/admin/users/[userId]` prevents non-owners from creating or modifying `owner` accounts and blocks demoting the last remaining `owner`.

---

## 3. PostgreSQL Row Level Security (RLS) Permission Matrix

**Legend:** `R` = Select, `C` = Insert, `U` = Update, `D` = Delete, `Own` = `user_id/actor_id/partner_id = auth.uid()`, `Svc` = Server `service_role` only (`supabaseAdmin` after strict API auth/Turnstile/HMAC validation), `—` = Denied.  
All authenticated/staff RLS checks require **`NOT public.is_suspended_user()`** (added in migration `0003_production_hardening.sql`).

| Table / Bucket | Anonymous | Authenticated (`user`) | Active Community Member | Approved Affiliate | Active WL Partner | Staff (`editor`) | Admin / Owner | Server (`service_role`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `profiles` | — | `R,U (Own)`* | `R,U (Own)`* | `R,U (Own)`* | `R,U (Own)`* | `R,U (Own)` | `R,U (All)` | `C,R,U` |
| `enquiries` | `C (API+Svc)` | — | — | — | — | `R,U` | `R,U,D` | `C,R,U,D` |
| `enquiry_notes` | — | — | — | — | — | `C,R` | `C,R,D` | `C,R,U,D` |
| `consent_log` | `C (API+Svc)` | — | — | — | — | `R` | `R` | `C,R` |
| `affiliates` | — | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,U` | `R,U` | `C,R,U` |
| `referrals` | — | — | — | `R (Own Code)` | — | `C,R,U` | `C,R,U` | `C,R,U` |
| `referral_clicks` | `C (API+Svc)` | — | — | `R (Own Code)` | — | `R` | `R` | `C,R` |
| `payouts` | — | — | — | `R (Own)` | — | `R` | `C,R` | `C,R` |
| `wl_applications` | — | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,U` | `R,U` | `C,R,U` |
| `wl_partners` | — | — | — | — | `R (Own)` | `R,U` | `C,R,U` | `C,R,U` |
| `wl_briefs` | — | — | — | — | `C,R (Own)` | `R,U` | `R,U` | `C,R,U` |
| `wl_brief_files` | — | — | — | — | `C,R (Own Brief)` | `C,R` | `C,R,D` | `C,R,D` |
| `community_applications` | — | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,C,U (Own)`** | `R,U` | `R,U` | `C,R,U` |
| `memberships` | — | `R (Own)` | `R,U (Own Safe)` | `R (Own)` | `R (Own)` | `R,U` | `R,U` | `C,R,U` |
| `channels` | — | — | `R` | — | — | `R` | `C,R,U` | `C,R,U` |
| `messages` | — | — | `C,R,U (Own)` | — | — | `C,R,U` | `C,R,U,D` | `C,R,U,D` |
| `message_reports` | — | — | `C` | — | — | `C,R,U` | `C,R,U` | `C,R,U` |
| `payments` | — | `R (Own)` | `R (Own)` | `R (Own)` | `R (Own)` | `—` | `R` | `C,R,U` |
| `specialist_applications` | `C (API+Svc)` | — | — | — | — | `R,U` | `R,U` | `C,R,U` |
| `marketplace_interest` | `C (API+Svc)` | — | — | — | — | `R,U` | `R,U` | `C,R,U` |
| `posts` | `R (Published)` | `R (Published)` | `R (Published)` | `R (Published)` | `R (Published)` | `C,R,U` | `C,R,U,D` | `C,R,U,D` |
| `redirects` | `R` | `R` | `R` | `R` | `R` | `C,R,U` | `C,R,U,D` | `C,R,U,D` |
| `share_links` | `C,R` | `C,R` | `C,R` | `C,R` | `C,R` | `C,R` | `C,R,D` | `C,R,D` |
| `health_check_results` | `C (API+Svc)` | — | — | — | — | `R` | `R` | `C,R` |
| `audit_logs` | — | — | — | — | — | — | `R` | `C,R` |
| `webhook_events` | — | — | — | — | — | — | `R` | `C,R,U` |
| Storage: `blog-media` | `R` | `R` | `R` | `R` | `R` | `C,U,D` | `C,U,D` | `C,R,U,D` |
| Storage: `wl-briefs` | — | — | — | — | `C,R (Own Folder)` | `C,R` | `C,R,D` | `C,R,D` |

\* Self-updates on `profiles` cannot alter `role` or `is_suspended` (enforced via RLS/trigger + API authorization).  
\*\* Applicant updates on `affiliates`, `wl_applications`, `community_applications` cannot self-approve `status` or mint referral codes (protected by trigger + server-side routes).

