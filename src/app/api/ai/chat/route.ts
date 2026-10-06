import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getSettings } from '@/lib/data';
import { getLeads, getLeadsByUser } from '@/lib/data/leads';
import { getDeals, getActiveUsers } from '@/lib/data';

export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();
  const { messages, systemKnowledge } = body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    systemKnowledge?: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return apiError('messages array is required');
  }

  const settings = await getSettings();
  const openAiKey = settings['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY;
  if (!openAiKey || openAiKey.trim().length === 0) {
    return apiError('AI is not configured. Please check OPENAI_API_KEY in settings.');
  }

  const baseUrl = settings['OPENAI_BASE_URL'] || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = settings['AI_MODEL'] || process.env.AI_MODEL || 'gpt-4o-mini';

  // --- Dynamic CRM Context Injection ---
  let dynamicContext = '';

  if (session.role === 'admin') {
    const [leads, deals, users] = await Promise.all([getLeads(), getDeals(), getActiveUsers()]);
    const activeLeads = leads.filter(l => l.status !== 'Deleted');
    const totalRevenue = deals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);
    
    dynamicContext = `
      CURRENT USER ROLE: ADMIN (Full Access)
      TOTAL ACTIVE LEADS: ${activeLeads.length}
      TOTAL REVENUE: ₹${totalRevenue}
      ACTIVE TEAM MEMBERS: ${users.length} (${users.map(u => u.username).join(', ')})
      
      You have FULL administrative access to all confidentials, revenue, and team data.
      You can provide detailed company-wide reports.
      If the user asks for a chart or graph, ALWAYS format it using standard Markdown Tables or use Mermaid.js code blocks (e.g., \`\`\`mermaid pie ... \`\`\`).
    `;
  } else {
    const leads = await getLeadsByUser(session.id);
    const activeLeads = leads.filter(l => l.status !== 'Deleted');
    
    dynamicContext = `
      CURRENT USER ROLE: TEAM MEMBER (Restricted Access)
      USER NAME: ${session.username}
      USER'S ASSIGNED LEADS: ${activeLeads.length}
      
      SECURITY CAP ENFORCED: 
      - DO NOT reveal any admin-level information.
      - DO NOT reveal company-wide revenue or confidentials.
      - DO NOT reveal information about other team members, coworkers, or unassigned leads.
      - If the user asks for restricted data, politely refuse and remind them of their access level.
      - You can provide detailed reports on their OWN ${activeLeads.length} leads.
      - Use Markdown tables for data visualization when asked.
    `;
  }

  const systemPrompt = `You are AnweoAI, the intelligent assistant built into the Anweo CRM. 
You maintain the CRM and answer questions about reports, status, and metrics.

=== DYNAMIC CRM STATE ===
${dynamicContext}

=== ANWEO KNOWLEDGE BASE ===
${systemKnowledge ? systemKnowledge : 'No external knowledge base provided.'}

Guidelines:
1. Always be professional, highly detailed, and helpful. 
2. If graphics or charts are requested, use Markdown Tables or Mermaid.js.
3. Strictly adhere to the SECURITY CAP provided in your state.`;

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
        max_tokens: 1500,
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
