# Collabify Growth website: developer handoff

**Version:** 1.0, October 2026
**Prepared for:** the developer or agency building the production website
**Owner:** Collabify Growth

This kit contains a complete, working front-end prototype of the Collabify Growth website, plus everything needed to turn it into a production site with real accounts, payments, a database and search-engine-friendly pages. Read sections 1 to 4 first; they explain what exists, what doesn’t, and what to build first.

---

## 1. What’s in this kit

| Path | What it is |
| --- | --- |
| `01-DEVELOPER-HANDOFF.md` | This document: requirements, architecture, data model and acceptance criteria |
| `02-OWNER-CONTENT-CHECKLIST.md` | Facts, prices and legal text the owner must supply before launch |
| `website-prototype/index.html` | The full prototype: one self-contained HTML file (about 440 KB). Open it in a browser |
| `brand/` | Logo (original file, SVG versions with dark and white text, the mark as PNG), favicons and `brand-tokens.json` |
| `backend/database-schema.sql` | PostgreSQL schema for every feature |
| `backend/.env.example` | Every environment variable the production build needs |

**Treat the prototype as the specification for design, copy, layout and behaviour.** Match it closely. Change the underlying technology, not the experience.

---

## 2. What the prototype is, and what it isn’t

The prototype is a single-page application written in plain HTML, CSS and JavaScript (no framework, no build step). It uses hash routing (`#/capabilities/technology`) and keeps all content in JavaScript constants.

It was built and tested inside Claude’s artifact runtime, which supplied a few services through `window.claude.use(...)`. **Those services don’t exist on a normal web host and must be replaced:**

| Prototype service | Used for | Replace with |
| --- | --- | --- |
| `claude.use('db')` | Saving enquiries, applications, blog posts, community chat, affiliate and white-label data; the owner inbox | Your database and API (schema in `backend/database-schema.sql`) |
| `claude.use('user')` | Who is signed in; owner vs. editor vs. member | Your authentication provider and the `profiles.role` column |
| `claude.use('sample')` | The “Ask Collabify” AI assistant | A server route calling the Anthropic API (section 6.11) |
| `claude.use('downloads')` | Saving generated PNG images | Not needed: the code already falls back to a normal browser download |

**Already production-ready as front-end code** (works on any host today): all marketing pages, the services search and shortlist, the composer, the carousel, theme switching, the cookie banner, the Media Kit maker, Event Invite maker, WhatsApp QR maker and Growth Health Check (all run fully in the browser).

### Where things live in `index.html`

| Block | Contents |
| --- | --- |
| `<style>` in `<head>` | All CSS, organised by section. Design tokens at the top (`:root`), dark theme below |
| First `<script>` (LOGO) | Logo vector path and the mark image |
| Second `<script>` (CONTENT) | All site copy and data: `CAPS` (7 capabilities, 100 services), `PROGRAMMES`, `SEGMENTS`, `PROCESS`, `COMMUNITY`, `CHANNELS`, `AFFILIATE`, `WHITELABEL`, `CONTACT`, `CASES`, `OWN_EVENTS` |
| Third `<script>` (APP) | Router, pages (`PAGES.*`), forms and validation, the owner inbox, community, blog, tools, affiliate, white-label, health check and assistant |

Square brackets in copy, such as `[email]`, are placeholders. The site renders them with a dashed yellow highlight so nothing unfinished can slip through. **The site must not launch with any visible placeholder.**

---

## 3. Recommended architecture

These are recommendations, chosen for SEO, speed of delivery and Indian payments. Equivalent choices are fine if you explain the trade-off.

| Layer | Recommendation | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) with TypeScript | Server rendering and static pages for SEO; one codebase for site, admin and API |
| Hosting | Vercel (or any Node host) | Simple deploys, previews per branch |
| Database and auth | Supabase (Postgres, Auth, Realtime, Storage, row-level security) | Matches the schema; realtime chat and file uploads included |
| Payments | Razorpay Subscriptions plus webhooks | Indian cards, UPI and recurring payments for community memberships |
| Email | Resend, Amazon SES or Postmark | Enquiry notifications, confirmations, approval emails |
| AI assistant | Anthropic API through a server route | Keeps the key off the browser; rate-limited |
| Spam protection | Cloudflare Turnstile or reCAPTCHA | On every public form |
| Analytics | GA4 or Plausible, loaded only after cookie consent | Matches the cookie banner |
| Monitoring | Sentry | Front-end and API errors |
| Content | Keep content in typed constants or JSON files at launch | A headless CMS can come later if non-developers need to edit pages |

