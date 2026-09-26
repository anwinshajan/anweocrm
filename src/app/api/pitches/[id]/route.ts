import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { updatePitch, deletePitch } from '@/lib/data';

export const PATCH = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const body = await req.json();
  const updated = await updatePitch(id, { ...body, edited_by: session.id });
  if (!updated) return apiError('Pitch not found', 404);
  return apiSuccess(updated);
});

export const DELETE = withAuth(async ({ session }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const success = await deletePitch(id);
  if (!success) return apiError('Pitch not found', 404);
  return apiSuccess(null);
});
