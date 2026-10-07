'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Lead, ConfigItem, User } from '@/lib/types';
import LeadScraperModal from '@/components/LeadScraperModal';

interface LeadsPageProps {
  initialLeads: Lead[];
  total: number;
  statuses: ConfigItem[];
  tags: ConfigItem[];
  role: 'admin' | 'team';
  userId: string;
  users: User[];
}

const STATUS_COLORS: Record<string, string> = {
  Won: 'badge-green',
  Lost: 'badge-red',
  'Hot Lead': 'badge-orange',
  New: 'badge-blue',
  Replied: 'badge-purple',
};

function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] ?? 'badge-gray';
  return <span className={cls}>{status}</span>;
}

function priorityDot(p: string) {
  const colors: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#34d399' };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1"
      style={{ background: colors[p] ?? '#5a5a7a' }}
    />
  );
}

export default function LeadsClient({
  initialLeads,
  total: initialTotal,
  statuses,
  tags,
  role,
  userId,
  users,
}: LeadsPageProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [isScraperOpen, setIsScraperOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkGenerateProgress, setBulkGenerateProgress] = useState<{current: number, total: number, message: string, currentId: string | null} | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const PAGE_SIZE = 25;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLeads = useCallback(async (p: number, s: string, st: string, tg: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(PAGE_SIZE),
        ...(s && { search: s }),
        ...(st && { status: st }),
        ...(tg && { tag: tg }),
      });
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data.items);
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(page, search, statusFilter, tagFilter);
  }, [page, search, statusFilter, tagFilter, fetchLeads]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  async function bulkUpdateStatus(status: string) {
    setBulkLoading(true);
    const ids = Array.from(selected);
    let done = 0;
    for (const id of ids) {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      done++;
    }
    setBulkLoading(false);
    setSelected(new Set());
    fetchLeads(page, search, statusFilter, tagFilter);
  }

  async function bulkGeneratePitches() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkGenerateProgress({ current: 0, total: ids.length, message: 'Starting...', currentId: null });
    
    let successCount = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const leadName = leads.find(l => l.id === id)?.business_name || 'Lead';
      setBulkGenerateProgress({ current: i + 1, total: ids.length, message: `Processing ${leadName}...`, currentId: id });
      
      try {
        const res = await fetch(`/api/leads/${id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'all', language: 'english', skipIfExists: true }), 
        });
        if (res.ok) {
          successCount++;
          // Update local state to show it's generated
          setLeads(prev => prev.map(l => l.id === id ? { ...l, has_pitch: true } : l));
        }
      } catch (err) {
        console.error('Failed to generate for', id, err);
      }
      
      // Wait 15 seconds to respect free tier rate limits (15 RPM), unless it's the last lead
      if (i < ids.length - 1) {
        setBulkGenerateProgress({ current: i + 1, total: ids.length, message: `Cooling down for 15s to respect free limits...`, currentId: id });
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }
    
    setBulkGenerateProgress(null);
    setSelected(new Set());
    showToast(`Successfully generated pitches for ${successCount} leads!`);
  }

  async function openWhatsAppPitch(lead: Lead) {
    if (!lead.phone && !lead.whatsapp_number) {
      showToast('No phone number for this lead', 'error');
      return;
    }
    const num = lead.whatsapp_number || lead.phone;
    
    // Fetch latest pitch
    try {
      const res = await fetch(`/api/leads/${lead.id}/latest-pitch`);
      const data = await res.json();
      
      let text = '';
      if (data.success && data.data?.message_text) {
        text = encodeURIComponent(data.data.message_text);
      } else {
        showToast('No pitch found for this lead, sending blank message', 'error');
      }
      window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${text}`, '_blank');
    } catch (err) {
      window.open(`https://wa.me/${num.replace(/\D/g, '')}`, '_blank');
    }
  }

  // Kanban grouped by status
  const kanbanGroups: Record<string, Lead[]> = {};
  statuses.forEach((s) => { kanbanGroups[s.value] = []; });
  leads.forEach((l) => {
    if (kanbanGroups[l.status]) kanbanGroups[l.status].push(l);
    else kanbanGroups['New'] = [...(kanbanGroups['New'] || []), l];
  });

  return (
    <div className="p-6 flex flex-col gap-6 animate-fade-in relative">
      {toast && (
        <div className={`toast toast-${toast.type} absolute top-4 right-4 z-50`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link href={role === 'admin' ? "/admin/dashboard" : "/dashboard"} className="text-sm mb-2 inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{total} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setIsScraperOpen(true)} 
            className="btn-secondary btn-sm bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border-amber-500/30 hover:border-amber-400 font-semibold"
          >
            🔍 Scrape Leads
          </button>
          <Link href="/leads/scrape" className="btn-secondary btn-sm">🌐 Scraper Hub</Link>
          <Link href="/leads/new" className="btn-primary btn-sm">➕ Add Lead</Link>
          <Link href="/leads/import" className="btn-secondary btn-sm">📥 Import</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          className="input flex-1 min-w-[200px] max-w-xs"
          placeholder="🔍 Search leads..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          className="select"
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
        >
          <option value="">All tags</option>
          {tags.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'table' ? 'bg-brand-600 text-white' : ''}`}
            style={view === 'table' ? { background: 'var(--brand-600)', color: 'white' } : { color: 'var(--text-secondary)' }}
            onClick={() => setView('table')}
          >
            ☰ Table
          </button>
          <button
            className={`px-3 py-2 text-sm font-medium transition-colors`}
            style={view === 'kanban' ? { background: 'var(--brand-600)', color: 'white' } : { color: 'var(--text-secondary)' }}
            onClick={() => setView('kanban')}
          >
            🗂️ Kanban
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="card-glass flex items-center gap-3 py-3 animate-slide-up">
          <span className="text-sm font-medium text-white">{selected.size} selected</span>
          <select
            className="select text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) bulkUpdateStatus(e.target.value);
            }}
          >
            <option value="">Change status...</option>
            {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
            Cancel
          </button>
          <div className="ml-auto flex items-center gap-2">
            {bulkGenerateProgress && (
              <span className="text-xs text-blue-400 font-mono animate-pulse">
                {bulkGenerateProgress.message} ({bulkGenerateProgress.current}/{bulkGenerateProgress.total})
              </span>
            )}
            <button 
              className="btn-primary btn-sm" 
              onClick={bulkGeneratePitches}
              disabled={bulkGenerateProgress !== null || bulkLoading}
            >
              {bulkGenerateProgress ? '⏳ Generating...' : '✨ Bulk Pitch Out'}
            </button>
          </div>
          {bulkLoading && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Updating...</span>}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      ) : view === 'table' ? (
        <>
          <div className="w-full overflow-x-auto pb-4">
            <table className="w-full text-sm border-separate border-spacing-y-4">
              <thead>
                <tr>
                  <th className="w-10 px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">
                    <input type="checkbox" onChange={toggleAll} checked={selected.size === leads.length && leads.length > 0} className="w-4 h-4 rounded border-gray-600 bg-gray-700" />
                  </th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Business</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">City</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Status</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Priority</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">AI Pitch</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Assigned To</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Follow-up</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Added</th>
                  <th className="px-6 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center bg-white/5 rounded-2xl border border-[var(--border)]" style={{ color: 'var(--text-muted)' }}>
                      No leads found
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className={`group bg-white/5 hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md ${selected.has(lead.id) ? 'ring-2 ring-blue-500/50' : ''}`}>
                      <td className="px-6 py-5 rounded-l-2xl border-y border-l border-[var(--border)]">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                        />
                      </td>
                      <td className="px-6 py-5 border-y border-[var(--border)]">
                        <div className="font-bold text-white text-base mb-1">{lead.business_name}</div>
                        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--brand-400)' }}>{lead.category}</div>
                      </td>
                      <td className="px-6 py-5 border-y border-[var(--border)] font-medium" style={{ color: 'var(--text-secondary)' }}>{lead.city}</td>
                      <td className="px-6 py-5 border-y border-[var(--border)]">{statusBadge(lead.status)}</td>
                      <td className="px-6 py-5 border-y border-[var(--border)]">
                        {lead.priority && (
                          <div className="flex items-center gap-2">
                            {priorityDot(lead.priority)}
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{lead.priority}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 border-y border-[var(--border)]">
                        {bulkGenerateProgress?.currentId === lead.id ? (
                          <span className="badge-blue animate-pulse flex items-center gap-1">✨ Generating...</span>
                        ) : lead.has_pitch ? (
                          <span className="badge-green flex items-center gap-1">✅ Generated</span>
                        ) : (
                          <span className="badge-gray flex items-center gap-1">⏳ Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-5 border-y border-[var(--border)] font-medium text-sm text-white">
                        {users.find(u => u.id === lead.assigned_to)?.username || 'Unassigned'}
                      </td>
                      <td className="px-6 py-5 border-y border-[var(--border)] text-sm font-medium" style={{ color: lead.next_followup_at && new Date(lead.next_followup_at) < new Date() ? '#fca5a5' : 'var(--text-secondary)' }}>
                        {lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                      <td className="px-6 py-5 border-y border-[var(--border)] text-sm" style={{ color: 'var(--text-muted)' }}>
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      </td>
                      <td className="px-6 py-5 rounded-r-2xl border-y border-r border-[var(--border)] text-right flex items-center justify-end gap-2">
                        <button 
                          className="btn-primary btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openWhatsAppPitch(lead)}
                        >
                          💬 WhatsApp
                        </button>
                        <Link href={`/leads/${lead.id}`} className="btn-secondary btn-sm opacity-0 group-hover:opacity-100 transition-opacity">View Details</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                className="btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-secondary btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        // Kanban view
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {statuses.map((s) => {
              const colLeads = kanbanGroups[s.value] ?? [];
              return (
                <div key={s.value} className="kanban-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{s.label}</h3>
                    <span className="badge-gray text-xs">{colLeads.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {colLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="kanban-card block"
                      >
                        <div className="font-medium text-sm text-white truncate">{lead.business_name}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {lead.city} · {lead.category}
                        </div>
                        {lead.next_followup_at && (
                          <div className="text-xs mt-2 flex items-center gap-1"
                            style={{ color: new Date(lead.next_followup_at) < new Date() ? '#f87171' : 'var(--text-muted)' }}>
                            🗓️ {new Date(lead.next_followup_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lead Scraper Modal */}
      <LeadScraperModal
        isOpen={isScraperOpen}
        onClose={() => setIsScraperOpen(false)}
        onSuccess={() => fetchLeads(page, search, statusFilter, tagFilter)}
      />
    </div>
  );
}
