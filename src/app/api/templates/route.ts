import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getTemplates, createTemplate, updateTemplate } from '@/lib/data';

export const GET = withAuth(async ({ req }) => {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type');
  const activeOnly = searchParams.get('active') === 'true';

  let templates = await getTemplates();
  if (type) templates = templates.filter(t => t.type === type);
  if (activeOnly) templates = templates.filter(t => t.active === 'TRUE');
  return apiSuccess(templates);
});

export const POST = withAuth(async ({ req }) => {
  const body = await req.json();
  if (!body.name || !body.type || !body.body) {
    return apiError('name, type, and body are required');
  }
  const template = await createTemplate({
    name: body.name,
    type: body.type,
    body: body.body,
    variables: body.variables ?? '',
    active: body.active ?? 'TRUE',
  });
  return apiSuccess(template, 201);
}, true);
