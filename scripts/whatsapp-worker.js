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

// Random delay between min and max milliseconds
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

async function startQueueProcessor() {
    console.log('🔄 Polling for new leads to message...');
    
    // In production, this would fetch from your Next.js API or Database:
    // const response = await fetch('http://localhost:3000/api/whatsapp/queue');
    // const pendingLeads = await response.json();
    
    // Mocking pending leads for demonstration
    const pendingLeads = [
        { name: 'John Doe', phone: '919876543210' }, // Example phone format
    ];

    if (pendingLeads.length === 0) {
        console.log('No pending leads. Sleeping for 60 seconds...');
        setTimeout(startQueueProcessor, 60000);
        return;
    }

    for (const lead of pendingLeads) {
        try {
            // Spin tax / variations to avoid bans
            const greetings = ['Hi', 'Hello', 'Hey'];
            const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            
            const message = `${randomGreeting} ${lead.name},\n\nI noticed your business online and wanted to see if you're looking to scale your lead generation this month? Let me know!\n\nBest, Anweo`;
            
            // Format phone for whatsapp-web.js (requires country code + number + @c.us)
            const chatId = `${lead.phone}@c.us`; 

            console.log(`📤 Sending message to ${lead.name} (${lead.phone})...`);
            
            // UNCOMMENT TO ACTUALLY SEND
            // await client.sendMessage(chatId, message);
            
            console.log(`✅ Message sent to ${lead.name}.`);

            // THE TIMELAG (Anti-Ban Mechanism)
            // Wait anywhere between 30 to 90 seconds before sending the next one
            const waitTime = getRandomDelay(30000, 90000);
            console.log(`⏳ Pausing for ${Math.round(waitTime / 1000)} seconds to mimic human behavior...`);
            await delay(waitTime);

        } catch (err) {
            console.error(`❌ Failed to send to ${lead.name}:`, err);
        }
    }

    // Loop back to check for more after finishing the batch
    console.log('Finished current batch. Waiting 1 minute before checking again...');
    setTimeout(startQueueProcessor, 60000);
}
