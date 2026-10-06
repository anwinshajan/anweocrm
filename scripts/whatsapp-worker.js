process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Client, LocalAuth } = require('whatsapp-web.js');

const WORKER_SECRET = process.env.WORKER_SECRET || 'anweo-local-worker-secret-123';
const CRM_URL = 'http://localhost:3000/api/worker/leads';
const ADMIN_NUMBER = '919188840291@c.us';

// Add Telegram Bot Token to alert TG
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
    console.log(`\n\n👉 CLICK THIS LINK TO SEE YOUR QR CODE: ${qrUrl}\n\n`);
});

client.on('ready', async () => {
    console.log('✅ WhatsApp Worker is ready and authenticated!');
    try {
        await client.sendMessage(ADMIN_NUMBER, '🤖 *Anweo Omni-Bot* is now ONLINE!\n\nI am handling New Leads, Follow-ups, and Auto-Replies!');
    } catch (e) {}
    
    // Process any messages we missed while offline (Wait 5s for WhatsApp to finish loading DOM)
    setTimeout(async () => {
        await processUnreadChats();
        startQueueProcessor();
    }, 5000);
});

// Listener for live auto-replies
client.on('message', handleIncomingMessage);

async function processUnreadChats() {
    console.log('📬 Checking for unread messages that arrived while offline...');
    try {
        const chats = await client.getChats();
        const unreadChats = chats.filter(c => c.unreadCount > 0);
        
        for (const chat of unreadChats) {
            const messages = await chat.fetchMessages({ limit: chat.unreadCount });
            for (const msg of messages) {
                if (!msg.fromMe) {
                    await handleIncomingMessage(msg);
                }
            }
            // Mark chat as read
            await chat.sendSeen();
        }
    } catch (e) {
        console.error('Error processing unread chats:', e);
    }
}

