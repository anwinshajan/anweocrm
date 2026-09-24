import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/auth';
import { addLog } from '@/lib/data';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session) {
    await addLog({ user: session.username, action: 'LOGOUT', details: '' });
  }
  await destroySession();
  return NextResponse.json({ success: true });
}
