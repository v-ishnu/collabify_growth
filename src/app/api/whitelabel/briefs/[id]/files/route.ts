import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { validateUploadedFile } from '@/lib/upload/validate';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user, profile, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const rl = checkRateLimit(`wl-files-read:${user.id}`, 60, 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many file requests.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const { id: briefId } = await context.params;
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { data: brief } = await admin
      .from('wl_briefs')
      .select('id, partner_id')
      .eq('id', briefId)
      .maybeSingle();

    if (!brief) {
      return apiError('NOT_FOUND', 'Brief not found.', 404);
    }

    if (brief.partner_id !== user.id && !isStaffRole(profile?.role)) {
      return apiError('FORBIDDEN', 'Forbidden', 403);
    }

    const { data: files, error } = await admin
      .from('wl_brief_files')
      .select('*')
      .eq('brief_id', briefId)
      .order('created_at', { ascending: false });

    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not load brief files.', 500);
    }

    const signedFiles = await Promise.all(
      (files ?? []).map(async (f) => {
        const { data: signed } = await admin.storage
          .from('wl-briefs')
          .createSignedUrl(f.storage_path, 900);
        return {
          ...f,
          signed_url: signed?.signedUrl ?? null,
        };
      }),
    );

    return apiOk({ files: signedFiles });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to fetch files.', 500);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const { user, profile, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const rl = checkRateLimit(`wl-files-upload:${user.id}`, 25, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many attachment uploads.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const { id: briefId } = await context.params;
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { data: brief } = await admin
      .from('wl_briefs')
      .select('id, partner_id')
      .eq('id', briefId)
      .maybeSingle();

    if (!brief) {
      return apiError('NOT_FOUND', 'Brief not found.', 404);
    }

    const staff = isStaffRole(profile?.role);
    if (brief.partner_id !== user.id && !staff) {
      return apiError('FORBIDDEN', 'Forbidden', 403);
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('file');
    if (!(file instanceof File)) {
      return apiError('VALIDATION_ERROR', 'Select a file to upload.', 400);
    }

    const checked = await validateUploadedFile(file, 'brief-attachment');
    if (!checked.ok) {
      return apiError('VALIDATION_ERROR', checked.error, 400);
    }

    const objectPath = `${brief.partner_id}/${brief.id}/${Date.now()}-${checked.safeName}`;
    const { error: uploadErr } = await admin.storage
      .from('wl-briefs')
      .upload(objectPath, checked.buffer, {
        contentType: checked.mime,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[api/whitelabel/briefs/files] storage upload failed:', uploadErr);
      return apiError('INTERNAL_ERROR', 'Could not store uploaded file.', 500);
    }

    const { data: fileRow, error: rowErr } = await admin
      .from('wl_brief_files')
      .insert({
        brief_id: brief.id,
        storage_path: objectPath,
        uploaded_by: user.id,
        file_name: checked.safeName,
        mime_type: checked.mime,
        byte_size: checked.byteSize,
      })
      .select('*')
      .single();

    if (rowErr || !fileRow) {
      await admin.storage.from('wl-briefs').remove([objectPath]).catch(() => null);
      return apiError('INTERNAL_ERROR', 'Could not record attachment.', 500);
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'whitelabel.file_uploaded',
      entityType: 'wl_brief',
      entityId: brief.id,
      details: { file_name: checked.safeName, byte_size: checked.byteSize },
      request,
    });

    return apiOk({ file: fileRow }, { status: 201 });
  } catch (err) {
    console.error('[api/whitelabel/briefs/files] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to upload attachment.', 500);
  }
}
