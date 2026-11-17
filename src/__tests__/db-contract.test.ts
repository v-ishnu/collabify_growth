import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Schema & RPC Contract Verification', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/full_production_schema.sql');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  const EXPECTED_TABLES = [
    'profiles',
    'consent_log',
    'enquiries',
    'enquiry_notes',
    'specialist_applications',
    'marketplace_interest',
    'posts',
    'redirects',
    'community_applications',
    'memberships',
    'channels',
    'messages',
    'message_reports',
    'payments',
    'affiliates',
    'referral_clicks',
    'referrals',
    'payouts',
    'wl_applications',
    'wl_partners',
    'wl_briefs',
    'wl_brief_files',
    'share_links',
    'health_check_results',
    'audit_logs',
    'webhook_events',
  ];

  it('defines all 26 production tables with IF NOT EXISTS in full_production_schema.sql', () => {
    for (const table of EXPECTED_TABLES) {
      const regex = new RegExp(`create table if not exists ${table}\\b`, 'i');
      expect(regex.test(schemaContent), `Table ${table} must be defined in schema`).toBe(true);
    }
  });

  it('enables Row Level Security on all 26 tables in full_production_schema.sql', () => {
    for (const table of EXPECTED_TABLES) {
      const regex = new RegExp(`alter table ${table} enable row level security;`, 'i');
      expect(regex.test(schemaContent), `RLS must be enabled on ${table}`).toBe(true);
    }
  });

  it('defines create_enquiry_atomic RPC with all 21 exact parameters', () => {
    const EXPECTED_PARAMS = [
      'p_id',
      'p_name',
      'p_email',
      'p_phone',
      'p_company',
      'p_role',
      'p_website',
      'p_needs',
      'p_shortlist',
      'p_programme',
      'p_description',
      'p_timeline',
      'p_budget',
      'p_source',
      'p_partner_ref',
      'p_utm',
      'p_consent_updates',
      'p_consent_whatsapp',
      'p_policy_version',
      'p_ip_hash',
      'p_health_check_answers',
    ];

    expect(schemaContent).toContain('create or replace function public.create_enquiry_atomic(');
    for (const param of EXPECTED_PARAMS) {
      expect(schemaContent).toContain(param);
    }

    // Security Definer & Permission check
    expect(schemaContent).toContain('security definer');
    expect(schemaContent).toContain('set search_path = public');
    expect(schemaContent).toContain('grant execute on function public.create_enquiry_atomic(');
    expect(schemaContent).toContain('to service_role, postgres;');
  });

  it('declares the seven core enum types idempotently', () => {
    const EXPECTED_ENUMS = [
      'user_role',
      'pipeline_stage',
      'post_status',
      'application_status',
      'membership_status',
      'referral_status',
      'brief_status',
    ];

    for (const enumName of EXPECTED_ENUMS) {
      expect(schemaContent).toContain(`create type ${enumName} as enum`);
    }
  });
});

