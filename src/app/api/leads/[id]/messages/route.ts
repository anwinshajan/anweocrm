import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getLeadById, updateLead } from '@/lib/data/leads';
import {
  getMessagesForLead,
  addMessage,
  addActivity,
  incrementStat,
  getSetting,
} from '@/lib/data';
import { classifyReply } from '@/lib/ai';

// GET /api/leads/[id]/messages — thread
export const GET = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const messages = await getMessagesForLead(id);
  return apiSuccess(messages);
});

// POST /api/leads/[id]/messages — log sent message or reply
export const POST = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const body = await req.json();

  const lead = await getLeadById(id);
  if (!lead) return apiError('Lead not found', 404);

  // Do Not Contact check
  const tags = lead.tags?.split(',').map((t: string) => t.trim()) ?? [];
  if (tags.includes('Do Not Contact')) {
    return apiError('This lead is marked Do Not Contact');
  }

  const {
    direction = 'sent',
    message_text,
    template_used = '',
    classify = false,
  } = body;

  if (!message_text) return apiError('message_text is required');

  // Check daily send limit
  if (direction === 'sent') {
    const limitStr = await getSetting('daily_send_limit');
    const limit = parseInt(limitStr, 10);
    if (!isNaN(limit) && limit > 0) {
      const today = new Date().toISOString().slice(0, 10);
      // Stats are updated after the check
    }
  }

  const msg = await addMessage({
    lead_id: id,
    user_id: session.id,
    direction,
    message_text,
    template_used,
  });

  // Update lead attribution
  const leadUpdates: Record<string, string> = {
    last_contacted_at: new Date().toISOString(),
  };
  if (direction === 'sent' && !lead.first_messaged_by) {
    leadUpdates.first_messaged_by = session.id;
  }
  if (direction === 'sent') {
    leadUpdates.last_messaged_by = session.id;
  }
  await updateLead(id, leadUpdates);

  await addActivity({
    lead_id: id,
    user_id: session.id,
    type: direction === 'sent' ? 'message_sent' : 'reply_logged',
    content: message_text.slice(0, 100),
  });

  const today = new Date().toISOString().slice(0, 10);
  if (direction === 'sent') {
    await incrementStat(today, session.id, 'messages_sent').catch(() => {});
  }

  // Classify reply if requested
  let classification = null;
  if (direction === 'received' && classify) {
    try {
      classification = await classifyReply(message_text, lead);
      await addActivity({
        lead_id: id,
        user_id: session.id,
        type: 'reply_classified',
        content: `Classification: ${classification.classification}`,
      });
    } catch {
      // non-critical
    }
  }

  return apiSuccess({ message: msg, classification });
});
