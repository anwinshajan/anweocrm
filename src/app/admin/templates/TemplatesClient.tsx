'use client';

import { useState, useMemo } from 'react';
import type { Template } from '@/lib/types';

interface Props {
  initialTemplates: Template[];
}

const TEMPLATE_TYPES = [
  { value: 'whatsapp',    label: 'WhatsApp',     icon: '💬', color: '#25d366' },
  { value: 'email',       label: 'Email',         icon: '📧', color: '#6366f1' },
  { value: 'pitch',       label: 'Pitch',         icon: '🎯', color: '#f59e0b' },
  { value: 'followup',    label: 'Follow-up',     icon: '🔁', color: '#ec4899' },
  { value: 'intro',       label: 'Introduction',  icon: '👋', color: '#10b981' },
  { value: 'other',       label: 'Other',         icon: '📄', color: '#94a3b8' },
] as const;

type TemplateType = typeof TEMPLATE_TYPES[number]['value'];

const EMPTY_FORM = {
  name: '',
  type: 'whatsapp' as TemplateType,
  body: '',
  variables: '',
  active: 'TRUE' as 'TRUE' | 'FALSE',
};

// Extract {{variable}} placeholders from body text
function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{([^}]+)\}\}/g) ?? [];
  return [...new Set(matches.map(m => m.slice(2, -2).trim()))];
}

