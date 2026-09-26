import { NextResponse } from 'next/server';

export async function GET() {
  let appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  let testResult = null;
  let errorMsg = null;

  try {
    if (appsScriptUrl) {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'readTab', tab: 'Leads' }),
        redirect: 'follow',
        cache: 'no-store',
      });
      testResult = {
        status: res.status,
        statusText: res.statusText,
        text: await res.text(),
      };
    }
  } catch (e: any) {
    errorMsg = e.message;
  }

  return NextResponse.json({
    env: {
      has_apps_script: !!process.env.GOOGLE_APPS_SCRIPT_URL,
      has_sheet_id: !!process.env.GOOGLE_SHEET_ID,
      has_private_key: !!process.env.GOOGLE_PRIVATE_KEY,
    },
    testResult,
    errorMsg,
  });
}
