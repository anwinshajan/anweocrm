import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { getLeads } from '@/lib/data/leads';
import { getDeals, getActiveUsers, getSettings } from '@/lib/data';

// POST /api/telegram/webhook
// This receives messages from Telegram
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Telegram webhook payload has message.chat.id and message.text
    const message = body.message;
    if (!message || !message.text || !message.chat) {
      return NextResponse.json({ success: true }); // Acknowledge to Telegram so it doesn't retry
    }

    const chatId = message.chat.id.toString();
    const adminChatId = process.env.TELEGRAM_CHAT_ID;

    // Security Check: ONLY allow the admin to talk to the bot
    if (chatId !== adminChatId) {
      console.warn(`Unauthorized Telegram access attempt from Chat ID: ${chatId}`);
      await sendTelegramMessage("Unauthorized. You do not have access to Anweo CRM.");
      return NextResponse.json({ success: true });
    }

    const userPrompt = message.text;
    
    // Quick acknowledgment (optional, but good UX since Vercel has a 10s timeout on free tier)
    // Actually, Telegram expects a 200 OK fast. We must respond to Telegram, but Next.js API routes run synchronously.
    // To prevent timeout, we should process the AI response as fast as possible.

    // 1. Fetch Admin CRM Context
    const [leads, deals, users] = await Promise.all([getLeads(), getDeals(), getActiveUsers()]);
    const activeLeads = leads.filter(l => l.status !== 'Deleted');
    const totalRevenue = deals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);
    
    const dynamicContext = `
      CURRENT USER ROLE: ADMIN (Full Access via Telegram)
      TOTAL ACTIVE LEADS: ${activeLeads.length}
      TOTAL REVENUE: ₹${totalRevenue}
      ACTIVE TEAM MEMBERS: ${users.length} (${users.map(u => u.username).join(', ')})
      
      You have FULL administrative access to all confidentials, revenue, and team data.
      You are speaking to the Admin through Telegram. Keep your answers concise, mobile-friendly, and format data using simple lists instead of complex markdown tables, since Telegram doesn't render markdown tables well.
    `;

    const systemPrompt = `You are AnweoAI, the intelligent assistant built into the Anweo CRM. 
=== DYNAMIC CRM STATE ===
${dynamicContext}

Guidelines:
1. Be professional, highly detailed, and helpful. 
2. Format for Telegram (use basic markdown like *bold* or _italic_). DO NOT use Markdown tables.`;

    // 2. Call OpenAI
    const settings = await getSettings();
    const openAiKey = settings['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY;
    const baseUrl = settings['OPENAI_BASE_URL'] || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = settings['AI_MODEL'] || process.env.AI_MODEL || 'gpt-4o-mini';

    if (!openAiKey) {
      await sendTelegramMessage("Error: OPENAI_API_KEY is missing in CRM settings.");
      return NextResponse.json({ success: true });
    }

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiRes.ok) {
      await sendTelegramMessage("An error occurred while connecting to my AI core.");
      return NextResponse.json({ success: true });
    }

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || 'No response generated.';

    // 3. Send AI response back to Telegram
    await sendTelegramMessage(reply);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
