import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getPitchesForLead } from '@/lib/data';

export const GET = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  
  const pitches = await getPitchesForLead(id);
  if (!pitches || pitches.length === 0) {
    return apiError('No pitches found', 404);
  }
  
  // Return the most recent pitch (assumes index 0 is latest, as getPitchesForLead likely sorts by descending)
  return apiSuccess(pitches[0]);
});
