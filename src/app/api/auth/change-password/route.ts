import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, createSession, verifyPassword } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/data/users';
import { addLog } from '@/lib/data';
import type { SessionUser } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const user = await getUserById(session.id);

    // In mock/dev mode user won't be in the sheet — allow if it's a dev bypass session
    const isDevBypass = !user || user.password_hash === '$2b$10$...' || user.password_hash === '';

    if (!isDevBypass && !session.must_change_password) {
      // Real user: verify current password
      const valid = await verifyPassword(currentPassword ?? '', user!.password_hash);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    if (!isDevBypass && user) {
      // Real user: persist new password to sheet
      const newHash = await hashPassword(newPassword);
      await updateUser(session.id, {
        password_hash: newHash,
        must_change_password: 'FALSE',
      });
    }

    // Refresh session to clear must_change_password flag
    const newSession: SessionUser = { ...session, must_change_password: false };
    await createSession(newSession);

    await addLog({ user: session.username, action: 'PASSWORD_CHANGED', details: '' }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[change-password] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
