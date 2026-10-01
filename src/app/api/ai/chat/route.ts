import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';

// POST /api/ai/chat
// body: { messages: [{role, content}][], systemKnowledge?: string }
export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();
  const { messages, systemKnowledge } = body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    systemKnowledge?: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return apiError('messages array is required');
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey || openAiKey.trim().length === 0) {
    return apiError('AI is not configured. Please check OPENAI_API_KEY in settings.');
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const systemPrompt = `You are Anweo AI, an intelligent assistant built into the Anweo CRM. You help the Anweo marketing agency team with:
- Learning about Anweo's services, clients, and strategies
- Answering questions about digital marketing, lead generation, and sales
- Helping craft pitches, emails, and WhatsApp messages
- Providing business insights and suggestions for the team

${systemKnowledge ? `\n=== ANWEO KNOWLEDGE BASE ===\n${systemKnowledge}\n=== END KNOWLEDGE BASE ===\n` : ''}

Always be professional, concise, and helpful. You represent Anweo's brand.`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return apiError(`AI API Error: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '';
    return apiSuccess({ reply });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : 'AI request failed');
  }
});
