export type AllowedUploadKind = 'image' | 'brief-attachment';

interface DetectedFile {
  ext: string;
  mime: string;
}

const MAX_BYTES: Record<AllowedUploadKind, number> = {
  image: 5 * 1024 * 1024,
  'brief-attachment': 10 * 1024 * 1024,
};

function matchesPrefix(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

function sniffMagic(buf: Uint8Array, originalName: string): DetectedFile | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (matchesPrefix(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: 'png', mime: 'image/png' };
  }
  // JPEG: FF D8 FF
  if (matchesPrefix(buf, [0xff, 0xd8, 0xff])) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // GIF: GIF87a / GIF89a
  if (
    matchesPrefix(buf, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    matchesPrefix(buf, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return { ext: 'gif', mime: 'image/gif' };
  }
  // WEBP: RIFF....WEBP
  if (
    matchesPrefix(buf, [0x52, 0x49, 0x46, 0x46], 0) &&
    matchesPrefix(buf, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  // PDF: %PDF
  if (matchesPrefix(buf, [0x25, 0x50, 0x44, 0x46])) {
    return { ext: 'pdf', mime: 'application/pdf' };
  }
  // OOXML / ZIP: PK\x03\x04 or PK\x05\x06
  if (
    matchesPrefix(buf, [0x50, 0x4b, 0x03, 0x04]) ||
    matchesPrefix(buf, [0x50, 0x4b, 0x05, 0x06])
  ) {
    const lower = originalName.toLowerCase();
    if (lower.endsWith('.docx')) {
      return {
        ext: 'docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    if (lower.endsWith('.pptx')) {
      return {
        ext: 'pptx',
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
    }
    return { ext: 'zip', mime: 'application/zip' };
  }
  return null;
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'upload';
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
  return clean.slice(0, 80) || 'upload';
}

export async function validateUploadedFile(
  file: File,
  kind: AllowedUploadKind,
): Promise<
  | { ok: true; buffer: Buffer; ext: string; mime: string; safeName: string; byteSize: number }
  | { ok: false; error: string }
> {
  const maxBytes = MAX_BYTES[kind];
  if (!file || file.size === 0) {
    return { ok: false, error: 'The uploaded file is empty.' };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`,
    };
  }

  const ab = await file.arrayBuffer();
  const uint8 = new Uint8Array(ab);
  const detected = sniffMagic(uint8, file.name);
  if (!detected) {
    return { ok: false, error: 'Unsupported file signature.' };
  }

  if (kind === 'image' && !['png', 'jpg', 'gif', 'webp'].includes(detected.ext)) {
    return { ok: false, error: 'Only PNG, JPEG, WebP, and GIF images are allowed.' };
  }

  if (
    kind === 'brief-attachment' &&
    !['png', 'jpg', 'webp', 'pdf', 'docx', 'pptx', 'zip'].includes(detected.ext)
  ) {
    return {
      ok: false,
      error: 'Only PDF, DOCX, PPTX, ZIP, PNG, JPEG, and WebP files are allowed.',
    };
  }

  return {
    ok: true,
    buffer: Buffer.from(ab),
    ext: detected.ext,
    mime: detected.mime,
    safeName: sanitizeFileName(file.name),
    byteSize: uint8.byteLength,
  };
}

