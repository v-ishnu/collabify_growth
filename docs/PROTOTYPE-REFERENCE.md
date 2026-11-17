# Prototype Technical Reference (`website-prototype/index.html`)

This document describes the internal architecture, design system, routing, state management, and feature modules of [`website-prototype/index.html`](../website-prototype/index.html) (4,592 lines, ~450 KB).

---

## 1. File Anatomy

`website-prototype/index.html` is a zero-build, single-file SPA organized into five contiguous blocks:

| Block | Line Range | Responsibility |
| --- | --- | --- |
| `<head>` & Dependencies | `L1–12` | Metadata, inline PNG favicon (`data:image/png;base64,...`), deferred `qrcode-generator@1.4.4` script from `cdnjs.cloudflare.com`, Google Fonts (`Bricolage Grotesque` & `Instrument Sans`). |
| `<style>` | `L13–964` | Design tokens (`:root`), automatic/manual dark theme overrides, typography, layout grids, components, tool previews, admin UI, responsive breakpoints, reduced-motion rules. |
| Shell Markup | `L966–1039` | Skip button, sticky `<header id="siteHeader">`, desktop mega-menu (`#megaCaps`), mobile drawer (`#mnav`), `<main id="main">`, `<footer class="site-footer">`, floating shortlist pill (`#slPill`), back-to-top (`#toTop`), cookie banner (`#cookie`). |
| Script 1: `LOGO` | `L1040–1043` | `LOGO` object containing traced SVG wordmark path (`4045×915` viewBox) and embedded base64 WebP logo mark (`mark`). |
| Script 2: `CONTENT` | `L1044–1468` | All domain data and copy constants (`CAPS`, `PROGRAMMES`, `SEGMENTS`, `PROCESS`, `ENGAGEMENTS`, `PARTNER_TYPES`, `CONTACT`, `CUSTOM_SERVICE`, `TEAM_SIZE`, `CASES`, `LOGO_SLOTS`, `TESTIMONIAL`, `COMMUNITY`, `CHANNELS`, `COMM_RULES`, `AFFILIATE`, `WHITELABEL`, `BLOG_CATS`, `OWN_EVENTS`). |
| Script 3: `APP` | `L1469–4590` | Strict-mode IIFE containing helpers, `localStorage` wrapper, `window.claude.use(...)` adapter, hash router, 31 `PAGES` renderers, interactive widgets, form validators, admin inbox, and boot sequence. |

---

## 2. Design System & Tokens

CSS tokens in `:root` (`L15–52`) align with [`brand/brand-tokens.json`](../brand/brand-tokens.json):

### Theme Switching
- **Modes:** `system` (default via `@media (prefers-color-scheme:dark)` when `:root` is not `[data-theme="light"]`), `light`, and `dark` (`:root[data-theme="dark"]`).
- **Persistence:** Footer `<select id="themeSelect">` persists selection to `localStorage` (`cg-theme`) and triggers `applyTheme()`.

### Typography & Radii
- **Display Font:** `Bricolage Grotesque` (`--font-display`, weights `500..800`)
- **Body Font:** `Instrument Sans` (`--font-body`, weights `400..700`, `17px` base, `1.6` line-height)
- **Type Scale:** `h1` `clamp(2.4rem,5.4vw,4.6rem)`, `h2` `clamp(1.8rem,3.4vw,2.8rem)`, `h3` `1.3rem`
- **Container & Radii:** `--maxw: 1200px`, `--r-sm: 8px`, `--r: 12px`, `--r-lg: 22px`, pill buttons `border-radius: 999px`

### Palette Tokens
- **Light Theme:** Background `#F4F7F6`, Surface `#FFFFFF`, Surface-2 `#E7F0EE`, Ink `#13201F`, Muted `#4A5B5C`, Brand `#0E4F55`, Brand Deep `#0A3B40`, Accent `#FF9D3E` (hover `#F28A24`, ink on accent `#1A1405`), Danger `#A8261D`, OK `#1E6E47`.
- **Dark Theme:** Background `#0B1516`, Surface `#112022`, Surface-2 `#162A2C`, Ink `#E6EFED`, Muted `#A3B6B4`, Brand `#0F5359`, Brand Text `#86CFCA`, Accent `#FF9D3E`.
- **Logo Palette (`PAL`):** Orange `#FF9D3E`, Indigo `#41448F`, Blue `#1B95BB`, Teal `#35AFA0`, Pink `#DA5773`, Coral `#EF814A`, Slate `#454850`.
- **Placeholder Highlight (`.ph`):** Rendered by `T(str)` (`L1477`) whenever `[square brackets]` appear in copy, styled with dashed border (`#E2AE55`) and amber background (`#FFF1D6` light / `#3A2A0C` dark) so unfinished copy cannot go unnoticed before launch.

