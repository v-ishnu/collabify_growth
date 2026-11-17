import { describe, expect, it } from 'vitest';
import {
  affiliateApplySchema,
  affiliatePayoutDetailsSchema,
  blogPostUpsertSchema,
  communityApplySchema,
  communityMessageSchema,
  communityReportSchema,
  enquirySchema,
  healthCheckSaveSchema,
  marketplaceInterestSchema,
  partnerApplicationSchema,
  shareLinkCreateSchema,
  whiteLabelApplySchema,
  whiteLabelBriefSchema,
} from '@/lib/validation/schemas';

describe('All Forms Validation & Data Contract Tests', () => {
  it('1. Enquiry Form: accepts valid deal submission and rejects missing consent', () => {
    const valid = enquirySchema.safeParse({
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      phone: '+91 98765 43210',
      company: 'Growth Labs',
      role: 'Founder',
      website: 'https://growthlabs.in',
      partnerRef: 'PARTNER123',
      needs: ['Brand Strategy', 'Technology & Apps'],
      shortlist: ['Web development'],
      programme: 'Startup Launch',
      description: 'We need full brand architecture, design system, and modern web application.',
      timeline: '2-3 months',
      budget: '₹5L - ₹10L',
      source: 'Google Search',
      consentPrivacy: true,
      consentUpdates: true,
      consentWhatsApp: false,
    });
    expect(valid.success).toBe(true);

    const missingConsent = enquirySchema.safeParse({
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      company: 'Growth Labs',
      role: 'Founder',
      needs: ['Brand Strategy'],
      description: 'We need full brand architecture, design system, and modern web application.',
      timeline: '2-3 months',
      budget: '₹5L - ₹10L',
      consentPrivacy: false,
    });
    expect(missingConsent.success).toBe(false);
  });

  it('2. Partner / Specialist Application: validates freelancer/vendor network application', () => {
    const valid = partnerApplicationSchema.safeParse({
      name: 'Ananya Roy',
      email: 'ananya@design.studio',
      phone: '+91 98111 22233',
      city: 'Mumbai',
      partnerType: 'Design Studio',
      availability: 'Immediate / Full-time',
      capabilities: ['Brand & Visual Identity', 'Packaging'],
      portfolioUrl: 'https://ananya.design',
      rate: '₹75,000 / project',
      audience: 'D2C and lifestyle brands',
      consent: true,
    });
    expect(valid.success).toBe(true);

    const invalid = partnerApplicationSchema.safeParse({
      name: 'Ananya Roy',
      email: 'invalid-email',
      city: '',
      partnerType: '',
      availability: '',
      capabilities: [],
      portfolioUrl: '',
      consent: false,
    });
    expect(invalid.success).toBe(false);
  });

  it('3. Marketplace Interest Form: validates founder / partner waitlist registration', () => {
    const valid = marketplaceInterestSchema.safeParse({
      name: 'Kunal Shah',
      email: 'kunal@example.com',
      company: 'Fintech Hub',
      role: 'Founder',
      note: 'Looking for verified service providers.',
      consent: true,
    });
    expect(valid.success).toBe(true);
  });

  it('4. Community Apply Form: validates founder membership application', () => {
    const valid = communityApplySchema.safeParse({
      plan: 'annual',
      name: 'Vikram Seth',
      email: 'vikram@cloudops.io',
      role: 'CTO',
      company: 'CloudOps',
      city: 'Hyderabad',
      linkedin: 'https://linkedin.com/in/vikramseth',
      working_on: 'Building cloud cost optimization platform for growth-stage startups.',
      interests: ['Tech & product', 'Hiring & talent'],
      consent_rules: true,
      consent_directory: true,
      consent_privacy: true,
    });
    expect(valid.success).toBe(true);
  });

  it('5. Community Chat & Moderation: validates channel messages and report payloads', () => {
    const msgOk = communityMessageSchema.safeParse({
      channel_id: 'general',
      body: 'Hello everyone! Excited to be part of the Collabify community.',
    });
    expect(msgOk.success).toBe(true);

    const msgTooLong = communityMessageSchema.safeParse({
      channel_id: 'general',
      body: 'x'.repeat(1001),
    });
    expect(msgTooLong.success).toBe(false);

    const reportOk = communityReportSchema.safeParse({
      message_id: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'Spam or unsolicited advertising',
    });
    expect(reportOk.success).toBe(true);
  });

  it('6. Affiliate Program & Payout Details: validates application and UPI/Bank payouts', () => {
    const affOk = affiliateApplySchema.safeParse({
      name: 'Pooja Hegde',
      email: 'pooja@creator.in',
      phone: '+91 99000 88776',
      city: 'Delhi',
      share_channels: ['Newsletter', 'LinkedIn', 'YouTube'],
      audience: '15,000+ early stage founders and entrepreneurs.',
      link: 'https://pooja.substack.com',
      consent: true,
    });
    expect(affOk.success).toBe(true);

    // UPI payout
    const upi = affiliatePayoutDetailsSchema.safeParse({
      method: 'UPI',
      upi_id: 'pooja@okhdfcbank',
    });
    expect(upi.success).toBe(true);

    // Bank transfer payout with IFSC validation
    const bank = affiliatePayoutDetailsSchema.safeParse({
      method: 'Bank transfer',
      account_holder: 'Pooja Hegde',
      account_number: '123456789012',
      ifsc: 'HDFC0001234',
    });
    expect(bank.success).toBe(true);

    // Invalid IFSC format
    const badBank = affiliatePayoutDetailsSchema.safeParse({
      method: 'Bank transfer',
      account_holder: 'Pooja Hegde',
      account_number: '123456789012',
      ifsc: 'INVALID_IFSC',
    });
    expect(badBank.success).toBe(false);
  });

  it('7. White-Label Agency Application & Briefs: validates agency onboarding and client briefs', () => {
    const wlApp = whiteLabelApplySchema.safeParse({
      company: 'Pixel Studio Agency',
      name: 'Rajesh Verma',
      email: 'rajesh@pixelagency.com',
      phone: '+91 98888 77777',
      website: 'https://pixelagency.com',
      city: 'Gurugram',
      capabilities: ['Web Development', 'Content Strategy'],
      volume: '3-5 projects / month',
      notes: 'Need white-label dev capacity for enterprise Shopify and Next.js sites.',
      nda_agreed: true,
      consent: true,
    });
    expect(wlApp.success).toBe(true);

    const brief = whiteLabelBriefSchema.safeParse({
      title: 'Project Apex - FinTech Mobile Redesign',
      industry: 'Banking / WealthTech',
      capability: 'Technology & Apps',
      services: 'UX research, UI system, React Native app architecture',
      due_date: '2026-12-31',
      budget: '₹8,00,000',
      details: 'Complete end-to-end white-label execution required under client agency NDA.',
      branding: 'Use Client agency template strictly, no Collabify branding.',
    });
    expect(brief.success).toBe(true);
  });

  it('8. Blog Editor & Content Publishing: validates editorial article payload', () => {
    const post = blogPostUpsertSchema.safeParse({
      title: 'How Founder Communities Drive Early Distribution in 2026',
      slug: 'how-founder-communities-drive-distribution',
      category: 'Growth & Marketing',
      author_name: 'Collabify Editorial',
      focus_keyword: 'founder community',
      seo_title: 'How Founder Communities Drive Distribution · Collabify',
      seo_description: 'Discover how peer networks scale startup growth.',
      body_md: '# Introduction\n\nCommunities are the new distribution moat...',
      action: 'publish',
    });
    expect(post.success).toBe(true);
  });

  it('9. Tool Share Links & Health Check Quiz: validates link creation and quiz responses', () => {
    const share = shareLinkCreateSchema.safeParse({
      kind: 'mediakit',
      payload: { name: 'Aditi', handle: '@aditigrowth', rates: [{ name: 'Sponsored Post', price: '₹25,000' }] },
    });
    expect(share.success).toBe(true);

    const quiz = healthCheckSaveSchema.safeParse({
      answers: [2, 3, 1, 2, 3, 0, 2, 3],
      total_score: 16,
      enquiry_id: 'CG-ABC1234',
    });
    expect(quiz.success).toBe(true);
  });
});

