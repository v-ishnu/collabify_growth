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

export interface AdminReportJoined extends MessageReportRow {
  message?: Pick<MessageRow, 'id' | 'channel_id' | 'user_id' | 'body' | 'created_at' | 'deleted_at'> | null;
}

export interface AdminDashboardBundle {
  role: ProfileRow['role'];
  enquiries: EnquiryRow[];
  enquiryNotes: Record<string, EnquiryNoteRow[]>;
  affiliates: AffiliateRow[];
  referrals: ReferralRow[];
  payouts: PayoutRow[];
  wlApplications: WlApplicationRow[];
  wlPartners: WlPartnerRow[];
  wlBriefs: WlBriefRow[];
  wlBriefFiles: Record<string, WlBriefFileRow[]>;
  communityApps: CommunityApplicationRow[];
  memberships: MembershipRow[];
  specialists: SpecialistApplicationRow[];
  marketplaceInterest: MarketplaceInterestRow[];
  posts: PostRow[];
  reports: AdminReportJoined[];
  payments: PaymentRow[];
  users: ProfileRow[];
  auditLogs: AuditLogRow[];
}

