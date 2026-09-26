import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envKeys = Object.keys(process.env);
  const relevantKeys = envKeys.filter(k => 
    k.includes('GOOG') || k.includes('GROQ') || k.includes('SESS') || k.includes('NEXT') || k.includes('VERCEL')
  );

  return NextResponse.json({
    status: "dynamic_debug",
    timestamp: new Date().toISOString(),
    keys_found: relevantKeys,
    has_apps_script: !!process.env.GOOGLE_APPS_SCRIPT_URL,
    has_sheet_id: !!process.env.GOOGLE_SHEET_ID,
  });
}
