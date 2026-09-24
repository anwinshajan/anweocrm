'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const TEAM_NAV: NavItem[] = [
  { href: '/dashboard', label: 'My Day', icon: '☀️' },
  { href: '/leads', label: 'Leads', icon: '📋' },
  { href: '/followups', label: 'Follow-ups', icon: '🔔' },
  { href: '/inbox', label: 'Inbox', icon: '📬' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/leads', label: 'All Leads', icon: '📋' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/services', label: 'Services', icon: '🛠️' },
  { href: '/admin/packages', label: 'Packages', icon: '📦' },
  { href: '/admin/config', label: 'Config', icon: '⚙️' },
  { href: '/admin/brand', label: 'Brand KB', icon: '🏢' },
  { href: '/admin/templates', label: 'Templates', icon: '📄' },
  { href: '/admin/announcements', label: 'Announcements', icon: '📢' },
  { href: '/admin/logs', label: 'Logs', icon: '🔍' },
  { href: '/admin/settings', label: 'Settings', icon: '🔧' },
];

interface SidebarProps {
  role: 'admin' | 'team';
  username: string;
}

export default function Sidebar({ role, username }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = role === 'admin' ? ADMIN_NAV : TEAM_NAV;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside
      className="hidden md:flex flex-col h-dvh sticky top-0 w-60 shrink-0 overflow-y-auto"
      style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg"
          style={{ background: 'linear-gradient(135deg, var(--brand-600), #8b5cf6)' }}>
          A
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Anweo CRM</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {role === 'admin' ? '👑 Admin' : '🧑‍💼 Team'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${active ? 'active' : ''}`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
          style={{ background: 'var(--surface-3)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm"
            style={{ background: 'var(--brand-600)', color: 'white' }}>
            {username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{username}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{role}</div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn-icon text-xs"
            title="Sign out"
          >
            {loggingOut ? '⏳' : '🚪'}
          </button>
        </div>
      </div>
    </aside>
  );
}
