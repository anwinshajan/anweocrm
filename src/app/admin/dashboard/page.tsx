import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLeads } from '@/lib/data/leads';
import { getDeals, getStats, getActiveUsers, getRecentActivity } from '@/lib/data';
import Link from 'next/link';
import AiChat from '@/components/AiChat';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const [leads, deals, users, recentActivity] = await Promise.all([
    getLeads(),
    getDeals(),
    getActiveUsers(),
    getRecentActivity(10),
  ]);

  const activeLeads = leads.filter((l) => l.status !== 'Deleted');
  const wonLeads = leads.filter((l) => l.status === 'Won');
  const totalRevenue = deals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const stats = await getStats(weekAgo, today).catch(() => []);

  const sentThisWeek = stats
    .filter((s) => s.metric === 'messages_sent')
    .reduce((sum, s) => sum + (parseInt(s.value, 10) || 0), 0);

  const leadsThisWeek = leads.filter(
    (l) => l.created_at && l.created_at >= weekAgo
  ).length;

  const statusCounts: Record<string, number> = {};
  activeLeads.forEach((l) => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface-0)] relative animate-fade-in overflow-y-auto">
      
      {/* Background Glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[var(--brand-500)] opacity-[0.03] blur-[150px] pointer-events-none" />

      {/* Main Container - Claude Interface at the top */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center z-10 relative pt-12 pb-8 px-4">
        
        {/* Stats Row (Low Opacity, hover to pop up) */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 opacity-40 hover:opacity-100 transition-all duration-500 group">
          <Link href="/leads" className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-transform">
            <span className="text-sm">📋</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-secondary)]">Total Leads</span>
              <span className="font-bold text-[var(--brand-400)] leading-none">{activeLeads.length}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-transform">
            <span className="text-sm">🏆</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-secondary)]">Deals Won</span>
              <span className="font-bold text-emerald-400 leading-none">{wonLeads.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-transform">
            <span className="text-sm">💰</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-secondary)]">Revenue</span>
              <span className="font-bold text-yellow-400 leading-none">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-transform">
            <span className="text-sm">📤</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-secondary)]">Msgs (7d)</span>
              <span className="font-bold text-purple-400 leading-none">{sentThisWeek}</span>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <h1 className="text-4xl md:text-5xl font-semibold text-center mb-8 text-white/90 tracking-tight">
          {greeting}, {session.username.split(' ')[0]} ⚡
        </h1>

        {/* AI Chat Interface */}
        <div className="w-full max-w-3xl mb-12">
          <AiChat />
        </div>

        {/* Traditional Admin KPIs below */}
        <div className="w-full grid md:grid-cols-2 gap-6 mt-8">
          
          {/* Pipeline breakdown */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Pipeline Status</h2>
            <div className="flex flex-col gap-2">
              {Object.entries(statusCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => {
                  const pct = Math.round((count / activeLeads.length) * 100);
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>{status}</span>
                        <span className="font-medium text-white">{count}</span>
                      </div>
                      <div className="progress-bar h-1.5">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Team */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Team ({users.length})</h2>
              <Link href="/admin/users" className="btn-secondary btn-sm">Manage</Link>
            </div>
            <div className="flex flex-col gap-2">
              {users.slice(0, 5).map((u) => {
                const userLeads = activeLeads.filter((l) => l.assigned_to === u.id || l.added_by === u.id);
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm"
                      style={{ background: 'var(--brand-600)', color: 'white' }}>
                      {u.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{u.username}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.role} · {userLeads.length} leads</div>
                    </div>
                    <span className={u.active === 'TRUE' ? 'badge-green' : 'badge-gray'}>
                      {u.active === 'TRUE' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity & Admin Links */}
        <div className="w-full grid md:grid-cols-2 gap-6 mt-6">
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">Recent Activity</h2>
            <div className="flex flex-col gap-3">
              {recentActivity.length === 0 ? (
                <div className="empty-state py-8">
                  <div className="empty-icon">📭</div>
                  <p style={{ color: 'var(--text-secondary)' }}>No activity yet</p>
                </div>
              ) : (
                recentActivity.map((act) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0"
                      style={{ background: 'var(--brand-500)' }} />
                    <div>
                      <div className="text-sm text-white">{act.content}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(act.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card h-fit">
             <h2 className="text-base font-semibold text-white mb-4">Quick Admin Links</h2>
             <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/admin/services', label: 'Services', icon: '🛠️' },
                { href: '/admin/config', label: 'Config Lists', icon: '⚙️' },
                { href: '/admin/templates', label: 'Templates', icon: '📄' },
                { href: '/admin/logs', label: 'Audit Logs', icon: '🔍' },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/5 text-center hover:scale-[1.02] transition-transform cursor-pointer">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