---

## 3. Client-Side State & Persistence

### In-Memory `state` Object (`L1487–1490`)
Tracks active router state (`routeId`, `firstRender`), capability composer selection (`composer` `Set`), service search filters (`svcCap`, `svcQuery`, `shortlist`, `focusSearch`), form prefill (`prefill`, `partnerPrefill`, `lastRef`, `lastName`), runtime DB/auth (`db`, `user`, `uid`, `canEdit`), real-time listener cleanups (`subs`, `inboxUnsub`, `msgUnsub`), community chat (`members`, `chatChannel`, `chatView`, `msgDocs`, `dirQuery`), blog & editor (`posts`, `blogCat`, `ed`), assistant (`ask`), and carousel pause flag (`motionPaused`).

### `localStorage` Keys (`store` helper, `L1482–1485`)

| Key | Format | Purpose |
| --- | --- | --- |
| `cg-shortlist` | JSON `string[]` | Services shortlisted via "Add" buttons; cleared on enquiry submission. |
| `cg-theme` | `'system' \| 'light' \| 'dark'` | User's selected colour theme. |
| `cg-consent` | `{ analytics: boolean, at: ISO }` | Cookie banner choice; controls visibility of `#cookie`. |
| `cg-ref` | `{ code: string, at: epochMs }` | First-touch affiliate referral code (`AFFILIATE.windowDays = 90`). |
| `cg-mediakit` | `{ v: 1, ... }` | Auto-saved draft for the Media Kit Maker. |
| `cg-invite` | `{ v: 1, ... }` | Auto-saved draft for the Event Invite Maker. |
| `cg-waqr` | `{ v: 1, ... }` | Auto-saved draft for the WhatsApp QR Maker. |
| `cg-health` | `{ ans: number[], i: number, done?: boolean }` | Progress and answers for the 14-question Growth Health Check. |

---

## 4. Routing & Page Handlers (`PAGES.*`)

Hash routing is managed by `currentPath()`, `go(hash)`, `resolve(path)`, and `render()` (`L4505–4573`).

- **Affiliate Interception:** Any path matching `#/r/:code[/optional/path]` invokes `setRef(code)` (preserving first-touch code if within 90 days) and rewrites the URL via `history.replaceState`. Query-string `?ref=CODE` is also captured on load by `captureQueryRef()` (`L3224`).
- **Route Cleanup:** On every navigation, `render()` increments `state.routeId` (preventing stale async completions), unsubscribes all `state.subs`, `inboxUnsub`, and `msgUnsub` listeners, resets JSON-LD (`setLD(null)`), closes menus, moves focus to `<h1>` (after initial render), and refreshes the shortlist pill (`updateShortlistUI()`).

### All 31 `PAGES` Handlers & Routes

