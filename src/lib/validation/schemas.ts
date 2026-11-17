import { z } from 'zod';

const cleanText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

export const enquirySchema = z.object({
  name: cleanText(120),
  email: z.string().trim().email().max(200),
  phone: optionalText(32),
  company: cleanText(140),
  role: cleanText(100),
  website: optionalText(240),
  partnerRef: z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    .transform((v) => (v ? v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) : null)),
  needs: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  shortlist: z.array(z.string().trim().min(1).max(160)).max(50).optional().default([]),
  programme: optionalText(120),
  description: z.string().trim().min(20).max(4000),
  timeline: cleanText(100),
  budget: cleanText(100),
  source: optionalText(120),
  consentPrivacy: z.literal(true),
  consentUpdates: z.boolean().optional().default(false),
  consentWhatsApp: z.boolean().optional().default(false),
  turnstileToken: z.string().max(4096).optional().default(''),
  utm: z.record(z.string(), z.string().max(240)).optional(),
  healthCheckAnswers: z.array(z.number().int().min(0).max(3)).min(1).max(30).optional(),
});

export const partnerApplicationSchema = z.object({
  name: cleanText(120),
  email: z.string().trim().email().max(200),
  phone: optionalText(32),
  city: cleanText(100),
  partnerType: cleanText(100),
  availability: cleanText(100),
  capabilities: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  portfolioUrl: cleanText(300),
  rate: optionalText(120),
  audience: optionalText(1000),
  consent: z.literal(true),
  turnstileToken: z.string().max(4096).optional().default(''),
});

export const marketplaceInterestSchema = z.object({
  name: cleanText(120),
  email: z.string().trim().email().max(200),
  city: optionalText(100),
  company: optionalText(140),
  role: cleanText(100),
  note: optionalText(1500),
  consent: z.literal(true),
  turnstileToken: z.string().max(4096).optional().default(''),
});

export const shareLinkCreateSchema = z.object({
  kind: z.enum(['mediakit', 'invite']),
  payload: z.record(z.string(), z.unknown()),
});

export const healthCheckSaveSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(30),
  total_score: z.number().int().min(0).max(100),
  enquiry_id: optionalText(40),
});

export const blogPostUpsertSchema = z.object({
  title: cleanText(220),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid post slug'),
  category: optionalText(80),
  author_name: z.string().trim().min(1).max(120).optional().default('Collabify Growth team'),
  focus_keyword: optionalText(120),
  seo_title: optionalText(160),
  seo_description: optionalText(320),
  body_md: z.string().trim().min(1).max(120_000),
  read_mins: z.number().int().min(1).max(120).optional().default(1),
  action: z.enum(['draft', 'publish', 'update', 'unpublish']),
});

export const communityApplySchema = z.object({
  plan: z.enum(['monthly', 'annual']),
  name: cleanText(120),
  email: z.string().trim().email().max(200),
  role: cleanText(120),
  company: cleanText(140),
  city: cleanText(100),
  linkedin: optionalText(300),
  working_on: z.string().trim().min(10).max(2000),
  interests: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  consent_rules: z.literal(true),
  consent_directory: z.boolean().optional().default(true),
  consent_privacy: z.literal(true),
});

export const communityMessageSchema = z.object({
  channel_id: z.enum([
    'introductions',
    'general',
    'growth',
    'tech',
    'hiring',
    'collabs',
    'events',
  ]),
  body: z.string().trim().min(1).max(1000),
});

export const communityReportSchema = z.object({
  message_id: z.string().uuid(),
  reason: z.string().trim().min(1).max(500).optional().default('Reported by member'),
});

export const affiliateApplySchema = z.object({
  name: cleanText(120),
  email: z.string().trim().email().max(200),
  phone: optionalText(32),
  city: cleanText(100),
  share_channels: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  audience: z.string().trim().min(10).max(2000),
  link: optionalText(300),
  consent: z.literal(true),
});

export const affiliatePayoutDetailsSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('UPI'),
    upi_id: z
      .string()
      .trim()
      .min(4)
      .max(100)
      .refine((v) => v.includes('@'), 'Enter a valid UPI ID'),
  }),
  z.object({
    method: z.literal('Bank transfer'),
    account_holder: cleanText(120),
    account_number: z.string().trim().min(8).max(30).regex(/^\d+$/, 'Numeric account number'),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter an 11-character IFSC code'),
  }),
]);

export const whiteLabelApplySchema = z.object({
  company: cleanText(140),
  name: cleanText(120),
  email: z.string().trim().email().max(200),
  phone: optionalText(32),
  website: optionalText(300),
  city: cleanText(100),
  capabilities: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  volume: cleanText(80),
  notes: optionalText(2000),
  nda_agreed: z.literal(true),
  consent: z.literal(true),
});

export const whiteLabelBriefSchema = z.object({
  title: cleanText(180),
  industry: cleanText(120),
  capability: cleanText(120),
  services: cleanText(800),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  budget: cleanText(100),
  details: z.string().trim().min(30).max(6000),
  branding: optionalText(1000),
});
