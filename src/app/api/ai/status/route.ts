import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/data';

export async function GET() {
  const settings = await getSettings();
  const isOnline = !!process.env.GEMINI_API_KEY || !!process.env.GROQ_API_KEY || !!process.env.OPENAI_API_KEY || !!settings['OPENAI_API_KEY'];
  return NextResponse.json({ online: isOnline });
}