export default function TemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [activeType, setActiveType] = useState<TemplateType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let list = templates;
    if (activeType !== 'all') list = list.filter(t => t.type === activeType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, activeType, search]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    templates.forEach(t => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
    return counts;
  }, [templates]);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setEditingTemplate(null);
    setForm({ ...EMPTY_FORM, type: activeType !== 'all' ? activeType as TemplateType : 'whatsapp' });
    setPreviewMode(false);
    setPreviewVars({});
    setShowModal(true);
  }

  function openEdit(t: Template) {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      type: t.type as TemplateType,
      body: t.body,
      variables: t.variables,
      active: t.active as 'TRUE' | 'FALSE',
    });
    setPreviewMode(false);
    setPreviewVars({});
    setShowModal(true);
  }

  // Auto-fill preview var keys when body changes
  function updateBody(body: string) {
    setForm(f => ({ ...f, body }));
    const vars = extractVariables(body);
    setPreviewVars(prev => {
      const next: Record<string, string> = {};
      vars.forEach(v => { next[v] = prev[v] ?? ''; });
      return next;
    });
  }

  function renderPreview(body: string): string {
    let preview = body;
    Object.entries(previewVars).forEach(([key, val]) => {
      preview = preview.replaceAll(`{{${key}}}`, val || `[${key}]`);
    });
    return preview;
  }

  async function save() {
    if (!form.name.trim() || !form.body.trim()) {
      showToast('Name and body are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const autoVars = extractVariables(form.body).join(', ');
      const payload = { ...form, variables: autoVars };

      if (editingTemplate) {
        const res = await fetch(`/api/templates/${editingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...payload } : t));
        showToast('Template updated!');
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTemplates(prev => [...prev, data.data]);
        showToast('Template created!');
      }
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: Template) {
    const updated = { active: t.active === 'TRUE' ? 'FALSE' : 'TRUE' };
    try {
      const res = await fetch(`/api/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error();
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, ...updated } : x));
      showToast(updated.active === 'TRUE' ? 'Template enabled' : 'Template disabled');
    } catch {
      showToast('Failed to update', 'error');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
  }

  function getTypeInfo(type: string) {
    return TEMPLATE_TYPES.find(t => t.value === type) ?? TEMPLATE_TYPES[TEMPLATE_TYPES.length - 1];
  }

  const previewVarKeys = extractVariables(form.body);

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
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-teal-500">
            Message Templates
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Create reusable templates with <code className="text-green-400">{'{{variables}}'}</code> for WhatsApp, email, pitches, and follow-ups.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <span>+</span> New Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total',    value: templates.length,                               color: '#6366f1' },
          { label: 'Active',   value: templates.filter(t => t.active === 'TRUE').length, color: '#10b981' },
          { label: 'WhatsApp', value: typeCounts['whatsapp'] || 0,                   color: '#25d366' },
          { label: 'Pitches',  value: typeCounts['pitch'] || 0,                      color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card-glass p-4 border border-[var(--border)]">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <div className="h-0.5 mt-3 rounded-full" style={{ background: s.color, opacity: 0.5 }} />
          </div>
        ))}
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <button
          onClick={() => setActiveType('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            activeType === 'all'
              ? 'bg-white/10 text-white border-white/20'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          All <span className="opacity-60 ml-1">({templates.length})</span>
        </button>
        {TEMPLATE_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setActiveType(type.value as TemplateType)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              activeType === type.value
                ? 'text-white'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
            }`}
            style={activeType === type.value ? {
              background: `${type.color}22`,
              border: `1px solid ${type.color}55`,
              color: type.color,
            } : {}}
          >
            {type.icon} {type.label}
            {typeCounts[type.value] ? (
              <span className="opacity-60 ml-1">({typeCounts[type.value]})</span>
            ) : null}
          </button>
        ))}

        {/* Search */}
        <div className="ml-auto relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input
            className="input pl-9 text-sm"
            style={{ minWidth: 220 }}
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Template cards */}
      {filtered.length === 0 ? (
        <div className="card-glass py-20 text-center border border-[var(--border)]">
          <div className="text-5xl mb-4 opacity-30">💬</div>
          <p className="text-lg mb-1" style={{ color: 'var(--text-muted)' }}>No templates found</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {search ? 'Try a different search term' : 'Create your first template to get started'}
          </p>
          {!search && <button onClick={openCreate} className="btn-primary">+ New Template</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map(t => {
            const typeInfo = getTypeInfo(t.type);
            const vars = extractVariables(t.body);
            const isActive = t.active === 'TRUE';
            return (
              <div
                key={t.id}
                className={`card-glass border flex flex-col transition-all duration-300 ${
                  isActive ? 'hover:border-teal-500/30' : 'opacity-60'
                }`}
                style={{ borderColor: 'var(--border)' }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: `${typeInfo.color}22` }}
                    >
                      {typeInfo.icon}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate">{t.name}</h3>
                      <span className="text-xs" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                    </div>
                  </div>
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={isActive
                      ? { background: '#10b98122', color: '#10b981', border: '1px solid #10b98133' }
                      : { background: '#ef444422', color: '#ef4444', border: '1px solid #ef444433' }
                    }
                  >
                    {isActive ? 'Active' : 'Off'}
                  </span>
                </div>

                {/* Body preview */}
                <div
                  className="flex-1 text-sm rounded-xl p-3 mb-3 whitespace-pre-wrap font-mono leading-relaxed"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-secondary)',
                    maxHeight: 140,
                    overflowY: 'auto',
                  }}
                >
                  {t.body.split(/({{[^}]+}})/).map((part, i) =>
                    part.startsWith('{{') ? (
                      <span key={i} style={{ color: typeInfo.color, fontWeight: 600 }}>{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>

                {/* Variables */}
                {vars.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {vars.map(v => (
                      <span
                        key={v}
                        className="text-xs px-2 py-0.5 rounded-full font-mono"
                        style={{ background: `${typeInfo.color}15`, color: typeInfo.color, border: `1px solid ${typeInfo.color}30` }}
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => copyToClipboard(t.body)}
                    className="flex-1 btn-ghost text-sm py-1.5"
                    title="Copy body"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="flex-1 btn-ghost text-sm py-1.5"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => toggleActive(t)}
                    className="flex-1 text-sm py-1.5 rounded-lg transition-all font-medium"
                    style={isActive
                      ? { background: '#ef444411', color: '#ef4444', border: '1px solid #ef444422' }
                      : { background: '#10b98111', color: '#10b981', border: '1px solid #10b98122' }
                    }
                  >
                    {isActive ? '🔴 Off' : '🟢 On'}
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
          <div className="card-glass w-full max-w-2xl flex flex-col border border-[var(--border)] shadow-2xl animate-fade-in max-h-[92vh] overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h2 className="text-xl font-bold text-white">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(p => !p)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all border ${
                    previewMode
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {previewMode ? '✏️ Edit' : '👁 Preview'}
                </button>
                <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white text-xl">✕</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              {!previewMode ? (
                <>
                  {/* Name + Type row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="label">Template Name <span className="text-red-400">*</span></label>
                      <input
                        className="input"
                        placeholder="e.g. Initial Outreach"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Type <span className="text-red-400">*</span></label>
                      <select
                        className="input"
                        value={form.type}
                        onChange={e => setForm(f => ({ ...f, type: e.target.value as TemplateType }))}
                      >
                        {TEMPLATE_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="form-group">
                    <div className="flex items-center justify-between mb-1">
                      <label className="label mb-0">Body <span className="text-red-400">*</span></label>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Use <code className="text-teal-400">{'{{variable_name}}'}</code> for placeholders
                      </span>
                    </div>
                    <textarea
                      className="input font-mono text-sm"
                      rows={10}
                      placeholder={"Hi {{business_name}},\n\nI came across your business on Google and was really impressed by your {{rating}}⭐ rating!\n\nWe help businesses like yours grow online. Would you be open to a quick chat?\n\nBest,\n{{agent_name}}"}
                      value={form.body}
                      onChange={e => updateBody(e.target.value)}
                    />
                    {/* Auto-detected variables */}
                    {previewVarKeys.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Detected:</span>
                        {previewVarKeys.map(v => (
                          <span
                            key={v}
                            className="text-xs px-2 py-0.5 rounded-full font-mono"
                            style={{ background: '#14b8a622', color: '#14b8a6', border: '1px solid #14b8a633' }}
                          >
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <span className="text-sm font-medium text-white">Active</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, active: f.active === 'TRUE' ? 'FALSE' : 'TRUE' }))}
                      className="relative w-11 h-6 rounded-full transition-all duration-200"
                      style={{ background: form.active === 'TRUE' ? '#10b981' : 'var(--border)' }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                        style={{ transform: form.active === 'TRUE' ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                </>
              ) : (
                /* Preview mode */
                <div className="flex flex-col gap-4">
                  {/* Fill in variable values */}
                  {previewVarKeys.length > 0 && (
                    <div>
                      <p className="label mb-3">Fill in variables to preview:</p>
                      <div className="grid grid-cols-2 gap-3">
                        {previewVarKeys.map(v => (
                          <div key={v} className="form-group">
                            <label className="label text-teal-400 font-mono">{`{{${v}}}`}</label>
                            <input
                              className="input text-sm"
                              placeholder={v.replace(/_/g, ' ')}
                              value={previewVars[v] ?? ''}
                              onChange={e => setPreviewVars(p => ({ ...p, [v]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rendered preview */}
                  <div>
                    <p className="label mb-2">Preview:</p>
                    <div
                      className="rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed font-mono border border-[var(--border)]"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', minHeight: 150 }}
                    >
                      {renderPreview(form.body)}
                    </div>
                    <button
                      onClick={() => copyToClipboard(renderPreview(form.body))}
                      className="mt-2 text-xs btn-ghost py-1.5 px-3"
                    >
                      📋 Copy Preview
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end p-6 border-t border-[var(--border)]">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? '⏳ Saving...' : editingTemplate ? '💾 Update' : '+ Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
