'use client';

import { useState, useMemo } from 'react';
import type { ConfigItem } from '@/lib/types';

interface Props {
  initialItems: ConfigItem[];
}

const LIST_GROUPS = [
  { key: 'pipeline_status', label: 'Pipeline Status', icon: '🔄', color: '#6366f1' },
  { key: 'lead_status',     label: 'Lead Status',     icon: '📌', color: '#f59e0b' },
  { key: 'lost_reason',     label: 'Lost Reasons',    icon: '❌', color: '#ef4444' },
  { key: 'lead_source',     label: 'Lead Sources',    icon: '📡', color: '#10b981' },
  { key: 'category',        label: 'Categories',      icon: '🏷️', color: '#8b5cf6' },
  { key: 'priority',        label: 'Priority Levels', icon: '⚡', color: '#f97316' },
  { key: 'tag',             label: 'Tags',             icon: '🔖', color: '#06b6d4' },
] as const;

type ListKey = typeof LIST_GROUPS[number]['key'];

export default function ConfigClient({ initialItems }: Props) {
  const [items, setItems] = useState<ConfigItem[]>(initialItems);
  const [activeList, setActiveList] = useState<ListKey>('pipeline_status');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [form, setForm] = useState({ value: '', label: '', sort_order: '99' });

  const activeGroup = LIST_GROUPS.find(g => g.key === activeList)!;
  const filteredItems = useMemo(
    () => items
      .filter(i => i.list_name === activeList)
      .sort((a, b) => parseInt(a.sort_order) - parseInt(b.sort_order)),
    [items, activeList]
  );

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function seedDefaults() {
    setSeeding(true);
    try {
      const res = await fetch('/api/config/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`✅ ${data.data.message}`);
      // Reload items from server
      const fresh = await fetch('/api/config').then(r => r.json());
      if (fresh.success) setItems(fresh.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to seed defaults', 'error');
    } finally {
      setSeeding(false);
    }
  }

  const totalItems = items.length;

  function openAdd() {
    setEditingItem(null);
    setForm({ value: '', label: '', sort_order: String(filteredItems.length + 1) });
    setShowAddModal(true);
  }

  function openEdit(item: ConfigItem) {
    setEditingItem(item);
    setForm({ value: item.value, label: item.label, sort_order: item.sort_order });
    setShowAddModal(true);
  }

  async function saveItem() {
    if (!form.value.trim() || !form.label.trim()) {
      showToast('Value and Label are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: ConfigItem = {
        list_name: activeList,
        value: form.value.trim(),
        label: form.label.trim(),
        sort_order: form.sort_order || '99',
        active: 'TRUE',
      };
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      // Optimistic update
      setItems(prev => {
        const existing = prev.findIndex(
          i => i.list_name === activeList && i.value === payload.value
        );
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = payload;
          return next;
        }
        return [...prev, payload];
      });
      showToast(editingItem ? 'Item updated!' : 'Item added!');
      setShowAddModal(false);
    } catch {
      showToast('Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: ConfigItem) {
    const updated = { ...item, active: item.active === 'TRUE' ? 'FALSE' : 'TRUE' };
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error();
      setItems(prev => prev.map(i =>
        i.list_name === item.list_name && i.value === item.value ? updated : i
      ));
      showToast(updated.active === 'TRUE' ? 'Item enabled' : 'Item disabled');
    } catch {
      showToast('Failed to update item', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function reorder(item: ConfigItem, direction: 'up' | 'down') {
    const sorted = [...filteredItems];
    const idx = sorted.findIndex(i => i.value === item.value);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = { ...sorted[idx], sort_order: sorted[swapIdx].sort_order };
    const b = { ...sorted[swapIdx], sort_order: sorted[idx].sort_order };

    setSaving(true);
    try {
      await Promise.all([
        fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }),
        fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }),
      ]);
      setItems(prev => prev.map(i => {
        if (i.list_name === activeList && i.value === a.value) return a;
        if (i.list_name === activeList && i.value === b.value) return b;
        return i;
      }));
    } catch {
      showToast('Failed to reorder', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
            CRM Configuration
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Manage dropdown lists, pipeline stages, and system labels used across the CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalItems === 0 && (
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="btn-ghost flex items-center gap-2 border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {seeding ? '⏳ Seeding...' : '🌱 Load Defaults'}
            </button>
          )}
          <button
            id="add-config-btn"
            onClick={openAdd}
            className="btn-primary flex items-center gap-2"
          >
            <span>+</span> Add {activeGroup.label.replace(/s$/, '')}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="flex flex-col gap-1 min-w-[200px]">
          {LIST_GROUPS.map(group => {
            const count = items.filter(i => i.list_name === group.key && i.active === 'TRUE').length;
            return (
              <button
                key={group.key}
                onClick={() => setActiveList(group.key as ListKey)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                  activeList === group.key
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                }`}
                style={activeList === group.key ? {
                  background: `${group.color}22`,
                  border: `1px solid ${group.color}55`,
                  color: group.color,
                } : { border: '1px solid transparent' }}
              >
                <span className="flex items-center gap-2">
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: `${group.color}33`, color: group.color }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="card-glass overflow-hidden p-0 shadow-lg border border-[var(--border)]">
            {/* List header */}
            <div
              className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)]"
              style={{ background: `${activeGroup.color}11` }}
            >
              <span className="text-2xl">{activeGroup.icon}</span>
              <div>
                <h2 className="font-bold text-white">{activeGroup.label}</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {filteredItems.length} items · Drag to reorder or use arrows
                </p>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="text-4xl mb-4 opacity-40">{activeGroup.icon}</div>
                <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>
                  No {activeGroup.label.toLowerCase()} defined yet.
                </p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  Load all defaults at once, or add items manually.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={seedDefaults}
                    disabled={seeding}
                    className="btn-ghost flex items-center gap-2"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    {seeding ? '⏳ Loading...' : '🌱 Load All Defaults'}
                  </button>
                  <button onClick={openAdd} className="btn-primary">
                    + Add Manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredItems.map((item, idx) => (
                  <div
                    key={item.value}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02] ${
                      item.active !== 'TRUE' ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Sort order */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => reorder(item, 'up')}
                        disabled={idx === 0 || saving}
                        className="text-xs text-[var(--text-muted)] hover:text-white disabled:opacity-20 transition-colors"
                      >▲</button>
                      <button
                        onClick={() => reorder(item, 'down')}
                        disabled={idx === filteredItems.length - 1 || saving}
                        className="text-xs text-[var(--text-muted)] hover:text-white disabled:opacity-20 transition-colors"
                      >▼</button>
                    </div>

                    {/* Color dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: activeGroup.color, opacity: item.active === 'TRUE' ? 1 : 0.3 }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        value: <code className="text-xs" style={{ color: activeGroup.color }}>{item.value}</code>
                        &nbsp;· order: {item.sort_order}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={item.active === 'TRUE'
                        ? { background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }
                        : { background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }
                      }
                    >
                      {item.active === 'TRUE' ? 'Active' : 'Disabled'}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all text-sm"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => toggleActive(item)}
                        disabled={saving}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all text-sm"
                        title={item.active === 'TRUE' ? 'Disable' : 'Enable'}
                      >
                        {item.active === 'TRUE' ? '🔴' : '🟢'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="card-glass w-full max-w-md p-6 flex flex-col gap-5 border border-[var(--border)] shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingItem ? 'Edit' : 'Add'} {activeGroup.label.replace(/s$/, '')}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-white text-xl transition-colors"
              >✕</button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="label">
                  Value <span className="text-xs opacity-60">(internal key, no spaces)</span>
                </label>
                <input
                  className="input font-mono"
                  placeholder="e.g. hot_lead"
                  value={form.value}
                  readOnly={!!editingItem}
                  onChange={e => setForm({ ...form, value: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                  style={editingItem ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                />
              </div>

              <div className="form-group">
                <label className="label">
                  Label <span className="text-xs opacity-60">(shown in UI)</span>
                </label>
                <input
                  className="input"
                  placeholder="e.g. Hot Lead"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Sort Order</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? '⏳ Saving...' : editingItem ? '💾 Update' : '+ Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