async function handleIncomingMessage(msg) {
    // Ignore group messages, status updates, or messages from self
    if (msg.isGroup || msg.from === 'status@broadcast' || msg.fromMe) return;
    
    try {
        // Fetch ALL active leads to find who this is
        const res = await fetch(CRM_URL, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
        if (!res.ok) return;
        const { data: leads } = await res.json();
        
        const senderNumber = msg.from.split('@')[0];
        
        // Find matching lead (strip everything but digits from lead numbers)
        const lead = leads.find(l => {
            const lNum = (l.whatsapp_number || l.phone || '').replace(/\D/g, '');
            return lNum && senderNumber.includes(lNum);
        });

        if (lead) {
            console.log(`📩 Received message from ${lead.business_name}: "${msg.body}"`);
            
            // Skip if it's already escalated
            if (lead.status === 'Needs Admin Help') {
                console.log('⏭️ Skipping reply, lead is currently escalated.');
                return;
            }

            // Generate AI Reply
            const prompt = `You are a sales rep for Anweo, an innovative CRM and marketing agency. You are texting with ${lead.business_name}. 
They just replied to your message. Their message: "${msg.body}"
Your goal is to answer their question briefly and try to book a call/meeting or get them interested in our CRM/Lead Gen services.
If they ask something highly specific, complex, unusual, aggressive, or if you don't know the answer, DO NOT reply normally. Instead, output EXACTLY the word: [[ESCALATE]]
Keep normal replies under 3 sentences. No placeholders. Make it sound human.`;
            
            const openAiKey = process.env.OPENAI_API_KEY;
            const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
            const model = process.env.AI_MODEL || 'gpt-4o-mini';

            if (openAiKey) {
                const aiRes = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiKey}` },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 200
                    })
                });
                
                if (aiRes.ok) {
                    const aiData = await aiRes.json();
                    const reply = aiData.choices[0]?.message?.content?.trim();
                    
                    if (reply.includes('[[ESCALATE]]')) {
                        console.log(`🚨 AI triggered escalation for ${lead.business_name}!`);
                        await escalateLead(lead, msg.body);
                    } else if (reply) {
                        await client.sendMessage(msg.from, reply);
                        console.log(`✅ AI Replied to ${lead.business_name}.`);
                        
                        // Notify Admin
                        await client.sendMessage(ADMIN_NUMBER, `🤖 *AI Auto-Reply Sent* to ${lead.business_name}:\n\n_They said:_ "${msg.body}"\n\n_AI replied:_ "${reply}"`);
                        
                        // Update CRM status so they don't get cold follow-ups anymore!
                        await updateLeadStatus(lead.id, 'In Conversation');
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error handling message:', err.message);
    }
}

async function escalateLead(lead, userMessage) {
    // 1. Notify Admin via WhatsApp
    try {
        await client.sendMessage(ADMIN_NUMBER, `🚨 *ESCALATION REQUIRED*\n\n*${lead.business_name}* asked something complex.\n\n_They said:_ "${userMessage}"\n\nPlease check the CRM Dashboard or WhatsApp to reply manually!`);
    } catch(e){}

    // 2. Notify Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `🚨 *WhatsApp AI Escalation*\n\n*${lead.business_name}* needs human attention!\n\nMessage: "${userMessage}"\n\nCheck the CRM Dashboard!`,
                    parse_mode: 'Markdown'
                })
            });
        } catch(e){}
    }

    // 3. Update CRM status
    await updateLeadStatus(lead.id, 'Needs Admin Help');
}

async function updateLeadStatus(id, status) {
    await fetch(CRM_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WORKER_SECRET}` },
        body: JSON.stringify({ id, status, last_contacted_at: new Date().toISOString() })
    });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function startQueueProcessor() {
    console.log('🔄 Polling for New and Follow-up leads...');
    try {
        const res = await fetch(`${CRM_URL}?status=New,Cold DM Sent,Follow-up 1 Sent`, {
            headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
        });
        if (!res.ok) throw new Error('Failed to fetch CRM data');
        const { data: leads } = await res.json();
        
        for (const lead of leads) {
            const targetNumber = lead.whatsapp_number || lead.phone;
            const formatted = targetNumber.replace(/\D/g, '');
            if (formatted.length < 10) continue;
            const chatId = `${formatted.startsWith('91') ? formatted : '91' + formatted}@c.us`;

            let prompt = null;
            let newStatus = null;

            if (lead.status === 'New') {
                prompt = `Write a short cold WhatsApp DM to ${lead.business_name} (Category: ${lead.category || 'Business'}, City: ${lead.city}). Keep it under 3 sentences, natural, asking if they need more leads this month. Do not use placeholders.`;
                newStatus = 'Cold DM Sent';
            } 
            else if (lead.status === 'Cold DM Sent' || lead.status === 'Follow-up 1 Sent') {
                // Check if 48 hours passed
                const lastContact = new Date(lead.last_contacted_at || 0).getTime();
                if (Date.now() - lastContact > 48 * 60 * 60 * 1000) {
                    prompt = `Write a short, friendly 1-2 sentence follow-up WhatsApp message to ${lead.business_name}. You previously asked about scaling their leads. Just checking if they saw it. Do not use placeholders.`;
                    newStatus = lead.status === 'Cold DM Sent' ? 'Follow-up 1 Sent' : 'Follow-up 2 Sent';
                }
            }

            if (prompt) {
                console.log(`🧠 Generating message for ${lead.business_name} (${newStatus})...`);
                let message = `Hi ${lead.business_name},\n\nJust checking if you saw my last message about scaling your lead generation? Let me know!\n\nBest, Anweo`;
                
                const openAiKey = process.env.OPENAI_API_KEY;
                const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
                const model = process.env.AI_MODEL || 'gpt-4o-mini';

                if (openAiKey) {
                    try {
                        const aiRes = await fetch(`${baseUrl}/chat/completions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiKey}` },
                            body: JSON.stringify({
                                model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 150
                            })
                        });
                        if (aiRes.ok) {
                            const aiData = await aiRes.json();
                            if (aiData.choices?.[0]?.message) message = aiData.choices[0].message.content.trim();
                        }
                    } catch(e) {}
                }

                try {
                    await client.sendMessage(chatId, message);
                    console.log(`✅ Sent ${newStatus} to ${lead.business_name}`);
                    
                    try {
                        await client.sendMessage(ADMIN_NUMBER, `📤 *${newStatus}* sent to *${lead.business_name}*!\n\n"${message}"`);
                    } catch(e) {}

                    await updateLeadStatus(lead.id, newStatus);
                    
                    const waitTime = Math.floor(Math.random() * (90000 - 30000 + 1) + 30000);
                    console.log(`⏳ Pausing for ${Math.round(waitTime / 1000)} seconds to mimic human behavior...`);
                    await delay(waitTime);
                } catch (sendErr) {
                    console.error(`❌ Failed to send to ${lead.business_name}. Likely invalid WhatsApp number. Error:`, sendErr.message);
                    await updateLeadStatus(lead.id, 'Invalid Number');
                }
            }
        }
    } catch (e) {
        console.error('Queue Error:', e.message);
    }

    setTimeout(startQueueProcessor, 60000);
}

client.initialize();
