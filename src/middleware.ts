// ============================================================
// Middleware — Session check + route protection
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/'];
const ADMIN_ONLY_PATHS = [
  '/admin',
  '/api/admin',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check session
  const session = await getSession();

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin-only paths
  if (
    ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p)) &&
    session.role !== 'admin'
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
