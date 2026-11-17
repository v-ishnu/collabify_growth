import { apiOk } from '@/lib/api/response';
import { requireStaffSession } from '@/lib/admin/auth';
import { loadAdminDashboardBundle } from '@/lib/admin/bundle';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const data = await loadAdminDashboardBundle(guard.profile.role);
  return apiOk({ data });
}

