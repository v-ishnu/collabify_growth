import { handleReferralRedirect } from '@/lib/affiliates/redirect';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string; path: string[] }> },
) {
  const { code, path } = await context.params;
  return handleReferralRedirect(request, code, path);
}
