import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import {
  getLeadsPaginated,
  createLead,
  findDuplicateByPhone,
  getLeadsByUser,
} from '@/lib/data/leads';
import { addActivity, addLog, incrementStat } from '@/lib/data';

// GET /api/leads — list leads with pagination and filters
export const GET = withAuth(async ({ session, req }) => {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25', 10);

  const filters: Record<string, string> = {};
  ['status', 'assigned_to', 'city', 'tag', 'search'].forEach((k) => {
    const v = searchParams.get(k);
    if (v) filters[k] = v;
  });

  // Team members only see their own leads
  if (session.role !== 'admin' && !session.permissions.can_view_all_leads) {
    filters['assigned_to'] = session.id;
  }

  const result = await getLeadsPaginated(page, pageSize, filters);
  return apiSuccess(result);
});

// POST /api/leads — create a lead
export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();

  if (!body.business_name) {
    return apiError('business_name is required');
  }

  // Duplicate check
  if (body.phone || body.whatsapp_number) {
    const dup = await findDuplicateByPhone(body.phone || body.whatsapp_number);
    if (dup) {
      return NextResponse.json(
        { success: false, error: 'duplicate', existing: dup },
        { status: 409 }
      );
    }
  }

  const lead = await createLead({
    ...body,
    added_by: session.id,
    assigned_to: body.assigned_to || session.id,
    status: body.status || 'New',
  });

  await addActivity({
    lead_id: lead.id,
    user_id: session.id,
    type: 'created',
    content: `Lead created by ${session.username}`,
  });

  const today = new Date().toISOString().slice(0, 10);
  await incrementStat(today, session.id, 'leads_added').catch(() => {});
  await addLog({ user: session.username, action: 'CREATE_LEAD', details: lead.business_name });

  return apiSuccess(lead, 201);
});
