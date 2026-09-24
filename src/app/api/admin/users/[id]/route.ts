import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { updateUser } from '@/lib/data/users';
import { hashPassword } from '@/lib/auth';
import { addLog } from '@/lib/data';

export const PATCH = withAuth(async ({ session, req }, context?: { params?: Promise<{ id: string }> }) => {
  const { id } = await (context?.params ?? Promise.resolve({ id: '' }));
  const body = await req.json();

  const updates: Record<string, string> = {};
  const allowed = ['role', 'permissions', 'daily_target', 'monthly_target', 'commission_type', 'commission_value', 'active', 'must_change_password'];
  allowed.forEach((k) => { if (body[k] !== undefined) updates[k] = String(body[k]); });

  // Allow admin to reset password
  if (body.new_password) {
    updates.password_hash = await hashPassword(body.new_password);
    updates.must_change_password = 'TRUE';
  }

  // Force logout (clear locked_until — next request will fail token validation)
  if (body.force_logout) {
    updates.locked_until = new Date(Date.now() + 365 * 86400000).toISOString(); // lock for 1 year
    updates.active = 'FALSE';
  }

  const updated = await updateUser(id, updates);
  if (!updated) return apiError('User not found', 404);

  await addLog({ user: session.username, action: 'UPDATE_USER', details: id });

  const { password_hash: _, ...safe } = updated;
  return apiSuccess(safe);
}, true);
