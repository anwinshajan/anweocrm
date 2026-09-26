'use client';

import { useState, useEffect } from 'react';
import type { SessionUser } from '@/lib/types';

interface Props {
  session: SessionUser;
  initialSettings: Record<string, string>;
}

export default function SettingsClient({ session, initialSettings }: Props) {
  const [activeTab, setActiveTab] = useState<'personal' | 'system' | 'connections'>('personal');
  const [settings, setSettings] = useState(initialSettings);
  const [envSettings, setEnvSettings] = useState({ GOOGLE_APPS_SCRIPT_URL: '', GOOGLE_SHEET_ID: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
  }, [session.role, activeTab]);

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
            
            <div className="form-group">
              <label className="label">Anthropic API Key (Claude)</label>
              <input 
                type="password"
                className="input" 
                value={settings['anthropic_api_key'] || ''} 
                placeholder="sk-ant-api03-..."
                onChange={(e) => setSettings({ ...settings, anthropic_api_key: e.target.value })} 
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Required for AI pitch generation and research.</p>
            </div>

            <button onClick={saveSystemSettings} disabled={saving} className="btn-primary mt-4 self-end">
              {saving ? '⏳ Saving...' : '💾 Save Global Settings'}
            </button>
          </div>
        )}

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
