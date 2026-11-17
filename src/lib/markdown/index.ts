import { normalizeHref } from '@/content';
import { slugify } from '@/lib/format';

export function escHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return m;
    }
  });
}

function mdInline(escaped: string): string {
  return escaped
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, url: string) => {
      const rawUrl = url.replace(/&amp;/g, '&');
      if (!/^(https?:\/\/|\/)/i.test(rawUrl)) return alt;
      const safeAlt = alt.trim();
      return `<img src="${escHtml(rawUrl)}" alt="${safeAlt}" loading="lazy" style="max-width:100%;height:auto;border-radius:10px;margin:12px 0" />`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
      const rawUrl = url.replace(/&amp;/g, '&');
      if (!/^(https?:\/\/|#\/|\/|mailto:)/i.test(rawUrl)) return label;
      const normalized = rawUrl.startsWith('#/') ? normalizeHref(rawUrl) : rawUrl;
      const external = /^https?:/i.test(normalized);
      return `<a href="${escHtml(normalized)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    });
}

export function mdToHtml(src: string): string {
  const lines = String(src || '')
    .replace(/\r/g, '')
    .split('\n');
  let out = '';
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushP = () => {
    if (para.length) {
      out += `<p>${para.map((l) => mdInline(escHtml(l))).join('<br>')}</p>`;
      para = [];
    }
  };

  const flushL = () => {
    if (list) {
      out += `<${list.type}>${list.items.map((i) => `<li>${mdInline(escHtml(i))}</li>`).join('')}</${list.type}>`;
      list = null;
    }
  };

  for (const rawLine of lines) {
    const l = rawLine.replace(/\s+$/, '');
    if (!l.trim()) {
      flushP();
      flushL();
      continue;
    }
    const hMatch = l.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch && hMatch[1] && hMatch[2] !== undefined) {
      flushP();
      flushL();
      const tag = hMatch[1].length === 3 ? 'h3' : 'h2';
      out += `<${tag} id="h-${slugify(hMatch[2])}">${mdInline(escHtml(hMatch[2]))}</${tag}>`;
      continue;
    }
    const ulMatch = l.match(/^\s*[-*]\s+(.*)$/);
    if (ulMatch && ulMatch[1] !== undefined) {
      flushP();
      if (!list || list.type !== 'ul') {
        flushL();
        list = { type: 'ul', items: [] };
      }
      list.items.push(ulMatch[1]);
      continue;
    }
    const olMatch = l.match(/^\s*\d+[.)]\s+(.*)$/);
    if (olMatch && olMatch[1] !== undefined) {
      flushP();
      if (!list || list.type !== 'ol') {
        flushL();
        list = { type: 'ol', items: [] };
      }
      list.items.push(olMatch[1]);
      continue;
    }
    const bqMatch = l.match(/^>\s?(.*)$/);
    if (bqMatch && bqMatch[1] !== undefined) {
      flushP();
      flushL();
      out += `<blockquote><p>${mdInline(escHtml(bqMatch[1]))}</p></blockquote>`;
      continue;
    }
    flushL();
    para.push(l);
  }
  flushP();
  flushL();
  return out;
}

export function wordCount(md: string): number {
  return String(md || '')
    .replace(/[#>*`\[\]()_-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[a-z0-9\u0900-\u097F]/i.test(w)).length;
}

export function estimateReadMins(md: string): number {
  return Math.max(1, Math.round(wordCount(md) / 200));
}

