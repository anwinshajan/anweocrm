'use client';

import { useState, useMemo } from 'react';
import type { Package, Service } from '@/lib/types';

interface Props {
  initialPackages: Package[];
  services: Service[];
}

const EMPTY_FORM = {
  service_id: '',
  name: '',
  description: '',
  price: '',
  deliverables: '',
  active: 'TRUE' as 'TRUE' | 'FALSE',
};

export default function PackagesClient({ initialPackages, services }: Props) {
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  // Build service lookup map
  const serviceMap = useMemo(() => {
    const map: Record<string, Service> = {};
    services.forEach(s => { map[s.id] = s; });
    return map;
  }, [services]);

  // Filter packages
  const filtered = useMemo(() => {
    let list = packages;
    if (selectedServiceId !== 'all') list = list.filter(p => p.service_id === selectedServiceId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (serviceMap[p.service_id]?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [packages, selectedServiceId, search, serviceMap]);

  // Stats
  const activeCount = packages.filter(p => p.active === 'TRUE').length;
  const totalRevenue = packages
    .filter(p => p.active === 'TRUE')
    .reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setEditingPkg(null);
    setForm({ ...EMPTY_FORM, service_id: selectedServiceId !== 'all' ? selectedServiceId : '' });
    setShowModal(true);
  }

  function openEdit(pkg: Package) {
    setEditingPkg(pkg);
    setForm({
      service_id: pkg.service_id,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      deliverables: pkg.deliverables,
      active: pkg.active as 'TRUE' | 'FALSE',
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.service_id || !form.name || !form.price) {
      showToast('Service, name and price are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingPkg) {
        // PATCH
        const res = await fetch(`/api/packages/${editingPkg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPackages(prev => prev.map(p => p.id === editingPkg.id ? { ...p, ...form } : p));
        showToast('Package updated!');
      } else {
        // POST
        const res = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPackages(prev => [...prev, data.data]);
        showToast('Package created!');
      }
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pkg: Package) {
    const updated = { active: pkg.active === 'TRUE' ? 'FALSE' : 'TRUE' };
    setSaving(true);
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error();
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, ...updated } : p));
      showToast(updated.active === 'TRUE' ? 'Package enabled' : 'Package disabled');
    } catch {
      showToast('Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  }

  function formatPrice(price: string) {
    const n = parseFloat(price);
    if (isNaN(n)) return price || '—';
    return '₹' + n.toLocaleString('en-IN');
  }

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-7xl mx-auto">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-500">
            Packages
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage pricing packages grouped by service.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <span>+</span> New Package
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Packages', value: packages.length, icon: '📦', color: '#6366f1' },
          { label: 'Active',         value: activeCount,      icon: '✅', color: '#10b981' },
          { label: 'Services',       value: services.filter(s => s.active === 'TRUE').length, icon: '🛠️', color: '#f59e0b' },
          { label: 'Avg Price',      value: activeCount > 0
            ? '₹' + Math.round(totalRevenue / activeCount).toLocaleString('en-IN')
            : '—',                                            icon: '💰', color: '#ec4899' },
        ].map(stat => (
          <div
            key={stat.label}
            className="card-glass p-4 flex items-center gap-4 border border-[var(--border)]"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${stat.color}22` }}
            >
              {stat.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Service filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedServiceId('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedServiceId === 'all'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            All Services
          </button>
          {services.filter(s => s.active === 'TRUE').map(service => (
            <button
              key={service.id}
              onClick={() => setSelectedServiceId(service.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedServiceId === service.id
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {service.name}
              <span className="ml-1.5 opacity-60">
                ({packages.filter(p => p.service_id === service.id).length})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="ml-auto relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input
            className="input pl-9 text-sm"
            style={{ minWidth: 220 }}
            placeholder="Search packages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Package cards */}
      {filtered.length === 0 ? (
        <div className="card-glass py-20 text-center border border-[var(--border)]">
          <div className="text-5xl mb-4 opacity-30">📦</div>
          <p className="text-lg mb-1" style={{ color: 'var(--text-muted)' }}>No packages found</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {search ? 'Try a different search' : 'Create your first package to get started'}
          </p>
          {!search && (
            <button onClick={openCreate} className="btn-primary">+ New Package</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(pkg => {
            const service = serviceMap[pkg.service_id];
            const isActive = pkg.active === 'TRUE';
            return (
              <div
                key={pkg.id}
                className={`card-glass border transition-all duration-300 flex flex-col ${
                  isActive
                    ? 'border-[var(--border)] hover:border-violet-500/40'
                    : 'border-[var(--border)] opacity-60'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      {service?.name || 'Unknown Service'}
                    </p>
                    <h3 className="font-bold text-white text-lg leading-tight truncate">{pkg.name}</h3>
                  </div>
                  <span
                    className="ml-3 text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                    style={isActive
                      ? { background: '#10b98122', color: '#10b981', border: '1px solid #10b98133' }
                      : { background: '#ef444422', color: '#ef4444', border: '1px solid #ef444433' }
                    }
                  >
                    {isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold" style={{ color: '#a78bfa' }}>
                    {formatPrice(pkg.price)}
                  </span>
                </div>

                {/* Description */}
                {pkg.description && (
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {pkg.description}
                  </p>
                )}

                {/* Deliverables */}
                {pkg.deliverables && (
                  <div className="mt-auto mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                      Deliverables
                    </p>
                    <ul className="flex flex-col gap-1">
                      {pkg.deliverables.split('\n').filter(Boolean).map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="mt-0.5 text-violet-400 flex-shrink-0">✦</span>
                          <span>{d.replace(/^[-•*]\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-4 border-t border-[var(--border)]">
                  <button
                    onClick={() => openEdit(pkg)}
                    className="flex-1 btn-ghost text-sm py-2"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => toggleActive(pkg)}
                    disabled={saving}
                    className="flex-1 text-sm py-2 rounded-lg transition-all font-medium"
                    style={isActive
                      ? { background: '#ef444411', color: '#ef4444', border: '1px solid #ef444422' }
                      : { background: '#10b98111', color: '#10b981', border: '1px solid #10b98122' }
                    }
                  >
                    {isActive ? '🔴 Disable' : '🟢 Enable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="card-glass w-full max-w-lg p-6 flex flex-col gap-5 border border-[var(--border)] shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingPkg ? 'Edit Package' : 'New Package'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--text-muted)] hover:text-white text-xl"
              >✕</button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Service select */}
              <div className="form-group">
                <label className="label">Service <span className="text-red-400">*</span></label>
                <select
                  className="input"
                  value={form.service_id}
                  onChange={e => setForm({ ...form, service_id: e.target.value })}
                >
                  <option value="">— Select a service —</option>
                  {services.filter(s => s.active === 'TRUE').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="label">Package Name <span className="text-red-400">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. Starter, Growth, Pro"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Price */}
              <div className="form-group">
                <label className="label">Price (₹) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 15000"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="label">Short Description</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Brief tagline for this package..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Deliverables */}
              <div className="form-group">
                <label className="label">
                  Deliverables
                  <span className="ml-1 text-xs opacity-60">(one per line)</span>
                </label>
                <textarea
                  className="input font-mono text-sm"
                  rows={5}
                  placeholder={"Website audit report\nKeyword research\n3 months support"}
                  value={form.deliverables}
                  onChange={e => setForm({ ...form, deliverables: e.target.value })}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <span className="text-sm font-medium text-white">Active</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, active: form.active === 'TRUE' ? 'FALSE' : 'TRUE' })}
                  className="relative w-11 h-6 rounded-full transition-all duration-200"
                  style={{ background: form.active === 'TRUE' ? '#6366f1' : 'var(--border)' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                    style={{ transform: form.active === 'TRUE' ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? '⏳ Saving...' : editingPkg ? '💾 Update' : '+ Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
