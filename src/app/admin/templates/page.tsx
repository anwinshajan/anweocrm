import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTemplates } from '@/lib/data';
import TemplatesClient from './TemplatesClient';

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const templates = await getTemplates();
  return <TemplatesClient initialTemplates={templates} />;
}
