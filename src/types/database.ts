export type UserRole = 'owner' | 'admin' | 'editor' | 'user';
export type PipelineStage = 'New' | 'Contacted' | 'Proposal sent' | 'Won' | 'Lost';
export type PostStatus = 'draft' | 'published';
export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'removed';
export type MembershipStatus = 'active' | 'past_due' | 'cancelled' | 'expired';
export type ReferralStatus =
  | 'Lead'
  | 'Proposal sent'
  | 'Won'
  | 'Commission paid'
  | 'Not converted';
export type BriefStatus =
  | 'Received'
  | 'Scoping'
  | 'Quoted'
  | 'In progress'
  | 'Delivered'
  | 'On hold';

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_suspended?: boolean;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ConsentLogRow {
  id: number;
  email: string;
  purpose: string;
  granted: boolean;
  source: string;
  policy_version: string;
  ip_hash: string | null;
  created_at: string;
}

export interface EnquiryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  role: string;
  website: string | null;
  needs: string[];
  shortlist: string[];
  programme: string | null;
  description: string;
  timeline: string;
  budget: string;
  source: string | null;
  partner_ref: string | null;
  utm: Record<string, unknown> | null;
  consent_updates: boolean;
  consent_whatsapp: boolean;
  stage: PipelineStage;
  value_inr: number | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryNoteRow {
  id: number;
  enquiry_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface SpecialistApplicationRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  partner_type: string;
  availability: string;
  capabilities: string[];
  portfolio: string;
  rate: string | null;
  audience: string | null;
  status: string;
  created_at: string;
}

export interface MarketplaceInterestRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string;
  audiences: string | null;
  status?: string;
  created_at: string;
}

export interface PostRow {
  slug: string;
  title: string;
  category: string | null;
  author_name: string;
  author_id: string | null;
  focus_keyword: string | null;
  seo_title: string | null;
  seo_description: string | null;
  body_md: string;
  read_mins: number;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RedirectRow {
  from_path: string;
  to_path: string;
  status?: number;
  created_at: string;
}

export interface CommunityApplicationRow {
  user_id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  city: string;
  linkedin: string | null;
  working_on: string;
  interests: string[];
  plan: 'monthly' | 'annual';
  status: ApplicationStatus;
  created_at: string;
}

export interface MembershipRow {
  user_id: string;
  plan: string;
  status: MembershipStatus;
  razorpay_subscription_id: string | null;
  current_period_end: string | null;
  started_at: string;
  cancelled_at: string | null;
  display_name: string;
  role: string | null;
  company: string | null;
  city: string | null;
  linkedin: string | null;
  interests: string[];
  working_on: string | null;
  updated_at?: string;
}

export interface ChannelRow {
  id: string;
  name: string;
  description: string;
  sort_order: number;
}

export interface MessageRow {
  id: string;
  channel_id: string;
  user_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface MessageReportRow {
  id: number;
  message_id: string;
  reporter_id: string;
  reason: string | null;
  resolved?: boolean;
  resolved_by?: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string | null;
  purpose: string;
  amount_paise: number;
  currency: string;
  status: string;
  razorpay_subscription_id: string | null;
  raw: Record<string, unknown>;
  created_at: string;
}

export interface AffiliateRow {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  share_channels: string[];
  audience: string;
  link: string | null;
  status: ApplicationStatus;
  code: string | null;
  payout_details: Record<string, unknown> | null;
  approved_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReferralClickRow {
  id: number;
  code: string;
  landing_path: string;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ReferralRow {
  enquiry_id: string;
  code: string;
  status: ReferralStatus;
  commission_inr: number | null;
  updated_at: string;
}

export interface PayoutRow {
  id: number;
  affiliate_id: string;
  amount_inr: number;
  method: string;
  reference: string | null;
  paid_at: string;
}

export interface WlApplicationRow {
  user_id: string;
  company: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  city: string;
  capabilities: string[];
  volume: string;
  notes: string | null;
  nda_agreed?: boolean;
  nda_agreed_at?: string | null;
  status: ApplicationStatus;
  created_at: string;
}

export interface WlPartnerRow {
  user_id: string;
  company: string;
  status: string;
  pricing_notes: string | null;
  nda_signed_at: string | null;
  manager_id: string | null;
  created_at: string;
}

export interface WlBriefRow {
  id: string;
  partner_id: string;
  title: string;
  industry: string;
  capability: string;
  services: string;
  due_date: string | null;
  budget: string;
  details: string;
  branding: string | null;
  status: BriefStatus;
  created_at: string;
  updated_at: string;
}

export interface WlBriefFileRow {
  id: number;
  brief_id: string;
  storage_path: string;
  uploaded_by: string | null;
  file_name?: string;
  mime_type?: string | null;
  byte_size?: number | null;
  created_at: string;
}

export interface ShareLinkRow {
  id: string;
  kind: 'mediakit' | 'invite';
  payload: Record<string, unknown>;
  created_at: string;
}

export interface HealthCheckResultRow {
  id: number;
  enquiry_id: string | null;
  answers: number[];
  total_score: number;
  created_at: string;
}

export interface AuditLogRow {
  id: number | string;
  actor_id: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_hash: string | null;
  created_at: string;
}

export interface WebhookEventRow {
  id: number | string;
  provider: string;
  event_id: string;
  event_type: string;
  status?: 'processing' | 'processed' | 'failed';
  error_message?: string | null;
  payload: Record<string, unknown>;
  processed_at: string;
}
