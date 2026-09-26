import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/data';
import ConfigClient from './ConfigClient';

export default async function ConfigPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const configItems = await getConfig();

  return <ConfigClient initialItems={configItems} />;
}
