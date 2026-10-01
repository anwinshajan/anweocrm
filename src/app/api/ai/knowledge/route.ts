import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getSettings, setSetting } from '@/lib/data';

// GET /api/ai/knowledge — returns the saved Anweo knowledge base
export const GET = withAuth(async ({ session }) => {
  const settings = await getSettings();
  return apiSuccess({ knowledge: settings['anweo_ai_knowledge'] || '' });
});

// POST /api/ai/knowledge — saves the Anweo knowledge base (admin only)
export const POST = withAuth(async ({ session, req }) => {
  if (session.role !== 'admin') return apiError('Admin only', 403);
  const body = await req.json();
  const { knowledge } = body as { knowledge: string };
  if (knowledge === undefined) return apiError('knowledge field is required');
  await setSetting('anweo_ai_knowledge', knowledge);
  return apiSuccess({ saved: true });
}, false);
