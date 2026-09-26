import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBrandKnowledge } from '@/lib/data';
import BrandClient from './BrandClient';

export default async function BrandPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const kb = await getBrandKnowledge();

  return <BrandClient initialData={kb} />;
}
