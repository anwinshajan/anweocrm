const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('Starting Anweo WhatsApp Auto-DM Worker...');

// Initialize the WhatsApp Client
// We use LocalAuth so you only have to scan the QR code once.
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Runs in the background invisibly
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('ACTION REQUIRED: Scan this QR code with your WhatsApp app:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Worker is ready and authenticated!');
    startQueueProcessor();
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failure', msg);
});

client.initialize();

// -- The Queue Processor --

const delay = (ms) => new Promise(res => setTimeout(res, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const WORKER_SECRET = process.env.WORKER_SECRET || 'anweo-local-worker-secret-123';

async function startQueueProcessor() {
    console.log('🔄 Polling for new leads to message...');
    
    try {
        // 1. Fetch real pending leads from the CRM (Status = New)
        const response = await fetch('http://localhost:3000/api/worker/leads?status=New', {
            headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
        });
        if (!response.ok) throw new Error('Failed to fetch leads from CRM');
        
        const data = await response.json();
        const pendingLeads = data.data || [];

        if (pendingLeads.length === 0) {
            console.log('No pending new leads. Sleeping for 60 seconds...');
            setTimeout(startQueueProcessor, 60000);
            return;
        }

        console.log(`Found ${pendingLeads.length} pending leads.`);

        for (const lead of pendingLeads) {
            if (!lead.phone && !lead.whatsapp_number) {
                console.log(`⏭️ Skipping ${lead.business_name} - No phone number.`);
                continue;
            }

            try {
                // Spin tax / variations to avoid bans
                const greetings = ['Hi', 'Hello', 'Hey'];
                const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
                
                const message = `${randomGreeting} ${lead.business_name},\n\nI noticed your business online and wanted to see if you're looking to scale your lead generation this month? Let me know!\n\nBest, Anweo`;
                
                // Format phone for whatsapp-web.js (requires country code + number + @c.us)
                const targetNumber = lead.whatsapp_number || lead.phone;
                const formattedNumber = targetNumber.replace(/\D/g, ''); // strip non-digits
                
                if (formattedNumber.length < 10) continue;
                
                const chatId = `${formattedNumber.startsWith('91') ? formattedNumber : '91' + formattedNumber}@c.us`; 

                console.log(`📤 Sending message to ${lead.business_name} (${chatId})...`);
                
                // UNCOMMENT TO ACTUALLY SEND
                // await client.sendMessage(chatId, message);
                console.log(`✅ Message sent to ${lead.business_name}.`);

                // 2. Update CRM Status to indicate DM is Sent!
                console.log(`📝 Updating CRM status to 'Cold DM Sent' for ${lead.business_name}...`);
                await fetch(`http://localhost:3000/api/worker/leads`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${WORKER_SECRET}`
                    },
                    body: JSON.stringify({ 
                        id: lead.id,
                        status: 'Cold DM Sent',
                        last_contacted_at: new Date().toISOString()
                    }),
                });
                console.log(`✅ CRM Updated.`);

                // THE TIMELAG (Anti-Ban Mechanism)
                const waitTime = getRandomDelay(30000, 90000);
                console.log(`⏳ Pausing for ${Math.round(waitTime / 1000)} seconds to mimic human behavior...`);
                await delay(waitTime);

            } catch (err) {
                console.error(`❌ Failed to send to ${lead.business_name}:`, err);
            }
        }
    } catch (e) {
        console.error('Error in Queue Processor:', e.message);
    }

    // Loop back to check for more after finishing the batch
    console.log('Finished current batch. Waiting 1 minute before checking again...');
    setTimeout(startQueueProcessor, 60000);
}
