import { apiOk } from '@/lib/api/response';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, profile, suspended } = await getSessionUserAndProfile();
  if (suspended) {
    return apiOk({
      authenticated: false,
      suspended: true,
      role: null,
      canViewAdmin: false,
    });
  }
  if (!user) {
    return apiOk({
      authenticated: false,
      suspended: false,
      role: null,
      canViewAdmin: false,
    });
  }
  const role = profile?.role ?? 'user';
  return apiOk({
    authenticated: true,
    suspended: false,
    userId: user.id,
    email: user.email,
    fullName: profile?.full_name ?? null,
    role,
    canViewAdmin: isStaffRole(role),
  });
}

