// ============================================================
// Authentication — JWT session management (Edge Compatible)
// ============================================================

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { SessionUser } from './types';

const COOKIE_NAME = 'anweo_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'fallback-secret-for-local-dev-only-min-32-chars-long';
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
    
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function hashPassword(password: string): Promise<string> {
  // User requested plaintext passwords for visibility in Google Sheets
  return password;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Fallback for the default admin user who was created with bcrypt
  if (hash.startsWith('$2b$')) {
    return bcrypt.compare(password, hash);
  }
  // Compare plaintext directly
  return password === hash;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export function hasPermission(
  user: SessionUser,
  permission: keyof SessionUser['permissions']
): boolean {
  if (user.role === 'admin') return true;
  return !!user.permissions[permission];
}