| Hash Route | Handler | Description |
| --- | --- | --- |
| `#/` | `PAGES.home` | Landing page: Hero + 7-slide SVG Showcase Carousel, Services Marquee, Facts Strip (`42`, `7`, `101`, `1`), Creator Media Kit promo, Hand-offs section, Build/Distribute/Experience band, Capabilities list, Single vs Integrated split, Programme Composer, Proof (`CASES`, `LOGO_SLOTS`, `TESTIMONIAL`), 4-stage Process, Segments, Commitments, Community Teaser, Growth Programs, Latest Blog Posts (when DB connected), CTA band. |
| `#/capabilities` | `PAGES.capabilities` | Overview of all 7 capabilities. |
| `#/capabilities/:slug` | `capPage(c)` | Dynamic page for any of the 7 capability slugs (`brand-marketing`, `technology`, `media-content`, `pr-reputation`, `founder-os`, `events`, `network-experiences`), with jump nav, grouped services + shortlist "Add" buttons, pairs, FAQs, and `OWN_EVENTS` / marketplace interest form on `network-experiences`. |
| `#/solutions`, `#/solutions/:slug` | `PAGES.solutions` | All 6 integrated programmes + Custom Solutions + comparison table (`compareHtml()`). Passing `:slug` scrolls to and highlights `#prog-<slug>`. |
| `#/services` | `PAGES.services` | Live multi-word search and capability chip filter across all 101 services (`ALL_SERVICES`). |
| `#/services/business-website-development` | `PAGES.service` | Reference single-service detail template (used in Phase 2 to template all 101 service pages). |
| `#/who-we-serve` | `PAGES.who` | 8 audience segments (`SEGMENTS`) with recommended starting links. |
| `#/how-we-work` | `PAGES.how` | 13-step process (`PROCESS`), quality standards, team/partner model, comparison table, 6 engagement types (`ENGAGEMENTS`), and "What we won't promise". |
| `#/about` | `PAGES.about` | Story placeholder, mission, vision, 4 core beliefs, and company direction. |
| `#/partners` | `PAGES.partners` | Specialist & vendor network overview (`PARTNER_TYPES`) + application form (`bindPartnerForm`). Accepts prefill from Media Kit Maker (`state.partnerPrefill`). |
| `#/start-a-project` | `PAGES.start` | Main enquiry form (`bindEnquiryForm`) with prefill from Programme Composer, Growth Health Check, Ask Collabify, `cg-shortlist`, and `cg-ref`. |
| `#/thank-you` | `PAGES.thanks` | Confirmation screen showing visitor's first name and generated `CG-...` reference ID. |
| `#/privacy`, `#/terms`, `#/cookies` | `PAGES.privacy`, `PAGES.terms`, `PAGES.cookies` | DPDP Act 2023-structured legal templates + cookie settings trigger. |
| `#/inbox` | `PAGES.inbox` | Owner Admin dashboard (`state.db && state.canEdit`): 8 tabs (`overview`, `enquiries`, `affiliates`, `wlapps`, `applications`, `members`, `partners`, `interest`), pipeline stages, INR values, referral commissions, approvals. |
| `#/community` | `PAGES.community` | Paid membership overview, `Monthly`/`Annual` plans (`COMMUNITY.plans`), 7 channels (`CHANNELS`), 5 rules (`COMM_RULES`). |
| `#/community/join` | `PAGES.join` | 3-step join flow: application form -> payment link step -> active member welcome (live `onSnapshot` status updates). |
| `#/community/chat` | `PAGES.chat` | Active-member-gated real-time chat across 7 channels + searchable member directory. |
| `#/blog` | `PAGES.blog` | Published article list with category chips (`BLOG_CATS`) and editor draft drawer (`state.canEdit`). |
| `#/blog/:slug` | `PAGES.post` | Article reader with safe Markdown rendering, `BlogPosting` JSON-LD, draft preview mode for editors, and up to 3 related posts. |
| `#/blog/write`, `#/blog/write/:slug` | `PAGES.write` | Editor-only Markdown CMS with formatting toolbar, preview tab, slug locking after publish, live SERP snippet preview, and 10-point SEO checklist (`seoChecks()`). |
| `#/tools` | `PAGES.tools` | Hub linking to all 4 free client-side tools. |
| `#/creators`, `#/tools/media-kit` | `PAGES.creators` | Media Kit & Rate Card Maker. |
| `#/c/:code` | `PAGES.card` | Shared Media Kit viewer decoding UTF-8 URL-safe base64 payload (`mkDecode`). |
| `#/tools/invite` | `PAGES.invite` | Event Invite & WhatsApp RSVP Maker. |
| `#/i/:code` | `PAGES.invitePage` | Shared Event Invite viewer (`urlDecodeObj`) with WhatsApp RSVP buttons, Google Maps link, Google Calendar link, and `.ics` download. |
| `#/tools/whatsapp` | `PAGES.waTool` | WhatsApp click-to-chat link builder & printable A5 QR poster generator. |
| `#/health-check` | `PAGES.health` | 14-question Growth Health Check quiz & diagnostic results. |
| `#/affiliates` | `PAGES.affiliates` | Affiliate program overview, application form, and approved partner dashboard (link builder, KPIs, referral table, `#ad` promo kit). |
| `#/white-label` | `PAGES.whitelabel` | Agency white-label overview, NDA/application form, and approved partner brief submission & status tracker portal. |
| *(Fallback)* | `PAGES.notFound` | 404 screen with navigation recovery CTAs. |

*(Note: `PAGES.card`, `PAGES.invitePage`, and `capPage` are separate handlers; `PAGES` has 31 defined properties total: `home`, `capabilities`, `solutions`, `who`, `how`, `about`, `services`, `partners`, `start`, `thanks`, `service`, `privacy`, `terms`, `cookies`, `inbox`, `notFound`, `community`, `join`, `chat`, `blog`, `post`, `write`, `creators`, `card`, `affiliates`, `whitelabel`, `tools`, `invite`, `invitePage`, `waTool`, `health`.)*

---

## 5. `window.claude.use(...)` Runtime Adapter

The prototype was authored for Claude's Artifact runtime (`L1539–1570`), which optionally injects four capabilities:

1. **`claude.use('db')`:** Firestore-like document/collection API supporting `.collection(path)`, `.doc(path)`, `.set()`, `.update()`, `.get()`, `.delete()`, `.where()`, `.orderBy()`, `.limit()`, and `.onSnapshot()`. When unavailable, forms display a fallback message (`sendFailHtml()`) and portals/blog/inbox display setup notices.
2. **`claude.use('user')`:** Provides `user.id()`, `user.canEdit()` (owner/editor role flag), and `user.profiles(ids)` (name & avatar lookup for chat).
3. **`claude.use('sample')`:** Streaming LLM call used by `askSend()` (`L3973`) with `askKnowledge()` prepended to the first user message. Automatically falls back to `askLocal(q)` when absent or failing.
4. **`claude.use('downloads')`:** Used by Media Kit PNG and WhatsApp QR PNG exports (`L3175`, `L3761`), with automatic fallback to `<a download>` blob URL downloads.

