import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { updateService, deactivateService, addLog } from '@/lib/data';

// PATCH /api/services/[id] — admin only
export const PATCH = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const body = await req.json();
  const updated = await updateService(id, body);
  if (!updated) return apiError('Service not found', 404);
  await addLog({ user: session.username, action: 'UPDATE_SERVICE', details: id });
  return apiSuccess(updated);
}, true);

// DELETE /api/services/[id] — deactivates, never hard deletes
export const DELETE = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  await deactivateService(id);
  await addLog({ user: session.username, action: 'DEACTIVATE_SERVICE', details: id });
  return apiSuccess({ id });
}, true);
