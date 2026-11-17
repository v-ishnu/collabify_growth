import { ALL_SERVICES, CAP_BY_ID, CAPS, HI_MAP, PROGRAMMES, TOOLS } from '@/content';
import type { CapId } from '@/types/domain';

export function buildAssistantSystemPrompt(): string {
  const capSummary = CAPS.map(
    (c) => `- ${c.name} (/capabilities/${c.slug}, ${c.count} services): ${c.card}`,
  ).join('\n');

  const progSummary = PROGRAMMES.map(
    (p) => `- ${p.name} (/solutions/${p.slug}): ${p.line} [For: ${p.for}]`,
  ).join('\n');

  const toolsSummary = TOOLS.map((t) => `- ${t.name} (${t.href}): ${t.line}`).join('\n');

  const catalogueSummary = ALL_SERVICES.filter((s) => !s.tag)
    .map((s) => `- ${s.name} [${s.cap === 'custom' ? 'Custom' : CAP_BY_ID[s.cap].name}]: ${s.copy}`)
    .join('\n');

  return `You are Ask Collabify, the helpful assistant for Collabify Growth (India).
Answer concisely in plain English or natural Hinglish/Hindi matching the visitor's language.
Always ground recommendations ONLY in Collabify Growth's actual capabilities, programmes, free tools, community, affiliates, or white-label partner portal.
Never invent pricing figures or promise SEO rankings, press coverage, virality, or guaranteed registrations — explain that every project is scoped in writing via /start-a-project.
Use clean Markdown with clickable site paths like [Start a Project](/start-a-project) or [Capabilities](/capabilities).

Capabilities:
${capSummary}

Integrated Programmes:
${progSummary}

Free Tools:
${toolsSummary}

Community: /community & /community/join
Affiliates (90-day attribution): /affiliates
White-Label for Agencies: /white-label
All 101 Services Directory: /services

Catalogue:
${catalogueSummary}`;
}

export function askLocalFallback(query: string): string {
  let t = String(query || '').toLowerCase();
  for (const [k, v] of Object.entries(HI_MAP)) {
    t = t.split(k).join(` ${v} `);
  }
  const has = (re: RegExp) => re.test(t);

  if (
    has(
      /price|cost|fee|budget|charge|rate|kitna|paise|kharch|quotation|quote/,
    )
  ) {
    return 'Every project is scoped in a written proposal, so the price matches what you actually need. Tell us your goal and budget range on [Start a Project](/start-a-project) and we’ll reply with next steps.';
  }
  if (has(/affiliate|refer|commission|earn/)) {
    return 'Our [Affiliate program](/affiliates) gives you a personal link. When a business you refer becomes a client, you earn commission. It’s free to join.';
  }
  if (has(/white.?label|agency|resell|outsourc/)) {
    return 'Agencies and freelancers can sell our services under their own brand. See [White-label for agencies](/white-label).';
  }
  if (has(/community|network|members|chat/)) {
    return 'The [Community](/community) is a paid, members-only network with chat channels, a member directory and introductions.';
  }
  if (has(/free|tool|media kit|invite|qr|health/)) {
    return 'Our free tools: [Growth Health Check](/health-check), [Media kit maker](/tools/media-kit), [Event invite maker](/tools/invite) and [WhatsApp QR maker](/tools/whatsapp). No sign-up needed.';
  }
  if (has(/process|after|enquiry|how do you work|steps/)) {
    return 'After you send an enquiry, we check fit, suggest a short discovery call, then send a written proposal with scope, timeline and price. See [How we work](/how-we-work).';
  }

  const stopWords = new Set([
    'the',
    'and',
    'for',
    'need',
    'want',
    'with',
    'our',
    'can',
    'you',
    'what',
    'which',
    'help',
  ]);
  const words = t
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const ranked = ALL_SERVICES.filter((x) => !x.tag)
    .map((x) => {
      const hay = `${x.name} ${x.copy}`.toLowerCase();
      const score = words.filter((w) => hay.includes(w)).length;
      return { x, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked: typeof ranked = [];
  for (const item of ranked) {
    const sameCapCount = picked.filter((p) => p.x.cap === item.x.cap).length;
    if (sameCapCount < 2) picked.push(item);
    if (picked.length >= 4) break;
  }

  if (picked.length === 0) {
    return 'I can help you find the right service. Try describing your goal, such as “launch a new brand” or “more leads from our website”, or browse [all services](/services).';
  }

  const lines = picked.map(({ x }) => {
    if (x.cap === 'custom') {
      return `- **${x.name}** in [Custom Solutions](/solutions/custom)`;
    }
    const c = CAP_BY_ID[x.cap as CapId];
    return `- **${x.name}** in [${c.name}](/capabilities/${c.slug})`;
  });

  return `These look like a good fit:\n\n${lines.join('\n')}\n\nWhen you’re ready, [Start a Project](/start-a-project) and we’ll scope it.`;
}

