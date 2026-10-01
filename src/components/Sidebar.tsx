'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import AnnouncementPopup from './AnnouncementPopup';
import Image from 'next/image';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const TEAM_NAV: NavItem[] = [
  { href: '/dashboard', label: 'My Day', icon: '☀️' },
  { href: '/leads', label: 'Leads', icon: '📋' },
  { href: '/followups', label: 'Follow-ups', icon: '🔔' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/analytics', label: 'My Analytics', icon: '📈' },
  { href: '/services', label: 'Services & Packages', icon: '🛠️' },
  { href: '/brand', label: 'Brand KB', icon: '🏢' },
  { href: '/templates', label: 'Templates', icon: '📄' },
  { href: '/settings', label: 'Settings', icon: '🔧' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/leads', label: 'All Leads', icon: '📋' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/services', label: 'Services', icon: '🛠️' },
  { href: '/admin/packages', label: 'Packages', icon: '📦' },
  { href: '/admin/payments', label: 'Payments', icon: '💰' },
  { href: '/admin/config', label: 'Config', icon: '⚙️' },
  { href: '/admin/brand', label: 'Brand KB', icon: '🏢' },
  { href: '/admin/templates', label: 'Templates', icon: '📄' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/admin/logs', label: 'Logs', icon: '🔍' },
  { href: '/settings', label: 'Settings', icon: '🔧' },
];

interface SidebarProps {
  role: 'admin' | 'team';
  username: string;
}

export default function Sidebar({ role, username }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const navItems = role === 'admin' ? ADMIN_NAV : TEAM_NAV;
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);

  // Clear navigating state whenever pathname changes (navigation complete)
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  useEffect(() => {
    fetch('/api/ai/status')
      .then(r => r.json())
      .then(d => setAiOnline(d.online))
      .catch(() => setAiOnline(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function handleNavClick(href: string) {
    if (href === pathname) return;
    setNavigatingTo(href);
  }

  return (
    <>
      <AnnouncementPopup />
      <aside
        className="hidden md:flex flex-col h-dvh sticky top-0 w-64 shrink-0 overflow-y-auto z-40 transition-all duration-300 border-r border-[var(--border)]"
        style={{ background: 'rgba(10, 10, 15, 0.7)', backdropFilter: 'blur(24px)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-4 px-6 py-6 shrink-0 border-b border-[var(--border)]">
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image
              src="/anweo-icon.png"
              alt="Anweo Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white">Anweo CRM</div>
            <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--brand-400)' }}>
              {role === 'admin' ? 'Administrator' : 'Team Member'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1.5 p-4 flex-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            const isLoading = navigatingTo === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`nav-link relative overflow-hidden ${active ? 'active' : ''}`}
                style={isLoading ? {
                  background: 'rgba(184,255,51,0.08)',
                  borderColor: 'rgba(184,255,51,0.25)',
                } : {}}
              >
                {/* Shimmer sweep while navigating */}
                {isLoading && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(184,255,51,0.1) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'skeletonShimmer 1s ease-in-out infinite',
                    }}
                  />
                )}
                <span className="text-xl leading-none relative z-10">
                  {isLoading ? (
                    <span
                      className="inline-block w-5 h-5 rounded-full border-2 border-t-[var(--brand-500)]"
                      style={{
                        borderColor: 'rgba(184,255,51,0.2)',
                        borderTopColor: 'var(--brand-500)',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                  ) : item.icon}
                </span>
                <span className="font-semibold relative z-10 flex-1">{item.label}</span>
                {isLoading && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider relative z-10"
                    style={{ color: 'var(--brand-400)', animation: 'navPulse 1s ease-in-out infinite' }}
                  >
                    Loading
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* AI Status */}
        <div className="px-4 py-2 mt-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 text-xs text-white border border-white/5">
            <span className={`w-2 h-2 rounded-full ${aiOnline === true ? 'bg-green-500' : aiOnline === false ? 'bg-red-500' : 'bg-gray-500'}`}></span>
            AI Status: {aiOnline === true ? 'Online' : aiOnline === false ? 'Offline' : 'Checking...'}
          </div>
        </div>

        {/* User + Logout */}
        <div className="p-4 shrink-0 border-t border-[var(--border)] bg-black/10">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/10 group">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner"
              style={{ background: 'linear-gradient(135deg, var(--brand-600), var(--brand-900))', color: 'white' }}
            >
              {username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{username}</div>
              <div className="text-xs font-medium text-[var(--text-muted)] capitalize">{role}</div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs text-[var(--text-muted)] border border-white/5"
              title="Sign out"
            >
              {loggingOut ? '⏳' : '🚪'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
