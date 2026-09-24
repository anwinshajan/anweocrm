'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Lead, ConfigItem } from '@/lib/types';

interface LeadsPageProps {
  initialLeads: Lead[];
  total: number;
  statuses: ConfigItem[];
  tags: ConfigItem[];
  role: 'admin' | 'team';
  userId: string;
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
}: LeadsPageProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'table' | 'kanban'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

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

  // Kanban grouped by status
  const kanbanGroups: Record<string, Lead[]> = {};
  statuses.forEach((s) => { kanbanGroups[s.value] = []; });
  leads.forEach((l) => {
    if (kanbanGroups[l.status]) kanbanGroups[l.status].push(l);
    else kanbanGroups['New'] = [...(kanbanGroups['New'] || []), l];
  });

  return (
    <div className="p-6 flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{total} total</p>
        </div>
        <div className="flex gap-2">
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
          <div className="table-container card p-0">
            <table>
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" onChange={toggleAll} checked={selected.size === leads.length && leads.length > 0} />
                  </th>
                  <th>Business</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Follow-up</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                      No leads found
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className={selected.has(lead.id) ? 'ring-1 ring-blue-500/20' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                        />
                      </td>
                      <td>
                        <div className="font-medium text-white">{lead.business_name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.category}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{lead.city}</td>
                      <td>{statusBadge(lead.status)}</td>
                      <td>
                        {lead.priority && (
                          <>{priorityDot(lead.priority)}<span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{lead.priority}</span></>
                        )}
                      </td>
                      <td className="text-xs" style={{ color: lead.next_followup_at && new Date(lead.next_followup_at) < new Date() ? '#f87171' : 'var(--text-secondary)' }}>
                        {lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                      <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      </td>
                      <td>
                        <Link href={`/leads/${lead.id}`} className="btn-secondary btn-sm">View</Link>
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
    </div>
  );
}
