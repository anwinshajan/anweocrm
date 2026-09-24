import { NextRequest } from 'next/server';
import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getUsers, createUser, updateUser } from '@/lib/data/users';
import { hashPassword } from '@/lib/auth';
import { addLog } from '@/lib/data';

export const GET = withAuth(async ({ session }) => {
  const users = await getUsers();
  // Never return password hashes
  const safe = users.map(({ password_hash, ...u }) => u);
  return apiSuccess(safe);
}, true);

export const POST = withAuth(async ({ session, req }) => {
  const body = await req.json();
  if (!body.username || !body.password) return apiError('username and password required');

  const { getUsers: getAll } = await import('@/lib/data/users');
  const existing = await getAll();
  if (existing.some((u) => u.username.toLowerCase() === body.username.toLowerCase())) {
    return apiError('Username already exists');
  }

  const password_hash = await hashPassword(body.password);
  const user = await createUser({
    username: body.username,
    password_hash,
    role: body.role ?? 'team',
    permissions: body.permissions ?? '{}',
    daily_target: body.daily_target ?? '10',
    monthly_target: body.monthly_target ?? '200',
    commission_type: body.commission_type ?? 'none',
    commission_value: body.commission_value ?? '0',
    active: 'TRUE',
    must_change_password: 'TRUE',
    failed_attempts: '0',
    locked_until: '',
  });

  await addLog({ user: session.username, action: 'CREATE_USER', details: body.username });

  const { password_hash: _, ...safe } = user;
  return apiSuccess(safe, 201);
}, true);
