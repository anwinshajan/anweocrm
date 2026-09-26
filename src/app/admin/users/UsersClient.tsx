'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Shield, User, Key, CheckCircle, AlertCircle, 
  Search, Lock, Unlock, Edit3, X, Sparkles, RefreshCw, Award, Target
} from 'lucide-react';

interface SafeUser {
  id: string;
  username: string;
  role: string;
  permissions?: string;
  daily_target: string;
  monthly_target: string;
  commission_type: string;
  commission_value: string;
  active: string;
  must_change_password: string;
  failed_attempts: string;
  locked_until: string;
  created_at: string;
}

import type { Lead, Deal } from '@/lib/types';

interface Props {
  initialUsers: SafeUser[];
  currentAdminId: string;
  leads: Lead[];
  deals: Deal[];
}

export default function UsersClient({ initialUsers, currentAdminId, leads, deals }: Props) {
  const [users, setUsers] = useState<SafeUser[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);

  // Add Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'team',
    daily_target: '10',
    monthly_target: '200',
    commission_type: 'none',
    commission_value: '0',
  });

  // Edit Form State
  const [editData, setEditData] = useState({
    role: 'team',
    daily_target: '10',
    monthly_target: '200',
    commission_type: 'none',
    commission_value: '0',
    active: 'TRUE',
  });

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');

  // Filtered users
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Add User ──────────────────────────────────────────────────
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setErrorMsg('Username and initial password are required');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccessMsg(`User "${formData.username}" created successfully!`);
      setShowAddModal(false);
      setFormData({
        username: '',
        password: '',
        role: 'team',
        daily_target: '10',
        monthly_target: '200',
        commission_type: 'none',
        commission_value: '0',
      });
      fetchUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creating user');
    } finally {
      setLoading(false);
    }
  };

  // ─── Edit User ─────────────────────────────────────────────────
  const openEditModal = (user: SafeUser) => {
    setSelectedUser(user);
    setEditData({
      role: user.role,
      daily_target: user.daily_target || '10',
      monthly_target: user.monthly_target || '200',
      commission_type: user.commission_type || 'none',
      commission_value: user.commission_value || '0',
      active: user.active || 'TRUE',
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccessMsg(`User "${selectedUser.username}" updated successfully!`);
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating user');
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset Password ───────────────────────────────────────────
  const openPasswordModal = (user: SafeUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) {
      setErrorMsg('Please enter a new password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccessMsg(`Password reset for "${selectedUser.username}"!`);
      setShowPasswordModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  // ─── Toggle Active Status ──────────────────────────────────────
  const toggleUserStatus = async (user: SafeUser) => {
    const newStatus = user.active === 'TRUE' ? 'FALSE' : 'TRUE';
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`User status updated to ${newStatus === 'TRUE' ? 'Active' : 'Inactive'}`);
        fetchUsers();
      }
    } catch (err) {
      setErrorMsg('Failed to update status');
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in text-[var(--text-primary)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-white transition-all border border-[var(--border)]"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                User Management
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#B8FF33]/10 text-[#B8FF33] border border-[#B8FF33]/30 font-semibold tracking-wide uppercase">
                  Admin Control
                </span>
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
                Manage your agency team members, assign commission plans, set daily targets, and manage credentials.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 shadow-lg shadow-[#B8FF33]/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between animate-shake">
          <div className="flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or role..."
            className="input w-full pl-10 text-xs py-2.5"
          />
        </div>

        <div className="card-glass p-3.5 flex items-center justify-between border border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#B8FF33]/10 text-[#B8FF33]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Total Users</p>
              <p className="text-base font-bold text-white">{users.length}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
            {users.filter((u) => u.active === 'TRUE').length} active
          </span>
        </div>

        <div className="card-glass p-3.5 flex items-center justify-between border border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Admins</p>
              <p className="text-base font-bold text-white">{users.filter((u) => u.role === 'admin').length}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">
            Full Access
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-glass overflow-hidden p-0 border border-[var(--border)] rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-3)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Targets (Day / Mo)</th>
                <th className="p-4">Performance</th>
                <th className="p-4">Commission</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.map((user) => {
                const isActive = user.active === 'TRUE';
                const isCurrent = user.id === currentAdminId;
                return (
                  <tr key={user.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    {/* User info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B8FF33]/20 to-emerald-500/20 border border-[#B8FF33]/30 flex items-center justify-center font-bold text-[#B8FF33]">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm flex items-center gap-1.5">
                            {user.username}
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#B8FF33]/20 text-[#B8FF33] font-semibold">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono">{user.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'}`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Targets */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>
                          <strong className="text-white">{user.daily_target || '0'}</strong> / day · <strong className="text-white">{user.monthly_target || '0'}</strong> / mo
                        </span>
                      </div>
                    </td>

                    {/* Performance */}
                    <td className="p-4">
                      <div className="flex flex-col text-[11px] gap-1">
                        <span className="text-[var(--text-secondary)]">
                          Leads Handled: <strong className="text-white">{leads.filter(l => l.assigned_to === user.id || l.added_by === user.id).length}</strong>
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          Deals Closed: <strong className="text-emerald-400">{deals.filter(d => d.closed_by === user.id).length}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Commission */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Award className="w-3.5 h-3.5 text-[#B8FF33]" />
                        {user.commission_type === 'percentage' ? (
                          <span className="text-[#B8FF33] font-bold">{user.commission_value}% of deal</span>
                        ) : user.commission_type === 'flat' ? (
                          <span className="text-[#B8FF33] font-bold">₹{user.commission_value} / deal</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">None</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${isActive ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)] transition-all"
                          title="Edit Targets & Role"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openPasswordModal(user)}
                          className="p-1.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-2)] text-amber-400 hover:text-amber-300 border border-[var(--border)] transition-all"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center">
              <User className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[var(--text-muted)]">No users found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── ADD USER MODAL ──────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass max-w-lg w-full p-6 border border-[#B8FF33]/30 rounded-2xl animate-scale-up shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border)]">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#B8FF33]" />
                Add New Team Member
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul_sales"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white block mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="team">Marketing / Sales Team</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Commission Type</label>
                  <select
                    value={formData.commission_type}
                    onChange={(e) => setFormData({ ...formData, commission_type: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              {formData.commission_type !== 'none' && (
                <div>
                  <label className="text-xs font-semibold text-white block mb-1">
                    Commission Value {formData.commission_type === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    value={formData.commission_value}
                    onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Daily Target (Leads)</label>
                  <input
                    type="number"
                    value={formData.daily_target}
                    onChange={(e) => setFormData({ ...formData, daily_target: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Monthly Target (Leads)</label>
                  <input
                    type="number"
                    value={formData.monthly_target}
                    onChange={(e) => setFormData({ ...formData, monthly_target: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 text-xs px-5 py-2.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT USER MODAL ─────────────────────────────────────── */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass max-w-lg w-full p-6 border border-[var(--border)] rounded-2xl animate-scale-up shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-lg font-black text-white">Edit {selectedUser.username}</h2>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">{selectedUser.id}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Role</label>
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="team">Marketing / Sales Team</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Account Status</label>
                  <select
                    value={editData.active}
                    onChange={(e) => setEditData({ ...editData, active: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="TRUE">Active</option>
                    <option value="FALSE">Inactive / Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Commission Type</label>
                  <select
                    value={editData.commission_type}
                    onChange={(e) => setEditData({ ...editData, commission_type: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white block mb-1">
                    Value {editData.commission_type === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    value={editData.commission_value}
                    onChange={(e) => setEditData({ ...editData, commission_value: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Daily Target (Leads)</label>
                  <input
                    type="number"
                    value={editData.daily_target}
                    onChange={(e) => setEditData({ ...editData, daily_target: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white block mb-1">Monthly Target (Leads)</label>
                  <input
                    type="number"
                    value={editData.monthly_target}
                    onChange={(e) => setEditData({ ...editData, monthly_target: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 text-xs px-5 py-2.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RESET PASSWORD MODAL ─────────────────────────────────── */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass max-w-md w-full p-6 border border-amber-500/30 rounded-2xl animate-scale-up shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Reset Password
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-4">
              Set a new password for <strong className="text-white">{selectedUser.username}</strong>. This will be encrypted and saved to your Google Sheet immediately.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-2 text-xs px-5 py-2.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Set New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
