import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const appsUrl = process.env.GOOGLE_APPS_SCRIPT_URL || process.env['GOOGLE_APPS_SCRIPT_URL'];
  
  let testResult = null;
  let fetchError = null;

  if (appsUrl && appsUrl.length > 5) {
    try {
      const res = await fetch(appsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'readTab', tab: 'Users' }),
        redirect: 'follow',
        cache: 'no-store',
      });
      testResult = {
        status: res.status,
        text: await res.text(),
      };
    } catch (e: any) {
      fetchError = e.message;
    }
  }

  return NextResponse.json({
    status: "dynamic_debug_v3",
    has_apps_script: !!appsUrl,
    apps_script_length: appsUrl ? appsUrl.length : 0,
    testResult,
    fetchError,
  });
}
