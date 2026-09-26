'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Lead, User } from '@/lib/types';

interface SessionInfo {
  id: string;
  role: string;
  username: string;
}

interface Props {
  leads: Lead[];
  allLeads: Lead[];
  users: User[];
  session: SessionInfo;
}

type Bucket = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later';

const BUCKET_CONFIG: Record<Bucket, { label: string; icon: string; color: string; urgency: string }> = {
  overdue:    { label: 'Overdue',       icon: '🔴', color: '#ef4444', urgency: 'Needs immediate action' },
  today:      { label: 'Due Today',     icon: '🟡', color: '#f59e0b', urgency: 'Act today' },
  tomorrow:   { label: 'Tomorrow',      icon: '🔵', color: '#6366f1', urgency: 'Plan ahead' },
  this_week:  { label: 'This Week',     icon: '🟢', color: '#10b981', urgency: 'Coming up' },
  later:      { label: 'Later',         icon: '⚪', color: '#94a3b8', urgency: 'Scheduled' },
};

function getBucket(dateStr: string): Bucket {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const in7Days = new Date(today.getTime() + 7 * 86_400_000);
  const d = new Date(dateStr);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dayStart < today) return 'overdue';
  if (dayStart.getTime() === today.getTime()) return 'today';
  if (dayStart.getTime() === tomorrow.getTime()) return 'tomorrow';
  if (dayStart < in7Days) return 'this_week';
  return 'later';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function daysOverdue(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

const STATUS_COLORS: Record<string, string> = {
  'New':             '#6366f1',
  'Replied':         '#f59e0b',
  'Hot Lead':        '#ef4444',
  'Payment Pending': '#f97316',
  'Won':             '#10b981',
  'Lost':            '#94a3b8',
};

export default function FollowUpsClient({ leads, allLeads, users, session }: Props) {
  const [filterUser, setFilterUser] = useState<string>(
    session.role === 'admin' ? 'all' : session.id
  );
  const [search, setSearch] = useState('');
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [activeBucket, setActiveBucket] = useState<Bucket | 'all'>('all');

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    users.forEach(u => { m[u.id] = u.username; });
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    let list = localLeads;
    if (filterUser !== 'all') list = list.filter(l => l.assigned_to === filterUser || l.added_by === filterUser);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.business_name.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.status.toLowerCase().includes(q)
      );
    }
    return list;
  }, [localLeads, filterUser, search]);

  // Group into buckets
  const buckets = useMemo(() => {
    const b: Record<Bucket, Lead[]> = { overdue: [], today: [], tomorrow: [], this_week: [], later: [] };
    filtered.forEach(l => {
      if (l.next_followup_at) b[getBucket(l.next_followup_at)].push(l);
    });
    // Sort overdue by most overdue first; others by soonest first
    b.overdue.sort((a, b) => new Date(a.next_followup_at).getTime() - new Date(b.next_followup_at).getTime());
    b.today.sort((a, b) => new Date(a.next_followup_at).getTime() - new Date(b.next_followup_at).getTime());
    b.tomorrow.sort((a, b) => new Date(a.next_followup_at).getTime() - new Date(b.next_followup_at).getTime());
    b.this_week.sort((a, b) => new Date(a.next_followup_at).getTime() - new Date(b.next_followup_at).getTime());
    b.later.sort((a, b) => new Date(a.next_followup_at).getTime() - new Date(b.next_followup_at).getTime());
    return b;
  }, [filtered]);

  const visibleBuckets: Bucket[] = ['overdue', 'today', 'tomorrow', 'this_week', 'later'];
  const displayBuckets = activeBucket === 'all' ? visibleBuckets : [activeBucket as Bucket];

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openReschedule(lead: Lead) {
    const current = lead.next_followup_at
      ? new Date(lead.next_followup_at).toISOString().slice(0, 16)
      : new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    setRescheduleDate(current);
    setRescheduling(lead.id);
  }

  async function saveReschedule(lead: Lead) {
    if (!rescheduleDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_followup_at: new Date(rescheduleDate).toISOString() }),
      });
      if (!res.ok) throw new Error();
      setLocalLeads(prev => prev.map(l =>
        l.id === lead.id
          ? { ...l, next_followup_at: new Date(rescheduleDate).toISOString() }
          : l
      ));
      setRescheduling(null);
      showToast('Follow-up rescheduled!');
    } catch {
      showToast('Failed to reschedule', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function markDone(lead: Lead) {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_followup_at: '', last_contacted_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      setLocalLeads(prev => prev.filter(l => l.id !== lead.id));
      showToast('Marked as contacted!');
    } catch {
      showToast('Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  }

  const totalOverdue = buckets.overdue.length;
  const totalToday = buckets.today.length;
  const total = filtered.length;

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-6xl mx-auto">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-rose-500">
            Follow-Ups
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {totalOverdue > 0
              ? `🔴 ${totalOverdue} overdue · ${totalToday} due today · ${total} total`
              : totalToday > 0
              ? `🟡 ${totalToday} due today · ${total} total`
              : `${total} scheduled follow-ups`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {session.role === 'admin' && (
            <select
              className="input text-sm"
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              style={{ minWidth: 150 }}
            >
              <option value="all">All Team Members</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
            <input
              className="input pl-9 text-sm"
              placeholder="Search leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 200 }}
            />
          </div>
        </div>
      </div>

      {/* Bucket tabs */}
      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setActiveBucket('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            activeBucket === 'all'
              ? 'bg-white/10 text-white border-white/20'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          All <span className="opacity-60 ml-1">({total})</span>
        </button>
        {visibleBuckets.map(bucket => {
          const cfg = BUCKET_CONFIG[bucket];
          const count = buckets[bucket].length;
          if (count === 0 && activeBucket !== bucket) return null;
          return (
            <button
              key={bucket}
              onClick={() => setActiveBucket(bucket)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all`}
              style={activeBucket === bucket
                ? { background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}55` }
                : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }
              }
            >
              {cfg.icon} {cfg.label}
              <span className="ml-1.5 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Bucket sections */}
      {total === 0 ? (
        <div className="card-glass border border-[var(--border)] py-20 text-center">
          <div className="text-5xl mb-4 opacity-30">📅</div>
          <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>
            {search ? 'No follow-ups match your search' : 'No follow-ups scheduled'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Set a follow-up date on any lead to see it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {displayBuckets.map(bucket => {
            const cfg = BUCKET_CONFIG[bucket];
            const items = buckets[bucket];
            if (items.length === 0) return null;
            return (
              <div key={bucket}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cfg.icon}</span>
                    <h2 className="font-bold text-white text-lg">{cfg.label}</h2>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${cfg.color}22`, color: cfg.color }}
                    >
                      {items.length}
                    </span>
                  </div>
                  <div className="flex-1 h-px" style={{ background: `${cfg.color}22` }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cfg.urgency}</span>
                </div>

                {/* Lead cards */}
                <div className="flex flex-col gap-3">
                  {items.map(lead => {
                    const overdue = bucket === 'overdue';
                    const days = overdue ? daysOverdue(lead.next_followup_at) : 0;
                    const assignedName = userMap[lead.assigned_to] || lead.assigned_to;
                    const statusColor = STATUS_COLORS[lead.status] || '#6366f1';
                    const isRescheduling = rescheduling === lead.id;

                    return (
                      <div
                        key={lead.id}
                        className={`card-glass border transition-all duration-300 ${
                          overdue ? 'border-red-500/20' : 'border-[var(--border)] hover:border-[var(--border-active)]'
                        }`}
                        style={overdue ? { background: 'rgba(239,68,68,0.03)' } : {}}
                      >
                        <div className="flex items-start gap-4">
                          {/* Status dot */}
                          <div
                            className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                            style={{ background: statusColor }}
                          />

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <Link
                                  href={`/leads/${lead.id}`}
                                  className="font-bold text-white hover:text-[var(--brand-400)] transition-colors text-lg"
                                >
                                  {lead.business_name}
                                </Link>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: `${statusColor}22`, color: statusColor }}
                                  >
                                    {lead.status}
                                  </span>
                                  {lead.phone && (
                                    <a
                                      href={`tel:${lead.phone}`}
                                      className="text-xs flex items-center gap-1 transition-colors hover:text-white"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      📞 {lead.phone}
                                    </a>
                                  )}
                                  {lead.whatsapp_number && (
                                    <a
                                      href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs flex items-center gap-1 transition-colors"
                                      style={{ color: '#25d366' }}
                                    >
                                      💬 WhatsApp
                                    </a>
                                  )}
                                  {session.role === 'admin' && (
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                      👤 {assignedName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Due date + overdue badge */}
                              <div className="text-right flex-shrink-0">
                                {overdue ? (
                                  <div>
                                    <span
                                      className="text-xs font-bold px-2 py-1 rounded-lg"
                                      style={{ background: '#ef444422', color: '#ef4444' }}
                                    >
                                      {days === 0 ? 'Overdue today' : `${days}d overdue`}
                                    </span>
                                    <p className="text-xs mt-1" style={{ color: '#fca5a5' }}>
                                      Was: {formatDate(lead.next_followup_at)}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm font-medium" style={{ color: cfg.color }}>
                                    {formatDate(lead.next_followup_at)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Notes preview */}
                            {lead.notes && (
                              <p
                                className="text-xs mt-2 line-clamp-1"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                📝 {lead.notes}
                              </p>
                            )}

                            {/* Reschedule inline */}
                            {isRescheduling ? (
                              <div className="flex items-center gap-2 mt-3">
                                <input
                                  type="datetime-local"
                                  className="input text-sm py-1.5"
                                  value={rescheduleDate}
                                  onChange={e => setRescheduleDate(e.target.value)}
                                />
                                <button
                                  onClick={() => saveReschedule(lead)}
                                  disabled={saving}
                                  className="btn-primary text-sm py-1.5 px-4"
                                >
                                  {saving ? '⏳' : '✓ Save'}
                                </button>
                                <button
                                  onClick={() => setRescheduling(null)}
                                  className="btn-ghost text-sm py-1.5 px-3"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              /* Action buttons */
                              <div className="flex items-center gap-2 mt-3 flex-wrap">
                                <Link
                                  href={`/leads/${lead.id}`}
                                  className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                >
                                  👁 View Lead
                                </Link>
                                <button
                                  onClick={() => openReschedule(lead)}
                                  className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                                  style={{ background: `${cfg.color}11`, color: cfg.color, border: `1px solid ${cfg.color}33` }}
                                >
                                  🗓️ Reschedule
                                </button>
                                <button
                                  onClick={() => markDone(lead)}
                                  disabled={saving}
                                  className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                                  style={{ background: '#10b98111', color: '#10b981', border: '1px solid #10b98133' }}
                                >
                                  ✓ Contacted
                                </button>
                                {lead.whatsapp_number && (
                                  <a
                                    href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                                    style={{ background: '#25d36611', color: '#25d366', border: '1px solid #25d36633' }}
                                  >
                                    💬 Message
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
