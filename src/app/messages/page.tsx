import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getActiveUsers } from '@/lib/data';
import { getLeads } from '@/lib/data/leads';
import { readObjects } from '@/lib/data/sheets-base';
import { TABS } from '@/lib/data/tabs';
import MessagesClient from './MessagesClient';
import type { Message, Pitch } from '@/lib/types';

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [allUsers, allLeads, allMessages, allPitches] = await Promise.all([
    getActiveUsers(),
    getLeads(),
    readObjects<Message>(TABS.MESSAGES),
    readObjects<Pitch>(TABS.PITCHES),
  ]);
  
  // All team members see all leads and messages
  const accessibleLeads = allLeads;
  const leadIds = new Set(accessibleLeads.map((l) => l.id));

  // All messages and pitches are accessible
  const scopedMessages = allMessages.filter((m) => leadIds.has(m.lead_id));
  const scopedPitches = allPitches.filter((p) => leadIds.has(p.lead_id));

  return (
    <MessagesClient 
      session={session} 
      users={allUsers} 
      leads={accessibleLeads} 
      messages={scopedMessages} 
      pitches={scopedPitches} 
    />
  );
}
