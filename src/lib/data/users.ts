// ============================================================
// Data Access Layer — Users (auth-sensitive)
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import {
  readObjects,
  appendRows,
  findRowIndex,
  updateRow,
  getHeaders,
} from './sheets-base';
import { TABS, HEADERS } from './tabs';
import type { User, UserPermissions } from '../types';

export async function getUsers(): Promise<User[]> {
  return readObjects<User>(TABS.USERS);
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function createUser(
  data: Omit<User, 'id' | 'created_at'> & Partial<Pick<User, 'id' | 'created_at'>>
): Promise<User> {
  const user: User = {
    id: data.id ?? uuidv4(),
    username: data.username,
    password_hash: data.password_hash,
    role: data.role ?? 'team',
    permissions: data.permissions ?? '{}',
    daily_target: data.daily_target ?? '0',
    monthly_target: data.monthly_target ?? '0',
    commission_type: data.commission_type ?? 'none',
    commission_value: data.commission_value ?? '0',
    active: data.active ?? 'TRUE',
    must_change_password: data.must_change_password ?? 'TRUE',
    failed_attempts: data.failed_attempts ?? '0',
    locked_until: data.locked_until ?? '',
    created_at: data.created_at ?? new Date().toISOString(),
  } as unknown as User;

  const row = HEADERS[TABS.USERS].map((h) => (user as Record<string, string>)[h] ?? '');
  await appendRows(TABS.USERS, [row]);
  return user;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;

  const updated = { ...users[index], ...updates } as unknown as User;
  const rowIndex = index + 2;
  const headers = await getHeaders(TABS.USERS);
  await updateRow(TABS.USERS, rowIndex, headers, updated as Record<string, string>);
  return updated;
}

export async function incrementFailedAttempts(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  const attempts = parseInt(user.failed_attempts ?? '0', 10) + 1;
  const updates: Partial<User> = { failed_attempts: String(attempts) };

  // Lock after 5 attempts for 15 minutes
  if (attempts >= 5) {
    updates.locked_until = new Date(Date.now() + 15 * 60_000).toISOString();
  }
  await updateUser(userId, updates);
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  await updateUser(userId, { failed_attempts: '0', locked_until: '' });
}

export function parsePermissions(raw: string): UserPermissions {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function getActiveUsers(): Promise<User[]> {
  const users = await getUsers();
  return users.filter((u) => u.active === 'TRUE');
}
