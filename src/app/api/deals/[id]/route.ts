import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { updateDeal } from '@/lib/data';
import { updateLead } from '@/lib/data/leads';
import { addLog } from '@/lib/data';

// PATCH /api/deals/[id]
export const PATCH = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const body = await req.json();
  
  const updated = await updateDeal(id, body);
  if (!updated) return apiError('Deal not found', 404);

  if (body.deal_value !== undefined) {
    await updateLead(updated.lead_id, { deal_value: body.deal_value });
  }

  await addLog({
    user: session.username,
    action: 'UPDATE_DEAL',
    details: `Updated deal ${id}`
  });

  return apiSuccess(updated);
});
