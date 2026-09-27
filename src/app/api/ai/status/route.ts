import { NextResponse } from 'next/server';

export async function GET() {
  const isOnline = !!process.env.GEMINI_API_KEY || !!process.env.GROQ_API_KEY;
  return NextResponse.json({ online: isOnline });
}
