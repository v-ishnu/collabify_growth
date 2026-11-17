import { z } from 'zod';

const str = (def = '') => z.string().trim().default(def);

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().trim().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: str('Collabify Growth'),
  NEXT_PUBLIC_SUPABASE_URL: str(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: str(''),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: str(''),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: str(''),
  NEXT_PUBLIC_GA4_ID: str(''),
  NEXT_PUBLIC_CONTACT_EMAIL: str('[email]'),
  NEXT_PUBLIC_CONTACT_PHONE: str('[phone]'),
  NEXT_PUBLIC_CONTACT_WHATSAPP: str(''),
  NEXT_PUBLIC_LEGAL_ENTITY_NAME: str('[registered entity name]'),
  NEXT_PUBLIC_OFFICE_CITY: str('[city]'),
});

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: str(''),
  RESEND_API_KEY: str(''),
  EMAIL_FROM: str('Collabify Growth <hello@collabifygrowth.com>'),
  EMAIL_REPLY_TO: str('hello@collabifygrowth.com'),
  ADMIN_NOTIFY_EMAIL: str('hello@collabifygrowth.com'),
  RAZORPAY_KEY_SECRET: str(''),
  RAZORPAY_WEBHOOK_SECRET: str(''),
  RAZORPAY_PLAN_MONTHLY: str(''),
  RAZORPAY_PLAN_ANNUAL: str(''),
  ANTHROPIC_API_KEY: str(''),
  ANTHROPIC_MODEL: str('claude-haiku-4-5-20251001'),
  ASSISTANT_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(30),
  TURNSTILE_SECRET_KEY: str(''),
  APP_ENCRYPTION_SECRET: str(''),
  IP_HASH_SALT: str(''),
  SENTRY_DSN: str(''),
  AFFILIATE_WINDOW_DAYS: z.coerce.number().int().positive().default(90),
  AFFILIATE_ATTRIBUTION_MODEL: z.enum(['first_touch', 'last_touch']).default('first_touch'),
});

export const publicEnv = clientSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME || 'Collabify Growth',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '[email]',
  NEXT_PUBLIC_CONTACT_PHONE: process.env.NEXT_PUBLIC_CONTACT_PHONE || '[phone]',
  NEXT_PUBLIC_CONTACT_WHATSAPP: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP,
  NEXT_PUBLIC_LEGAL_ENTITY_NAME:
    process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME || '[registered entity name]',
  NEXT_PUBLIC_OFFICE_CITY: process.env.NEXT_PUBLIC_OFFICE_CITY || '[city]',
});

export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() must only be called on the server.');
  }
  return serverSchema.parse(process.env);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL &&
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !publicEnv.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR-PROJECT'),
  );
}
