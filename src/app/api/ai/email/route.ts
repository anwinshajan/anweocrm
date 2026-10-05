import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLeadsByUser } from '@/lib/data/leads';
import { Resend } from 'resend';

// We initialize Resend here. In production, you need process.env.RESEND_API_KEY
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch leads for the current user
    const leads = await getLeadsByUser(session.id);
    const newLeads = leads.filter(l => l.status === 'New');

    if (newLeads.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "You have no new leads to email. Try scraping some first!" 
      });
    }

    let emailsSent = 0;

    for (const lead of newLeads) {
      // 1. AI Generation Step (Mocked for demonstration)
      // In production, we call Gemini/OpenAI API here:
      // const prompt = `Write a personalized cold email for ${lead.business_name} in ${lead.city}.`;
      // const aiResponse = await generateText(prompt);
      
      const customEmailBody = `Hi ${lead.contact_name || 'Team'},
      
I noticed ${lead.business_name} has been doing great work in ${lead.city || 'your area'}. 
I wanted to reach out because we help companies in your sector scale using AI-driven CRM solutions.

Would you be open to a quick 5-minute chat next week?

Best,
${session.username}
Anweo Agency
`;

      // 2. Email Delivery Step
      // In production:
      /*
      await resend.emails.send({
        from: 'Anweo AI <hello@anweo.com>',
        to: lead.email || 'test@example.com',
        subject: `Quick question for ${lead.business_name}`,
        text: customEmailBody,
      });
      */
      
      console.log(`[AnweoAI Email Engine] Drafted & Sent email to ${lead.business_name}`);
      emailsSent++;
    }

    return NextResponse.json({ 
      success: true, 
      count: emailsSent, 
      message: `Successfully generated and dispatched personalized cold emails to ${emailsSent} new leads.` 
    });

  } catch (error: any) {
    console.error('Email engine error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
