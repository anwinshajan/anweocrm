import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, destroySession, createSession } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/data/users';
import { addLog } from '@/lib/data';
import type { SessionUser } from '@/lib/types';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  const user = await getUserById(session.id);
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  // If not must_change_password, verify current password
  if (!session.must_change_password) {
    const { verifyPassword } = await import('@/lib/auth');
    const valid = await verifyPassword(currentPassword ?? '', user.password_hash);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
    }
  }

  const newHash = await hashPassword(newPassword);
  await updateUser(session.id, {
    password_hash: newHash,
    must_change_password: 'FALSE',
  });

  // Refresh session to clear must_change_password flag
  const newSession: SessionUser = { ...session, must_change_password: false };
  await createSession(newSession);

  await addLog({ user: session.username, action: 'PASSWORD_CHANGED', details: '' });

  return NextResponse.json({ success: true });
}
