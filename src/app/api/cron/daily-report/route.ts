import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { getLeads } from '@/lib/data/leads';
import { getDeals } from '@/lib/data';

// Vercel Cron Job - runs daily at 9:00 AM (configured in vercel.json)
export async function GET(req: Request) {
  try {
    // Basic authorization for Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (
      process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [leads, deals] = await Promise.all([getLeads(), getDeals()]);
    
    const activeLeads = leads.filter(l => l.status !== 'Deleted' && l.status !== 'Won' && l.status !== 'Lost');
    const newLeads = leads.filter(l => l.status === 'New').length;
    const hotLeads = leads.filter(l => l.status === 'Hot Lead').length;
    
    const totalRevenue = deals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);

    const message = `
🌅 *Good Morning! Here is your Daily CRM Report:*

📊 *Overview:*
• Total Active Leads: ${activeLeads.length}
• New Uncontacted Leads: ${newLeads}
• Hot Leads 🔥: ${hotLeads}
• Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}

💡 *Action Required:*
You have ${newLeads} new leads waiting to be pitched. Remember, speed to lead is everything! Get out there and close some deals today! 💸
    `;

    await sendTelegramMessage(message);

    return NextResponse.json({ success: true, message: 'Daily report sent!' });
  } catch (error) {
    console.error('Cron Daily Report Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
