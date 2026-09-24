import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLeads } from '@/lib/data/leads';
import { getDeals, getStats, getActiveUsers, getRecentActivity } from '@/lib/data';
import Link from 'next/link';

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

  const leadsThisWeek = stats
    .filter((s) => s.metric === 'leads_added')
    .reduce((sum, s) => sum + (parseInt(s.value, 10) || 0), 0);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  activeLeads.forEach((l) => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  return (
    <div className="p-6 flex flex-col gap-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/leads" className="btn-secondary btn-sm">All Leads</Link>
          <Link href="/admin/analytics" className="btn-primary btn-sm">📈 Analytics</Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: activeLeads.length, icon: '📋', delta: `+${leadsThisWeek} this week`, color: 'var(--brand-400)' },
          { label: 'Deals Won', value: wonLeads.length, icon: '🏆', delta: '', color: '#34d399' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: '💰', delta: '', color: '#fbbf24' },
          { label: 'Messages (7d)', value: sentThisWeek, icon: '📤', delta: '', color: '#a78bfa' },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
                {kpi.delta && (
                  <div className="text-xs mt-1" style={{ color: '#34d399' }}>{kpi.delta}</div>
                )}
              </div>
              <span className="text-2xl">{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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

      {/* Recent Activity */}
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

      {/* Quick admin links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/admin/services', label: 'Services', icon: '🛠️' },
          { href: '/admin/config', label: 'Config Lists', icon: '⚙️' },
          { href: '/admin/templates', label: 'Templates', icon: '📄' },
          { href: '/admin/logs', label: 'Audit Logs', icon: '🔍' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="card text-center hover:scale-[1.02] transition-transform cursor-pointer block">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-sm font-medium text-white">{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
