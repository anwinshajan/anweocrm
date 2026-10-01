'use client';

import { useState, useEffect } from 'react';
import type { SessionUser } from '@/lib/types';

interface Props {
  session: SessionUser;
  initialSettings: Record<string, string>;
}

type AIProvider = 'openai' | 'openai_compatible';

export default function SettingsClient({ session, initialSettings }: Props) {
  const [activeTab, setActiveTab] = useState<'personal' | 'system' | 'connections' | 'ai'>('personal');
  const [settings, setSettings] = useState(initialSettings);
  const [envSettings, setEnvSettings] = useState({ GOOGLE_APPS_SCRIPT_URL: '', GOOGLE_SHEET_ID: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // AI Provider settings
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai_compatible');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('agnes-2.5-flash');
  const [aiBaseUrl, setAiBaseUrl] = useState('https://router.bynara.id/v1');
  const [aiSaving, setAiSaving] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  // Password reset state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (session.role === 'admin' && activeTab === 'connections') {
      fetch('/api/settings/env')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setEnvSettings({
              GOOGLE_APPS_SCRIPT_URL: data.data.GOOGLE_APPS_SCRIPT_URL || '',
              GOOGLE_SHEET_ID: data.data.GOOGLE_SHEET_ID || ''
            });
          }
        });
    }
    if (session.role === 'admin' && activeTab === 'ai' && !aiLoaded) {
      fetch('/api/settings/ai')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setAiApiKey(data.data.apiKey || '');
            setAiModel(data.data.model || 'agnes-2.5-flash');
            setAiBaseUrl(data.data.baseUrl || 'https://router.bynara.id/v1');
            setAiProvider((data.data.provider as AIProvider) || 'openai_compatible');
            setAiLoaded(true);
          }
        });
    }
  }, [session.role, activeTab, aiLoaded]);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveSystemSettings() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) showToast('System settings saved successfully!');
      else showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveAiSettings() {
    setAiSaving(true);
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: aiProvider, apiKey: aiApiKey, model: aiModel, baseUrl: aiBaseUrl }),
      });
      const data = await res.json();
      if (data.success) showToast('AI settings saved! Restart the server to apply changes.');
      else showToast(data.error || 'Failed to save AI settings', 'error');
    } finally {
      setAiSaving(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match!', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error || 'Failed to change password', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { id: 'personal', label: '👤 Personal' },
    ...(session.role === 'admin' ? [
      { id: 'system', label: '⚙️ System Settings' },
      { id: 'ai', label: '🤖 AI Provider' },
      { id: 'connections', label: '🔌 Connections & API' }
    ] : [])
  ] as const;

  return (
    <div className="p-6 flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal preferences and configurations.</p>
      </div>

      <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-b-2 border-brand-500 text-white' : ''}`}
            style={activeTab !== tab.id ? { color: 'var(--text-secondary)' } : {}}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {/* Personal */}
        {activeTab === 'personal' && (
          <div className="card max-w-lg">
            <h2 className="text-lg font-bold text-white mb-4">Security</h2>
            <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="label">Current Password</label>
                <input type="password" required className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">New Password</label>
                <input type="password" required className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Confirm New Password</label>
                <input type="password" required className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <button type="submit" disabled={saving || !currentPassword || !newPassword} className="btn-primary mt-2">
                {saving ? '⏳ Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* System Settings */}
        {activeTab === 'system' && session.role === 'admin' && (
          <div className="card max-w-2xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white mb-2">Global CRM Settings</h2>

            <div className="form-group">
              <label className="label">Company Name 🔒</label>
              <input
                className="input opacity-50 cursor-not-allowed"
                value={settings['company_name'] || ''}
                readOnly
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Locked for security. Please edit directly in the database to change.</p>
            </div>

            <div className="form-group">
              <label className="label">Support Email</label>
              <input
                type="email"
                className="input"
                value={settings['support_email'] || ''}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
              />
            </div>

            <button onClick={saveSystemSettings} disabled={saving} className="btn-primary mt-4 self-end">
              {saving ? '⏳ Saving...' : '💾 Save Global Settings'}
            </button>
          </div>
        )}

        {/* AI Provider Settings */}
        {activeTab === 'ai' && session.role === 'admin' && (
          <div className="card max-w-2xl flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">AI Provider Settings</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Configure which AI provider powers research, pitches, and the Anweo AI chat. Changes are saved to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: '0.8em' }}>.env.local</code> and take effect on next restart.
              </p>
            </div>

            <div className="form-group">
              <label className="label font-semibold text-white">Provider</label>
              <select
                className="select"
                value={aiProvider}
                onChange={e => setAiProvider(e.target.value as AIProvider)}
              >
                <option value="openai">OpenAI (Official)</option>
                <option value="openai_compatible">OpenAI (or Compatible Router)</option>
              </select>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Use "Compatible Router" for custom endpoints like Bynara, OpenRouter, Together, etc.
              </p>
            </div>

            <div className="form-group">
              <label className="label font-semibold text-white">API Key</label>
              <input
                type="password"
                className="input font-mono"
                placeholder="sk-..."
                value={aiApiKey}
                onChange={e => setAiApiKey(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label font-semibold text-white">Model</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="e.g. agnes-2.5-flash, gpt-4o-mini"
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enter the exact model name supported by your provider.</p>
            </div>

            {aiProvider === 'openai_compatible' && (
              <div className="form-group">
                <label className="label font-semibold text-white">Endpoint Override (Base URL)</label>
                <input
                  type="url"
                  className="input font-mono"
                  placeholder="https://router.bynara.id/v1"
                  value={aiBaseUrl}
                  onChange={e => setAiBaseUrl(e.target.value)}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>The base URL for the OpenAI-compatible API. Do NOT include <code>/chat/completions</code>.</p>
              </div>
            )}

            {/* Live test result indicator */}
            <div className="rounded-xl p-3 bg-[var(--surface-3)] border border-[var(--border)] text-sm" style={{ color: 'var(--text-muted)' }}>
              💡 After saving, go to a Lead page and generate a pitch to test your AI connection.
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button onClick={saveAiSettings} disabled={aiSaving} className="btn-primary">
                {aiSaving ? '⏳ Saving...' : '💾 Save AI Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Connections */}
        {activeTab === 'connections' && session.role === 'admin' && (
          <div className="card max-w-2xl flex flex-col gap-4">
            <div className="mb-2">
              <h2 className="text-lg font-bold text-white">Connections & API</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your database connection strings. Changing these may require a server restart to take effect.</p>
            </div>

            <div className="form-group">
              <label className="label text-brand-400 font-semibold">Google Apps Script URL (Primary Database) 🔒</label>
              <input
                className="input opacity-50 cursor-not-allowed"
                value={envSettings.GOOGLE_APPS_SCRIPT_URL}
                placeholder="https://script.google.com/macros/s/.../exec"
                readOnly
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Locked for security. Edit .env.local on the server to change this.</p>
            </div>

            <div className="form-group mt-2">
              <label className="label">Google Sheet ID (Fallback / Advanced) 🔒</label>
              <input
                className="input opacity-50 cursor-not-allowed"
                value={envSettings.GOOGLE_SHEET_ID}
                placeholder="1ABCD2efgHIJK3lmnOPQR4stu..."
                readOnly
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Locked for security. Edit .env.local on the server to change this.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
