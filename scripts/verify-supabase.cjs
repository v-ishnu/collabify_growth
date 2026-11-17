/**
 * Collabify Growth - Supabase Database Verification Script
 * Run with: node scripts/verify-supabase.cjs
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

async function verify() {
  console.log(`\n🔍 Verifying Supabase connection to: ${url}`);
  let missingTables = [];
  let existingTables = [];

  for (const table of EXPECTED_TABLES) {
    const { error } = await admin.from(table).select('*').limit(0);
    if (error) {
      if (error.code === 'PGRST205') {
        missingTables.push(table);
      } else {
        console.log(`⚠️  Table '${table}': ${error.code} - ${error.message}`);
      }
    } else {
      existingTables.push(table);
    }
  }

  console.log(`\n📊 Table Verification: ${existingTables.length}/${EXPECTED_TABLES.length} active.`);
  if (missingTables.length > 0) {
    console.log(`❌ Missing tables (${missingTables.length}):`, missingTables.join(', '));
  } else {
    console.log(`✅ All ${EXPECTED_TABLES.length} tables verified and reachable.`);
  }

  // Test create_enquiry_atomic RPC
  console.log(`\n🔍 Verifying RPC function 'create_enquiry_atomic'...`);
  const { error: rpcErr } = await admin.rpc('create_enquiry_atomic', {
    p_id: 'TEST-CHECK-NONEXISTENT',
    p_name: 'Test',
    p_email: 'test@example.com',
    p_phone: null,
    p_company: 'Test Co',
    p_role: 'Founder',
    p_website: null,
    p_needs: ['Branding'],
    p_shortlist: [],
    p_programme: null,
    p_description: 'Test enquiry check description.',
    p_timeline: 'Immediately',
    p_budget: '₹5L',
    p_source: 'Direct',
    p_partner_ref: null,
    p_utm: null,
    p_consent_updates: false,
    p_consent_whatsapp: false,
    p_policy_version: '2026-04-01',
    p_ip_hash: null,
    p_health_check_answers: null,
  });

  if (rpcErr) {
    if (rpcErr.code === 'PGRST202') {
      console.log(`❌ Function 'create_enquiry_atomic' not found (PGRST202).`);
    } else {
      console.log(`⚠️  RPC response: ${rpcErr.code} - ${rpcErr.message}`);
    }
  } else {
    console.log(`✅ Function 'create_enquiry_atomic' exists and executed successfully.`);
    // Clean up test enquiry
    await admin.from('enquiries').delete().eq('id', 'TEST-CHECK-NONEXISTENT');
  }

  console.log(`\n🏁 Verification completed.\n`);
}

verify().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});

