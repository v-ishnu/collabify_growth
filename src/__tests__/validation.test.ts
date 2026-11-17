import { describe, expect, it } from 'vitest';
import {
  affiliatePayoutDetailsSchema,
  blogPostUpsertSchema,
  communityApplySchema,
  communityMessageSchema,
  enquirySchema,
  partnerApplicationSchema,
  whiteLabelApplySchema,
  whiteLabelBriefSchema,
} from '@/lib/validation/schemas';

describe('Zod validation schemas', () => {
  it('validates a complete enquiry payload and normalizes partnerRef', () => {
    const res = enquirySchema.safeParse({
      name: 'Asha Mehta',
      email: 'asha@example.com',
      phone: '+91 98765 43210',
      company: 'Acme Retail',
      role: 'Founder',
      website: 'https://acme.in',
      partnerRef: 'rohan-m829!',
      needs: ['Marketing & Growth'],
      shortlist: ['Content strategy'],
      programme: 'Launch & Build',
      description: 'We need a refreshed website and content calendar for Q3.',
      timeline: '1-2 months',
      budget: 'INR 1-3 lakh',
      source: 'Referral',
      consentPrivacy: true,
      consentUpdates: true,
      consentWhatsApp: false,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.partnerRef).toBe('ROHANM829');
    }
  });

  it('rejects enquiry with short description or missing privacy consent', () => {
    const res = enquirySchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      company: 'Co',
      role: 'Founder',
      needs: ['Technology & Apps'],
      description: 'Too short',
      timeline: 'Immediate',
      budget: 'Under 1L',
      consentPrivacy: false,
    });
    expect(res.success).toBe(false);
  });

  it('validates partner application and affiliate UPI vs bank union', () => {
    const partnerOk = partnerApplicationSchema.safeParse({
      name: 'Rohan Kulkarni',
      email: 'rohan@studio.in',
      city: 'Bengaluru',
      partnerType: 'Freelancer',
      availability: 'Part-time',
      capabilities: ['Design & Creative'],
      portfolioUrl: 'https://studio.in',
      consent: true,
    });
    expect(partnerOk.success).toBe(true);

    const upiOk = affiliatePayoutDetailsSchema.safeParse({
      method: 'UPI',
      upi_id: 'rohan@okaxis',
    });
    expect(upiOk.success).toBe(true);

    const bankBad = affiliatePayoutDetailsSchema.safeParse({
      method: 'Bank transfer',
      account_holder: 'Rohan',
      account_number: '1234',
      ifsc: 'INVALID',
    });
    expect(bankBad.success).toBe(false);

    const bankOk = affiliatePayoutDetailsSchema.safeParse({
      method: 'Bank transfer',
      account_holder: 'Rohan Kulkarni',
      account_number: '123456789012',
      ifsc: 'HDFC0001234',
    });
    expect(bankOk.success).toBe(true);
  });

  it('enforces strict slug rules on blog posts and community rules', () => {
    const badSlug = blogPostUpsertSchema.safeParse({
      title: 'Test Post',
      slug: 'Bad Slug!',
      body_md: 'Hello world content',
      action: 'draft',
    });
    expect(badSlug.success).toBe(false);

    const goodMsg = communityMessageSchema.safeParse({
      channel_id: 'introductions',
      body: 'Hello everyone!',
    });
    expect(goodMsg.success).toBe(true);

    const badChannel = communityMessageSchema.safeParse({
      channel_id: 'secret-admin',
      body: 'Hi',
    });
    expect(badChannel.success).toBe(false);

    const badCommunityApp = communityApplySchema.safeParse({
      plan: 'monthly',
      name: 'Neha',
      email: 'neha@co.in',
      role: 'Founder',
      company: 'Co',
      city: 'Mumbai',
      working_on: 'Growing our brand',
      interests: ['Growth'],
      consent_rules: false,
      consent_privacy: true,
    });
    expect(badCommunityApp.success).toBe(false);
  });

  it('requires NDA agreement for white-label partner application and >=30 chars for briefs', () => {
    const wlNoNda = whiteLabelApplySchema.safeParse({
      company: 'Pixel Agency',
      name: 'Kabir',
      email: 'kabir@pixel.co',
      city: 'Delhi',
      capabilities: ['Technology & Apps'],
      volume: '2-3',
      nda_agreed: false,
      consent: true,
    });
    expect(wlNoNda.success).toBe(false);

    const wlBriefOk = whiteLabelBriefSchema.safeParse({
      title: 'Client SaaS Marketing Site',
      industry: 'B2B SaaS',
      capability: 'Technology & Apps',
      services: 'Business website development',
      due_date: '2026-12-01',
      budget: 'INR 1-3 lakh',
      details: 'Need a fast responsive Next.js marketing website with clear conversion flow.',
    });
    expect(wlBriefOk.success).toBe(true);
  });
});

