'use client';

import { useState } from 'react';
import type { Service, Package } from '@/lib/types';

interface Props {
  services: Service[];
  packages: Package[];
}

function emptyService(): Partial<Service> {
  return { name: '', description: '', ideal_customer: '', pitch_angle: '', priority_rank: '99', active: 'TRUE' };
}

export default function AdminServicesClient({ services: initServices, packages: initPackages }: Props) {
  const [services, setServices] = useState<Service[]>(initServices);
  const [packages, setPackages] = useState<Package[]>(initPackages);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Service>>(emptyService());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Package form
  const [pkgForm, setPkgForm] = useState<Partial<Package>>({ name: '', description: '', price: '', deliverables: '', active: 'TRUE' });
  const [addingPkgFor, setAddingPkgFor] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function saveService() {
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const url = editId ? `/api/services/${editId}` : '/api/services';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { showToast('Error: ' + data.error); return; }

      if (editId) {
        setServices((s) => s.map((svc) => svc.id === editId ? data.data : svc));
      } else {
        setServices((s) => [...s, data.data]);
      }
      setEditId(null);
      setForm(emptyService());
      showToast(editId ? 'Service updated' : 'Service created');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setServices((s) => s.map((svc) => svc.id === id ? { ...svc, active: 'FALSE' } : svc));
      showToast('Service deactivated');
    }
  }

  async function reactivate(id: string) {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: 'TRUE' }),
    });
    if (res.ok) {
      setServices((s) => s.map((svc) => svc.id === id ? { ...svc, active: 'TRUE' } : svc));
      showToast('Service reactivated');
    }
  }

  async function savePackage(serviceId: string) {
    const res = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pkgForm, service_id: serviceId }),
    });
    const data = await res.json();
    if (data.success) {
      setPackages((p) => [...p, data.data]);
      setAddingPkgFor(null);
      setPkgForm({ name: '', description: '', price: '', deliverables: '', active: 'TRUE' });
      showToast('Package added');
    }
  }

  const sorted = [...services].sort((a, b) => parseInt(a.priority_rank, 10) - parseInt(b.priority_rank, 10));

  return (
    <div className="p-6 flex flex-col gap-6 animate-fade-in">
      {toast && (
        <div className="toast toast-success">✅ {toast}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Services</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage the services Anweo offers. These power all AI prompts and pitches.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditId(null); setForm(emptyService()); }}>
          ➕ Add Service
        </button>
      </div>

      {/* Add / Edit form */}
      {(editId !== undefined || !editId) && (
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">{editId ? 'Edit Service' : 'New Service'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="form-group md:col-span-2">
              <label className="label">Service Name *</label>
              <input className="input" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Social Media Management" />
            </div>
            <div className="form-group md:col-span-2">
              <label className="label">Description</label>
              <textarea className="textarea" rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What this service delivers" />
            </div>
            <div className="form-group">
              <label className="label">Ideal Customer</label>
              <input className="input" value={form.ideal_customer ?? ''} onChange={(e) => setForm((f) => ({ ...f, ideal_customer: e.target.value }))} placeholder="Who this is best for" />
            </div>
            <div className="form-group">
              <label className="label">Priority Rank (lower = higher priority)</label>
              <input type="number" className="input" value={form.priority_rank ?? ''} onChange={(e) => setForm((f) => ({ ...f, priority_rank: e.target.value }))} />
            </div>
            <div className="form-group md:col-span-2">
              <label className="label">Pitch Angle</label>
              <textarea className="textarea" rows={2} value={form.pitch_angle ?? ''} onChange={(e) => setForm((f) => ({ ...f, pitch_angle: e.target.value }))} placeholder="The core selling argument for AI to use" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary" onClick={saveService} disabled={saving || !form.name}>
              {saving ? '⏳ Saving...' : '💾 Save'}
            </button>
            <button className="btn-secondary" onClick={() => { setEditId(null); setForm(emptyService()); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Services list */}
      <div className="flex flex-col gap-3">
        {sorted.map((svc) => {
          const svcPackages = packages.filter((p) => p.service_id === svc.id);
          const isExpanded = expandedService === svc.id;
          return (
            <div key={svc.id} className="card" style={{ opacity: svc.active === 'FALSE' ? 0.6 : 1 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: 'var(--brand-600)', color: 'white' }}>
                    {svc.priority_rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{svc.name}</h3>
                      {svc.active === 'FALSE' && <span className="badge-gray text-xs">Inactive</span>}
                      {svc.active === 'TRUE' && <span className="badge-green text-xs">Active</span>}
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{svc.description}</p>
                    {svc.ideal_customer && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        🎯 {svc.ideal_customer}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="btn-secondary btn-sm" onClick={() => setExpandedService(isExpanded ? null : svc.id)}>
                    📦 {svcPackages.length} pkg{svcPackages.length !== 1 ? 's' : ''}
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => {
                    setEditId(svc.id);
                    setForm({ ...svc });
                  }}>
                    ✏️ Edit
                  </button>
                  {svc.active === 'TRUE' ? (
                    <button className="btn-danger btn-sm" onClick={() => deactivate(svc.id)}>Deactivate</button>
                  ) : (
                    <button className="btn-secondary btn-sm" onClick={() => reactivate(svc.id)}>Reactivate</button>
                  )}
                </div>
              </div>

              {/* Packages expansion */}
              {isExpanded && (
                <div className="mt-4 pt-4 animate-fade-in" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Packages</h4>
                    <button className="btn-secondary btn-sm" onClick={() => setAddingPkgFor(svc.id)}>
                      ➕ Add Package
                    </button>
                  </div>

                  {addingPkgFor === svc.id && (
                    <div className="card mb-3" style={{ background: 'var(--surface-3)' }}>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="form-group"><label className="label">Name</label><input className="input" value={pkgForm.name ?? ''} onChange={(e) => setPkgForm((f) => ({ ...f, name: e.target.value }))} /></div>
                        <div className="form-group"><label className="label">Price (₹)</label><input type="number" className="input" value={pkgForm.price ?? ''} onChange={(e) => setPkgForm((f) => ({ ...f, price: e.target.value }))} /></div>
                        <div className="form-group md:col-span-2"><label className="label">Deliverables</label><textarea className="textarea" rows={2} value={pkgForm.deliverables ?? ''} onChange={(e) => setPkgForm((f) => ({ ...f, deliverables: e.target.value }))} /></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="btn-primary btn-sm" onClick={() => savePackage(svc.id)}>Save</button>
                        <button className="btn-secondary btn-sm" onClick={() => setAddingPkgFor(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {svcPackages.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No packages yet</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {svcPackages.map((pkg) => (
                        <div key={pkg.id} className="rounded-xl p-3" style={{ background: 'var(--surface-3)' }}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-white">{pkg.name}</span>
                            <span className="badge-green text-xs">₹{parseInt(pkg.price).toLocaleString('en-IN')}</span>
                          </div>
                          {pkg.deliverables && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{pkg.deliverables}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
