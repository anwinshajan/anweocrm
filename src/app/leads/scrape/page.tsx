import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ScraperClient from './ScraperClient';

export default async function LeadScraperPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return <ScraperClient role={session.role} userId={session.id} />;
}
