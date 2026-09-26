import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { setSetting } from '@/lib/data';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    const promises = Object.entries(body).map(([key, value]) => 
      setSetting(key, value as string)
    );
    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
