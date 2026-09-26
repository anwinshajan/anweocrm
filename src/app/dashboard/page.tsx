import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLeadsByUser, getFollowupsDueToday } from '@/lib/data/leads';
import { getDeals, getUserById } from '@/lib/data';
import { getPaymentsByUser } from '@/lib/data/payments';
import Link from 'next/link';

export default async function TeamDashboardPage() {
  const session = await getSession();
  if (!session || session.role === 'admin') redirect('/login'); // Admins go to /admin/dashboard

  const [leads, followups, deals, payments, user] = await Promise.all([
    getLeadsByUser(session.id),
    getFollowupsDueToday(session.id),
    getDeals(),
    getPaymentsByUser(session.id),
    getUserById(session.id)
  ]);

  // Own leads today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const leadsToday = leads.filter(l => new Date(l.created_at) >= todayStart).length;

  // Own deals this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const userDeals = deals.filter(d => d.closed_by === session.id);
  const dealsThisWeek = userDeals.filter(d => new Date(d.closed_at || d.start_date) >= weekStart).length;

  // Lifetime earnings calculation
  let lifetimeEarnings = 0;
  if (user?.commission_type === 'Commission' || user?.commission_type === 'Hybrid') {
    const totalRevenue = userDeals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);
    const commRate = parseFloat(user.commission_value || '0') / 100;
    lifetimeEarnings = totalRevenue * commRate;
  }
  // If they have fixed salary components paid, add them too
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  // Depending on how "earnings" is defined, we can just show totalPaid + pending commissions.
  // For simplicity, if they are commission based, we show earned commission. If fixed, we show total paid.
  const displayEarnings = Math.max(lifetimeEarnings, totalPaid);
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {session.username} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Here is your personal snapshot for today.
        </p>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/leads" className="card hover:scale-[1.02] transition-transform block">
          <div className="text-2xl mb-2">👤</div>
          <div className="text-2xl font-bold text-[var(--brand-400)]">{leadsToday}</div>
          <div className="text-xs mt-0.5 text-[var(--text-secondary)]">Leads Brought (Today)</div>
        </Link>
        <Link href="/followups" className="card hover:scale-[1.02] transition-transform block">
          <div className="text-2xl mb-2">🔔</div>
          <div className="text-2xl font-bold text-orange-400">{followups.length}</div>
          <div className="text-xs mt-0.5 text-[var(--text-secondary)]">Follow-ups Due</div>
        </Link>
        <div className="card">
          <div className="text-2xl mb-2">🤝</div>
          <div className="text-2xl font-bold text-emerald-400">{dealsThisWeek}</div>
          <div className="text-xs mt-0.5 text-[var(--text-secondary)]">Deals Closed (This Week)</div>
        </div>
        <div className="card">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-2xl font-bold text-[var(--brand-400)]">{formatCurrency(displayEarnings)}</div>
          <div className="text-xs mt-0.5 text-[var(--text-secondary)]">Lifetime Earnings</div>
        </div>
      </div>

      {/* Follow-ups due today list */}
      {followups.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              🔔 Pending Actions
              <span className="badge-orange">{followups.length}</span>
            </h2>
            <Link href="/followups" className="btn-secondary btn-sm">Go to Follow-ups</Link>
          </div>
          <div className="flex flex-col gap-2">
            {followups.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="card flex items-center justify-between hover:scale-[1.01] transition-transform py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm bg-white/10 text-white">
                    {lead.business_name?.[0]}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{lead.business_name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {lead.phone} · Due: {new Date(lead.next_followup_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className={`badge ${lead.status === 'Replied' ? 'badge-green' : 'badge-orange'}`}>
                  {lead.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/leads/new" className="btn-primary justify-center py-4 flex-col h-auto gap-2">
            <span className="text-xl">➕</span>
            <span className="text-xs">Add Lead</span>
          </Link>
          <Link href="/messages" className="btn-secondary justify-center py-4 flex-col h-auto gap-2">
            <span className="text-xl">💬</span>
            <span className="text-xs">Messages</span>
          </Link>
          <Link href="/followups" className="btn-secondary justify-center py-4 flex-col h-auto gap-2">
            <span className="text-xl">📅</span>
            <span className="text-xs">Follow-ups</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
