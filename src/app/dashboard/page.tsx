import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getFollowupsDueToday, getNewlyAssignedLeads } from '@/lib/data/leads';
import { getAnnouncementsForUser, getStats, getUserById } from '@/lib/data';
import Link from 'next/link';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default async function MyDayPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [followups, newLeads, announcements, user] = await Promise.all([
    getFollowupsDueToday(session.id),
    getNewlyAssignedLeads(session.id),
    getAnnouncementsForUser(session.id),
    getUserById(session.id),
  ]);

  const unreadAnnouncements = announcements.filter(
    (a) => !a.read_by.split(',').map((s) => s.trim()).includes(session.id)
  );

  const today = new Date().toISOString().slice(0, 10);
  const stats = await getStats(today, today, session.id).catch(() => []);
  const sent = stats.find((s) => s.metric === 'messages_sent')?.value ?? '0';
  const dailyTarget = parseInt(user?.daily_target ?? '10', 10);
  const sentNum = parseInt(sent, 10);
  const progress = Math.min(100, Math.round((sentNum / dailyTarget) * 100));

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
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Daily target */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Daily Messages Target</div>
            <div className="text-2xl font-bold text-white mt-1">
              {sentNum} <span className="text-base font-normal" style={{ color: 'var(--text-secondary)' }}>/ {dailyTarget}</span>
            </div>
          </div>
          <div className="text-3xl">🎯</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          {progress >= 100 ? '🎉 Target achieved!' : `${dailyTarget - sentNum} messages to go`}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Follow-ups Due', value: followups.length, icon: '🔔', href: '/followups', color: followups.length > 0 ? '#fb923c' : 'var(--text-secondary)' },
          { label: 'New Assignments', value: newLeads.length, icon: '📬', href: '/leads', color: newLeads.length > 0 ? 'var(--brand-400)' : 'var(--text-secondary)' },
          { label: 'Unread Messages', value: unreadAnnouncements.length, icon: '📢', href: '/inbox', color: unreadAnnouncements.length > 0 ? '#a78bfa' : 'var(--text-secondary)' },
          { label: 'Sent Today', value: sentNum, icon: '📤', href: '/leads', color: 'var(--text-secondary)' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="card hover:scale-[1.02] transition-transform block">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Follow-ups due today */}
      {followups.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              🔔 Follow-ups Due Today
              <span className="badge-orange">{followups.length}</span>
            </h2>
            <Link href="/followups" className="btn-secondary btn-sm">View all</Link>
          </div>
          <div className="flex flex-col gap-2">
            {followups.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="card flex items-center justify-between hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ background: 'var(--brand-600)', color: 'white' }}>
                    {lead.business_name?.[0]}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{lead.business_name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {lead.city} · {lead.category} · Due: {formatDate(lead.next_followup_at)}
                    </div>
                  </div>
                </div>
                <span className={`badge ${lead.status === 'Replied' ? 'badge-green' : 'badge-blue'}`}>
                  {lead.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New assignments */}
      {newLeads.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              📬 Newly Assigned
              <span className="badge-blue">{newLeads.length}</span>
            </h2>
            <Link href="/leads" className="btn-secondary btn-sm">View all</Link>
          </div>
          <div className="flex flex-col gap-2">
            {newLeads.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="card flex items-center justify-between hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ background: '#7c3aed', color: 'white' }}>
                    {lead.business_name?.[0]}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{lead.business_name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {lead.city} · {lead.category} · {lead.phone}
                    </div>
                  </div>
                </div>
                <span className="badge-purple">New</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Announcements */}
      {unreadAnnouncements.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
            📢 Unread Announcements
            <span className="badge-purple">{unreadAnnouncements.length}</span>
          </h2>
          <div className="flex flex-col gap-2">
            {unreadAnnouncements.map((ann) => (
              <div key={ann.id} className="card">
                <p className="text-sm text-white">{ann.message}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  From admin · {formatDate(ann.created_at)}
                </p>
              </div>
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
          <Link href="/leads?status=Replied" className="btn-secondary justify-center py-4 flex-col h-auto gap-2">
            <span className="text-xl">💬</span>
            <span className="text-xs">Replies</span>
          </Link>
          <Link href="/followups" className="btn-secondary justify-center py-4 flex-col h-auto gap-2">
            <span className="text-xl">📅</span>
            <span className="text-xs">Follow-ups</span>
          </Link>
          <Link href="/inbox" className="btn-secondary justify-center py-4 flex-col h-auto gap-2">
            <span className="text-xl">📬</span>
            <span className="text-xs">Inbox</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
