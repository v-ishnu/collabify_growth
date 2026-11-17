import { describe, expect, it } from 'vitest';
import { ALL_SERVICES, CAPS, HC_QUESTIONS, PROGRAMMES } from '@/content';
import { askLocalFallback } from '@/lib/anthropic/assistant';
import { hcBand, hcScores, matchProgramme } from '@/lib/tools/health-check';
import {
  IV_EMPTY,
  decodeInvite,
  encodeInvite,
  ivGcal,
  ivIcs,
} from '@/lib/tools/invite';
import {
  cloneEmptyMediaKit,
  decodeMediaKit,
  encodeMediaKit,
  validateMediaKit,
} from '@/lib/tools/media-kit';
import { buildQrMatrix, qrSvgPath, waLink } from '@/lib/tools/whatsapp';
import { validateUploadedFile } from '@/lib/upload/validate';

describe('Domain catalogue, AI fallback, Free tools & Upload validation', () => {
  it('preserves all 7 capabilities, integrated programmes, and 101 services', () => {
    expect(CAPS).toHaveLength(7);
    expect(PROGRAMMES.length).toBeGreaterThanOrEqual(5);
    expect(ALL_SERVICES).toHaveLength(101);
  });

  it('answers pricing, hinglish, affiliate, white-label and tool queries via local assistant fallback', () => {
    expect(askLocalFallback('kitna kharch aayega website ke liye?')).toContain('/start-a-project');
    expect(askLocalFallback('Do you have an affiliate referral commission?')).toContain('/affiliates');
    expect(askLocalFallback('Can agencies resell under white label?')).toContain('/white-label');
    expect(askLocalFallback('Tell me about free QR and media kit tools')).toContain('/tools/whatsapp');
  });

  it('computes Growth Health Check scores, bands, and matched programmes', () => {
    const high = hcScores(Array.from({ length: HC_QUESTIONS.length }, () => 3));
    expect(high.total).toBe(100);
    expect(hcBand(high.total)[0]).toBe('Strong growth engine');

    const low = hcScores(Array.from({ length: HC_QUESTIONS.length }, () => 0));
    expect(low.total).toBe(0);
    expect(hcBand(low.total)[0]).toBe('Foundations needed');

    const firstProg = PROGRAMMES[0]!;
    expect(matchProgramme(new Set(firstProg.caps))?.slug).toBe(firstProg.slug);
  });

  it('encodes/decodes Media Kit and validates required fields', () => {
    const kit = cloneEmptyMediaKit();
    kit.n = 'Riya Verma';
    kit.h = '@riyacreates';
    kit.p = [['Instagram', '120K', '4.2%', '']];
    kit.e = 'riya@example.com';

    expect(validateMediaKit(kit)).toEqual([]);
    const code = encodeMediaKit(kit);
    const decoded = decodeMediaKit(code);
    expect(decoded?.n).toBe('Riya Verma');
    expect(decoded?.h).toBe('@riyacreates');
  });

  it('encodes/decodes Event Invites and builds Calendar links/ICS + WhatsApp QR matrix', () => {
    const invite = {
      ...IV_EMPTY,
      t: 'Founders Mixer, Mumbai',
      host: 'Collabify',
      d: '2026-11-25',
      s: '18:30',
      e: '21:00',
      vn: 'BKC Studio',
      wa: '9876543210',
    };
    const decoded = decodeInvite(encodeInvite(invite));
    expect(decoded?.t).toBe('Founders Mixer, Mumbai');
    expect(ivGcal(invite)).toContain('calendar.google.com');
    const ics = ivIcs(invite);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Founders Mixer\\, Mumbai');

    const link = waLink({
      v: 1,
      n: 'Studio Coffee',
      num: '9876543210',
      msg: 'Hi!',
      tag: 'Scan to chat',
      th: 'ocean',
    });
    expect(link).toBe('https://wa.me/919876543210?text=Hi!');
    const matrix = buildQrMatrix(link);
    expect(matrix).not.toBeNull();
    expect(qrSvgPath(matrix!).length).toBeGreaterThan(20);
  });

  it('verifies uploaded file magic bytes and rejects spoofed extensions', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const validPng = new File([pngBytes], 'hero banner!.png', { type: 'image/png' });
    const okRes = await validateUploadedFile(validPng, 'image');
    expect(okRes.ok).toBe(true);
    if (okRes.ok) {
      expect(okRes.ext).toBe('png');
      expect(okRes.safeName).toBe('hero_banner_.png');
    }

    const fakePng = new File([Buffer.from('<script>evil()</script>')], 'evil.png', {
      type: 'image/png',
    });
    const badRes = await validateUploadedFile(fakePng, 'image');
    expect(badRes.ok).toBe(false);
  });
});
