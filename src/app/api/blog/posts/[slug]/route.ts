import { revalidatePath } from 'next/cache';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { blogPostUpsertSchema } from '@/lib/validation/schemas';
import { estimateReadMins } from '@/lib/markdown';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
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

    const rl = checkRateLimit(`blog-write:${user.id}`, 60, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many blog updates. Try again shortly.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const { slug: origSlug } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = blogPostUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Check all blog fields.',
        400,
      );
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { data: current } = await admin
      .from('posts')
      .select('*')
      .eq('slug', origSlug)
      .maybeSingle();

    if (!current) {
      return apiError('NOT_FOUND', 'Post not found.', 404);
    }

    const data = parsed.data;
    // Preserve published URL slug once published; allow renaming drafts cleanly
    const targetSlug = current.status === 'published' ? current.slug : data.slug;

    if (targetSlug !== current.slug) {
      const { data: collision } = await admin
        .from('posts')
        .select('slug')
        .eq('slug', targetSlug)
        .maybeSingle();
      if (collision) {
        return apiError('CONFLICT', 'That URL slug is already in use.', 409);
      }
    }

    let nextStatus = current.status;
    let nextPublishedAt = current.published_at;
    if (data.action === 'publish' || data.action === 'update') {
      nextStatus = 'published';
      if (!nextPublishedAt) nextPublishedAt = new Date().toISOString();
    } else if (data.action === 'unpublish') {
      nextStatus = 'draft';
    }

    const { data: updated, error } = await admin
      .from('posts')
      .update({
        slug: targetSlug,
        title: data.title,
        category: data.category,
        author_name: data.author_name,
        focus_keyword: data.focus_keyword,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        body_md: data.body_md,
        read_mins: estimateReadMins(data.body_md),
        status: nextStatus,
        published_at: nextPublishedAt,
      })
      .eq('slug', origSlug)
      .select('*')
      .single();

    if (error || !updated) {
      return apiError('INTERNAL_ERROR', 'Could not update post.', 500);
    }

    if (targetSlug !== origSlug) {
      await admin.from('redirects').upsert(
        {
          from_path: `/blog/${origSlug}`,
          to_path: `/blog/${targetSlug}`,
          status: 301,
        },
        { onConflict: 'from_path' },
      );
    }

    await writeAuditLog({
      actorId: user.id,
      action: `blog.${data.action}`,
      entityType: 'post',
      entityId: updated.slug,
      details: { origSlug, status: updated.status },
      request,
    });

    revalidatePath('/');
    revalidatePath('/blog');
    revalidatePath(`/blog/${origSlug}`);
    revalidatePath(`/blog/${updated.slug}`);
    revalidatePath('/sitemap.xml');

    return apiOk({ post: updated });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to update post.', 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
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

    const rl = checkRateLimit(`blog-write:${user.id}`, 60, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many blog updates. Try again shortly.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const { slug } = await context.params;
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { error } = await admin.from('posts').delete().eq('slug', slug);
    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not delete post.', 500);
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'blog.deleted',
      entityType: 'post',
      entityId: slug,
      request,
    });

    revalidatePath('/');
    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    revalidatePath('/sitemap.xml');

    return apiOk({});
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to delete post.', 500);
  }
}
