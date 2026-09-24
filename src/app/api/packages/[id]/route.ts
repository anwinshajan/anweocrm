import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { updatePackage } from '@/lib/data';

export const PATCH = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const body = await req.json();
  const updated = await updatePackage(id, body);
  if (!updated) return apiError('Package not found', 404);
  return apiSuccess(updated);
}, true);
