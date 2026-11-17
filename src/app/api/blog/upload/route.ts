import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { validateUploadedFile } from '@/lib/upload/validate';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const { user, profile, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user || !isStaffRole(profile?.role)) {
      return apiError('FORBIDDEN', 'Staff permission required.', 403);
    }

    const rl = checkRateLimit(`blog-upload:${user.id}`, 30, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many image uploads.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('file');
    if (!(file instanceof File)) {
      return apiError('VALIDATION_ERROR', 'Select an image file to upload.', 400);
    }

    const checked = await validateUploadedFile(file, 'image');
    if (!checked.ok) {
      return apiError('VALIDATION_ERROR', checked.error, 400);
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Storage unavailable.', 503);
    }

    const objectPath = `posts/${user.id}/${Date.now()}-${checked.safeName}`;
    const { error } = await admin.storage
      .from('blog-media')
      .upload(objectPath, checked.buffer, {
        contentType: checked.mime,
        upsert: false,
      });

    if (error) {
      console.error('[api/blog/upload] storage error:', error);
      return apiError('INTERNAL_ERROR', 'Could not upload image to storage.', 500);
    }

    const { data: pub } = admin.storage.from('blog-media').getPublicUrl(objectPath);

    await writeAuditLog({
      actorId: user.id,
      action: 'blog.image_uploaded',
      entityType: 'storage',
      entityId: objectPath,
      details: { byteSize: checked.byteSize, mime: checked.mime },
      request,
    });

    return apiOk({ url: pub.publicUrl }, { status: 201 });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to upload image.', 500);
  }
}

