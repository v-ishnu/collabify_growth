# Supabase Database Deployment & Migrations Guide

This directory contains the complete database schema, security rules, indexes, triggers, and RPC functions for **Collabify Growth**.

## Quickest Setup (1-Minute Copy & Paste)

1. Open your Supabase Project Dashboard:
   - Direct link: [https://supabase.com/dashboard/project/zfphdoveitxlqgepvwap/sql/new](https://supabase.com/dashboard/project/zfphdoveitxlqgepvwap/sql/new)
2. Open the file [`supabase/full_production_schema.sql`](./full_production_schema.sql).
3. Copy its entire contents, paste it into the Supabase SQL Editor, and click **Run**.
4. Run the automated verification check:
   ```bash
   npm run db:verify
   ```
   You will see:
   ```text
   ✅ All 26 tables verified and reachable.
   ✅ Function 'create_enquiry_atomic' exists and executed successfully.
   ```

---

## Alternative: Supabase CLI or Direct Postgres Connection

If you have your PostgreSQL database password or direct connection string (`DATABASE_URL`):

```bash
psql "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -f supabase/full_production_schema.sql
```

Or using the Supabase CLI:

```bash
npx supabase db push
```

---

## What is Included in `full_production_schema.sql`?

1. **Extensions & Types**:
   - `pgcrypto`
   - Custom enums: `user_role`, `pipeline_stage`, `post_status`, `application_status`, `membership_status`, `referral_status`, `brief_status` (all idempotent).
2. **26 Production Tables**:
   - `profiles` (with suspension guards & RBAC)
   - `consent_log` (DPDP compliance audit)
   - `enquiries` (project sales intake)
   - `enquiry_notes` (internal deal notes)
   - `specialist_applications` (partner network)
   - `marketplace_interest` (waitlist intake)
   - `posts` (editorial / blog)
   - `redirects` (301/302 redirects)
   - `community_applications` (paid community membership vetting)
   - `memberships` (active subscriptions & directory)
   - `channels` (community chat spaces)
   - `messages` (community realtime stream)
   - `message_reports` (moderation queue)
   - `payments` (Razorpay ledger)
   - `affiliates` (partner program)
   - `referral_clicks` (telemetry)
   - `referrals` (deal attribution)
   - `payouts` (affiliate payouts)
   - `wl_applications` (white-label agency vetting)
   - `wl_partners` (active white-label agencies)
   - `wl_briefs` (agency briefs)
   - `wl_brief_files` (brief asset metadata)
   - `share_links` (media kit / invites)
   - `health_check_results` (quiz responses)
   - `audit_logs` (admin security trail)
   - `webhook_events` (two-phase webhook idempotency)
3. **Automated Triggers**:
   - `set_updated_at` on all updateable tables
   - `handle_new_user` syncs Supabase `auth.users` into `public.profiles`
4. **Security Definer Helpers**:
   - `current_user_role()`
   - `is_suspended_user()`
   - `is_staff()`
   - `is_admin()`
   - `is_active_member()`
   - `is_active_wl_partner()`
5. **Row Level Security (RLS)**:
   - Full RLS policies for every table with zero leakage
6. **Atomic Transaction RPC**:
   - `create_enquiry_atomic` with all 21 parameters, type-safe array parsing, atomic enquiry + consent + referral + quiz insertion.
7. **Storage Buckets**:
   - `blog-media` (public read, staff insert)
   - `wl-briefs` (private upload/read for active partner and staff)
8. **Realtime Publication**:
   - Supabase Realtime enabled for `messages`
9. **Seed Data**:
   - Default community discussion channels

