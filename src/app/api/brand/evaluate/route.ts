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

export const POST = withAuth(async ({ session }) => {
  if (session.role !== 'admin') return apiError('Forbidden', 403);

  const kb = await getBrandKnowledge();
  const companyData = kb['full_knowledge'] || '';

  if (!companyData || companyData.length < 50) {
    return apiSuccess({ 
      isConfused: true, 
      reason: "You haven't provided enough data yet. Please tell me your company name, what you do, and who your target audience is." 
    });
  }

  const prompt = `You are evaluating a company's "Brand Knowledge Base". This data is used by AI to write highly personalized sales pitches, emails, and call scripts.

CURRENT DATA:
---
${companyData}
---

Evaluate if this data is sufficient for an AI to write a good pitch.
If it lacks critical details (like what the company actually does, who they sell to, or what their unique value is), then you are CONFUSED.
If it has enough detail, you are CLEAR.

Respond ONLY with valid JSON in this exact format:
{
  "isConfused": boolean,
  "reason": "If confused, write a 1-2 sentence friendly explanation of what is missing."
}`;

  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: getModel(),
      contents: prompt
    });

    let text = response.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return apiSuccess({ isConfused: false, reason: "" }); // Fallback
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return apiSuccess(parsed);
  } catch (err: unknown) {
    return apiSuccess({ isConfused: false, reason: "" }); // Fallback on error
  }
});
