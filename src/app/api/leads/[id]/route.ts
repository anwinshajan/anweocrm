import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getLeadById, updateLead } from '@/lib/data/leads';
import { addActivity, addLog, incrementStat, getSettings } from '@/lib/data';
import { sendTelegramMessage } from '@/lib/telegram';

// GET /api/leads/[id]
export const GET = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const lead = await getLeadById(id);
  if (!lead) return apiError('Lead not found', 404);

  // All team members can view any lead

  return apiSuccess(lead);
});

// PATCH /api/leads/[id]
export const PATCH = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const lead = await getLeadById(id);
  if (!lead) return apiError('Lead not found', 404);

  // All team members can update any lead

  const body = await req.json();

  // Block sending to Do Not Contact leads
  if (body.status === 'Message Sent' && lead.tags?.includes('Do Not Contact')) {
    return apiError('This lead is marked Do Not Contact');
  }

  // Require lost_reason when marking Lost
  if (body.status === 'Lost' && !body.lost_reason && !lead.lost_reason) {
    return apiError('A lost reason is required when marking a lead as Lost');
  }

  // Warn if contacted recently (last 7 days)
  const lastContacted = lead.last_contacted_at;
  let recentWarning = false;
  if (lastContacted) {
    const daysSince = (Date.now() - new Date(lastContacted).getTime()) / 86_400_000;
    if (daysSince < 7) recentWarning = true;
  }

  // Handle status-specific updates
  const updates: Record<string, string> = { ...body };

  if (body.status === 'Won' && !lead.closed_by) {
    updates.closed_by = session.id;
    updates.closed_at = new Date().toISOString();
    
    // Telegram Jarvis Alert for Deal Won!
    await sendTelegramMessage(`🏆 *DEAL WON!* \n\n*${lead.business_name}* has just been closed by ${session.username}.\nValue: ${lead.deal_value || 'N/A'}`);
  }

  if (body.status === 'Hot Lead' && lead.status !== 'Hot Lead') {
    // Telegram Jarvis Alert for Hot Lead!
    await sendTelegramMessage(`🔥 *HOT LEAD ALERT!* \n\n*${lead.business_name}* was just marked as a Hot Lead by ${session.username}.\nPriority: ${lead.priority}`);
  }

  if (body.status === 'Message Sent' && !lead.first_messaged_by) {
    updates.first_messaged_by = session.id;
  }

  if (body.status === 'Message Sent' || body.status === 'Replied') {
    updates.last_messaged_by = session.id;
    updates.last_contacted_at = new Date().toISOString();
  }

  const updated = await updateLead(id, updates);

  // Activity log
  const changedFields = Object.keys(body).join(', ');
  await addActivity({
    lead_id: id,
    user_id: session.id,
    type: 'updated',
    content: `Updated: ${changedFields}`,
  });

  if (body.status) {
    await addActivity({
      lead_id: id,
      user_id: session.id,
      type: 'status_change',
      content: `Status changed to ${body.status}`,
    });
    
    // Telegram Jarvis Alert for EVERY status change (except those handled above)
    if (body.status !== 'Won' && body.status !== 'Hot Lead' && body.status !== lead.status) {
      sendTelegramMessage(`🔄 *STATUS UPDATE* \n\n*${lead.business_name}* was moved to *${body.status}* by ${session.username}.`).catch(() => {});
    }
  }

  if (body.assigned_to && body.assigned_to !== lead.assigned_to) {
    await addActivity({
      lead_id: id,
      user_id: session.id,
      type: 'reassignment',
      content: `Reassigned from ${lead.assigned_to} to ${body.assigned_to}`,
    });
    
    // Telegram Alert for Reassignment
    sendTelegramMessage(`👤 *LEAD REASSIGNED* \n\n*${lead.business_name}* was reassigned to ${body.assigned_to} by ${session.username}.`).catch(() => {});
  }

  await addLog({ user: session.username, action: 'UPDATE_LEAD', details: id });

  return NextResponse.json({ success: true, data: updated, warning: recentWarning ? 'Contacted in last 7 days' : null });
});

// DELETE /api/leads/[id] — admin only, soft delete
export const DELETE = withAuth(
  async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
    const updated = await updateLead(id, { status: 'Deleted' });
    if (!updated) return apiError('Lead not found', 404);
    await addLog({ user: session.username, action: 'DELETE_LEAD', details: id });
    return apiSuccess({ id });
  },
  true // requireAdmin
);
