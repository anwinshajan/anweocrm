import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <div className="flex min-h-dvh">
      <Sidebar role={session.role} username={session.username} />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
