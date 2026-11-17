import { revalidatePath } from 'next/cache';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { blogPostUpsertSchema } from '@/lib/validation/schemas';
import { estimateReadMins } from '@/lib/markdown';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDrafts = searchParams.get('includeDrafts') === '1';

    let allowDrafts = false;
    if (includeDrafts) {
      const { user, profile } = await getSessionUserAndProfile();
      allowDrafts = Boolean(user && isStaffRole(profile?.role));
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiOk({ posts: [] });
    }

    let query = admin
      .from('posts')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (!allowDrafts) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not load posts.', 500);
    }

    return apiOk({ posts: data ?? [] });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to fetch posts.', 500);
  }
}

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

    const rl = checkRateLimit(`blog-write:${user.id}`, 30, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many blog updates. Try again shortly.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

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

    const data = parsed.data;
    const { data: existing } = await admin
      .from('posts')
      .select('slug')
      .eq('slug', data.slug)
      .maybeSingle();

    if (existing) {
      return apiError('CONFLICT', 'An article with this URL slug already exists.', 409);
    }

    const isPublishing = data.action === 'publish' || data.action === 'update';
    const status = isPublishing ? 'published' : 'draft';

    const { data: post, error } = await admin
      .from('posts')
      .insert({
        slug: data.slug,
        title: data.title,
        category: data.category,
        author_name: data.author_name,
        author_id: user.id,
        focus_keyword: data.focus_keyword,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        body_md: data.body_md,
        read_mins: estimateReadMins(data.body_md),
        status,
        published_at: isPublishing ? new Date().toISOString() : null,
      })
      .select('*')
      .single();

    if (error || !post) {
      console.error('[api/blog/posts] insert error:', error);
      return apiError('INTERNAL_ERROR', 'Could not save post.', 500);
    }

    await writeAuditLog({
      actorId: user.id,
      action: isPublishing ? 'blog.published' : 'blog.draft_created',
      entityType: 'post',
      entityId: post.slug,
      details: { title: post.title },
      request,
    });

    revalidatePath('/');
    revalidatePath('/blog');
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath('/sitemap.xml');

    return apiOk({ post }, { status: 201 });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to save post.', 500);
  }
}

