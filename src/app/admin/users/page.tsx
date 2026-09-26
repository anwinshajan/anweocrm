import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUsers } from '@/lib/data/users';
import { getLeads } from '@/lib/data/leads';
import { getDeals } from '@/lib/data';
import UsersClient from './UsersClient';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const allUsers = await getUsers();
  // Strip out sensitive password hashes
  const safeUsers = allUsers.map(({ password_hash, ...u }) => ({
    ...u,
    role: u.role || 'team',
    daily_target: u.daily_target || '10',
    monthly_target: u.monthly_target || '200',
    commission_type: u.commission_type || 'none',
    commission_value: u.commission_value || '0',
    active: u.active || 'TRUE',
    must_change_password: u.must_change_password || 'FALSE',
    failed_attempts: u.failed_attempts || '0',
    locked_until: u.locked_until || '',
    created_at: u.created_at || '',
  }));

  const leads = await getLeads();
  const deals = await getDeals();

  return (
    <UsersClient
      initialUsers={safeUsers}
      currentAdminId={session.id}
      leads={leads}
      deals={deals}
    />
  );
}
