import rawData from './prototype-data.json';
import type {
  Capability,
  CapId,
  CaseStudy,
  ChannelDef,
  CommunityData,
  EngagementModel,
  HealthCheckAdvice,
  HealthCheckQuestion,
  LogoData,
  PartnerType,
  ProcessStage,
  Programme,
  SegmentEntry,
  ServiceItem,
  ShowcaseItem,
  TestimonialData,
  ToolCardItem,
} from '@/types/domain';

interface RawPrototypeData {
  LOGO: LogoData;
  CAPS: Capability[];
  PROGRAMMES: Programme[];
  SEGMENTS: SegmentEntry[];
  PROCESS: ProcessStage[];
  ENGAGEMENTS: EngagementModel[];
  PARTNER_TYPES: PartnerType[];
  CONTACT: { email: string; phone: string; city: string };
  CUSTOM_SERVICE: [string, string, string];
  TEAM_SIZE: number;
  CASES: CaseStudy[];
  LOGO_SLOTS: number;
  TESTIMONIAL: TestimonialData;
  COMMUNITY: CommunityData;
  CHANNELS: ChannelDef[];
  COMM_RULES: string[];
  AFFILIATE: { rate: string; basis: string; windowDays: number; payout: string; minimum: string };
  WHITELABEL: { pricing: string; minimum: string };
  BLOG_CATS: string[];
  OWN_EVENTS: Array<{ name: string; format: string; date: string; city: string; audience: string }>;
  ALL_SERVICES: ServiceItem[];
  PAL: Record<string, string>;
  SCENES: Record<CapId, string>;
  SHOWCASE: ShowcaseItem[];
  CAP_ICON_PATHS: Record<CapId, string>;
  CAP_ICON_COLOR: Record<CapId, string>;
  MK_THEMES: Record<string, [string, string, string]>;
  MK_PLATFORMS: string[];
  MK_NICHES: string[];
  MK_DELIVERABLES: string[];
  MK_EMPTY: Record<string, unknown>;
  AFF_TARGETS: Array<[string, string]>;
  REF_STATUSES: string[];
  WL_STATUSES: string[];
  WL_READY: Array<[string, string]>;
  TOOL_ICONS: Record<string, string>;
  TOOLS: ToolCardItem[];
  HC_QUESTIONS: HealthCheckQuestion[];
  HC_ADVICE: HealthCheckAdvice;
  ASK_SUGGESTIONS: string[];
  HI_MAP: Record<string, string>;
  STAGES: string[];
  STATUS_TEXT: Record<string, string>;
  FIELD_LABELS: Record<string, string>;
}

const data = rawData as unknown as RawPrototypeData;

export function normalizeHref(href: string): string {
  if (!href) return '';
  if (href === '#/creators' || href === '/creators') return '/tools/media-kit';
  if (href === '#/inbox' || href === '/inbox') return '/admin';
  if (href.startsWith('#/')) {
    const p = href.slice(1);
    return p === '/creators' ? '/tools/media-kit' : p;
  }
  return href;
}

export const LOGO = data.LOGO;

export const CAPS: Capability[] = data.CAPS.map((cap) => ({
  ...cap,
  btn2: [cap.btn2[0], normalizeHref(cap.btn2[1])],
  groups: cap.groups.map((g) => ({
    ...g,
    items: g.items.map((item) => {
      if (item.length === 4) {
        return [item[0], item[1], normalizeHref(item[2]), item[3]];
      }
      if (item.length === 3) {
        return [item[0], item[1], normalizeHref(item[2])];
      }
      return item;
    }),
  })),
}));

export const CAP_BY_ID: Record<CapId, Capability> = Object.fromEntries(
  CAPS.map((c) => [c.id, c]),
) as Record<CapId, Capability>;

export const CAP_BY_SLUG: Record<string, Capability> = Object.fromEntries(
  CAPS.map((c) => [c.slug, c]),
);

export const ALL_SERVICES: ServiceItem[] = data.ALL_SERVICES.map((s) => ({
  ...s,
  link: normalizeHref(s.link),
}));

export const SVC_BY_NAME: Record<string, ServiceItem> = Object.fromEntries(
  ALL_SERVICES.map((s) => [s.name, s]),
);

export const PROGRAMMES = data.PROGRAMMES;
export const PROG_BY_SLUG: Record<string, Programme> = Object.fromEntries(
  PROGRAMMES.map((p) => [p.slug, p]),
);

export const SEGMENTS: SegmentEntry[] = data.SEGMENTS.map(([name, role, line, links]) => [
  name,
  role,
  line,
  links.map(([label, href]) => [label, normalizeHref(href)]),
]);

export const PROCESS = data.PROCESS;
export const ENGAGEMENTS = data.ENGAGEMENTS;
export const PARTNER_TYPES = data.PARTNER_TYPES;
export const CONTACT = data.CONTACT;
export const CUSTOM_SERVICE: [string, string, string] = [
  data.CUSTOM_SERVICE[0],
  data.CUSTOM_SERVICE[1],
  normalizeHref(data.CUSTOM_SERVICE[2]),
];
export const TEAM_SIZE = data.TEAM_SIZE;
export const CASES = data.CASES;
export const LOGO_SLOTS = data.LOGO_SLOTS;
export const TESTIMONIAL = data.TESTIMONIAL;
export const COMMUNITY = data.COMMUNITY;
export const CHANNELS = data.CHANNELS;
export const COMM_RULES = data.COMM_RULES;
export const AFFILIATE = data.AFFILIATE;
export const WHITELABEL = data.WHITELABEL;
export const BLOG_CATS = data.BLOG_CATS;
export const OWN_EVENTS = data.OWN_EVENTS;
export const PAL = data.PAL;
export const SCENES = data.SCENES;
export const SHOWCASE = data.SHOWCASE;
export const CAP_ICON_PATHS = data.CAP_ICON_PATHS;
export const CAP_ICON_COLOR = data.CAP_ICON_COLOR;
export const MK_THEMES = data.MK_THEMES;
export const MK_PLATFORMS = data.MK_PLATFORMS;
export const MK_NICHES = data.MK_NICHES;
export const MK_DELIVERABLES = data.MK_DELIVERABLES;
export const MK_EMPTY = data.MK_EMPTY;
export const AFF_TARGETS: Array<[string, string]> = data.AFF_TARGETS.map(([p, label]) => [
  normalizeHref(p),
  label,
]);
export const REF_STATUSES = data.REF_STATUSES;
export const WL_STATUSES = data.WL_STATUSES;
export const WL_READY = data.WL_READY;
export const TOOL_ICONS = data.TOOL_ICONS;
export const TOOLS: ToolCardItem[] = data.TOOLS.map((t) => ({
  ...t,
  href: normalizeHref(t.href),
}));
export const HC_QUESTIONS = data.HC_QUESTIONS;
export const HC_ADVICE = data.HC_ADVICE;
export const ASK_SUGGESTIONS = data.ASK_SUGGESTIONS;
export const HI_MAP = data.HI_MAP;
export const STAGES = data.STAGES;
export const STATUS_TEXT = data.STATUS_TEXT;
export const FIELD_LABELS = data.FIELD_LABELS;
