import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLeads } from '@/lib/data/leads';
import { getActiveUsers } from '@/lib/data';
import FollowUpsClient from './FollowUpsClient';

export default async function FollowUpsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [allLeads, users] = await Promise.all([
    getLeads(),
    getActiveUsers(),
  ]);

  // Only leads that have a follow-up date and are still active
  const followUpLeads = allLeads.filter(
    (l) =>
      l.next_followup_at &&
      l.status !== 'Deleted' &&
      l.status !== 'Won' &&
      l.status !== 'Lost'
  );

  return (
    <FollowUpsClient
      leads={followUpLeads}
      allLeads={allLeads}
      users={users}
      session={{ id: session.id, role: session.role, username: session.username }}
    />
  );
}