Suggested structure:

```
app/
  (site)/            public pages, server-rendered
  admin/             owner inbox, pipeline, overview, approvals (role-protected)
  api/               enquiries, applications, assistant, webhooks/razorpay, r/[code]
content/             capabilities.ts, programmes.ts, segments.ts ... (moved from the CONTENT script)
components/          header, mega menu, footer, carousel, composer, forms, cards
lib/                 db, auth, email, razorpay, anthropic, validation, referral cookie
```

---

## 4. Delivery phases

Build in this order. Each phase should be shippable on its own.

### Phase 1: launch (must have)

1. Port all public pages to real URLs with server rendering (section 5), matching the prototype exactly.
2. Enquiry form saved to the database, with an email to the team, a confirmation email to the visitor, spam protection and consent logging.
3. Specialist application and marketplace-interest forms saved and emailed.
4. Owner admin: sign-in, enquiry inbox with stages and deal values, the Overview dashboard, approvals.
5. Blog with server-rendered posts, the built-in editor (admin only), sitemap and structured data.
6. Free tools (already client-side) moved into components; share links for media kits and invites.
7. Affiliate link tracking (`/r/CODE`), codes, attribution on enquiries, manual approval.
8. Ask Collabify assistant through the server route, with the fallback search.
9. SEO, analytics with consent, legal pages, performance and accessibility targets (sections 8 to 10).

### Phase 2: accounts and payments

1. Community: sign-up, application, Razorpay subscription, webhook-driven access, realtime chat, directory, moderation.
2. Affiliate dashboard, commission ledger and payouts.
3. White-label partner portal with file uploads and status notifications.
4. Short links and generated social images (Open Graph) for media kits and invites.
5. WhatsApp notifications for the team (optional) and CRM sync (optional).

### Phase 3: platform (only after demand is proven)

