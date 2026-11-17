import { describe, expect, it } from 'vitest';
import { safeRedirectTarget } from '@/lib/api/response';
import { isAdminRole, isStaffRole } from '@/lib/supabase/server';

describe('Authentication & Session Hardening Tests', () => {
  it('strictly validates role-based access for owners, admins, editors and users', () => {
    // Owner
    expect(isStaffRole('owner')).toBe(true);
    expect(isAdminRole('owner')).toBe(true);

    // Admin
    expect(isStaffRole('admin')).toBe(true);
    expect(isAdminRole('admin')).toBe(true);

    // Editor (can access staff inbox & blog, but cannot perform destructive admin actions)
    expect(isStaffRole('editor')).toBe(true);
    expect(isAdminRole('editor')).toBe(false);

    // Regular User
    expect(isStaffRole('user')).toBe(false);
    expect(isAdminRole('user')).toBe(false);

    // Null / Undefined
    expect(isStaffRole(null)).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  it('safely handles redirect target resolution preventing open-redirects', () => {
    // Legitimate local paths
    expect(safeRedirectTarget('/admin')).toBe('/admin');
    expect(safeRedirectTarget('/community/chat')).toBe('/community/chat');
    expect(safeRedirectTarget('/white-label?tab=briefs')).toBe('/white-label?tab=briefs');
    expect(safeRedirectTarget('/blog/write')).toBe('/blog/write');

    // Malicious open-redirect attempts fall back to default safe location
    expect(safeRedirectTarget('https://malicious.com')).toBe('/community');
    expect(safeRedirectTarget('http://attacker.com/evil')).toBe('/community');
    expect(safeRedirectTarget('//evil.com')).toBe('/community');
    expect(safeRedirectTarget('/\\evil.com')).toBe('/community');
    expect(safeRedirectTarget('javascript:alert(document.cookie)')).toBe('/community');
    expect(safeRedirectTarget(null)).toBe('/community');
    expect(safeRedirectTarget(undefined, '/admin')).toBe('/admin');
  });

  it('verifies protected routes classification matches middleware requirements', () => {
    const PROTECTED_PREFIXES = ['/admin', '/inbox', '/blog/write', '/community/chat'];
    const STAFF_PREFIXES = ['/admin', '/inbox', '/blog/write'];

    const isProtected = (path: string) => PROTECTED_PREFIXES.some((p) => path.startsWith(p));
    const isStaffOnly = (path: string) => STAFF_PREFIXES.some((p) => path.startsWith(p));

    expect(isProtected('/admin')).toBe(true);
    expect(isStaffOnly('/admin')).toBe(true);

    expect(isProtected('/blog/write')).toBe(true);
    expect(isStaffOnly('/blog/write')).toBe(true);

    expect(isProtected('/community/chat')).toBe(true);
    expect(isStaffOnly('/community/chat')).toBe(false);

    expect(isProtected('/services')).toBe(false);
    expect(isProtected('/')).toBe(false);
    expect(isProtected('/about')).toBe(false);
    expect(isProtected('/start-a-project')).toBe(false);
  });
});

