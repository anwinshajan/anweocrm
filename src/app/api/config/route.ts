import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getConfig, upsertConfigItem } from '@/lib/data';

export const GET = withAuth(async ({ session, req }) => {
  const { searchParams } = req.nextUrl;
  const listName = searchParams.get('list_name');
  const all = await getConfig();
  if (listName) return apiSuccess(all.filter((c) => c.list_name === listName));
  return apiSuccess(all);
});

export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();
  if (!body.list_name || !body.value) return apiError('list_name and value required');
  await upsertConfigItem(body);
  return apiSuccess({ ok: true });
}, true);
