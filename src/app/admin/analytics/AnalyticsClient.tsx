'use client';

import { useState, useMemo } from 'react';
import type { Lead, Deal, User } from '@/lib/types';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

interface Props {
  leads: Lead[];
  deals: Deal[];
  users: User[];
}

const COLORS = ['#b8ff33', '#06b6d4', '#ec4899', '#818cf8', '#f59e0b', '#10b981'];

export default function AnalyticsClient({ leads, deals, users }: Props) {
  const [dateRange, setDateRange] = useState('all'); // 'all', '7d', '30d', '90d', 'ytd'
  const [memberFilter, setMemberFilter] = useState('all');
  const [timeView, setTimeView] = useState<'daily'|'weekly'|'monthly'>('monthly');

  // Filter Data based on selections
  const filteredLeads = useMemo(() => {
    let res = leads.filter(l => l.status !== 'Deleted');
    if (memberFilter !== 'all') {
      res = res.filter(l => l.assigned_to === memberFilter || l.added_by === memberFilter || l.closed_by === memberFilter);
    }
    if (dateRange !== 'all') {
      const now = new Date();
      let start = new Date(0);
      if (dateRange === '7d') start = new Date(now.getTime() - 7*86400000);
      if (dateRange === '30d') start = new Date(now.getTime() - 30*86400000);
      if (dateRange === '90d') start = new Date(now.getTime() - 90*86400000);
      if (dateRange === 'ytd') start = new Date(now.getFullYear(), 0, 1);
      res = res.filter(l => new Date(l.created_at) >= start || (l.closed_at && new Date(l.closed_at) >= start));
    }
    return res;
  }, [leads, memberFilter, dateRange]);

  const filteredDeals = useMemo(() => {
    let res = deals;
    if (memberFilter !== 'all') {
      res = res.filter(d => d.closed_by === memberFilter);
    }
    if (dateRange !== 'all') {
      const now = new Date();
      let start = new Date(0);
      if (dateRange === '7d') start = new Date(now.getTime() - 7*86400000);
      if (dateRange === '30d') start = new Date(now.getTime() - 30*86400000);
      if (dateRange === '90d') start = new Date(now.getTime() - 90*86400000);
      if (dateRange === 'ytd') start = new Date(now.getFullYear(), 0, 1);
      res = res.filter(d => new Date(d.closed_at || d.start_date) >= start);
    }
    return res;
  }, [deals, memberFilter, dateRange]);

  const previousPeriodStart = useMemo(() => {
    const now = new Date();
    if (dateRange === '7d') return new Date(now.getTime() - 14*86400000);
    if (dateRange === '30d') return new Date(now.getTime() - 60*86400000);
    if (dateRange === '90d') return new Date(now.getTime() - 180*86400000);
    if (dateRange === 'ytd') return new Date(now.getFullYear() - 1, 0, 1);
    return new Date(0);
  }, [dateRange]);
  
  const previousPeriodEnd = useMemo(() => {
    const now = new Date();
    if (dateRange === '7d') return new Date(now.getTime() - 7*86400000);
    if (dateRange === '30d') return new Date(now.getTime() - 30*86400000);
    if (dateRange === '90d') return new Date(now.getTime() - 90*86400000);
    if (dateRange === 'ytd') return new Date(now.getFullYear(), 0, 1);
    return new Date(0);
  }, [dateRange]);

  // Summary Metrics
  const totalLeads = filteredLeads.length;
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const leadsThisMonth = filteredLeads.filter(l => new Date(l.created_at) >= thisMonthStart).length;
  const dealsClosed = filteredDeals.length;
  const conversionRate = totalLeads > 0 ? ((dealsClosed / totalLeads) * 100).toFixed(1) : '0';
  const revenue = filteredDeals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);
  const pendingFollowups = filteredLeads.filter(l => l.next_followup_at && new Date(l.next_followup_at) < new Date() && l.status !== 'Won').length;

  const prevLeads = leads.filter(l => new Date(l.created_at) >= previousPeriodStart && new Date(l.created_at) < previousPeriodEnd).length;
  const prevDeals = deals.filter(d => new Date(d.closed_at || d.start_date) >= previousPeriodStart && new Date(d.closed_at || d.start_date) < previousPeriodEnd).length;
  
  const leadTrend = prevLeads === 0 ? 100 : Math.round(((totalLeads - prevLeads) / prevLeads) * 100);
  const dealTrend = prevDeals === 0 ? 100 : Math.round(((dealsClosed - prevDeals) / prevDeals) * 100);

  // Time-based Chart Data
  const timeData = useMemo(() => {
    const map: Record<string, { dateLabel: string, leads: number, deals: number, revenue: number }> = {};
    
    filteredLeads.forEach(l => {
      const d = new Date(l.created_at);
      if (isNaN(d.getTime())) return;
      let key = d.toISOString().slice(0, 10);
      if (timeView === 'monthly') key = key.slice(0, 7);
      if (!map[key]) map[key] = { dateLabel: key, leads: 0, deals: 0, revenue: 0 };
      map[key].leads++;
    });

    filteredDeals.forEach(d => {
      const dt = new Date(d.closed_at || d.start_date);
      if (isNaN(dt.getTime())) return;
      let key = dt.toISOString().slice(0, 10);
      if (timeView === 'monthly') key = key.slice(0, 7);
      if (!map[key]) map[key] = { dateLabel: key, leads: 0, deals: 0, revenue: 0 };
      map[key].deals++;
      map[key].revenue += (parseFloat(d.deal_value) || 0);
    });

    return Object.values(map).sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
  }, [filteredLeads, filteredDeals, timeView]);

  // Lead Funnel
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Services Breakdown
  const servicesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredDeals.forEach(d => {
      const name = d.service_name_snapshot || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredDeals]);

  // Team Performance
  const teamPerformance = useMemo(() => {
    const map: Record<string, { user: User, brought: number, handled: number, closed: number, revenue: number }> = {};
    users.forEach(u => {
      map[u.id] = { user: u, brought: 0, handled: 0, closed: 0, revenue: 0 };
    });
    
    filteredLeads.forEach(l => {
      if (l.added_by && map[l.added_by]) map[l.added_by].brought++;
      if (l.assigned_to && map[l.assigned_to]) map[l.assigned_to].handled++;
    });

    filteredDeals.forEach(d => {
      if (d.closed_by && map[d.closed_by]) {
        map[d.closed_by].closed++;
        map[d.closed_by].revenue += (parseFloat(d.deal_value) || 0);
      }
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredLeads, filteredDeals, users]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Overview</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Full performance tracking and insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="select w-auto py-2" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
          </select>
          <select className="select w-auto py-2" value={memberFilter} onChange={e => setMemberFilter(e.target.value)}>
            <option value="all">All Team Members</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Leads', val: totalLeads, trend: leadTrend },
          { label: 'Leads (This Month)', val: leadsThisMonth },
          { label: 'Deals Closed', val: dealsClosed, trend: dealTrend },
          { label: 'Conversion', val: `${conversionRate}%` },
          { label: 'Revenue', val: formatCurrency(revenue) },
          { label: 'Overdue Follow-ups', val: pendingFollowups, alert: pendingFollowups > 0 }
        ].map(k => (
          <div key={k.label} className="card p-4 relative overflow-hidden group">
            <div className="text-xs text-[var(--text-secondary)] mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.alert ? 'text-red-400' : 'text-[var(--brand-400)]'}`}>
              {k.val}
            </div>
            {k.trend !== undefined && (
              <div className={`absolute top-4 right-4 text-xs font-bold ${k.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {k.trend >= 0 ? '↑' : '↓'} {Math.abs(k.trend)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Time-Based Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Performance Over Time</h2>
          <select className="select w-auto py-1 text-xs" value={timeView} onChange={e => setTimeView(e.target.value as any)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="dateLabel" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '8px' }}
                itemStyle={{ color: 'white' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line yAxisId="left" type="monotone" dataKey="leads" name="Leads Added" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="deals" name="Deals Closed" stroke="#ec4899" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="var(--brand-500)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Lead Funnel */}
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-6">Lead Funnel</h2>
          <div className="h-[300px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={funnelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {funnelData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface-3)', border: 'none', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-2xl font-bold text-white">{totalLeads}</span>
              <span className="text-xs text-[var(--text-muted)]">Total</span>
            </div>
          </div>
        </div>

        {/* Services Breakdown */}
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-6">Top Services Sold</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicesData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={11} width={120} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-3)', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="value" name="Deals" fill="var(--brand-500)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-6">Team Attribution & Performance</h2>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th>Member</th>
                <th>Leads Brought</th>
                <th>Leads Handled</th>
                <th>Deals Closed</th>
                <th>Revenue Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {teamPerformance.map(t => (
                <tr key={t.user.id} className="hover:bg-[var(--surface-3)]">
                  <td className="font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                        {t.user.username[0].toUpperCase()}
                      </div>
                      {t.user.username}
                    </div>
                  </td>
                  <td className="text-[var(--text-secondary)]">{t.brought}</td>
                  <td className="text-[var(--text-secondary)]">{t.handled}</td>
                  <td className="text-emerald-400 font-medium">{t.closed}</td>
                  <td className="text-[var(--brand-400)] font-medium">{formatCurrency(t.revenue)}</td>
                </tr>
              ))}
              {teamPerformance.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[var(--text-muted)]">
                    No team performance data for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
