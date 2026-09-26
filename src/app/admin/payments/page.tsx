import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPayments } from '@/lib/data/payments';
import { getActiveUsers, getDeals } from '@/lib/data';
import PaymentsClient from './PaymentsClient';

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/dashboard');
  }

  const [payments, users, deals] = await Promise.all([
    getPayments(),
    getActiveUsers(),
    getDeals()
  ]);

  return <PaymentsClient payments={payments} users={users} deals={deals} />;
}
