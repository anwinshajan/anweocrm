'use client';

import { useState, useMemo } from 'react';
import type { Payment, User, Deal } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface Props {
  payments: Payment[];
  users: User[];
  deals: Deal[];
}

export default function PaymentsClient({ payments, users, deals }: Props) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Fixed Salary');
  const [method, setMethod] = useState('Bank Transfer');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState('Settled');
  const [notes, setNotes] = useState('');

  // Calculate earnings and payouts per user
  const userLedger = useMemo(() => {
    return users.map(user => {
      // Find all deals closed by this user
      const userDeals = deals.filter(d => d.closed_by === user.id);
      const totalRevenue = userDeals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);
      
      // Calculate earnings (Mock Logic: If commission, calc % based on commission_value)
      // If commission_type is 'Commission', commission_value might be '10' for 10%
      let earned = 0;
      if (user.commission_type === 'Commission' || user.commission_type === 'Hybrid') {
        const commRate = parseFloat(user.commission_value || '0') / 100;
        earned = totalRevenue * commRate;
      }
      
      // Fixed salaries are added manually via payments, or tracked by month.
      // For this overview, we just sum up what has been logged as 'paid' vs 'earned' from commissions.
      
      const userPayments = payments.filter(p => p.user_id === user.id);
      const totalPaid = userPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      return {
        ...user,
        totalRevenue,
        earned,
        totalPaid,
        balanceOwed: earned - totalPaid // If negative, they are overpaid (like advanced fixed salary)
      };
    });
  }, [users, deals, payments]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser,
          amount,
          type,
          method,
          reference,
          status,
          notes
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        router.refresh();
        
        setSelectedUser('');
        setAmount('');
        setReference('');
        setNotes('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(id: string, newStatus: string) {
    await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    router.refresh();
  }

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Payments & Salary</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage team salaries, commissions, and payout history.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          + Log Payment
        </button>
      </div>

      {/* Overview Table */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-6">Team Balances</h2>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Structure</th>
                <th>Deals Closed</th>
                <th>Revenue Generated</th>
                <th>Comm. Earned</th>
                <th>Total Paid</th>
                <th>Balance (Comm.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {userLedger.map(u => (
                <tr key={u.id} className="hover:bg-[var(--surface-3)]">
                  <td className="font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                        {u.username[0].toUpperCase()}
                      </div>
                      {u.username}
                    </div>
                  </td>
                  <td className="text-[var(--text-secondary)] capitalize">
                    {u.commission_type} {u.commission_type !== 'Fixed' && `(${u.commission_value}%)`}
                  </td>
                  <td className="text-white">{deals.filter(d => d.closed_by === u.id).length}</td>
                  <td className="text-emerald-400 font-medium">{formatCurrency(u.totalRevenue)}</td>
                  <td className="text-[var(--brand-400)] font-medium">{formatCurrency(u.earned)}</td>
                  <td className="text-white font-medium">{formatCurrency(u.totalPaid)}</td>
                  <td className="font-bold">
                    <span className={u.balanceOwed > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {formatCurrency(u.balanceOwed)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-6">Payment Ledger</h2>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Recipient</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {payments.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(p => {
                const user = users.find(u => u.id === p.user_id);
                return (
                  <tr key={p.id} className="hover:bg-[var(--surface-3)]">
                    <td className="text-[var(--text-secondary)]">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="text-white font-medium">{user?.username || 'Unknown User'}</td>
                    <td className="text-[var(--text-secondary)]">{p.type}</td>
                    <td className="font-bold text-[var(--brand-400)]">{formatCurrency(parseFloat(p.amount))}</td>
                    <td className="text-[var(--text-secondary)]">{p.method}</td>
                    <td className="text-[var(--text-secondary)] font-mono text-xs">{p.reference || '-'}</td>
                    <td>
                      <span className={`badge ${p.status === 'Settled' ? 'badge-green' : 'badge-orange'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.status === 'Pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(p.id, 'Settled')}
                          className="btn-sm btn-secondary text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10"
                        >
                          Mark Settled
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[var(--text-muted)]">
                    No payment history recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-6">Log New Payment</h2>
            
            <form onSubmit={handleAddPayment} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="label">Team Member</label>
                <select className="select" required value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                  <option value="">Select Member...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Amount (₹)</label>
                  <input type="number" className="input" required min="1" step="any" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Type</label>
                  <select className="select" value={type} onChange={e => setType(e.target.value)}>
                    <option value="Fixed Salary">Fixed Salary</option>
                    <option value="Commission">Commission</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Advance">Advance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Method</label>
                  <select className="select" value={method} onChange={e => setMethod(e.target.value)}>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Status</label>
                  <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="Settled">Settled</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Transaction Reference (Optional)</label>
                <input type="text" className="input" placeholder="e.g. UPI Ref Number" value={reference} onChange={e => setReference(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="label">Notes</label>
                <textarea className="textarea" rows={2} placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Log Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
