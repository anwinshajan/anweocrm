import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getBrandKnowledge, setBrandKnowledge } from '@/lib/data';

export const GET = withAuth(async () => {
  const kb = await getBrandKnowledge();
  return apiSuccess(kb);
});

export const POST = withAuth(async ({ req }) => {
  const body = await req.json();
  const { key, value } = body;
  
  if (!key) return apiError('Key is required');
  
  await setBrandKnowledge(key, value || '');
  return apiSuccess({ key, value });
}, true); // Admin only
