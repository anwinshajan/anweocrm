import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createAnnouncement } from '@/lib/data';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { to_user, message } = await req.json();

    if (to_user === 'all' && session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can broadcast.' }, { status: 403 });
    }

    const newMsg = {
      id: randomUUID(),
      from_admin: session.id, // using from_admin as from_user
      to_user: to_user,
      message,
      created_at: new Date().toISOString(),
      read_by: '',
    };

    await createAnnouncement(newMsg);

    return NextResponse.json({ success: true, data: newMsg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
