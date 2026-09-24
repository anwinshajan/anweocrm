'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPwd !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (newPwd.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? 'Failed to change password');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--brand-600), #8b5cf6)' }}>
            <span className="text-2xl font-black text-white">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Set your password</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Choose a secure password to continue
          </p>
        </div>

        <div className="card-glass p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="form-group">
              <label className="label" htmlFor="current">Current Password</label>
              <input
                id="current"
                type="password"
                className="input"
                placeholder="••••••••"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <span className="error-msg">Leave blank if this is your first login</span>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="new">New Password</label>
              <input
                id="new"
                type="password"
                className="input"
                placeholder="At least 8 characters"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                className={`input ${error.includes('match') ? 'input-error' : ''}`}
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm animate-fade-in"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary btn-lg w-full mt-2" disabled={loading}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              ) : (
                'Set Password & Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
