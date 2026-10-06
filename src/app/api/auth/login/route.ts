import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/data/users';
import { verifyPassword, createSession, hashPassword } from '@/lib/auth';
import { addLog, incrementStat } from '@/lib/data';
import { incrementFailedAttempts, resetFailedAttempts, updateUser } from '@/lib/data/users';
import type { SessionUser, UserPermissions } from '@/lib/types';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }


    const user = await getUserByUsername(username);

    if (!user || user.active !== 'TRUE') {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Account locked. Try again in ${minutes} minute(s).` },
        { status: 429 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      await incrementFailedAttempts(user.id);
      await addLog({ user: username, action: 'LOGIN_FAILED', details: 'Invalid password' });
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Successful login
    if (user.failed_attempts !== '0' || user.locked_until) {
      await resetFailedAttempts(user.id);
    }

    const permissions: UserPermissions = (() => {
      try { return JSON.parse(user.permissions); } catch { return {}; }
    })();

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      role: user.role as 'admin' | 'team',
      permissions,
      must_change_password: user.must_change_password === 'TRUE',
    };

    await createSession(sessionUser);
    
    // Run all non-critical logging and stats in parallel so the user logs in instantly
    const today = new Date().toISOString().slice(0, 10);
    Promise.allSettled([
      addLog({ user: username, action: 'LOGIN', details: 'Success' }),
      sendTelegramMessage(`🔐 *LOGIN ALERT* \n\nUser *${user.username}* (${user.role}) just logged into the CRM.\nTime: ${new Date().toLocaleString('en-IN')}`),
      incrementStat(today, user.id, 'logins')
    ]).catch(console.error);

    return NextResponse.json({ success: true, data: { user: sessionUser } });
  } catch (err) {
    console.error('[Login Error]', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
