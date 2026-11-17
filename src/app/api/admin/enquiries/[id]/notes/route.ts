import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const noteSchema = z.object({
  body: z.string().trim().min(1).max(3000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { id: enquiryId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a note before saving.' }, { status: 400 });
  }

  const { data: note, error } = await guard.admin
    .from('enquiry_notes')
    .insert({
      enquiry_id: enquiryId,
      author_id: guard.user.id,
      body: parsed.data.body,
    })
    .select('*')
    .single();

  if (error || !note) {
    return NextResponse.json({ error: 'Could not add note.' }, { status: 500 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: 'enquiry.note_added',
    entityType: 'enquiry',
    entityId: enquiryId,
    request,
  });

  return NextResponse.json({ ok: true, note }, { status: 201 });
}

