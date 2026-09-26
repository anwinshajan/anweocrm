import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { GoogleGenAI } from '@google/genai';
import { getBrandKnowledge } from '@/lib/data';

function getClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

function getModel(): string {
  return process.env.AI_MODEL ?? 'gemini-3.8-flash';
}

export const POST = withAuth(async ({ session, req }) => {
  if (session.role !== 'admin') return apiError('Forbidden', 403);

  const { message, history } = await req.json();

  if (!message) return apiError('Message is required');

  const kb = await getBrandKnowledge();
  const companyData = kb['full_knowledge'] || 'No company data provided yet.';

  const prompt = `You are an AI assistant helping the owner of an agency refine their Brand Knowledge Base.
The Brand Knowledge Base is used by you (the AI) in other parts of the CRM to write sales pitches, emails, and call scripts.
Your goal is to help the owner clarify their brand identity, offer suggestions, or answer questions based on what they've provided.

CURRENT BRAND KNOWLEDGE BASE CONTENT:
---
${companyData}
---

If the knowledge base is empty or sparse, encourage them to add details like target audience, tone of voice, services, and unique value proposition.
If they ask you a question, answer it based ONLY on their brand knowledge base.
Be concise, helpful, and conversational.`;

  try {
    const client = getClient();
    
    // The history mapping is slightly different for Gemini.
    // Anthropic uses 'user'/'assistant', Gemini uses 'user'/'model'.
    const formattedHistory = history.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    formattedHistory.push({ role: 'user', parts: [{ text: message }] });

    const response = await client.models.generateContent({
      model: getModel(),
      contents: formattedHistory,
      config: {
        systemInstruction: prompt
      }
    });

    return apiSuccess({ reply: response.text || '' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI chat failed';
    return apiError(msg, 500);
  }
});
