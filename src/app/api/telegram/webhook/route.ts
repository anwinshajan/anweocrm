import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { getLeads, createLead, updateLead } from '@/lib/data/leads';
import { getDeals, getActiveUsers, getSettings, addActivity } from '@/lib/data';

import { runLeadScraper } from '@/lib/scraper';

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

    const userPrompt = message.text.trim();

    // Check for explicit Telegram /scrape command e.g. "/scrape Dentists in Kochi" or "/scrape Real Estate Dubai 5"
    if (userPrompt.toLowerCase().startsWith('/scrape')) {
      const commandBody = userPrompt.slice(7).trim();
      if (!commandBody) {
        await sendTelegramMessage("🔎 *Anweo Lead Scraper Usage:*\n\n`/scrape <niche/business> in <city> [limit]`\n\nExample:\n`/scrape Dentists in Kochi`\n`/scrape Digital Marketing Agencies Dubai 10`");
        return NextResponse.json({ success: true });
      }

      await sendTelegramMessage(`⏳ *Scraping leads for:* _${commandBody}_\n\nPlease wait a few seconds while I search live listings...`);
      
      // Parse limit if trailing number provided
      const matchLimit = commandBody.match(/\b(\d+)\b$/);
      const limit = matchLimit ? parseInt(matchLimit[1], 10) : 5;
      const cleanQuery = commandBody.replace(/\b\d+\b$/, '').trim();

      const scrapeRes = await runLeadScraper({
        query: cleanQuery,
        limit,
        source: 'Telegram Bot Scraper',
        added_by: 'TELEGRAM_ADMIN'
      });

      if (scrapeRes.createdCount > 0) {
        const leadList = scrapeRes.leads.map((l, i) => `${i+1}. *${l.business_name}* (${l.city})\n   📞 ${l.phone || 'N/A'} | 🏷️ ${l.category}`).join('\n\n');
        await sendTelegramMessage(`✅ *Scrape Complete!*\n\nAdded *${scrapeRes.createdCount}* new lead(s) to CRM:\n\n${leadList}`);
      } else {
        await sendTelegramMessage(`ℹ️ ${scrapeRes.message}`);
      }
      return NextResponse.json({ success: true });
    }
    
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
2. Format for Telegram (use basic markdown like *bold* or _italic_). DO NOT use Markdown tables.
3. You have access to tools to search, add, scrape, and update leads, check deals, and log activities. Use them to help the admin manage the CRM directly from Telegram. If the user asks to find or scrape leads for a niche/city, call scrape_leads!`;

    const settings = await getSettings();
    const openAiKey = settings['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY;
    const baseUrl = settings['OPENAI_BASE_URL'] || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = settings['AI_MODEL'] || process.env.AI_MODEL || 'gpt-4o-mini';

    if (!openAiKey) {
      await sendTelegramMessage("Error: OPENAI_API_KEY is missing in CRM settings.");
      return NextResponse.json({ success: true });
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "search_leads",
          description: "Search for existing leads in the CRM by name, phone, city, or tags.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search term (name, phone, etc.)" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_lead",
          description: "Create a new lead in the CRM.",
          parameters: {
            type: "object",
            properties: {
              business_name: { type: "string" },
              phone: { type: "string", description: "Phone number or WhatsApp number" },
              city: { type: "string" },
              category: { type: "string" },
              source: { type: "string", description: "Where the lead came from (e.g. Telegram, WhatsApp)" },
            },
            required: ["business_name", "phone"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_lead",
          description: "Update the status, priority, or assigned user for an existing lead.",
          parameters: {
            type: "object",
            properties: {
              lead_id: { type: "string", description: "The ID of the lead to update." },
              status: { type: "string", description: "New status, e.g. 'Hot Lead', 'Won', 'Lost'" },
              priority: { type: "string", description: "Priority level, e.g. 'low', 'medium', 'high', 'urgent'" },
              assigned_to: { type: "string", description: "ID of the user to assign the lead to." }
            },
            required: ["lead_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_lead_activity",
          description: "Log a note or activity for a lead.",
          parameters: {
            type: "object",
            properties: {
              lead_id: { type: "string" },
              content: { type: "string", description: "The note or activity description." }
            },
            required: ["lead_id", "content"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_active_deals",
          description: "Get a list of recent or high-value active deals in the CRM pipeline.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "scrape_leads",
          description: "Scrape real business leads live from the web for a specific niche, business category, or city.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query or business type e.g. Dentists, Real Estate, Marketing Agencies" },
              location: { type: "string", description: "City or region e.g. Dubai, Kochi, Mumbai" },
              limit: { type: "number", description: "Number of leads to scrape (default 5, max 10)" }
            },
            required: ["query"]
          }
        }
      }
    ];

    let messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    let reply = 'No response generated.';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const aiRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!aiRes.ok) {
        await sendTelegramMessage("An error occurred while connecting to my AI core.");
        return NextResponse.json({ success: true });
      }

      const aiData = await aiRes.json();
      const responseMessage = aiData.choices?.[0]?.message;

      if (!responseMessage) {
        break;
      }

      messages.push(responseMessage);

      if (responseMessage.tool_calls) {
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let functionResult = '';

          try {
            if (functionName === 'search_leads') {
              const q = args.query.toLowerCase();
              const found = activeLeads.filter(l => 
                l.business_name.toLowerCase().includes(q) || 
                l.phone.includes(q) || 
                l.city.toLowerCase().includes(q) ||
                l.tags.toLowerCase().includes(q)
              ).slice(0, 5); // Return top 5 to save context

              if (found.length > 0) {
                functionResult = JSON.stringify(found.map(l => ({
                  id: l.id,
                  business_name: l.business_name,
                  phone: l.phone,
                  status: l.status,
                  city: l.city,
                  priority: l.priority
                })));
              } else {
                functionResult = 'No leads found matching the query.';
              }
            } else if (functionName === 'create_lead') {
              const newLead = await createLead({
                business_name: args.business_name,
                phone: args.phone,
                city: args.city || '',
                category: args.category || '',
                source: args.source || 'Telegram',
                added_by: 'AnweoAI',
              });
              functionResult = `Successfully created lead! ID: ${newLead.id}, Name: ${newLead.business_name}`;
            } else if (functionName === 'update_lead') {
              const updates: any = {};
              if (args.status) updates.status = args.status;
              if (args.priority) updates.priority = args.priority;
              if (args.assigned_to) updates.assigned_to = args.assigned_to;
              
              const updated = await updateLead(args.lead_id, updates);
              if (updated) {
                functionResult = `Successfully updated lead ID ${args.lead_id}.`;
              } else {
                functionResult = `Failed to find or update lead ID ${args.lead_id}.`;
              }
            } else if (functionName === 'add_lead_activity') {
              await addActivity({
                lead_id: args.lead_id,
                user_id: 'AnweoAI', // The bot's identifier
                type: 'note',
                content: args.content
              });
              functionResult = `Successfully added note to lead ID ${args.lead_id}.`;
            } else if (functionName === 'get_active_deals') {
              const activeDeals = deals.filter(d => d.status !== 'Lost' && d.status !== 'Won').slice(0, 10);
              if (activeDeals.length > 0) {
                functionResult = JSON.stringify(activeDeals.map(d => ({
                  id: d.id,
                  deal_name: d.deal_name,
                  value: d.deal_value,
                  status: d.status
                })));
              } else {
                functionResult = 'No active deals found right now.';
              }
            } else if (functionName === 'scrape_leads') {
              const scrapeRes = await runLeadScraper({
                query: args.query,
                location: args.location || '',
                limit: args.limit || 5,
                source: 'Telegram AI Assistant',
                added_by: 'TELEGRAM_BOT'
              });
              functionResult = JSON.stringify({
                success: true,
                message: scrapeRes.message,
                createdCount: scrapeRes.createdCount,
                leads: scrapeRes.leads.map(l => ({ name: l.business_name, phone: l.phone, city: l.city, category: l.category }))
              });
            } else {
              functionResult = `Unknown function ${functionName}`;
            }
          } catch (err: any) {
            functionResult = `Error executing ${functionName}: ${err.message}`;
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: functionResult,
          });
        }
      } else {
        reply = responseMessage.content || 'No response generated.';
        break;
      }
    }

    // 3. Send AI response back to Telegram
    await sendTelegramMessage(reply);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
