import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUsers } from '@/lib/data/users';
import ImportLeadsClient from './ImportLeadsClient';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');

  const allUsers = await getUsers();
  const activeUsers = allUsers
    .filter((u) => u.active !== 'FALSE')
    .map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
    }));

  return (
    <ImportLeadsClient
      users={activeUsers}
      currentUserId={session.id}
      isAdmin={session.role === 'admin'}
    />
  );
}
