import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isAdminRole } from '@/lib/supabase/server';
import type { AdminDashboardBundle, AdminReportJoined } from '@/features/admin/types';
import type {
  AffiliateRow,
  AuditLogRow,
  CommunityApplicationRow,
  EnquiryNoteRow,
  EnquiryRow,
  MarketplaceInterestRow,
  MembershipRow,
  MessageReportRow,
  MessageRow,
  PaymentRow,
  PayoutRow,
  PostRow,
  ProfileRow,
  ReferralRow,
  SpecialistApplicationRow,
  WlApplicationRow,
  WlBriefFileRow,
  WlBriefRow,
  WlPartnerRow,
} from '@/types/database';

export async function loadAdminDashboardBundle(
  role: ProfileRow['role'],
): Promise<AdminDashboardBundle> {
  const admin = getSupabaseAdminClient();
  const empty: AdminDashboardBundle = {
    role,
    enquiries: [],
    enquiryNotes: {},
    affiliates: [],
    referrals: [],
    payouts: [],
    wlApplications: [],
    wlPartners: [],
    wlBriefs: [],
    wlBriefFiles: {},
    communityApps: [],
    memberships: [],
    specialists: [],
    marketplaceInterest: [],
    posts: [],
    reports: [],
    payments: [],
    users: [],
    auditLogs: [],
  };
  if (!admin) return empty;

  const isAdmin = isAdminRole(role);

  const [
    enqRes,
    notesRes,
    affRes,
    refRes,
    payOutRes,
    wlAppRes,
    wlPartRes,
    wlBriefRes,
    commAppRes,
    memRes,
    specRes,
    mktRes,
    postRes,
    repRes,
  ] = await Promise.all([
    admin.from('enquiries').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('enquiry_notes').select('*').order('created_at', { ascending: true }).limit(500),
    admin.from('affiliates').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('referrals').select('*').order('updated_at', { ascending: false }).limit(200),
    admin.from('payouts').select('*').order('paid_at', { ascending: false }).limit(200),
    admin.from('wl_applications').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('wl_partners').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('wl_briefs').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('community_applications').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('memberships').select('*').order('started_at', { ascending: false }).limit(200),
    admin.from('specialist_applications').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('marketplace_interest').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('posts').select('*').order('updated_at', { ascending: false }).limit(200),
    admin.from('message_reports').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  const notesByEnq: Record<string, EnquiryNoteRow[]> = {};
  for (const n of (notesRes.data as EnquiryNoteRow[]) || []) {
    if (!notesByEnq[n.enquiry_id]) notesByEnq[n.enquiry_id] = [];
    notesByEnq[n.enquiry_id]!.push(n);
  }

  const rawReports = (repRes.data as MessageReportRow[]) || [];
  let joinedReports: AdminReportJoined[] = rawReports;
  if (rawReports.length > 0) {
    const msgIds = Array.from(new Set(rawReports.map((r) => r.message_id)));
    const { data: msgData } = await admin
      .from('messages')
      .select('id, channel_id, user_id, body, created_at, deleted_at')
      .in('id', msgIds);
    const msgMap = Object.fromEntries(((msgData as MessageRow[]) || []).map((m) => [m.id, m]));
    joinedReports = rawReports.map((r) => ({ ...r, message: msgMap[r.message_id] || null }));
  }

  const wlBriefs = (wlBriefRes.data as WlBriefRow[]) || [];
  const wlBriefFiles: Record<string, WlBriefFileRow[]> = {};
  if (wlBriefs.length > 0) {
    const briefIds = wlBriefs.map((b) => b.id);
    const { data: filesData } = await admin
      .from('wl_brief_files')
      .select('*')
      .in('brief_id', briefIds)
      .order('created_at', { ascending: false });
    for (const f of (filesData as WlBriefFileRow[]) || []) {
      if (!wlBriefFiles[f.brief_id]) wlBriefFiles[f.brief_id] = [];
      wlBriefFiles[f.brief_id]!.push(f);
    }
  }

  let payments: PaymentRow[] = [];
  let users: ProfileRow[] = [];
  let auditLogs: AuditLogRow[] = [];
  if (isAdmin) {
    const [pRes, uRes, aRes] = await Promise.all([
      admin.from('payments').select('*').order('created_at', { ascending: false }).limit(150),
      admin.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
      admin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(150),
    ]);
    payments = (pRes.data as PaymentRow[]) || [];
    users = (uRes.data as ProfileRow[]) || [];
    const emailById = Object.fromEntries(users.map((u) => [u.id, u.email]));
    auditLogs = ((aRes.data as AuditLogRow[]) || []).map((log) => ({
      ...log,
      actor_email: log.actor_id ? emailById[log.actor_id] ?? null : null,
    }));
  }

  return {
    role,
    enquiries: (enqRes.data as EnquiryRow[]) || [],
    enquiryNotes: notesByEnq,
    affiliates: ((affRes.data as AffiliateRow[]) || []).map((a) => ({
      ...a,
      payout_details: null,
    })),
    referrals: (refRes.data as ReferralRow[]) || [],
    payouts: (payOutRes.data as PayoutRow[]) || [],
    wlApplications: (wlAppRes.data as WlApplicationRow[]) || [],
    wlPartners: (wlPartRes.data as WlPartnerRow[]) || [],
    wlBriefs,
    wlBriefFiles,
    communityApps: (commAppRes.data as CommunityApplicationRow[]) || [],
    memberships: (memRes.data as MembershipRow[]) || [],
    specialists: (specRes.data as SpecialistApplicationRow[]) || [],
    marketplaceInterest: (mktRes.data as MarketplaceInterestRow[]) || [],
    posts: (postRes.data as PostRow[]) || [],
    reports: joinedReports,
    payments,
    users,
    auditLogs,
  };
}

