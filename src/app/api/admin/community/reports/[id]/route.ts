import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const reportActionSchema = z.object({
  action: z.enum(['delete_message', 'dismiss']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return NextResponse.json({ error: 'Invalid report id.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reportActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid report action.' }, { status: 400 });
  }

  const { data: report } = await guard.admin
    .from('message_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }

  if (parsed.data.action === 'delete_message') {
    await guard.admin
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: guard.user.id,
      })
      .eq('id', report.message_id);
  }

  const { data: updated, error } = await guard.admin
    .from('message_reports')
    .update({
      resolved: true,
      resolved_by: guard.user.id,
    })
    .eq('id', reportId)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'Could not update report.' }, { status: 500 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: `community.report_${parsed.data.action}`,
    entityType: 'message_report',
    entityId: String(reportId),
    details: { message_id: report.message_id },
    request,
  });

  return NextResponse.json({ ok: true, report: updated });
}

