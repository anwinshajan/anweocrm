import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.must_change_password) redirect('/change-password');
  if (session.role === 'admin') redirect('/admin/dashboard');
  redirect('/dashboard');
}
