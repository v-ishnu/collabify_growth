import { NextResponse } from 'next/server';
import { publicEnv } from '@/config/env';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'ACCOUNT_SUSPENDED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export function apiOk<T extends Record<string, unknown>>(
  payload: T,
  init?: ResponseInit,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ok: true,
      ...payload,
    },
    init,
  );
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      ok: false,
      error: message,
      errorCode: code,
      errorDetail: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status, headers },
  );
}

/**
 * Validates that a browser-originated state-changing request matches the active site host.
 * Protects cookie-authenticated endpoints against cross-site request forgery.
 */
export function assertSameOrigin(
  request: Request,
): { ok: true } | { ok: false; response: NextResponse } {
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite === 'cross-site') {
    return {
      ok: false,
      response: apiError('FORBIDDEN', 'Cross-site request rejected.', 403),
    };
  }

  const allowedHosts = new Set<string>();
  try {
    allowedHosts.add(new URL(publicEnv.NEXT_PUBLIC_SITE_URL).host.toLowerCase());
  } catch {
    // Ignore malformed fallback URL
  }
  const reqHost =
    request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (reqHost) {
    allowedHosts.add(reqHost.split(',')[0]!.trim().toLowerCase());
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (!allowedHosts.has(originHost)) {
        return {
          ok: false,
          response: apiError('FORBIDDEN', 'Invalid request origin.', 403),
        };
      }
      return { ok: true };
    } catch {
      return {
        ok: false,
        response: apiError('FORBIDDEN', 'Malformed request origin.', 403),
      };
    }
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      if (!allowedHosts.has(refererHost)) {
        return {
          ok: false,
          response: apiError('FORBIDDEN', 'Invalid request referer.', 403),
        };
      }
    } catch {
      return {
        ok: false,
        response: apiError('FORBIDDEN', 'Malformed request referer.', 403),
      };
    }
  }

  return { ok: true };
}

/**
 * Sanitizes post-login redirect targets to internal relative paths only,
 * blocking protocol-relative URLs, backslashes, control characters, and schemes.
 */
export function safeRedirectTarget(
  raw: string | null | undefined,
  fallback = '/community',
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, 'http://local.invalid');
    if (parsed.origin !== 'http://local.invalid') return fallback;
    if (parsed.pathname.startsWith('//')) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

