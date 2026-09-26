import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { updatePayment, getPayments } from '@/lib/data/payments';
import { addLog } from '@/lib/data';

export const PATCH = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  
  const body = await req.json();
  const updated = await updatePayment(id, body);
  
  if (!updated) {
    return apiError('Payment not found', 404);
  }

  await addLog({
    user: session.username,
    action: 'UPDATE_PAYMENT',
    details: `Updated payment ${id}`
  });

  return apiSuccess(updated);
}, true); // requireAdmin = true
