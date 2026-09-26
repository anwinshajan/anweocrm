import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/data';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let settings = {};
  if (session.role === 'admin') {
    settings = await getSettings();
  }

  return <SettingsClient session={session} initialSettings={settings} />;
}
