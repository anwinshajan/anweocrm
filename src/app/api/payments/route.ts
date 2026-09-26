import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getPayments, createPayment, getPaymentsByUser } from '@/lib/data/payments';
import { addLog } from '@/lib/data';

// GET /api/payments
export const GET = withAuth(async ({ session, req }) => {
  // If admin, return all payments. If team, return only their own.
  if (session.role === 'admin') {
    const payments = await getPayments();
    return apiSuccess(payments);
  } else {
    const payments = await getPaymentsByUser(session.id);
    return apiSuccess(payments);
  }
});

// POST /api/payments - Admin only
export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();
  if (!body.user_id || !body.amount) {
    return apiError('user_id and amount are required');
  }

  const payment = await createPayment(body);
  
  await addLog({
    user: session.username,
    action: 'CREATE_PAYMENT',
    details: `Created payment of ${body.amount} for user ${body.user_id}`
  });

  return apiSuccess(payment, 201);
}, true); // requireAdmin = true
