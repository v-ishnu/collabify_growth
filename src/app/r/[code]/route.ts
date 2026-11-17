import { handleReferralRedirect } from '@/lib/affiliates/redirect';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  return handleReferralRedirect(request, code, []);
}
