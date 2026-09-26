import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import fs from 'fs';
import path from 'path';

// GET /api/settings/env
export const GET = withAuth(async ({ session }) => {
  if (session.role !== 'admin') return apiError('Unauthorized', 403);
  
  // Return the current connection strings from process.env
  return apiSuccess({
    GOOGLE_APPS_SCRIPT_URL: process.env.GOOGLE_APPS_SCRIPT_URL || '',
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '',
  });
}, true);

// POST /api/settings/env
export const POST = withAuth(async ({ session, req }) => {
  if (session.role !== 'admin') return apiError('Unauthorized', 403);
  
  const body = await req.json();
  const envPath = path.join(process.cwd(), '.env.local');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or append values
  const updates: Record<string, string> = {
    GOOGLE_APPS_SCRIPT_URL: body.GOOGLE_APPS_SCRIPT_URL,
    GOOGLE_SHEET_ID: body.GOOGLE_SHEET_ID,
  };

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }
  }

  // Write back to .env.local
  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

  return apiSuccess({ message: 'Environment variables updated. Restart of server may be required.' });
}, true);
