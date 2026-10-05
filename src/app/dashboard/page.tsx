import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLeadsByUser, getFollowupsDueToday } from '@/lib/data/leads';
import { getDeals, getUserById } from '@/lib/data';
import { getPaymentsByUser } from '@/lib/data/payments';
import Link from 'next/link';
import AiChat from '@/components/AiChat';

export default async function TeamDashboardPage() {
  const session = await getSession();
  if (!session || session.role === 'admin') redirect('/login');

  const [leads, followups, deals, payments, user] = await Promise.all([
    getLeadsByUser(session.id),
    getFollowupsDueToday(session.id),
    getDeals(),
    getPaymentsByUser(session.id),
    getUserById(session.id)
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const leadsToday = leads.filter(l => new Date(l.created_at) >= todayStart).length;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const userDeals = deals.filter(d => d.closed_by === session.id);
  const dealsThisWeek = userDeals.filter(d => new Date(d.closed_at || d.start_date) >= weekStart).length;

  let lifetimeEarnings = 0;
  if (user?.commission_type === 'Commission' || user?.commission_type === 'Hybrid') {
    const totalRevenue = userDeals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);
    const commRate = parseFloat(user.commission_value || '0') / 100;
    lifetimeEarnings = totalRevenue * commRate;
  }
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const displayEarnings = Math.max(lifetimeEarnings, totalPaid);
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface-0)] items-center justify-center p-4 relative animate-fade-in overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--brand-500)] opacity-[0.03] blur-[150px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-3xl flex flex-col items-center justify-center z-10 relative mt-[-10vh]">
        
        {/* Stats Row (Low Opacity, hover to pop up) */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 opacity-40 hover:opacity-100 transition-all duration-500 group">
          <Link href="/leads" className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-transform">
            <span className="text-sm">👤</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-secondary)]">Leads Today</span>
              <span className="font-bold text-white leading-none">{leadsToday}</span>
            </div>
          </Link>
          <Link href="/followups" className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-transform">
            <span className="text-sm">🔔</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-secondary)]">Follow-ups</span>
              <span className="font-bold text-orange-400 leading-none">{followups.length}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-transform">
            <span className="text-sm">🤝</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-secondary)]">Deals Week</span>
              <span className="font-bold text-emerald-400 leading-none">{dealsThisWeek}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-transform">
            <span className="text-sm">💰</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-secondary)]">Earnings</span>
              <span className="font-bold text-[var(--brand-400)] leading-none">{formatCurrency(displayEarnings)}</span>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <h1 className="text-4xl md:text-5xl font-semibold text-center mb-8 text-white/90 tracking-tight">
          {greeting}, {session.username.split(' ')[0]}
        </h1>

        {/* AI Chat Interface */}
        <AiChat />

      </div>
    </div>
  );
}
