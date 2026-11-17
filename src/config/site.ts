import { publicEnv } from './env';

export const siteConfig = {
  name: publicEnv.NEXT_PUBLIC_SITE_NAME,
  url: publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''),
  legalEntityName: publicEnv.NEXT_PUBLIC_LEGAL_ENTITY_NAME,
  contact: {
    email: publicEnv.NEXT_PUBLIC_CONTACT_EMAIL,
    phone: publicEnv.NEXT_PUBLIC_CONTACT_PHONE || '[phone]',
    whatsapp: publicEnv.NEXT_PUBLIC_CONTACT_WHATSAPP,
    city: publicEnv.NEXT_PUBLIC_OFFICE_CITY || '[city]',
  },
  affiliate: {
    windowDays: 90,
    attributionModel: 'first_touch' as const,
  },
  socialOgDefault: '/brand/collabify-mark-512.png',
};

