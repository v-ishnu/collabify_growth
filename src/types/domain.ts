export type CapId = 'brand' | 'tech' | 'media' | 'pr' | 'fos' | 'events' | 'network';

export interface CapabilityGroup {
  title: string;
  items: Array<[string, string] | [string, string, string] | [string, string, string, string]>;
}

export interface Capability {
  id: CapId;
  slug: string;
  name: string;
  count: number;
  menu: string;
  card: string;
  examples: string[];
  h1: string;
  sub: string;
  intro: string;
  btn2: [string, string];
  groups: CapabilityGroup[];
  pairs: Array<[CapId, string]>;
  faqs: Array<[string, string]>;
  title: string;
  desc: string;
  marketplace?: boolean;
}

export interface ServiceItem {
  name: string;
  copy: string;
  link: string;
  tag: string;
  cap: CapId | 'custom';
  group: string;
}

export interface Programme {
  slug: string;
  name: string;
  caps: string[];
  for: string;
  line: string;
  includes: string[];
}

export type SegmentEntry = [string, string, string, Array<[string, string]>];
export type ProcessStage = [string, Array<[string, string]>];
export type EngagementModel = [string, string];
export type PartnerType = [string, string];
export type ChannelDef = [string, string, string];

export interface CaseStudy {
  client: string;
  industry: string;
  used: string;
  challenge: string;
  did: string;
  result: string;
}

export interface TestimonialData {
  quote: string;
  who: string;
  role: string;
}

export interface CommunityPlan {
  id: 'monthly' | 'annual';
  name: string;
  price: string;
  per: string;
  note: string;
  features: string[];
  featured?: boolean;
}

export interface CommunityData {
  name: string;
  tagline: string;
  who: string;
  plans: CommunityPlan[];
  paymentLinks: Record<'monthly' | 'annual', string>;
  confirmTime: string;
  refund: string;
}

export interface ShowcaseItem {
  cap: CapId;
  tint: string;
  line: string;
}

export interface ToolCardItem {
  k: string;
  c: string;
  name: string;
  for: string;
  line: string;
  href: string;
}

export type HealthCheckQuestion = [CapId, string, [string, string, string, string]];
export type HealthCheckAdvice = Record<CapId, [string, [string, string]]>;

export interface LogoData {
  vw: number;
  vh: number;
  mx: number;
  my: number;
  mw: number;
  mh: number;
  path: string;
  mark: string;
}
