import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import {
  getServices,
  getActiveServices,
  createService,
  updateService,
  deactivateService,
  addLog,
} from '@/lib/data';

// GET /api/services
export const GET = withAuth(async ({ session, req }) => {
  const { searchParams } = req.nextUrl;
  const activeOnly = searchParams.get('active') === 'true';
  const services = activeOnly ? await getActiveServices() : await getServices();
  return apiSuccess(services);
});

// POST /api/services — admin only
export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();
  if (!body.name) return apiError('Service name is required');

  const service = await createService(body);
  await addLog({ user: session.username, action: 'CREATE_SERVICE', details: body.name });
  return apiSuccess(service, 201);
}, true);
