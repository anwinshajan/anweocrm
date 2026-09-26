import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { createDeal, getDealForLead } from '@/lib/data';
import { updateLead } from '@/lib/data/leads';
import { addLog } from '@/lib/data';

// POST /api/deals
export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();
  const { lead_id, deal_value, advance_paid, balance_due, service_id } = body;
  
  if (!lead_id) return apiError('lead_id is required');

  const existing = await getDealForLead(lead_id);
  if (existing) {
    return apiError('A deal already exists for this lead');
  }

  const deal = await createDeal({
    lead_id,
    deal_value: deal_value || '0',
    advance_paid: advance_paid || '0',
    balance_due: balance_due || '0',
    service_id: service_id || '',
    service_name_snapshot: body.service_name_snapshot || '',
    package_id: body.package_id || '',
    package_name_snapshot: body.package_name_snapshot || '',
    start_date: new Date().toISOString(),
    delivery_status: 'In Progress',
    closed_by: '',
    closed_at: ''
  });

  // Also update the lead's deal_value
  await updateLead(lead_id, { deal_value: deal_value || '0' });

  await addLog({
    user: session.username,
    action: 'CREATE_DEAL',
    details: `Created deal for lead ${lead_id} (Value: ${deal_value})`
  });

  return apiSuccess(deal, 201);
});
