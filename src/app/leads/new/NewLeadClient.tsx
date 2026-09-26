'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  categories: string[];
  sources: string[];
}

export default function NewLeadClient({ categories, sources }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    business_name: '', category: '', phone: '', whatsapp_number: '',
    city: '', address: '', website: '', instagram: '', source: '',
    priority: 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState<{ id: string; business_name: string } | null>(null);

  function update(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setError('');
    setDuplicate(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_name) { setError('Business name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 409 && data.existing) {
        setDuplicate(data.existing);
        setSaving(false);
        return;
      }
      if (!data.success) { setError(data.error ?? 'Failed'); setSaving(false); return; }
      router.push(`/leads/${data.data.id}`);
    } catch {
      setError('Network error');
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm mb-2 inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Add New Lead</h1>
      </div>

      {duplicate && (
        <div className="card mb-6" style={{ border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)' }}>
          <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>⚠️ Duplicate detected</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            A lead with this phone number already exists: <strong className="text-white">{duplicate.business_name}</strong>
          </p>
          <button
            className="btn-secondary btn-sm mt-3"
            onClick={() => router.push(`/leads/${duplicate.id}`)}
          >
            View existing lead →
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="form-group md:col-span-2">
            <label className="label" htmlFor="business_name">Business Name *</label>
            <input id="business_name" className={`input ${error ? 'input-error' : ''}`} placeholder="e.g. Spice Garden Restaurant" value={form.business_name} onChange={(e) => update('business_name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="category">Category</label>
            <input id="category" list="category-list" className="input" placeholder="e.g. Beauty Salon" value={form.category} onChange={(e) => update('category', e.target.value)} />
            <datalist id="category-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="city">City</label>
            <input id="city" className="input" placeholder="e.g. Kochi" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="phone">Phone *</label>
            <input id="phone" className="input" placeholder="+919876543210" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="whatsapp">WhatsApp Number</label>
            <input id="whatsapp" className="input" placeholder="Same as phone? Leave blank" value={form.whatsapp_number} onChange={(e) => update('whatsapp_number', e.target.value)} />
          </div>
          <div className="form-group md:col-span-2">
            <label className="label" htmlFor="address">Address</label>
            <input id="address" className="input" placeholder="Full address" value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="website">Website</label>
            <input id="website" className="input" placeholder="https://..." value={form.website} onChange={(e) => update('website', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="instagram">Instagram</label>
            <input id="instagram" className="input" placeholder="@handle" value={form.instagram} onChange={(e) => update('instagram', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="source">Lead Source</label>
            <input id="source" list="source-list" className="input" placeholder="e.g. Google Maps, LinkedIn" value={form.source} onChange={(e) => update('source', e.target.value)} />
            <datalist id="source-list">
              {sources.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="priority">Priority</label>
            <select id="priority" className="select" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : '➕ Add Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
