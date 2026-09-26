import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { addMessage } from '@/lib/data';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@/lib/types';

export const POST = withAuth(async ({ req, session }) => {
  try {
    const body = await req.json();
    const { lead_id, direction, message_text, template_used } = body;

    if (!lead_id || !message_text) {
      return apiError('lead_id and message_text are required');
    }

    const newMessage = await addMessage({
      lead_id,
      user_id: session.id, // Logged by the current user
      direction: direction || 'sent',
      message_text,
      template_used: template_used || '',
    });

    return apiSuccess(newMessage, 201);
  } catch (error: any) {
    return apiError(error.message);
  }
}, false); // both admin and team can log messages
