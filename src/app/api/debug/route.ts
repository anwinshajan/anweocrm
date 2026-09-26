import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envKeys = Object.keys(process.env);
  const relevantKeys = envKeys.filter(k => 
    k.includes('GOOG') || k.includes('GROQ') || k.includes('SESS') || k.includes('NEXT') || k.includes('VERCEL')
  );

  const appsUrl = process.env.GOOGLE_APPS_SCRIPT_URL || process.env['GOOGLE_APPS_SCRIPT_URL'];
  const sheetId = process.env.GOOGLE_SHEET_ID || process.env['GOOGLE_SHEET_ID'];

  return NextResponse.json({
    status: "dynamic_debug_v2",
    timestamp: new Date().toISOString(),
    keys_found: relevantKeys,
    has_apps_script: !!appsUrl,
    apps_script_length: appsUrl ? appsUrl.length : 0,
    apps_script_start: appsUrl ? appsUrl.substring(0, 15) : null,
    has_sheet_id: !!sheetId,
    sheet_id_length: sheetId ? sheetId.length : 0,
  });
}
