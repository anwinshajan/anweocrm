import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLeadsPaginated } from '@/lib/data/leads';
import { getConfigList, getActiveUsers } from '@/lib/data';
import LeadsClient from './LeadsClient';

export default async function LeadsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [result, statuses, tags, users] = await Promise.all([
    getLeadsPaginated(1, 25, {}),
    getConfigList('pipeline_status'),
    getConfigList('tag'),
    getActiveUsers(),
  ]);

  return (
    <LeadsClient
      initialLeads={result.items}
      total={result.total}
      statuses={statuses}
      tags={tags}
      role={session.role}
      userId={session.id}
      users={users}
    />
  );
}
