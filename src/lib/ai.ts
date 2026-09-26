// ============================================================
// AI Module — Anthropic API, server-side only
// All prompts load services/config at runtime — NEVER hardcoded
// ============================================================

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass local intercept proxy TLS issues

import { GoogleGenAI } from '@google/genai';
import { getActiveServices, getActivePackages, getBrandKnowledge, getConfigList, getSettings } from './data';
import type { Lead, Research, AuditResult, Service, Package } from './types';

function getClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

function getModel(): string {
  return process.env.AI_MODEL ?? 'gemini-3.8-flash';
}

async function callAI(prompt: string, useSearch = false): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Groq API Error: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    return data.choices[0].message.content || '';
  }

  const client = getClient();
  const response = await client.models.generateContent({
    model: getModel(),
    contents: prompt,
    config: useSearch ? { tools: [{ googleSearch: {} }] } : undefined
  });
  return response.text || '';
}

// ─── Context loaders ─────────────────────────────────────────

async function loadAIContext() {
  const [services, packages, brandKnowledge, auditChecks, settings] = await Promise.all([
    getActiveServices(),
    getActivePackages(),
    getBrandKnowledge(),
    getConfigList('audit_checks'),
    getSettings(),
  ]);
  return { services, packages, brandKnowledge, auditChecks, settings };
}

function formatServicesForPrompt(services: Service[], packages: Package[]): string {
  return services
    .map((s) => {
      const pkgs = packages
        .filter((p) => p.service_id === s.id)
        .map((p) => `      - ${p.name}: ₹${p.price} (${p.deliverables})`)
        .join('\n');
      return `  [${s.id}] ${s.name} (rank ${s.priority_rank})
    Description: ${s.description}
    Ideal customer: ${s.ideal_customer}
    Pitch angle: ${s.pitch_angle}
${pkgs ? `    Packages:\n${pkgs}` : ''}`;
    })
    .join('\n\n');
}

function formatBrandKnowledge(bk: Record<string, string>): string {
  return Object.entries(bk)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// ─── 1. Research ─────────────────────────────────────────────

export async function generateResearch(lead: Lead): Promise<Research> {
  const ctx = await loadAIContext();
  const auditCheckNames = ctx.auditChecks.map((c) => c.label || c.value);

  const prompt = `You are a business researcher for Anweo, a digital marketing agency in Kerala, India.

AGENCY CONTEXT:
${formatBrandKnowledge(ctx.brandKnowledge)}

ACTIVE SERVICES (you may ONLY recommend these, ordered by priority):
${formatServicesForPrompt(ctx.services, ctx.packages)}

AUDIT CHECKS TO PERFORM:
${auditCheckNames.map((c) => `- ${c}`).join('\n')}

LEAD INFO:
Business Name: ${lead.business_name}
Category: ${lead.category}
City: ${lead.city}
Phone: ${lead.phone}
Website: ${lead.website || 'unknown'}
Instagram: ${lead.instagram || 'unknown'}
Facebook: ${lead.facebook || 'unknown'}
Google Maps: ${lead.google_maps_url || 'unknown'}

TASK: Research this business. Search for:
1. Owner/manager name
2. Business story / how long they've been operating
3. Key services they offer
4. Google review highlights (sentiment, common praise/complaints)
5. Social media presence quality
6. Website quality (if any)
7. Any recent news or notable achievements

Then audit each check and identify gaps. Recommend the single most fitting active service (use service id from the list above).

IMPORTANT: If you cannot find something, say "unknown" — never invent facts.

Respond ONLY with valid JSON in this exact schema:
{
  "summary": "2-3 sentence overview",
  "owner_name": "string or unknown",
  "business_story": "string",
  "review_highlights": "string",
  "audit_results": {
    ${auditCheckNames.map((c) => `"${c}": "pass" | "fail" | "unknown"`).join(',\n    ')}
  },
  "gaps_found": "comma-separated list of what they're missing",
  "opportunity_summary": "2-3 sentences on why Anweo can help",
  "recommended_service_id": "service id from the list above"
}`;

  let text = await callAI(prompt, true);

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON for research');

  const parsed = JSON.parse(jsonMatch[0]);

  const research: Research = {
    lead_id: lead.id,
    summary: parsed.summary ?? '',
    owner_name: parsed.owner_name ?? 'unknown',
    business_story: parsed.business_story ?? '',
    review_highlights: parsed.review_highlights ?? '',
    audit_results: JSON.stringify(parsed.audit_results ?? {}),
    gaps_found: parsed.gaps_found ?? '',
    opportunity_summary: parsed.opportunity_summary ?? '',
    recommended_service_id: parsed.recommended_service_id ?? '',
    generated_at: new Date().toISOString(),
  };

  return research;
}

// ─── 2. Call Note ────────────────────────────────────────────

export async function generateCallNote(
  lead: Lead,
  research: Research
): Promise<{ call_prep_note: string; opening_lines: string; objection_handlers: string }> {
  const ctx = await loadAIContext();

  const prompt = `You are a sales coach for Anweo, a digital marketing agency in Kerala, India.

AGENCY CONTEXT:
${formatBrandKnowledge(ctx.brandKnowledge)}

ACTIVE SERVICES:
${formatServicesForPrompt(ctx.services, ctx.packages)}

BUSINESS:
Name: ${lead.business_name}
City: ${lead.city}
Category: ${lead.category}
Owner: ${research.owner_name}
Story: ${research.business_story}
Reviews: ${research.review_highlights}
Gaps: ${research.gaps_found}
Opportunity: ${research.opportunity_summary}

Write a SHORT, PRACTICAL call prep note for a sales caller. Include:
1. A 3-sentence brief (what the business does, who the owner is, what they're missing)
2. Three specific opening lines the caller can use (reference something real about the business)
3. Three likely objections with punchy, honest replies

Keep it short. Callers read this on their phone before calling.

Respond ONLY with valid JSON:
{
  "call_prep_note": "string",
  "opening_lines": ["line1", "line2", "line3"],
  "objection_handlers": [{"objection": "string", "reply": "string"}]
}`;

  let text = await callAI(prompt, false);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON for call note');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    call_prep_note: parsed.call_prep_note ?? '',
    opening_lines: Array.isArray(parsed.opening_lines)
      ? parsed.opening_lines.join('\n')
      : parsed.opening_lines ?? '',
    objection_handlers: Array.isArray(parsed.objection_handlers)
      ? parsed.objection_handlers
          .map((o: { objection: string; reply: string }) => `Q: ${o.objection}\nA: ${o.reply}`)
          .join('\n\n')
      : parsed.objection_handlers ?? '',
  };
}

