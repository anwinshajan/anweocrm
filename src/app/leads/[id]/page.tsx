import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getLeadById } from '@/lib/data/leads';
import {
  getResearchForLead,
  getCallNoteForLead,
  getPitchesForLead,
  getMessagesForLead,
  getActivityForLead,
  getActiveServices,
  getConfigList,
  getDealForLead,
  getActiveUsers,
} from '@/lib/data';
import LeadDetailClient from './LeadDetailClient';

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const lead = await getLeadById(id);
  if (!lead || lead.status === 'Deleted') notFound();

  // All team members can view any lead detail

  const [research, callNote, pitches, messages, activity, services, statuses, lostReasons, users, deal] =
    await Promise.all([
      getResearchForLead(id),
      getCallNoteForLead(id),
      getPitchesForLead(id),
      getMessagesForLead(id),
      getActivityForLead(id),
      getActiveServices(),
      getConfigList('pipeline_status'),
      getConfigList('lost_reason'),
      getActiveUsers(),
      getDealForLead(id),
    ]);

  return (
    <LeadDetailClient
      lead={lead}
      research={research}
      callNote={callNote}
      pitches={pitches}
      messages={messages}
      activity={activity}
      services={services}
      statuses={statuses}
      lostReasons={lostReasons}
      users={users}
      session={session}
      deal={deal}
    />
  );
}
