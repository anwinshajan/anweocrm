import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getSettings, setSetting } from '@/lib/data';

// GET /api/settings/ai — returns current AI provider settings from the database
export const GET = withAuth(async ({ session }) => {
  if (session.role !== 'admin') return apiError('Unauthorized', 403);

  const settings = await getSettings();
  
  // Fallbacks to process.env if not set in DB
  const rawApiKey = settings['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY || '';
  const baseUrl = settings['OPENAI_BASE_URL'] || process.env.OPENAI_BASE_URL || '';
  const isCompatible = baseUrl.length > 0 && baseUrl !== 'https://api.openai.com/v1';

  return apiSuccess({
    provider: isCompatible ? 'openai_compatible' : 'openai',
    // Mask the API key — show last 8 chars only
    apiKey: rawApiKey
      ? '•'.repeat(Math.max(0, rawApiKey.length - 8)) + rawApiKey.slice(-8)
      : '',
    model: settings['AI_MODEL'] || process.env.AI_MODEL || 'agnes-2.5-flash',
    baseUrl: baseUrl,
  });
}, true);

// POST /api/settings/ai — writes AI settings to the database
export const POST = withAuth(async ({ session, req }) => {
  if (session.role !== 'admin') return apiError('Unauthorized', 403);

  const body = await req.json();
  const { provider, apiKey, model, baseUrl } = body as {
    provider: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  };

  // Only update API key if a real value was sent (not masked dots)
  if (apiKey && !apiKey.startsWith('•')) {
    await setSetting('OPENAI_API_KEY', apiKey);
  }

  if (model) {
    await setSetting('AI_MODEL', model);
  }

  if (provider === 'openai_compatible' && baseUrl) {
    await setSetting('OPENAI_BASE_URL', baseUrl);
  } else if (provider === 'openai') {
    // Use official OpenAI endpoint
    await setSetting('OPENAI_BASE_URL', 'https://api.openai.com/v1');
  }

  return apiSuccess({ message: 'AI settings saved. They are now live.' });
}, true);
