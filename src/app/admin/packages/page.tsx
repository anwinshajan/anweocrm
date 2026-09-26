import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPackages, getServices } from '@/lib/data';
import PackagesClient from './PackagesClient';

export default async function PackagesPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const [packages, services] = await Promise.all([
    getPackages(),
    getServices(),
  ]);

  return <PackagesClient initialPackages={packages} services={services} />;
}
