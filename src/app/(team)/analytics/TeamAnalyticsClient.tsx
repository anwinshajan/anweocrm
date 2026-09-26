'use client';

import { useState, useMemo } from 'react';
import type { Lead, Deal, User } from '@/lib/types';
import {
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

interface Props {
  leads: Lead[];
  deals: Deal[];
  user: User;
}

const COLORS = ['#b8ff33', '#06b6d4', '#ec4899', '#818cf8', '#f59e0b', '#10b981'];

export default function TeamAnalyticsClient({ leads, deals, user }: Props) {
  const [dateRange, setDateRange] = useState('30d'); // 'all', '7d', '30d', '90d', 'ytd'
  const [timeView, setTimeView] = useState<'daily'|'weekly'|'monthly'>('daily');

  // Filter Data based on selections
  const filteredLeads = useMemo(() => {
    let res = leads.filter(l => l.status !== 'Deleted');
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
  }, [leads, dateRange]);

  const filteredDeals = useMemo(() => {
    let res = deals;
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
  }, [deals, dateRange]);

  // Summary Metrics
  const totalLeads = filteredLeads.length;
  const dealsClosed = filteredDeals.length;
  const conversionRate = totalLeads > 0 ? ((dealsClosed / totalLeads) * 100).toFixed(1) : '0';
  const revenue = filteredDeals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);
  
  // Calculate earnings if commission-based
  let earned = 0;
  if (user.commission_type === 'percentage') {
    const commRate = parseFloat(user.commission_value || '0') / 100;
    earned = revenue * commRate;
  } else if (user.commission_type === 'flat') {
    earned = dealsClosed * parseFloat(user.commission_value || '0');
  }

  // Target calculations (Monthly)
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= thisMonthStart).length;
  const monthlyTarget = parseFloat(user.monthly_target) || 200;
  const targetProgress = Math.min((leadsThisMonth / monthlyTarget) * 100, 100);

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

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-7xl mx-auto flex flex-col gap-8 w-full">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📈</span> My Analytics
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Track your personal performance, targets, and commissions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="select w-auto py-2" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
          </select>
        </div>
      </div>

      {/* Target Progress */}
      <div className="card-glass border border-[var(--border)] p-6 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Monthly Lead Target</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              You have handled <strong className="text-white">{leadsThisMonth}</strong> out of your <strong className="text-white">{monthlyTarget}</strong> monthly target.
            </p>
          </div>
          <div className="text-2xl font-black text-[#B8FF33]">{targetProgress.toFixed(0)}%</div>
        </div>
        <div className="progress-bar h-3 relative z-10 bg-black/50 border border-white/5">
          <div 
            className="progress-fill shadow-[0_0_15px_rgba(184,255,51,0.5)]" 
            style={{ width: `${targetProgress}%`, background: 'var(--brand-500)' }} 
          />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#B8FF33]/5 to-transparent pointer-events-none" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 border border-[var(--border)] relative overflow-hidden">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Leads Handled</div>
          <div className="text-3xl font-bold text-white">{totalLeads}</div>
        </div>
        <div className="card p-5 border border-emerald-500/20 bg-emerald-900/10 relative overflow-hidden">
          <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Deals Closed</div>
          <div className="text-3xl font-bold text-emerald-400">{dealsClosed}</div>
        </div>
        <div className="card p-5 border border-[var(--border)] relative overflow-hidden">
          <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Conversion Rate</div>
          <div className="text-3xl font-bold text-white">{conversionRate}%</div>
        </div>
        <div className="card p-5 border border-[#B8FF33]/20 bg-[#B8FF33]/10 relative overflow-hidden">
          <div className="text-xs font-bold text-[#B8FF33] uppercase tracking-wider mb-2">Est. Commissions</div>
          <div className="text-3xl font-bold text-[#B8FF33]">{formatCurrency(earned)}</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Based on {formatCurrency(revenue)} revenue</div>
        </div>
      </div>

      {/* Time-Based Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">My Performance Trend</h2>
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
              <Line yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="deals" name="Deals" stroke="#ec4899" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="var(--brand-500)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Lead Funnel */}
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-6">My Lead Funnel</h2>
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
              <span className="text-xs text-[var(--text-muted)]">Total Pipeline</span>
            </div>
          </div>
        </div>

        <div className="card flex flex-col justify-center text-center p-8 bg-[var(--surface-2)]">
          <span className="text-5xl mb-4">🏆</span>
          <h3 className="text-xl font-bold text-white mb-2">Keep up the great work!</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Every follow-up gets you closer to a deal. Your conversion rate is currently <strong className="text-white">{conversionRate}%</strong>.
            Aim for a higher follow-up frequency to boost your monthly commissions!
          </p>
        </div>
      </div>
    </div>
  );
}
