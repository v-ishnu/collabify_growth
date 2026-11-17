# Collabify Growth — Route & Feature Audit Matrix

Complete Phase 1 audit mapping every prototype hash route, page handler (`website-prototype/index.html`), UI structure, interactive JavaScript behavior, local storage key, Next.js App Router target route, rendering strategy, database tables, API endpoints, transactional emails, and owner-content placeholders.

---

## 1. Navigation & Route Mapping Table

| # | Prototype Route (`#/...`) | Prototype Handler (`index.html`) | Production Next.js Route | Rendering Mode | Auth / Role Gate | Primary Purpose |
|---|---|---|---|---|---|---|
| 1 | `#/` | `PAGES.home` | `/` | SSG + Client Islands | Public | Hero showcase (7 SVG scenes carousel), capability marquee, 7 capabilities bento grid, 6 integrated programmes, live Programme Composer, Proof section (3 case tiles, 6 logo slots, testimonial), Ask Collabify teaser, CTA band |
| 2 | `#/capabilities` | `PAGES.capabilities` | `/capabilities` | SSG | Public | Overview of all 7 capabilities (`CAP 01`–`CAP 07`) + 6 integrated programmes |
| 3 | `#/capabilities/:slug` | `capPage(c)` | `/capabilities/[slug]` | SSG (`generateStaticParams` for 7 slugs) | Public | Per-capability breakdown (`brand-marketing`, `technology`, `media-content`, `pr-reputation`, `founder-os`, `events`, `network-experiences`), custom icon, service groups, deliverables/pairs, FAQs, full service table with `+ Shortlist` toggle, and detail link for `#11` |
| 4 | `#/solutions` | `PAGES.solutions(undefined)` | `/solutions` | SSG | Public | Overview of all 6 integrated programmes (`Founder Growth`, `Startup Launch`, `Event Growth`, `Digital Transformation`, `Corporate Media`, `Founder OS Setup`) |
| 5 | `#/solutions/:slug` | `PAGES.solutions(slug)` | `/solutions/[slug]` | SSG (`generateStaticParams` for 6 slugs + `custom`) | Public | Individual integrated programme detail (`founder-growth`, `startup-launch`, `event-growth`, `digital-transformation`, `corporate-media`, `founder-os-setup`) or `/solutions/custom` tailored multi-discipline programme view |
| 6 | `#/who-we-serve` | `PAGES.who` | `/who-we-serve` | SSG | Public | 8 client segment cards (`SEGMENTS`) with needs and starting-point links |
| 7 | `#/how-we-work` | `PAGES.how` | `/how-we-work` | SSG | Public | 4-stage / 13-step delivery process (`PROCESS`) + 6 engagement models (`ENGAGEMENTS`) |
| 8 | `#/about` | `PAGES.about` | `/about` | SSG | Public | Agency overview, team count (`TEAM_SIZE = 42`), founder note placeholders, core principles, proof summary |
| 9 | `#/services` | `PAGES.services` | `/services` | SSG + Client Filter | Public | All **101 services** (100 capability services + #101 Bespoke programme): live search, capability filter tabs, interactive `+ Shortlist` selection persisted in `localStorage` |
| 10 | `#/services/business-website-development` | `PAGES.service` | `/services/business-website-development` | SSG | Public | Flagship service detail blueprint page (deliverables, process, FAQ, `Service` + `FAQPage` JSON-LD) |
| 11 | `#/partners` | `PAGES.partners` | `/partners` | SSR/SSG + Client Forms | Public | Partner Ecosystem hub: 6 specialist partner types (`PARTNER_TYPES`), Specialist Application form + Marketplace Early Interest signup |
| 12 | `#/start-a-project` | `PAGES.start` | `/start-a-project` (+ `/start` redirect) | Client Form Page | Public | Start a Project / Contact form: reads `cg-shortlist` & `cg-ref` attribution, auto-matches recommended programme, Turnstile protection, submits enquiry |
| 13 | `#/thank-you` | `PAGES.thanks` | `/thank-you` (+ `/thanks` redirect) | Static / Query-aware | Public | Enquiry / application confirmation page |
| 14 | `#/privacy` | `PAGES.privacy` | `/privacy` | SSG | Public | Privacy Policy (India DPDP Act, 2023 aligned) |
| 15 | `#/terms` | `PAGES.terms` | `/terms` | SSG | Public | Website Terms of Use |
| 16 | `#/cookies` | `PAGES.cookies` | `/cookies` | Client Interactive | Public | Cookie Policy + interactive analytics consent reset / toggle UI |
| 17 | `#/community` | `PAGES.community` | `/community` | SSG | Public | Collabify Community landing page: Monthly / Annual pricing cards, 7 channels preview, 5 community rules (`COMM_RULES`), FAQ |
| 18 | `#/community/join` | `PAGES.join` | `/community/join` | Client + Authenticated Flow | Public / Auth | Community membership application form (with work proof, links, rules consent) + live status tracker (`pending` -> `approved` -> Razorpay checkout -> `active`) |
| 19 | `#/community/chat` | `PAGES.chat` | `/community/chat` | Protected SSR/Client + Realtime | Authenticated Active Member (or Owner/Admin) | 7-channel realtime member chat (`#introductions`, `#general`, `#growth`, `#tech`, `#hiring`, `#collabs`, `#events`), member directory drawer/view, message reporting, admin soft-delete moderation |
| 20 | `#/blog` | `PAGES.blog` | `/blog` | SSR / ISR | Public | Blog listing across 7 `BLOG_CATS`, category filter tabs, featured post card |
| 21 | `#/blog/:slug` | `PAGES.post(slug)` | `/blog/[slug]` | SSR / ISR | Public | Full article reader with sanitized Markdown-to-HTML rendering, reading time, author metadata, `BlogPosting` & `BreadcrumbList` JSON-LD, SEO `301` redirect support via `redirects` table |
| 22 | `#/blog/write` & `#/blog/write/:slug` | `PAGES.write(slug)` | `/blog/write` & `/blog/write/[slug]` | Protected Editor | `owner`, `admin`, `editor` | Split-pane Markdown editor with live preview, inline SEO checklist (`seoChecks`), image upload with alt-text enforcement, slug redirect creation on slug edit, publish/draft controls |
| 23 | `#/tools` | `PAGES.tools` | `/tools` | SSG | Public | Free Growth Tools hub linking to Growth Health Check, Media Kit Maker, Event Invite Maker, WhatsApp QR Poster Maker, plus affiliate promo callout |
| 24 | `#/tools/media-kit` & `#/creators` | `PAGES.creators` | `/tools/media-kit` (+ `/creators` redirect/alias) | Client Interactive | Public | Interactive Media Kit Maker (8 visual themes `MK_THEMES`, platforms `MK_PLATFORMS`, rates, bio, live mobile/desktop card preview, `html->canvas` PNG export, compact URL-encoded/shortlink sharing) |
| 25 | `#/c/:code` | `PAGES.card(code)` | `/c/[id]` | SSR + Meta Tags | Public | Shareable Media Kit public card decoded from short code (`share_links`) or base64url payload |
| 26 | `#/tools/invite` | `PAGES.invite` | `/tools/invite` | Client Interactive | Public | Interactive Event Invite Maker (themes, date/time IST handling, venue/online details, `.ics` download, Google Calendar link, WhatsApp message format, shareable `/i/[id]` URL) |
| 27 | `#/i/:code` | `PAGES.invitePage(code)` | `/i/[id]` | SSR + Meta Tags | Public | Shareable Event Invite landing page with Calendar `.ics` download & Google Calendar button |
| 28 | `#/tools/whatsapp` | `PAGES.waTool` | `/tools/whatsapp` | Client Interactive | Public | WhatsApp Link & QR Poster Maker (`qrcode-generator`, E.164 `+91` smart normalization, live QR preview, `1240x1754` A5/A4 poster PNG & `1000x1000` QR-only PNG export) |
| 29 | `#/health-check` | `PAGES.health` | `/health-check` | Client Interactive | Public | 14-question Growth Health Check quiz across marketing/tech/brand/operations, instant pillar score calculation, personalized advice (`HC_ADVICE`), optional saved report & pre-filled CTA to `/start` |
| 30 | `#/affiliates` | `PAGES.affiliates` | `/affiliates` | SSR + Client Portal | Public (Apply) / Auth (`affiliate` / user) | Affiliate programme rules, 90-day first-touch explanation, application form, approved dashboard (personal `/r/[code]` link generator targeting `/`, `/tools/*`, `/health-check`, promo copy templates, lead attribution & payout ledger) |
| 31 | `#/white-label` | `PAGES.whitelabel` | `/white-label` | SSR + Client Portal | Public (Apply) / Auth (`wl_partner`) | Agency white-label programme overview, agency application with NDA agreement, approved partner portal (private NDA-protected brief creation, file upload to private bucket, brief status tracking `submitted` -> `quoted` -> `approved` -> `in_progress` -> `delivered`) |
| 32 | `#/inbox` | `PAGES.inbox` | `/admin` (+ `/inbox` redirect/alias) | Protected Admin UI | `owner`, `admin`, `editor` (scoped) | Owner Inbox & Admin Workspace: KPI overview, 5-stage Lead Pipeline (`new`, `contacted`, `qualified`, `proposal`, `closed`), Enquiries + Notes, Specialist Applications, Community Applications/Members/Reports, Affiliate Applications/Codes/Payouts, White-Label Applications/Briefs, Blog Posts, Users, Payments, Audit Logs |
| 33 | `#/r/:code[/path]` | Interceptor in `render()` | `/r/[code]` & `/r/[code]/[...path]` | Route Handler (Server Redirect) | Public | Captures affiliate click (`referral_clicks`), sets HTTP cookie `cg_ref` (`maxAge: 90 days`, first-touch preserves earlier non-expired cookie), and `302` redirects to target path (`/` or `/tools/...`) |
| 34 | Fallback `404` | `PAGES.notFound` | `not-found.tsx` | Static / Custom 404 | Public | Preserved prototype 404 page with navigation back to Home, Services, and Start a Project |

> **Prototype Note:** In `website-prototype/index.html`, there are 31 properties defined on `PAGES` plus the `capPage(c)` helper for `/capabilities/:slug` and the `#/r/:code` interceptor, giving full coverage across all routes above.

---

## 2. Global Persistent Chrome & Cross-Page Interactive Modules

1. **Top Header (`#siteHeader`)**: Fixed/sticky header (`height: 70px`), light/dark adaptive logo (`LOGO`), 7-item mega-dropdown for Capabilities (`#megaCaps`), links to Solutions, Services, Resources/Tools, Community, Partners, Start a Project CTA button, Theme cycler (`system` -> `light` -> `dark`), Mobile drawer trigger (`#mnav`).
2. **Mobile Navigation Drawer (`#mnav`)**: Slide/overlay mobile navigation preserving accordion/list groupings, keyboard trap, `Escape` close, and `inert`/scroll lock.
3. **Ask Collabify AI Assistant (`askHtml`, `askSend`, `bindAsk`)**: Embedded assistant widget (homepage & contextual surfaces) with 4 suggested prompts (`ASK_SUGGESTIONS`), bilingual Hinglish detection (`HI_MAP`), grounded site knowledge base (`askKnowledge`), and production streaming/JSON call to `POST /api/assistant` (Anthropic Messages API server-side) with graceful local fallback if unavailable.
4. **Sticky Service Shortlist Pill (`#slPill`)**: Persistent floating bar when 1+ services are shortlisted (`cg-shortlist`), showing count, drawer/summary toggle or direct jump to `/start` with pre-populated shortlist.
5. **Back-to-Top Button (`#toTop`)**: Appears on scroll past threshold.
6. **Cookie Consent Banner (`#cookie`)**: Persists `cg-consent` (`accepted` / `essential`), gates analytics/session scripts, synced with `/cookies` preferences page and `consent_log` DB audit when signed in or submitting forms.
7. **Footer (`.site-footer`)**: 6-column grid (`foot-grid`: Brand + Capabilities + Solutions + Company + Grow with us + Contact) preserving all public, capability, resource, and legal links + copyright & theme selector (`#themeSelect`).

---

## 3. Data Tables, API Endpoints & Storage Matrix

### Database Tables (`backend/database-schema.sql` + Hardened Additions)

| Domain | Tables (`backend/database-schema.sql`) | Hardened Additions in Supabase Migrations |
|---|---|---|
| **Auth & Privacy** | `profiles`, `consent_log` | RLS self/admin scoping; `updated_at` trigger on `profiles` |
| **Leads & Partners** | `enquiries`, `enquiry_notes`, `specialist_applications`, `marketplace_interest` | `enquiries.partner_ref` indexed + FK/lookup helper to `affiliates(code)`; `updated_at` trigger on `enquiries` |
| **Blog CMS** | `posts`, `redirects` | Markdown image upload helper; `updated_at` trigger on `posts`; public read on `published` only |
| **Community & Billing** | `community_applications`, `memberships`, `channels` (7 seeded), `messages`, `message_reports`, `payments` | Realtime publication enabled on `messages`; soft-delete (`deleted_at`, `deleted_by`) enforcement in RLS |
| **Affiliates** | `affiliates`, `referral_clicks`, `referrals`, `payouts` | Masked `payout_details` in client views; admin-only payout mutation + audit log |
| **White-Label Portal** | `wl_applications`, `wl_partners`, `wl_briefs`, `wl_brief_files` | Private Supabase Storage bucket `wl-briefs` with partner/admin-only signed URLs |
| **Tools & Sharing** | `share_links`, `health_check_results` | Short-code uniqueness index; read-only public share link fetch |
| **Security & Operations (New)** | `audit_logs`, `webhook_events` | Immutable admin action logging + idempotent Razorpay webhook deduplication |

### Production Route Handlers / Server Actions Map

| Endpoint | Method | Purpose | Security Controls |
|---|---|---|---|
| `/api/health` | `GET` | Health / readiness check | Public minimal JSON |
| `/api/assistant` | `POST` | Ask Collabify (Anthropic Messages API) | Zod validation, IP rate limit (`ASSISTANT_RATE_LIMIT_PER_HOUR`), server-side `ANTHROPIC_API_KEY`, fallback to local grounded KB if offline |
| `/api/enquiries` | `POST` | Project enquiry submission | Zod, Turnstile check, 90-day `cg_ref` attribution binding, `consent_log` insert, Resend emails (client confirm + admin notify) |
| `/api/partners` | `POST` | Specialist partner & marketplace interest submission | Zod, Turnstile check, DB insert, Resend confirmation + admin notify |
| `/api/community/apply` | `POST` | Community membership application | Auth required, Zod validation, `community_applications` insert, Resend confirmation |
| `/api/community/messages` & `/api/community/reports` | `POST`, `DELETE` | Send chat message, report message, moderate message | Active membership check (or moderator role), Zod length limits, rate limit, soft-delete audit |
| `/api/payments/razorpay/order` or `/subscription` | `POST` | Create Razorpay order/subscription for approved community member | Auth + approved application verified server-side, `RAZORPAY_KEY_SECRET` server-only |
| `/api/payments/razorpay/verify` | `POST` | Verify checkout signature & record pending/verified payment state | HMAC SHA-256 signature verification; authoritative activation via webhook or verified API fetch |
| `/api/webhooks/razorpay` | `POST` | Authoritative subscription lifecycle (`subscription.activated`, `charged`, `halted`, `cancelled`, `payment.failed`) | `X-Razorpay-Signature` HMAC verification, `webhook_events` idempotency guard, updates `memberships` & `payments`, sends Resend emails |
| `/api/affiliates/apply` | `POST` | Affiliate programme application | Auth required, Zod, inserts `affiliates` (`status = 'pending'`), Resend confirm |
| `/r/[code]` & `/r/[code]/[...path]` | `GET` | Referral redirect handler | Logs `referral_clicks` (salted IP hash), sets first-touch `cg_ref` cookie (90d), 302 redirects |
| `/api/whitelabel/apply` & `/api/whitelabel/briefs` | `POST` | White-label partner apply (with NDA record) & create brief + signed upload URL | Auth required (`wl_partner` verified for briefs), private bucket `wl-briefs`, file MIME/size validation (`PDF`, `DOCX`, `PNG`, `JPG`, `ZIP`), Resend notification |
| `/api/tools/share` & `/api/tools/health-check` | `POST` | Save share link (`/c/[id]`, `/i/[id]`) or optional health-check score snapshot | Zod payload bounds, safe short-code generator |
| `/api/blog` & `/api/blog/[id]` | `GET`, `POST`, `PATCH`, `DELETE` | CMS CRUD & Markdown image upload | `owner` / `admin` / `editor` role check, slug redirect creation in `redirects`, `audit_logs` write |
| `/api/admin/*` | `GET`, `PATCH`, `POST` | Admin inbox mutations (stage change, notes, approve/decline apps, moderation, payout mark, user roles) | `owner` / `admin` RBAC check, mandatory `audit_logs` write, email dispatch on status transitions |

---

## 4. LocalStorage Keys Inventory & Production Migration Plan

| Key (`website-prototype/index.html`) | Prototype Role | Production Behaviour |
|---|---|---|
| `cg-theme` | Theme preference (`light` / `dark` / system auto) | **Keep in `localStorage`** + SSR pre-paint script in root `<head>` to prevent theme flash (FOUC) |
| `cg-shortlist` | Selected service IDs array (`#1`–`#101`) | **Keep in `localStorage`** for anonymous convenience; hydrate into `/start` enquiry payload (`services` column) |
| `cg-consent` | Cookie consent decision | **Keep in `localStorage`** + sync to `consent_log` table when submitting forms/auth |
| `cg-ref` | Client referral fallback (`{code, first_ts}`) | **Upgrade primary source to HttpOnly/First-Party HTTP Cookie `cg_ref` (90 days, first-touch)** set by `/r/[code]`, keeping optional UI display sync |
| `cg-mediakit` | Unsaved draft state in Media Kit Maker | **Keep in `localStorage`** as UX draft convenience; shared cards persist to `share_links` |
| `cg-invite` | Unsaved draft state in Event Invite Maker | **Keep in `localStorage`** as UX draft convenience; shared invites persist to `share_links` |
| `cg-waqr` | Unsaved draft state in WhatsApp QR Poster Maker | **Keep in `localStorage`** as UX draft convenience |
| `cg-health` | Latest Growth Health Check score/answers | **Keep in `localStorage`** locally + optional server persistence in `health_check_results` |
| `window.claude.use(...)` | Prototype mock DB, user session & AI bridge | **Remove completely in Phase 5** and replace with Supabase SSR/Browser clients, Route Handlers, and Server Actions |

---

## 5. Owner-Supplied Placeholders Inventory (`[...]` / `02-OWNER-CONTENT-CHECKLIST.md`)

All `[bracketed]` strings use `.ph` visual styling in the prototype so placeholders are explicit until replaced via `src/config/site-content.ts` or environment configuration:
- Legal entity name, CIN/GSTIN, registered office & grievance officer details (`CONTACT`, legal pages)
- Canonical contact email (`hello@collabifygrowth.com`), primary WhatsApp number, office city/address
- Founder story & leadership bios (`About` page)
- 3 real client case studies (`CASES`), 6 client logo slots (`LOGO_SLOTS`), client testimonial (`TESTIMONIAL`)
- Blog initial articles & author bios
- Community pricing (`monthly_inr`, `annual_inr`), Razorpay Plan IDs, refund & cancellation copy
- Affiliate commission `%`, payout schedule (`monthly`), minimum threshold, full affiliate T&Cs
- White-label SLA hours, NDA template text, discount tiers
- Decision on optional Service #102 (SEO / Search Marketing)
