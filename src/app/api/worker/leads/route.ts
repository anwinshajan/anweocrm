import { NextRequest, NextResponse } from 'next/server';
import { getLeads, updateLead } from '@/lib/data/leads';
import { addActivity } from '@/lib/data';

// Simple API Key guard for the local worker
const WORKER_SECRET = process.env.WORKER_SECRET || 'anweo-local-worker-secret-123';

function authenticateWorker(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${WORKER_SECRET}`) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  if (!authenticateWorker(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let leads = await getLeads();
  
  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    leads = leads.filter(l => statuses.includes(l.status));
  } else {
    leads = leads.filter(l => !['Deleted', 'Won', 'Lost'].includes(l.status));
  }

  return NextResponse.json({ success: true, data: leads });
}

export async function PATCH(req: NextRequest) {
  if (!authenticateWorker(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, status, last_contacted_at } = body;

  if (!id) return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });

  const updated = await updateLead(id, { 
    status: status || 'Cold DM Sent', 
    last_contacted_at: last_contacted_at || new Date().toISOString() 
  });

  if (!updated) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  await addActivity({
    lead_id: id,
    user_id: 'SYSTEM_WORKER',
    type: 'status_change',
    content: `Status changed to ${status || 'Cold DM Sent'} by WhatsApp Worker`,
  });

  return NextResponse.json({ success: true, data: updated });
}
