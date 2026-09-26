import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readObjects, getHeaders, updateRow } from '@/lib/data/sheets-base';
import { TABS } from '@/lib/data/tabs';
import { Announcement } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const announcements = await readObjects<Announcement>(TABS.ANNOUNCEMENTS);
    const unread = announcements.filter((a) => {
      // Must be broadcast or to this user specifically
      if (a.to_user !== 'all' && a.to_user !== session.id) return false;
      // Admin should not see their own broadcasts as unread popups
      if (a.from_admin === session.id) return false;
      // Not already read
      const readers = a.read_by ? a.read_by.split(',') : [];
      return !readers.includes(session.id);
    });

    return NextResponse.json({ success: true, data: unread });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });

    const { ids } = await req.json(); // Array of announcement IDs to mark read
    if (!ids || !ids.length) return NextResponse.json({ success: true });

    const announcements = await readObjects<Announcement>(TABS.ANNOUNCEMENTS);
    const headers = await getHeaders(TABS.ANNOUNCEMENTS);
    
    for (const id of ids) {
      const annIndex = announcements.findIndex((a) => a.id === id);
      if (annIndex > -1) {
        const ann = announcements[annIndex];
        const readers = ann.read_by ? ann.read_by.split(',') : [];
        if (!readers.includes(session.id)) {
          readers.push(session.id);
          const newAnn = { ...ann, read_by: readers.join(',') };
          const index = annIndex + 2; // +2 for 1-based indexing and header row
          await updateRow(TABS.ANNOUNCEMENTS, index, headers, newAnn as unknown as Record<string, string>);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
