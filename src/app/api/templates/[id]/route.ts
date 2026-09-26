import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { updateTemplate } from '@/lib/data';

export const PATCH = withAuth(async ({ req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  if (!id) return apiError('Missing id');
  const body = await req.json();
  const updated = await updateTemplate(id, body);
  if (!updated) return apiError('Template not found', 404);
  return apiSuccess(updated);
}, true);
