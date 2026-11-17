# Collabify Growth — Next.js Migration Plan

Phased execution blueprint to migrate the Collabify Growth SPA prototype ([website-prototype/index.html](file:///Users/gl1tched/Downloads/collabify-developer-kit/website-prototype/index.html)) into a production **Next.js App Router (TypeScript strict)** application with a complete **Supabase + Razorpay + Resend + Cloudflare Turnstile + Anthropic** backend—preserving 100% UI fidelity.

---

## Non-Negotiable Constraints

1. **Preserve the Prototype UI Verbatim:** Do not redesign, re-theme, or replace existing styles with generic component libraries (MUI, Chakra, shadcn, etc.). Port the prototype's custom CSS tokens, layout rules, showcase SVGs/animations, dark/light/system theme handling, typography (`Bricolage Grotesque`, `Instrument Sans`), and exact HTML structures directly into modular CSS and React components.
2. **Keep Original Reference Files Intact:** Leave [website-prototype/index.html](file:///Users/gl1tched/Downloads/collabify-developer-kit/website-prototype/index.html), [backend/database-schema.sql](file:///Users/gl1tched/Downloads/collabify-developer-kit/backend/database-schema.sql), [01-DEVELOPER-HANDOFF.md](file:///Users/gl1tched/Downloads/collabify-developer-kit/01-DEVELOPER-HANDOFF.md), [02-OWNER-CONTENT-CHECKLIST.md](file:///Users/gl1tched/Downloads/collabify-developer-kit/02-OWNER-CONTENT-CHECKLIST.md), [brand/](file:///Users/gl1tched/Downloads/collabify-developer-kit/brand), and docs untouched as reference truth.
3. **Incremental Delivery:** Execute strictly Phase 1 → Phase 2 → Phase 3 (page group by page group with visual & DOM comparison) → Phase 4 → Phase 5 → Phase 6. Keep TypeScript strict (`npx tsc --noEmit`) green at every milestone.
4. **Zero Credential Leaks or Fake Success:** Service-role keys, Razorpay secrets, Resend API keys, Turnstile secrets, and Anthropic keys reside exclusively in server modules/route handlers. Webhook handlers verify HMAC signatures and enforce idempotency.

---

## Target Project Architecture

```text
collabify-developer-kit/
├── website-prototype/             # Preserved untouched UI source of truth
├── brand/                         # Preserved original brand files
├── backend/                       # Preserved reference SQL & env spec
├── supabase/
│   ├── migrations/                # Versioned SQL migrations (tables, triggers, RLS, storage, seed)
│   └── seed.sql                   # Optional non-prod dev seed script
├── public/
│   └── brand/                     # Static copy of brand/* SVGs, PNGs, favicons
├── src/
│   ├── app/                       # Next.js App Router pages, layouts, route handlers, sitemap, robots
│   │   ├── (public)/              # Home, capabilities, solutions, services, who, how, about, partners, start, thanks, legal
│   │   ├── (community)/           # community, community/join, community/chat
│   │   ├── (blog)/                # blog, blog/[slug], blog/write, blog/write/[slug]
│   │   ├── (tools)/               # tools, tools/media-kit, tools/invite, tools/whatsapp, health-check, c/[id], i/[id], creators redirect
│   │   ├── (portals)/             # affiliates, white-label
│   │   ├── (admin)/               # admin (+ inbox redirect)
│   │   ├── r/[code]/              # Affiliate referral attribution redirect handler
│   │   └── api/                   # Route Handlers (assistant, enquiries, partners, community, webhooks/razorpay, whitelabel, blog, admin, tools)
│   ├── components/
│   │   ├── chrome/                # SiteHeader, MegaCapsMenu, MobileNav, SiteFooter, CookieBanner, ShortlistPill, ToTop, ThemeProvider
│   │   ├── common/                # Logo, CapIcon, ToolIcon, Breadcrumbs, NoticeBox, PlaceholderText, FaqAccordion, CtaBand, TurnstileWidget
│   │   └── assistant/             # AskCollabify interactive widget
│   ├── features/                  # Feature-domain UI + client state modules
│   │   ├── home/                  # ShowcaseCarousel, CapabilityMarquee, ProgrammeComposer, ProofSection
│   │   ├── services/              # ServiceFinder (101 services), ServiceDetailBlueprint
│   │   ├── forms/                 # EnquiryForm, PartnerForm, MarketplaceInterestForm, validation
│   │   ├── tools/                 # MediaKitMaker, EventInviteMaker, WhatsAppQrMaker, HealthCheckQuiz
│   │   ├── blog/                  # MarkdownRenderer, BlogFilter, BlogEditor (+ seoChecks)
│   │   ├── community/             # CommunityApplication, RazorpayCheckout, CommunityChat, MemberDirectory
│   │   ├── affiliates/            # AffiliateApplication, AffiliateDashboard, ReferralLinks
│   │   ├── whitelabel/            # WhiteLabelApplication, WhiteLabelPortal, BriefUpload
│   │   └── admin/                 # AdminDashboard, LeadPipeline, EnquiriesInbox, AppApprovals, Moderation, Payouts, Users, Payments, AuditLogViewer
│   ├── actions/                   # Server Actions for authenticated forms & admin/editor workflows
│   ├── lib/
│   │   ├── supabase/              # client.ts, server.ts, admin.ts (service role), middleware helper
│   │   ├── razorpay/              # Client & HMAC signature verification helpers
│   │   ├── email/                 # Resend transactional templates & dispatcher
│   │   ├── turnstile/             # Server-side token verifier
│   │   ├── anthropic/             # Server-side Ask Collabify prompt builder, knowledge grounding & fallback
│   │   ├── markdown/              # Safe Markdown parser & sanitizer
│   │   ├── validation/            # Zod schemas matching prototype & SQL constraints
│   │   ├── rate-limit.ts          # Sliding-window IP/user rate limiter
│   │   ├── crypto.ts              # Short code generator, IP hashing, field masking
│   │   └── seo.ts                 # Metadata builders + JSON-LD helpers (Organization, Service, BlogPosting, FAQPage, BreadcrumbList)
│   ├── hooks/                     # useShortlist, useTheme, useConsent, useRealtimeMessages
│   ├── content/                   # Typed domain data ported from index.html CONTENT block
│   ├── config/                    # env.ts (Zod validation), site.ts (canonical URLs, fees, owner placeholders)
│   ├── types/                     # Database types, Domain interfaces, API payloads
│   ├── styles/
│   │   ├── tokens.css             # Exact :root & dark mode CSS custom properties from index.html L13-55
│   │   └── prototype.css          # Verbatim CSS layout, components, animations & breakpoints from index.html L56-964
│   └── middleware.ts              # Session refresh, /admin & /community/chat & /blog/write auth guard, SEO redirects lookup
├── .env.example                   # Complete documented environment template
├── next.config.ts
├── tsconfig.json                  # strict: true
└── package.json
```

---

## Phase-by-Phase Execution Roadmap

### Phase 1: Project Audit (Complete)
- Inspected 100% of [website-prototype/index.html](file:///Users/gl1tched/Downloads/collabify-developer-kit/website-prototype/index.html), [brand/brand-tokens.json](file:///Users/gl1tched/Downloads/collabify-developer-kit/brand/brand-tokens.json), [backend/database-schema.sql](file:///Users/gl1tched/Downloads/collabify-developer-kit/backend/database-schema.sql), [backend/.env.example](file:///Users/gl1tched/Downloads/collabify-developer-kit/backend/.env.example), [01-DEVELOPER-HANDOFF.md](file:///Users/gl1tched/Downloads/collabify-developer-kit/01-DEVELOPER-HANDOFF.md), and [02-OWNER-CONTENT-CHECKLIST.md](file:///Users/gl1tched/Downloads/collabify-developer-kit/02-OWNER-CONTENT-CHECKLIST.md).
- Authored [ROUTE-FEATURE-MATRIX.md](file:///Users/gl1tched/Downloads/collabify-developer-kit/ROUTE-FEATURE-MATRIX.md) and this plan.

### Phase 2: Foundation
1. Initialize Next.js (App Router, TypeScript strict mode, ESLint) without touching existing kit directories.
2. Copy `brand/*` into `public/brand/` and preserve SVG/PNG icons & favicons (`favicon-32.png`, `favicon-180.png`).
3. Extract CSS from `website-prototype/index.html` (`L13–964`) verbatim into `src/styles/tokens.css` and `src/styles/prototype.css`; configure `next/font/google` (`Bricolage_Grotesque` 500–800, `Instrument_Sans` 400–700) bound to `--font-display` and `--font-body`.
4. Implement non-blocking inline theme bootstrap script in root `layout.tsx` (`localStorage.getItem('cg-theme')` + `prefers-color-scheme`) to match prototype zero-FOUC theme behavior.
5. Configure Zod-validated environment loader (`src/config/env.ts`) and update `.env.example`.
6. Create typed static domain modules (`src/content/*`) containing exact prototype data: all 7 capabilities (`CAPS`), 101 services (`ALL_SERVICES` including `#101`), 6 programmes, 8 segments, 4-stage/13-step process, 6 engagements, 6 partner types, community metadata, 7 channels, community rules, affiliate terms, white-label metadata, 7 blog categories, proof/case studies, and Quiz (`HC_QUESTIONS` / `HC_ADVICE`).
7. Set up Supabase browser, server, and admin client utilities (`src/lib/supabase/*`) + TypeScript database interfaces (`src/types/database.ts`).

### Phase 3: UI Migration (Page-by-Page with Visual Parity Check)
1. **Shared Chrome & Helpers:** `Logo`, `CapIcon`, `ToolIcon`, `SiteHeader`, `MegaCapsMenu`, `MobileNav`, `SiteFooter`, `ShortlistPill`, `ToTop`, `CookieBanner`, `AskCollabify`, `PlaceholderText` (`.ph`), `Breadcrumbs`, `NoticeBox`, `FaqAccordion`, `CtaBand`.
2. **Core Marketing Pages:** `/` (with 7-scene `ShowcaseCarousel`, `CapabilityMarquee`, interactive `ProgrammeComposer`, `ProofSection`, `AskCollabify`), `/capabilities`, `/capabilities/[slug]` (all 7), `/solutions`, `/solutions/[slug]`, `/solutions/custom`, `/who-we-serve`, `/how-we-work`, `/about`.
3. **Services, Partners & Lead Capture:** `/services` (101 services search + capability tabs + shortlist toggle), `/services/business-website-development`, `/partners`, `/start` (with shortlist & affiliate hydration), `/thanks`, `/privacy`, `/terms`, `/cookies`.
4. **4 Free Tools & Share Links:** `/tools`, `/tools/media-kit` (+ `/creators` redirect), `/c/[id]`, `/tools/invite`, `/i/[id]` (`.ics` + Google Calendar + WhatsApp links), `/tools/whatsapp` (`qrcode-generator` canvas `1240x1754` & `1000x1000` PNG export), `/health-check` (14-question quiz + radar/bar scoring + advice).
5. **Blog, Community, Affiliates, White-Label & Admin UIs:** Preserve prototype UI shells and interactions (`/blog`, `/blog/[slug]`, `/blog/write`, `/community`, `/community/join`, `/community/chat`, `/affiliates`, `/white-label`, `/admin` + `/inbox` alias) ready to bind directly to Phase 4/5 APIs.

### Phase 4: Backend Implementation
1. **Supabase PostgreSQL Migrations (`supabase/migrations/`):**
   - Base migration reproducing all 24 tables, 7 enums, constraints, indexes, and 7 channel seeds from [backend/database-schema.sql](file:///Users/gl1tched/Downloads/collabify-developer-kit/backend/database-schema.sql).
   - Hardening migration adding:
     - `audit_logs` table (immutable admin audit trail)
     - `webhook_events` table (`provider`, `event_id` unique for idempotent webhook processing)
     - Missing FKs / lookup indexes (`enquiries.partner_ref`, `referral_clicks.code`, `referrals.affiliate_id`)
     - Shared `set_updated_at()` trigger function on mutable tables (`profiles`, `enquiries`, `posts`, `referrals`, `wl_briefs`)
     - Storage bucket `wl-briefs` (private) + `blog-media` (public read, editor/admin write)
     - Complete RLS policies (`ENABLE ROW LEVEL SECURITY`) across all 26 tables covering `anon`, `authenticated`, active community members, affiliates, white-label partners, editors, admins/owners, and `service_role`.
2. **Authentication & RBAC:** Supabase Auth (Email OTP / Magic Link / Google OAuth), session helper `getSessionUser()`, role guards (`owner`, `admin`, `editor`, `user`), `src/middleware.ts` protection for `/admin`, `/blog/write`, `/community/chat`.
3. **External Service Modules:**
   - **Anthropic (`src/lib/anthropic/`)**: Server-side Messages API integration grounded in live Collabify services/capabilities/programmes data (`askKnowledge`), strict rate limit (`ASSISTANT_RATE_LIMIT_PER_HOUR`), safe fallback (`askLocal`) when API key is unconfigured or upstream errors.
   - **Razorpay (`src/lib/razorpay/`)**: Subscription & payment order creators, checkout verification helper, HMAC SHA-256 webhook signature validator, idempotent event processor updating `memberships` & `payments`.
   - **Resend (`src/lib/email/`)**: Typed transactional templates (enquiry confirm, admin alert, partner confirm, community apply/approve/payment-failed, white-label NDA/brief updates, affiliate approval) with safe no-op logging if unconfigured in local dev.
   - **Turnstile (`src/lib/turnstile/`)**: Server-side `siteverify` verification for public lead/partner forms (graceful dev bypass only when test/unset outside production).
   - **File Upload Validation:** Server-side MIME whitelist (`pdf`, `docx`, `png`, `jpeg`, `zip`), byte-size limit (`10MB` brief files, `5MB` blog images), sanitized storage paths.

### Phase 5: Integration & Cleanup
1. Wire every form, shortlist flow, quiz, share link, blog editor, community application/checkout/chat (Supabase Realtime subscription), affiliate referral link/dashboard, white-label brief upload, and admin pipeline/inbox directly to production Route Handlers & Server Actions.
2. Remove all `window.claude.use()` prototype shims cleanly.
3. Implement `/r/[code]` & `/r/[code]/[...path]` HTTP first-touch 90-day attribution cookie + click recording.
4. Configure security headers (`CSP`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` / `frame-ancestors`), SEO `sitemap.xml`, `robots.txt`, dynamic metadata, OpenGraph tags, and JSON-LD (`Organization`, `Service`, `BlogPosting`, `FAQPage`, `BreadcrumbList`).

### Phase 6: Testing & Verification
1. **Static & Build Checks:** `npx tsc --noEmit`, `npm run lint`, `npm run build`.
2. **Unit & Integration Test Suite:** Test Zod schemas, affiliate first-touch attribution logic, Health Check scoring math, ICS/WhatsApp URL generation, Markdown sanitization + `seoChecks`, Razorpay HMAC signature verification, and Ask Collabify validation/fallback.
3. **Runtime Route, UI & Responsive Verification:** Boot production build (`next start`), verify HTTP responses & rendered HTML across routes (`/`, `/capabilities/marketing`, `/services`, `/services/business-website-development`, `/tools/*`, `/health-check`, `/community`, `/blog`, `/affiliates`, `/white-label`, `/admin`, `/sitemap.xml`, `/robots.txt`), and run headless browser checks comparing desktop & mobile layouts and light/dark themes against `website-prototype/index.html`.