Client portal for project tracking, the Distribution Marketplace (service #100) and anything else in the owner’s platform roadmap.

---

## 5. Routes

Replace hash routes with real paths. Keep 301 redirects from any old URLs.

| Prototype route | Production path | Rendering |
| --- | --- | --- |
| `#/` | `/` | Static |
| `#/capabilities`, `#/capabilities/:slug` | same paths | Static (7 pages) |
| `#/services` | `/services` | Static, client-side search |
| `#/services/business-website-development` | `/services/[slug]` | Static; template for all 101 service pages in phase 2 |
| `#/solutions`, `#/solutions/:slug` | `/solutions`, `/solutions/[slug]` | Static |
| `#/who-we-serve`, `#/how-we-work`, `#/about` | same | Static |
| `#/partners` | `/partners` | Static plus form |
| `#/start-a-project`, `#/thank-you` | same | Static plus form |
| `#/privacy`, `#/terms`, `#/cookies` | same | Static |
| `#/blog`, `#/blog/:slug` | same | Server-rendered or incremental static regeneration |
| `#/blog/write`, `#/blog/write/:slug` | `/admin/blog/new`, `/admin/blog/[slug]` | Admin only |
| `#/community`, `/join`, `/chat` | `/community`, `/community/join`, `/community/chat` | Join and chat require sign-in |
| `#/creators` | `/tools/media-kit` (redirect `/creators`) | Static, client-side tool |
| `#/c/:code` | `/c/[id]` | Server-rendered from `share_links` (keep decoding old long codes) |
| `#/tools`, `#/tools/invite`, `#/tools/whatsapp` | same | Static, client-side tools |
| `#/i/:code` | `/i/[id]` | Server-rendered from `share_links` |
| `#/health-check` | `/health-check` | Static, client-side |
| `#/affiliates`, `#/white-label` | same | Static plus signed-in dashboards |
| `#/r/:code[/path]` | `/r/[code]?to=/path` | API route: set cookie, redirect |
| `#/inbox` | `/admin` | Admin only |

---

## 6. Feature requirements

Each feature lists what the prototype already does, what production needs, and how to check it’s done.

### 6.1 Public pages and content

- **Prototype:** home (carousel, services marquee, facts strip, creator band, hand-offs, Build/Distribute/Experience band, capabilities list, programme composer, proof, process, segments, commitments, community teaser, growth programs, latest posts), 7 capability pages, solutions, who we serve, how we work (with comparison table), about, partners, legal pages, 404.
- **Production:** port to components. Content stays in typed files generated from the CONTENT script, so copy changes don’t touch layout code.
- **Done when:** every page matches the prototype at 1440 px, 1024 px and 390 px widths, in light and dark themes, with no horizontal scrolling.

### 6.2 Services catalogue, search and shortlist

- **Prototype:** 101 services (100 in capabilities plus custom solutions #101). Search and filter on `/services`. “Add” buttons build a shortlist that follows the visitor to the enquiry form (stored in `localStorage`).
- **Production:** keep as is. In phase 2, generate one page per service from the template in `/services/business-website-development`.
- **Done when:** the services page shows 101 services, and counts per capability are 25, 15, 12, 10, 10, 13, 15 and 1.

### 6.3 Enquiry form (Start a Project)

- **Prototype:** full validation and error summary; shortlist and composer prefill; referral code field prefilled from the affiliate cookie; separate unticked consent boxes.
- **Production:**
  - API route validates on the server as well (same rules as the prototype).
  - Save to `enquiries`; write each consent to `consent_log`; save a `referrals` row when `partner_ref` matches an active code.
  - Email the team (`TEAM_NOTIFY_EMAIL`) with the full enquiry, and send the visitor a confirmation with their reference.
  - Capture UTM parameters and the landing page.
  - Spam protection (Turnstile) and a rate limit per IP.
- **Done when:** a test enquiry appears in the admin, both emails arrive, and a referred enquiry shows the partner code.

### 6.4 Owner admin (inbox, pipeline, overview)

- **Prototype:** tabs for Overview, enquiries, affiliates, white-label partners, community applications, members, specialist applications and marketplace interest. Enquiries have stage, deal value, referral status and commission controls. Overview shows the key numbers and charts.
- **Production:**
  - Protected under `/admin` for `owner` and `admin` roles. Require two-factor sign-in for these roles.
  - Add internal notes (`enquiry_notes`), assignment to a team member, search, filters and CSV export.
  - Approval actions send emails: affiliate approved (with link), partner approved, community access granted.
- **Done when:** every action in the prototype works, changes are visible to the affected user, and non-admins can’t reach `/admin` or its API.

### 6.5 Blog

- **Prototype:** list with categories, post pages with structured data, related posts, an admin editor with formatting toolbar, preview, Google search preview and a 10-point SEO checklist. Drafts and publishing. Web address locked after publishing.
- **Production:**
  - Server-render posts at `/blog/[slug]` with title, meta description, canonical URL, Open Graph tags and `BlogPosting` structured data.
  - Images: add uploads to Storage, with alt text required.
  - Add posts to `sitemap.xml` and an RSS feed. Ping Search Console through the sitemap.
  - If a slug ever changes, write a row to `redirects`.
- **Done when:** a published post is indexable (view source shows the content), passes the Rich Results Test and appears in the sitemap.

### 6.6 Community (paid membership)

- **Prototype:** landing page, plans, application form, payment step (links to a payment page), owner approval, live chat in 7 channels, member directory, message deletion.
- **Production:**
  1. Sign-in (email one-time code and Google).
  2. Application saved to `community_applications`.
  3. Payment with Razorpay Subscriptions (monthly and annual plans). **Access is granted by the webhook, not by the browser:** on `subscription.activated` and `subscription.charged`, create or extend `memberships`; on cancellation or failed renewal, update the status.
  4. Owner can still approve or decline applications manually (keep the prototype’s flow as an option).
  5. Realtime chat (Supabase Realtime or equivalent). Members delete their own messages; admins delete any message. Add “Report message”.
  6. Directory shows only active members, and only the fields they agreed to share.
  7. Emails: application received, payment receipt, access granted, renewal reminder, payment failed.
- **Done when:** a test payment in Razorpay test mode grants access within seconds, a cancelled subscription removes access at period end, and a non-member can’t read messages through the API.

### 6.7 Free tools

| Tool | Prototype | Production additions |
| --- | --- | --- |
| Growth Health Check | 14 questions, score, bars, priorities, programme match, share, prefilled enquiry | Save results only when the visitor sends an enquiry (`health_check_results`) |
| Media kit maker | Form, live preview, 5 designs, PNG export via canvas, share link (data in URL), opt-in to creator network | Short links stored in `share_links` (`/c/ab12cd`); Open Graph image of the card |
| Event invite maker | Form, preview, invite page with WhatsApp RSVP, Google Calendar and .ics | Short links (`/i/ab12cd`); Open Graph image; optional RSVP counter for the host |
| WhatsApp QR maker | Link builder, QR (qrcode-generator 1.4.4), printable A5 poster PNG | None required. Keep the QR library pinned |

Every tool output carries the “Made free with Collabify” credit. **Keep it:** it’s the growth loop.

### 6.8 Affiliate program

- **Prototype:** landing page, application, owner approval generating a unique code, link builder for any page, results and referrals table, promo captions with `#ad`, first-touch 90-day attribution, enquiry form prefill, owner sets referral status and commission.
- **Production:**
  - `/r/[code]` route: validate the code, set a first-party cookie for 90 days (first touch wins), log to `referral_clicks`, redirect to `to`.
  - Read the cookie on the server when saving enquiries.
  - Commission ledger in `referrals` and `payouts`. Dashboard totals come from these tables.
  - Collect payout details (UPI or bank) after approval; encrypt them; show only the last 4 characters in the admin.
  - Fraud checks: block self-referral (same email or phone as the affiliate), flag many enquiries from one IP.
- **Done when:** a click on an affiliate link, followed by an enquiry days later, shows the code on the enquiry; marking it “Won” updates the affiliate’s dashboard.

### 6.9 White-label program

- **Prototype:** landing page, application, owner approval, partner portal with brief form and live statuses, owner status updates.
- **Production:** file uploads on briefs (Storage, private bucket), email on every status change, NDA signing (an e-sign service such as Digio or Leegality, or a signed PDF upload), and a partner manager assigned to each partner.
- **Done when:** a partner can submit a brief with files, the owner updates the status, and the partner gets an email and sees the change.

### 6.10 Specialist network and marketplace interest

Forms already exist; save them to `specialist_applications` and `marketplace_interest`, email the team, and show them in the admin. The media kit’s “Join the creator network” button prefills the specialist form.

### 6.11 Ask Collabify assistant

- **Prototype:** floating chat panel with suggestions, streaming answers, links to the right pages, “Start a Project with this”, Hindi and English, and a keyword fallback when AI isn’t available. The system prompt is built by `askKnowledge()` from the content data.
- **Production:**
  - `POST /api/assistant`: takes the conversation (maximum 12 turns, 600 characters per message), adds the system prompt on the server, calls the Anthropic Messages API with `ANTHROPIC_MODEL`, and streams the reply.
  - Rate-limit per visitor (`ASSISTANT_RATE_LIMIT_PER_HOUR`) and cap tokens per reply.
  - Keep the fallback search for errors and limits.
  - Don’t store conversations unless the visitor sends an enquiry from the chat.
- **Done when:** answers stream, include working internal links, never state prices or guarantees, and the fallback responds when the API key is removed.

### 6.12 Cookie consent and theme

Keep the banner, its three buttons and “Cookie settings” in the footer. Load analytics only after consent and remember the choice. Keep the System, Light and Dark theme switch.

---

## 7. Data model and access rules

Full schema: `backend/database-schema.sql`.

| Data | Who can read | Who can write |
| --- | --- | --- |
| Enquiries, specialist and marketplace forms | Admin | Public through the API only (server validation, spam check) |
| Blog posts | Public (published only) | Editor and admin |
| Community applications | The applicant (own row), admin | The applicant (own row), admin |
| Memberships and directory | Active members (directory fields only), admin | Payment webhook and admin |
| Messages | Active members and admin | Active members (own messages); admin deletes any |
| Affiliate application | The affiliate (own row), admin | The affiliate (own row) |
| Affiliate code, referrals, payouts | The affiliate (own), admin | Admin and server only |
| White-label application and partner record | The partner (own), admin | Partner (application), admin (approval) |
| White-label briefs and files | The partner (own), admin | Partner (create), admin (status) |

Enforce these with row-level security in the database, not only in the interface.

---

## 8. SEO requirements

- Real URLs, server-rendered HTML for every public page, one `<h1>` per page.
- Titles and meta descriptions: use the values in the prototype (`title` and `desc` of each page).
- Canonical tags, Open Graph and Twitter tags, a default social image built from the brand.
- `sitemap.xml` (pages, capabilities, solutions, posts) and `robots.txt`. Noindex for `/thank-you`, `/admin`, share links (`/c/*`, `/i/*`) and the 404 page.
- Structured data: `Organization` (site-wide), `Service` (capability and service pages), `FAQPage` (pages with FAQs), `BlogPosting` (posts), `BreadcrumbList`.
- Verify the domain in Google Search Console and Bing Webmaster Tools and submit the sitemap.
- Google Business Profile for the office address (owner task).
- Pending owner decision: whether SEO becomes service #102 (marked `[SEO]` in copy).

## 9. Performance and accessibility targets

- Lighthouse on mobile: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 100.
- Core Web Vitals: LCP under 2.5 s, CLS under 0.1, INP under 200 ms.
- Self-host the two Google fonts (`next/font`); preload the display font.
- WCAG 2.2 AA: keep everything the prototype already does (skip link, focus styles, labelled controls, error summaries, `aria-live` regions, reduced-motion support, pause control on the carousel). Test with a screen reader and keyboard only.
- Images: modern formats, explicit sizes, lazy loading below the fold.

## 10. Security and compliance

- **DPDP Act, 2023 and its Rules:** record every consent in `consent_log`, honour withdrawal, publish a privacy notice and a grievance contact, set retention periods and delete data when they expire. Confirm details with the owner’s lawyer.
- **Statutory details:** if Collabify is a registered company, show the details company law requires on the website. Confirm with the company secretary or CA.
- **Payments:** card and UPI data never touch our servers (Razorpay handles them). Verify every webhook signature.
- **Secrets:** server-only keys never reach the browser. Use the hosting provider’s secret store.
- **User content** (chat, blog, briefs, share links): escape everything rendered. The prototype’s `esc()` and safe Markdown renderer show the expected behaviour. Allow only `https://`, `mailto:` and internal links.
- **Forms:** server validation, spam protection and rate limits.
- **Admin:** two-factor sign-in, audit log of approvals and deletions.
- **Backups:** daily database backups with a tested restore.
- **Advertising disclosure:** keep the `#ad` guidance in the affiliate program (ASCI guidelines).

---

## 11. Accounts the owner must create

The developer should not create these in their own name. The owner creates them and gives the developer access.

| Account | Purpose |
| --- | --- |
| Domain registrar and DNS (for example Cloudflare) | Domain, DNS, email records (SPF, DKIM, DMARC) |
| Business email (Google Workspace or Microsoft 365) | Team mailboxes and sending domain |
| Hosting (for example Vercel) | Website and API |
| Database (for example Supabase) | Data, auth, storage, realtime |
| Razorpay (with business KYC) | Membership payments |
| Email sending service | Notifications |
| Anthropic API | Assistant |
| Google Search Console, GA4 | SEO and analytics |
| Sentry | Error monitoring |
| WhatsApp Business Platform (optional) | Notifications |
| GitHub (owner’s organisation) | Code ownership; developer added as a collaborator |

**Ownership:** the code, accounts and data belong to Collabify Growth. Put this in the development contract.

---

## 12. Testing and acceptance

The prototype was tested end to end. Repeat these scenarios on staging before launch:

1. Enquiry from the composer with a shortlist and a referral cookie: saved, emailed, code attached.
2. Health Check: 14 answers, result, “Discuss my results” prefills the enquiry.
3. Affiliate: apply → approve → link click → enquiry → mark “Won” with commission → appears on the affiliate dashboard.
4. White-label: apply → approve → brief with file → status update → partner email.
5. Community: apply → Razorpay test payment → access granted by webhook → chat → cancel → access ends.
6. Blog: draft → publish → indexable page → in sitemap.
7. Tools: media kit PNG download, invite link and RSVP links, QR poster scans to the right WhatsApp chat.
8. Assistant: streaming answer with links; fallback when the API is unavailable.
9. Every form: required fields, error summary, keyboard-only completion.
10. Browsers: Chrome, Safari (iOS and macOS), Firefox, Samsung Internet. Widths 360 to 1920 px. Light and dark themes.

---

## 13. Design rules to keep

- Fonts: Bricolage Grotesque (headings), Instrument Sans (body). Colours and spacing from `brand/brand-tokens.json`.
- The orange accent comes from the logo (`#FF9D3E`). Don’t introduce new brand colours.
- Copy rules: sentence case, plain English, no guarantees of rankings, coverage, virality or registrations, no invented numbers or client names.
- Illustrations in the carousel are inline SVG. Real photography can replace or join them once the owner supplies it.

## 14. Questions to settle at kickoff

1. Final domain, and whether the blog lives at `/blog`.
2. Who on the team uses the admin, and with which roles.
3. Community prices, payment links or plans, refund policy and confirmation time.
4. Affiliate commission, payout terms and minimum; white-label pricing.
5. Whether to connect a CRM (HubSpot, Zoho) in phase 1 or phase 2.
6. Whether WhatsApp notifications are needed at launch.
7. Who writes the legal pages, and when they’ll be ready.

All owner-supplied content is listed in `02-OWNER-CONTENT-CHECKLIST.md`.
