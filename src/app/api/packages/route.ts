import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import {
  getPackages,
  getActivePackages,
  createPackage,
  updatePackage,
} from '@/lib/data';

export const GET = withAuth(async ({ session, req }) => {
  const { searchParams } = req.nextUrl;
  const serviceId = searchParams.get('service_id');
  const activeOnly = searchParams.get('active') === 'true';

  let packages = activeOnly ? await getActivePackages() : await getPackages();
  if (serviceId) packages = packages.filter((p) => p.service_id === serviceId);
  return apiSuccess(packages);
});

export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();
  if (!body.service_id || !body.name) return apiError('service_id and name are required');
  const pkg = await createPackage(body);
  return apiSuccess(pkg, 201);
}, true);
