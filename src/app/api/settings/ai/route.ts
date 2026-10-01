import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import fs from 'fs';
import path from 'path';

// GET /api/settings/ai — returns current AI provider settings
export const GET = withAuth(async ({ session }) => {
  if (session.role !== 'admin') return apiError('Unauthorized', 403);

  const hasOpenAIKey = !!(process.env.OPENAI_API_KEY?.trim());
  const baseUrl = process.env.OPENAI_BASE_URL || '';
  const isCompatible = baseUrl.length > 0 && baseUrl !== 'https://api.openai.com/v1';

  return apiSuccess({
    provider: isCompatible ? 'openai_compatible' : 'openai',
    // Mask the API key — show last 8 chars only
    apiKey: hasOpenAIKey
      ? '•'.repeat(Math.max(0, (process.env.OPENAI_API_KEY?.length || 0) - 8)) + (process.env.OPENAI_API_KEY?.slice(-8) || '')
      : '',
    model: process.env.AI_MODEL || 'agnes-2.5-flash',
    baseUrl: process.env.OPENAI_BASE_URL || '',
  });
}, true);

// POST /api/settings/ai — writes AI settings to .env.local
export const POST = withAuth(async ({ session, req }) => {
  if (session.role !== 'admin') return apiError('Unauthorized', 403);

  const body = await req.json();
  const { provider, apiKey, model, baseUrl } = body as {
    provider: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  };

  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  function upsertEnvVar(content: string, key: string, value: string): string {
    const regex = new RegExp(`^#?\\s*${key}=.*$`, 'm');
    if (content.match(regex)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  }

  // Only update API key if a real value was sent (not masked dots)
  if (apiKey && !apiKey.startsWith('•')) {
    envContent = upsertEnvVar(envContent, 'OPENAI_API_KEY', apiKey);
  }

  if (model) {
    envContent = upsertEnvVar(envContent, 'AI_MODEL', model);
  }

  if (provider === 'openai_compatible' && baseUrl) {
    envContent = upsertEnvVar(envContent, 'OPENAI_BASE_URL', baseUrl);
  } else if (provider === 'openai') {
    // Use official OpenAI endpoint
    envContent = upsertEnvVar(envContent, 'OPENAI_BASE_URL', 'https://api.openai.com/v1');
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

  return apiSuccess({ message: 'AI settings saved. Restart the server to apply changes.' });
}, true);