// ─── 3. Pitch ────────────────────────────────────────────────

export async function generatePitch(
  lead: Lead,
  research: Research,
  serviceId: string,
  language: 'english' | 'malayalam' | 'manglish' = 'english'
): Promise<{ message_text: string; wa_link: string }> {
  const ctx = await loadAIContext();
  const service = ctx.services.find((s) => s.id === serviceId);
  if (!service) throw new Error(`Service ${serviceId} not found or not active`);

  const packages = ctx.packages.filter((p) => p.service_id === serviceId);

  const prompt = `You are a WhatsApp sales copywriter for Anweo, a digital marketing agency in Kerala, India.

AGENCY CONTEXT:
${formatBrandKnowledge(ctx.brandKnowledge)}

SERVICE TO PITCH: ${service.name}
Description: ${service.description}
Pitch angle: ${service.pitch_angle}
${packages.length > 0 ? `Packages: ${packages.map((p) => `${p.name} ₹${p.price}`).join(', ')}` : ''}

BUSINESS:
Name: ${lead.business_name}
Owner: ${research.owner_name}
City: ${lead.city}
Category: ${lead.category}
Story: ${research.business_story}
What they're missing: ${research.gaps_found}

LANGUAGE: ${language}

RULES:
- Under 90 words
- Open with something SPECIFIC and TRUE about this business (not generic)
- Name ONE specific problem they have, ONE specific outcome we deliver
- Use at least one element of: specificity, social proof, reciprocity (free audit/mock-up), or low-friction CTA
- End with a soft CTA (not "buy now")
- NO false claims, NO made-up stats
- Sound natural, human, WhatsApp-friendly
- Never sound like a template

Write ONLY the message. No explanation. No subject line. Just the WhatsApp message text.`;

  let message_text = await callAI(prompt, false);

  message_text = message_text.trim();

  // Build wa.me link
  const waNumber = (lead.whatsapp_number || lead.phone).replace(/\D/g, '');
  const waFull = waNumber.startsWith('91') ? waNumber : `91${waNumber}`;
  const wa_link = `https://wa.me/${waFull}?text=${encodeURIComponent(message_text)}`;

  return { message_text, wa_link };
}

// ─── 4. Classify Reply ───────────────────────────────────────

export async function classifyReply(
  replyText: string,
  lead: Lead
): Promise<{
  classification: 'interested' | 'objection' | 'not_interested' | 'unclear';
  suggested_next: string;
}> {
  const ctx = await loadAIContext();

  const prompt = `You are a sales assistant for Anweo, a digital marketing agency in Kerala.

A lead just replied to a WhatsApp pitch. Classify the reply and suggest the next message.

Business: ${lead.business_name} (${lead.city}, ${lead.category})

Reply: "${replyText}"

Classify as one of:
- interested (clearly wants to know more or schedule a call)
- objection (has a concern but not a flat no)
- not_interested (clear rejection)
- unclear (can't tell)

Then suggest a short, natural next WhatsApp message (under 60 words) appropriate for the classification.

Active services available: ${ctx.services.map((s) => s.name).join(', ')}

Respond ONLY with valid JSON:
{
  "classification": "interested" | "objection" | "not_interested" | "unclear",
  "suggested_next": "string"
}`;

  let text = await callAI(prompt, false);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { classification: 'unclear', suggested_next: '' };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    classification: parsed.classification ?? 'unclear',
    suggested_next: parsed.suggested_next ?? '',
  };
}
