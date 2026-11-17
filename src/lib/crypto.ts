import crypto from 'node:crypto';
import { getServerEnv } from '@/config/env';

const SHORT_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateShortId(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += SHORT_ALPHABET[(bytes[i] ?? 0) % SHORT_ALPHABET.length];
  }
  return out;
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const env = getServerEnv();
  const salt = env.IP_HASH_SALT || env.APP_ENCRYPTION_SECRET || 'collabify-ip-salt-dev';
  return crypto.createHmac('sha256', salt).update(ip).digest('hex').slice(0, 32);
}

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSensitiveJson(data: Record<string, unknown>): string {
  const env = getServerEnv();
  const secret = env.APP_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('APP_ENCRYPTION_SECRET is required to store encrypted payout details.');
  }
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encoded = Buffer.from(JSON.stringify(data), 'utf8');
  const encrypted = Buffer.concat([cipher.update(encoded), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptSensitiveJson(token: string): Record<string, unknown> | null {
  const env = getServerEnv();
  const secret = env.APP_ENCRYPTION_SECRET;
  if (!secret) return null;
  try {
    const raw = Buffer.from(token, 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const payload = raw.subarray(28);
    const key = deriveKey(secret);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
    return JSON.parse(plain) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function maskIdentifier(value: string | undefined | null): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return '••••' + value.slice(-4);
}

