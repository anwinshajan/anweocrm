import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLeadsByUser } from '@/lib/data/leads';
import { getDeals, getUserById } from '@/lib/data';
import TeamAnalyticsClient from './TeamAnalyticsClient';

export default async function TeamAnalyticsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [leads, deals, user] = await Promise.all([
    getLeadsByUser(session.id),
    getDeals(),
    getUserById(session.id)
  ]);

  // Filter deals specifically closed by this user
  const userDeals = deals.filter(d => d.closed_by === session.id);

  return (
    <TeamAnalyticsClient 
      leads={leads} 
      deals={userDeals} 
      user={user!} 
    />
  );
}
