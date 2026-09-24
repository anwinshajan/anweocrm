// ============================================================
// API Route Helpers — uniform error handling + auth guards
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';
import { addLog } from './data';
import type { SessionUser } from './types';

export type RouteContext = {
  session: SessionUser;
  req: NextRequest;
};

type Handler = (ctx: RouteContext) => Promise<NextResponse>;

export function withAuth(handler: Handler, requireAdmin = false) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (requireAdmin && session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    try {
      return await handler({ session, req });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('[API Error]', message, err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  };
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

export async function logAction(
  user: SessionUser,
  action: string,
  details?: string
): Promise<void> {
  try {
    await addLog({ user: user.username, action, details: details ?? '' });
  } catch {
    // Non-critical: don't fail the request if logging fails
  }
}
