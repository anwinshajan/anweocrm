import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLeads } from '@/lib/data/leads';
import { getDeals, getActiveUsers } from '@/lib/data';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const [leads, deals, users] = await Promise.all([
    getLeads(),
    getDeals(),
    getActiveUsers()
  ]);

  return <AnalyticsClient leads={leads} deals={deals} users={users} />;
}