---

## 6. Key Module Internals

### Interactive Programme Composer (`L1596–1651`)
- Renders 7 capability toggle buttons in a circular SVG ring (`440×440`, `R = 34%`) connected to a central hub (`One Collabify lead`).
- **Matching Logic (`matchProgramme`):** Computes Jaccard similarity `intersection / union` between selected capabilities and each `PROGRAMMES` entry; matches if score `>= 0.5`. Otherwise suggests a single capability (`len === 1`) or `Custom Solutions`.

### Hero Showcase Carousel (`L1806–1862`)
- 7 inline SVG scenes (`SCENES`, `L1668–1754`), `6500ms` slide duration, `requestAnimationFrame` progress bar.
- Pauses automatically on hover, focus-within, tab hidden, off-screen (`IntersectionObserver` threshold `0.25`), user toggle, or `prefers-reduced-motion: reduce`. Supports pointer swipe (`> 45px`) and Left/Right arrow keys.

### Free Client-Side Tools

1. **Media Kit Maker (`L2887–3209`):**
   - 5 gradient themes (`MK_THEMES`: `sunset`, `indigo`, `ocean`, `berry`, `ink`), 13 Indian/global creator platforms (`MK_PLATFORMS` includes `Moj`, `Josh`, `ShareChat`), 15 niches, 10 deliverable presets.
   - `fmtCount()` formats follower/view counts in Indian numbering (`K`, `M`, `Cr` at `>= 1e7`).
   - `mkRenderPng()` draws onto a `1080px`-wide `<canvas>` (`H >= 1350px`) and exports `image/png`.
   - Share links encode the form state JSON as UTF-8 URL-safe base64 in `#/c/:code`.
2. **Event Invite Maker (`L3573–3708`):**
   - Encodes event details in `#/i/:code`. Live invite generates `https://wa.me/<num>?text=...` RSVP links (requiring guest name input), Google Maps search/custom link, Google Calendar intent URL (`ivGcal`), and client-generated `.ics` file (`ivIcs`).
3. **WhatsApp QR & Poster Maker (`L3711–3818`):**
   - `waNumber()` auto-prepends `91` to 10-digit Indian phone numbers (`11–15` total digits allowed).
   - Uses `window.qrcode(0, 'M')` (`qrcode-generator@1.4.4`) to render crisp `<svg>` preview and `<canvas>` PNG exports: `1240×1754` (A5 printable poster) or `1000×1000` (QR-only).
4. **Growth Health Check (`L3826–3923`):**
   - 14 questions (`HC_QUESTIONS`, 2 per capability, scored `0–3` each; max score `42`).
   - Computes percentage per capability and overall score (`0–100`), assigns band (`>= 70` Strong, `>= 40` Growing with gaps, `< 40` Foundations needed), highlights 3 lowest-scoring capabilities with `HC_ADVICE` service recommendations, matches closest `PROGRAMMES` item, and passes a prefill note to `#/start-a-project`.

### Ask Collabify Assistant (`L3925–4001`)
- Floating bottom-right chat launcher (`#askLaunch`) & dialog (`#askPanel`), max input `600` chars.
- `askKnowledge()` builds a compact system prompt summarizing all 7 capabilities, 101 services, 6 programmes, process, tools, programs, and strict guardrails (no invented prices, timelines, or guarantees; answer in Hindi, Hinglish, or English; max 120 words; `[text](#/...)` links).
- `askLocal(q)` maps 17 Hindi terms (`HI_MAP`, e.g., `वेबसाइट` -> `website`, `कीमत` -> `price`) to English keywords, matches intents (`price`, `affiliate`, `white-label`, `community`, `free`, `process`), or scores services by token overlap across at most 2 results per capability.

---

## 7. Security & Accessibility Highlights

- **XSS Mitigation:** All dynamic values rendered via innerHTML pass through `esc()` (`L1476`). Custom Markdown parser (`mdToHtml()`, `L2629–2645`) escapes HTML *before* applying inline formatting and enforces `safeUrl()` / protocol allowlisting (`https?://`, `mailto:`, `#/` only).
- **WCAG 2.2 AA Patterns:** Skip button, `aria-live="polite"` regions on search counts, composer results, chat log, and assistant messages, `aria-invalid` + error summary focus management (`showErrors()`), `inert` attribute on inactive carousel slides, `focus-visible` rings, keyboard Esc handlers for menus/drawers/dialogs, and `prefers-reduced-motion` media query.

